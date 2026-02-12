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
  save: () => void;
}

interface NotesEditorProps {
  projectId: string;
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
  onClipsChange?: (clips: ParsedClip[]) => void;
  onSave?: (notes: string) => Promise<void>;
  onClipClick?: (clip: ParsedClip, index: number) => void;
  onPlayClip?: (startTime: number, endTime?: number) => void;
  onTogglePlay?: () => void;
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
  onTogglePlay,
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
  const [cursorInLine, setCursorInLine] = useState(0);
  const [textareaScrollTop, setTextareaScrollTop] = useState(0);
  const [modifierKeys, setModifierKeys] = useState({ ctrl: false, shift: false });
  const [textareaFocused, setTextareaFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineHeightRef = useRef(20);
  const charWidthRef = useRef(7.8);
  const paddingLeftRef = useRef(12);
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

  // Measure line height, character width, and padding from the textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const computed = getComputedStyle(textarea);
    const lh = parseFloat(computed.lineHeight);
    if (!isNaN(lh)) lineHeightRef.current = lh;

    // Measure monospace character width
    const span = document.createElement('span');
    span.style.font = computed.font;
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.textContent = '0000000000'; // 10 chars
    document.body.appendChild(span);
    charWidthRef.current = span.getBoundingClientRect().width / 10;
    document.body.removeChild(span);

    paddingLeftRef.current = parseFloat(computed.paddingLeft) || 12;
  }, []);

  // Track cursor position: line index and position within line
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const textBefore = textarea.value.substring(0, textarea.selectionStart);
    const lines = textBefore.split('\n');
    setActiveLineIndex(lines.length - 1);
    setCursorInLine(lines[lines.length - 1].length);
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

  // Parse current active line's timestamps with character positions
  const activeLineClip = useMemo(() => {
    const lines = notes.split('\n');
    const line = lines[activeLineIndex];
    if (!line) return null;

    // Find start timestamp and its character range
    const startMatch = line.match(/^((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)/);
    if (!startMatch) return null;

    const startTimeStr = startMatch[1];
    const startCharStart = 0;
    const startCharEnd = startTimeStr.length;

    // Find separator and end timestamp
    const afterStart = line.substring(startCharEnd);
    const sepMatch = afterStart.match(/^(\s*[-–—]\s*)/);

    let endTimeStr: string | null = null;
    let endCharStart = 0;
    let endCharEnd = 0;

    if (sepMatch) {
      const sepEnd = startCharEnd + sepMatch[0].length;
      const afterSep = line.substring(sepEnd);
      const endMatch = afterSep.match(/^((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)/);
      if (endMatch) {
        endTimeStr = endMatch[1];
        endCharStart = sepEnd;
        endCharEnd = sepEnd + endTimeStr.length;
      }
    }

    return {
      startTime: parseTimeToSeconds(startTimeStr),
      endTime: endTimeStr ? parseTimeToSeconds(endTimeStr) : null,
      startTimeStr,
      endTimeStr,
      startCharStart,
      startCharEnd,
      endCharStart,
      endCharEnd,
    };
  }, [notes, activeLineIndex]);

  // Selected timestamp — only updates when cursor is actually within a timestamp range
  const [selectedTimestamp, setSelectedTimestamp] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (!activeLineClip) return;
    // Cursor within start timestamp
    if (cursorInLine >= activeLineClip.startCharStart && cursorInLine <= activeLineClip.startCharEnd) {
      setSelectedTimestamp('start');
      return;
    }
    // Cursor within end timestamp
    if (activeLineClip.endTimeStr && cursorInLine >= activeLineClip.endCharStart && cursorInLine <= activeLineClip.endCharEnd) {
      setSelectedTimestamp('end');
      return;
    }
    // No end timestamp → always start
    if (!activeLineClip.endTimeStr) {
      setSelectedTimestamp('start');
    }
    // Otherwise: keep previous selection (cursor in separator/description)
  }, [activeLineClip, cursorInLine]);

  // Save draft to localStorage immediately
  const saveDraftNow = useCallback(() => {
    const draftKey = getDraftKey(projectId);
    const currentNotes = notesRef.current;
    const currentHasChanges = hasChangesRef.current;

    if (!currentHasChanges) return;

    try {
      if (currentNotes !== initialNotesRef.current) {
        localStorage.setItem(draftKey, JSON.stringify({
          notes: currentNotes,
          savedAt: Date.now(),
        }));
      } else {
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
        if (draft.notes && draft.notes !== initialNotesRef.current) {
          setNotes(draft.notes);
          setHasChanges(true);
          setIsRestoredFromDraft(true);
          onNotesChange?.(draft.notes);
        } else {
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
      saveDraftNow();
    };
  }, [saveDraftNow]);

  // Auto-save to localStorage with debounce
  useEffect(() => {
    if (!hasChanges) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

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
      clearDraft();
      initialNotesRef.current = notes;
    } finally {
      setIsSaving(false);
    }
  }, [notes, onSave, clearDraft]);

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

    let charCount = 0;
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1;
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
      const match = currentLine.match(TIMESTAMP_PATTERN);

      let newLine: string;
      if (match) {
        const [, , separator, endTime, space, description] = match;
        if (endTime) {
          newLine = `${timestamp} - ${endTime}${space || ' '}${description || ''}`;
        } else if (separator) {
          newLine = `${timestamp} - ${description || ''}`;
        } else if (description && description.trim()) {
          newLine = `${timestamp} - ${currentLine.trim()}`;
        } else {
          newLine = `${timestamp} - `;
        }
      } else {
        const trimmedLine = currentLine.trim();
        newLine = trimmedLine ? `${timestamp} - ${trimmedLine}` : `${timestamp} - `;
      }

      textarea.focus();
      textarea.setSelectionRange(lineStartPos, lineEndPos);
      document.execCommand('insertText', false, newLine);
      setActiveLineIndex(lineIndex);

      // Position cursor within the start timestamp so it becomes selected
      setTimeout(() => {
        const cursorPos = lineStartPos + Math.floor(timestamp.length / 2);
        textarea.setSelectionRange(cursorPos, cursorPos);
        setCursorInLine(Math.floor(timestamp.length / 2));
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
      const match = currentLine.match(TIMESTAMP_PATTERN);

      let newLine: string;
      if (match) {
        const [, startTime, , , , description] = match;
        if (startTime) {
          newLine = `${startTime} - ${timestamp}${description ? ' ' + description : ' '}`;
        } else if (description && description.trim()) {
          newLine = `00:00 - ${timestamp} ${description.trim()}`;
        } else {
          newLine = `00:00 - ${timestamp} `;
        }
      } else {
        const trimmedLine = currentLine.trim();
        newLine = trimmedLine
          ? `00:00 - ${timestamp} ${trimmedLine}`
          : `00:00 - ${timestamp} `;
      }

      textarea.focus();
      textarea.setSelectionRange(lineStartPos, lineEndPos);
      document.execCommand('insertText', false, newLine);
      setActiveLineIndex(lineIndex);

      // Position cursor within the end timestamp so it becomes selected
      setTimeout(() => {
        const dashPos = newLine.indexOf(' - ');
        const endTimestampStart = dashPos + 3;
        const cursorPos = lineStartPos + endTimestampStart + Math.floor(timestamp.length / 2);
        textarea.setSelectionRange(cursorPos, cursorPos);
        setCursorInLine(endTimestampStart + Math.floor(timestamp.length / 2));
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
    save: handleSave,
  }), [setStartTime, setEndTime, handleSave]);

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
        } else if (e.key === ' ') {
          e.preventDefault();
          onTogglePlay?.();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const target = selectedTimestamp;
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
    [onSetStartTime, onSetEndTime, playCurrentClip, onTogglePlay, selectedTimestamp, activeLineClip, nudgeTimestamp]
  );

  // Compute overlay positions (px) for the selected timestamp
  const overlayPositions = useMemo(() => {
    if (!activeLineClip) return null;
    if (selectedTimestamp === 'end' && !activeLineClip.endTimeStr) return null;

    const cw = charWidthRef.current;
    const pl = paddingLeftRef.current;
    const lh = lineHeightRef.current;
    const topY = 8 + activeLineIndex * lh - textareaScrollTop;

    const selStart = selectedTimestamp === 'start'
      ? activeLineClip.startCharStart
      : activeLineClip.endCharStart;
    const selEnd = selectedTimestamp === 'start'
      ? activeLineClip.startCharEnd
      : activeLineClip.endCharEnd;

    return {
      topY,
      lineHeight: lh,
      // Selected timestamp highlight
      selLeft: pl + selStart * cw,
      selWidth: (selEnd - selStart) * cw,
      // Chevron positions
      chevronLeftX: pl + selStart * cw - 14,
      chevronRightX: pl + selEnd * cw + 2,
    };
  }, [activeLineClip, selectedTimestamp, activeLineIndex, textareaScrollTop]);

  return (
    <div className={cn('flex flex-col @container', className)}>
      {/* Header - responsive layout based on container width */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Title and stats */}
        <div className="flex items-center gap-2 mr-auto">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="hidden @[400px]:inline">노트</span>
          </h3>
          <Badge variant="secondary" className="text-xs">
            {clipCount}
          </Badge>
          <Badge variant="secondary" className="text-xs hidden @[480px]:inline-flex">
            <Clock className="h-3 w-3 mr-1" />
            {formatSecondsToTime(totalDuration)}
          </Badge>
          {isRestoredFromDraft && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
              임시저장됨
            </Badge>
          )}
        </div>

        {/* Timestamp controls + Save button */}
        <div className="flex items-center gap-1 flex-1 justify-end min-w-fit">
          <span className="font-mono text-sm text-muted-foreground px-2">
            {formatSecondsToTime(currentTime)}
          </span>

          {onSetStartTime && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSetStartTime}
                    variant="outline"
                    size="sm"
                    className="h-8 px-1.5 @[450px]:px-3"
                  >
                    <Timer className="h-4 w-4 hidden @[350px]:block @[450px]:mr-1.5" />
                    <span className="hidden @[450px]:inline">시작</span>
                    <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border bg-muted/50 px-1 font-mono text-[10px] font-medium text-muted-foreground">
                      [
                    </kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>현재 시간을 시작 시간으로 설정 (Ctrl+[)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {onSetEndTime && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSetEndTime}
                    variant="outline"
                    size="sm"
                    className="h-8 px-1.5 @[450px]:px-3"
                  >
                    <Timer className="h-4 w-4 hidden @[350px]:block @[450px]:mr-1.5" />
                    <span className="hidden @[450px]:inline">종료</span>
                    <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border bg-muted/50 px-1 font-mono text-[10px] font-medium text-muted-foreground">
                      ]
                    </kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>현재 시간을 종료 시간으로 설정 (Ctrl+])</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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

          {onSave && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              size="sm"
              className="h-8"
            >
              <Save className="h-4 w-4 @[480px]:mr-2" />
              <span className="hidden @[480px]:inline">{isSaving ? '저장 중...' : '저장'}</span>
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

            {/* Selected timestamp highlight — positioned at actual text */}
            {overlayPositions && (
              <div
                className={cn(
                  "absolute pointer-events-none z-[2] rounded-sm transition-all duration-100",
                  textareaFocused && modifierKeys.ctrl
                    ? "bg-primary/25 ring-1 ring-primary/40"
                    : "bg-primary/10"
                )}
                style={{
                  top: overlayPositions.topY,
                  left: overlayPositions.selLeft,
                  width: overlayPositions.selWidth,
                  height: overlayPositions.lineHeight,
                }}
              />
            )}

            {/* Ctrl-held nudge UI — only when textarea focused */}
            {overlayPositions && textareaFocused && modifierKeys.ctrl && (
              <>
                <div
                  className="absolute pointer-events-none z-[3] flex items-center transition-all duration-150"
                  style={{
                    top: overlayPositions.topY,
                    left: overlayPositions.chevronLeftX - 1,
                    height: overlayPositions.lineHeight,
                  }}
                >
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 backdrop-blur-sm shadow-sm">
                    <ChevronLeft className="h-3 w-3 text-primary" />
                  </div>
                </div>
                <div
                  className="absolute pointer-events-none z-[3] flex items-center transition-all duration-150"
                  style={{
                    top: overlayPositions.topY,
                    left: overlayPositions.chevronRightX,
                    height: overlayPositions.lineHeight,
                  }}
                >
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 backdrop-blur-sm shadow-sm">
                    <ChevronRight className="h-3 w-3 text-primary" />
                  </div>
                </div>
                {/* Step size badge — floats above the selected timestamp */}
                <div
                  className="absolute pointer-events-none z-[3] flex items-end justify-center transition-all duration-150"
                  style={{
                    top: overlayPositions.topY - 20,
                    left: overlayPositions.selLeft,
                    width: overlayPositions.selWidth,
                    height: 20,
                  }}
                >
                  <span className="bg-primary text-primary-foreground text-[10px] font-semibold leading-none px-1.5 py-[3px] rounded-full shadow-sm select-none">
                    {modifierKeys.shift ? '±0.1s' : '±1s'}
                  </span>
                </div>
              </>
            )}

            {/* Play button — right side of active line, only when line has a clip */}
            {activeLineClip && onPlayClip && (
              <div
                className="absolute z-[2] flex items-center gap-1 pr-3 transition-[top] duration-75"
                style={{
                  top: 8 + activeLineIndex * lineHeightRef.current - textareaScrollTop,
                  right: 0,
                  height: lineHeightRef.current,
                }}
              >
                {textareaFocused && modifierKeys.ctrl && (
                  <kbd className="pointer-events-none text-[9px] font-mono leading-none text-primary/60 select-none">⏎</kbd>
                )}
                <button
                  className={cn(
                    "pointer-events-auto p-0.5 rounded transition-colors",
                    textareaFocused && modifierKeys.ctrl
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground/30 hover:text-primary hover:bg-primary/10"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    playCurrentClip();
                  }}
                  tabIndex={-1}
                  title="클립 재생 (Ctrl+Enter)"
                >
                  <Play className="h-3 w-3 fill-current" />
                </button>
              </div>
            )}

            <Textarea
              ref={textareaRef}
              value={notes}
              onChange={handleNotesChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
              onSelect={updateCursorPosition}
              onClick={updateCursorPosition}
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
        Ctrl+Space 재생/일시정지
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
