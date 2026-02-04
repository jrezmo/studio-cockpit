import { PTSLClient } from '../grpc/client.js';
import { CommandId } from '../grpc/commands.js';

/**
 * Editing operation MCP tools
 *
 * These tools work with timeline selections and selected tracks to perform
 * standard editing operations like cut, copy, paste, and clear.
 */

export const editingTools = [
  {
    name: 'set_timeline_selection',
    description: 'Set the timeline selection (in/out points) for editing operations. Times can be in samples, timecode, or other formats.',
    inputSchema: {
      type: 'object',
      properties: {
        in_time: {
          type: 'string',
          description: 'Start time of selection (e.g., "0", "1000000" for samples, "00:00:10:00" for timecode)',
        },
        out_time: {
          type: 'string',
          description: 'End time of selection (e.g., "5000000" for samples, "00:00:20:00" for timecode)',
        },
      },
      required: ['in_time', 'out_time'],
    },
  },
  {
    name: 'get_timeline_selection',
    description: 'Get the current timeline selection (in/out points)',
    inputSchema: {
      type: 'object',
      properties: {
        location_type: {
          type: 'string',
          description: 'Time format to return: "TLType_Samples", "TLType_TimeCode", "TLType_MinSecs", etc. Defaults to TLType_Samples',
          default: 'TLType_Samples',
        },
      },
    },
  },
  {
    name: 'cut',
    description: 'Cut the selected content on selected tracks within the timeline selection. Use select_tracks and set_timeline_selection first.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'copy',
    description: 'Copy the selected content on selected tracks within the timeline selection. Use select_tracks and set_timeline_selection first.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'paste',
    description: 'Paste previously copied/cut content at the current timeline position on selected tracks.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'clear',
    description: 'Clear (delete) the selected content on selected tracks within the timeline selection without copying to clipboard.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'undo',
    description: 'Undo the last editing operation',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'redo',
    description: 'Redo the last undone operation',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleEditingTool(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  switch (toolName) {
    case 'set_timeline_selection':
      return await setTimelineSelection(client, args.in_time, args.out_time);
    case 'get_timeline_selection':
      return await getTimelineSelection(client, args.location_type || 'TLType_Samples');
    case 'cut':
      return await performEdit(client, CommandId.Cut, 'Cut');
    case 'copy':
      return await performEdit(client, CommandId.Copy, 'Copy');
    case 'paste':
      return await performEdit(client, CommandId.Paste, 'Paste');
    case 'clear':
      return await performEdit(client, CommandId.Clear, 'Clear');
    case 'undo':
      return await performEdit(client, CommandId.Undo, 'Undo');
    case 'redo':
      return await performEdit(client, CommandId.Redo, 'Redo');
    default:
      throw new Error(`Unknown editing tool: ${toolName}`);
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
async function setTimelineSelection(client: PTSLClient, inTime: string, outTime: string) {
  try {
    const response = await client.sendRequest(CommandId.SetTimelineSelection, {
      in_time: inTime,
      out_time: outTime,
    });

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to set timeline selection: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `**Timeline Selection Set**\n\nIn: ${inTime}\nOut: ${outTime}\n\nYou can now perform editing operations (cut, copy, clear) on the selected tracks within this range.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error setting timeline selection: ${error}`,
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
 *     "in_time": "0",
 *     "out_time": "48000",
 *     "play_start_marker_time": "0"
 *   }
 * }
 */
async function getTimelineSelection(client: PTSLClient, locationType: string) {
  try {
    const response = await client.sendRequest(CommandId.GetTimelineSelection, {
      location_type: locationType,
    });

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to get timeline selection: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    const selection = response.response_body || {};
    const inTime = selection.in_time || 'Unknown';
    const outTime = selection.out_time || 'Unknown';
    const playStartTime = selection.play_start_marker_time || 'N/A';

    return {
      content: [
        {
          type: 'text',
          text: `**Timeline Selection**\n\n` +
                `In Point: ${inTime}\n` +
                `Out Point: ${outTime}\n` +
                `Play Start: ${playStartTime}\n` +
                `Format: ${locationType}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting timeline selection: ${error}`,
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
async function performEdit(client: PTSLClient, commandId: number, commandName: string) {
  try {
    const response = await client.sendRequest(commandId);

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `**${commandName} Failed**\n\n${errorMessages}\n\n` +
                  `**Tip:** Ensure you have:\n` +
                  `1. Selected tracks using select_tracks\n` +
                  `2. Set timeline selection using set_timeline_selection (for cut/copy/clear)\n` +
                  `3. Content in clipboard (for paste)`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `**${commandName} Successful**\n\nOperation completed on selected tracks within the timeline selection.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error performing ${commandName}: ${error}`,
        },
      ],
      isError: true,
    };
  }
}
