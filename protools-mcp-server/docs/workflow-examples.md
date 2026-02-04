# Pro Tools MCP Server - Workflow Examples

Example conversations you can have with Claude when using the Pro Tools MCP server.

## Session Management

### Get Session Information

**You:** What session is currently open in Pro Tools?

**Claude:** Let me check the current Pro Tools session...

*[Uses get_session_info tool]*

The current session is "My Song" located at `/Users/username/Documents/Pro Tools/My Song.ptx` with a sample rate of 48000 Hz.

### Save Your Work

**You:** Save the current Pro Tools session

**Claude:** I'll save the session for you...

*[Uses save_session tool]*

Session saved successfully!

## Track Management

### List All Tracks

**You:** What tracks are in my session?

**Claude:** Let me get the track list...

*[Uses get_track_list tool]*

Your session has 5 tracks:
- **Vocals** (Audio, Stereo) - Selected, Has clips
- **Guitar** (Audio, Stereo) - Has clips
- **Bass** (Audio, Mono) - Has clips
- **Drums** (Audio, Stereo) - Muted, Has clips
- **Keys** (Audio, Stereo)

### Select Specific Tracks

**You:** Select the vocals and guitar tracks

**Claude:** I'll select those tracks for you...

*[Uses select_tracks tool with track_names: ["Vocals", "Guitar"]]*

Selected 2 tracks: Vocals, Guitar

### Mute/Solo Tracks

**You:** Mute the drums track

**Claude:** Muting the drums track...

*[Uses set_track_mute tool with track_names: ["Drums"], muted: true]*

Muted 1 track: Drums

**You:** Solo the vocals

**Claude:** Soloing the vocals track...

*[Uses set_track_solo tool with track_names: ["Vocals"], solo: true]*

Soloed 1 track: Vocals

## Combined Workflows

### Prepare for Vocal Recording

**You:** I want to record vocals. Can you help me prepare?

**Claude:** I'll help you set up for vocal recording:

1. First, let me see what's in your session...
   *[Uses get_track_list]*

2. I see you have a "Vocals" track. Let me select it and unsolo everything else...
   *[Uses select_tracks and set_track_solo]*

3. Your session is ready for vocal recording! The Vocals track is selected and ready to go.

### Mix Review

**You:** I want to review my mix. Show me the current state of all tracks.

**Claude:** Let me get your track information...

*[Uses get_track_list]*

Here's your current mix state:

**Active Tracks:**
- Vocals: Selected, not muted, not soloed
- Guitar: Has clips, not muted
- Bass: Has clips, not muted

**Inactive Tracks:**
- Drums: MUTED
- Keys: No clips yet

Would you like me to unmute the drums or make any other changes?

## Tips

- You can ask Claude to perform multiple operations in sequence
- Claude can help explain what each track property means
- Ask Claude to save your session periodically during your workflow
- Use natural language - Claude will figure out which tools to use

## Future Capabilities

Once more tools are implemented, you'll be able to:
- Create new tracks
- Set timeline selections
- Export mixes
- Control transport (play/stop/record)
- Cut/copy/paste audio
- And much more!
