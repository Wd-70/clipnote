'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, FolderInput, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FolderIcon } from './folder-icon';
import type { IFolder } from '@/types';

interface MoveFolderDialogProps {
  folder: IFolder | null;
  folders: IFolder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (id: string, newParentId: string | null) => Promise<boolean>;
  canMoveToFolder?: (folderId: string, targetParentId: string | null) => boolean;
}

export function MoveFolderDialog({
  folder,
  folders,
  open,
  onOpenChange,
  onMove,
  canMoveToFolder,
}: MoveFolderDialogProps) {
  const t = useTranslations('folders');
  const tCommon = useTranslations('common');
  const tProjects = useTranslations('projects');
  const tBulk = useTranslations('bulk');

  const [isLoading, setIsLoading] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  // Build a flat list of selectable destinations
  const destinations = useMemo(() => {
    if (!folder) return [];

    const folderId = folder._id?.toString() ?? '';
    const currentParentId = folder.parentId ?? null;

    // Check if we can move to a target
    const canMoveTo = (targetId: string | null): boolean => {
      // Can't move to current parent (no change)
      if (targetId === currentParentId) return false;

      // Can't move to self
      if (targetId === folderId) return false;

      // Check depth constraint - target must be depth 0 or 1
      if (targetId !== null) {
        const target = folders.find((f) => f._id?.toString() === targetId);
        if (!target || target.depth >= 2) return false;
      }

      // Use custom validator if provided
      if (canMoveToFolder) {
        return canMoveToFolder(folderId, targetId);
      }

      // Check if target is a descendant of the folder being moved
      const isDescendant = (parentId: string): boolean => {
        const children = folders.filter((f) => f.parentId === parentId);
        for (const child of children) {
          const childId = child._id?.toString() ?? '';
          if (childId === targetId) return true;
          if (isDescendant(childId)) return true;
        }
        return false;
      };

      if (targetId && isDescendant(folderId)) return false;

      return true;
    };

    // Build hierarchical list
    const result: Array<{
      id: string | null;
      name: string;
      depth: number;
      color?: string;
      disabled: boolean;
      isCurrent: boolean;
    }> = [];

    // Root option
    result.push({
      id: null,
      name: tProjects('allProjects'),
      depth: -1,
      disabled: !canMoveTo(null),
      isCurrent: currentParentId === null,
    });

    // Add folders recursively
    const addFolders = (parentId: string | null, depth: number) => {
      const children = folders
        .filter((f) => (f.parentId ?? null) === parentId)
        .sort((a, b) => a.order - b.order);

      for (const f of children) {
        const id = f._id?.toString() ?? '';
        result.push({
          id,
          name: f.name,
          depth,
          color: f.color,
          disabled: !canMoveTo(id),
          isCurrent: currentParentId === id,
        });
        if (f.depth < 1) {
          addFolders(id, depth + 1);
        }
      }
    };

    addFolders(null, 0);

    return result;
  }, [folder, folders, canMoveToFolder, tProjects]);

  const handleMove = async () => {
    if (!folder) return;

    setIsLoading(true);

    try {
      const success = await onMove(
        folder._id?.toString() ?? '',
        selectedParentId
      );
      if (success) {
        onOpenChange(false);
        setSelectedParentId(null);
      }
    } catch (err) {
      console.error('Failed to move folder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedParentId(null);
    }
    onOpenChange(newOpen);
  };

  const selectedDestination = destinations.find(
    (d) => d.id === selectedParentId
  );
  const hasValidSelection =
    selectedParentId !== undefined &&
    selectedDestination &&
    !selectedDestination.disabled &&
    !selectedDestination.isCurrent;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5" />
            {t('moveFolder')}
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

        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-3">
            {tBulk('selectFolder')}
          </p>

          <ScrollArea className="h-[280px] border rounded-md">
            <div className="p-2 space-y-1">
              {destinations.map((dest) => (
                <button
                  key={dest.id ?? 'root'}
                  type="button"
                  disabled={dest.disabled}
                  className={cn(
                    'w-full flex items-center gap-2 h-9 px-3 rounded-md text-sm transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    dest.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-muted/50',
                    selectedParentId === dest.id &&
                      !dest.disabled &&
                      'bg-primary/10 text-primary border border-primary/20',
                    dest.isCurrent && 'bg-muted'
                  )}
                  style={{ paddingLeft: `${(dest.depth + 1) * 12 + 12}px` }}
                  onClick={() => {
                    if (!dest.disabled) {
                      setSelectedParentId(dest.id);
                    }
                  }}
                >
                  {dest.id === null ? (
                    <Home className="h-4 w-4 shrink-0" />
                  ) : (
                    <FolderIcon color={dest.color} size="sm" />
                  )}
                  <span className="flex-1 text-left truncate">{dest.name}</span>
                  {dest.isCurrent && (
                    <span className="text-xs text-muted-foreground">
                      (current)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleMove}
            disabled={isLoading || !hasValidSelection}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tBulk('moveToFolder')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simplified version for moving projects (not folders)
interface MoveToFolderDialogProps {
  folders: IFolder[];
  selectedCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (folderId: string | null) => Promise<boolean>;
}

export function MoveToFolderDialog({
  folders,
  selectedCount,
  open,
  onOpenChange,
  onMove,
}: MoveToFolderDialogProps) {
  const t = useTranslations('folders');
  const tCommon = useTranslations('common');
  const tProjects = useTranslations('projects');
  const tBulk = useTranslations('bulk');

  const [isLoading, setIsLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Build flat list of folders
  const folderList = useMemo(() => {
    const result: Array<{
      id: string | null;
      name: string;
      depth: number;
      color?: string;
    }> = [];

    // Root option
    result.push({
      id: null,
      name: tBulk('moveToRoot'),
      depth: -1,
    });

    // Add folders recursively
    const addFolders = (parentId: string | null, depth: number) => {
      const children = folders
        .filter((f) => (f.parentId ?? null) === parentId)
        .sort((a, b) => a.order - b.order);

      for (const f of children) {
        const id = f._id?.toString() ?? '';
        result.push({
          id,
          name: f.name,
          depth,
          color: f.color,
        });
        addFolders(id, depth + 1);
      }
    };

    addFolders(null, 0);

    return result;
  }, [folders, tBulk]);

  const handleMove = async () => {
    setIsLoading(true);

    try {
      const success = await onMove(selectedFolderId);
      if (success) {
        onOpenChange(false);
        setSelectedFolderId(null);
      }
    } catch (err) {
      console.error('Failed to move projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedFolderId(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5" />
            {tBulk('moveToFolder')}
          </DialogTitle>
          <DialogDescription>
            {tBulk('selectedCount', { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-3">
            {tBulk('selectFolder')}
          </p>

          <ScrollArea className="h-[250px] border rounded-md">
            <div className="p-2 space-y-1">
              {folderList.map((folder) => (
                <button
                  key={folder.id ?? 'root'}
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-2 h-9 px-3 rounded-md text-sm transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'cursor-pointer hover:bg-muted/50',
                    selectedFolderId === folder.id &&
                      'bg-primary/10 text-primary border border-primary/20'
                  )}
                  style={{ paddingLeft: `${(folder.depth + 1) * 12 + 12}px` }}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  {folder.id === null ? (
                    <Home className="h-4 w-4 shrink-0" />
                  ) : (
                    <FolderIcon color={folder.color} size="sm" />
                  )}
                  <span className="flex-1 text-left truncate">
                    {folder.name}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleMove}
            disabled={isLoading || selectedFolderId === undefined}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tBulk('moveToFolder')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
