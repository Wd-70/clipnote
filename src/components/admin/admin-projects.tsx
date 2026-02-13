'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Search, Trash2, Share2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminPagination } from './admin-pagination';
import { AdminDeleteProjectDialog } from './admin-delete-project-dialog';

interface AdminProject {
  _id: string;
  title: string;
  videoId: string;
  videoUrl: string;
  platform: string;
  thumbnailUrl: string;
  isShared: boolean;
  shareViewCount: number;
  clipCount: number;
  channelName: string;
  userId: string;
  ownerEmail: string;
  createdAt: string;
}

export function AdminProjects() {
  const t = useTranslations('admin');
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sharedFilter, setSharedFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });
  const [filterOptions, setFilterOptions] = useState<{ owners: string[]; channels: string[] }>({ owners: [], channels: [] });
  const [deleteProject, setDeleteProject] = useState<AdminProject | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (sharedFilter !== 'all') params.set('shared', sharedFilter === 'shared' ? 'true' : 'false');
      if (ownerFilter !== 'all') params.set('owner', ownerFilter);
      if (channelFilter !== 'all') params.set('channel', channelFilter);

      const res = await fetch(`/api/admin/projects?${params}`);
      const data = await res.json();

      if (data.data) {
        setProjects(data.data.projects);
        setPagination(data.data.pagination);
        if (data.data.filters) setFilterOptions(data.data.filters);
      }
    } catch {
      toast.error(t('projects.deleteFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, search, platformFilter, sharedFilter, ownerFilter, channelFilter, t]);

  useEffect(() => {
    const timer = setTimeout(fetchProjects, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  const handleDeleteConfirm = async (projectId: string) => {
    const res = await fetch(`/api/admin/projects/${projectId}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error(t('projects.deleteFailed'));
      throw new Error();
    }
    toast.success(t('projects.deleted'));
    fetchProjects();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('projects.search')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('projects.filterPlatform')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('projects.allPlatforms')}</SelectItem>
              <SelectItem value="YOUTUBE">YouTube</SelectItem>
              <SelectItem value="CHZZK">Chzzk</SelectItem>
              <SelectItem value="TWITCH">Twitch</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sharedFilter} onValueChange={(v) => { setSharedFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('projects.filterShared')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('projects.all')}</SelectItem>
              <SelectItem value="shared">{t('projects.sharedOnly')}</SelectItem>
              <SelectItem value="private">{t('projects.privateOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={ownerFilter} onValueChange={(v) => { setOwnerFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder={t('projects.filterOwner')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('projects.allOwners')}</SelectItem>
              {filterOptions.owners.map((email) => (
                <SelectItem key={email} value={email}>
                  <span className="truncate">{email}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder={t('projects.filterChannel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('projects.allChannels')}</SelectItem>
              {filterOptions.channels.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  <span className="truncate">{ch}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('projects.noProjects')}
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('projects.title')}</TableHead>
                  <TableHead>{t('projects.owner')}</TableHead>
                  <TableHead>{t('projects.channel')}</TableHead>
                  <TableHead>{t('projects.platform')}</TableHead>
                  <TableHead>{t('projects.shared')}</TableHead>
                  <TableHead className="text-right">{t('projects.clips')}</TableHead>
                  <TableHead className="text-right">{t('projects.views')}</TableHead>
                  <TableHead>{t('projects.createdAt')}</TableHead>
                  <TableHead className="w-[80px]">{t('projects.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project._id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      <a
                        href={project.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        {project.title}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm">
                      {project.ownerEmail}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm">
                      {project.channelName || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{project.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      {project.isShared ? (
                        <Badge variant="default" className="text-xs">
                          <Share2 className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Private</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{project.clipCount}</TableCell>
                    <TableCell className="text-right">
                      {project.shareViewCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(project.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteProject(project)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
          />
        </>
      )}

      <AdminDeleteProjectDialog
        project={deleteProject}
        open={!!deleteProject}
        onOpenChange={(open) => !open && setDeleteProject(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
