'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { 
  Scissors, 
  Play, 
  Pause,
  Clock, 
  Share2, 
  ChevronRight, 
  ExternalLink,
  Sparkles,
  Quote,
  Layout,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { VideoPlayer, type VideoPlayerRef } from '@/components/video/video-player';
import { formatSecondsToTime } from '@/lib/utils/timestamp';
import { cn } from '@/lib/utils';
import type { ParsedClip } from '@/types';
import { useTranslations } from 'next-intl';

// Interface matching the API response
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
  viewCount: number;
  createdAt?: string;
}

export default function SharePageClient() {
  const params = useParams();
  const shareId = params.shareId as string;
  const playerRef = useRef<VideoPlayerRef>(null);
  const t = useTranslations('sharePage');
  const tCommon = useTranslations('common');
  const tLanding = useTranslations('landing');

  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentClipIndex, setCurrentClipIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVirtualPlaying, setIsVirtualPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastSeekTimeRef = useRef<number>(0);
  const videoContainerRef = useRef<HTMLDivElement>(null);

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
          if (res.status === 404) throw new Error(t('clipNotFound'));
          throw new Error(t('clipNotFoundDesc'));
        }
        
        const json = await res.json();
        setProject(json.data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : t('clipNotFoundDesc'));
      } finally {
        setLoading(false);
      }
    }

    if (shareId) {
      fetchProject();
    }
  }, [shareId, t]);

  // Update current clip index based on video time
  useEffect(() => {
    if (!project || !project.clips.length) return;

    const index = project.clips.findIndex(
      (clip) => currentTime >= clip.startTime && currentTime <= clip.endTime
    );
    setCurrentClipIndex(index);
  }, [currentTime, project]);

  // Track if playback has finished (to keep position at end)
  const [playbackFinished, setPlaybackFinished] = useState(false);

  // Virtual playback: auto-jump between clips
  useEffect(() => {
    if (!project || !isVirtualPlaying || project.clips.length === 0) return;

    const clips = project.clips;
    const lastClip = clips[clips.length - 1];

    // Check if we've reached the end of the last clip
    // Use a slightly larger tolerance and check we're not at the start (avoiding race with restart)
    if (currentTime >= lastClip.endTime - 0.1 && currentTime > clips[0].startTime + 0.5) {
      // Stop playback and keep position at end
      setIsVirtualPlaying(false);
      setPlaybackFinished(true);
      playerRef.current?.pause();
      return;
    }

    // Find which clip we're in or should be in
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
        // We've passed this clip's end, check if we should jump to next
        if (currentTime >= clips[i].endTime && currentTime < clips[i + 1].startTime) {
          // Only jump if we haven't just seeked here
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


  // Handle video progress
  const handleProgress = useCallback(({ playedSeconds }: { played: number; playedSeconds: number }) => {
    setCurrentTime(playedSeconds);
  }, []);

  // Handle video duration
  const handleDuration = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  // Seek to specific clip
  const handleJumpToClip = useCallback((startTime: number) => {
    setPlaybackFinished(false);
    lastSeekTimeRef.current = startTime;
    playerRef.current?.seekTo(startTime);
    // Auto play when jumping to clip with slight delay to avoid race condition
    setTimeout(() => {
      setIsVirtualPlaying(true);
      playerRef.current?.play();
    }, 50);
  }, []);

  // Toggle virtual playback (clips only)
  const handleToggleVirtualPlay = useCallback(() => {
    if (isVirtualPlaying) {
      setIsVirtualPlaying(false);
      playerRef.current?.pause();
    } else {
      if (project && project.clips.length > 0) {
        const lastClip = project.clips[project.clips.length - 1];
        const isAtEnd = currentTime >= lastClip.endTime - 0.5;
        const inClip = project.clips.some(
          (clip) => currentTime >= clip.startTime && currentTime < clip.endTime
        );

        // If playback finished or not in any clip, restart from first clip
        if (playbackFinished || isAtEnd || !inClip) {
          setPlaybackFinished(false);
          lastSeekTimeRef.current = project.clips[0].startTime;
          playerRef.current?.seekTo(project.clips[0].startTime);
          // Delay play to avoid race condition with seek
          setTimeout(() => {
            setIsVirtualPlaying(true);
            playerRef.current?.play();
          }, 50);
          return;
        }
      }
      setIsVirtualPlaying(true);
      playerRef.current?.play();
    }
  }, [isVirtualPlaying, project, currentTime, playbackFinished]);

  // Seek on virtual timeline
  const handleVirtualSeek = (value: number[]) => {
    const virtualTime = value[0];
    const { actualTime } = virtualToActual(virtualTime);
    lastSeekTimeRef.current = actualTime;
    playerRef.current?.seekTo(actualTime);
  };

  // Skip to next clip
  const handleNextClip = () => {
    if (!project || project.clips.length === 0) return;
    const nextIndex = currentClipIndex + 1;
    if (nextIndex < project.clips.length) {
      handleJumpToClip(project.clips[nextIndex].startTime);
    }
  };

  // Skip to previous clip
  const handlePrevClip = () => {
    if (!project || project.clips.length === 0) return;
    // If more than 2 seconds into current clip, restart it; otherwise go to previous
    const currentClip = project.clips[currentClipIndex];
    if (currentClip && currentTime - currentClip.startTime > 2) {
      handleJumpToClip(currentClip.startTime);
    } else {
      const prevIndex = Math.max(0, currentClipIndex - 1);
      handleJumpToClip(project.clips[prevIndex].startTime);
    }
  };

  // Skip forward 5 seconds within virtual timeline
  const handleSkipForward = () => {
    const newVirtualTime = Math.min(currentVirtualTime + 5, totalVirtualDuration);
    const { actualTime } = virtualToActual(newVirtualTime);
    lastSeekTimeRef.current = actualTime;
    playerRef.current?.seekTo(actualTime);
  };

  // Skip backward 5 seconds within virtual timeline
  const handleSkipBackward = () => {
    const newVirtualTime = Math.max(currentVirtualTime - 5, 0);
    const { actualTime } = virtualToActual(newVirtualTime);
    lastSeekTimeRef.current = actualTime;
    playerRef.current?.seekTo(actualTime);
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
      videoContainerRef.current?.requestFullscreen();
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6 text-destructive">
          <Scissors className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('clipNotFound')}</h1>
        <p className="text-muted-foreground mb-8">{error || t('clipNotFoundDesc')}</p>
        <Button asChild>
          <Link href="/">{tCommon('home')}</Link>
        </Button>
      </div>
    );
  }

  // Convert clips to ParsedClip format for VideoPlayer
  const parsedClips: ParsedClip[] = project.clips.map((clip, idx) => ({
    id: `clip-${idx}`,
    startTime: clip.startTime,
    endTime: clip.endTime,
    text: clip.text,
    duration: clip.endTime - clip.startTime
  }));

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-[100%] blur-[100px] opacity-50 dark:opacity-30" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/5 rounded-[100%] blur-[100px] opacity-30 dark:opacity-20" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter hover:opacity-80 transition-opacity">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Scissors size={18} />
            </div>
            ClipNote
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button size="sm" className="hidden sm:flex rounded-full px-4 has-[>svg]:px-4" asChild>
              <Link href="/">
                {tLanding('getStartedFree')} <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4 md:px-6">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="container mx-auto max-w-5xl space-y-8"
        >
          {/* Project Header */}
          <motion.div variants={item} className="space-y-4 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <Badge variant="secondary" className="mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                  <Play className="w-3 h-3 mr-1.5 fill-current" />
                  {t('title')}
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  {project.title}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  <span className="flex items-center gap-1.5">
                    <Layout className="w-4 h-4" />
                    {project.platform === 'YOUTUBE' ? 'YouTube' : 'Chzzk'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Quote className="w-4 h-4" />
                    {t('clips', { count: project.clips.length })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-4 h-4" />
                    {project.viewCount.toLocaleString()} views
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 justify-center md:justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full min-w-[100px]" 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      {tCommon('copied')}
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <a href={project.videoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Original
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Video Player Section */}
          <motion.div variants={item} className="space-y-4">
            <div 
              ref={videoContainerRef}
              className={cn(
                "rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/50 bg-black",
                isFullscreen && "rounded-none border-0 shadow-none"
              )}
            >
              <VideoPlayer
                ref={playerRef}
                url={project.videoUrl}
                clips={parsedClips}
                onProgress={handleProgress}
                onDuration={handleDuration}
                className={cn("aspect-video w-full", isFullscreen && "h-[calc(100vh-120px)]")}
                disableDirectPlay
                hideControls
                onVideoClick={handleToggleVirtualPlay}
              />
              
              {/* Virtual Timeline Controls - Always dark theme for video player UI */}
              <div className={cn(
                "bg-neutral-900 p-4 space-y-4 text-white",
                isFullscreen ? "absolute bottom-0 left-0 right-0" : "rounded-b-2xl"
              )}>
              {/* Playback Controls */}
              <div className="flex items-center justify-between gap-2">
                {/* Volume Controls - Left side */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/10"
                    onClick={handleToggleMute}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>

                {/* Center Playback Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/10"
                    onClick={handlePrevClip}
                    disabled={!project.clips.length}
                    title={t('prev')}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/10"
                    onClick={handleSkipBackward}
                  >
                    <Rewind className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg bg-white text-black hover:bg-white/90"
                    onClick={handleToggleVirtualPlay}
                  >
                    {isVirtualPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/10"
                    onClick={handleSkipForward}
                  >
                    <FastForward className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/10"
                    onClick={handleNextClip}
                    disabled={!project.clips.length || currentClipIndex >= project.clips.length - 1}
                    title={t('next')}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                {/* Fullscreen Control - Right side */}
                <div className="flex items-center min-w-[120px] justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/10"
                    onClick={handleToggleFullscreen}
                    title={t('fullscreen')}
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Virtual Timeline Slider */}
              <div className="space-y-2">
                <div className="relative">
                  {/* Clip segments visualization */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full overflow-hidden pointer-events-none bg-white/10">
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
                    className="relative z-10"
                  />
                </div>
                
                {/* Time Display */}
                <div className="flex justify-between text-xs font-mono text-white/60">
                  <span>{formatSecondsToTime(currentVirtualTime)}</span>
                  <span className="text-white font-medium">
                    Clip {currentClipIndex >= 0 ? currentClipIndex + 1 : '-'} / {project.clips.length}
                  </span>
                  <span>{formatSecondsToTime(totalVirtualDuration)}</span>
                </div>
              </div>
              </div>
            </div>
          </motion.div>

          {/* Inline CTA Banner */}
          <motion.div variants={item}>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-primary text-primary-foreground p-1.5 rounded-md shrink-0">
                  <Scissors size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t('createOwnClip')}</p>
                  <p className="text-xs text-muted-foreground truncate">{t('createOwnClipHint')}</p>
                </div>
              </div>
              <Button size="sm" className="rounded-full shrink-0 px-4 has-[>svg]:px-4" asChild>
                <Link href="/">
                  {tLanding('getStartedFree')} <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Clips Grid */}
          <motion.div variants={item}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Highlights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.clips.map((clip, i) => (
                <Card 
                  key={i}
                  className={cn(
                    "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm",
                    currentClipIndex === i ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "hover:border-primary/50"
                  )}
                  onClick={() => handleJumpToClip(clip.startTime)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <Badge variant={currentClipIndex === i ? "default" : "secondary"} className="font-mono text-xs">
                        {formatSecondsToTime(clip.startTime)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatSecondsToTime(clip.endTime - clip.startTime)}
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm leading-relaxed line-clamp-2",
                      currentClipIndex === i ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {clip.text}
                    </p>
                    
                    {currentClipIndex === i && (
                      <div className="absolute right-4 bottom-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* CTA Banner */}
          <motion.div variants={item} className="pt-8">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-500/10 via-primary/10 to-blue-500/10 border border-primary/10 p-8 md:p-12 text-center">
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
              <div className="relative z-10 space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {tLanding('ctaTitle')}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {tLanding('ctaDesc')}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Button size="lg" className="rounded-full px-8 h-12 text-lg shadow-lg shadow-primary/25" asChild>
                    <Link href="/">
                      {tLanding('ctaButton')}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        <Link href="/" className="inline-flex items-center gap-1.5 font-medium text-foreground/60 hover:text-foreground transition-colors mb-2">
          <div className="bg-primary text-primary-foreground p-1 rounded">
            <Scissors size={12} />
          </div>
          {t('poweredBy')}
        </Link>
        <p>{tLanding('copyright')}</p>
      </footer>
    </div>
  );
}
