'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { VideoPlayer, type VideoPlayerRef } from '@/components/video/video-player';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { formatSecondsToTime } from '@/lib/utils/timestamp';
import { cn } from '@/lib/utils';
import { Play, Pause, Paperclip, Loader2, AlertCircle, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import type { ParsedClip } from '@/types';

interface SharedProject {
  shareId: string;
  title: string;
  videoUrl: string;
  platform: 'YOUTUBE' | 'CHZZK';
  videoId: string;
  thumbnailUrl?: string;
  clips: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>;
}

export default function EmbedPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const playerRef = useRef<VideoPlayerRef>(null);
  const lastSeekTimeRef = useRef<number>(0);

  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVirtualPlaying, setIsVirtualPlaying] = useState(false);
  const [playbackFinished, setPlaybackFinished] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate virtual timeline data (clips only, not full video)
  const { totalVirtualDuration, clipRanges } = useMemo(() => {
    if (!project) return { totalVirtualDuration: 0, clipRanges: [] };
    
    let accumulated = 0;
    const ranges = project.clips.map((clip) => {
      const start = accumulated;
      const clipDuration = clip.endTime - clip.startTime;
      accumulated += clipDuration;
      return {
        clip,
        virtualStart: start,
        virtualEnd: accumulated,
        actualStart: clip.startTime,
        actualEnd: clip.endTime,
        duration: clipDuration,
      };
    });
    return { totalVirtualDuration: accumulated, clipRanges: ranges };
  }, [project]);

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

  // Convert virtual timeline time to actual video time
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

  // Calculate current virtual time
  const currentVirtualTime = useMemo(() => {
    if (!project || project.clips.length === 0) return 0;
    return actualToVirtual(currentTime);
  }, [currentTime, actualToVirtual, project]);

  // Fetch project data
  useEffect(() => {
    async function fetchProject() {
      try {
        setLoading(true);
        const res = await fetch(`/api/share/${shareId}`);
        
        if (!res.ok) {
          if (res.status === 404) throw new Error('Project not found');
          throw new Error('Failed to load project');
        }
        
        const json = await res.json();
        setProject(json.data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (shareId) {
      fetchProject();
    }
  }, [shareId]);

  // Determine current active clip
  const currentClipIndex = project?.clips.findIndex(
    (clip) => currentTime >= clip.startTime && currentTime <= clip.endTime
  ) ?? -1;

  // Virtual playback: auto-jump between clips
  useEffect(() => {
    if (!project || !isVirtualPlaying || project.clips.length === 0) return;

    const clips = project.clips;
    const lastClip = clips[clips.length - 1];
    
    // Check if we've reached the end of the last clip
    if (currentTime >= lastClip.endTime - 0.1) {
      // Stop playback and keep position at end
      setIsVirtualPlaying(false);
      setPlaybackFinished(true);
      playerRef.current?.pause();
      return;
    }
    
    // Find which clip we're in
    let foundClipIndex = -1;
    for (let i = 0; i < clips.length; i++) {
      if (currentTime >= clips[i].startTime && currentTime < clips[i].endTime) {
        foundClipIndex = i;
        break;
      }
    }

    // If we're past a clip's end but not the last one, jump to next clip
    if (foundClipIndex === -1) {
      for (let i = 0; i < clips.length - 1; i++) {
        if (currentTime >= clips[i].endTime && currentTime < clips[i + 1].startTime) {
          if (Math.abs(currentTime - lastSeekTimeRef.current) > 0.5) {
            lastSeekTimeRef.current = clips[i + 1].startTime;
            playerRef.current?.seekTo(clips[i + 1].startTime);
          }
          break;
        }
      }
    }

    // If we're before the first clip, jump to first clip
    if (foundClipIndex === -1 && currentTime < clips[0].startTime) {
      if (Math.abs(currentTime - lastSeekTimeRef.current) > 0.5) {
        lastSeekTimeRef.current = clips[0].startTime;
        playerRef.current?.seekTo(clips[0].startTime);
      }
    }
  }, [currentTime, isVirtualPlaying, project]);

  // Reset playbackFinished when user starts playing again
  useEffect(() => {
    if (isVirtualPlaying && playbackFinished) {
      setPlaybackFinished(false);
    }
  }, [isVirtualPlaying, playbackFinished]);

  // Handle video progress
  const handleProgress = useCallback(({ playedSeconds }: { played: number; playedSeconds: number }) => {
    setCurrentTime(playedSeconds);
  }, []);

  // Handle video duration
  const handleDuration = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  // Seek on virtual timeline
  const handleVirtualSeek = (value: number[]) => {
    const virtualTime = value[0];
    const { actualTime } = virtualToActual(virtualTime);
    lastSeekTimeRef.current = actualTime;
    playerRef.current?.seekTo(actualTime);
  };

  // Jump to specific clip
  const handleClipClick = (startTime: number) => {
    lastSeekTimeRef.current = startTime;
    playerRef.current?.seekTo(startTime);
    setIsVirtualPlaying(true);
    playerRef.current?.play();
  };

  // Toggle virtual playback
  const toggleVirtualPlay = () => {
    if (isVirtualPlaying) {
      setIsVirtualPlaying(false);
      playerRef.current?.pause();
    } else {
      // If not in any clip, jump to first clip
      if (project && project.clips.length > 0) {
        const inClip = project.clips.some(
          (clip) => currentTime >= clip.startTime && currentTime < clip.endTime
        );
        if (!inClip) {
          lastSeekTimeRef.current = project.clips[0].startTime;
          playerRef.current?.seekTo(project.clips[0].startTime);
        }
      }
      setIsVirtualPlaying(true);
      playerRef.current?.play();
    }
  };

  // Skip to next clip
  const handleNextClip = () => {
    if (!project || project.clips.length === 0) return;
    const nextIndex = currentClipIndex + 1;
    if (nextIndex < project.clips.length) {
      handleClipClick(project.clips[nextIndex].startTime);
    }
  };

  // Skip to previous clip
  const handlePrevClip = () => {
    if (!project || project.clips.length === 0) return;
    const currentClip = project.clips[currentClipIndex];
    if (currentClip && currentTime - currentClip.startTime > 2) {
      handleClipClick(currentClip.startTime);
    } else {
      const prevIndex = Math.max(0, currentClipIndex - 1);
      handleClipClick(project.clips[prevIndex].startTime);
    }
  };

  // Volume controls
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    playerRef.current?.setVolume(newVolume);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      playerRef.current?.unmute();
      playerRef.current?.setVolume(volume > 0 ? volume : 100);
      setIsMuted(false);
      if (volume === 0) setVolume(100);
    } else {
      playerRef.current?.mute();
      setIsMuted(true);
    }
  };

  // Fullscreen controls
  const handleToggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white/70 p-4 text-center">
        <AlertCircle className="w-10 h-10 mb-4 text-red-500/80" />
        <p className="text-sm font-medium">{error || 'Project not found'}</p>
      </div>
    );
  }

  const parsedClips: ParsedClip[] = project.clips.map((clip, idx) => ({
    id: `clip-${idx}`,
    startTime: clip.startTime,
    endTime: clip.endTime,
    text: clip.text,
    duration: clip.endTime - clip.startTime
  }));

  return (
    <div ref={containerRef} className="h-screen w-full bg-black text-white flex flex-col overflow-hidden font-sans select-none group/container">
        {/* Main Video Area - Takes available space */}
        <div className="flex-1 relative min-h-0 w-full bg-black">
        <VideoPlayer
          ref={playerRef}
          url={project.videoUrl}
          clips={parsedClips}
          onProgress={handleProgress}
          onDuration={handleDuration}
          className="w-full h-full"
          disableDirectPlay
          onVideoClick={toggleVirtualPlay}
        />
        
        {/* Play/Pause Overlay - Visual indicator only, clicks handled by VideoPlayer */}
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 pointer-events-none",
            isVirtualPlaying ? "opacity-0" : "opacity-100"
          )}
        >
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-xl">
            <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Control Bar - Fixed height */}
      <div className="shrink-0 bg-neutral-900 border-t border-white/10 p-3 sm:p-4 space-y-3 z-10 relative">
        {/* Timeline Row */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Volume Control - Left side (hidden on very small screens) */}
          <div className="hidden xs:flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              onClick={handleToggleMute}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-14 sm:w-16"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full shrink-0"
            onClick={handlePrevClip}
            disabled={!project.clips.length}
          >
            <SkipBack className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 text-white/90 hover:text-white hover:bg-white/10 rounded-full shrink-0"
            onClick={toggleVirtualPlay}
          >
            {isVirtualPlaying ? (
              <Pause className="h-4 w-4" fill="currentColor" />
            ) : (
              <Play className="h-4 w-4" fill="currentColor" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full shrink-0"
            onClick={handleNextClip}
            disabled={!project.clips.length || currentClipIndex >= project.clips.length - 1}
          >
            <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>

          <div className="flex-1 flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-mono text-white/50 w-8 sm:w-9 text-right shrink-0">
              {formatSecondsToTime(currentVirtualTime)}
            </span>
            
            <div className="relative flex-1 group/slider py-1 cursor-pointer">
              {/* Clip segments visualization */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full overflow-hidden pointer-events-none bg-white/10">
                {clipRanges.map((range, i) => {
                  const left = totalVirtualDuration > 0 ? (range.virtualStart / totalVirtualDuration) * 100 : 0;
                  const width = totalVirtualDuration > 0 ? (range.duration / totalVirtualDuration) * 100 : 0;
                  const isActive = i === currentClipIndex;
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        "absolute top-0 h-full transition-colors",
                        isActive ? "bg-white" : "bg-white/40"
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  );
                })}
              </div>
              
              <Slider
                value={[currentVirtualTime]}
                min={0}
                max={totalVirtualDuration || 1}
                step={0.1}
                onValueChange={handleVirtualSeek}
                className="cursor-pointer relative z-10"
              />
            </div>
            
            <span className="text-[10px] sm:text-xs font-mono text-white/50 w-8 sm:w-9 text-left shrink-0">
              {formatSecondsToTime(totalVirtualDuration)}
            </span>
          </div>

          {/* Fullscreen Control - Right side */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full shrink-0"
            onClick={handleToggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <Maximize className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </Button>
        </div>

        {/* Clips Row */}
        <div className="flex items-center gap-4">
          <div 
            className="flex-1 overflow-x-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)'
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="flex gap-2 pb-1">
              {project.clips.map((clip, i) => (
                <button
                  key={i}
                  onClick={() => handleClipClick(clip.startTime)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border text-left max-w-[150px] sm:max-w-[200px] truncate",
                    currentClipIndex === i
                      ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <span className="mr-1.5 text-[10px] opacity-50 font-mono">
                    {formatSecondsToTime(clip.startTime)}
                  </span>
                  {clip.text}
                </button>
              ))}
            </div>
          </div>

          {/* Branding */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors shrink-0 font-medium tracking-tight"
          >
            <span>Powered by</span>
            <span className="flex items-center gap-1 text-white/50">
              <Paperclip className="w-3 h-3" />
              ClipNote
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
