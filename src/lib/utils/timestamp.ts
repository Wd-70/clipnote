import type { ParsedClip } from '@/types';
import { sanitizeFilename } from './string';

// Regex pattern for MM:SS.d - MM:SS.d or HH:MM:SS.d - HH:MM:SS.d (range format)
const TIMESTAMP_RANGE_REGEX =
  /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?\s*[-–—]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?/g;

// Regex pattern for single timestamp: MM:SS.d or HH:MM:SS.d
const TIMESTAMP_SINGLE_REGEX =
  /(?:^|[\s\[\(])(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?(?=[\s\]\)\-–—]|$)/g;

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
 * Parse a single timestamp from regex match to seconds
 */
function parseTimestampMatch(match: RegExpExecArray, startIdx: number = 1): number {
  const part1 = parseInt(match[startIdx], 10);
  const part2 = parseInt(match[startIdx + 1], 10);
  const part3 = match[startIdx + 2] ? parseInt(match[startIdx + 2], 10) : null;
  const ms = match[startIdx + 3] ? parseFloat(`0.${match[startIdx + 3]}`) : 0;

  if (part3 !== null) {
    // HH:MM:SS format
    return part1 * 3600 + part2 * 60 + part3 + ms;
  } else {
    // MM:SS format
    return part1 * 60 + part2 + ms;
  }
}

/**
 * Find the start index of a comment marker (// or #) in a line.
 * Returns -1 if no comment marker is found.
 * Ignores :// (e.g. inside URLs like https://).
 */
function findCommentStart(line: string): number {
  // Check // first — but skip :// (URL scheme)
  const doubleSlashIdx = line.indexOf('//');
  if (doubleSlashIdx !== -1) {
    // Only treat as comment if NOT preceded by ':'
    if (doubleSlashIdx === 0 || line[doubleSlashIdx - 1] !== ':') {
      return doubleSlashIdx;
    }
  }

  const hashIdx = line.indexOf('#');
  if (hashIdx !== -1) {
    // If both exist (doubleSlash was :// so skipped), use #
    return hashIdx;
  }

  // doubleSlash was :// and no # found
  return -1;
}

/**
 * Extract single timestamp from a line (if no range found)
 */
function extractSingleTimestamp(line: string): { time: number; text: string } | null {
  TIMESTAMP_SINGLE_REGEX.lastIndex = 0;
  const match = TIMESTAMP_SINGLE_REGEX.exec(line);

  if (match) {
    const time = parseTimestampMatch(match, 1);
    // Extract text after the timestamp
    const textAfterTimestamp = line.substring(match.index + match[0].length).trim();
    return { time, text: textAfterTimestamp };
  }

  return null;
}

/**
 * Parse notes text and extract clips
 * @param notesText - The notes text to parse
 * @param videoDuration - Optional video duration for single-timestamp mode (last clip extends to end)
 */
export function parseNotesToClips(notesText: string, videoDuration?: number): ParsedClip[] {
  const clips: ParsedClip[] = [];

  // Handle non-string inputs (array, null, undefined, etc.)
  if (!notesText || typeof notesText !== 'string') {
    return clips;
  }

  const lines = notesText.split('\n');

  // First pass: collect all timestamps (both range and single)
  interface ParsedLine {
    lineIndex: number;
    type: 'range' | 'single';
    startTime: number;
    endTime?: number;
    text: string;
  }

  const parsedLines: ParsedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Strip comment: find first // or # and truncate
    const commentIdx = findCommentStart(line);
    if (commentIdx !== -1) {
      line = line.substring(0, commentIdx);
    }
    if (!line.trim()) continue;

    // Try range format first (MM:SS - MM:SS)
    TIMESTAMP_RANGE_REGEX.lastIndex = 0;
    const rangeMatch = TIMESTAMP_RANGE_REGEX.exec(line);

    if (rangeMatch) {
      const startTime = parseTimestampMatch(rangeMatch, 1);
      const endTime = parseTimestampMatch(rangeMatch, 5);
      const textAfterTimestamp = line.substring(rangeMatch.index + rangeMatch[0].length).trim();

      parsedLines.push({
        lineIndex: i,
        type: 'range',
        startTime,
        endTime,
        text: textAfterTimestamp,
      });
    } else {
      // Try single timestamp format (MM:SS)
      const singleResult = extractSingleTimestamp(line);
      if (singleResult) {
        parsedLines.push({
          lineIndex: i,
          type: 'single',
          startTime: singleResult.time,
          text: singleResult.text,
        });
      }
    }
  }

  // Second pass: create clips, using next timestamp as end time for single timestamps
  let clipIndex = 0;

  for (let i = 0; i < parsedLines.length; i++) {
    const parsed = parsedLines[i];

    let startTime = parsed.startTime;
    let endTime: number;

    if (parsed.type === 'range' && parsed.endTime !== undefined) {
      // Range format: use specified end time
      endTime = parsed.endTime;
    } else {
      // Single timestamp: use next line's start time or video duration
      const nextParsed = parsedLines[i + 1];
      if (nextParsed) {
        endTime = nextParsed.startTime;
      } else if (videoDuration && videoDuration > startTime) {
        endTime = videoDuration;
      } else {
        // No next timestamp and no duration: skip this clip or use a default
        // Use startTime + 60 seconds as fallback
        endTime = startTime + 60;
      }
    }

    // Only add clip if end time is after start time
    if (endTime > startTime) {
      clips.push({
        id: `clip-${clipIndex++}`,
        startTime,
        endTime,
        text: parsed.text || `Clip ${clipIndex}`,
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
 * Format seconds to a filename-safe segment string (e.g., "00_05_00" for HH:MM:SS)
 */
function formatSecondsToFilenameSegment(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  let segment = '';
  if (hours > 0) {
    segment += `${hours.toString().padStart(2, '0')}_`;
  }
  segment += `${minutes.toString().padStart(2, '0')}_${seconds.toString().padStart(2, '0')}`;
  return segment;
}

/**
 * Generate commands for downloading and processing video clips
 * For YouTube: Downloads all clip sections using one yt-dlp command, then merges them with ffmpeg.
 * For local files: Uses FFmpeg directly.
 */
export function generateFFmpegCommand(
  inputUrl: string,
  clips: ParsedClip[],
  project: { title: string }, // Add project title for filename generation
  outputPath: string = 'output.mp4'
): string {
  if (clips.length === 0) return '';

  // Check if input is a YouTube URL
  const isYouTubeUrl = inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be');

  if (isYouTubeUrl) {
    // 프로젝트 제목 정규화 (파일명으로 사용하기 위함)
    const projectTitleSanitized = sanitizeFilename(project.title || 'Untitled_Project');
    
    // --- Step 1: 개별 클립 파일 다운로드 ---
    // yt-dlp 명령어를 사용하여 각 클립 구간을 개별 파일로 다운로드합니다.
    // 파일명 형식: [프로젝트_제목]_[클립_번호]_[클립_내용].mp4
    const downloadCommands = clips.map((clip, index) => {
      const start = formatSecondsForYtDlp(clip.startTime);
      const end = formatSecondsForYtDlp(clip.endTime);
      const clipNumber = (index + 1).toString().padStart(2, '0'); // 클립 번호 (01, 02...)
      const clipName = sanitizeFilename(clip.text || `클립_${clipNumber}`); // 클립 내용 정규화
      
      const filename = `${projectTitleSanitized}_${clipNumber}_${clipName}.mp4`;
      
      return `yt-dlp --download-sections "*${start}-${end}" --force-keyframes-at-cuts -f "bv+ba/b/best" -o "${filename}" "${inputUrl}"`;
    }).join('\n');

    // --- Step 2: 클립 목록 파일 (filelist.txt) 생성 ---
    // 다운로드된 클립 파일들을 FFmpeg가 인식할 수 있는 목록 파일로 만듭니다.
    const fileListContent = clips.map((clip, index) => {
      const clipNumber = (index + 1).toString().padStart(2, '0');
      const clipName = sanitizeFilename(clip.text || `클립_${clipNumber}`);
      const filename = `${projectTitleSanitized}_${clipNumber}_${clipName}.mp4`;
      return `file '${filename}'`;
    }).join('\n');

    const createFileListCommand = `
# Windows (PowerShell) - filelist.txt 파일 생성
Set-Content -Path filelist.txt -Value \`@"
${fileListContent}
\`@"

# Linux/macOS (Bash) - filelist.txt 파일 생성 (주석 처리됨)
# printf "%s\\n" ${clips.map((clip, index) => {
  const clipNumber = (index + 1).toString().padStart(2, '0');
  const clipName = sanitizeFilename(clip.text || `클립_${clipNumber}`);
  const filename = `${projectTitleSanitized}_${clipNumber}_${clipName}.mp4`;
  return `"file '${filename}'"`;
}).join(' ')} > filelist.txt
`;

    // --- Step 3: 개별 클립 파일들을 하나로 병합 ---
    // FFmpeg의 concat demuxer를 사용하여 다운로드된 클립들을 하나의 영상으로 합칩니다.
    // -c copy 옵션으로 재인코딩 없이 빠르게 병합됩니다 (무손실).
    const mergeCommand = `ffmpeg -f concat -safe 0 -i filelist.txt -c copy "${outputPath}"`;

    // --- Step 4: 임시 파일 정리 (선택 사항) ---
    // 다운로드된 개별 클립 파일과 filelist.txt를 삭제합니다.
    const cleanupCommand = `
# Windows (PowerShell) - 임시 파일 삭제
Remove-Item "${projectTitleSanitized}_*.mp4", filelist.txt

# Linux/macOS (Bash) - 임시 파일 삭제 (주석 처리됨)
# rm "${projectTitleSanitized}_*.mp4" filelist.txt
`;

    // 모든 단계를 하나의 PowerShell 스크립트로 결합
    return `# ClipNote 클립 내보내기 자동화 스크립트 (PowerShell 호환)
#
# 이 스크립트는 YouTube 영상에서 지정된 클립 구간들을 다운로드하고,
# 모든 클립을 하나의 영상 파일로 병합하며, 마지막으로 임시 파일들을 정리합니다.
#
# 필요 도구:
#   - yt-dlp (YouTube 다운로드 도구): https://github.com/yt-dlp/yt-dlp
#   - ffmpeg (영상 처리 도구): https://ffmpeg.org/
#
# 사용 방법:
# 1. 이 스크립트 내용을 모두 복사합니다.
# 2. Windows PowerShell 또는 Linux/macOS 터미널을 엽니다.
# 3. 복사한 스크립트를 붙여넣고 Enter 키를 누릅니다.
#    (PowerShell에서는 스크립트 실행 정책 변경이 필요할 수 있습니다: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser)
#
# --- 1단계: 개별 클립 파일 다운로드 ---
${downloadCommands}

# --- 2단계: 클립 목록 파일 (filelist.txt) 생성 ---
${createFileListCommand}

# --- 3단계: 모든 클립을 하나의 파일로 병합 ---
${mergeCommand}

# --- 4단계: 임시 파일 정리 (선택 사항) ---
${cleanupCommand}
`;
  } else {
    // 로컬 파일 또는 직접 URL의 경우: FFmpeg filter_complex를 사용하여 단일 명령으로 처리
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
