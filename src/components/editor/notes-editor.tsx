'use client';

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
import { Save, Clock, FileText, Sparkles, Timer } from 'lucide-react';
import { useTimestampParser } from '@/hooks/useTimestampParser';
import { formatSecondsToTime } from '@/lib/utils/timestamp';
import { cn } from '@/lib/utils';
import type { ParsedClip } from '@/types';

export interface NotesEditorRef {
  insertTimestampAtCursor: (currentTime: number) => void;
}

interface NotesEditorProps {
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
  onClipsChange?: (clips: ParsedClip[]) => void;
  onSave?: (notes: string) => Promise<void>;
  onClipClick?: (clip: ParsedClip, index: number) => void;
  currentClipIndex?: number;
  currentTime?: number;
  onInsertTimestamp?: () => void;
  className?: string;
}

export const NotesEditor = forwardRef<NotesEditorRef, NotesEditorProps>(({
  initialNotes = '',
  onNotesChange,
  onClipsChange,
  onSave,
  onClipClick,
  currentClipIndex = -1,
  currentTime = 0,
  onInsertTimestamp,
  className,
}, ref) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { clips, totalDuration, clipCount } = useTimestampParser(notes);

  useEffect(() => {
    onClipsChange?.(clips);
  }, [clips, onClipsChange]);

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newNotes = e.target.value;
      setNotes(newNotes);
      setHasChanges(true);
      onNotesChange?.(newNotes);
    },
    [onNotesChange]
  );

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(notes);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [notes, onSave]);

  // Insert timestamp at cursor position
  const insertTimestampAtCursor = useCallback(
    (time: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const timestamp = formatSecondsToTime(time);
      const cursorPos = textarea.selectionStart;
      const textBefore = notes.substring(0, cursorPos);
      const textAfter = notes.substring(cursorPos);

      // Determine what to insert based on context
      // If we're at the start of a line or after existing timestamp, just insert the time
      // Otherwise, check if we need to add a newline
      const lastNewlinePos = textBefore.lastIndexOf('\n');
      const currentLine = textBefore.substring(lastNewlinePos + 1);
      
      let insertion = '';
      
      // Check if current line already has a timestamp pattern (start time)
      // Supports both MM:SS and HH:MM:SS formats
      const hasStartTime = /^(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?(?:\s*-\s*)?$/.test(currentLine.trim());
      
      if (hasStartTime) {
        // Just add the end time
        insertion = `${timestamp} `;
      } else if (currentLine.trim() === '') {
        // Empty line - add full timestamp range
        insertion = `${timestamp} - `;
      } else {
        // In the middle of text - add newline and full timestamp
        insertion = `\n${timestamp} - `;
      }

      const newNotes = textBefore + insertion + textAfter;
      setNotes(newNotes);
      onNotesChange?.(newNotes);
      setHasChanges(true);

      // Move cursor to end of inserted timestamp
      setTimeout(() => {
        const newCursorPos = cursorPos + insertion.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    },
    [notes, onNotesChange]
  );

  // Expose insertTimestampAtCursor via ref
  useImperativeHandle(ref, () => ({
    insertTimestampAtCursor,
  }), [insertTimestampAtCursor]);

  // Handle keyboard shortcut (Ctrl+M or Cmd+M)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        onInsertTimestamp?.();
      }
    },
    [onInsertTimestamp]
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            노트
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {clipCount} 클립
            </Badge>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              {formatSecondsToTime(totalDuration)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onInsertTimestamp && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onInsertTimestamp}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Timer className="h-4 w-4" />
                    <span className="font-mono text-xs">{formatSecondsToTime(currentTime)}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>현재 시간 타임스탬프 삽입 (Ctrl+M)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {onSave && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 p-4">
          <Textarea
            ref={textareaRef}
            value={notes}
            onChange={handleNotesChange}
            onKeyDown={handleKeyDown}
            placeholder={`타임스탬프 형식으로 노트를 작성하세요:

00:30 - 01:15 인트로 영상
02:45 - 03:30 핵심 내용 설명
05:00 - 05:45 재미있는 장면

Tip: 각 줄에 "시작시간 - 종료시간" 형식으로 작성하면 자동으로 클립이 생성됩니다.
단축키: Ctrl+M으로 현재 재생 시간을 삽입할 수 있습니다.`}
            className="h-full min-h-[200px] resize-none font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Clip list */}
      {clips.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              감지된 클립
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {clips.map((clip, index) => (
                <button
                  key={clip.id}
                  onClick={() => onClipClick?.(clip, index)}
                  className={cn(
                    'w-full text-left p-2 rounded-md transition-colors',
                    'hover:bg-muted/50',
                    currentClipIndex === index && 'bg-primary/10 border-l-2 border-primary'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatSecondsToTime(clip.startTime)} - {formatSecondsToTime(clip.endTime)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {formatSecondsToTime(clip.duration)}
                    </Badge>
                  </div>
                  {clip.text && (
                    <p className="text-sm mt-1 truncate">{clip.text}</p>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

NotesEditor.displayName = 'NotesEditor';

// Export for use with video player
export { formatSecondsToTime };
