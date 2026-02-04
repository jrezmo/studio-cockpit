import { PTSLClient } from '../grpc/client.js';
import { CommandId } from '../grpc/commands.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Audio analysis MCP tools
 */

export const analyzeTools = [
  {
    name: 'analyze_audio',
    description:
      'Analyze a specific audio region from Pro Tools. Supports visual analysis (waveform/spectrogram), ' +
      'textual analysis (peaks/RMS, event detection, silence detection), or raw audio file delivery. ' +
      'Visual and textual analysis require ffmpeg and/or aubio. Audio mode is limited to 10 seconds ' +
      'to stay within MCP message size limits. Use "isolated" mode to analyze a single track, or "mix" ' +
      'mode to analyze the full mix.',
    inputSchema: {
      type: 'object',
      properties: {
        track_name: {
          type: 'string',
          description: 'Name of the track to analyze (required for "isolated" mode)',
        },
        start_time: {
          type: 'string',
          description: 'Start time in session format (e.g., "00:00:10:00")',
        },
        end_time: {
          type: 'string',
          description: 'End time in session format (e.g., "00:00:15:00")',
        },
        mode: {
          type: 'string',
          enum: ['isolated', 'mix'],
          description: 'Analysis mode: "isolated" (solo track) or "mix" (current session state)',
        },
        render_type: {
          type: 'string',
          enum: ['waveform', 'spectrogram', 'audio', 'peaks', 'events', 'silence', 'analysis'],
          description:
            'Type of output:\n' +
            '- "waveform": Amplitude visualization (requires ffmpeg)\n' +
            '- "spectrogram": Frequency visualization (requires ffmpeg)\n' +
            '- "audio": Raw WAV file for AI models (max 10 seconds, Claude cannot analyze audio)\n' +
            '- "peaks": Peak/RMS amplitude data as text (requires ffmpeg)\n' +
            '- "events": Detected onsets/transients as text (requires aubio)\n' +
            '- "silence": Silence/sound boundaries as text (requires ffmpeg)\n' +
            '- "analysis": Combined analysis - peaks, events, and silence (requires ffmpeg and aubio)',
        },
        silence_threshold_db: {
          type: 'number',
          description:
            'Silence detection threshold in dB (default: -40). Lower values (e.g., -60) detect quieter passages as silence. ' +
            'Higher values (e.g., -30) only detect very quiet sections. Only used with "silence" or "analysis" render types.',
        },
        silence_min_duration: {
          type: 'number',
          description:
            'Minimum duration in seconds for silence detection (default: 0.3). Lower values (e.g., 0.1) detect shorter gaps. ' +
            'Only used with "silence" or "analysis" render types.',
        },
      },
      required: ['start_time', 'end_time', 'mode', 'render_type'],
    },
  },
];

export async function handleAnalyzeTool(
  toolName: string,
  args: any,
  client: PTSLClient
): Promise<any> {
  switch (toolName) {
    case 'analyze_audio':
      return await analyzeAudio(
        client,
        args.track_name,
        args.start_time,
        args.end_time,
        args.mode,
        args.render_type,
        args.silence_threshold_db,
        args.silence_min_duration
      );
    default:
      throw new Error(`Unknown analyze tool: ${toolName}`);
  }
}

/**
 * Analyze audio region from Pro Tools
 */
/**
 * Parse timecode string to seconds
 * Format: HH:MM:SS:FF where FF is frames (assuming 30fps for display purposes)
 * Note: Pro Tools may use different frame rates, but we use 30fps as an approximation
 */
function timecodeToSeconds(timecode: string, fps: number = 30): number {
  const parts = timecode.split(':');
  if (parts.length < 3) return 0;

  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;
  const frames = parts.length >= 4 ? (parseInt(parts[3]) || 0) : 0;

  return hours * 3600 + minutes * 60 + seconds + (frames / fps);
}

async function analyzeAudio(
  client: PTSLClient,
  trackName: string | undefined,
  startTime: string,
  endTime: string,
  mode: 'isolated' | 'mix',
  renderType: 'waveform' | 'spectrogram' | 'audio' | 'peaks' | 'events' | 'silence' | 'analysis',
  silenceThresholdDb?: number,
  silenceMinDuration?: number
): Promise<any> {
  let targetTrack: any = null;
  // Use os.tmpdir() for cross-platform compatibility
  // IMPORTANT: Add trailing slash - Pro Tools requires it!
  const tmpDir = os.tmpdir().endsWith('/') ? os.tmpdir() : os.tmpdir() + '/';
  const timestamp = Date.now();
  const wavFileName = `pt_visual_${timestamp}.wav`;
  const imageFileName = `pt_visual_${timestamp}.png`;
  const wavPath = path.join(tmpDir, wavFileName);
  const imagePath = path.join(tmpDir, imageFileName);

  try {
    // Step 1: Validate duration for audio mode
    if (renderType === 'audio') {
      const durationSeconds = timecodeToSeconds(endTime) - timecodeToSeconds(startTime);
      if (durationSeconds > 10) {
        return {
          content: [
            {
              type: 'text',
              text:
                `Error: Audio mode is limited to 10 seconds to stay within MCP message size limits.\n` +
                `Requested duration: ${durationSeconds.toFixed(1)} seconds\n` +
                `Please use a shorter time range or use 'waveform' or 'spectrogram' for longer regions.`,
            },
          ],
          isError: true,
        };
      }
    }

    // Step 2: Validate track name if in isolated mode
    if (mode === 'isolated') {
      if (!trackName) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: track_name is required when mode is "isolated"',
            },
          ],
          isError: true,
        };
      }

      const trackListResponse = await client.sendRequest(CommandId.GetTrackList);
      const tracks = trackListResponse.response_body?.track_list || [];
      targetTrack = tracks.find((t: any) => t.name === trackName);

      if (!targetTrack) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Track "${trackName}" not found in session`,
            },
          ],
          isError: true,
        };
      }
    }

    // Step 3: Set timeline selection
    await client.sendRequest(CommandId.SetTimelineSelection, {
      in_time: startTime,
      out_time: endTime,
    });

    // Step 4: Solo track if in isolated mode
    if (mode === 'isolated' && targetTrack) {
      await client.sendRequest(CommandId.SetTrackSoloState, {
        track_number_list: [targetTrack.number],
        bool_list: [true],
      });
    }

    // Step 5: Bounce audio to temp directory
    // Determine export format based on track format (mono vs stereo)
    let exportFormat = 'EF_Interleaved'; // default for mix mode
    if (mode === 'isolated' && targetTrack) {
      // Use mono export for mono tracks, interleaved for stereo/multichannel
      exportFormat = targetTrack.format === 'TFormat_Mono' ? 'EF_Mono' : 'EF_Interleaved';
    }

    const exportResponse = await client.sendRequest(CommandId.ExportMix, {
      file_name: wavFileName,
      file_type: 'EMFType_WAV',
      audio_info: {
        sample_rate: 'SR_48000',
        bit_depth: 'Bit16',
        export_format: exportFormat,
      },
      location_info: {
        file_destination: 'EMFDestination_Directory',
        directory: tmpDir,
        import_after_bounce: 'TB_False',
      },
    });

    if (exportResponse.header?.status !== 'Completed') {
      const errorJson = exportResponse.response_error_json || '{}';
      const errorData = JSON.parse(errorJson);
      const errorMessages =
        errorData.errors?.map((e: any) => e.command_error_message).join(', ') || 'Unknown error';

      throw new Error(`Audio bounce failed: ${errorMessages}`);
    }

    // Wait for file to be accessible
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 6: Return based on render type
    if (renderType === 'peaks') {
      // Peak/RMS analysis using ffmpeg
      return await analyzePeaks(wavPath, startTime, endTime, mode, trackName);
    } else if (renderType === 'events') {
      // Event/onset detection using aubio
      return await analyzeEvents(wavPath, startTime, endTime, mode, trackName);
    } else if (renderType === 'silence') {
      // Silence detection using ffmpeg
      return await analyzeSilence(wavPath, startTime, endTime, mode, trackName, silenceThresholdDb, silenceMinDuration);
    } else if (renderType === 'analysis') {
      // Combined analysis
      return await analyzeCombined(wavPath, startTime, endTime, mode, trackName, silenceThresholdDb, silenceMinDuration);
    } else if (renderType === 'audio') {
      // Return raw audio file
      const audioData = fs.readFileSync(wavPath);
      const base64Audio = audioData.toString('base64');

      return {
        content: [
          {
            type: 'resource',
            resource: {
              uri: `data:audio/wav;base64,${base64Audio}`,
              mimeType: 'audio/wav',
              text: `Audio file: ${startTime} - ${endTime} (${mode} mode)`,
            },
          },
          {
            type: 'text',
            text:
              `Audio file generated:\n` +
              `- Mode: ${mode}${mode === 'isolated' ? ` (track: ${trackName})` : ''}\n` +
              `- Time range: ${startTime} - ${endTime}\n` +
              `- Sample rate: 48kHz, 16-bit stereo\n` +
              `- File size: ${(audioData.length / 1024).toFixed(2)} KB`,
          },
        ],
      };
    } else {
      // Generate visual analysis with ffmpeg
      // Step 6a: Check if ffmpeg is available
      try {
        await execAsync('which ffmpeg');
      } catch {
        throw new Error(
          'ffmpeg not found. Please install ffmpeg to use visual analysis. ' +
            'Install with: brew install ffmpeg'
        );
      }

      // Step 6b: Generate visualization with ffmpeg
      let ffmpegCmd: string;
      if (renderType === 'waveform') {
        // High resolution waveform with gridlines for timing reference
        // Black waveform on white background with grey gridlines - optimized for LLM analysis
        // split_channels=1 displays L/R channels separately (stacked vertically)
        // Grid divides width by 10 and height by 4 for visual orientation

        // Calculate timecode positions for labels
        const startSeconds = timecodeToSeconds(startTime);
        const endSeconds = timecodeToSeconds(endTime);
        const durationSeconds = endSeconds - startSeconds;

        // Image dimensions
        const imageWidth = 4096;

        // Determine appropriate time interval for nice round numbers
        // Choose interval based on total duration to show ~8-12 labels
        let interval: number;
        if (durationSeconds <= 2) interval = 0.1;        // 100ms intervals
        else if (durationSeconds <= 10) interval = 1;    // 1 second intervals
        else if (durationSeconds <= 30) interval = 5;    // 5 second intervals
        else if (durationSeconds <= 120) interval = 10;  // 10 second intervals
        else if (durationSeconds <= 300) interval = 30;  // 30 second intervals
        else interval = 60;                              // 1 minute intervals

        // Calculate fixed pixel width per time interval
        const pixelsPerSecond = imageWidth / durationSeconds;
        const pixelsPerInterval = pixelsPerSecond * interval;
        const numIntervals = Math.ceil(durationSeconds / interval);

        // Build time labels using Pro Tools timecode format (HH:MM:SS:FF)
        // Position labels at fixed pixel intervals
        let textOverlays = '';

        // Only show labels up to the last full interval (skip the final partial column)
        const numLabels = Math.floor(durationSeconds / interval);

        for (let i = 0; i <= numLabels; i++) {
          const absoluteSeconds = startSeconds + (interval * i);
          let totalFrames = Math.round(absoluteSeconds * 30);
          const hours = Math.floor(totalFrames / (30 * 60 * 60));
          totalFrames %= (30 * 60 * 60);
          const minutes = Math.floor(totalFrames / (30 * 60));
          totalFrames %= (30 * 60);
          const seconds = Math.floor(totalFrames / 30);
          const frames = totalFrames % 30;

          // Position at fixed pixel interval
          const xPixel = Math.round(i * pixelsPerInterval);

          // Escape colons with backslashes for ffmpeg
          const timeValue = `${String(hours).padStart(2, '0')}\\\\:${String(minutes).padStart(2, '0')}\\\\:${String(seconds).padStart(2, '0')}\\\\:${String(frames).padStart(2, '0')}`;
          const xPos = i === 0 ? 10 : `${xPixel}`;
          textOverlays += `,drawtext=text='${timeValue}':x=${xPos}:y=10:fontsize=28:fontcolor=black`;
        }

        // Add amplitude labels in dB (approximate reference levels)
        // Position on left side with padding to avoid waveform overlap
        const dbLevels = ['0dB', '-6dB', '-12dB', '-18dB', '-24dB'];
        const channelPositions = [512, 1536]; // Y positions for top and bottom channel centers

        for (const channelY of channelPositions) {
          for (let i = 0; i < dbLevels.length; i++) {
            const yOffset = (i - 2) * 102.4; // Center at -12dB, spread evenly
            const yPos = channelY + yOffset - 12; // Offset to align with text center
            textOverlays += `,drawtext=text='${dbLevels[i]}':x=5:y=${yPos}:fontsize=24:fontcolor=black`;
          }
        }

        // Grid spacing at fixed pixel intervals to align with time labels
        const gridWidth = Math.round(pixelsPerInterval);
        ffmpegCmd = `ffmpeg -i "${wavPath}" -filter_complex "[0:a]showwavespic=s=4096x2048:colors=black:draw=full:filter=peak:split_channels=1[fg];color=s=4096x2048:color=white,drawgrid=width=${gridWidth}:height=ih/4:color=gray@0.3${textOverlays}[bg];[bg][fg]overlay=format=auto" -frames:v 1 "${imagePath}" -y`;
      } else {
        // spectrogram - moderate resolution to stay under 1MB MCP limit
        ffmpegCmd = `ffmpeg -i "${wavPath}" -lavfi showspectrumpic=s=2048x1024:mode=combined "${imagePath}" -y`;
      }

      await execAsync(ffmpegCmd);

      // Step 7: Read and encode image as Base64
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');

      // Step 8: Return as MCP image content
      return {
        content: [
          {
            type: 'image',
            data: base64Image,
            mimeType: 'image/png',
          },
          {
            type: 'text',
            text:
              `Visual analysis generated:\n` +
              `- Type: ${renderType}\n` +
              `- Mode: ${mode}${mode === 'isolated' ? ` (track: ${trackName})` : ''}\n` +
              `- Time range: ${startTime} - ${endTime}\n` +
              `- Image size: ${(imageData.length / 1024).toFixed(2)} KB`,
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating visual analysis: ${error}`,
        },
      ],
      isError: true,
    };
  } finally {
    // Step 9: Cleanup - always run, even if there was an error
    try {
      // Unsolo track if it was soloed
      if (mode === 'isolated' && targetTrack) {
        await client.sendRequest(CommandId.SetTrackSoloState, {
          track_number_list: [targetTrack.number],
          bool_list: [false],
        });
      }

      // Delete temporary files
      if (fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
      }
      // Only delete image if it was created (not for audio mode)
      if (renderType !== 'audio' && fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors silently
    }
  }
}

/**
 * Helper function to check if a command-line tool is available
 */
async function checkToolAvailable(toolName: string): Promise<boolean> {
  try {
    await execAsync(`which ${toolName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Analyze peaks/RMS using ffmpeg astats
 */
async function analyzePeaks(
  wavPath: string,
  startTime: string,
  endTime: string,
  mode: string,
  trackName?: string
): Promise<any> {
  try {
    // Check if ffmpeg is available
    if (!(await checkToolAvailable('ffmpeg'))) {
      return {
        content: [
          {
            type: 'text',
            text:
              'Error: ffmpeg is required for peak analysis but is not installed.\n' +
              'Install with: brew install ffmpeg',
          },
        ],
        isError: true,
      };
    }

    // Use ffmpeg astats filter to get overall statistics
    // This provides a summary at the end of processing
    const { stdout, stderr } = await execAsync(
      `ffmpeg -i "${wavPath}" -af "astats=measure_overall=Peak_level+RMS_level:measure_perchannel=0" -f null - 2>&1`
    );

    // Combine stdout and stderr since ffmpeg outputs to stderr
    const output = stdout + '\n' + stderr;
    const lines = output.split('\n');

    const peaks: Array<{ time: string; rms_db: number; samples: number }> = [];
    const startSeconds = timecodeToSeconds(startTime);
    const sampleRate = 48000; // Pro Tools export sample rate

    // Parse the astats output which appears at the end
    // Look for lines like: "RMS level dB: -23.45"
    let overallRmsDb: number | null = null;
    let overallPeakDb: number | null = null;

    for (const line of lines) {
      const rmsMatch = line.match(/RMS level dB:\s+([-\d.]+)/);
      if (rmsMatch) {
        overallRmsDb = parseFloat(rmsMatch[1]);
      }

      const peakMatch = line.match(/Peak level dB:\s+([-\d.]+)/);
      if (peakMatch) {
        overallPeakDb = parseFloat(peakMatch[1]);
      }
    }

    // Create a single data point representing the overall audio
    if (overallRmsDb !== null) {
      const midSeconds = startSeconds + (timecodeToSeconds(endTime) - startSeconds) / 2;
      const midSamples = Math.round(midSeconds * sampleRate);

      // Convert to timecode
      let totalFrames = Math.round(midSeconds * 30);
      const hours = Math.floor(totalFrames / (30 * 60 * 60));
      totalFrames %= (30 * 60 * 60);
      const minutes = Math.floor(totalFrames / (30 * 60));
      totalFrames %= (30 * 60);
      const seconds = Math.floor(totalFrames / 30);
      const frames = totalFrames % 30;
      const timecode = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;

      peaks.push({
        time: timecode,
        rms_db: overallRmsDb,
        samples: midSamples,
        peak_db: overallPeakDb
      } as any);
    }

    // Format output
    let text = `**Peak/RMS Analysis**\n\n`;
    text += `Mode: ${mode}${mode === 'isolated' ? ` (track: ${trackName})` : ''}\n`;
    text += `Time range: ${startTime} - ${endTime}\n\n`;

    if (peaks.length > 0 && peaks[0]) {
      text += `**Overall Audio Statistics:**\n`;
      text += `RMS Level: ${peaks[0].rms_db.toFixed(2)} dB\n`;
      if ((peaks[0] as any).peak_db !== undefined && (peaks[0] as any).peak_db !== null) {
        text += `Peak Level: ${(peaks[0] as any).peak_db.toFixed(2)} dB\n`;
      }
      text += `\nThis represents the average loudness (RMS) and maximum peak across the entire selected region.\n`;
    } else {
      text += 'No audio data detected in this region.\n';
      text += '\nPossible causes:\n';
      text += '- Audio track is muted or has no audio in this time range\n';
      text += '- Export failed or produced an empty file\n';
      text += '- ffmpeg could not analyze the audio file\n';
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing peaks: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Analyze events/onsets using aubio
 */
async function analyzeEvents(
  wavPath: string,
  startTime: string,
  endTime: string,
  mode: string,
  trackName?: string
): Promise<any> {
  try {
    // Check if aubio is available
    if (!(await checkToolAvailable('aubioonset'))) {
      return {
        content: [
          {
            type: 'text',
            text:
              'Error: aubio is required for event detection but is not installed.\n' +
              'Install with: brew install aubio',
          },
        ],
        isError: true,
      };
    }

    // Run aubio onset detection
    const { stdout } = await execAsync(`aubioonset "${wavPath}"`);

    // Parse onset times (in seconds)
    const onsetTimes = stdout
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => parseFloat(line.trim()));

    // Convert to timecodes and sample numbers
    const startSeconds = timecodeToSeconds(startTime);
    const sampleRate = 48000; // Pro Tools export sample rate
    const events = onsetTimes.map((offsetSeconds) => {
      const absoluteTime = startSeconds + offsetSeconds;
      const absoluteSamples = Math.round(absoluteTime * sampleRate);

      // Round to nearest frame, handling wrap-around
      let totalFrames = Math.round(absoluteTime * 30);
      const hours = Math.floor(totalFrames / (30 * 60 * 60));
      totalFrames %= (30 * 60 * 60);
      const minutes = Math.floor(totalFrames / (30 * 60));
      totalFrames %= (30 * 60);
      const seconds = Math.floor(totalFrames / 30);
      const frames = totalFrames % 30;
      const timecode = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;

      return { timecode, samples: absoluteSamples };
    });

    // Format output
    let text = `**Event/Onset Analysis**\n\n`;
    text += `Mode: ${mode}${mode === 'isolated' ? ` (track: ${trackName})` : ''}\n`;
    text += `Time range: ${startTime} - ${endTime}\n`;
    text += `Detected events: ${events.length}\n\n`;

    if (events.length > 0) {
      text += `**Onset Times:**\n`;
      events.forEach((event, idx) => {
        text += `${idx + 1}. ${event.timecode} (sample ${event.samples.toLocaleString()})\n`;
      });
    } else {
      text += 'No events/onsets detected.\n';
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing events: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Analyze silence using ffmpeg silencedetect
 */
async function analyzeSilence(
  wavPath: string,
  startTime: string,
  endTime: string,
  mode: string,
  trackName?: string,
  thresholdDb?: number,
  minDuration?: number
): Promise<any> {
  try {
    // Check if ffmpeg is available
    if (!(await checkToolAvailable('ffmpeg'))) {
      return {
        content: [
          {
            type: 'text',
            text:
              'Error: ffmpeg is required for silence detection but is not installed.\n' +
              'Install with: brew install ffmpeg',
          },
        ],
        isError: true,
      };
    }

    // Run silence detection with configurable threshold and duration
    const threshold = thresholdDb ?? -40; // Default -40dB
    const duration = minDuration ?? 0.3;   // Default 0.3 seconds

    const { stderr } = await execAsync(
      `ffmpeg -i "${wavPath}" -af silencedetect=noise=${threshold}dB:d=${duration} -f null - 2>&1`
    );

    // Parse silence start/end times
    const silenceStarts: number[] = [];
    const silenceEnds: number[] = [];

    const lines = stderr.split('\n');
    for (const line of lines) {
      const startMatch = line.match(/silence_start: ([\d.]+)/);
      const endMatch = line.match(/silence_end: ([\d.]+)/);

      if (startMatch) {
        silenceStarts.push(parseFloat(startMatch[1]));
      }
      if (endMatch) {
        silenceEnds.push(parseFloat(endMatch[1]));
      }
    }

    // Convert to timecodes and pair starts/ends
    const startSeconds = timecodeToSeconds(startTime);
    const sampleRate = 48000; // Pro Tools export sample rate
    const silencePeriods: Array<{
      start: string;
      end: string;
      duration: number;
      startSamples: number;
      endSamples: number;
    }> = [];

    for (let i = 0; i < Math.min(silenceStarts.length, silenceEnds.length); i++) {
      const startOffset = silenceStarts[i];
      const endOffset = silenceEnds[i];
      const duration = endOffset - startOffset;

      const startAbsolute = startSeconds + startOffset;
      const endAbsolute = startSeconds + endOffset;

      const startSamples = Math.round(startAbsolute * sampleRate);
      const endSamples = Math.round(endAbsolute * sampleRate);

      const formatTime = (time: number) => {
        let totalFrames = Math.round(time * 30);
        const hours = Math.floor(totalFrames / (30 * 60 * 60));
        totalFrames %= (30 * 60 * 60);
        const minutes = Math.floor(totalFrames / (30 * 60));
        totalFrames %= (30 * 60);
        const seconds = Math.floor(totalFrames / 30);
        const frames = totalFrames % 30;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
      };

      silencePeriods.push({
        start: formatTime(startAbsolute),
        end: formatTime(endAbsolute),
        duration,
        startSamples,
        endSamples,
      });
    }

    // Format output
    let text = `**Silence Analysis**\n\n`;
    text += `Mode: ${mode}${mode === 'isolated' ? ` (track: ${trackName})` : ''}\n`;
    text += `Time range: ${startTime} - ${endTime}\n`;
    text += `Threshold: ${threshold}dB, Min duration: ${duration}s\n`;
    text += `Silent periods detected: ${silencePeriods.length}\n\n`;

    if (silencePeriods.length > 0) {
      text += `**Silent Periods:**\n`;
      silencePeriods.forEach((period, idx) => {
        text += `${idx + 1}. ${period.start} - ${period.end} (${period.duration.toFixed(2)}s)\n`;
        text += `   Samples: ${period.startSamples.toLocaleString()} - ${period.endSamples.toLocaleString()}\n`;
      });
    } else {
      text += `No silence detected (audio above ${threshold}dB throughout).\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing silence: ${error}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Combined analysis - runs all available analyses
 */
async function analyzeCombined(
  wavPath: string,
  startTime: string,
  endTime: string,
  mode: string,
  trackName?: string,
  thresholdDb?: number,
  minDuration?: number
): Promise<any> {
  try {
    const hasFFmpeg = await checkToolAvailable('ffmpeg');
    const hasAubio = await checkToolAvailable('aubioonset');

    if (!hasFFmpeg && !hasAubio) {
      return {
        content: [
          {
            type: 'text',
            text:
              'Error: Combined analysis requires ffmpeg and/or aubio, but neither is installed.\n' +
              'Install with: brew install ffmpeg aubio',
          },
        ],
        isError: true,
      };
    }

    let combinedText = `**Combined Audio Analysis**\n\n`;
    combinedText += `Mode: ${mode}${mode === 'isolated' ? ` (track: ${trackName})` : ''}\n`;
    combinedText += `Time range: ${startTime} - ${endTime}\n`;
    combinedText += `Available tools: ${[hasFFmpeg && 'ffmpeg', hasAubio && 'aubio'].filter(Boolean).join(', ')}\n\n`;
    combinedText += '---\n\n';

    // Run silence detection if ffmpeg available
    if (hasFFmpeg) {
      const silenceResult = await analyzeSilence(wavPath, startTime, endTime, mode, trackName, thresholdDb, minDuration);
      if (!silenceResult.isError) {
        combinedText += silenceResult.content[0].text + '\n\n---\n\n';
      }
    }

    // Run event detection if aubio available
    if (hasAubio) {
      const eventsResult = await analyzeEvents(wavPath, startTime, endTime, mode, trackName);
      if (!eventsResult.isError) {
        combinedText += eventsResult.content[0].text + '\n\n---\n\n';
      }
    }

    combinedText += `**Analysis complete** - Use this data to identify interesting points for marker placement.`;

    return {
      content: [
        {
          type: 'text',
          text: combinedText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in combined analysis: ${error}`,
        },
      ],
      isError: true,
    };
  }
}
