import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as os from 'os';
import * as path from 'path';
import {
  CommandId,
  PermissionGroup,
  getCommandPermissionGroup,
  isReadOnlyCommand,
  isExportCommand
} from './commands.js';

/**
 * PTSL gRPC client wrapper
 *
 * Handles connection to Pro Tools PTSL server and manages request/response communication.
 */
export class PTSLClient {
  private protoPath: string;
  private serverAddress: string;
  private client: any;
  private sessionId: string = '';
  private connected: boolean = false;
  private allowedPermissionGroups: Set<PermissionGroup>;

  constructor(protoPath: string, serverAddress: string = 'localhost:31416') {
    this.protoPath = protoPath;
    this.serverAddress = serverAddress;

    // Parse ALLOW_WRITES environment variable
    this.allowedPermissionGroups = this.parseAllowedPermissions();

    // Display permission level
    this.displayPermissionStatus();
  }

  /**
   * Parse ALLOW_WRITES environment variable into permission groups
   */
  private parseAllowedPermissions(): Set<PermissionGroup> {
    const allowed = new Set<PermissionGroup>();

    const allowWrites = process.env.ALLOW_WRITES || '';

    if (allowWrites === 'all') {
      // Allow all permission groups
      return new Set(Object.values(PermissionGroup));
    }

    if (allowWrites === '') {
      // Default: no permission groups enabled (read-only mode)
      // Exports to temp directories are allowed as a special case in checkCommandPermission
      return allowed;
    }

    // Parse comma-separated list of permission groups
    const groups = allowWrites.split(',').map(g => g.trim());
    for (const group of groups) {
      if (Object.values(PermissionGroup).includes(group as PermissionGroup)) {
        allowed.add(group as PermissionGroup);
      } else {
        console.error(`⚠️  Warning: Unknown permission group '${group}' in ALLOW_WRITES`);
      }
    }

    return allowed;
  }

  /**
   * Display current permission status
   */
  private displayPermissionStatus(): void {
    const groupNames = Array.from(this.allowedPermissionGroups).sort();

    if (groupNames.length === Object.values(PermissionGroup).length) {
      console.error('⚠️  ALL OPERATIONS ENABLED - All permission groups allowed');
    } else if (groupNames.length === 0) {
      console.error('🔒 READ-ONLY MODE - Only queries and playback allowed');
    } else {
      console.error(`🔓 GRANULAR PERMISSIONS - Allowed: ${groupNames.join(', ')}`);
    }
  }

  /**
   * Load the proto file and create the gRPC client
   */
  async connect(): Promise<void> {
    try {
      // Load proto file dynamically
      const packageDefinition = await protoLoader.load(this.protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
      const ptslService = protoDescriptor.ptsl.PTSL;

      // Create client
      this.client = new ptslService(
        this.serverAddress,
        grpc.credentials.createInsecure()
      );

      this.connected = true;
      console.error(`✓ Connected to PTSL server at ${this.serverAddress}`);
    } catch (error) {
      throw new Error(`Failed to connect to PTSL server: ${error}`);
    }
  }

  /**
   * Register connection with Pro Tools
   * This must be called before any other commands
   */
  async registerConnection(appName: string, companyName: string = 'MCP'): Promise<string> {
    const requestBody = {
      company_name: companyName,
      application_name: appName,
    };

    // RegisterConnection must be sent without a session_id
    const response = await this.sendRequest(CommandId.RegisterConnection, requestBody, true);

    if (response.response_body && response.response_body.session_id) {
      this.sessionId = response.response_body.session_id;
      console.error(`✓ Registered connection with session ID: ${this.sessionId}`);
      return this.sessionId;
    }

    throw new Error('Failed to register connection - no session ID returned');
  }

  /**
   * Send a request to Pro Tools
   */
  async sendRequest(commandId: number, requestBody: any = {}, skipSessionId: boolean = false): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to PTSL server. Call connect() first.');
    }

    // Check permissions for this command
    this.checkCommandPermission(commandId, requestBody);

    return new Promise((resolve, reject) => {
      const header: any = {
        command: commandId,  // Note: field is called 'command', not 'command_id'
        version: 2025,       // PTSL API version (year)
        version_minor: 10,   // PTSL API version (month)
        version_revision: 0, // PTSL API revision
      };

      // Only include session_id if we have one and not explicitly skipping it
      if (this.sessionId && !skipSessionId) {
        header.session_id = this.sessionId;
      }

      const request = {
        header,
        request_body_json: JSON.stringify(requestBody),
      };

      this.client.SendGrpcRequest(request, (error: any, response: any) => {
        if (error) {
          reject(new Error(`gRPC error: ${error.message}`));
          return;
        }

        // Check for command errors
        if (response.command_error_type && response.command_error_type !== 'CmdErr_NoError') {
          const errorMessage = response.response_error_json
            ? JSON.parse(response.response_error_json)
            : { error_type: response.command_error_type };
          reject(new Error(`Command error: ${JSON.stringify(errorMessage, null, 2)}`));
          return;
        }

        // Parse response body
        let parsedResponse = response;
        if (response.response_body_json) {
          try {
            parsedResponse.response_body = JSON.parse(response.response_body_json);
          } catch (e) {
            // If parsing fails, keep the raw JSON string
          }
        }

        resolve(parsedResponse);
      });
    });
  }

  /**
   * Send a streaming request to Pro Tools
   */
  async *sendStreamingRequest(commandId: number, requestBody: any = {}): AsyncIterableIterator<any> {
    if (!this.connected) {
      throw new Error('Not connected to PTSL server. Call connect() first.');
    }

    // Check permissions for this command
    this.checkCommandPermission(commandId, requestBody);

    const request = {
      header: {
        session_id: this.sessionId,
        command_id: commandId,
      },
      request_body_json: JSON.stringify(requestBody),
    };

    const stream = this.client.SendGrpcStreamingRequest(request);

    for await (const response of stream) {
      // Parse response body
      if (response.response_body_json) {
        try {
          response.response_body = JSON.parse(response.response_body_json);
        } catch (e) {
          // Keep raw JSON string if parsing fails
        }
      }

      yield response;
    }
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Check if connected to Pro Tools
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if a permission group is allowed
   */
  isPermissionGroupAllowed(group: PermissionGroup): boolean {
    return this.allowedPermissionGroups.has(group);
  }

  /**
   * Get list of allowed permission groups
   */
  getAllowedPermissionGroups(): string[] {
    return Array.from(this.allowedPermissionGroups).sort();
  }


  /**
   * Check if a command is allowed based on permission groups
   */
  private checkCommandPermission(commandId: number, requestBody: any = {}): void {
    // Read-only commands are always allowed
    if (isReadOnlyCommand(commandId)) {
      return;
    }

    // Get the permission group for this command
    const group = getCommandPermissionGroup(commandId);

    if (!group) {
      // Unknown command - be conservative and block it
      throw new Error(
        `Unknown command ${commandId} - cannot determine permission requirements. ` +
        'This command is not in any known permission group.'
      );
    }

    // Special handling for export commands
    if (isExportCommand(commandId)) {
      const exportPath = this.getExportPath(requestBody);
      const isSafePath = this.isPathInTempDirectory(exportPath);

      if (isSafePath) {
        // Exports to temp directories are always allowed (for analysis)
        return;
      }

      // Non-temp exports require the export permission group
      if (!this.allowedPermissionGroups.has(PermissionGroup.EXPORT)) {
        throw new Error(
          `Export to arbitrary path blocked: Exports are only allowed to temporary directories (${os.tmpdir()}) by default. ` +
          `Attempted path: ${exportPath}. ` +
          'To enable exports to any location, set ALLOW_WRITES=export or ALLOW_WRITES=all'
        );
      }

      // Export permission granted, allow export to any path
      return;
    }

    // Check if this permission group is allowed
    if (!this.allowedPermissionGroups.has(group)) {
      const groupName = group;
      const allowedGroups = this.getAllowedPermissionGroups();

      throw new Error(
        `Permission denied: This command requires the '${groupName}' permission group. ` +
        `Currently allowed groups: ${allowedGroups.length > 0 ? allowedGroups.join(', ') : 'none (read-only mode)'}. ` +
        `To enable this operation, set ALLOW_WRITES=${groupName} or ALLOW_WRITES=all`
      );
    }
  }

  /**
   * Extract export path from request body
   */
  private getExportPath(requestBody: any): string {
    // Check common export path fields (top-level)
    if (requestBody.file_location) return requestBody.file_location;
    if (requestBody.export_file_path) return requestBody.export_file_path;
    if (requestBody.destination_path) return requestBody.destination_path;
    if (requestBody.output_path) return requestBody.output_path;

    // Check nested location_info structure (used by ExportMix)
    if (requestBody.location_info?.directory) return requestBody.location_info.directory;

    return '';
  }

  /**
   * Check if a path is within the system temp directory
   */
  private isPathInTempDirectory(filePath: string): boolean {
    if (!filePath) return false;

    const tmpDir = os.tmpdir();
    const resolvedPath = path.resolve(filePath);
    const resolvedTmpDir = path.resolve(tmpDir);

    return resolvedPath.startsWith(resolvedTmpDir);
  }
}
