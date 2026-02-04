#!/usr/bin/env node

/**
 * Simple CLI tool to test PTSL gRPC connection to Pro Tools
 *
 * Usage:
 *   npm run test-cli -- /path/to/PTSL.proto
 *   or
 *   tsx src/test-cli.ts /path/to/PTSL.proto
 */

import { PTSLClient } from './grpc/client.js';
import { CommandId } from './grpc/commands.js';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.error('Pro Tools PTSL Test CLI\n');

  // Get proto path from command line arguments
  const protoPath = process.argv[2];

  if (!protoPath) {
    console.error('Usage: npm run test-cli -- <path-to-PTSL.proto>');
    console.error('');
    console.error('Example:');
    console.error('  npm run test-cli -- ptsl_sdk/Source/PTSL.proto');
    process.exit(1);
  }

  // Resolve and validate proto path
  const resolvedPath = path.resolve(protoPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Proto file not found at ${resolvedPath}`);
    process.exit(1);
  }

  console.error(`Using proto file: ${resolvedPath}\n`);

  try {
    // Create and connect client
    console.error('Connecting to Pro Tools PTSL server...');
    const client = new PTSLClient(resolvedPath);
    await client.connect();

    // Register connection
    console.error('\nRegistering connection...');
    await client.registerConnection('PTSL Test CLI');

    // Test 1: Get PTSL version
    console.error('\n--- Test 1: Get PTSL Version ---');
    try {
      const versionResponse = await client.sendRequest(CommandId.GetPTSLVersion);
      console.error('✓ Success!');
      if (versionResponse.response_body) {
        console.log(JSON.stringify(versionResponse.response_body, null, 2));
      } else {
        console.log(JSON.stringify(versionResponse, null, 2));
      }
    } catch (error) {
      console.error(`✗ Failed: ${error}`);
    }

    // Test 2: Get session name
    console.error('\n--- Test 2: Get Session Name ---');
    try {
      const sessionNameResponse = await client.sendRequest(CommandId.GetSessionName);
      console.error('✓ Success!');
      if (sessionNameResponse.response_body) {
        console.log(JSON.stringify(sessionNameResponse.response_body, null, 2));
      } else {
        console.log(JSON.stringify(sessionNameResponse, null, 2));
      }
    } catch (error) {
      console.error(`✗ Failed: ${error}`);
    }

    // Test 3: Get session path
    console.error('\n--- Test 3: Get Session Path ---');
    try {
      const sessionPathResponse = await client.sendRequest(CommandId.GetSessionPath);
      console.error('✓ Success!');
      if (sessionPathResponse.response_body) {
        console.log(JSON.stringify(sessionPathResponse.response_body, null, 2));
      } else {
        console.log(JSON.stringify(sessionPathResponse, null, 2));
      }
    } catch (error) {
      console.error(`✗ Failed: ${error}`);
    }

    // Test 4: Get track list
    console.error('\n--- Test 4: Get Track List ---');
    try {
      const trackListResponse = await client.sendRequest(CommandId.GetTrackList);
      console.error('✓ Success!');
      if (trackListResponse.response_body) {
        console.log(JSON.stringify(trackListResponse.response_body, null, 2));
      } else {
        console.log(JSON.stringify(trackListResponse, null, 2));
      }
    } catch (error) {
      console.error(`✗ Failed: ${error}`);
    }

    console.error('\n✓ All tests completed!\n');
  } catch (error) {
    console.error(`\n✗ Error: ${error}\n`);
    process.exit(1);
  }
}

main();
