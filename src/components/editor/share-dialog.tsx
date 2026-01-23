'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Copy,
  Check,
  Share2,
  Link2,
  Code2,
  Eye,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  clipCount: number;
}

interface ShareData {
  shareId: string;
  viewCount: number;
  createdAt: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  clipCount,
}: ShareDialogProps) {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Generate URLs
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = shareData ? `${baseUrl}/share/${shareData.shareId}` : '';
  const embedUrl = shareData ? `${baseUrl}/embed/${shareData.shareId}` : '';
  const embedCode = shareData
    ? `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" allow="autoplay; fullscreen"></iframe>`
    : '';

  // Fetch existing share data
  const fetchShareData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/share`);
      if (response.ok) {
        const data = await response.json();
        setShareData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch share data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Create share link
  const createShare = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || '공유 링크 생성에 실패했습니다.');
        return;
      }

      setShareData(data.data);
      toast.success('공유 링크가 생성되었습니다!');
    } catch (error) {
      console.error('Failed to create share:', error);
      toast.error('공유 링크 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete share link
  const deleteShare = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        toast.error('공유 링크 삭제에 실패했습니다.');
        return;
      }

      setShareData(null);
      toast.success('공유 링크가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete share:', error);
      toast.error('공유 링크 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      toast.success('클립보드에 복사되었습니다!');
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      toast.error('클립보드 복사에 실패했습니다.');
    }
  };

  // Reset and fetch on open
  useEffect(() => {
    if (open) {
      setCopiedStates({});
      fetchShareData();
    }
  }, [open, fetchShareData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">클립 공유하기</DialogTitle>
                <DialogDescription className="mt-1">
                  {projectTitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Stats */}
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary" className="gap-1.5">
              {clipCount}개 클립
            </Badge>
            {shareData && (
              <Badge variant="outline" className="gap-1.5">
                <Eye className="h-3 w-3" />
                {shareData.viewCount}회 조회
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : shareData ? (
            <>
              {/* Share Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  공유 링크
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
                    {shareUrl}
                  </div>
                  <Button
                    variant={copiedStates['url'] ? 'default' : 'secondary'}
                    size="icon"
                    onClick={() => handleCopy('url', shareUrl)}
                    className={cn(
                      'shrink-0 transition-all',
                      copiedStates['url'] && 'bg-green-500 hover:bg-green-600'
                    )}
                  >
                    {copiedStates['url'] ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                    className="shrink-0"
                  >
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Embed Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" />
                  임베드 코드
                </label>
                <div className="relative">
                  <div className="bg-zinc-950 dark:bg-zinc-900 rounded-lg p-3 text-xs font-mono text-zinc-300 overflow-x-auto">
                    <code className="whitespace-pre-wrap break-all">
                      {embedCode}
                    </code>
                  </div>
                  <Button
                    variant={copiedStates['embed'] ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => handleCopy('embed', embedCode)}
                    className={cn(
                      'absolute top-2 right-2 transition-all',
                      copiedStates['embed'] && 'bg-green-500 hover:bg-green-600'
                    )}
                  >
                    {copiedStates['embed'] ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        복사
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  다른 웹사이트나 블로그에 위 코드를 붙여넣으세요.
                </p>
              </div>

              <Separator />

              {/* Delete Share */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  공유 링크를 삭제하면 더 이상 접근할 수 없습니다.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteShare}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  삭제
                </Button>
              </div>
            </>
          ) : (
            /* Create Share */
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                <Share2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">클립 공유 시작하기</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                공유 링크를 생성하면 누구나 이 프로젝트의 클립을 볼 수 있습니다.
                다른 사이트에 임베드할 수도 있어요!
              </p>
              <Button
                onClick={createShare}
                disabled={isCreating || clipCount === 0}
                className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                공유 링크 생성
              </Button>
              {clipCount === 0 && (
                <p className="text-xs text-destructive mt-3">
                  클립이 없습니다. 먼저 노트에 타임스탬프를 추가하세요.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
