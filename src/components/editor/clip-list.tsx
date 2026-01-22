'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Trash2, GripVertical, Clock, Scissors } from 'lucide-react';
import { formatSecondsToTime } from '@/lib/utils/timestamp';
import { cn } from '@/lib/utils';
import type { ParsedClip } from '@/types';

interface ClipListProps {
  clips: ParsedClip[];
  currentClipIndex?: number;
  onClipClick?: (clip: ParsedClip, index: number) => void;
  onClipDelete?: (clip: ParsedClip, index: number) => void;
  onPlayAll?: () => void;
  className?: string;
}

export function ClipList({
  clips,
  currentClipIndex = -1,
  onClipClick,
  onClipDelete,
  onPlayAll,
  className,
}: ClipListProps) {
  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);

  if (clips.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8 text-center">
          <Scissors className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            아직 클립이 없습니다
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            노트에 타임스탬프를 입력하면 자동으로 클립이 생성됩니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            클립 목록
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {clips.length}개
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatSecondsToTime(totalDuration)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1">
        {/* Play All Button */}
        {onPlayAll && (
          <Button
            onClick={onPlayAll}
            className="w-full mb-3"
            variant="default"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            가상 편집 재생
          </Button>
        )}

        {/* Clip List */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {clips.map((clip, index) => (
              <div
                key={clip.id}
                className={cn(
                  'group flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer',
                  'hover:border-primary/50 hover:bg-muted/30',
                  currentClipIndex === index && 
                    'border-primary bg-primary/5 shadow-sm'
                )}
                onClick={() => onClipClick?.(clip, index)}
              >
                {/* Drag handle (for future reordering) */}
                <div className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Clip number */}
                <div
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                    currentClipIndex === index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index + 1}
                </div>

                {/* Clip info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatSecondsToTime(clip.startTime)}
                    </span>
                    <span className="text-muted-foreground/40">→</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatSecondsToTime(clip.endTime)}
                    </span>
                  </div>
                  {clip.text && (
                    <p className="text-sm truncate mt-0.5">{clip.text}</p>
                  )}
                </div>

                {/* Duration badge */}
                <Badge variant="outline" className="text-xs shrink-0">
                  {formatSecondsToTime(clip.duration)}
                </Badge>

                {/* Play button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClipClick?.(clip, index);
                  }}
                >
                  <Play className="h-3 w-3" />
                </Button>

                {/* Delete button */}
                {onClipDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClipDelete(clip, index);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
