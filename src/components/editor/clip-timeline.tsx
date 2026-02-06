'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import type { VideoPlayerRef } from '@/components/video/video-player';

interface ClipTimelineProps {
  clips: ParsedClip[];
  playerRef: React.RefObject<VideoPlayerRef | null>;
  currentTime: number;
  isPlaying: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  className?: string;
}

export function ClipTimeline({
  clips,
  playerRef,
  currentTime,
  isPlaying,
  onPlayStateChange,
  className,
}: ClipTimelineProps) {
  const t = useTranslations('clipTimeline');
  const [isVirtualPlaying, setIsVirtualPlaying] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(-1);
  const lastSeekTimeRef = useRef<number>(0);

  // Sync internal state with external isPlaying prop
  useEffect(() => {
    setIsVirtualPlaying(isPlaying);
  }, [isPlaying]);

  // Calculate total virtual duration (sum of all clip durations)
  const { totalVirtualDuration, clipRanges } = useMemo(() => {
    const { ranges } = clips.reduce(
      (acc, clip) => {
        const duration = clip.endTime - clip.startTime;
        acc.ranges.push({
          clip,
          virtualStart: acc.accumulated,
          virtualEnd: acc.accumulated + duration,
          actualStart: clip.startTime,
          actualEnd: clip.endTime,
          duration,
        });
        acc.accumulated += duration;
        return acc;
      },
      { accumulated: 0, ranges: [] as Array<{
        clip: ParsedClip;
        virtualStart: number;
        virtualEnd: number;
        actualStart: number;
        actualEnd: number;
        duration: number;
      }> }
    );
    const totalDuration = ranges.length > 0 ? ranges[ranges.length - 1].virtualEnd : 0;
    return { totalVirtualDuration: totalDuration, clipRanges: ranges };
  }, [clips]);

  // Convert actual video time to virtual timeline time
  const actualToVirtual = useCallback(
    (actualTime: number): number => {
      for (let i = 0; i < clipRanges.length; i++) {
        const range = clipRanges[i];
        if (actualTime >= range.actualStart && actualTime <= range.actualEnd) {
          const offsetInClip = actualTime - range.actualStart;
          return range.virtualStart + offsetInClip;
        }
      }
      // If not in any clip, find the closest one
      for (let i = 0; i < clipRanges.length; i++) {
        const range = clipRanges[i];
        if (actualTime < range.actualStart) {
          return range.virtualStart;
        }
      }
      return totalVirtualDuration;
    },
    [clipRanges, totalVirtualDuration]
  );

  // Convert virtual timeline time to actual video time and clip index
  const virtualToActual = useCallback(
    (virtualTime: number): { actualTime: number; clipIndex: number } => {
      for (let i = 0; i < clipRanges.length; i++) {
        const range = clipRanges[i];
        if (virtualTime >= range.virtualStart && virtualTime < range.virtualEnd) {
          const offsetInVirtual = virtualTime - range.virtualStart;
          return {
            actualTime: range.actualStart + offsetInVirtual,
            clipIndex: i,
          };
        }
      }
      // Default to last clip end
      if (clipRanges.length > 0) {
        const lastRange = clipRanges[clipRanges.length - 1];
        return {
          actualTime: lastRange.actualEnd,
          clipIndex: clipRanges.length - 1,
        };
      }
      return { actualTime: 0, clipIndex: -1 };
    },
    [clipRanges]
  );

  // Calculate current virtual time based on actual video time
  const currentVirtualTime = useMemo(() => {
    if (clips.length === 0) return 0;
    return actualToVirtual(currentTime);
  }, [currentTime, actualToVirtual, clips.length]);

  // Find current clip index based on actual time
  useEffect(() => {
    const index = clipRanges.findIndex(
      (range) => currentTime >= range.actualStart && currentTime < range.actualEnd
    );
    setCurrentClipIndex(index);
  }, [currentTime, clipRanges]);

  // Handle virtual playback - auto-advance to next clip
  useEffect(() => {
    if (!isVirtualPlaying || clips.length === 0 || currentClipIndex < 0) return;

    const currentRange = clipRanges[currentClipIndex];
    if (!currentRange) return;

    // Check if we've reached the end of current clip
    if (currentTime >= currentRange.actualEnd - 0.15) {
      if (currentClipIndex < clips.length - 1) {
        // Jump to next clip
        const nextRange = clipRanges[currentClipIndex + 1];
        playerRef.current?.seekTo(nextRange.actualStart);
      } else {
        // End of all clips - stop virtual playback
        setIsVirtualPlaying(false);
        playerRef.current?.pause();
        onPlayStateChange?.(false);
      }
    }
  }, [currentTime, currentClipIndex, clipRanges, clips.length, isVirtualPlaying, playerRef, onPlayStateChange]);

  // Handle timeline seek
  const handleSeek = useCallback(
    (value: number[]) => {
      const virtualTime = (value[0] / 100) * totalVirtualDuration;
      const { actualTime, clipIndex } = virtualToActual(virtualTime);

      // Prevent duplicate seeks
      if (Math.abs(actualTime - lastSeekTimeRef.current) < 0.1) return;
      lastSeekTimeRef.current = actualTime;

      setCurrentClipIndex(clipIndex);
      playerRef.current?.seekTo(actualTime);
    },
    [totalVirtualDuration, virtualToActual, playerRef]
  );

  // Toggle play/pause for virtual playback
  const toggleVirtualPlay = useCallback(() => {
    if (clips.length === 0) return;

    if (isVirtualPlaying) {
      // Pause
      setIsVirtualPlaying(false);
      playerRef.current?.pause();
      onPlayStateChange?.(false);
    } else {
      // Play - if not in any clip, start from first clip
      setIsVirtualPlaying(true);

      if (currentClipIndex < 0) {
        const firstRange = clipRanges[0];
        if (firstRange) {
          playerRef.current?.seekTo(firstRange.actualStart);
          setCurrentClipIndex(0);
        }
      }

      playerRef.current?.play();
      onPlayStateChange?.(true);
    }
  }, [clips.length, isVirtualPlaying, currentClipIndex, clipRanges, playerRef, onPlayStateChange]);

  // Skip to previous clip
  const skipPrevious = useCallback(() => {
    if (clips.length === 0) return;

    const targetIndex = Math.max(0, currentClipIndex - 1);
    const targetRange = clipRanges[targetIndex];
    if (targetRange) {
      setCurrentClipIndex(targetIndex);
      playerRef.current?.seekTo(targetRange.actualStart);
    }
  }, [clips.length, currentClipIndex, clipRanges, playerRef]);

  // Skip to next clip
  const skipNext = useCallback(() => {
    if (clips.length === 0) return;

    const targetIndex = Math.min(clips.length - 1, currentClipIndex + 1);
    const targetRange = clipRanges[targetIndex];
    if (targetRange) {
      setCurrentClipIndex(targetIndex);
      playerRef.current?.seekTo(targetRange.actualStart);
    }
  }, [clips.length, currentClipIndex, clipRanges, playerRef]);

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
          onClick={skipPrevious}
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
          onClick={toggleVirtualPlay}
          title={isVirtualPlaying ? t('pause') : t('playClips')}
        >
          {isVirtualPlaying ? (
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
          onClick={skipNext}
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
