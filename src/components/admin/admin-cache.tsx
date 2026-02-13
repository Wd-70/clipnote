'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Trash2, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminCacheDetailDialog } from './admin-cache-detail-dialog';

interface CacheEntry {
  _id: string;
  videoId: string;
  platform: string;
  duration: number;
  highlightCount: number;
  summary: string;
  cachedAt: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AdminCache() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [caches, setCaches] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [detailCache, setDetailCache] = useState<CacheEntry | null>(null);

  const fetchCaches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cache');
      const data = await res.json();
      if (data.data) {
        setCaches(data.data.caches);
      }
    } catch {
      toast.error(t('cache.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaches();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cache/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('cache.deleted'));
      fetchCaches();
    } catch {
      toast.error(t('cache.deleteFailed'));
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/admin/cache', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('cache.cleared'));
      setClearAllOpen(false);
      fetchCaches();
    } catch {
      toast.error(t('cache.deleteFailed'));
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header with clear all button */}
      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setClearAllOpen(true)}
          disabled={caches.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('cache.clearAll')}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : caches.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('cache.noCache')}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('cache.videoId')}</TableHead>
                <TableHead>{t('cache.platform')}</TableHead>
                <TableHead>{t('cache.duration')}</TableHead>
                <TableHead className="text-right">{t('cache.highlights')}</TableHead>
                <TableHead>{t('cache.cachedAt')}</TableHead>
                <TableHead className="w-[100px]">{t('cache.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caches.map((cache) => (
                <TableRow key={cache._id}>
                  <TableCell className="font-mono text-sm max-w-[200px] truncate">
                    {cache.videoId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{cache.platform}</Badge>
                  </TableCell>
                  <TableCell>{formatDuration(cache.duration)}</TableCell>
                  <TableCell className="text-right">{cache.highlightCount}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(cache.cachedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailCache(cache)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(cache._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Clear all confirmation */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('cache.clearAllConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('cache.clearAllWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setClearAllOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearing}
            >
              {clearing ? tCommon('deleting') : t('cache.clearAll')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail dialog */}
      <AdminCacheDetailDialog
        cache={detailCache}
        open={!!detailCache}
        onOpenChange={(open) => !open && setDetailCache(null)}
      />
    </div>
  );
}
