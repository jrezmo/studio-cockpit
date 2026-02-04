#!/usr/bin/env node

/**
 * Pro Tools MCP Server
 *
 * Enables AI assistants like Claude to control Pro Tools via PTSL
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PTSLClient } from './grpc/client.js';
import { loadConfig, validateConfig } from './config.js';
import { allTools, handleToolCall } from './tools/index.js';

async function main() {
  // Load and validate configuration
  let config;
  try {
    config = loadConfig();
    validateConfig(config);
  } catch (error) {
    console.error(`Configuration error: ${error}`);
    console.error('');
    console.error('Please set the PTSL_PROTO_PATH environment variable:');
    console.error('  export PTSL_PROTO_PATH=/path/to/PTSL.proto');
    console.error('');
    console.error('Or create ~/.protools-mcp/config.json:');
    console.error('  {');
    console.error('    "protoPath": "/path/to/PTSL.proto",');
    console.error('    "serverAddress": "localhost:31416"');
    console.error('  }');
    process.exit(1);
  }

  // Initialize PTSL client
  let client: PTSLClient;
  try {
    client = new PTSLClient(config.protoPath, config.serverAddress);
    await client.connect();
    await client.registerConnection('Pro Tools MCP Server');
  } catch (error) {
    console.error(`Failed to connect to Pro Tools: ${error}`);
    console.error('');
    console.error('Make sure:');
    console.error('  1. Pro Tools is running');
    console.error('  2. PTSL server is available on localhost:31416');
    console.error('  3. Your PTSL.proto file matches your Pro Tools version');
    process.exit(1);
  }

  // Create MCP server
  const server = new Server(
    {
      name: 'protools-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
  }));

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'ptsl://reference',
        name: 'PTSL Command Reference',
        description: 'Documentation of available PTSL commands and the Pro Tools data model',
        mimeType: 'text/markdown',
      },
    ],
  }));

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === 'ptsl://reference') {
      const content = `# PTSL Command Reference

## Overview

PTSL (Pro Tools Scripting Library) provides programmatic control over Pro Tools via gRPC. This reference documents the available commands and data model.

## Data Model

### Sessions
- A Pro Tools session contains tracks, clips, and timeline information
- Sessions have properties like name, path, and sample rate

### Tracks
- Audio, MIDI, or auxiliary tracks in the session
- Each track has properties: name, type, mute state, solo state, record enable state
- Tracks contain playlists

### Playlists
- Each track has one or more playlists (lanes in Pro Tools UI)
- Playlists contain playlist elements (clips/regions on the timeline)

### Playlist Elements
- Individual clips/regions on a track
- Have timeline position (start_time, end_time)
- Reference a clip with its own range (clip.start_point, clip.end_point)

### Clips
- Audio or MIDI files imported into the session
- Appear in the clip list
- Can be referenced by playlist elements on tracks

## Available Commands

Use the \`ptsl_command\` tool with these command names:

### Connection
- **RegisterConnection**: Register a connection to PTSL (handled automatically)
- **GetPTSLVersion**: Get PTSL API version

### Session Management
- **CreateSession**: Create a new session
- **OpenSession**: Open an existing session
- **CloseSession**: Close the current session
- **SaveSession**: Save the current session
- **SaveSessionAs**: Save session to a new location

### Session Properties
- **GetSessionName**: Get the current session name
- **GetSessionPath**: Get the current session file path
- **GetSessionSampleRate**: Get the session sample rate

### Track Operations
- **GetTrackList**: Get all tracks in the session
- **CreateNewTracks**: Create new tracks
- **SelectTracksByName**: Select tracks by name

### Track Properties
- **SetTrackMuteState**: Mute/unmute tracks
- **SetTrackSoloState**: Solo/unsolo tracks
- **SetTrackRecordEnableState**: Enable/disable record on tracks

### Transport
- **SetPlaybackMode**: Set playback mode (normal, loop, dynamic transport, etc.)
- **SetRecordMode**: Set record mode
- **GetPlaybackMode**: Get current playback mode
- **GetRecordMode**: Get current record mode
- **TogglePlayState**: Start/stop playback
- **ToggleRecordEnable**: Enable/disable recording
- **PlayHalfSpeed**: Play at half speed
- **RecordHalfSpeed**: Record at half speed

### Editing Workflow
Editing operations work on selected tracks within a timeline selection:
1. Select tracks using \`select_tracks\` (by name)
2. Set timeline selection (in/out points) using \`set_timeline_selection\`
3. Perform editing operations: \`cut\`, \`copy\`, \`clear\`
4. Move timeline position or select different tracks
5. Use \`paste\` to paste the clipboard content

Commands:
- **Cut**: Cut selected audio/MIDI within timeline selection
- **Copy**: Copy selected audio/MIDI within timeline selection
- **Paste**: Paste clipboard content at current position
- **Clear**: Delete selected audio/MIDI without copying to clipboard
- **SetTimelineSelection**: Set timeline selection range (in/out points)
- **GetTimelineSelection**: Get current timeline selection
- **Undo**: Undo last operation
- **Redo**: Redo last undone operation

**Note:** These are PUBLIC API commands that work without private API access!

### Memory Locations / Markers
Memory locations include markers (time points) and selections (time ranges):
- **GetMemoryLocations**: List all markers/memory locations in the session
- **CreateMemoryLocation**: Create a new marker at a specific time
- **EditMemoryLocation**: Modify an existing marker's properties
- **SelectMemoryLocation**: Jump to a marker (moves timeline position)
- **ClearMemoryLocation**: Delete specific markers by their numbers
- **ClearAllMemoryLocations**: Delete all markers in the session

Markers can be placed on:
- Main ruler (timeline)
- Specific tracks
- Named rulers

**Note:** All marker commands are PUBLIC API!

### Clips
- **GetClipList**: Get all clips in the clip list (imported audio files)
- **GetTrackPlaylists**: Get playlists for a specific track
- **GetPlaylistElements**: Get playlist elements (clips on timeline) for a playlist

### Export
- **ExportClipsAsFiles**: Export clips as audio files
- **ExportMix**: Export mix as audio file

## Example Usage

### Get session information
\`\`\`json
{
  "command": "GetSessionName"
}
\`\`\`

### Mute tracks
\`\`\`json
{
  "command": "SetTrackMuteState",
  "params": {
    "track_names": ["Track 1", "Track 2"],
    "enabled": true
  }
}
\`\`\`

### Editing workflow example (cut and paste)
\`\`\`json
// Step 1: Select tracks
{
  "command": "SelectTracksByName",
  "params": {
    "track_names": ["Track 1"]
  }
}

// Step 2: Set timeline selection (in samples or timecode)
{
  "command": "SetTimelineSelection",
  "params": {
    "in_time": "0",
    "out_time": "48000"  // 1 second at 48kHz
  }
}

// Step 3: Cut the selection
{
  "command": "Cut"
}

// Step 4: Move to new position and paste
{
  "command": "SetTimelineSelection",
  "params": {
    "in_time": "96000",
    "out_time": "96000"  // Paste point
  }
}

{
  "command": "Paste"
}
\`\`\`

### Creating and navigating markers
\`\`\`json
// Step 1: Create markers for song sections
{
  "command": "CreateMemoryLocation",
  "params": {
    "name": "Intro",
    "start_time": "0",
    "location": "MarkerLocation_MainRuler"
  }
}

{
  "command": "CreateMemoryLocation",
  "params": {
    "name": "Verse 1",
    "start_time": "00:00:08:00",  // Timecode format
    "location": "MarkerLocation_MainRuler"
  }
}

// Step 2: List all markers
{
  "command": "GetMemoryLocations"
}

// Step 3: Jump to a marker
{
  "command": "SelectMemoryLocation",
  "params": {
    "number": 2  // Jump to Verse 1
  }
}
\`\`\`

### Get clips on a track (multi-step)
\`\`\`json
// Step 1: Get playlists for the track
{
  "command": "GetTrackPlaylists",
  "params": {
    "track_name": "Track 1"
  }
}

// Step 2: Get elements from a playlist (use playlist name from step 1)
{
  "command": "GetPlaylistElements",
  "params": {
    "playlist_name": "Track 1.01"
  }
}
\`\`\`

## Common Parameter Patterns

### Track Names
Most track commands accept \`track_names\` (array of strings):
\`\`\`json
{
  "track_names": ["Track 1", "Track 2"]
}
\`\`\`

### Time Representation
PTSL uses multiple time representations:
- \`time_string\`: Human-readable (e.g., "00:01:30.000")
- \`samples\`: Sample count (string representation of large number)
- \`ticks\`: MIDI ticks

### Response Format
All commands return:
- \`header.status\`: "Succeeded" or "Failed"
- \`response_body\`: Command-specific response data
- \`response_error_json\`: Error details if status is "Failed"

## High-Level Tools vs Raw Commands

For common operations, use the high-level tools (get_track_list, set_track_mute, etc.) which handle error checking and formatting.

Use \`ptsl_command\` for:
- Advanced operations not covered by high-level tools
- Chaining multiple commands for complex workflows
- Exploring PTSL capabilities
`;

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return await handleToolCall(
        request.params.name,
        request.params.arguments || {},
        client
      );
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Pro Tools MCP Server running');
  console.error(`Connected to Pro Tools with session ID: ${client.getSessionId()}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
