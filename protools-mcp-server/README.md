# Pro Tools MCP Server

An MCP (Model Context Protocol) server that enables AI assistants like Claude to control Pro Tools via the PTSL (Pro Tools Scripting Library) gRPC API.

> ⚠️ **Experimental Project:** This is a work in progress and not all Pro Tools features are implemented yet. Use at your own risk!

## Features

The server provides AI assistants with the following capabilities:

- **Session Management** - Query session info, save sessions, get comprehensive session overview
- **Timeline Navigation** - Browse tracks and clips with pagination, search by name, navigate the timeline (audio clips only)
- **Track Control** - List, select, mute, solo, and manage tracks
- **Clip Management** - Find and work with audio clips on the timeline
- **Editing Operations** - Cut, copy, paste, clear, undo/redo with timeline selections
- **Markers** - Create, list, and navigate session markers
- **Transport Control** - Play, stop, record, and control playback
- **Visual Analysis** - Generate waveform images and analyze audio content (onsets, peaks, silence detection)
- **Raw PTSL Access** - Send custom PTSL commands for advanced use cases
- **Diagnostics** - Test and verify PTSL connection status

### Known Limitations

- **MIDI Clips**: The timeline indexing only captures audio clips. MIDI clip positions cannot be queried due to PTSL API limitations. MIDI clips can be seen in the clip list but their timeline positions are not available.

## Safety Features

The server uses a **granular permission system** to protect your Pro Tools sessions. By default, it runs in **read-only mode** with safe audio analysis enabled.

### Default Permissions (No Configuration Needed)

**Always allowed:**
- Read operations (queries, track lists, clip info, session info)
- Playback control (play, stop, toggle)
- UI state changes (mute/solo, timeline selection, edit tools)
- Copy to clipboard (non-destructive)
- Export audio to temp directories only (enables audio analysis)

**Blocked by default** (require `ALLOW_WRITES` to enable):
- Creating/editing markers (`memory`)
- Cut/paste/clear operations (`clipboard`)
- Exporting to custom paths (`export`)
- Creating/deleting tracks (`track_structure`)
- Saving/opening sessions (`session`)
- Recording (`recording`)

### Enabling Write Operations

Use the `ALLOW_WRITES` environment variable to enable specific permission groups:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "protools": {
      "command": "node",
      "args": ["/absolute/path/to/protools-mcp-server/dist/index.js"],
      "env": {
        "PTSL_PROTO_PATH": "/absolute/path/to/PTSL.proto",
        "ALLOW_WRITES": "memory,clipboard"
      }
    }
  }
}
```

**Command Line:**
```bash
# Allow markers and clipboard editing
ALLOW_WRITES=memory,clipboard PTSL_PROTO_PATH=/path/to/PTSL.proto node dist/index.js

# Allow everything (use with caution)
ALLOW_WRITES=all PTSL_PROTO_PATH=/path/to/PTSL.proto node dist/index.js
```

### Permission Groups

| Group | Operations | Risk Level |
|-------|-----------|------------|
| `memory` | Create/edit/delete markers | 🟢 Safe |
| `export` | Export audio to any location | 🟡 Moderate |
| `clipboard` | Cut/paste/clear audio | 🟠 Destructive |
| `track_structure` | Create/delete tracks | 🟠 Destructive |
| `session` | Save/open/close sessions | 🔴 High |
| `recording` | Record audio | 🔴 High |

## Audio Analysis for AI

Since AI models like Claude cannot directly listen to audio, this server provides several methods to help the AI "understand" audio content through visual and textual analysis. The `analyze_audio` tool can bounce any region of your Pro Tools session and analyze it in multiple ways:

### Analysis Modes

**Isolated Mode**: Analyzes a single track by soloing it, bouncing the region, and generating analysis. Perfect for examining individual instruments or vocals.

**Mix Mode**: Analyzes the full mix as it currently sounds in Pro Tools, respecting all mute/solo states, automation, and plugin processing.

### Analysis Types

#### 1. Waveform Visualization
Generates a high-resolution waveform image with amplitude over time. The visualization includes:
- Stereo channels displayed separately (top/bottom)
- Time markers in Pro Tools timecode format (HH:MM:SS:FF)
- Amplitude scale in dB (-24dB to 0dB reference)
- Grid lines for visual orientation

**Use cases**: Identifying clip boundaries, seeing dynamics, spotting silence or loud sections, understanding rhythm patterns

**Example waveform output** (4096x2048 pixels):
![Example waveform](https://raw.githubusercontent.com/skrul/protools-mcp-server/main/docs/images/example_waveform.png)

#### 2. Spectrogram Visualization
Generates a frequency spectrum visualization showing frequency content over time. Colors represent amplitude at each frequency.

**Use cases**: Identifying frequency ranges, spotting harmonics, seeing tonal vs percussive content, detecting resonances

**Example spectrogram output** (2048x1024 pixels):
![Example waveform](https://raw.githubusercontent.com/skrul/protools-mcp-server/main/docs/images/example_spectrogram.png)

#### 3. Peak/RMS Analysis
Provides overall amplitude statistics for the selected audio region.

**Use cases**: Checking overall levels, understanding average loudness, verifying headroom

**Example peak analysis output**:
```
**Overall Audio Statistics:**
RMS Level: -27.46 dB
Peak Level: -12.09 dB

This represents the average loudness (RMS) and maximum peak across the entire selected region.
```

#### 4. Event/Onset Detection
Uses the Aubio library to detect transients and rhythmic events (drum hits, note attacks, etc.).

**Use cases**: Finding hit points for editing, understanding rhythm, identifying beats for marker placement

**Example event detection output**:
```
**Event/Onset Analysis**

Mode: mix
Time range: 00:00:10:00 - 00:00:15:00
Detected events: 24

**Onset Times:**
1. 00:00:10:02 (sample 480,960)
2. 00:00:10:17 (sample 488,160)
3. 00:00:11:02 (sample 495,360)
4. 00:00:11:17 (sample 502,560)
...
```

#### 5. Silence Detection
Detects periods of silence or low-level audio based on configurable threshold and duration.

**Use cases**: Finding gaps between takes, identifying cleanup opportunities, detecting section boundaries

**Parameters**:
- `silence_threshold_db`: Amplitude threshold (default: -40dB)
- `silence_min_duration`: Minimum duration in seconds (default: 0.3s)

**Example silence detection output**:
```
**Silence Analysis**

Mode: isolated (track: Verse Lead Vocal)
Time range: 00:00:00:00 - 00:01:00:00
Threshold: -40dB, Min duration: 0.3s
Silent periods detected: 8

**Silent Periods:**
1. 00:00:05:12 - 00:00:08:23 (3.37s)
   Samples: 259,200 - 421,440
2. 00:00:19:04 - 00:00:20:15 (1.50s)
   Samples: 915,840 - 988,800
...
```

#### 6. Combined Analysis
Runs all available text-based analyses (peaks, events, and silence) in one operation, providing a comprehensive overview of the audio content.

**Use cases**: Initial exploration of unfamiliar audio, getting complete context before making editing decisions

#### 7. Raw Audio Delivery
Bounces a region to WAV format and returns it as base64-encoded data (limited to 10 seconds due to MCP message size limits).

**Use cases**: Archival, external processing, or future use with audio-capable AI models

**Note**: Claude and most current AI models cannot directly analyze audio files. This mode is included for future compatibility and external tool integration.

### Requirements

- **ffmpeg**: Required for waveform, spectrogram, peaks, and silence detection
  - Install: `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux)
- **aubio**: Required for event/onset detection
  - Install: `brew install aubio` (macOS) or `apt-get install aubio` (Linux)

The server will automatically detect which tools are available and provide appropriate error messages if required dependencies are missing.

## ⚠️ Legal Notice

**This project does NOT include the PTSL.proto file from Avid's SDK.**

Due to licensing restrictions, users must download the Pro Tools Scripting Library SDK from Avid and provide their own `PTSL.proto` file. The SDK is available for registered Avid developers.

To obtain the SDK:
1. Register for an Avid developer account at [avid.com](https://www.avid.com/)
2. Download the Pro Tools Scripting Library SDK
3. Extract `PTSL.proto` from the SDK

## Prerequisites

- Node.js >= 18
- Pro Tools 2024.10 or later
- Pro Tools Scripting Library SDK (for PTSL.proto)
- Pro Tools must be running

### PTSL Server

According to Avid's documentation, the PTSL server should be automatically available when Pro Tools is running - no special configuration is needed. The server runs on `localhost:31416` by default.

**Note:** Make sure Pro Tools is actually running before attempting to connect!

## Quick Start

Get up and running in 5 minutes:

1. **Get the PTSL SDK** - Download from Avid and extract `PTSL.proto`
2. **Clone and build**:
   ```bash
   git clone <repository-url>
   cd protools-mcp-server
   npm install
   npm run build
   ```
3. **Test the connection**:
   ```bash
   npm run test-cli -- /path/to/PTSL.proto
   ```
4. **Configure Claude Desktop** - Add to `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "protools": {
         "command": "node",
         "args": ["/absolute/path/to/protools-mcp-server/dist/index.js"],
         "env": {
           "PTSL_PROTO_PATH": "/absolute/path/to/PTSL.proto"
         }
       }
     }
   }
   ```
5. **Restart Claude Desktop** and start using Pro Tools with AI!

**Note:** The server starts in read-only mode by default, which prevents any modifications to your session. This is perfect for exploring and learning. See the [Safety Features](#safety-features) section to enable write operations when ready.

## Installation

```bash
npm install
npm run build
```

## Testing the Connection

Before using the MCP server, test that you can connect to Pro Tools:

```bash
# Run the test CLI with path to your PTSL.proto file
npm run test-cli -- /path/to/PTSL.proto

# Example (if SDK is in ptsl_sdk directory):
npm run test-cli -- ptsl_sdk/Source/PTSL.proto
```

The test CLI will:
1. Connect to the PTSL server on localhost:31416
2. Register a connection
3. Query session information
4. List tracks

If Pro Tools is not running or PTSL is not enabled, you'll see connection errors.

## Usage

### Claude Desktop (Recommended)

To use the MCP server with Claude Desktop, add it to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "protools": {
      "command": "node",
      "args": ["/absolute/path/to/protools-mcp-server/dist/index.js"],
      "env": {
        "PTSL_PROTO_PATH": "/absolute/path/to/PTSL.proto"
      }
    }
  }
}
```

**Example (macOS):**
```json
{
  "mcpServers": {
    "protools": {
      "command": "node",
      "args": ["/Users/username/protools-mcp-server/dist/index.js"],
      "env": {
        "PTSL_PROTO_PATH": "/Users/username/protools-mcp-server/ptsl_sdk/Source/PTSL.proto"
      }
    }
  }
}
```

After adding the configuration:
1. Restart Claude Desktop
2. Make sure Pro Tools is running
3. Ask Claude to help you with Pro Tools tasks!

### Claude Cowork (Experimental/Untested)

> ⚠️ **Note:** The Cowork connector has not been extensively tested. Claude Desktop is the recommended approach.

Claude Cowork requires HTTPS. The server will use self-signed SSL certificates for local development.

1. **Start the HTTPS server:**
   ```bash
   export PTSL_PROTO_PATH=/path/to/PTSL.proto
   ./start-cowork.sh
   ```

2. **In Claude Cowork:**
   - Click "Add custom connector"
   - Name: `Pro Tools`
   - Remote MCP server URL: `https://localhost:3000/sse`
   - Click "Add"
   - Accept the security warning (self-signed certificate is safe for localhost)

**Custom port:**
```bash
PORT=3443 PTSL_PROTO_PATH=/path/to/PTSL.proto npm run start:http
# Then use: https://localhost:3443/sse
```

## Example Use Cases

Here are some things you can ask Claude to do with your Pro Tools session:

**Analysis & Navigation:**
- "Show me a waveform of the vocal track from 1 minute to 1:30"
- "Find all the silent parts in the lead vocal track longer than 1 second"
- "Where are the drum hits in the kick track between bars 8 and 16?"
- "What clips are on the timeline between 30 seconds and 1 minute?"

**Editing & Organization:**
- "Create markers at every vocal phrase in the lead vocal track"
- "Find the clip named 'Guitar Solo 3' and select it"
- "Mute all the drum tracks"
- "Copy the selection and paste it at 2 minutes"

**Session Management:**
- "What's the current session name and sample rate?"
- "List all the tracks in my session"
- "Save the session"

**Playback Control:**
- "Play from 1 minute to 1:30"
- "Stop playback"
- "Start recording"

## Available Tools

The MCP server provides 36 tools across multiple categories:

### Session Management
- **get_session_info** - Get current session name, path, and sample rate
- **get_session_length** - Get total session duration
- **get_session_overview** - Comprehensive session information
- **save_session** - Save the current session

### Track Management
- **get_track_list** - List all tracks with their properties
- **select_tracks** - Select tracks by name or pattern
- **set_track_mute** - Mute/unmute tracks
- **set_track_solo** - Solo/unsolo tracks

### Timeline & Clips
- **refresh_pro_tools_index** - Sync timeline cache with Pro Tools session
- **get_timeline_tracks** - Browse tracks with pagination
- **get_timeline_clips** - Browse clips with pagination
- **search_timeline** - Search for tracks/clips by name
- **get_clip_list** - List clips in the clip bin
- **select_clip_on_timeline** - Select a specific clip on the timeline
- **get_timeline_selection** - Get current timeline selection range
- **set_timeline_selection** - Set timeline selection to specific time range

### Transport Control
- **play** - Start playback
- **stop** - Stop playback/recording
- **toggle_play** - Toggle play/stop
- **record** - Start recording
- **set_playback_mode** - Configure loop/dynamic transport mode

### Editing Operations
- **cut** - Cut selected audio
- **copy** - Copy selected audio
- **paste** - Paste from clipboard
- **clear** - Clear/delete selected audio
- **undo** - Undo last operation
- **redo** - Redo last undone operation

### Markers
- **get_markers** - List all memory locations/markers
- **create_marker** - Create a new marker at specified time
- **edit_marker** - Modify existing marker name/time
- **delete_marker** - Delete a specific marker
- **delete_all_markers** - Remove all markers
- **select_marker** - Navigate to and select a marker

### Audio Analysis
- **analyze_audio** - Analyze audio regions with multiple analysis types:
  - Waveform visualization
  - Spectrogram (frequency analysis)
  - Peak/RMS amplitude data
  - Event/onset detection (requires aubio)
  - Silence detection
  - Combined analysis
  - Raw audio delivery

### Advanced/Diagnostics
- **ptsl_command** - Send raw PTSL commands directly
- **sample_ptsl_responses** - View example PTSL API responses

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test PTSL connection
npm run test-cli -- /path/to/PTSL.proto

# Test MCP server
export PTSL_PROTO_PATH=/path/to/PTSL.proto
./test-mcp.sh
./test-tools.sh

# Test write protection safety mechanism
node test-write-protection.js                           # Test read-only mode
ALLOW_WRITE_OPERATIONS=true node test-write-protection.js  # Test with writes enabled
```

## Project Structure

```
protools-mcp-server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── test-cli.ts           # Test CLI for PTSL connection
│   ├── grpc/
│   │   ├── client.ts         # PTSL gRPC client wrapper
│   │   └── commands.ts       # CommandId enum
│   ├── tools/                # MCP tools (TBD)
│   └── resources/            # MCP resources (TBD)
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture

```
User Request (Claude/AI)
    ↓
MCP Server (TypeScript - this project)
    ↓
gRPC Client (generated from user's PTSL.proto)
    ↓
Pro Tools PTSL Server (localhost:31416)
    ↓
Pro Tools Application
```

## Project Status & Roadmap

### What Works Well
- ✅ Basic session management (info, save, navigation)
- ✅ Track control (list, select, mute, solo)
- ✅ Timeline navigation and search (audio clips only)
- ✅ Transport control (play, stop, record)
- ✅ Basic editing operations (cut, copy, paste, clear, undo/redo)
- ✅ Marker management (create, list, edit, delete, navigate)
- ✅ Audio analysis (waveforms, spectrograms, peaks, events, silence detection)
- ✅ Timeline selection management

### Known Issues & Limitations
- ⚠️ MIDI clip timeline positions cannot be indexed (PTSL API limitation)
- ⚠️ Some advanced Pro Tools features not yet exposed via PTSL
- ⚠️ Audio analysis requires external dependencies (ffmpeg, aubio)
- ⚠️ Raw audio delivery limited to 10 seconds due to MCP message size constraints

### Potential Future Enhancements
- 🔮 Plugin parameter control
- 🔮 Automation read/write
- 🔮 Send/aux routing management
- 🔮 I/O configuration
- 🔮 Mixer snapshots
- 🔮 Batch processing operations
- 🔮 Session template creation
- 🔮 Extended MIDI support (if PTSL API expands)

## Troubleshooting

### "Failed to connect to PTSL server"

- Make sure Pro Tools is running
- Verify PTSL is enabled in Pro Tools Preferences
- Check that nothing else is using port 31416

### "Request refused. Use the RegisterConnection command first"

- This usually means Pro Tools is not running
- Try restarting Pro Tools

### "SDK_VersionMismatch: The client and host interface versions are incompatible"

- Make sure you're using the correct PTSL.proto version
- The proto version should match your Pro Tools version
- Download the matching SDK from Avid if needed

### Proto file errors

- Make sure you're using the correct PTSL.proto version
- The proto file should match your Pro Tools version
- Download the latest SDK from Avid if needed

## Contributing

Contributions are welcome! Here's how you can help:

### Reporting Issues
- Use GitHub Issues to report bugs or request features
- Include Pro Tools version, PTSL SDK version, and OS details
- Provide session details if reporting behavior issues
- Include error messages and logs when applicable

### Contributing Code
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Follow the existing code style (TypeScript, ESLint)
5. Update documentation as needed
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines
- All new tools should follow the existing tool structure in `src/tools/`
- Add appropriate error handling and validation
- Include JSDoc comments for public APIs
- Test with a real Pro Tools session when possible
- Update the README if adding new capabilities

### Testing
Before submitting a PR, ensure:
```bash
npm run build          # Build succeeds
npm run test-cli       # PTSL connection works
./test-mcp.sh          # MCP server initializes
./test-tools.sh        # Tool registration works
```

## License

MIT License - see LICENSE file

## Acknowledgments

Pro Tools and PTSL are trademarks of Avid Technology, Inc. This is an independent open-source project and is not affiliated with or endorsed by Avid.

## Support & Community

- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/yourusername/protools-mcp-server/issues)
- **Discussions**: Ask questions and share workflows in [GitHub Discussions](https://github.com/yourusername/protools-mcp-server/discussions)
- **PTSL Documentation**: Refer to Avid's official PTSL documentation from the SDK

This project is experimental and community-driven. Help make it better by contributing code, reporting issues, or sharing your use cases!
