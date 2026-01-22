import type { ParsedClip } from '@/types';

// Regex pattern for MM:SS.d - MM:SS.d or HH:MM:SS.d - HH:MM:SS.d
const TIMESTAMP_REGEX =
  /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?\s*[-–—]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/g;

/**
 * Parse timestamp string to seconds
 * Supports: MM:SS, MM:SS.d, HH:MM:SS, HH:MM:SS.d
 */
export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map((p) => p.trim());

  if (parts.length === 2) {
    // MM:SS or MM:SS.d
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS or HH:MM:SS.d
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

/**
 * Format seconds to timestamp string
 */
export function formatSecondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toFixed(1)
      .padStart(4, '0')}`;
  }

  return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

/**
 * Parse notes text and extract clips
 */
export function parseNotesToClips(notesText: string): ParsedClip[] {
  const clips: ParsedClip[] = [];
  
  // Handle non-string inputs (array, null, undefined, etc.)
  if (!notesText || typeof notesText !== 'string') {
    return clips;
  }
  
  const lines = notesText.split('\n');

  let clipIndex = 0;

  for (const line of lines) {
    TIMESTAMP_REGEX.lastIndex = 0;
    const match = TIMESTAMP_REGEX.exec(line);

    if (match) {
      const startMinutes = parseInt(match[1], 10);
      const startSeconds = parseInt(match[2], 10);
      const startHours = match[3] ? parseInt(match[3], 10) : 0;
      const startMs = match[4] ? parseFloat(`0.${match[4]}`) : 0;

      const endMinutes = parseInt(match[5], 10);
      const endSeconds = parseInt(match[6], 10);
      const endHours = match[7] ? parseInt(match[7], 10) : 0;
      const endMs = match[8] ? parseFloat(`0.${match[8]}`) : 0;

      let startTime: number;
      let endTime: number;

      if (match[3]) {
        // HH:MM:SS format
        startTime = startMinutes * 3600 + startSeconds * 60 + startHours + startMs;
        endTime = endMinutes * 3600 + endSeconds * 60 + endHours + endMs;
      } else {
        // MM:SS format
        startTime = startMinutes * 60 + startSeconds + startMs;
        endTime = endMinutes * 60 + endSeconds + endMs;
      }

      // Extract text after the timestamp
      const textAfterTimestamp = line.substring(match.index + match[0].length).trim();

      clips.push({
        id: `clip-${clipIndex++}`,
        startTime,
        endTime,
        text: textAfterTimestamp || `Clip ${clipIndex}`,
        duration: endTime - startTime,
      });
    }
  }

  return clips;
}

/**
 * Format seconds to yt-dlp timestamp format (HH:MM:SS or MM:SS, integer seconds only)
 * yt-dlp requires clean timestamps without decimals for --download-sections
 */
function formatSecondsForYtDlp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generate commands for downloading and processing video clips
 * For YouTube: Downloads only the clip sections and merges them
 * For local files: Uses FFmpeg directly
 */
export function generateFFmpegCommand(
  inputUrl: string,
  clips: ParsedClip[],
  outputPath: string = 'output.mp4'
): string {
  if (clips.length === 0) return '';

  // Check if input is a YouTube URL
  const isYouTubeUrl = inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be');

  if (isYouTubeUrl) {
    // For YouTube: Use yt-dlp to download each clip section individually, then use ffmpeg to merge them.
    // This is the most reliable method to handle multiple non-contiguous clips from YouTube.
    // The command generates a multi-step script for automation.
    
    // Step 1: Generate individual yt-dlp download commands
    const downloadCommands = clips.map((clip, index) => {
      const start = formatSecondsForYtDlp(clip.startTime);
      const end = formatSecondsForYtDlp(clip.endTime);
      const filename = `clip_${(index + 1).toString().padStart(2, '0')}.mp4`; // e.g., clip_01.mp4
      
      // Use robust format selection that works with YouTube's 2024-2025 changes
      return `yt-dlp --download-sections "*${start}-${end}" --force-keyframes-at-cuts -f "bv+ba/b/best" -o "${filename}" "${inputUrl}"`;
    }).join('\n');

    // Step 2: Generate filelist.txt content and command for PowerShell
    const fileListContent = clips.map((_, index) => `file 'clip_${(index + 1).toString().padStart(2, '0')}.mp4'`).join('\n');
    const createFileListCommand = `
# Windows (PowerShell) - Create filelist.txt
Set-Content -Path filelist.txt -Value \`@"
${fileListContent}
\`@"

# Linux/macOS (Bash) - Create filelist.txt
# printf "%s\\n" ${clips.map((_, index) => `"file 'clip_${(index + 1).toString().padStart(2, '0')}.mp4'"`).join(' ')} > filelist.txt
`;

    // Step 3: Generate FFmpeg merge command
    const mergeCommand = `ffmpeg -f concat -safe 0 -i filelist.txt -c copy "${outputPath}"`;

    // Step 4: Generate cleanup command
    const cleanupCommand = `
# Windows (PowerShell) - Clean up
Remove-Item clip_*.mp4, filelist.txt

# Linux/macOS (Bash) - Clean up
# rm clip_*.mp4 filelist.txt
`;

    // Combine all steps into a single script
    return `# ClipNote Export Script (PowerShell compatible)
#
# This script will download individual video segments from YouTube using yt-dlp,
# merge them into a single output file using ffmpeg, and then clean up
# the intermediate files.
#
# Requirements:
#   - yt-dlp (https://github.com/yt-dlp/yt-dlp)
#   - ffmpeg (https://ffmpeg.org/)
#
# How to use:
# 1. Copy the entire script.
# 2. Open PowerShell (Windows) or Terminal (Linux/macOS).
# 3. Paste the script and press Enter.

# --- Step 1: Download individual clip sections ---
${downloadCommands}

# --- Step 2: Create filelist.txt for merging ---
${createFileListCommand}

# --- Step 3: Merge clips into a single output file ---
${mergeCommand}

# --- Step 4: Clean up (optional) ---
${cleanupCommand}
`;
  } else {
    // For local files or direct URLs: Use FFmpeg filter_complex (single command)
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    clips.forEach((clip, index) => {
      filterParts.push(
        `[0:v]trim=start=${clip.startTime}:end=${clip.endTime},setpts=PTS-STARTPTS[v${index}];` +
          `[0:a]atrim=start=${clip.startTime}:end=${clip.endTime},asetpts=PTS-STARTPTS[a${index}]`
      );
      concatInputs.push(`[v${index}][a${index}]`);
    });

    const filterComplex = filterParts.join(';');
    const concat = `${concatInputs.join('')}concat=n=${clips.length}:v=1:a=1[outv][outa]`;

    return `ffmpeg -i "${inputUrl}" -filter_complex "${filterComplex};${concat}" -map "[outv]" -map "[outa]" "${outputPath}"`;
  }
}