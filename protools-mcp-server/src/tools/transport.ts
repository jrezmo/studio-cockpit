import { PTSLClient } from '../grpc/client.js';
import { CommandId } from '../grpc/commands.js';

/**
 * Transport control MCP tools
 */

export const transportTools = [
  {
    name: 'play',
    description: 'Start playback in Pro Tools',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'stop',
    description: 'Stop playback/recording in Pro Tools',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'toggle_play',
    description: 'Toggle between play and stop',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'record',
    description: 'Start recording in Pro Tools',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_playback_mode',
    description: 'Set the playback mode (normal, loop, or dynamic transport)',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['normal', 'loop', 'dynamic'],
          description: 'Playback mode: normal (default), loop (repeat), or dynamic (transport follows edit)',
        },
      },
      required: ['mode'],
    },
  },
];

export async function handleTransportTool(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  switch (toolName) {
    case 'play':
      return await play(client);
    case 'stop':
      return await stop(client);
    case 'toggle_play':
      return await togglePlay(client);
    case 'record':
      return await record(client);
    case 'set_playback_mode':
      return await setPlaybackMode(client, args.mode);
    default:
      throw new Error(`Unknown transport tool: ${toolName}`);
  }
}

/**
 * Sample PTSL response (success):
 * {
 *   "header": {
 *     "status": "Completed"
 *   }
 * }
 */
async function play(client: PTSLClient) {
  try {
    // Set playback mode to normal (not loop) and trigger play via TogglePlayState
    const response = await client.sendRequest(CommandId.TogglePlayState);

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to start playback: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Playback started',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error starting playback: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Sample PTSL response (success):
 * {
 *   "header": {
 *     "status": "Completed"
 *   }
 * }
 */
async function stop(client: PTSLClient) {
  try {
    // TogglePlayState will stop if currently playing
    const response = await client.sendRequest(CommandId.TogglePlayState);

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to stop: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Playback/recording stopped',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error stopping: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Sample PTSL response (success):
 * {
 *   "header": {
 *     "status": "Completed"
 *   }
 * }
 */
async function togglePlay(client: PTSLClient) {
  try {
    const response = await client.sendRequest(CommandId.TogglePlayState);

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to toggle playback: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Playback toggled',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error toggling playback: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Sample PTSL response (success):
 * {
 *   "header": {
 *     "status": "Completed"
 *   }
 * }
 */
async function record(client: PTSLClient) {
  try {
    const response = await client.sendRequest(CommandId.ToggleRecordEnable);

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to start recording: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Recording started',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error starting recording: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Sample PTSL response (success):
 * {
 *   "header": {
 *     "status": "Completed"
 *   }
 * }
 */
async function setPlaybackMode(client: PTSLClient, mode: string) {
  try {
    // Map mode string to PTSL enum value
    const modeMap: { [key: string]: number } = {
      'normal': 1,  // PMode_Normal
      'loop': 2,    // PMode_Loop
      'dynamic': 3, // PMode_DynamicTransport
    };

    const playbackMode = modeMap[mode];
    if (playbackMode === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid playback mode: ${mode}. Must be normal, loop, or dynamic.`,
          },
        ],
        isError: true,
      };
    }

    const requestBody = {
      playback_mode: playbackMode,
    };

    const response = await client.sendRequest(CommandId.SetPlaybackMode, requestBody);

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to set playback mode: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Playback mode set to: ${mode}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error setting playback mode: ${error}`,
        },
      ],
      isError: true,
    };
  }
}
