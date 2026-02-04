import { PTSLClient } from '../grpc/client.js';
import { CommandId } from '../grpc/commands.js';

/**
 * Raw PTSL command access for advanced use cases
 */

export const rawTools = [
  {
    name: 'ptsl_command',
    description: 'Execute a raw PTSL command with custom parameters. Use this for advanced operations not covered by high-level tools. See the ptsl_reference resource for available commands and their parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The PTSL command name (e.g., "GetSessionName", "SetPlaybackMode", "GetTrackPlaylists")',
        },
        params: {
          type: 'object',
          description: 'Command parameters as a JSON object. Structure depends on the command. Optional for commands that take no parameters.',
        },
      },
      required: ['command'],
    },
  },
];

export async function handleRawTool(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  switch (toolName) {
    case 'ptsl_command':
      return await ptslCommand(client, args.command, args.params);
    default:
      throw new Error(`Unknown raw tool: ${toolName}`);
  }
}

async function ptslCommand(client: PTSLClient, commandName: string, params?: any) {
  try {
    // Map command name to CommandId enum
    const commandId = (CommandId as any)[commandName];

    if (commandId === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: `Unknown PTSL command: "${commandName}". Please check the ptsl_reference resource for available commands.`,
          },
        ],
        isError: true,
      };
    }

    const response = await client.sendRequest(commandId, params || {});

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `PTSL command "${commandName}" failed: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    // Return the raw response as formatted JSON
    const responseBody = response.response_body || {};
    const formattedResponse = JSON.stringify(responseBody, null, 2);

    return {
      content: [
        {
          type: 'text',
          text: `**PTSL Command: ${commandName}**\n\nStatus: ${response.header?.status}\n\nResponse:\n\`\`\`json\n${formattedResponse}\n\`\`\``,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing PTSL command "${commandName}": ${error}`,
        },
      ],
      isError: true,
    };
  }
}
