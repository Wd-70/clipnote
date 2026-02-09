'use client';

import { useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { formatSecondsToTime } from '@/lib/utils/timestamp';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { ParsedClip } from '@/types';

interface ClipRange {
  clip: ParsedClip;
  virtualStart: number;
  virtualEnd: number;
  actualStart: number;
  actualEnd: number;
  duration: number;
}

interface ClipTimelineProps {
  // Data from useVideoSync
  clips: ParsedClip[];
  clipRanges: ClipRange[];
  currentClipIndex: number;
  currentVirtualTime: number;
  totalVirtualDuration: number;

  // Playback state
  isPlaying: boolean;

  // Callbacks - all actions go through useVideoSync
  onSeek: (virtualTime: number) => void;
  onSkipPrevious: () => void;
  onSkipNext: () => void;
  onTogglePlay: () => void;
  onPause: () => void;

  className?: string;
}

/**
 * ClipTimeline - Pure UI component for clip timeline visualization and controls
 *
 * Responsibilities:
 * - Display virtual timeline with clip segments
 * - Show playback progress
 * - Render control buttons
 *
 * All logic is handled by useVideoSync hook in the parent component.
 */
export function ClipTimeline({
  clips,
  clipRanges,
  currentClipIndex,
  currentVirtualTime,
  totalVirtualDuration,
  isPlaying,
  onSeek,
  onSkipPrevious,
  onSkipNext,
  onTogglePlay,
  onPause,
  className,
}: ClipTimelineProps) {
  const t = useTranslations('clipTimeline');

  // Handle timeline seek
  const handleSeek = useCallback(
    (value: number[]) => {
      const virtualTime = (value[0] / 100) * totalVirtualDuration;
      onSeek(virtualTime);
    },
    [totalVirtualDuration, onSeek]
  );

  // Handle play/pause toggle
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      onPause();
    } else {
      onTogglePlay();
    }
  }, [isPlaying, onTogglePlay, onPause]);

  // Calculate progress percentage
  const progressPercent = totalVirtualDuration > 0
    ? (currentVirtualTime / totalVirtualDuration) * 100
    : 0;

  if (clips.length === 0) {
    return (
      <div className={cn('bg-muted/30 rounded-lg p-4', className)}>
        <p className="text-sm text-muted-foreground text-center">
          {t('noClips')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('bg-muted/30 rounded-lg p-4 space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t('title')}</span>
          <Badge variant="secondary" className="text-xs">
            {t('clipCount', { count: clips.length })}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{formatSecondsToTime(currentVirtualTime)}</span>
          <span>/</span>
          <span className="font-mono">{formatSecondsToTime(totalVirtualDuration)}</span>
        </div>
      </div>

      {/* Timeline with clip segments */}
      <div className="relative">
        {/* Clip segment indicators */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-muted overflow-hidden">
          {clipRanges.map((range, index) => {
            const leftPercent = (range.virtualStart / totalVirtualDuration) * 100;
            const widthPercent = (range.duration / totalVirtualDuration) * 100;
            const isCurrentClip = index === currentClipIndex;

            return (
              <div
                key={range.clip.id}
                className={cn(
                  'absolute h-full transition-colors',
                  isCurrentClip ? 'bg-primary' : 'bg-primary/40',
                  index > 0 && 'border-l border-background'
                )}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                }}
                title={`${t('currentClip', { current: index + 1, total: clips.length })}: ${range.clip.text || formatSecondsToTime(range.actualStart)}`}
              />
            );
          })}
        </div>

        {/* Slider */}
        <Slider
          value={[progressPercent]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
          className="relative z-10"
        />
      </div>

      {/* Controls - simplified */}
      <div className="flex items-center justify-center gap-2">
        {/* Previous clip */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onSkipPrevious}
          disabled={currentClipIndex <= 0}
          title={t('prevClip')}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Play/Pause */}
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10"
          onClick={handleTogglePlay}
          title={isPlaying ? t('pause') : t('playClips')}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Next clip */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onSkipNext}
          disabled={currentClipIndex >= clips.length - 1}
          title={t('nextClip')}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Current clip info */}
      {currentClipIndex >= 0 && clipRanges[currentClipIndex] && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {t('currentClip', { current: currentClipIndex + 1, total: clips.length })}
            {clipRanges[currentClipIndex].clip.text && (
              <span className="ml-2 text-foreground">
                {clipRanges[currentClipIndex].clip.text}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
