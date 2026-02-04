import { PTSLClient } from '../grpc/client.js';
import { CommandId } from '../grpc/commands.js';

/**
 * Track management MCP tools
 */

export const trackTools = [
  {
    name: 'get_track_list',
    description: 'Get a list of all tracks in the current Pro Tools session with their properties',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'select_tracks',
    description: 'Select tracks by name in Pro Tools',
    inputSchema: {
      type: 'object',
      properties: {
        track_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of track names to select',
        },
      },
      required: ['track_names'],
    },
  },
  {
    name: 'set_track_mute',
    description: 'Mute or unmute tracks in Pro Tools',
    inputSchema: {
      type: 'object',
      properties: {
        track_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of track names to mute/unmute',
        },
        muted: {
          type: 'boolean',
          description: 'Whether to mute (true) or unmute (false) the tracks',
        },
      },
      required: ['track_names', 'muted'],
    },
  },
  {
    name: 'set_track_solo',
    description: 'Solo or unsolo tracks in Pro Tools',
    inputSchema: {
      type: 'object',
      properties: {
        track_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of track names to solo/unsolo',
        },
        solo: {
          type: 'boolean',
          description: 'Whether to solo (true) or unsolo (false) the tracks',
        },
      },
      required: ['track_names', 'solo'],
    },
  },
];

export async function handleTrackTool(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  switch (toolName) {
    case 'get_track_list':
      return await getTrackList(client);
    case 'select_tracks':
      return await selectTracks(client, args.track_names);
    case 'set_track_mute':
      return await setTrackMute(client, args.track_names, args.muted);
    case 'set_track_solo':
      return await setTrackSolo(client, args.track_names, args.solo);
    default:
      throw new Error(`Unknown track tool: ${toolName}`);
  }
}

/**
 * Sample PTSL response:
 * {
 *   "response_body": {
 *     "track_list": [
 *       {
 *         "name": "BCST 120_PT Editing_Voice",
 *         "type": "TT_Audio",
 *         "format": "TF_Stereo",
 *         "index": 1,
 *         "track_attributes": {
 *           "is_muted": false,
 *           "is_soloed": false,
 *           "is_selected": "None",
 *           "contains_clips": true
 *         }
 *       }
 *     ]
 *   }
 * }
 */
async function getTrackList(client: PTSLClient) {
  try {
    const response = await client.sendRequest(CommandId.GetTrackList);
    const tracks = response.response_body?.track_list || [];

    const trackSummary = tracks.map((track: any) => {
      return `• **${track.name}** (${track.type}, ${track.format})\n` +
             `  - Index: ${track.index}\n` +
             `  - Muted: ${track.track_attributes?.is_muted ? 'Yes' : 'No'}\n` +
             `  - Soloed: ${track.track_attributes?.is_soloed ? 'Yes' : 'No'}\n` +
             `  - Selected: ${track.track_attributes?.is_selected !== 'None' ? 'Yes' : 'No'}\n` +
             `  - Has Clips: ${track.track_attributes?.contains_clips ? 'Yes' : 'No'}`;
    }).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Track List** (${tracks.length} tracks)\n\n${trackSummary}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting track list: ${error}`,
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
async function selectTracks(client: PTSLClient, trackNames: string[]) {
  try {
    const requestBody = {
      track_names: trackNames,  // Fixed: was track_name_list
    };

    const response = await client.sendRequest(CommandId.SelectTracksByName, requestBody);

    // Check if Pro Tools command failed
    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to select tracks: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Selected ${trackNames.length} track(s): ${trackNames.join(', ')}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error selecting tracks: ${error}`,
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
async function setTrackMute(client: PTSLClient, trackNames: string[], muted: boolean) {
  try {
    const requestBody = {
      track_names: trackNames,  // Fixed: was track_name_list
      enabled: muted,
    };

    console.error(`[DEBUG] setTrackMute called with: ${JSON.stringify(requestBody)}`);
    const response = await client.sendRequest(CommandId.SetTrackMuteState, requestBody);
    console.error(`[DEBUG] setTrackMute response: ${JSON.stringify(response)}`);

    // Check if Pro Tools command failed
    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to ${muted ? 'mute' : 'unmute'} tracks: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `${muted ? 'Muted' : 'Unmuted'} ${trackNames.length} track(s): ${trackNames.join(', ')}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error setting track mute state: ${error}`,
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
async function setTrackSolo(client: PTSLClient, trackNames: string[], solo: boolean) {
  try {
    const requestBody = {
      track_names: trackNames,  // Fixed: was track_name_list
      enabled: solo,
    };

    const response = await client.sendRequest(CommandId.SetTrackSoloState, requestBody);

    // Check if Pro Tools command failed
    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to ${solo ? 'solo' : 'unsolo'} tracks: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `${solo ? 'Soloed' : 'Unsoloed'} ${trackNames.length} track(s): ${trackNames.join(', ')}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error setting track solo state: ${error}`,
        },
      ],
      isError: true,
    };
  }
}
