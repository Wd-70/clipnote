'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { VideoPlayer, type VideoPlayerRef } from '@/components/video/video-player';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { formatSecondsToTime } from '@/lib/utils/timestamp';
import { cn } from '@/lib/utils';
import { Play, Pause, Paperclip, Loader2, AlertCircle } from 'lucide-react';
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

  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seeking, setSeeking] = useState(false);

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

  // Handle video progress
  const handleProgress = useCallback(({ playedSeconds }: { played: number; playedSeconds: number }) => {
    if (!seeking) {
      setCurrentTime(playedSeconds);
    }
  }, [seeking]);

  // Handle video duration
  const handleDuration = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  // Seek handler
  const handleSeekChange = (value: number[]) => {
    setSeeking(true);
    setCurrentTime(value[0]);
  };

  const handleSeekCommit = (value: number[]) => {
    setSeeking(false);
    playerRef.current?.seekTo(value[0]);
  };

  const handleClipClick = (startTime: number) => {
    playerRef.current?.seekTo(startTime);
    playerRef.current?.play();
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isPlaying) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Determine current active clip
  const currentClipIndex = project?.clips.findIndex(
    (clip) => currentTime >= clip.startTime && currentTime <= clip.endTime
  ) ?? -1;

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
    <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden font-sans select-none group/container">
      {/* Main Video Area - Takes available space */}
      <div className="flex-1 relative min-h-0 w-full bg-black">
        <VideoPlayer
          ref={playerRef}
          url={project.videoUrl}
          clips={parsedClips}
          onProgress={handleProgress}
          onDuration={handleDuration}
          className="w-full h-full"
        />
        
        {/* Play/Pause Overlay - Fade out when playing */}
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-opacity duration-300",
            isPlaying ? "opacity-0" : "opacity-100"
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
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/10 rounded-full shrink-0"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" fill="currentColor" />
            ) : (
              <Play className="h-4 w-4" fill="currentColor" />
            )}
          </Button>

          <div className="flex-1 flex items-center gap-3">
            <span className="text-[10px] sm:text-xs font-mono text-white/50 w-9 text-right shrink-0">
              {formatSecondsToTime(currentTime)}
            </span>
            
            <div className="relative flex-1 group/slider py-1 cursor-pointer">
               <Slider
                value={[currentTime]}
                min={0}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeekChange}
                onValueCommit={handleSeekCommit}
                className="cursor-pointer"
              />
            </div>
            
            <span className="text-[10px] sm:text-xs font-mono text-white/50 w-9 text-left shrink-0">
              {formatSecondsToTime(duration)}
            </span>
          </div>
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
