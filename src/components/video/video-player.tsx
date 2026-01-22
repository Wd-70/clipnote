'use client';

import { forwardRef, useImperativeHandle, useRef, useState, useCallback, useEffect } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer as YouTubePlayerType } from 'react-youtube';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils/video';
import { cn } from '@/lib/utils';
import type { ParsedClip } from '@/types';

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  play: () => void;
  pause: () => void;
}

interface VideoPlayerProps {
  url: string;
  clips?: ParsedClip[];
  onProgress?: (state: { played: number; playedSeconds: number }) => void;
  onDuration?: (duration: number) => void;
  onClipChange?: (clipIndex: number) => void;
  className?: string;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ url, clips = [], onProgress, onDuration, className }, ref) => {
    const playerRef = useRef<YouTubePlayerType | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(100);
    const [muted, setMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [seeking, setSeeking] = useState(false);

    // Extract video ID from URL
    const getVideoId = (videoUrl: string): string | null => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
      ];

      for (const pattern of patterns) {
        const match = videoUrl.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const videoId = getVideoId(url);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current) {
          playerRef.current.seekTo(seconds, true);
        }
      },
      getCurrentTime: () => {
        return currentTime;
      },
      getDuration: () => {
        return duration;
      },
      play: () => {
        if (playerRef.current) {
          playerRef.current.playVideo();
        }
      },
      pause: () => {
        if (playerRef.current) {
          playerRef.current.pauseVideo();
        }
      },
    }));

    const onReady: YouTubeProps['onReady'] = useCallback((event: { target: YouTubePlayerType }) => {
      playerRef.current = event.target;
      const dur = event.target.getDuration();
      setDuration(dur);
      setIsReady(true);
      onDuration?.(dur);
    }, [onDuration]);

    const onStateChange: YouTubeProps['onStateChange'] = useCallback((event: { data: number }) => {
      // 1 = playing, 2 = paused
      setPlaying(event.data === 1);
    }, []);

    // Update current time periodically
    useEffect(() => {
      if (!isReady || !playerRef.current) return;

      progressIntervalRef.current = setInterval(async () => {
        if (playerRef.current && !seeking) {
          const time = await playerRef.current.getCurrentTime();
          setCurrentTime(time);
          const dur = await playerRef.current.getDuration();
          const played = dur > 0 ? time / dur : 0;
          
          onProgress?.({
            played,
            playedSeconds: time,
          });
        }
      }, 100); // Update every 100ms

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }, [isReady, onProgress, seeking]);

    const handleSeekChange = useCallback((value: number[]) => {
      setSeeking(true);
      const newTime = (value[0] / 100) * duration;
      setCurrentTime(newTime);
    }, [duration]);

    const handleSeekCommit = useCallback((value: number[]) => {
      setSeeking(false);
      const newTime = (value[0] / 100) * duration;
      if (playerRef.current) {
        playerRef.current.seekTo(newTime, true);
      }
    }, [duration]);

    const handleVolumeChange = useCallback((value: number[]) => {
      const newVolume = value[0];
      setVolume(newVolume);
      setMuted(newVolume === 0);
      if (playerRef.current) {
        playerRef.current.setVolume(newVolume);
        if (newVolume === 0) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      }
    }, []);

    const togglePlay = useCallback(() => {
      if (!playerRef.current) return;
      if (playing) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }, [playing]);

    const toggleMute = useCallback(() => {
      if (!playerRef.current) return;
      if (muted) {
        playerRef.current.unMute();
        setMuted(false);
      } else {
        playerRef.current.mute();
        setMuted(true);
      }
    }, [muted]);

    const skipBack = useCallback(() => {
      if (playerRef.current) {
        const newTime = Math.max(0, currentTime - 10);
        playerRef.current.seekTo(newTime, true);
      }
    }, [currentTime]);

    const skipForward = useCallback(() => {
      if (playerRef.current) {
        const newTime = Math.min(duration, currentTime + 10);
        playerRef.current.seekTo(newTime, true);
      }
    }, [currentTime, duration]);

    const toggleFullscreen = useCallback(() => {
      if (containerRef.current) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          containerRef.current.requestFullscreen();
        }
      }
    }, []);

    // Calculate clip markers for timeline
    const clipMarkers = clips.map((clip) => ({
      left: duration > 0 ? (clip.startTime / duration) * 100 : 0,
      width: duration > 0 ? ((clip.endTime - clip.startTime) / duration) * 100 : 0,
    }));

    const played = duration > 0 ? (currentTime / duration) * 100 : 0;

    const opts: YouTubeProps['opts'] = {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0, // Hide default YouTube controls
        modestbranding: 1,
        rel: 0,
        fs: 1, // Allow fullscreen
      },
    };

    if (!videoId) {
      return (
        <div
          ref={containerRef}
          className={cn(
            'relative bg-black rounded-lg overflow-hidden',
            className
          )}
        >
          <div className="aspect-video flex items-center justify-center text-white/60">
            유효한 YouTube URL이 아닙니다
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative bg-black rounded-lg overflow-hidden group',
          className
        )}
      >
        {/* Video */}
        <div className="aspect-video">
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={onReady}
            onStateChange={onStateChange}
            className="w-full h-full"
          />
        </div>

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Timeline with clip markers */}
          <div className="relative mb-3">
            {/* Clip markers */}
            <div className="absolute inset-0 h-2 pointer-events-none">
              {clipMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="absolute h-full bg-primary/50 rounded"
                  style={{
                    left: `${marker.left}%`,
                    width: `${marker.width}%`,
                  }}
                />
              ))}
            </div>

            {/* Progress slider */}
            <Slider
              value={[played]}
              max={100}
              step={0.1}
              onValueChange={handleSeekChange}
              onValueCommit={handleSeekCommit}
              className="relative z-10"
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={skipBack}
                disabled={!isReady}
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={togglePlay}
                disabled={!isReady}
              >
                {playing ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={skipForward}
                disabled={!isReady}
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={toggleMute}
                  disabled={!isReady}
                >
                  {muted ? (
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

            <div className="flex items-center gap-4">
              <span className="text-sm text-white font-mono">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
