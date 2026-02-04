import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Config {
  protoPath: string;
  serverAddress?: string;
}

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.protools-mcp');
const DEFAULT_CONFIG_FILE = path.join(DEFAULT_CONFIG_DIR, 'config.json');

/**
 * Get the config directory path
 */
export function getConfigDir(): string {
  return DEFAULT_CONFIG_DIR;
}

/**
 * Get the config file path
 */
export function getConfigPath(): string {
  return DEFAULT_CONFIG_FILE;
}

/**
 * Load configuration from file or environment
 */
export function loadConfig(): Config {
  // First try to load from config file
  if (fs.existsSync(DEFAULT_CONFIG_FILE)) {
    const data = fs.readFileSync(DEFAULT_CONFIG_FILE, 'utf-8');
    const config = JSON.parse(data);
    return {
      protoPath: config.protoPath,
      serverAddress: config.serverAddress || 'localhost:31416',
    };
  }

  // Fall back to environment variable
  const protoPath = process.env.PTSL_PROTO_PATH;
  if (protoPath) {
    return {
      protoPath,
      serverAddress: process.env.PTSL_SERVER_ADDRESS || 'localhost:31416',
    };
  }

  throw new Error(
    'No configuration found. Please either:\n' +
    `  1. Create ${DEFAULT_CONFIG_FILE} with your PTSL.proto path\n` +
    '  2. Set PTSL_PROTO_PATH environment variable\n' +
    '  3. Run the setup command (not yet implemented)'
  );
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Config): void {
  // Ensure config directory exists
  if (!fs.existsSync(DEFAULT_CONFIG_DIR)) {
    fs.mkdirSync(DEFAULT_CONFIG_DIR, { recursive: true });
  }

  // Write config file
  fs.writeFileSync(
    DEFAULT_CONFIG_FILE,
    JSON.stringify(config, null, 2),
    'utf-8'
  );
}

/**
 * Validate that the proto file exists
 */
export function validateConfig(config: Config): void {
  if (!fs.existsSync(config.protoPath)) {
    throw new Error(`PTSL.proto file not found at: ${config.protoPath}`);
  }
}
