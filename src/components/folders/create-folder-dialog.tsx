'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, FolderPlus } from 'lucide-react';
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
import { ColorPicker, FolderIcon } from './folder-icon';
import type { IFolder } from '@/types';

interface CreateFolderDialogProps {
  folders: IFolder[];
  defaultParentId?: string | null;
  onCreateFolder: (data: {
    name: string;
    parentId?: string | null;
    color?: string;
  }) => Promise<IFolder | null>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateFolderDialog({
  folders,
  defaultParentId = null,
  onCreateFolder,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateFolderDialogProps) {
  const t = useTranslations('folders');
  const tCommon = useTranslations('common');

  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange : setInternalOpen;

  // Sync defaultParentId when dialog opens
  useEffect(() => {
    if (open) {
      setParentId(defaultParentId);
    }
  }, [open, defaultParentId]);

  // Get available parent folders (only depth 0-1 can be parents)
  const availableParents = folders.filter((f) => f.depth < 2);

  // Get parent folder depth to check if we can create
  const getParentDepth = (pid: string | null): number => {
    if (!pid) return -1;
    const parent = folders.find((f) => f._id?.toString() === pid);
    return parent?.depth ?? -1;
  };

  const parentDepth = getParentDepth(parentId);
  const canCreate = parentDepth < 2; // Max depth is 2 (3 levels: 0, 1, 2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('folderNamePlaceholder'));
      return;
    }

    if (!canCreate) {
      setError(t('maxDepthError'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await onCreateFolder({
        name: name.trim(),
        parentId,
        color,
      });

      if (result) {
        // Reset form
        setName('');
        setParentId(defaultParentId);
        setColor(undefined);
        onOpenChange?.(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('createFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setName('');
      setParentId(defaultParentId);
      setColor(undefined);
      setError(null);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            {t('createFolder')}
          </DialogTitle>
          <DialogDescription>
            {t('folderNamePlaceholder')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Folder Name */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">{t('folderName')}</Label>
            <Input
              id="folder-name"
              placeholder={t('folderNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
              maxLength={100}
            />
          </div>

          {/* Parent Folder */}
          <div className="space-y-2">
            <Label htmlFor="parent-folder">{t('parentFolder')}</Label>
            <Select
              value={parentId ?? 'root'}
              onValueChange={(value) =>
                setParentId(value === 'root' ? null : value)
              }
              disabled={isLoading}
            >
              <SelectTrigger id="parent-folder">
                <SelectValue placeholder={t('noParent')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">
                  <span className="flex items-center gap-2">
                    <FolderIcon size="sm" />
                    {t('noParent')}
                  </span>
                </SelectItem>
                {availableParents.map((folder) => (
                  <SelectItem
                    key={folder._id?.toString()}
                    value={folder._id?.toString() ?? ''}
                  >
                    <span
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${folder.depth * 12}px` }}
                    >
                      <FolderIcon color={folder.color} size="sm" />
                      {folder.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!canCreate && (
              <p className="text-xs text-destructive">{t('maxDepthError')}</p>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>{t('color')}</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Error Message */}
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
            <Button type="submit" disabled={isLoading || !name.trim() || !canCreate}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
