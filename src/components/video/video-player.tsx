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
  RefreshCw,
} from 'lucide-react';
import { formatDuration, detectPlatform, extractVideoId } from '@/lib/utils/video';
import { cn } from '@/lib/utils';
import type { ParsedClip, VideoPlatform } from '@/types';

// Twitch Player type definition
interface TwitchPlayerInstance {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void; // 0-1
  getVolume: () => number;
  setMuted: (muted: boolean) => void;
  getMuted: () => boolean;
}

declare global {
  interface Window {
    Twitch?: {
      Player: new (elementId: string, options: {
        video: string;
        width?: string | number;
        height?: string | number;
        parent?: string[];
        autoplay?: boolean;
      }) => TwitchPlayerInstance;
    };
  }
}

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
  // Playback speed
  setPlaybackRate: (rate: number) => void;
  // Fullscreen
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  isFullscreen: () => boolean;
  getContainerRef: () => HTMLDivElement | null;
  // Live stream
  syncToLive: () => void;
}

interface VideoPlayerProps {
  url: string;
  clips?: ParsedClip[];
  onProgress?: (state: { played: number; playedSeconds: number }) => void;
  onDuration?: (duration: number) => void;
  onClipChange?: (clipIndex: number) => void;
  /** Called when play/pause state changes */
  onPlayingChange?: (playing: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  /** If true, blocks direct video clicks - use for share/embed pages */
  disableDirectPlay?: boolean;
  /** Called when video area is clicked (only works when disableDirectPlay is true) */
  onVideoClick?: () => void;
  /** Called when user directly interacts with video player (click to play/pause, skip buttons) */
  onUserInteraction?: () => void;
  /** Live stream mode */
  isLive?: boolean;
  /** Live stream open date (KST) for elapsed time calculation */
  liveOpenDate?: string;
  /** Called when live stream ends */
  onLiveEnd?: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ url, clips = [], onProgress, onDuration, onPlayingChange, className, style, disableDirectPlay = false, onVideoClick, onUserInteraction, isLive = false, liveOpenDate, onLiveEnd }, ref) => {
    // YouTube refs
    const youtubePlayerRef = useRef<YouTubePlayerType | null>(null);
    
    // Chzzk HLS refs
    const chzzkVideoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    
    // Twitch refs
    const twitchPlayerRef = useRef<TwitchPlayerInstance | null>(null);
    const twitchContainerRef = useRef<HTMLDivElement>(null);
    
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
    
    // Twitch-specific state
    const [twitchLoading, setTwitchLoading] = useState(false);
    const [twitchError, setTwitchError] = useState<string | null>(null);

    // Detect platform and extract video ID using shared utilities
    const platform: VideoPlatform = detectPlatform(url);
    const videoId = extractVideoId(url);

    // Notify parent of play state changes
    useEffect(() => {
      onPlayingChange?.(playing);
    }, [playing, onPlayingChange]);

    // =========================================================================
    // Chzzk HLS Initialization (supports both VOD and Live)
    // =========================================================================
    useEffect(() => {
      if (platform !== 'CHZZK' || !videoId) return;

      const initChzzkHls = async () => {
        setChzzkLoading(true);
        setChzzkError(null);

        try {
          // Fetch HLS URL from our API (add type=live for live streams)
          const apiUrl = isLive
            ? `/api/chzzk/hls?videoId=${videoId}&type=live`
            : `/api/chzzk/hls?videoId=${videoId}`;
          const response = await fetch(apiUrl);

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

          // Set duration from API response if available (not for live)
          if (!isLive && data.duration) {
            setDuration(data.duration);
            onDuration?.(data.duration);
          }

          if (Hls.isSupported()) {
            const hlsConfig = isLive
              ? {
                  enableWorker: true,
                  lowLatencyMode: true,
                  liveSyncDurationCount: 3,
                  liveMaxLatencyDurationCount: 6,
                }
              : {
                  enableWorker: true,
                  lowLatencyMode: false,
                };

            const hls = new Hls(hlsConfig);

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
                    if (isLive) {
                      // For live streams, network errors may mean stream ended
                      console.warn('[ChzzkPlayer] Live stream network error - stream may have ended');
                      onLiveEnd?.();
                    } else {
                      console.error('[ChzzkPlayer] Network error, trying to recover...');
                    }
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('[ChzzkPlayer] Media error, trying to recover...');
                    hls.recoverMediaError();
                    break;
                  default:
                    console.error('[ChzzkPlayer] Fatal error:', errorData);
                    if (isLive) {
                      onLiveEnd?.();
                    }
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
    }, [platform, videoId, isLive, onDuration, onLiveEnd]);

    // =========================================================================
    // Auto-play for live streams
    // =========================================================================
    useEffect(() => {
      if (isLive && isReady && platform === 'CHZZK' && chzzkVideoRef.current) {
        chzzkVideoRef.current.play().catch(() => {
          // Autoplay may be blocked by browser policy; ignore
        });
      }
    }, [isLive, isReady, platform]);

    // =========================================================================
    // Twitch Player Initialization
    // =========================================================================
    useEffect(() => {
      if (platform !== 'TWITCH' || !videoId) return;

      setTwitchLoading(true);
      setTwitchError(null);

      // Load Twitch Embed SDK
      const loadTwitchSDK = () => {
        return new Promise<void>((resolve, reject) => {
          if (window.Twitch) {
            resolve();
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://player.twitch.tv/js/embed/v1.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Twitch SDK'));
          document.body.appendChild(script);
        });
      };

      const initTwitchPlayer = async () => {
        try {
          await loadTwitchSDK();

          if (!twitchContainerRef.current || !window.Twitch) {
            throw new Error('Twitch SDK not available');
          }

          // Get parent domain for Twitch embed
          const parentDomain = window.location.hostname;

          // Create unique ID for this player instance
          const playerId = `twitch-player-${videoId}`;
          twitchContainerRef.current.id = playerId;

          const player = new window.Twitch.Player(playerId, {
            video: videoId,
            width: '100%',
            height: '100%',
            parent: [parentDomain],
            autoplay: false,
          });

          twitchPlayerRef.current = player;

          // Twitch Player events (using addEventListener pattern)
          const playerElement = player as unknown as {
            addEventListener: (event: string, callback: () => void) => void;
          };

          playerElement.addEventListener('ready', () => {
            setIsReady(true);
            setTwitchLoading(false);
            const dur = player.getDuration();
            if (dur) {
              setDuration(dur);
              onDuration?.(dur);
            }
          });

          playerElement.addEventListener('play', () => setPlaying(true));
          playerElement.addEventListener('pause', () => setPlaying(false));

        } catch (error) {
          console.error('[TwitchPlayer] Error initializing:', error);
          setTwitchError(error instanceof Error ? error.message : 'Failed to load video');
          setTwitchLoading(false);
        }
      };

      initTwitchPlayer();

      return () => {
        twitchPlayerRef.current = null;
      };
    }, [platform, videoId, onDuration]);

    // Twitch progress tracking
    useEffect(() => {
      if (platform !== 'TWITCH' || !isReady || !twitchPlayerRef.current) return;

      progressIntervalRef.current = setInterval(() => {
        if (twitchPlayerRef.current && !seeking) {
          const time = twitchPlayerRef.current.getCurrentTime();
          setCurrentTime(time);
          const dur = twitchPlayerRef.current.getDuration();
          if (dur > 0) {
            setDuration(dur);
            onProgress?.({
              played: time / dur,
              playedSeconds: time,
            });
          }
        }
      }, 100);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }, [platform, isReady, seeking, onProgress]);

    // =========================================================================
    // Chzzk Video Event Handlers (supports VOD + Live elapsed time)
    // =========================================================================
    useEffect(() => {
      if (platform !== 'CHZZK' || !chzzkVideoRef.current || !isReady) return;

      const video = chzzkVideoRef.current;
      const liveStartDate = isLive && liveOpenDate ? new Date(liveOpenDate) : null;

      const getElapsedTime = (): number => {
        if (isLive && hlsRef.current && liveStartDate) {
          // Use HLS.js playingDate (based on EXT-X-PROGRAM-DATE-TIME)
          const playingDate = (hlsRef.current as any).playingDate;
          if (playingDate && playingDate instanceof Date) {
            return Math.max(0, (playingDate.getTime() - liveStartDate.getTime()) / 1000);
          }
          // Fallback: compute from wall-clock time
          return Math.max(0, (Date.now() - liveStartDate.getTime()) / 1000);
        }
        return video.currentTime;
      };

      const handleTimeUpdate = () => {
        if (!seeking) {
          const time = getElapsedTime();
          setCurrentTime(time);

          if (isLive) {
            onProgress?.({
              played: 0,
              playedSeconds: time,
            });
          } else if (duration > 0) {
            onProgress?.({
              played: time / duration,
              playedSeconds: time,
            });
          }
        }
      };

      const handleDurationChange = () => {
        if (isLive) return; // Live has no fixed duration
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

      // Initial duration (VOD only)
      if (!isLive && video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
        onDuration?.(video.duration);
      }

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }, [platform, isReady, seeking, duration, isLive, liveOpenDate, onProgress, onDuration]);

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
        } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
          twitchPlayerRef.current.seek(seconds);
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
        } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
          twitchPlayerRef.current.play();
        }
      },
      pause: () => {
        if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
          youtubePlayerRef.current.pauseVideo();
        } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
          chzzkVideoRef.current.pause();
        } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
          twitchPlayerRef.current.pause();
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
        } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
          twitchPlayerRef.current.setVolume(normalizedVolume);
          twitchPlayerRef.current.setMuted(newVolume === 0);
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
        } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
          twitchPlayerRef.current.setMuted(true);
        }
      },
      unmute: () => {
        setMuted(false);
        if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
          youtubePlayerRef.current.unMute();
        } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
          chzzkVideoRef.current.muted = false;
        } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
          twitchPlayerRef.current.setMuted(false);
        }
      },
      isMuted: () => muted,
      setPlaybackRate: (rate: number) => {
        if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
          youtubePlayerRef.current.setPlaybackRate(rate);
        } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
          chzzkVideoRef.current.playbackRate = rate;
        }
        // Twitch doesn't support playback rate changes
      },
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
      syncToLive: () => {
        if (platform === 'CHZZK' && chzzkVideoRef.current && isLive && hlsRef.current) {
          const video = chzzkVideoRef.current;
          // Seek to the live edge
          if (video.seekable.length > 0) {
            video.currentTime = video.seekable.end(video.seekable.length - 1);
          }
          if (video.paused) {
            video.play();
          }
        }
      },
    }), [platform, currentTime, duration, volume, muted, isLive]);

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
      } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
        twitchPlayerRef.current.seek(newTime);
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
      } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
        twitchPlayerRef.current.setVolume(newVolume / 100);
        twitchPlayerRef.current.setMuted(newVolume === 0);
      }
    }, [platform]);

    const togglePlay = useCallback(() => {
      // Notify parent that user is directly interacting with video
      onUserInteraction?.();

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
      } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
        if (playing) {
          twitchPlayerRef.current.pause();
        } else {
          twitchPlayerRef.current.play();
        }
      }
    }, [platform, playing, onUserInteraction]);

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
      } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
        twitchPlayerRef.current.setMuted(!muted);
        setMuted(!muted);
      }
    }, [platform, muted]);

    const skipBack = useCallback(() => {
      onUserInteraction?.();

      const newTime = Math.max(0, currentTime - 10);
      if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(newTime, true);
      } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
        chzzkVideoRef.current.currentTime = newTime;
      } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
        twitchPlayerRef.current.seek(newTime);
      }
      setCurrentTime(newTime);
    }, [platform, currentTime, onUserInteraction]);

    const skipForward = useCallback(() => {
      onUserInteraction?.();

      const newTime = Math.min(duration, currentTime + 10);
      if (platform === 'YOUTUBE' && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(newTime, true);
      } else if (platform === 'CHZZK' && chzzkVideoRef.current) {
        chzzkVideoRef.current.currentTime = newTime;
      } else if (platform === 'TWITCH' && twitchPlayerRef.current) {
        twitchPlayerRef.current.seek(newTime);
      }
      setCurrentTime(newTime);
    }, [platform, currentTime, duration, onUserInteraction]);

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
          style={style}
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
        style={style}
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

          {/* Twitch Embed Player */}
          {platform === 'TWITCH' && (
            <>
              {/* Loading State */}
              {twitchLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-white/60">Twitch 영상 로딩 중...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {twitchError && (
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
                    <p className="text-white/60 font-medium">Twitch 영상을 로드할 수 없습니다</p>
                    <p className="text-sm text-white/40 mt-2">{twitchError}</p>
                  </div>
                </div>
              )}

              {/* Twitch Player Container */}
              <div
                ref={twitchContainerRef}
                className={cn(
                  "w-full h-full",
                  (twitchLoading || twitchError) && "invisible"
                )}
              />
            </>
          )}
          
          {/* Overlay for share/embed pages */}
          {disableDirectPlay && (platform === 'YOUTUBE' || platform === 'TWITCH') && (
            <div 
              className="absolute inset-0 z-10 cursor-pointer" 
              aria-label="Video overlay"
              onClick={onVideoClick}
            />
          )}
        </div>

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Timeline with clip markers - hidden in live mode */}
          {!isLive && (
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
          )}

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isLive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={skipBack}
                  disabled={!isReady}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
              )}

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

              {!isLive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={skipForward}
                  disabled={!isReady}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              )}

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
              {isLive ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => {
                      if (platform === 'CHZZK' && chzzkVideoRef.current && hlsRef.current) {
                        const video = chzzkVideoRef.current;
                        if (video.seekable.length > 0) {
                          video.currentTime = video.seekable.end(video.seekable.length - 1);
                        }
                        if (video.paused) {
                          video.play();
                        }
                      }
                    }}
                    disabled={!isReady}
                    title="Sync to live"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center gap-1.5 text-sm text-white font-mono">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-sm text-white font-mono">
                    {formatDuration(currentTime)}
                  </span>
                </>
              ) : (
                <span className="text-sm text-white font-mono">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              )}

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
