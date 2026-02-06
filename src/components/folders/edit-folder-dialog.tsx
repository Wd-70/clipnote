'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Settings2 } from 'lucide-react';
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
import { ColorPicker, FolderIcon } from './folder-icon';
import type { IFolder } from '@/types';

interface EditFolderDialogProps {
  folder: IFolder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: { name: string; color?: string }) => Promise<boolean>;
}

export function EditFolderDialog({
  folder,
  open,
  onOpenChange,
  onSave,
}: EditFolderDialogProps) {
  const t = useTranslations('folders');
  const tCommon = useTranslations('common');

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Reset form when folder changes
  useEffect(() => {
    if (folder && open) {
      setName(folder.name);
      setColor(folder.color);
      setError(null);
    }
  }, [folder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!folder) return;

    if (!name.trim()) {
      setError(t('folderNamePlaceholder'));
      return;
    }

    // Check if anything changed
    const nameChanged = name.trim() !== folder.name;
    const colorChanged = color !== folder.color;

    if (!nameChanged && !colorChanged) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);

    try {
      const success = await onSave(folder._id?.toString() ?? '', {
        name: name.trim(),
        color,
      });
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t('editFolder')}
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
          {/* Folder Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-folder-name">{t('folderName')}</Label>
            <Input
              id="edit-folder-name"
              placeholder={t('folderNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
              maxLength={100}
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>{t('color')}</Label>
            <div className="flex items-center gap-4">
              <ColorPicker value={color} onChange={setColor} />
              <FolderIcon color={color} size="lg" className="ml-2" />
            </div>
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
