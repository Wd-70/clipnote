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
  onInsertTimestamp?: () => void;
  className?: string;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoControlPanel({
  playerRef,
  currentTime,
  duration,
  isPlaying,
  onPlayStateChange,
  onInsertTimestamp,
  className,
}: VideoControlPanelProps) {
  const t = useTranslations('videoControl');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(100); // 0-100 range
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(100);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pause();
      onPlayStateChange?.(false);
    } else {
      playerRef.current?.play();
      onPlayStateChange?.(true);
    }
  }, [isPlaying, playerRef, onPlayStateChange]);

  // Seek by specified seconds
  const seekBySeconds = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    playerRef.current?.seekTo(newTime);
  }, [currentTime, duration, playerRef]);

  // Handle timeline seek
  const handleSeek = useCallback((value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    playerRef.current?.seekTo(newTime);
  }, [duration, playerRef]);

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
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow Ctrl+T in textarea
        if (e.ctrlKey && e.key === 't') {
          e.preventDefault();
          onInsertTimestamp?.();
        }
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekBySeconds, handleVolumeChange, toggleMute, volume, onInsertTimestamp]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn('bg-muted/30 rounded-lg p-3 space-y-3', className)}>
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
        {/* Left: Seek controls */}
        <div className="flex items-center gap-0.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 flex flex-col items-center justify-center gap-0"
                  onClick={() => seekBySeconds(-30)}
                >
                  <ChevronsLeft className="h-4 w-4" />
                  <span className="text-[10px] font-mono leading-none text-muted-foreground">30</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('backward30')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 flex flex-col items-center justify-center gap-0"
                  onClick={() => seekBySeconds(-5)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-[10px] font-mono leading-none text-muted-foreground">5</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('backward5')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 flex flex-col items-center justify-center gap-0"
                  onClick={() => seekBySeconds(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-[10px] font-mono leading-none text-muted-foreground">1</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('backward1')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Center: Play/Pause */}
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Right: Forward controls */}
        <div className="flex items-center gap-0.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 flex flex-col items-center justify-center gap-0"
                  onClick={() => seekBySeconds(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-[10px] font-mono leading-none text-muted-foreground">1</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('forward1')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 flex flex-col items-center justify-center gap-0"
                  onClick={() => seekBySeconds(5)}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-[10px] font-mono leading-none text-muted-foreground">5</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('forward5')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 px-0 flex flex-col items-center justify-center gap-0"
                  onClick={() => seekBySeconds(30)}
                >
                  <ChevronsRight className="h-4 w-4" />
                  <span className="text-[10px] font-mono leading-none text-muted-foreground">30</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t('forward30')}</TooltipContent>
            </Tooltip>
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

        {/* Insert timestamp button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5"
                onClick={onInsertTimestamp}
              >
                <Timer className="h-3.5 w-3.5" />
                <span className="text-xs">{t('insertTimestamp')}</span>
                <kbd className="ml-1 pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
                  Ctrl+T
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('insertTimestampHint')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

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
