import { PTSLClient } from '../grpc/client.js';
import { CommandId } from '../grpc/commands.js';
import { getTimelineCacheStats, refreshProToolsIndex } from './timeline.js';

/**
 * Session management MCP tools
 */

export const sessionTools = [
  {
    name: 'get_session_info',
    description: 'Get information about the current Pro Tools session (name, path, sample rate)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_session_overview',
    description:
      'Get comprehensive overview of the Pro Tools session including format details, tracks, ' +
      'transport state, edit mode, and timeline index status. This is the best tool to understand ' +
      'the complete state of the session at a glance.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'save_session',
    description: 'Save the current Pro Tools session',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_session_length',
    description: 'Get the session length (duration from start to the end of the last content)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleSessionTool(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  switch (toolName) {
    case 'get_session_info':
      return await getSessionInfo(client);
    case 'get_session_overview':
      return await getSessionOverview(client);
    case 'save_session':
      return await saveSession(client);
    case 'get_session_length':
      return await getSessionLength(client);
    default:
      throw new Error(`Unknown session tool: ${toolName}`);
  }
}

/**
 * Sample PTSL responses:
 *
 * GetSessionName:
 * {
 *   "response_body": {
 *     "session_name": "Assign 1_SteveKrulewitz"
 *   }
 * }
 *
 * GetSessionPath:
 * {
 *   "response_body": {
 *     "session_path": {
 *       "path": "/Users/user/Documents/Pro Tools/Sessions/MySession.ptx",
 *       "info": {
 *         "is_online": true
 *       }
 *     }
 *   }
 * }
 *
 * GetSessionSampleRate:
 * {
 *   "response_body": {
 *     "sample_rate": "SR_48000"
 *   }
 * }
 */
async function getSessionInfo(client: PTSLClient) {
  try {
    // Get session name
    const nameResponse = await client.sendRequest(CommandId.GetSessionName);
    const pathResponse = await client.sendRequest(CommandId.GetSessionPath);
    const sampleRateResponse = await client.sendRequest(CommandId.GetSessionSampleRate);

    const sessionInfo = {
      name: nameResponse.response_body?.session_name || 'Unknown',
      path: pathResponse.response_body?.session_path?.path || 'Unknown',
      is_online: pathResponse.response_body?.session_path?.info?.is_online || false,
      sample_rate: sampleRateResponse.response_body?.sample_rate || 'Unknown',
    };

    return {
      content: [
        {
          type: 'text',
          text: `**Pro Tools Session Info**\n\n` +
                `Name: ${sessionInfo.name}\n` +
                `Path: ${sessionInfo.path}\n` +
                `Online: ${sessionInfo.is_online}\n` +
                `Sample Rate: ${sessionInfo.sample_rate}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting session info: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get comprehensive session overview
 */
async function getSessionOverview(client: PTSLClient) {
  try {
    // Auto-refresh timeline cache if not initialized
    if (!getTimelineCacheStats()) {
      await refreshProToolsIndex(client);
    }

    // Gather all session information in parallel
    const [
      nameResponse,
      pathResponse,
      sampleRateResponse,
      bitDepthResponse,
      timecodeRateResponse,
      startTimeResponse,
      lengthResponse,
      counterFormatResponse,
      transportStateResponse,
      editModeResponse,
      editToolResponse,
      trackListResponse,
    ] = await Promise.all([
      client.sendRequest(CommandId.GetSessionName),
      client.sendRequest(CommandId.GetSessionPath),
      client.sendRequest(CommandId.GetSessionSampleRate),
      client.sendRequest(CommandId.GetSessionBitDepth),
      client.sendRequest(CommandId.GetSessionTimeCodeRate),
      client.sendRequest(CommandId.GetSessionStartTime),
      client.sendRequest(CommandId.GetSessionLength),
      client.sendRequest(CommandId.GetMainCounterFormat),
      client.sendRequest(CommandId.GetTransportState),
      client.sendRequest(CommandId.GetEditMode),
      client.sendRequest(CommandId.GetEditTool),
      client.sendRequest(CommandId.GetTrackList),
    ]);

    // Parse responses
    const sessionName = nameResponse.response_body?.session_name || 'Unknown';
    const sessionPath = pathResponse.response_body?.session_path?.path || 'Unknown';
    const isOnline = pathResponse.response_body?.session_path?.info?.is_online || false;
    const sampleRate = sampleRateResponse.response_body?.sample_rate || 'Unknown';
    const bitDepth = bitDepthResponse.response_body?.current_setting || 'Unknown';
    const timecodeRate = timecodeRateResponse.response_body?.current_setting || 'Unknown';
    const startTime = startTimeResponse.response_body?.session_start_time || 'Unknown';
    const sessionLength = lengthResponse.response_body?.session_length || 'Unknown';
    const counterFormat = counterFormatResponse.response_body?.current_setting || 'Unknown';
    const transportState = transportStateResponse.response_body?.current_setting || 'Unknown';
    const editMode = editModeResponse.response_body?.current_setting || 'Unknown';
    const editTool = editToolResponse.response_body?.current_setting || 'Unknown';

    // Analyze tracks
    const tracks = trackListResponse.response_body?.track_list || [];
    const tracksByType: { [key: string]: number } = {};
    tracks.forEach((track: any) => {
      const type = track.type || 'Unknown';
      tracksByType[type] = (tracksByType[type] || 0) + 1;
    });

    const trackSummary = Object.entries(tracksByType)
      .map(([type, count]) => `  - ${type}: ${count}`)
      .join('\n');

    // Get timeline cache stats if available
    const cacheStats = getTimelineCacheStats();
    const timelineSection = cacheStats
      ? `## Timeline Index
- **Total Tracks**: ${cacheStats.totalTracks}
- **Total Clips**: ${cacheStats.totalClips}
- **Last Synced**: ${cacheStats.lastSync.toISOString()}

`
      : `## Timeline Index
- **Status**: Not initialized
- *Run refresh_pro_tools_index to build the timeline cache*

`;

    // Format output
    const overview = `# Pro Tools Session Overview

## Session Details
- **Name**: ${sessionName}
- **Path**: ${sessionPath}
- **Status**: ${isOnline ? 'Online' : 'Offline'}

## Audio Format
- **Sample Rate**: ${sampleRate}
- **Bit Depth**: ${bitDepth}
- **Timecode Rate**: ${timecodeRate}
- **Start Time**: ${startTime}
- **Session Length**: ${sessionLength}

## Current State
- **Transport**: ${transportState}
- **Edit Mode**: ${editMode}
- **Edit Tool**: ${editTool}
- **Counter Format**: ${counterFormat}

## Tracks (Total: ${tracks.length})
${trackSummary || '  No tracks'}

${timelineSection}---
*Use refresh_pro_tools_index to update the timeline cache*
`;

    return {
      content: [
        {
          type: 'text',
          text: overview,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting session overview: ${error}`,
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
async function saveSession(client: PTSLClient) {
  try {
    const response = await client.sendRequest(CommandId.SaveSession);

    // Check if Pro Tools command failed
    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to save session: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Session saved successfully',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error saving session: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Sample PTSL response:
 * {
 *   "response_body": {
 *     "session_length": "24:00:00:00"
 *   }
 * }
 */
async function getSessionLength(client: PTSLClient) {
  try {
    const response = await client.sendRequest(CommandId.GetSessionLength);

    // Check if Pro Tools command failed
    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to get session length: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    const sessionLength = response.response_body?.session_length || 'Unknown';

    return {
      content: [
        {
          type: 'text',
          text: `**Session Length**\n\n${sessionLength}\n\nNote: This represents the end of the last content in the session across all tracks.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting session length: ${error}`,
        },
      ],
      isError: true,
    };
  }
}
