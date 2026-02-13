'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CacheEntry {
  _id: string;
  videoId: string;
  platform: string;
}

interface CacheDetail {
  summary: string;
  highlights: Array<{
    start: number;
    end: number;
    reason: string;
    score: number;
  }>;
}

interface AdminCacheDetailDialogProps {
  cache: CacheEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AdminCacheDetailDialog({
  cache,
  open,
  onOpenChange,
}: AdminCacheDetailDialogProps) {
  const t = useTranslations('admin.cache');
  const [detail, setDetail] = useState<CacheDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && cache) {
      setLoading(true);
      setDetail(null);
      fetch(`/api/admin/cache/${cache._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data?.analysisResult) {
            setDetail({
              summary: data.data.analysisResult.summary || '',
              highlights: data.data.analysisResult.highlights || [],
            });
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, cache]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {cache?.platform} - {cache?.videoId}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : detail ? (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium mb-2">{t('summary')}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {detail.summary || '-'}
                </p>
              </div>
              {detail.highlights.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">{t('highlightList')}</h4>
                  <div className="space-y-2">
                    {detail.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2 rounded-md bg-muted/50"
                      >
                        <Badge variant="outline" className="shrink-0">
                          {formatTime(h.start)} - {formatTime(h.end)}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{h.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('score')}: {h.score}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="py-4 text-muted-foreground text-sm">No data</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
