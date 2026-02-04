#!/usr/bin/env node

/**
 * Pro Tools MCP Server (Streamable HTTP Transport)
 *
 * Runs as an HTTPS server for use with Claude Cowork connectors
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PTSLClient } from './grpc/client.js';
import { loadConfig, validateConfig } from './config.js';
import { allTools, handleToolCall } from './tools/index.js';

const PORT = process.env.PORT || 3000;
const USE_HTTPS = process.env.USE_HTTPS !== 'false'; // Default to HTTPS

async function main() {
  // Load and validate configuration
  let config;
  try {
    config = loadConfig();
    validateConfig(config);
  } catch (error) {
    console.error(`Configuration error: ${error}`);
    console.error('');
    console.error('Please set the PTSL_PROTO_PATH environment variable:');
    console.error('  export PTSL_PROTO_PATH=/path/to/PTSL.proto');
    console.error('');
    console.error('Or create ~/.protools-mcp/config.json:');
    console.error('  {');
    console.error('    "protoPath": "/path/to/PTSL.proto",');
    console.error('    "serverAddress": "localhost:31416"');
    console.error('  }');
    process.exit(1);
  }

  // Initialize PTSL client
  let client: PTSLClient;
  try {
    client = new PTSLClient(config.protoPath, config.serverAddress);
    await client.connect();
    await client.registerConnection('Pro Tools MCP Server (HTTP)');
  } catch (error) {
    console.error(`Failed to connect to Pro Tools: ${error}`);
    console.error('');
    console.error('Make sure:');
    console.error('  1. Pro Tools is running');
    console.error('  2. PTSL server is available on localhost:31416');
    console.error('  3. Your PTSL.proto file matches your Pro Tools version');
    process.exit(1);
  }

  // Create Express app
  const app = express();

  // Enhanced CORS for Claude Cowork
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id', 'mcp-session-id', 'mcp-protocol-version'],
    exposedHeaders: ['Mcp-Session-Id', 'mcp-session-id'],
    credentials: false
  }));

  app.use(express.json());

  // Log all incoming requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.headers.origin || req.headers.host}`);
    next();
  });

  // Create MCP server once (shared across all sessions)
  const mcpServer = new Server(
    {
      name: 'protools-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // List available tools
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
  }));

  // Handle tool calls
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return await handleToolCall(
        request.params.name,
        request.params.arguments || {},
        client
      );
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // List available resources
  mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'ptsl://reference',
        name: 'PTSL Command Reference',
        description: 'Documentation of available PTSL commands and the Pro Tools data model',
        mimeType: 'text/markdown',
      },
    ],
  }));

  // Read resource content
  mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === 'ptsl://reference') {
      const content = `# PTSL Command Reference

## Overview

PTSL (Pro Tools Scripting Library) provides programmatic control over Pro Tools via gRPC. This reference documents the available commands and data model.

## Data Model

### Sessions
- A Pro Tools session contains tracks, clips, and timeline information
- Sessions have properties like name, path, and sample rate

### Tracks
- Audio, MIDI, or auxiliary tracks in the session
- Each track has properties: name, type, mute state, solo state, record enable state
- Tracks contain playlists

### Playlists
- Each track has one or more playlists (lanes in Pro Tools UI)
- Playlists contain playlist elements (clips/regions on the timeline)

### Playlist Elements
- Individual clips/regions on a track
- Have timeline position (start_time, end_time)
- Reference a clip with its own range (clip.start_point, clip.end_point)

### Clips
- Audio or MIDI files imported into the session
- Appear in the clip list
- Can be referenced by playlist elements on tracks

## Available Commands

Use the \`ptsl_command\` tool with these command names:

### Connection
- **RegisterConnection**: Register a connection to PTSL (handled automatically)
- **GetPTSLVersion**: Get PTSL API version

### Session Management
- **CreateSession**: Create a new session
- **OpenSession**: Open an existing session
- **CloseSession**: Close the current session
- **SaveSession**: Save the current session
- **SaveSessionAs**: Save session to a new location

### Session Properties
- **GetSessionName**: Get the current session name
- **GetSessionPath**: Get the current session file path
- **GetSessionSampleRate**: Get the session sample rate

### Track Operations
- **GetTrackList**: Get all tracks in the session
- **CreateNewTracks**: Create new tracks
- **SelectTracksByName**: Select tracks by name

### Track Properties
- **SetTrackMuteState**: Mute/unmute tracks
- **SetTrackSoloState**: Solo/unsolo tracks
- **SetTrackRecordEnableState**: Enable/disable record on tracks

### Transport
- **SetPlaybackMode**: Set playback mode (normal, loop, dynamic transport, etc.)
- **SetRecordMode**: Set record mode
- **GetPlaybackMode**: Get current playback mode
- **GetRecordMode**: Get current record mode
- **TogglePlayState**: Start/stop playback
- **ToggleRecordEnable**: Enable/disable recording
- **PlayHalfSpeed**: Play at half speed
- **RecordHalfSpeed**: Record at half speed

### Editing
- **Cut**: Cut selected audio/MIDI
- **Copy**: Copy selected audio/MIDI
- **Paste**: Paste audio/MIDI
- **Clear**: Clear selected audio/MIDI

### Timeline
- **SetTimelineSelection**: Set timeline selection range
- **GetTimelineSelection**: Get current timeline selection

### Undo/Redo
- **Undo**: Undo last operation
- **Redo**: Redo last undone operation

### Memory Locations / Markers
- **GetMemoryLocations**: List all markers/memory locations
- **CreateMemoryLocation**: Create a new marker
- **EditMemoryLocation**: Edit an existing marker
- **SelectMemoryLocation**: Jump to a marker
- **ClearMemoryLocation**: Delete specific markers
- **ClearAllMemoryLocations**: Delete all markers

### Clips
- **GetClipList**: Get all clips in the clip list (imported audio files)
- **GetTrackPlaylists**: Get playlists for a specific track
- **GetPlaylistElements**: Get playlist elements (clips on timeline) for a playlist

### Export
- **ExportClipsAsFiles**: Export clips as audio files
- **ExportMix**: Export mix as audio file

## Example Usage

### Get session information
\`\`\`json
{
  "command": "GetSessionName"
}
\`\`\`

### Mute tracks
\`\`\`json
{
  "command": "SetTrackMuteState",
  "params": {
    "track_names": ["Track 1", "Track 2"],
    "enabled": true
  }
}
\`\`\`

### Get clips on a track (multi-step)
\`\`\`json
// Step 1: Get playlists for the track
{
  "command": "GetTrackPlaylists",
  "params": {
    "track_name": "Track 1"
  }
}

// Step 2: Get elements from a playlist (use playlist name from step 1)
{
  "command": "GetPlaylistElements",
  "params": {
    "playlist_name": "Track 1.01"
  }
}
\`\`\`

## Common Parameter Patterns

### Track Names
Most track commands accept \`track_names\` (array of strings):
\`\`\`json
{
  "track_names": ["Track 1", "Track 2"]
}
\`\`\`

### Time Representation
PTSL uses multiple time representations:
- \`time_string\`: Human-readable (e.g., "00:01:30.000")
- \`samples\`: Sample count (string representation of large number)
- \`ticks\`: MIDI ticks

### Response Format
All commands return:
- \`header.status\`: "Succeeded" or "Failed"
- \`response_body\`: Command-specific response data
- \`response_error_json\`: Error details if status is "Failed"

## High-Level Tools vs Raw Commands

For common operations, use the high-level tools (get_track_list, set_track_mute, etc.) which handle error checking and formatting.

Use \`ptsl_command\` for:
- Advanced operations not covered by high-level tools
- Chaining multiple commands for complex workflows
- Exploring PTSL capabilities
`;

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  // Store active transports by session ID
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // Streamable HTTP endpoint (modern MCP transport)
  app.all('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    console.log(`Received ${req.method} request, sessionId: ${sessionId}, method: ${req.body?.method}`);

    if (sessionId && transports[sessionId]) {
      // Existing session - reuse transport
      console.log(`Reusing existing session: ${sessionId}`);
      transport = transports[sessionId];
      await transport.handleRequest(req, res, req.body);
    } else if (sessionId && !transports[sessionId] && isInitializeRequest(req.body)) {
      // Session ID provided but session doesn't exist (server restarted) - treat as new initialization
      console.log(`Session ${sessionId} not found, creating new session for initialize request`);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
          transports[newSessionId] = transport;
          console.log(`Session initialized: ${newSessionId}`);
        },
      });
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } else if (sessionId && !transports[sessionId]) {
      // Session ID provided but session doesn't exist and not an initialize request - error
      console.log(`Session ${sessionId} not found`);
      res.status(404).json({ error: 'Session not found. Please reinitialize.' });
    } else if (!sessionId && req.method === 'GET') {
      // GET request without session ID - this is an SSE stream request
      // Route to active session if available (workaround for missing session ID header)
      const sessionIds = Object.keys(transports);
      if (sessionIds.length >= 1) {
        const targetSessionId = sessionIds[sessionIds.length - 1]; // Use most recent
        console.log(`Routing GET request without session ID to session: ${targetSessionId}`);
        transport = transports[targetSessionId];
        // Inject session ID into rawHeaders
        if ((req as any).rawHeaders) {
          const rawHeaders = (req as any).rawHeaders as string[];
          rawHeaders.push('Mcp-Session-Id', targetSessionId);
        }
        await transport.handleRequest(req, res, req.body);
      } else {
        // No active session - return error
        console.log('GET request without active session');
        res.status(400).json({ error: 'No active session. Please initialize first with POST request.' });
      }
    } else if (!sessionId && !isInitializeRequest(req.body)) {
      // No session ID provided, but not an initialize request
      // Workaround for MCP Inspector/Claude Cowork not sending mcp-session-id header
      // Route to the most recent session (assumes single user)
      const sessionIds = Object.keys(transports);
      if (sessionIds.length === 1) {
        const onlySessionId = sessionIds[0];
        console.log(`Routing request without session ID to active session: ${onlySessionId}`);
        transport = transports[onlySessionId];

        // CRITICAL FIX for MCP Inspector/Claude Cowork bug (Issue #905):
        // These clients don't send the Mcp-Session-Id header after initialization.
        // The transport uses @hono/node-server which reads req.rawHeaders to build the Web Standard Request.
        // We must inject the header into rawHeaders with the exact case "Mcp-Session-Id".
        if ((req as any).rawHeaders) {
          const rawHeaders = (req as any).rawHeaders as string[];
          // rawHeaders is an array like ['Header-Name', 'value', 'Another-Header', 'value', ...]
          rawHeaders.push('Mcp-Session-Id', onlySessionId);
        }

        await transport.handleRequest(req, res, req.body);
      } else if (sessionIds.length > 1) {
        // Multiple sessions - use most recent
        const recentSessionId = sessionIds[sessionIds.length - 1];
        console.log(`Routing request without session ID to recent session: ${recentSessionId} (${sessionIds.length} active sessions)`);
        transport = transports[recentSessionId];
        // Inject session ID into rawHeaders (see comment above)
        if ((req as any).rawHeaders) {
          const rawHeaders = (req as any).rawHeaders as string[];
          rawHeaders.push('Mcp-Session-Id', recentSessionId);
        }
        await transport.handleRequest(req, res, req.body);
      } else {
        console.log('No active session found for request without session ID');
        res.status(400).json({ error: 'No active session found' });
      }
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session - create transport and connect to shared server
      console.log('New MCP connection established');

      // Create transport with session management callback
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
          // Store transport when session is initialized
          transports[newSessionId] = transport;
          console.log(`Session initialized: ${newSessionId}`);
        },
      });

      // Connect the shared server to the new transport
      await mcpServer.connect(transport);

      // Handle the initialize request
      await transport.handleRequest(req, res, req.body);

      // Note: We don't set up cleanup on 'close' here because the response
      // completes after initialization, not when the session ends.
      // Sessions persist across multiple HTTP requests.
    } else {
      // Invalid request
      console.log('Invalid request - no sessionId and not initialize request');
      res.status(400).json({ error: 'Invalid request - missing session ID or not an initialize request' });
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      protools_connected: client.isConnected(),
      session_id: client.getSessionId(),
    });
  });

  // Catch-all to log any requests we're not handling
  app.use((req, res) => {
    console.log(`UNHANDLED REQUEST: ${req.method} ${req.url}`);
    console.log(`Headers: ${JSON.stringify(req.headers)}`);
    res.status(404).json({ error: 'Not found', path: req.url });
  });

  // Start HTTP or HTTPS server
  let server;
  let protocol;

  if (USE_HTTPS) {
    // Try to load SSL certificates
    const certPath = path.join(process.cwd(), 'certs', 'cert.pem');
    const keyPath = path.join(process.cwd(), 'certs', 'key.pem');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.error('');
      console.error('ERROR: SSL certificates not found!');
      console.error('');
      console.error('Please generate certificates first:');
      console.error('  ./generate-certs.sh');
      console.error('');
      console.error('Or run without HTTPS:');
      console.error('  USE_HTTPS=false npm run start:http');
      console.error('');
      process.exit(1);
    }

    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    server = https.createServer(options, app);
    protocol = 'https';
  } else {
    server = http.createServer(app);
    protocol = 'http';
  }

  server.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(60));
    console.log(`Pro Tools MCP Server (${protocol.toUpperCase()}) running`);
    console.log('='.repeat(60));
    console.log('');
    console.log(`  Server URL: ${protocol}://localhost:${PORT}/mcp`);
    console.log(`  Health check: ${protocol}://localhost:${PORT}/health`);
    console.log(`  Pro Tools session: ${client.getSessionId()}`);
    console.log('');
    console.log('Add this URL to Claude Cowork:');
    console.log(`  ${protocol}://localhost:${PORT}/mcp`);
    console.log('');
    if (USE_HTTPS) {
      console.log('Note: Your browser will show a security warning because this');
      console.log('      uses a self-signed certificate. This is normal for local dev.');
      console.log('');
    }
    console.log('='.repeat(60));
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
