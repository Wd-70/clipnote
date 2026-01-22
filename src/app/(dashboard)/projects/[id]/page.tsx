'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoPlayer, VideoPlayerRef } from '@/components/video/video-player';
import { NotesEditor, NotesEditorRef } from '@/components/editor/notes-editor';
import { ClipList } from '@/components/editor/clip-list';
import { ClipTimeline } from '@/components/editor/clip-timeline';
import { useVideoSync } from '@/hooks/useVideoSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Play,
  Sparkles,
  Download,
  Share2,
  Settings,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import type { ParsedClip } from '@/types';
import { generateFFmpegCommand } from '@/lib/utils/timestamp';
import { toast } from 'sonner';

interface Project {
  _id: string;
  title: string;
  videoUrl: string;
  platform: 'YOUTUBE' | 'CHZZK';
  videoId: string;
  notes: string;
  createdAt: string;
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const playerRef = useRef<VideoPlayerRef>(null);
  const notesEditorRef = useRef<NotesEditorRef>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [clips, setClips] = useState<ParsedClip[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch project data from API
  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch project');
        }
        const data = await response.json();
        const projectData = data.data;
        
        setProject(projectData);
        
        // Handle notes field: convert array to empty string, or use string as-is
        const notesValue = Array.isArray(projectData.notes) 
          ? '' 
          : (projectData.notes || '');
        setNotes(notesValue);
      } catch (error) {
        console.error('Failed to load project:', error);
        alert('프로젝트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProject();
  }, [projectId]);

  // Video sync hook for virtual editing
  const {
    currentClipIndex,
    isVirtualMode,
    setVirtualMode,
    handleProgress: handleSyncProgress,
    jumpToClip,
    playAllClips,
  } = useVideoSync(playerRef, {
    clips,
    onClipChange: (index) => {
      console.log('Clip changed to:', index);
    },
  });

  // Handle video progress - track current time
  const handleProgress = useCallback(
    (state: { played: number; playedSeconds: number }) => {
      setCurrentTime(state.playedSeconds);
      handleSyncProgress(state);
    },
    [handleSyncProgress]
  );

  // Handle clip click - jump to that position
  const handleClipClick = useCallback(
    (clip: ParsedClip, index: number) => {
      jumpToClip(index);
    },
    [jumpToClip]
  );

  // Insert timestamp at cursor position in notes editor
  const handleInsertTimestamp = useCallback(() => {
    const time = playerRef.current?.getCurrentTime() ?? currentTime;
    notesEditorRef.current?.insertTimestampAtCursor(time);
  }, [currentTime]);

  // Handle save
  const handleSave = useCallback(async (notesText: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesText }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notes');
      }

      setNotes(notesText);
      console.log('Notes saved');
    } catch (error) {
      console.error('Failed to save notes:', error);
      alert('노트 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [params.id]);

  // Generate FFmpeg command
  const handleExport = useCallback(() => {
    if (clips.length === 0 || !project) return;

    const command = generateFFmpegCommand(project.videoUrl, clips);
    navigator.clipboard.writeText(command);
    
    const isYouTube = project.videoUrl.includes('youtube.com') || project.videoUrl.includes('youtu.be');
    if (isYouTube) {
      toast.success('스크립트가 클립보드에 복사되었습니다!', {
        description: 'yt-dlp와 FFmpeg 명령어가 포함된 배치 스크립트입니다. PowerShell에 붙여넣어 실행하세요.',
        duration: 8000,
      });
    } else {
      toast.success('FFmpeg 명령어가 클립보드에 복사되었습니다!');
    }
  }, [clips, project]);

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      console.log('[EditorPage] Deleting project:', projectId);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      console.log('[EditorPage] Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[EditorPage] Delete failed with error:', errorData);
        throw new Error(errorData.error || 'Failed to delete project');
      }

      const data = await response.json();
      console.log('[EditorPage] Delete success:', data);

      toast.success('프로젝트가 삭제되었습니다');
      router.push('/dashboard');
    } catch (error) {
      console.error('[EditorPage] Delete failed:', error);
      toast.error('프로젝트 삭제에 실패했습니다');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">프로젝트를 찾을 수 없습니다.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">대시보드로 돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between bg-background/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">{project.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {project.platform}
              </Badge>
              <span>{clips.length} 클립</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => playAllClips()}>
            <Play className="h-4 w-4 mr-2" />
            가상 재생
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
          <Button variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>프로젝트를 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. &quot;{project.title}&quot; 프로젝트와 모든 클립 정보가 영구적으로 삭제됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* Left: Video Player */}
        <div className="flex flex-col gap-4">
          <VideoPlayer
            ref={playerRef}
            url={project.videoUrl}
            clips={clips}
            onDuration={setDuration}
            onProgress={handleProgress}
          />

          {/* Clip Timeline - Virtual playback controls */}
          <ClipTimeline
            clips={clips}
            playerRef={playerRef}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
          />

          {/* Clip List */}
          <ClipList
            clips={clips}
            currentClipIndex={currentClipIndex}
            onClipClick={handleClipClick}
            onPlayAll={playAllClips}
            className="flex-1 overflow-hidden"
          />
        </div>

        {/* Right: Notes Editor & Analysis */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <Tabs defaultValue="notes" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notes">노트</TabsTrigger>
              <TabsTrigger value="analysis">AI 분석</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="flex-1 overflow-hidden mt-4">
              <NotesEditor
                ref={notesEditorRef}
                initialNotes={notes}
                onNotesChange={setNotes}
                onClipsChange={setClips}
                onSave={handleSave}
                onClipClick={handleClipClick}
                currentClipIndex={currentClipIndex}
                currentTime={currentTime}
                onInsertTimestamp={handleInsertTimestamp}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 overflow-hidden mt-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">
                      AI가 영상을 분석하여 하이라이트를 자동으로 찾아드립니다
                    </p>
                    <Button>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI 분석 시작 (10 포인트)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Virtual mode indicator */}
      {isVirtualMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Play className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium">가상 편집 모드</span>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 px-2 text-xs"
            onClick={() => setVirtualMode(false)}
          >
            종료
          </Button>
        </div>
      )}
    </div>
  );
}
