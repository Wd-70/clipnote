'use client';

import { forwardRef, useImperativeHandle, useRef, useState, useCallback, useEffect } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer as YouTubePlayerType } from 'react-youtube';
import Hls from 'hls.js';
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
  Loader2,
} from 'lucide-react';
import { formatDuration, detectPlatform, extractVideoId } from '@/lib/utils/video';
import { cn } from '@/lib/utils';
import type { ParsedClip, VideoPlatform } from '@/types';

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  play: () => void;
  pause: () => void;
  // Volume controls
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unmute: () => void;
  isMuted: () => boolean;
  // Fullscreen
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  isFullscreen: () => boolean;
  getContainerRef: () => HTMLDivElement | null;
}

interface VideoPlayerProps {
  url: string;
  clips?: ParsedClip[];
  onProgress?: (state: { played: number; playedSeconds: number }) => void;
  onDuration?: (duration: number) => void;
  onClipChange?: (clipIndex: number) => void;
  className?: string;
  /** If true, blocks direct video clicks - use for share/embed pages */
  disableDirectPlay?: boolean;
  /** Called when video area is clicked (only works when disableDirectPlay is true) */
  onVideoClick?: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ url, clips = [], onProgress, onDuration, className, disableDirectPlay = false, onVideoClick }, ref) => {
    // YouTube refs
    const youtubePlayerRef = useRef<YouTubePlayerType | null>(null);
    
    // Chzzk HLS refs
    const chzzkVideoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    
    // Shared refs
    const containerRef = useRef<HTMLDivElement>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // State
    const [playing, setPlaying] = useState(false);
    const [volume, setVolumeState] = useState(100);
    const [muted, setMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [seeking, setSeeking] = useState(false);
    
    // Chzzk-specific state
    const [chzzkLoading, setChzzkLoading] = useState(false);
    const [chzzkError, setChzzkError] = useState<string | null>(null);

    // Detect platform and extract video ID using shared utilities
    const platform: VideoPlatform = detectPlatform(url);
    const videoId = extractVideoId(url);

    // =========================================================================
    // Chzzk HLS Initialization
    // =========================================================================
    useEffect(() => {
      if (platform !== 'CHZZK' || !videoId) return;

      const initChzzkHls = async () => {
        setChzzkLoading(true);
        setChzzkError(null);

        try {
          // Fetch HLS URL from our API
          const response = await fetch(`/api/chzzk/hls?videoId=${videoId}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load video');
          }

          const data = await response.json();
          const hlsUrl = data.hlsUrl;

          if (!hlsUrl) {
            throw new Error('HLS stream not available');
          }

          const video = chzzkVideoRef.current;
          if (!video) return;

          // Set duration from API response if available
          if (data.duration) {
            setDuration(data.duration);
            onDuration?.(data.duration);
          }

          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
            });

            hls.loadSource(hlsUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsReady(true);
              setChzzkLoading(false);
              setChzzkError(null);
            });

            hls.on(Hls.Events.ERROR, (event, errorData) => {
              if (errorData.fatal) {
                switch (errorData.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error('[ChzzkPlayer] Network error, trying to recover...');
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('[ChzzkPlayer] Media error, trying to recover...');
                    hls.recoverMediaError();
                    break;
                  default:
                    console.error('[ChzzkPlayer] Fatal error:', errorData);
                    setChzzkError('Failed to play video');
                    setChzzkLoading(false);
                    break;
                }
              }
            });

            hlsRef.current = hls;
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS support
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', () => {
              setIsReady(true);
              setChzzkLoading(false);
            });
          } else {
            setChzzkError('Your browser does not support HLS playback');
            setChzzkLoading(false);
          }
        } catch (error) {
          console.error('[ChzzkPlayer] Error initializing:', error);
          setChzzkError(error instanceof Error ? error.message : 'Failed to load video');
          setChzzkLoading(false);
        }
      };

      initChzzkHls();

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }, [platform, videoId, onDuration]);

    // =========================================================================
    // Chzzk Video Event Handlers
    // =========================================================================
    useEffect(() => {
      if (platform !== 'CHZZK' || !chzzkVideoRef.current || !isReady) return;

      const video = chzzkVideoRef.current;

      const handleTimeUpdate = () => {
        if (!seeking) {
          const time = video.currentTime;
          setCurrentTime(time);
          
          if (duration > 0) {
            onProgress?.({
              played: time / duration,
              playedSeconds: time,
            });
          }
        }
      };

      const handleDurationChange = () => {
        const dur = video.duration;
        if (dur && !isNaN(dur)) {
          setDuration(dur);
          onDuration?.(dur);
        }
      };

      const handlePlay = () => setPlaying(true);
      const handlePause = () => setPlaying(false);

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('durationchange', handleDurationChange);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      // Initial duration
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
        onDuration?.(video.duration);
      }

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }, [platform, isReady, seeking, duration, onProgress, onDuration]);

    // =========================================================================
    // Imperative Handle (shared interface for both platforms)
    // =========================================================================
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
          youtubePlayerRef.current.seekTo(seconds, true);
        } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
          chzzkVideoRef.current.currentTime = seconds;
          setCurrentTime(seconds);
        }
      },
      getCurrentTime: () => currentTime,
      getDuration: () => duration,
      play: () => {
        if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
          youtubePlayerRef.current.playVideo();
        } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
          chzzkVideoRef.current.play();
        }
      },
      pause: () => {
        if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
          youtubePlayerRef.current.pauseVideo();
        } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
          chzzkVideoRef.current.pause();
        }
      },
      setVolume: (newVolume: number) => {
        setVolumeState(newVolume);
        const normalizedVolume = newVolume / 100;
        
        if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
          youtubePlayerRef.current.setVolume(newVolume);
          if (newVolume === 0) {
            youtubePlayerRef.current.mute();
            setMuted(true);
          } else {
            youtubePlayerRef.current.unMute();
            setMuted(false);
          }
        } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
          chzzkVideoRef.current.volume = normalizedVolume;
          chzzkVideoRef.current.muted = newVolume === 0;
          setMuted(newVolume === 0);
        }
      },
      getVolume: () => volume,
      mute: () => {
        setMuted(true);
        if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
          youtubePlayerRef.current.mute();
        } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
          chzzkVideoRef.current.muted = true;
        }
      },
      unmute: () => {
        setMuted(false);
        if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
          youtubePlayerRef.current.unMute();
        } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
          chzzkVideoRef.current.muted = false;
        }
      },
      isMuted: () => muted,
      requestFullscreen: () => {
        if (containerRef.current) {
          containerRef.current.requestFullscreen();
        }
      },
      exitFullscreen: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      },
      isFullscreen: () => !!document.fullscreenElement,
      getContainerRef: () => containerRef.current,
    }), [platform, currentTime, duration, volume, muted]);

    // =========================================================================
    // YouTube Handlers
    // =========================================================================
    const onYouTubeReady: YouTubeProps['onReady'] = useCallback((event: { target: YouTubePlayerType }) => {
      youtubePlayerRef.current = event.target;
      const dur = event.target.getDuration();
      setDuration(dur);
      setIsReady(true);
      onDuration?.(dur);
    }, [onDuration]);

    const onYouTubeStateChange: YouTubeProps['onStateChange'] = useCallback((event: { data: number }) => {
      setPlaying(event.data === 1);
    }, []);

    // YouTube progress tracking
    useEffect(() => {
      if (platform !== 'YOUTUBE' || !isReady || !youtubePlayerRef.current) return;

      progressIntervalRef.current = setInterval(async () => {
        if (youtubePlayerRef.current && !seeking) {
          const time = await youtubePlayerRef.current.getCurrentTime();
          setCurrentTime(time);
          const dur = await youtubePlayerRef.current.getDuration();
          const played = dur > 0 ? time / dur : 0;
          
          onProgress?.({
            played,
            playedSeconds: time,
          });
        }
      }, 100);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }, [platform, isReady, onProgress, seeking]);

    // =========================================================================
    // Control Handlers
    // =========================================================================
    const handleSeekChange = useCallback((value: number[]) => {
      setSeeking(true);
      const newTime = (value[0] / 100) * duration;
      setCurrentTime(newTime);
    }, [duration]);

    const handleSeekCommit = useCallback((value: number[]) => {
      setSeeking(false);
      const newTime = (value[0] / 100) * duration;
      
      if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(newTime, true);
      } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
        chzzkVideoRef.current.currentTime = newTime;
      }
    }, [platform, duration]);

    const handleVolumeChange = useCallback((value: number[]) => {
      const newVolume = value[0];
      setVolumeState(newVolume);
      setMuted(newVolume === 0);
      
      if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
        youtubePlayerRef.current.setVolume(newVolume);
        if (newVolume === 0) {
          youtubePlayerRef.current.mute();
        } else {
          youtubePlayerRef.current.unMute();
        }
      } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
        chzzkVideoRef.current.volume = newVolume / 100;
        chzzkVideoRef.current.muted = newVolume === 0;
      }
    }, [platform]);

    const togglePlay = useCallback(() => {
      if (platform === 'YOUTUBE') {
        if (!youtubePlayerRef.current) return;
        if (playing) {
          youtubePlayerRef.current.pauseVideo();
        } else {
          youtubePlayerRef.current.playVideo();
        }
      } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
        if (playing) {
          chzzkVideoRef.current.pause();
        } else {
          chzzkVideoRef.current.play();
        }
      }
    }, [platform, playing]);

    const toggleMute = useCallback(() => {
      if (platform === 'YOUTUBE') {
        if (!youtubePlayerRef.current) return;
        if (muted) {
          youtubePlayerRef.current.unMute();
          setMuted(false);
        } else {
          youtubePlayerRef.current.mute();
          setMuted(true);
        }
      } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
        chzzkVideoRef.current.muted = !muted;
        setMuted(!muted);
      }
    }, [platform, muted]);

    const skipBack = useCallback(() => {
      const newTime = Math.max(0, currentTime - 10);
      if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(newTime, true);
      } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
        chzzkVideoRef.current.currentTime = newTime;
      }
      setCurrentTime(newTime);
    }, [platform, currentTime]);

    const skipForward = useCallback(() => {
      const newTime = Math.min(duration, currentTime + 10);
      if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(newTime, true);
      } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
        chzzkVideoRef.current.currentTime = newTime;
      }
      setCurrentTime(newTime);
    }, [platform, currentTime, duration]);

    const toggleFullscreen = useCallback(() => {
      if (containerRef.current) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          containerRef.current.requestFullscreen();
        }
      }
    }, []);

    // =========================================================================
    // Render Helpers
    // =========================================================================
    const clipMarkers = clips.map((clip) => ({
      left: duration > 0 ? (clip.startTime / duration) * 100 : 0,
      width: duration > 0 ? ((clip.endTime - clip.startTime) / duration) * 100 : 0,
    }));

    const played = duration > 0 ? (currentTime / duration) * 100 : 0;

    const youtubeOpts: YouTubeProps['opts'] = {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        fs: disableDirectPlay ? 0 : 1,
        disablekb: disableDirectPlay ? 1 : 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
    };

    // =========================================================================
    // Render
    // =========================================================================
    if (!videoId || platform === 'UNKNOWN') {
      return (
        <div
          ref={containerRef}
          className={cn(
            'relative bg-black rounded-lg overflow-hidden',
            className
          )}
        >
          <div className="aspect-video flex items-center justify-center text-white/60">
            유효한 동영상 URL이 아닙니다
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
        {/* Video Area */}
        <div className="aspect-video relative">
          {/* YouTube Player */}
          {platform === 'YOUTUBE' && (
            <YouTube
              videoId={videoId}
              opts={youtubeOpts}
              onReady={onYouTubeReady}
              onStateChange={onYouTubeStateChange}
              className={cn(
                "w-full h-full",
                disableDirectPlay && "[&_iframe]:pointer-events-none"
              )}
            />
          )}
          
          {/* Chzzk HLS Player */}
          {platform === 'CHZZK' && (
            <>
              {/* Loading State */}
              {chzzkLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-white/60">영상 로딩 중...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {chzzkError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center p-6">
                    <div className="mb-4">
                      <svg
                        className="w-16 h-16 mx-auto text-white/30"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <p className="text-white/60 font-medium">영상을 로드할 수 없습니다</p>
                    <p className="text-sm text-white/40 mt-2">{chzzkError}</p>
                  </div>
                </div>
              )}

              {/* Video Element */}
              <video
                ref={chzzkVideoRef}
                className={cn(
                  "w-full h-full",
                  (chzzkLoading || chzzkError) && "invisible"
                )}
                playsInline
                onClick={disableDirectPlay ? onVideoClick : togglePlay}
              />
            </>
          )}
          
          {/* Overlay for share/embed pages */}
          {disableDirectPlay && platform === 'YOUTUBE' && (
            <div 
              className="absolute inset-0 z-10 cursor-pointer" 
              aria-label="Video overlay"
              onClick={onVideoClick}
            />
          )}
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
