'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Volume2,
  VolumeX,
  Timer,
  Rewind,
  FastForward,
} from 'lucide-react';
import { formatSecondsToTime } from '@/lib/utils/timestamp';
import { cn } from '@/lib/utils';
import type { VideoPlayerRef } from '@/components/video/video-player';
import { useTranslations } from 'next-intl';

interface VideoControlPanelProps {
  playerRef: React.RefObject<VideoPlayerRef | null>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  onSetStartTime?: () => void;
  onSetEndTime?: () => void;
  onExitClipMode?: () => void;
  className?: string;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Seek button component to reduce repetition
function SeekButton({
  seconds,
  direction,
  icon: Icon,
  label,
  tooltip,
  className,
  onClick,
}: {
  seconds: number;
  direction: 'backward' | 'forward';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          className={cn('h-9 w-9 px-0 flex flex-col items-center justify-center gap-0', className)}
          onClick={onClick}
        >
          <Icon className="h-4 w-4" />
          <span className="text-[10px] font-mono leading-none text-muted-foreground">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function VideoControlPanel({
  playerRef,
  currentTime,
  duration,
  isPlaying,
  onPlayStateChange,
  onSetStartTime,
  onSetEndTime,
  onExitClipMode,
  className,
}: VideoControlPanelProps) {
  const t = useTranslations('videoControl');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(100); // 0-100 range
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(100);

  // Toggle play/pause (original video mode - exits clip mode)
  const togglePlay = useCallback(() => {
    // Exit clip mode when using original video controls
    onExitClipMode?.();

    if (isPlaying) {
      playerRef.current?.pause();
      onPlayStateChange?.(false);
    } else {
      playerRef.current?.play();
      onPlayStateChange?.(true);
    }
  }, [isPlaying, playerRef, onPlayStateChange, onExitClipMode]);

  // Seek by specified seconds (original video mode - exits clip mode)
  const seekBySeconds = useCallback((seconds: number) => {
    // Exit clip mode when seeking in original video
    onExitClipMode?.();

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    playerRef.current?.seekTo(newTime);
  }, [currentTime, duration, playerRef, onExitClipMode]);

  // Handle timeline seek (original video mode - exits clip mode)
  const handleSeek = useCallback((value: number[]) => {
    // Exit clip mode when seeking in original video
    onExitClipMode?.();

    const newTime = (value[0] / 100) * duration;
    playerRef.current?.seekTo(newTime);
  }, [duration, playerRef, onExitClipMode]);

  // Handle playback speed change
  const handleSpeedChange = useCallback((speed: string) => {
    const speedValue = parseFloat(speed);
    setPlaybackSpeed(speedValue);
    playerRef.current?.setPlaybackRate(speedValue);
  }, [playerRef]);

  // Handle volume change (VideoPlayer uses 0-100 range)
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    playerRef.current?.setVolume(newVolume);
  }, [playerRef]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
      playerRef.current?.setVolume(prevVolume);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
      playerRef.current?.setVolume(0);
    }
  }, [isMuted, volume, prevVolume, playerRef]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea (these have their own handlers)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBySeconds(e.shiftKey ? -5 : -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBySeconds(e.shiftKey ? 5 : 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange([Math.min(100, volume + 10)]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange([Math.max(0, volume - 10)]);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case '[':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onSetStartTime?.();
          }
          break;
        case ']':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onSetEndTime?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekBySeconds, handleVolumeChange, toggleMute, volume, onSetStartTime, onSetEndTime]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn('bg-muted/30 rounded-lg p-3 space-y-3 @container', className)}>
      {/* Timeline */}
      <div className="space-y-1">
        <Slider
          value={[progressPercent]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">{formatSecondsToTime(currentTime)}</span>
          <span className="font-mono">{formatSecondsToTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Backward seek controls */}
        <div className="flex items-center gap-0.5">
          <TooltipProvider delayDuration={300}>
            {/* 10min - only show when container >= 500px */}
            <SeekButton
              seconds={600}
              direction="backward"
              icon={Rewind}
              label="10m"
              tooltip={t('backward10m')}
              className="hidden @[500px]:flex"
              onClick={() => seekBySeconds(-600)}
            />

            {/* 3min - only show when container >= 420px */}
            <SeekButton
              seconds={180}
              direction="backward"
              icon={ChevronsLeft}
              label="3m"
              tooltip={t('backward3m')}
              className="hidden @[420px]:flex"
              onClick={() => seekBySeconds(-180)}
            />

            {/* 30s - always visible */}
            <SeekButton
              seconds={30}
              direction="backward"
              icon={ChevronsLeft}
              label="30"
              tooltip={t('backward30')}
              onClick={() => seekBySeconds(-30)}
            />

            {/* 5s - always visible */}
            <SeekButton
              seconds={5}
              direction="backward"
              icon={ChevronLeft}
              label="5"
              tooltip={t('backward5')}
              onClick={() => seekBySeconds(-5)}
            />

            {/* 1s - always visible */}
            <SeekButton
              seconds={1}
              direction="backward"
              icon={ChevronLeft}
              label="1"
              tooltip={t('backward1')}
              onClick={() => seekBySeconds(-1)}
            />
          </TooltipProvider>
        </div>

        {/* Center: Play/Pause */}
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Right: Forward seek controls */}
        <div className="flex items-center gap-0.5">
          <TooltipProvider delayDuration={300}>
            {/* 1s - always visible */}
            <SeekButton
              seconds={1}
              direction="forward"
              icon={ChevronRight}
              label="1"
              tooltip={t('forward1')}
              onClick={() => seekBySeconds(1)}
            />

            {/* 5s - always visible */}
            <SeekButton
              seconds={5}
              direction="forward"
              icon={ChevronRight}
              label="5"
              tooltip={t('forward5')}
              onClick={() => seekBySeconds(5)}
            />

            {/* 30s - always visible */}
            <SeekButton
              seconds={30}
              direction="forward"
              icon={ChevronsRight}
              label="30"
              tooltip={t('forward30')}
              onClick={() => seekBySeconds(30)}
            />

            {/* 3min - only show when container >= 420px */}
            <SeekButton
              seconds={180}
              direction="forward"
              icon={ChevronsRight}
              label="3m"
              tooltip={t('forward3m')}
              className="hidden @[420px]:flex"
              onClick={() => seekBySeconds(180)}
            />

            {/* 10min - only show when container >= 500px */}
            <SeekButton
              seconds={600}
              direction="forward"
              icon={FastForward}
              label="10m"
              tooltip={t('forward10m')}
              className="hidden @[500px]:flex"
              onClick={() => seekBySeconds(600)}
            />
          </TooltipProvider>
        </div>
      </div>

      {/* Bottom row: Speed, Volume, Insert Timestamp */}
      <div className="flex items-center justify-between gap-2">
        {/* Playback speed */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('speed')}</span>
          <Select value={playbackSpeed.toString()} onValueChange={handleSpeedChange}>
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBACK_SPEEDS.map((speed) => (
                <SelectItem key={speed} value={speed.toString()}>
                  {speed}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timestamp buttons — text and kbd hide at narrow widths */}
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1"
                  onClick={onSetStartTime}
                >
                  <Timer className="h-3.5 w-3.5" />
                  <span className="text-xs hidden @[400px]:inline">{t('setStartTime')}</span>
                  <kbd className="ml-0.5 pointer-events-none hidden @[340px]:inline-flex h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
                    [
                  </kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('setStartTimeHint')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1"
                  onClick={onSetEndTime}
                >
                  <Timer className="h-3.5 w-3.5" />
                  <span className="text-xs hidden @[400px]:inline">{t('setEndTime')}</span>
                  <kbd className="ml-0.5 pointer-events-none hidden @[340px]:inline-flex h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
                    ]
                  </kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('setEndTimeHint')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
}
