'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderIcon } from './folder-icon';
import type { IFolder } from '@/types';

interface RenameFolderDialogProps {
  folder: IFolder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => Promise<boolean>;
}

export function RenameFolderDialog({
  folder,
  open,
  onOpenChange,
  onRename,
}: RenameFolderDialogProps) {
  const t = useTranslations('folders');
  const tCommon = useTranslations('common');

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when folder changes
  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setError(null);
    }
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!folder) return;

    if (!name.trim()) {
      setError(t('folderNamePlaceholder'));
      return;
    }

    if (name.trim() === folder.name) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);

    try {
      const success = await onRename(folder._id?.toString() ?? '', name.trim());
      if (success) {
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('renameFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {t('renameFolder')}
          </DialogTitle>
          <DialogDescription>
            {folder && (
              <span className="flex items-center gap-2 mt-1">
                <FolderIcon color={folder.color} size="sm" />
                {folder.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="rename-folder-name">{t('folderName')}</Label>
            <Input
              id="rename-folder-name"
              placeholder={t('folderNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
              maxLength={100}
              onFocus={(e) => e.target.select()}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
