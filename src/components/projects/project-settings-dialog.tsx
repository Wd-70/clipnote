'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Settings, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderIcon } from '@/components/folders/folder-icon';
import type { IFolder } from '@/types';

interface ProjectSettingsDialogProps {
  projectId: string;
  projectTitle: string;
  videoUrl: string;
  folderId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (data: { title: string; videoUrl: string; folderId?: string | null }) => void;
}

export function ProjectSettingsDialog({
  projectId,
  projectTitle,
  videoUrl,
  folderId,
  open,
  onOpenChange,
  onSave,
}: ProjectSettingsDialogProps) {
  const t = useTranslations('projectSettings');
  const tCommon = useTranslations('common');
  const tFolders = useTranslations('folders');

  const [title, setTitle] = useState(projectTitle);
  const [url, setUrl] = useState(videoUrl);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderId ?? null);
  const [folders, setFolders] = useState<IFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFoldersLoading, setIsFoldersLoading] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(projectTitle);
      setUrl(videoUrl);
      setSelectedFolderId(folderId ?? null);
      fetchFolders();
    }
  }, [open, projectTitle, videoUrl, folderId]);

  // Fetch folders for the dropdown
  const fetchFolders = async () => {
    setIsFoldersLoading(true);
    try {
      const response = await fetch('/api/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setIsFoldersLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t('titleRequired'));
      return;
    }

    if (!url.trim()) {
      toast.error(t('urlRequired'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          videoUrl: url.trim(),
          folderId: selectedFolderId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      toast.success(t('saved'));
      onSave?.({
        title: title.trim(),
        videoUrl: url.trim(),
        folderId: selectedFolderId,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error(t('saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Check if anything has changed
  const hasChanges =
    title !== projectTitle ||
    url !== videoUrl ||
    selectedFolderId !== (folderId ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Project Title */}
          <div className="space-y-2">
            <Label htmlFor="project-title">{t('projectTitle')}</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              disabled={isLoading}
              maxLength={200}
            />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="video-url" className="flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" />
              {t('videoUrl')}
            </Label>
            <Input
              id="video-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">{t('urlHint')}</p>
          </div>

          {/* Folder */}
          <div className="space-y-2">
            <Label htmlFor="folder">{t('folder')}</Label>
            <Select
              value={selectedFolderId ?? 'none'}
              onValueChange={(value) =>
                setSelectedFolderId(value === 'none' ? null : value)
              }
              disabled={isLoading || isFoldersLoading}
            >
              <SelectTrigger id="folder">
                <SelectValue placeholder={t('selectFolder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-2">
                    <FolderIcon size="sm" />
                    {tFolders('noParent')}
                  </span>
                </SelectItem>
                {folders.map((folder) => (
                  <SelectItem
                    key={folder._id?.toString()}
                    value={folder._id?.toString() ?? ''}
                  >
                    <span
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${(folder.depth ?? 0) * 12}px` }}
                    >
                      <FolderIcon color={folder.color} size="sm" />
                      {folder.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !hasChanges}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
