'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scissors, 
  Play, 
  Clock, 
  Share2, 
  ChevronRight, 
  ExternalLink,
  Sparkles,
  Quote,
  Layout,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { VideoPlayer, type VideoPlayerRef } from '@/components/video/video-player';
import { formatSecondsToTime } from '@/lib/utils/timestamp';
import { cn } from '@/lib/utils';
import type { ParsedClip } from '@/types';

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

  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentClipIndex, setCurrentClipIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch project data
  useEffect(() => {
    async function fetchProject() {
      try {
        setLoading(true);
        // In a real scenario, this would be an actual API call
        // const res = await fetch(`/api/share/${shareId}`);
        // if (!res.ok) throw new Error('Project not found');
        // const data = await res.json();
        
        // Mock data for development/demonstration if API is not ready
        // But the prompt says "Fetch data from /api/share/[shareId]"
        // So I will implement the real fetch
        const res = await fetch(`/api/share/${shareId}`);
        
        if (!res.ok) {
          if (res.status === 404) throw new Error('프로젝트를 찾을 수 없습니다.');
          throw new Error('데이터를 불러오는 중 오류가 발생했습니다.');
        }
        
        const json = await res.json();
        setProject(json.data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    }

    if (shareId) {
      fetchProject();
    }
  }, [shareId]);

  // Update current clip index based on video time
  useEffect(() => {
    if (!project || !project.clips.length) return;

    const index = project.clips.findIndex(
      (clip) => currentTime >= clip.startTime && currentTime <= clip.endTime
    );
    setCurrentClipIndex(index);
  }, [currentTime, project]);

  // Handle video progress
  const handleProgress = useCallback(({ playedSeconds }: { played: number; playedSeconds: number }) => {
    setCurrentTime(playedSeconds);
  }, []);

  // Handle video duration
  const handleDuration = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  // Seek to specific clip
  const handleJumpToClip = (startTime: number) => {
    playerRef.current?.seekTo(startTime);
    // Auto play when jumping to clip
    playerRef.current?.play();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">로딩 중...</p>
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
        <h1 className="text-2xl font-bold mb-2">오류가 발생했습니다</h1>
        <p className="text-muted-foreground mb-8">{error || '프로젝트를 찾을 수 없습니다'}</p>
        <Button asChild>
          <Link href="/">홈으로 돌아가기</Link>
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
            <Button size="sm" className="hidden sm:flex rounded-full" asChild>
              <Link href="/">
                나도 만들기 <ChevronRight className="w-4 h-4 ml-1" />
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
                  Shared Clip
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
                    클립 {project.clips.length}개
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-4 h-4" />
                    조회 {project.viewCount.toLocaleString()}회
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
                      복사됨!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      공유하기
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <a href={project.videoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    원본 영상
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Video Player Section */}
          <motion.div variants={item} className="space-y-4">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/50 bg-black">
              <VideoPlayer
                ref={playerRef}
                url={project.videoUrl}
                clips={parsedClips}
                onProgress={handleProgress}
                onDuration={handleDuration}
                className="aspect-video w-full"
              />
            </div>

            {/* Timeline Visualization */}
            <div className="relative h-12 bg-muted/30 rounded-xl flex items-center px-4 border border-border/50">
               {/* Timeline Track */}
               <div className="absolute left-4 right-4 h-1.5 bg-muted rounded-full overflow-hidden">
                 {/* Current Progress */}
                 <div 
                   className="absolute top-0 left-0 h-full bg-primary/30 z-10 transition-all duration-100 ease-linear"
                   style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                 />
                 
                 {/* Clip Segments */}
                 {project.clips.map((clip, i) => {
                   const left = duration > 0 ? (clip.startTime / duration) * 100 : 0;
                   const width = duration > 0 ? ((clip.endTime - clip.startTime) / duration) * 100 : 0;
                   const isActive = i === currentClipIndex;
                   
                   return (
                     <div
                       key={i}
                       className={cn(
                         "absolute top-0 h-full transition-colors z-20",
                         isActive ? "bg-primary" : "bg-primary/40 hover:bg-primary/60"
                       )}
                       style={{ left: `${left}%`, width: `${width}%` }}
                       title={clip.text}
                     />
                   );
                 })}
               </div>
               
               {/* Time Display */}
               <div className="ml-auto text-xs font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded backdrop-blur-sm relative z-30">
                 {formatSecondsToTime(currentTime)} / {formatSecondsToTime(duration)}
               </div>
            </div>
          </motion.div>

          {/* Clips Grid */}
          <motion.div variants={item}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              하이라이트 클립
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
                  나만의 하이라이트를 만들어보세요
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  복잡한 편집 프로그램 없이, 노트처럼 적기만 하면 영상이 만들어집니다.<br />
                  지금 바로 무료로 시작해보세요.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Button size="lg" className="rounded-full px-8 h-12 text-lg shadow-lg shadow-primary/25" asChild>
                    <Link href="/">
                      ClipNote 무료로 시작하기
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 ClipNote. All rights reserved.</p>
      </footer>
    </div>
  );
}
