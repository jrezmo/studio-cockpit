import { PTSLClient } from '../grpc/client.js';
import { CommandId } from '../grpc/commands.js';

/**
 * Diagnostic tool for sampling PTSL command responses
 *
 * This helps verify that our MCP response formatting matches
 * the actual JSON structure returned by PTSL.
 */

export const diagnosticTools = [
  {
    name: 'sample_ptsl_responses',
    description: 'Sample actual JSON responses from various PTSL commands to verify response formatting. Logs output to server console.',
    inputSchema: {
      type: 'object',
      properties: {
        commands: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of command names to sample (e.g., ["GetTrackList", "GetClipList", "GetMemoryLocations"]). If not provided, samples common commands.',
        },
      },
    },
  },
];

export async function handleDiagnosticTool(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  if (toolName === 'sample_ptsl_responses') {
    return await samplePTSLResponses(client, args.commands);
  }
  throw new Error(`Unknown diagnostic tool: ${toolName}`);
}

async function samplePTSLResponses(client: PTSLClient, commandNames?: string[]) {
  const defaultCommands = [
    'GetTrackList',
    'GetClipList',
    'GetMemoryLocations',
    'GetTimelineSelection',
    'GetSessionName',
    'GetSessionSampleRate',
    'GetSessionLength',
  ];

  const commands = commandNames || defaultCommands;
  const results: { [key: string]: any } = {};
  const errors: { [key: string]: string } = {};

  console.error('\n' + '='.repeat(80));
  console.error('PTSL RESPONSE SAMPLING TOOL');
  console.error('='.repeat(80));

  for (const commandName of commands) {
    // Get command ID from CommandId enum
    const commandId = (CommandId as any)[commandName];

    if (commandId === undefined) {
      errors[commandName] = 'Command not found in CommandId enum';
      console.error(`\n❌ ${commandName}: Command not found`);
      continue;
    }

    try {
      console.error(`\n📡 Sampling ${commandName} (ID: ${commandId})...`);
      const response = await client.sendRequest(commandId);

      // Log the full response structure
      console.error('\n' + '-'.repeat(80));
      console.error(`Response for ${commandName}:`);
      console.error('-'.repeat(80));
      console.error(JSON.stringify(response, null, 2));
      console.error('-'.repeat(80));

      // Store summary
      results[commandName] = {
        status: response.header?.status,
        hasResponseBody: !!response.response_body,
        responseBodyKeys: response.response_body ? Object.keys(response.response_body) : [],
        firstItem: getFirstItem(response.response_body),
      };

      console.error(`✅ ${commandName}: ${response.header?.status || 'Unknown status'}`);

    } catch (error: any) {
      errors[commandName] = error.message || String(error);
      console.error(`❌ ${commandName}: ${error.message}`);
    }
  }

  console.error('\n' + '='.repeat(80));
  console.error('SAMPLING COMPLETE');
  console.error('='.repeat(80));

  // Return summary to user
  let summaryText = '**PTSL Response Sampling Complete**\n\n';
  summaryText += `Sampled ${commands.length} commands. Check server console for full JSON responses.\n\n`;

  if (Object.keys(results).length > 0) {
    summaryText += '**Successful Samples:**\n';
    for (const [cmd, info] of Object.entries(results)) {
      summaryText += `- ${cmd}: ${info.status}\n`;
      if (info.responseBodyKeys.length > 0) {
        summaryText += `  - Response keys: ${info.responseBodyKeys.join(', ')}\n`;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    summaryText += '\n**Errors:**\n';
    for (const [cmd, error] of Object.entries(errors)) {
      summaryText += `- ${cmd}: ${error}\n`;
    }
  }

  summaryText += '\n**Note:** Full JSON responses have been logged to the server console (stderr).';

  return {
    content: [
      {
        type: 'text',
        text: summaryText,
      },
    ],
  };
}

/**
 * Get the first item from a response body to show structure
 */
function getFirstItem(responseBody: any): any {
  if (!responseBody) return null;

  // Check common array field names
  const arrayFields = ['clips', 'track_list', 'memory_locations', 'playlists', 'elements_list'];

  for (const field of arrayFields) {
    if (responseBody[field] && Array.isArray(responseBody[field]) && responseBody[field].length > 0) {
      const item = responseBody[field][0];
      // Return keys only for brevity
      return {
        field: field,
        keys: Object.keys(item),
      };
    }
  }

  return null;
}
