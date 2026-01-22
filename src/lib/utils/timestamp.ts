import type { ParsedClip } from '@/types';
import { sanitizeFilename } from './string';

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
