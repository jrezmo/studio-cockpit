import { PTSLClient } from '../grpc/client.js';
import { CommandId } from '../grpc/commands.js';

/**
 * Memory Location / Marker MCP tools
 *
 * Memory locations in Pro Tools can be:
 * - Markers (single time points)
 * - Selections (time ranges with in/out points)
 * - Can be on main ruler, specific tracks, or named rulers
 */

export const markerTools = [
  {
    name: 'get_markers',
    description: 'Get all memory locations/markers in the session',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_marker',
    description: 'Create a new marker/memory location at a specific time',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the marker',
        },
        start_time: {
          type: 'string',
          description: 'Time position in samples, timecode, or bars|beats|ticks (e.g., "48000", "00:00:01:00", "1|1|000")',
        },
        number: {
          type: 'number',
          description: 'Marker number (optional, will auto-assign if not specified)',
        },
        location: {
          type: 'string',
          description: 'Where to place marker: "MarkerLocation_MainRuler", "MarkerLocation_Track", or "MarkerLocation_NamedRuler". Defaults to MainRuler.',
          default: 'MarkerLocation_MainRuler',
        },
        track_name: {
          type: 'string',
          description: 'Track name (required if location is MarkerLocation_Track)',
        },
        comments: {
          type: 'string',
          description: 'Optional comments for the marker',
        },
        color_index: {
          type: 'number',
          description: 'Color index (1-16) for the marker',
        },
      },
      required: ['name', 'start_time'],
    },
  },
  {
    name: 'edit_marker',
    description: 'Edit an existing marker/memory location',
    inputSchema: {
      type: 'object',
      properties: {
        number: {
          type: 'number',
          description: 'Marker number to edit',
        },
        name: {
          type: 'string',
          description: 'New name for the marker',
        },
        start_time: {
          type: 'string',
          description: 'New time position',
        },
        comments: {
          type: 'string',
          description: 'New comments',
        },
        color_index: {
          type: 'number',
          description: 'New color index (1-16)',
        },
      },
      required: ['number'],
    },
  },
  {
    name: 'select_marker',
    description: 'Jump to a specific marker by its number',
    inputSchema: {
      type: 'object',
      properties: {
        number: {
          type: 'number',
          description: 'Marker number to jump to',
        },
      },
      required: ['number'],
    },
  },
  {
    name: 'delete_marker',
    description: 'Delete one or more markers by their numbers',
    inputSchema: {
      type: 'object',
      properties: {
        numbers: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Array of marker numbers to delete',
        },
      },
      required: ['numbers'],
    },
  },
  {
    name: 'delete_all_markers',
    description: 'Delete all markers/memory locations in the session',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleMarkerTool(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  switch (toolName) {
    case 'get_markers':
      return await getMarkers(client);
    case 'create_marker':
      return await createMarker(client, args);
    case 'edit_marker':
      return await editMarker(client, args);
    case 'select_marker':
      return await selectMarker(client, args.number);
    case 'delete_marker':
      return await deleteMarker(client, args.numbers);
    case 'delete_all_markers':
      return await deleteAllMarkers(client);
    default:
      throw new Error(`Unknown marker tool: ${toolName}`);
  }
}

/**
 * Sample PTSL response:
 * {
 *   "response_body": {
 *     "memory_locations": [
 *       {
 *         "number": 1,
 *         "name": "Crafting Chapter",
 *         "location": "MLC_Track",
 *         "track_name": "BCST 120_PT Editing_Voice",
 *         "reference": "MLR_FollowTrackTimebase",
 *         "start_time": "7957007",
 *         "end_time": "7957007",
 *         "time_properties": "TP_Marker",
 *         "comments": "",
 *         "color_index": 11
 *       }
 *     ]
 *   }
 * }
 */
async function getMarkers(client: PTSLClient) {
  try {
    const response = await client.sendRequest(CommandId.GetMemoryLocations, {});

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to get markers: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    const markers = response.response_body?.memory_locations || [];

    if (markers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '**Memory Locations / Markers**\n\nNo markers found in session.',
          },
        ],
      };
    }

    const markerSummary = markers.map((marker: any) => {
      const type = marker.time_properties === 'TP_Marker' ? 'Marker' : 'Selection';
      const location = marker.location || 'Unknown';
      const trackInfo = marker.track_name ? ` (Track: ${marker.track_name})` : '';

      let timeInfo = `  - Time: ${marker.start_time || 'Unknown'}`;
      if (marker.end_time && marker.end_time !== marker.start_time) {
        timeInfo += ` to ${marker.end_time}`;
      }

      return `**#${marker.number}: ${marker.name || 'Unnamed'}** (${type})${trackInfo}\n` +
             `${timeInfo}\n` +
             (marker.comments ? `  - Comments: ${marker.comments}\n` : '') +
             `  - Location: ${location}\n` +
             (marker.color_index ? `  - Color Index: ${marker.color_index}\n` : '');
    }).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Memory Locations / Markers** (${markers.length} total)\n\n${markerSummary}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting markers: ${error}`,
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
async function createMarker(client: PTSLClient, args: any) {
  try {
    const requestBody: any = {
      name: args.name,
      start_time: args.start_time,
      time_properties: 'TProperties_Marker',
      location: args.location || 'MarkerLocation_MainRuler',
    };

    if (args.number !== undefined) {
      requestBody.number = args.number;
    }

    if (args.track_name) {
      requestBody.track_name = args.track_name;
    }

    if (args.comments) {
      requestBody.comments = args.comments;
    }

    if (args.color_index !== undefined) {
      requestBody.color_index = args.color_index;
    }

    const response = await client.sendRequest(CommandId.CreateMemoryLocation, requestBody);

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to create marker: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `**Marker Created**\n\nName: ${args.name}\nTime: ${args.start_time}\nLocation: ${args.location || 'MarkerLocation_MainRuler'}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error creating marker: ${error}`,
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
async function editMarker(client: PTSLClient, args: any) {
  try {
    const requestBody: any = {
      number: args.number,
    };

    if (args.name !== undefined) {
      requestBody.name = args.name;
    }

    if (args.start_time !== undefined) {
      requestBody.start_time = args.start_time;
    }

    if (args.comments !== undefined) {
      requestBody.comments = args.comments;
    }

    if (args.color_index !== undefined) {
      requestBody.color_index = args.color_index;
    }

    const response = await client.sendRequest(CommandId.EditMemoryLocation, requestBody);

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to edit marker #${args.number}: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `**Marker #${args.number} Updated Successfully**`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error editing marker: ${error}`,
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
async function selectMarker(client: PTSLClient, number: number) {
  try {
    const response = await client.sendRequest(CommandId.SelectMemoryLocation, {
      number: number,
    });

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to select marker #${number}: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `**Jumped to Marker #${number}**\n\nTimeline position has been moved to this marker.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error selecting marker: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Sample PTSL response:
 * {
 *   "header": {
 *     "status": "Completed"
 *   },
 *   "response_body": {
 *     "success_count": 2,
 *     "failure_count": 0,
 *     "failure_list": []
 *   }
 * }
 */
async function deleteMarker(client: PTSLClient, numbers: number[]) {
  try {
    const response = await client.sendRequest(CommandId.ClearMemoryLocation, {
      location_list: numbers,
    });

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to delete markers: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    const successCount = response.response_body?.success_count || 0;
    const failureCount = response.response_body?.failure_count || 0;
    const failureList = response.response_body?.failure_list || [];

    let message = `**Markers Deleted**\n\nSuccessfully deleted: ${successCount}`;
    if (failureCount > 0) {
      message += `\nFailed to delete: ${failureCount} (markers: ${failureList.join(', ')})`;
    }

    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
      isError: failureCount > 0,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error deleting markers: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Sample PTSL response:
 * {
 *   "header": {
 *     "status": "Completed"
 *   },
 *   "response_body": {
 *     "success_count": 4,
 *     "failure_count": 0
 *   }
 * }
 */
async function deleteAllMarkers(client: PTSLClient) {
  try {
    const response = await client.sendRequest(CommandId.ClearAllMemoryLocations, {});

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to delete all markers: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    const successCount = response.response_body?.success_count || 0;
    const failureCount = response.response_body?.failure_count || 0;

    return {
      content: [
        {
          type: 'text',
          text: `**All Markers Deleted**\n\nDeleted: ${successCount} markers` +
                (failureCount > 0 ? `\nFailed: ${failureCount}` : ''),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error deleting all markers: ${error}`,
        },
      ],
      isError: true,
    };
  }
}
