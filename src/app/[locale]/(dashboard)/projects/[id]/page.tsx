'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoPlayer, VideoPlayerRef } from '@/components/video/video-player';
import { NotesEditor, NotesEditorRef } from '@/components/editor/notes-editor';
import { ClipList } from '@/components/editor/clip-list';
import { ClipTimeline } from '@/components/editor/clip-timeline';
import { ExportDialog } from '@/components/editor/export-dialog';
import { ShareDialog } from '@/components/editor/share-dialog';
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
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('editor');
  const tCommon = useTranslations('common');
  const tPoints = useTranslations('points');

  const playerRef = useRef<VideoPlayerRef>(null);
  const notesEditorRef = useRef<NotesEditorRef>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [clips, setClips] = useState<ParsedClip[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [headerWidth, setHeaderWidth] = useState(0);

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
        toast.error(t('projectNotFound'));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProject();
  }, [projectId, t]);

  // Observe header width to determine button layout
  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) return;

    // Debounce resize updates to avoid excessive re-renders
    let timeoutId: NodeJS.Timeout;
    
    const resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        for (const entry of entries) {
          const width = Math.floor(entry.contentRect.width);
          setHeaderWidth(prevWidth => {
            // Only update if width changed significantly (avoid sub-pixel updates)
            if (Math.abs(prevWidth - width) > 1) {
              return width;
            }
            return prevWidth;
          });
        }
      }, 16); // ~60fps throttle
    });

    resizeObserver.observe(headerElement);
    
    // Initial measurement
    const initialWidth = Math.floor(headerElement.getBoundingClientRect().width);
    setHeaderWidth(initialWidth);
    
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [isLoading, project]);

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
      toast.error(tCommon('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [params.id, tCommon]);

  // Open export dialog
  const handleExport = useCallback(() => {
    if (clips.length === 0 || !project) return;
    setIsExportDialogOpen(true);
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

      toast.success(t('projectDeleted') || 'Project deleted');
      router.push('/dashboard');
    } catch (error) {
      console.error('[EditorPage] Delete failed:', error);
      toast.error(t('deleteFailed') || 'Failed to delete project');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">{t('loadingProject')}</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">{t('projectNotFound')}</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">{t('backToDashboard')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Determine layout mode based on actual header width
  // Thresholds calculated from actual minimum widths:
  // - Full layout (with text): ~770px minimum
  // - Compact layout (icons only): ~707px minimum
  // - Very compact: < 550px
  const isVeryCompact = headerWidth > 0 && headerWidth < 550;
  const isCompact = headerWidth > 0 && headerWidth < 650;
  const isNarrow = headerWidth > 0 && headerWidth < 720;

  return (
    <div className="min-h-screen lg:h-screen flex flex-col -mx-4 md:-mx-8 -mt-6">
      {/* Header */}
      <header ref={headerRef} className="border-b px-2 sm:px-4 py-2 sm:py-3 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm sm:text-base truncate">{project.title}</h1>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {project.platform}
                </Badge>
                {!isCompact && <span>{tCommon('clips', { count: clips.length })}</span>}
              </div>
            </div>
          </div>

          {/* Right: Action buttons - dynamically responsive based on header width */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Play button */}
            <Button 
              variant="outline" 
              size={isNarrow ? "icon" : "sm"}
              onClick={() => playAllClips()}
              className="h-8"
            >
              <Play className="h-4 w-4" />
              {!isNarrow && <span className="ml-2">{t('playClips')}</span>}
            </Button>

            {/* Export button */}
            <Button 
              variant="outline" 
              size={isNarrow ? "icon" : "sm"}
              onClick={handleExport} 
              disabled={clips.length === 0}
              className="h-8"
            >
              <Download className="h-4 w-4" />
              {!isNarrow && <span className="ml-2">{t('export')}</span>}
            </Button>

            {/* Share button */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsShareDialogOpen(true)}
              className="h-8 w-8"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            {/* Settings button - hide when narrow */}
            {!isNarrow && (
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            
            {/* Delete button - always visible */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deleteProject')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('deleteWarning', { title: project.title })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>{tCommon('cancel')}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? tCommon('deleting') : tCommon('delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 lg:grid lg:grid-cols-2 gap-4 p-4 lg:overflow-hidden min-h-0">
        {/* Left column: Video Player, Timeline, Clip List */}
        <div className="flex flex-col gap-4 lg:h-full lg:overflow-hidden">
          <VideoPlayer
            ref={playerRef}
            url={project.videoUrl}
            clips={clips}
            onDuration={setDuration}
            onProgress={handleProgress}
            className="shrink-0"
          />

          {/* Clip Timeline - Virtual playback controls */}
          <ClipTimeline
            clips={clips}
            playerRef={playerRef}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
            className="shrink-0"
          />

          {/* Clip List - Min height guaranteed, grows with content, scrolls when exceeds container */}
          <ClipList
            clips={clips}
            currentClipIndex={currentClipIndex}
            onClipClick={handleClipClick}
            onPlayAll={playAllClips}
            className="min-h-[250px] max-h-[400px] lg:max-h-none lg:flex-1 overflow-hidden"
          />
        </div>

        {/* Right column: Notes Editor & Analysis */}
        <div className="flex flex-col gap-4 min-h-[400px] lg:min-h-0 lg:h-full lg:overflow-hidden pt-4 lg:pt-0">
          <Tabs defaultValue="notes" className="flex-1 flex flex-col lg:overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="notes">{t('notes')}</TabsTrigger>
              <TabsTrigger value="analysis">{t('aiAnalysis')}</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="flex-1 mt-4 data-[state=active]:flex data-[state=active]:flex-col lg:overflow-hidden min-h-0">
              <NotesEditor
                ref={notesEditorRef}
                initialNotes={notes}
                onNotesChange={setNotes}
                onClipsChange={setClips}
                onSave={handleSave}
                onClipClick={handleClipClick}
                currentClipIndex={currentClipIndex}
                currentTime={currentTime}
                videoDuration={duration}
                onInsertTimestamp={handleInsertTimestamp}
                className="flex-1 min-h-[400px] lg:min-h-0"
              />
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 mt-4 data-[state=active]:flex data-[state=active]:flex-col lg:overflow-hidden">
              <Card className="h-full min-h-[400px]">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('aiAnalysis')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t('aiDescription')}
                    </p>
                    <Button>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('startAnalysis', { points: 10 })}
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
          <span className="text-sm font-medium">{t('clipPlaying')}</span>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 px-2 text-xs"
            onClick={() => setVirtualMode(false)}
          >
            {t('stop')}
          </Button>
        </div>
      )}

      {/* Export Dialog */}
      {project && (
        <ExportDialog 
          open={isExportDialogOpen} 
          onOpenChange={setIsExportDialogOpen}
          clips={clips}
          videoUrl={project.videoUrl}
          projectTitle={project.title}
        />
      )}

      {/* Share Dialog */}
      {project && (
        <ShareDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          projectId={projectId}
          projectTitle={project.title}
          clipCount={clips.length}
        />
      )}
    </div>
  );
}
