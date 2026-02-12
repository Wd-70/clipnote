'use client';

import { useState, useCallback, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Save, Clock, FileText, Timer, Undo2, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTimestampParser } from '@/hooks/useTimestampParser';
import { formatSecondsToTime, parseTimeToSeconds } from '@/lib/utils/timestamp';
import { cn } from '@/lib/utils';
import type { ParsedClip } from '@/types';

// Timestamp pattern: supports MM:SS, M:SS, HH:MM:SS, and optional decimal seconds
const TIMESTAMP_PATTERN = /^((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)?(\s*-\s*)?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)?(\s+)?(.*)$/;

export interface NotesEditorRef {
  setStartTime: (time: number) => void;
  setEndTime: (time: number) => void;
}

interface NotesEditorProps {
  projectId: string;
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
  onClipsChange?: (clips: ParsedClip[]) => void;
  onSave?: (notes: string) => Promise<void>;
  onClipClick?: (clip: ParsedClip, index: number) => void;
  onPlayClip?: (startTime: number, endTime?: number) => void;
  currentClipIndex?: number;
  currentTime?: number;
  videoDuration?: number;
  onSetStartTime?: () => void;
  onSetEndTime?: () => void;
  className?: string;
}

// Local storage key for draft notes
const getDraftKey = (projectId: string) => `clipnote_draft_${projectId}`;

// Debounce delay for auto-save (2 seconds)
const AUTO_SAVE_DELAY = 2000;

export const NotesEditor = forwardRef<NotesEditorRef, NotesEditorProps>(({
  projectId,
  initialNotes = '',
  onNotesChange,
  onClipsChange,
  onSave,
  onClipClick,
  onPlayClip,
  currentClipIndex = -1,
  currentTime = 0,
  videoDuration,
  onSetStartTime,
  onSetEndTime,
  className,
}, ref) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isRestoredFromDraft, setIsRestoredFromDraft] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [textareaScrollTop, setTextareaScrollTop] = useState(0);
  const [lastEditedTimestamp, setLastEditedTimestamp] = useState<'start' | 'end' | null>(null);
  const [modifierKeys, setModifierKeys] = useState({ ctrl: false, shift: false });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineHeightRef = useRef(20);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialNotesRef = useRef(initialNotes);
  const notesRef = useRef(notes);
  const hasChangesRef = useRef(hasChanges);

  // Keep refs in sync for use in event handlers
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  const { clips, totalDuration, clipCount } = useTimestampParser(notes, videoDuration);

  // Measure line height from the textarea element
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const computed = getComputedStyle(textarea);
    const lh = parseFloat(computed.lineHeight);
    if (!isNaN(lh)) lineHeightRef.current = lh;
  }, []);

  // Track which line the cursor is on
  const updateActiveLine = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const textBefore = textarea.value.substring(0, textarea.selectionStart);
    setActiveLineIndex(textBefore.split('\n').length - 1);
  }, []);

  // Window-level modifier key tracking (for visual hints)
  useEffect(() => {
    const update = (e: KeyboardEvent) => {
      setModifierKeys({ ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
    };
    const reset = () => {
      setModifierKeys({ ctrl: false, shift: false });
    };
    window.addEventListener('keydown', update);
    window.addEventListener('keyup', update);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', update);
      window.removeEventListener('keyup', update);
      window.removeEventListener('blur', reset);
    };
  }, []);

  // Parse current active line's timestamps for overlay display
  const activeLineClip = useMemo(() => {
    const lines = notes.split('\n');
    const line = lines[activeLineIndex];
    if (!line) return null;

    const match = line.match(TIMESTAMP_PATTERN);
    if (!match) return null;

    const [, startTimeStr, , endTimeStr] = match;
    if (!startTimeStr && !endTimeStr) return null;

    return {
      startTime: startTimeStr ? parseTimeToSeconds(startTimeStr) : null,
      endTime: endTimeStr ? parseTimeToSeconds(endTimeStr) : null,
      startTimeStr: startTimeStr || null,
      endTimeStr: endTimeStr || null,
    };
  }, [notes, activeLineIndex]);

  // Save draft to localStorage immediately
  const saveDraftNow = useCallback(() => {
    const draftKey = getDraftKey(projectId);
    const currentNotes = notesRef.current;
    const currentHasChanges = hasChangesRef.current;

    if (!currentHasChanges) return;

    try {
      if (currentNotes !== initialNotesRef.current) {
        // Save if different from initial
        localStorage.setItem(draftKey, JSON.stringify({
          notes: currentNotes,
          savedAt: Date.now(),
        }));
      } else {
        // Clear if same as initial
        localStorage.removeItem(draftKey);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [projectId]);

  // Restore from localStorage on mount
  useEffect(() => {
    const draftKey = getDraftKey(projectId);
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // Only restore if draft is different from initial notes
        if (draft.notes && draft.notes !== initialNotesRef.current) {
          setNotes(draft.notes);
          setHasChanges(true);
          setIsRestoredFromDraft(true);
          onNotesChange?.(draft.notes);
        } else {
          // Draft is same as saved, remove it
          localStorage.removeItem(draftKey);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [projectId, onNotesChange]);

  // Save on page unload (beforeunload) and component unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveDraftNow();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save on unmount as well
      saveDraftNow();
    };
  }, [saveDraftNow]);

  // Auto-save to localStorage with debounce
  useEffect(() => {
    if (!hasChanges) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Check if notes are same as initial - if so, clear draft
    if (notes === initialNotesRef.current) {
      const draftKey = getDraftKey(projectId);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // Ignore errors
      }
      setHasChanges(false);
      return;
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraftNow();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [notes, hasChanges, projectId, saveDraftNow]);

  useEffect(() => {
    onClipsChange?.(clips);
  }, [clips, onClipsChange]);

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newNotes = e.target.value;
      setNotes(newNotes);
      setHasChanges(true);
      setIsRestoredFromDraft(false);
      onNotesChange?.(newNotes);
    },
    [onNotesChange]
  );

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    const draftKey = getDraftKey(projectId);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore errors
    }
  }, [projectId]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(notes);
      setHasChanges(false);
      setIsRestoredFromDraft(false);
      // Clear draft after successful save
      clearDraft();
      // Update initial notes reference
      initialNotesRef.current = notes;
    } finally {
      setIsSaving(false);
    }
  }, [notes, onSave, clearDraft]);

  // Discard draft and restore to initial notes
  const handleDiscardDraft = useCallback(() => {
    setNotes(initialNotesRef.current);
    setHasChanges(false);
    setIsRestoredFromDraft(false);
    clearDraft();
    onNotesChange?.(initialNotesRef.current);
  }, [clearDraft, onNotesChange]);

  // Get the current line info based on cursor position
  const getCurrentLineInfo = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    const cursorPos = textarea.selectionStart;
    const lines = notes.split('\n');

    // Find which line the cursor is on
    let charCount = 0;
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (charCount + lineLength > cursorPos) {
        lineIndex = i;
        break;
      }
      charCount += lineLength;
    }

    const currentLine = lines[lineIndex];
    const lineStartPos = charCount;
    const lineEndPos = lineStartPos + currentLine.length;

    return { lineIndex, currentLine, lineStartPos, lineEndPos, lines };
  }, [notes]);

  // Set start time for the current line
  const setStartTime = useCallback(
    (time: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const lineInfo = getCurrentLineInfo();
      if (!lineInfo) return;

      const { lineIndex, currentLine, lineStartPos, lineEndPos } = lineInfo;
      const timestamp = formatSecondsToTime(time);

      // Parse the current line
      const match = currentLine.match(TIMESTAMP_PATTERN);

      let newLine: string;
      if (match) {
        // Line has some structure - extract parts
        const [, , separator, endTime, space, description] = match;

        if (endTime) {
          // Has end time - replace start, keep end and description
          newLine = `${timestamp} - ${endTime}${space || ' '}${description || ''}`;
        } else if (separator) {
          // Has separator but no end time
          newLine = `${timestamp} - ${description || ''}`;
        } else if (description && description.trim()) {
          // Just has text, make it the description
          newLine = `${timestamp} - ${currentLine.trim()}`;
        } else {
          // Empty or just whitespace
          newLine = `${timestamp} - `;
        }
      } else {
        // No match - treat entire line as description
        const trimmedLine = currentLine.trim();
        newLine = trimmedLine ? `${timestamp} - ${trimmedLine}` : `${timestamp} - `;
      }

      // Select the current line and replace via execCommand for undo support
      textarea.focus();
      textarea.setSelectionRange(lineStartPos, lineEndPos);
      document.execCommand('insertText', false, newLine);
      // handleNotesChange will update state via onChange
      setActiveLineIndex(lineIndex);
      setLastEditedTimestamp('start');

      // Position cursor after the start timestamp
      setTimeout(() => {
        const cursorPos = lineStartPos + timestamp.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    },
    [notes, getCurrentLineInfo]
  );

  // Set end time for the current line
  const setEndTime = useCallback(
    (time: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const lineInfo = getCurrentLineInfo();
      if (!lineInfo) return;

      const { lineIndex, currentLine, lineStartPos, lineEndPos } = lineInfo;
      const timestamp = formatSecondsToTime(time);

      // Parse the current line
      const match = currentLine.match(TIMESTAMP_PATTERN);

      let newLine: string;
      if (match) {
        const [, startTime, , , , description] = match;

        if (startTime) {
          // Has start time - keep it, set end time
          newLine = `${startTime} - ${timestamp}${description ? ' ' + description : ' '}`;
        } else if (description && description.trim()) {
          // No start time but has text - need start time first
          // Use a placeholder for start time
          newLine = `00:00 - ${timestamp} ${description.trim()}`;
        } else {
          // Empty line - need start time first
          newLine = `00:00 - ${timestamp} `;
        }
      } else {
        // No match - need start time
        const trimmedLine = currentLine.trim();
        newLine = trimmedLine
          ? `00:00 - ${timestamp} ${trimmedLine}`
          : `00:00 - ${timestamp} `;
      }

      // Select the current line and replace via execCommand for undo support
      textarea.focus();
      textarea.setSelectionRange(lineStartPos, lineEndPos);
      document.execCommand('insertText', false, newLine);
      // handleNotesChange will update state via onChange
      setActiveLineIndex(lineIndex);
      setLastEditedTimestamp('end');

      // Position cursor after the end timestamp
      setTimeout(() => {
        const dashPos = newLine.indexOf(' - ');
        const endTimestampEnd = dashPos + 3 + timestamp.length;
        const cursorPos = lineStartPos + endTimestampEnd;
        textarea.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    },
    [notes, getCurrentLineInfo]
  );

  // Nudge a timestamp by delta seconds
  const nudgeTimestamp = useCallback(
    (target: 'start' | 'end', delta: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const lineInfo = getCurrentLineInfo();
      if (!lineInfo) return;

      const { lineIndex, currentLine, lineStartPos, lineEndPos } = lineInfo;
      const match = currentLine.match(TIMESTAMP_PATTERN);
      if (!match) return;

      const [, startTimeStr, , endTimeStr, space, description] = match;

      let newLine: string;
      if (target === 'start' && startTimeStr) {
        const newTime = Math.max(0, parseTimeToSeconds(startTimeStr) + delta);
        const clampedTime = videoDuration ? Math.min(newTime, videoDuration) : newTime;
        const newTimeStr = formatSecondsToTime(clampedTime);
        if (endTimeStr) {
          newLine = `${newTimeStr} - ${endTimeStr}${space || ' '}${description || ''}`;
        } else {
          newLine = `${newTimeStr} - ${description || ''}`;
        }
      } else if (target === 'end' && endTimeStr) {
        const newTime = Math.max(0, parseTimeToSeconds(endTimeStr) + delta);
        const clampedTime = videoDuration ? Math.min(newTime, videoDuration) : newTime;
        const newTimeStr = formatSecondsToTime(clampedTime);
        newLine = `${startTimeStr || '00:00'} - ${newTimeStr}${space || ' '}${description || ''}`;
      } else {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(lineStartPos, lineEndPos);
      document.execCommand('insertText', false, newLine);
      setActiveLineIndex(lineIndex);
      setLastEditedTimestamp(target);
    },
    [notes, getCurrentLineInfo, videoDuration]
  );

  // Play current line's clip
  const playCurrentClip = useCallback(() => {
    if (!activeLineClip || activeLineClip.startTime === null) return;
    onPlayClip?.(activeLineClip.startTime, activeLineClip.endTime ?? undefined);
  }, [activeLineClip, onPlayClip]);

  // Expose setStartTime and setEndTime via ref
  useImperativeHandle(ref, () => ({
    setStartTime,
    setEndTime,
  }), [setStartTime, setEndTime]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '[') {
          e.preventDefault();
          onSetStartTime?.();
        } else if (e.key === ']') {
          e.preventDefault();
          onSetEndTime?.();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          playCurrentClip();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          // Determine which timestamp to nudge
          const target = lastEditedTimestamp
            || (activeLineClip?.startTimeStr ? 'start' : null);
          if (target && activeLineClip) {
            const hasTarget = target === 'start'
              ? activeLineClip.startTimeStr
              : activeLineClip.endTimeStr;
            if (hasTarget) {
              e.preventDefault();
              const step = e.shiftKey ? 0.1 : 1;
              const direction = e.key === 'ArrowLeft' ? -1 : 1;
              nudgeTimestamp(target, step * direction);
            }
          }
        }
      }
    },
    [onSetStartTime, onSetEndTime, playCurrentClip, lastEditedTimestamp, activeLineClip, nudgeTimestamp]
  );

  // Determine the effective nudge target for visual display
  const effectiveTarget = lastEditedTimestamp
    || (activeLineClip?.startTimeStr ? 'start' : null);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header - responsive layout */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Title and stats */}
        <div className="flex items-center gap-2 mr-auto">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="hidden sm:inline">노트</span>
          </h3>
          <Badge variant="secondary" className="text-xs">
            {clipCount}
          </Badge>
          <Badge variant="secondary" className="text-xs hidden xs:inline-flex">
            <Clock className="h-3 w-3 mr-1" />
            {formatSecondsToTime(totalDuration)}
          </Badge>
          {/* Draft restored indicator */}
          {isRestoredFromDraft && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
              임시저장됨
            </Badge>
          )}
        </div>

        {/* Timestamp controls + Save button - wrap together and fill width when wrapped */}
        <div className="flex items-center gap-1 flex-1 justify-end min-w-fit">
          {/* Current time display */}
          <span className="font-mono text-sm text-muted-foreground px-2">
            {formatSecondsToTime(currentTime)}
          </span>

          {/* Start time button */}
          {onSetStartTime && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSetStartTime}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 sm:px-3"
                  >
                    <Timer className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">시작</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>현재 시간을 시작 시간으로 설정 (Ctrl+[)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* End time button */}
          {onSetEndTime && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSetEndTime}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 sm:px-3"
                  >
                    <Timer className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">종료</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>현재 시간을 종료 시간으로 설정 (Ctrl+])</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Discard draft button - only show when restored from draft */}
          {isRestoredFromDraft && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleDiscardDraft}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>임시저장 취소 (원래 내용으로 되돌리기)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Save button */}
          {onSave && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              size="sm"
              className="h-8"
            >
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isSaving ? '저장 중...' : '저장'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardContent className="flex-1 p-4 flex flex-col min-h-0 overflow-hidden">
          <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden rounded-md">
            {/* Active line highlight (background) */}
            <div
              className="absolute pointer-events-none left-0 right-0 z-0 bg-primary/[0.06] dark:bg-primary/[0.1] transition-[top] duration-75"
              style={{
                top: 8 + activeLineIndex * lineHeightRef.current - textareaScrollTop,
                height: lineHeightRef.current,
              }}
            />

            {/* Active line overlay — timestamp display, nudge hints, play button */}
            {activeLineClip && (
              <div
                className="absolute pointer-events-none right-0 z-[2] flex items-center gap-0.5 pr-3 transition-[top] duration-75"
                style={{
                  top: 8 + activeLineIndex * lineHeightRef.current - textareaScrollTop,
                  height: lineHeightRef.current,
                }}
              >
                {/* Start timestamp */}
                {activeLineClip.startTimeStr && (
                  <span
                    className={cn(
                      'inline-flex items-center font-mono text-[11px] leading-none px-1 rounded transition-all select-none',
                      effectiveTarget === 'start'
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground/40'
                    )}
                  >
                    {modifierKeys.ctrl && effectiveTarget === 'start' && (
                      <ChevronLeft className="h-3 w-3 -ml-0.5 text-primary/60 animate-pulse" />
                    )}
                    {activeLineClip.startTimeStr}
                    {modifierKeys.ctrl && effectiveTarget === 'start' && (
                      <ChevronRight className="h-3 w-3 -mr-0.5 text-primary/60 animate-pulse" />
                    )}
                  </span>
                )}

                {/* Separator */}
                {activeLineClip.startTimeStr && activeLineClip.endTimeStr && (
                  <span className="text-muted-foreground/30 text-[11px] select-none">–</span>
                )}

                {/* End timestamp */}
                {activeLineClip.endTimeStr && (
                  <span
                    className={cn(
                      'inline-flex items-center font-mono text-[11px] leading-none px-1 rounded transition-all select-none',
                      effectiveTarget === 'end'
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground/40'
                    )}
                  >
                    {modifierKeys.ctrl && effectiveTarget === 'end' && (
                      <ChevronLeft className="h-3 w-3 -ml-0.5 text-primary/60 animate-pulse" />
                    )}
                    {activeLineClip.endTimeStr}
                    {modifierKeys.ctrl && effectiveTarget === 'end' && (
                      <ChevronRight className="h-3 w-3 -mr-0.5 text-primary/60 animate-pulse" />
                    )}
                  </span>
                )}

                {/* Step size hint */}
                {modifierKeys.ctrl && effectiveTarget && (
                  <span className="text-primary/50 text-[9px] font-medium select-none ml-0.5">
                    {modifierKeys.shift ? '±0.1s' : '±1s'}
                  </span>
                )}

                {/* Play button */}
                {activeLineClip.startTimeStr && onPlayClip && (
                  <button
                    className="pointer-events-auto ml-1 p-0.5 rounded text-muted-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      playCurrentClip();
                    }}
                    tabIndex={-1}
                    title="클립 재생 (Ctrl+Enter)"
                  >
                    <Play className="h-3 w-3 fill-current" />
                  </button>
                )}
              </div>
            )}

            <Textarea
              ref={textareaRef}
              value={notes}
              onChange={handleNotesChange}
              onKeyDown={handleKeyDown}
              onSelect={updateActiveLine}
              onClick={updateActiveLine}
              onScroll={(e) => setTextareaScrollTop(e.currentTarget.scrollTop)}
              placeholder={`타임스탬프 형식으로 노트를 작성하세요:

00:30 - 01:15 인트로 영상
02:45 - 03:30 핵심 내용 설명
05:00 - 05:45 재미있는 장면

또는 시작 시간만 입력해도 됩니다:
1:30 인트로
2:45 본론 시작

Tip: 각 줄에 타임스탬프를 작성하면 자동으로 클립이 생성됩니다.
단축키: Ctrl+[ 시작, Ctrl+] 종료, Ctrl+Enter 재생
        Ctrl+←/→ ±1초, Ctrl+Shift+←/→ ±0.1초`}
              className="flex-1 min-h-0 resize-none font-mono text-sm overflow-auto bg-transparent relative z-[1]"
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
});

NotesEditor.displayName = 'NotesEditor';

// Export for use with video player
export { formatSecondsToTime };
