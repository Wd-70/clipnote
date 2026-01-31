'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('clipList');
  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);

  if (clips.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8 text-center">
          <Scissors className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {t('empty')}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {t('emptyHint')}
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
            {t('title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {clips.length}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatSecondsToTime(totalDuration)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Play All Button */}
        {onPlayAll && (
          <Button
            onClick={onPlayAll}
            className="w-full mb-3 shrink-0"
            variant="default"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            {t('playAll')}
          </Button>
        )}

        {/* Clip list with scroll */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-4">
            {clips.map((clip, index) => (
              <div
                key={clip.id}
                className={cn(
                  'group flex items-center gap-1.5 p-2 rounded-lg border transition-all cursor-pointer overflow-hidden',
                  'hover:border-primary/50 hover:bg-muted/30',
                  currentClipIndex === index &&
                    'border-primary bg-primary/5 shadow-sm'
                )}
                onClick={() => onClipClick?.(clip, index)}
              >
                {/* Clip number */}
                <div
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium shrink-0',
                    currentClipIndex === index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index + 1}
                </div>

                {/* Clip info */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-mono whitespace-nowrap">
                      {formatSecondsToTime(clip.startTime)}
                    </span>
                    <span className="text-muted-foreground/40">-</span>
                    <span className="font-mono whitespace-nowrap">
                      {formatSecondsToTime(clip.endTime)}
                    </span>
                  </div>
                  {clip.text && (
                    <p className="text-sm mt-0.5 line-clamp-2">{clip.text}</p>
                  )}
                </div>

                {/* Duration badge - right aligned */}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 hidden sm:inline-flex">
                  {formatSecondsToTime(clip.duration)}
                </Badge>

                {/* Action buttons - show on hover */}
                <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClipClick?.(clip, index);
                    }}
                  >
                    <Play className="h-3 w-3" />
                  </Button>

                  {onClipDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClipDelete(clip, index);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
