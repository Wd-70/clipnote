'use client';

import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { IFolder } from '@/types';
import type { FolderTreeNode } from './use-folder-tree';

interface UseDndFoldersOptions {
  folders: IFolder[];
  tree: FolderTreeNode[];
  onReorder: (orderedIds: string[], parentId: string | null) => Promise<boolean>;
  onMove: (folderId: string, newParentId: string | null) => Promise<boolean>;
  canMoveToFolder: (folderId: string, targetParentId: string | null) => boolean;
}

interface UseDndFoldersReturn {
  activeFolder: IFolder | null;
  overFolderId: string | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
}

export function useDndFolders({
  folders,
  tree,
  onReorder,
  onMove,
  canMoveToFolder,
}: UseDndFoldersOptions): UseDndFoldersReturn {
  const [activeFolder, setActiveFolder] = useState<IFolder | null>(null);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);

  const getFolderById = useCallback(
    (id: string): IFolder | undefined => {
      return folders.find((f) => f._id?.toString() === id);
    },
    [folders]
  );

  const getSiblingsAtLevel = useCallback(
    (parentId: string | null): IFolder[] => {
      return folders
        .filter((f) => (f.parentId ?? null) === parentId)
        .sort((a, b) => a.order - b.order);
    },
    [folders]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const folder = getFolderById(active.id as string);
      if (folder) {
        setActiveFolder(folder);
      }
    },
    [getFolderById]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (over) {
        setOverFolderId(over.id as string);
      } else {
        setOverFolderId(null);
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveFolder(null);
      setOverFolderId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const activeFolderId = active.id as string;
      const overFolderId = over.id as string;

      const activeFolder = getFolderById(activeFolderId);
      const overFolder = getFolderById(overFolderId);

      if (!activeFolder || !overFolder) {
        return;
      }

      // Check if same parent (reorder) or different parent (move)
      const activeParentId = activeFolder.parentId ?? null;
      const overParentId = overFolder.parentId ?? null;

      if (activeParentId === overParentId) {
        // Same level - reorder
        const siblings = getSiblingsAtLevel(activeParentId);
        const oldIndex = siblings.findIndex(
          (f) => f._id?.toString() === activeFolderId
        );
        const newIndex = siblings.findIndex(
          (f) => f._id?.toString() === overFolderId
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(siblings, oldIndex, newIndex);
          const orderedIds = newOrder.map((f) => f._id?.toString() ?? '');
          await onReorder(orderedIds, activeParentId);
        }
      } else {
        // Different level - check if we can move
        if (canMoveToFolder(activeFolderId, overParentId)) {
          await onMove(activeFolderId, overParentId);
        }
      }
    },
    [getFolderById, getSiblingsAtLevel, onReorder, onMove, canMoveToFolder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveFolder(null);
    setOverFolderId(null);
  }, []);

  return {
    activeFolder,
    overFolderId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
