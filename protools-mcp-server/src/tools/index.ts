import { PTSLClient } from '../grpc/client.js';
import { sessionTools, handleSessionTool } from './session.js';
import { trackTools, handleTrackTool } from './tracks.js';
import { transportTools, handleTransportTool } from './transport.js';
import { clipTools, handleClipTool } from './clips.js';
import { editingTools, handleEditingTool } from './editing.js';
import { markerTools, handleMarkerTool } from './markers.js';
import { timelineTools, handleTimelineTool } from './timeline.js';
import { analyzeTools, handleAnalyzeTool } from './analyze.js';
import { rawTools, handleRawTool } from './raw.js';
import { diagnosticTools, handleDiagnosticTool } from './diagnostic.js';

/**
 * All available MCP tools
 */
export const allTools = [
  ...sessionTools,
  ...trackTools,
  ...transportTools,
  ...clipTools,
  ...editingTools,
  ...markerTools,
  ...timelineTools,
  ...analyzeTools,
  ...rawTools,
  ...diagnosticTools,
];

/**
 * Route tool calls to appropriate handlers
 */
export async function handleToolCall(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  // Check session tools
  if (sessionTools.find((t) => t.name === toolName)) {
    return await handleSessionTool(toolName, args, client);
  }

  // Check track tools
  if (trackTools.find((t) => t.name === toolName)) {
    return await handleTrackTool(toolName, args, client);
  }

  // Check transport tools
  if (transportTools.find((t) => t.name === toolName)) {
    return await handleTransportTool(toolName, args, client);
  }

  // Check clip tools
  if (clipTools.find((t) => t.name === toolName)) {
    return await handleClipTool(toolName, args, client);
  }

  // Check editing tools
  if (editingTools.find((t) => t.name === toolName)) {
    return await handleEditingTool(toolName, args, client);
  }

  // Check marker tools
  if (markerTools.find((t) => t.name === toolName)) {
    return await handleMarkerTool(toolName, args, client);
  }

  // Check timeline tools
  if (timelineTools.find((t) => t.name === toolName)) {
    return await handleTimelineTool(toolName, args, client);
  }

  // Check analyze tools
  if (analyzeTools.find((t) => t.name === toolName)) {
    return await handleAnalyzeTool(toolName, args, client);
  }

  // Check raw tools
  if (rawTools.find((t) => t.name === toolName)) {
    return await handleRawTool(toolName, args, client);
  }

  // Check diagnostic tools
  if (diagnosticTools.find((t) => t.name === toolName)) {
    return await handleDiagnosticTool(toolName, args, client);
  }

  throw new Error(`Unknown tool: ${toolName}`);
}
