/**
 * PTSL Command IDs
 *
 * These are the command ID numbers from the PTSL.proto file.
 * Command IDs are just numbers - public knowledge, not copyrighted.
 */
export enum CommandId {
  // Connection
  RegisterConnection = 70,
  GetPTSLVersion = 55,

  // Session Management
  CreateSession = 0,
  OpenSession = 1,
  CloseSession = 17,
  SaveSession = 18,
  SaveSessionAs = 19,

  // Session Properties
  GetSessionName = 42,
  GetSessionPath = 43,
  GetSessionSampleRate = 35,
  GetSessionBitDepth = 36,
  GetSessionTimeCodeRate = 38,
  GetSessionStartTime = 44,
  GetSessionLength = 45,
  GetMainCounterFormat = 102,

  // Track Operations
  GetTrackList = 3,
  CreateNewTracks = 72,
  SelectTracksByName = 73,

  // Track Properties
  SetTrackMuteState = 85,
  SetTrackSoloState = 86,
  SetTrackRecordEnableState = 88,

  // Transport
  SetPlaybackMode = 32,
  SetRecordMode = 33,
  GetPlaybackMode = 56,
  GetRecordMode = 57,
  GetTransportState = 59,
  TogglePlayState = 64,
  ToggleRecordEnable = 65,
  PlayHalfSpeed = 66,
  RecordHalfSpeed = 67,

  // Editing
  Cut = 20,
  Copy = 21,
  Paste = 22,
  Clear = 23,

  // Edit Tools
  GetEditMode = 74,
  GetEditTool = 76,
  SetEditTool = 77,

  // Timeline
  SetTimelineSelection = 81,
  GetTimelineSelection = 82,

  // Undo/Redo
  Undo = 104,
  Redo = 105,

  // Memory Locations / Markers
  ClearMemoryLocation = 61,
  EditMemoryLocation = 68,
  GetMemoryLocations = 69,
  CreateMemoryLocation = 71,
  SelectMemoryLocation = 84,
  ClearAllMemoryLocations = 117,

  // Clips
  GetClipList = 125,
  GetTrackPlaylists = 154,
  GetPlaylistElements = 158,

  // Clip import/spotting
  ImportAudioToClipList = 123,
  SpotClipsByID = 124,

  // Export
  ExportClipsAsFiles = 10,
  ExportMix = 28,
  ExportSessionInfoAsText = 30,

  // File Operations
  GetFileLocation = 16,
}

/**
 * Permission groups for fine-grained access control
 */
export enum PermissionGroup {
  CLIPBOARD = 'clipboard',          // Cut, Copy, Paste, Clear
  MEMORY = 'memory',                // Markers/memory locations
  TRACK_STATE = 'track_state',      // Mute, Solo, Record Enable
  TRACK_STRUCTURE = 'track_structure', // Create/Delete tracks
  SESSION = 'session',              // Save, Open, Close, Create
  EXPORT = 'export',                // Export operations
  RECORDING = 'recording',          // Record mode/enable
}

/**
 * Map commands to their permission groups
 */
export const COMMAND_PERMISSION_GROUPS = new Map<number, PermissionGroup>([
  // Clipboard operations
  [CommandId.Cut, PermissionGroup.CLIPBOARD],
  [CommandId.Paste, PermissionGroup.CLIPBOARD],
  [CommandId.Clear, PermissionGroup.CLIPBOARD],

  // Memory locations/markers
  [CommandId.ClearMemoryLocation, PermissionGroup.MEMORY],
  [CommandId.EditMemoryLocation, PermissionGroup.MEMORY],
  [CommandId.CreateMemoryLocation, PermissionGroup.MEMORY],
  [CommandId.SelectMemoryLocation, PermissionGroup.MEMORY],
  [CommandId.ClearAllMemoryLocations, PermissionGroup.MEMORY],

  // Track state
  [CommandId.SetTrackRecordEnableState, PermissionGroup.TRACK_STATE],

  // Track structure
  [CommandId.CreateNewTracks, PermissionGroup.TRACK_STRUCTURE],

  // Session operations
  [CommandId.CreateSession, PermissionGroup.SESSION],
  [CommandId.ImportAudioToClipList, PermissionGroup.SESSION],
  [CommandId.SpotClipsByID, PermissionGroup.SESSION],
  [CommandId.OpenSession, PermissionGroup.SESSION],
  [CommandId.CloseSession, PermissionGroup.SESSION],
  [CommandId.SaveSession, PermissionGroup.SESSION],
  [CommandId.SaveSessionAs, PermissionGroup.SESSION],

  // Export operations
  [CommandId.ExportClipsAsFiles, PermissionGroup.EXPORT],
  [CommandId.ExportMix, PermissionGroup.EXPORT],
  [CommandId.ExportSessionInfoAsText, PermissionGroup.EXPORT],

  // Recording
  [CommandId.SetRecordMode, PermissionGroup.RECORDING],
  [CommandId.ToggleRecordEnable, PermissionGroup.RECORDING],
  [CommandId.RecordHalfSpeed, PermissionGroup.RECORDING],
]);

/**
 * Commands that are always read-only (queries, playback control)
 * These are always allowed and don't require any permissions
 */
export const READ_ONLY_COMMANDS = new Set<number>([
  CommandId.RegisterConnection,
  CommandId.GetPTSLVersion,
  CommandId.GetSessionName,
  CommandId.GetSessionPath,
  CommandId.GetSessionSampleRate,
  CommandId.GetSessionBitDepth,
  CommandId.GetSessionTimeCodeRate,
  CommandId.GetSessionStartTime,
  CommandId.GetSessionLength,
  CommandId.GetMainCounterFormat,
  CommandId.GetTrackList,
  CommandId.SelectTracksByName,
  CommandId.GetPlaybackMode,
  CommandId.GetRecordMode,
  CommandId.GetTransportState,
  CommandId.TogglePlayState,
  CommandId.PlayHalfSpeed,
  CommandId.GetEditMode,
  CommandId.GetEditTool,
  CommandId.GetTimelineSelection,
  CommandId.GetMemoryLocations,
  CommandId.SelectMemoryLocation,
  CommandId.Undo,
  CommandId.Redo,
  CommandId.GetClipList,
  CommandId.GetTrackPlaylists,
  CommandId.GetPlaylistElements,
  CommandId.GetFileLocation,
  CommandId.Copy,
  CommandId.GetMemoryLocations,
  CommandId.SetTrackMuteState,
  CommandId.SetTrackSoloState,
  CommandId.SetTimelineSelection,
  CommandId.SetEditTool,
  CommandId.SetPlaybackMode,
]);

/**
 * Get the permission group for a command (if any)
 */
export function getCommandPermissionGroup(commandId: number): PermissionGroup | null {
  return COMMAND_PERMISSION_GROUPS.get(commandId) || null;
}

/**
 * Check if a command is read-only (always allowed)
 */
export function isReadOnlyCommand(commandId: number): boolean {
  return READ_ONLY_COMMANDS.has(commandId);
}

/**
 * Check if a command is an export command
 */
export function isExportCommand(commandId: number): boolean {
  return COMMAND_PERMISSION_GROUPS.get(commandId) === PermissionGroup.EXPORT;
}

// Legacy compatibility - keep old enums/functions for backwards compatibility
/**
 * @deprecated Use PermissionGroup instead
 */
export enum PermissionLevel {
  READ_ONLY = 0,
  NON_DESTRUCTIVE = 1,
  EXPORT = 2,
  DESTRUCTIVE = 3,
}

/**
 * @deprecated Use getCommandPermissionGroup instead
 */
export function getCommandPermissionLevel(commandId: number): PermissionLevel {
  if (isReadOnlyCommand(commandId)) {
    return PermissionLevel.READ_ONLY;
  }

  const group = getCommandPermissionGroup(commandId);
  if (!group) {
    return PermissionLevel.READ_ONLY;
  }

  // Map groups to legacy levels
  switch (group) {
    case PermissionGroup.EXPORT:
      return PermissionLevel.EXPORT;
    case PermissionGroup.SESSION:
    case PermissionGroup.RECORDING:
    case PermissionGroup.TRACK_STRUCTURE:
      return PermissionLevel.DESTRUCTIVE;
    case PermissionGroup.CLIPBOARD:
      // Cut/Clear are destructive, Copy/Paste depend on context
      if (commandId === CommandId.Copy) {
        return PermissionLevel.NON_DESTRUCTIVE;
      }
      return PermissionLevel.DESTRUCTIVE;
    default:
      return PermissionLevel.NON_DESTRUCTIVE;
  }
}

/**
 * Check if a command is a write operation (legacy compatibility)
 * @deprecated Use getCommandPermissionGroup instead
 */
export function isWriteCommand(commandId: number): boolean {
  return !isReadOnlyCommand(commandId);
}
