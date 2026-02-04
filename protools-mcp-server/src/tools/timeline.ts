import { PTSLClient } from '../grpc/client.js';
import { CommandId } from '../grpc/commands.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Timeline Tool
 *
 * Provides timeline indexing and search capabilities by parsing Pro Tools
 * session export data. This allows the LLM to understand the spatial layout
 * of clips on the timeline.
 */

// ============================================================================
// MCP Tool Definitions
// ============================================================================

export const timelineTools = [
  {
    name: 'refresh_pro_tools_index',
    description:
      'Synchronizes the local cache with the Pro Tools timeline. ' +
      'MANDATORY to call this tool if the user mentions recording new clips, moving audio on the timeline, or renaming tracks. ' +
      'It triggers "Export Session Info as Text" in Pro Tools and parses the result to build a timeline map. ' +
      'This provides a searchable index of audio clips and their timeline positions. ' +
      'LIMITATION: Only indexes audio clips - MIDI clips cannot be indexed due to PTSL API restrictions.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_timeline_tracks',
    description:
      'Get a list of all tracks from the locally cached timeline index. ' +
      'Returns track names, types, and clip counts. ' +
      'Does not communicate with Pro Tools directly.',
    inputSchema: {
      type: 'object',
      properties: {
        start: {
          type: 'number',
          description: 'Starting index for pagination (default: 0)',
          default: 0,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tracks to return (default: 50, max: 100)',
          default: 50,
        },
      },
    },
  },
  {
    name: 'get_timeline_clips',
    description:
      'Get clips CURRENTLY PLACED ON THE TIMELINE with their timeline positions and durations. ' +
      'Use this when you want to see what audio is actually in the session timeline. ' +
      'Returns clips sorted by timeline position with pagination support. ' +
      'For the clip library/media pool (available but not necessarily on timeline), use get_clip_list instead.',
    inputSchema: {
      type: 'object',
      properties: {
        track_name: {
          type: 'string',
          description: 'Optional: Filter to clips on a specific track',
        },
        start: {
          type: 'number',
          description: 'Starting index for pagination (default: 0)',
          default: 0,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of clips to return (default: 50, max: 100)',
          default: 50,
        },
        sort_by: {
          type: 'string',
          enum: ['timeline_position', 'clip_name', 'track_name'],
          description: 'Sort order for clips (default: timeline_position)',
          default: 'timeline_position',
        },
      },
    },
  },
  {
    name: 'search_timeline',
    description:
      'Fast search of the locally cached timeline index. Queries audio clip names and track names. ' +
      'If no results are found, automatically re-indexes the timeline from Pro Tools and retries the search. ' +
      'This ensures you always get the most up-to-date results without manual re-indexing. ' +
      'LIMITATION: Only searches audio clips - MIDI clips are not indexed.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term to look for in clip names, track names, or markers',
        },
        scope: {
          type: 'string',
          enum: ['clips', 'tracks', 'all'],
          description: 'What to search: clips, tracks, or all (default: all)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'select_clip_on_timeline',
    description:
      'Highlights a specific range on the Pro Tools timeline. Use the track_name, start_time, and end_time ' +
      'retrieved from search_timeline to highlight a specific clip for the user. ' +
      'Sets the edit tool to Selector, selects the track, and sets the timeline selection range. ' +
      'This will highlight the clip on the timeline and mark it as selected in the clip list.',
    inputSchema: {
      type: 'object',
      properties: {
        track_name: {
          type: 'string',
          description: 'Name of the track containing the clip',
        },
        start_time: {
          type: 'string',
          description: 'Start time of the clip (in session time format, usually timecode)',
        },
        end_time: {
          type: 'string',
          description: 'End time of the clip (in session time format, usually timecode)',
        },
      },
      required: ['track_name', 'start_time', 'end_time'],
    },
  },
];

// ============================================================================
// Data Structures
// ============================================================================

interface ClipInstance {
  name: string;
  startTime: string;
  endTime: string;
  duration: string;
}

interface TrackMap {
  name: string;
  type: string;  // "Audio Track", "Aux Track", "Master Track", etc.
  clips: ClipInstance[];
}

interface SessionCache {
  tracks: TrackMap[];
  sessionTimeFormat: string;  // "Timecode", "Samples", etc.
  lastSync: Date | null;
}

// Global singleton cache
let sessionCache: SessionCache = {
  tracks: [],
  sessionTimeFormat: 'Timecode',
  lastSync: null,
};

// ============================================================================
// Cache Access
// ============================================================================

/**
 * Get cache statistics for session overview
 */
export function getTimelineCacheStats() {
  if (!sessionCache.lastSync) {
    return null;
  }

  const totalTracks = sessionCache.tracks.length;
  const totalClips = sessionCache.tracks.reduce((sum, track) => sum + track.clips.length, 0);

  return {
    totalTracks,
    totalClips,
    lastSync: sessionCache.lastSync,
  };
}

// ============================================================================
// Tool Entry Point
// ============================================================================

export async function handleTimelineTool(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  switch (toolName) {
    case 'refresh_pro_tools_index':
      return await refreshProToolsIndex(client);
    case 'get_timeline_tracks':
      return await getTimelineTracks(args, client);
    case 'get_timeline_clips':
      return await getTimelineClips(args, client);
    case 'search_timeline':
      return await searchTimeline(args.query, args.scope, client);
    case 'select_clip_on_timeline':
      return await selectClipOnTimeline(client, args.track_name, args.start_time, args.end_time);
    default:
      throw new Error(`Unknown timeline tool: ${toolName}`);
  }
}

// ============================================================================
// Tool: refresh_pro_tools_index
// ============================================================================

/**
 * Exports session info from Pro Tools and parses the timeline data.
 * This builds an in-memory cache of tracks and clips with their timeline positions.
 *
 * LIMITATION: The PTSL ExportSessionInfoAsText command only exports audio track EDLs.
 * MIDI clips are not included in the export and therefore cannot be indexed.
 * This is a limitation of the Pro Tools Scripting Library API.
 */
export async function refreshProToolsIndex(client: PTSLClient) {
  try {
    // Generate temporary file path
    const tmpDir = os.tmpdir();
    const exportPath = path.join(tmpDir, `pt_export_${Date.now()}.txt`);

    console.error(`Exporting session info to: ${exportPath}`);

    // Call ExportSessionInfoAsText
    const response = await client.sendRequest(CommandId.ExportSessionInfoAsText, {
      include_file_list: false,
      include_clip_list: false,
      include_markers: false,
      include_plugin_list: false,
      include_track_edls: true,  // This gives us the timeline map (audio only)
      show_sub_frames: false,
      include_user_timestamps: false,
      track_list_type: 'TListType_AllTracks',
      fade_handling_type: 'FHType_ShowCrossfades',
      location_type: 'TLType_TimeCode',  // Use timecode format
      text_as_file_format: 'TFFormat_UTF8',
      output_type: 'ESIOType_File',
      output_path: exportPath,
    });

    if (response.header?.status === 'Failed') {
      const errorJson = response.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to export session info: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    // Read the exported file
    const fileContent = await fs.readFile(exportPath, 'utf8');

    // Parse the file
    const parsedData = parseSessionExport(fileContent);

    // Update the global cache
    sessionCache = {
      tracks: parsedData.tracks,
      sessionTimeFormat: 'Timecode',
      lastSync: new Date(),
    };

    // Clean up the temp file
    await fs.unlink(exportPath).catch(() => {
      // Ignore errors if file doesn't exist
    });

    const audioTrackCount = parsedData.tracks.length;
    const totalClips = parsedData.tracks.reduce((sum, t) => sum + t.clips.length, 0);

    return {
      content: [
        {
          type: 'text',
          text: `Timeline index refreshed successfully.\n\n` +
                `Found ${audioTrackCount} audio tracks with a total of ${totalClips} clips.\n\n` +
                `**Note:** MIDI clips are not included due to PTSL API limitations.\n\n` +
                `Last sync: ${sessionCache.lastSync?.toISOString()}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error refreshing timeline index: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// Tool: get_timeline_tracks
// ============================================================================

/**
 * Get a list of tracks from the cached timeline data.
 */
async function getTimelineTracks(args: any, client?: PTSLClient) {
  try {
    // Auto-refresh cache if not initialized
    if (!sessionCache.lastSync && client) {
      await refreshProToolsIndex(client);
    }

    if (!sessionCache.lastSync) {
      return {
        content: [
          {
            type: 'text',
            text: 'Timeline index could not be initialized.',
          },
        ],
        isError: true,
      };
    }

    // Parse parameters with defaults
    const start = args.start || 0;
    const limit = Math.min(args.limit || 50, 100); // Cap at 100

    const totalCount = sessionCache.tracks.length;

    if (totalCount === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No tracks found in session.',
          },
        ],
      };
    }

    // Apply pagination
    const paginatedTracks = sessionCache.tracks.slice(start, start + limit);
    const returnedCount = paginatedTracks.length;

    // Format results
    let resultText = `**Timeline Tracks** (showing ${start + 1}-${start + returnedCount} of ${totalCount})\n\n`;

    for (let i = 0; i < paginatedTracks.length; i++) {
      const track = paginatedTracks[i];
      const index = start + i + 1;
      resultText += `${index}. **${track.name}**\n`;
      resultText += `   Type: ${track.type}\n`;
      resultText += `   Clips: ${track.clips.length}\n\n`;
    }

    // Add pagination hint if there are more results
    if (start + returnedCount < totalCount) {
      const remaining = totalCount - (start + returnedCount);
      resultText += `---\n`;
      resultText += `**${remaining} more track${remaining !== 1 ? 's' : ''} available.** `;
      resultText += `Use start=${start + returnedCount} to see the next page.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting timeline tracks: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// Tool: get_timeline_clips
// ============================================================================

/**
 * Get a paginated list of clips from the cached timeline data.
 */
async function getTimelineClips(args: any, client?: PTSLClient) {
  try {
    // Auto-refresh cache if not initialized
    if (!sessionCache.lastSync && client) {
      await refreshProToolsIndex(client);
    }

    if (!sessionCache.lastSync) {
      return {
        content: [
          {
            type: 'text',
            text: 'Timeline index could not be initialized.',
          },
        ],
        isError: true,
      };
    }

    // Parse parameters with defaults
    const trackName = args.track_name;
    const start = args.start || 0;
    const limit = Math.min(args.limit || 50, 100); // Cap at 100
    const sortBy = args.sort_by || 'timeline_position';

    // Collect all clips with track information
    interface ClipWithTrack {
      clipName: string;
      trackName: string;
      startTime: string;
      endTime: string;
      duration: string;
    }

    let allClips: ClipWithTrack[] = [];

    for (const track of sessionCache.tracks) {
      // Apply track filter if specified
      if (trackName && track.name !== trackName) {
        continue;
      }

      for (const clip of track.clips) {
        allClips.push({
          clipName: clip.name,
          trackName: track.name,
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.duration,
        });
      }
    }

    // Sort clips
    if (sortBy === 'clip_name') {
      allClips.sort((a, b) => a.clipName.localeCompare(b.clipName));
    } else if (sortBy === 'track_name') {
      allClips.sort((a, b) => {
        const trackCompare = a.trackName.localeCompare(b.trackName);
        if (trackCompare !== 0) return trackCompare;
        // Secondary sort by timeline position within same track
        return a.startTime.localeCompare(b.startTime);
      });
    } else {
      // Default: timeline_position (sort by start time)
      allClips.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    const totalCount = allClips.length;

    // Apply pagination
    const paginatedClips = allClips.slice(start, start + limit);
    const returnedCount = paginatedClips.length;

    if (totalCount === 0) {
      const filterMsg = trackName ? ` on track "${trackName}"` : '';
      return {
        content: [
          {
            type: 'text',
            text: `No clips found${filterMsg}.`,
          },
        ],
      };
    }

    // Format results
    let resultText = `**Timeline Clips** (showing ${start + 1}-${start + returnedCount} of ${totalCount})\n\n`;

    if (trackName) {
      resultText += `Filtered to track: ${trackName}\n`;
    }
    resultText += `Sorted by: ${sortBy}\n\n`;

    for (let i = 0; i < paginatedClips.length; i++) {
      const clip = paginatedClips[i];
      const index = start + i + 1;
      resultText += `${index}. **${clip.clipName}**\n`;
      resultText += `   Track: ${clip.trackName}\n`;
      resultText += `   Time: ${clip.startTime} - ${clip.endTime}\n`;
      resultText += `   Duration: ${clip.duration}\n\n`;
    }

    // Add pagination hint if there are more results
    if (start + returnedCount < totalCount) {
      const remaining = totalCount - (start + returnedCount);
      resultText += `---\n`;
      resultText += `**${remaining} more clip${remaining !== 1 ? 's' : ''} available.** `;
      resultText += `Use start=${start + returnedCount} to see the next page.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting timeline clips: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// Tool: search_timeline
// ============================================================================

/**
 * Searches the cached timeline data for clips, tracks, or markers.
 * Automatically re-indexes if no results are found and retries the search.
 */
async function searchTimeline(query: string, scope: string = 'all', client?: PTSLClient) {
  try {
    // Auto-refresh cache if not initialized
    if (!sessionCache.lastSync && client) {
      await refreshProToolsIndex(client);
    }

    if (!sessionCache.lastSync) {
      return {
        content: [
          {
            type: 'text',
            text: 'Timeline index could not be initialized.',
          },
        ],
        isError: true,
      };
    }

    // Helper function to perform the search
    const performSearch = () => {
      const results: any = {
        query,
        scope,
        tracks: [],
        clips: [],
      };

      const lowerQuery = query.toLowerCase();

      // Search tracks
      if (scope === 'tracks' || scope === 'all') {
        results.tracks = sessionCache.tracks.filter(track =>
          track.name.toLowerCase().includes(lowerQuery)
        ).map(track => ({
          name: track.name,
          type: track.type,
          clipCount: track.clips.length,
        }));
      }

      // Search clips
      if (scope === 'clips' || scope === 'all') {
        for (const track of sessionCache.tracks) {
          const matchingClips = track.clips.filter(clip =>
            clip.name.toLowerCase().includes(lowerQuery)
          );

          for (const clip of matchingClips) {
            results.clips.push({
              clipName: clip.name,
              trackName: track.name,
              startTime: clip.startTime,
              endTime: clip.endTime,
              duration: clip.duration,
            });
          }
        }
      }

      return results;
    };

    // First search attempt
    let results = performSearch();
    let totalResults = results.tracks.length + results.clips.length;
    let reindexed = false;

    // If no results found and client is available, re-index and try again
    if (totalResults === 0 && client) {
      console.error(`No results found for "${query}", re-indexing timeline...`);
      await refreshProToolsIndex(client);
      reindexed = true;

      // Retry search after re-indexing
      results = performSearch();
      totalResults = results.tracks.length + results.clips.length;
    }

    // Still no results after re-indexing
    if (totalResults === 0) {
      const reindexMsg = reindexed
        ? 'Timeline was re-indexed but still no matches found.'
        : 'No results found.';

      return {
        content: [
          {
            type: 'text',
            text: `No results found for query: "${query}"\n\n${reindexMsg}`,
          },
        ],
      };
    }

    // Format results
    let resultText = `Found ${totalResults} results for query: "${query}"`;

    if (reindexed) {
      resultText += ` (after re-indexing timeline)`;
    }
    resultText += '\n\n';

    if (results.tracks.length > 0) {
      resultText += `**Tracks (${results.tracks.length}):**\n`;
      for (const track of results.tracks) {
        resultText += `- ${track.name} (${track.type}, ${track.clipCount} clips)\n`;
      }
      resultText += '\n';
    }

    if (results.clips.length > 0) {
      resultText += `**Clips (${results.clips.length}):**\n`;
      for (const clip of results.clips) {
        resultText += `- "${clip.clipName}" on track "${clip.trackName}"\n`;
        resultText += `  Time: ${clip.startTime} - ${clip.endTime} (duration: ${clip.duration})\n`;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching timeline: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// Tool: select_clip_on_timeline
// ============================================================================

/**
 * Selects a clip on the timeline by setting the edit tool and timeline selection.
 */
async function selectClipOnTimeline(
  client: PTSLClient,
  trackName: string,
  startTime: string,
  endTime: string
) {
  try {
    // Step 1: Set edit tool to Selector
    console.error('Setting edit tool to Selector...');
    const toolResponse = await client.sendRequest(CommandId.SetEditTool, {
      edit_tool: 'ET_Selector',
    });

    if (toolResponse.header?.status === 'Failed') {
      const errorJson = toolResponse.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to set edit tool: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    // Step 2: Select the track
    console.error(`Selecting track: ${trackName}...`);
    const selectTrackResponse = await client.sendRequest(CommandId.SelectTracksByName, {
      track_names: [trackName],
    });

    if (selectTrackResponse.header?.status === 'Failed') {
      const errorJson = selectTrackResponse.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages = errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      return {
        content: [
          {
            type: 'text',
            text: `Failed to select track: ${errorMessages}`,
          },
        ],
        isError: true,
      };
    }

    // Step 3: Set timeline selection to the clip range
    console.error(`Setting timeline selection: ${startTime} to ${endTime}...`);
    const timelineResponse = await client.sendRequest(CommandId.SetTimelineSelection, {
      in_time: startTime,
      out_time: endTime,
    });

    if (timelineResponse.header?.status === 'Failed') {
      const errorJson = timelineResponse.response_error_json || '{}';
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
          text: `Clip highlighted on timeline:\n` +
                `- Track: ${trackName}\n` +
                `- Time range: ${startTime} - ${endTime}\n\n` +
                `Edit tool set to Selector, track selected, and timeline range highlighted. ` +
                `The clip should now be visible as selected in both the timeline and clip list.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error selecting clip: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

// ============================================================================
// Parser: Session Export Text File
// ============================================================================

enum ParserState {
  IDLE,
  TRACK_FOUND,
  PARSING_EDL,
}

interface ParseResult {
  tracks: TrackMap[];
}

/**
 * Parses the Pro Tools session export text file.
 *
 * Example format:
 *
 * TRACK NAME:  Audio 1
 *
 * EVENT #	CLIP NAME	START TIME	END TIME	DURATION
 * 1	Clip1	01:00:00:00.00	01:00:05:00.00	00:00:05:00.00
 * 2	Clip2	01:00:10:00.00	01:00:15:00.00	00:00:05:00.00
 */
function parseSessionExport(content: string): ParseResult {
  const lines = content.split('\n');
  const tracks: TrackMap[] = [];

  let state = ParserState.IDLE;
  let currentTrack: TrackMap | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (state === ParserState.IDLE) {
      // Look for "TRACK NAME:" line
      const trackMatch = line.match(/^TRACK NAME:\s+(.+?)(?:\s+\((.+?)\))?$/);
      if (trackMatch) {
        const trackName = trackMatch[1].trim();
        const trackType = trackMatch[2] || 'Audio Track';

        currentTrack = {
          name: trackName,
          type: trackType,
          clips: [],
        };

        state = ParserState.TRACK_FOUND;
      }
    } else if (state === ParserState.TRACK_FOUND) {
      // Look for the EDL header line
      if (trimmedLine.includes('EVENT') && trimmedLine.includes('CLIP NAME') &&
          trimmedLine.includes('START TIME')) {
        state = ParserState.PARSING_EDL;
      }
    } else if (state === ParserState.PARSING_EDL) {
      // Check if we hit an empty line or a new track (end of EDL)
      if (trimmedLine === '' || line.startsWith('TRACK NAME:')) {
        // Save current track and reset
        if (currentTrack) {
          tracks.push(currentTrack);
          currentTrack = null;
        }
        state = ParserState.IDLE;

        // Re-process this line in case it's a new track
        if (line.startsWith('TRACK NAME:')) {
          i--;
        }
        continue;
      }

      // Parse clip line: starts with event number
      // Format: "1\tClip Name\t01:00:00:00.00\t01:00:05:00.00\t00:00:05:00.00"
      const clipMatch = line.match(/^(\d+)\s+(.+?)\s+([\d:\.]+)\s+([\d:\.]+)\s+([\d:\.]+)/);

      if (clipMatch && currentTrack) {
        const clipName = clipMatch[2].trim();
        const startTime = clipMatch[3].trim();
        const endTime = clipMatch[4].trim();
        const duration = clipMatch[5].trim();

        currentTrack.clips.push({
          name: clipName,
          startTime,
          endTime,
          duration,
        });
      }
    }
  }

  // Don't forget to add the last track if we were still parsing
  if (currentTrack) {
    tracks.push(currentTrack);
  }

  return { tracks };
}
