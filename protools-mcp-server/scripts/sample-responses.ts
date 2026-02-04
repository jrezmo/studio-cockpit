#!/usr/bin/env node

/**
 * Standalone script to sample PTSL responses
 *
 * Run with: npm run sample-responses
 */

import { PTSLClient } from '../src/grpc/client.js';
import { CommandId } from '../src/grpc/commands.js';
import { loadConfig } from '../src/config.js';

async function main() {
  console.log('Loading configuration...');
  const config = loadConfig();

  console.log('Connecting to Pro Tools...');
  const client = new PTSLClient(config.protoPath, config.serverAddress);
  await client.connect();
  await client.registerConnection('PTSL Response Sampler');

  console.log('Connected! Sampling responses...\n');

  const commands = [
    { name: 'GetTrackList', id: CommandId.GetTrackList },
    { name: 'GetClipList', id: CommandId.GetClipList },
    { name: 'GetMemoryLocations', id: CommandId.GetMemoryLocations },
    { name: 'GetTimelineSelection', id: CommandId.GetTimelineSelection },
    { name: 'GetSessionName', id: CommandId.GetSessionName },
    { name: 'GetSessionSampleRate', id: CommandId.GetSessionSampleRate },
    { name: 'GetSessionLength', id: CommandId.GetSessionLength },
  ];

  for (const cmd of commands) {
    try {
      console.log('='.repeat(80));
      console.log(`Sampling: ${cmd.name}`);
      console.log('='.repeat(80));

      const response = await client.sendRequest(cmd.id);

      console.log(JSON.stringify(response, null, 2));
      console.log('');

      // Show first item if there's an array
      if (response.response_body) {
        const body = response.response_body;
        const arrayFields = ['clips', 'track_list', 'memory_locations', 'playlists', 'elements_list'];

        for (const field of arrayFields) {
          if (body[field] && Array.isArray(body[field]) && body[field].length > 0) {
            console.log(`First ${field} item keys:`, Object.keys(body[field][0]));
            console.log('');
          }
        }
      }
    } catch (error: any) {
      console.error(`Error sampling ${cmd.name}:`, error.message);
    }
  }

  console.log('='.repeat(80));
  console.log('Sampling complete!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
