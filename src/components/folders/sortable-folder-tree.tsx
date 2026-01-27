'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { FolderPlus, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { SortableFolderItem, FolderDragOverlay } from './sortable-folder-item';
import type { FolderTreeNode } from '@/hooks/use-folder-tree';
import type { IFolder } from '@/types';
import type { FolderContextAction } from './folder-tree-item';

interface SortableFolderTreeProps {
  tree: FolderTreeNode[];
  folders: IFolder[];
  currentFolderId: string | null;
  expandedIds: Set<string>;
  onFolderSelect: (folderId: string | null) => void;
  onToggleExpand: (folderId: string) => void;
  onCreateFolder?: (parentId: string | null) => void;
  onRenameFolder?: (folder: IFolder) => void;
  onDeleteFolder?: (folder: IFolder) => void;
  onMoveFolder?: (folder: IFolder) => void;
  onReorderFolders?: (orderedIds: string[], parentId: string | null) => Promise<boolean>;
  isLoading?: boolean;
  className?: string;
}

export function SortableFolderTree({
  tree,
  folders,
  currentFolderId,
  expandedIds,
  onFolderSelect,
  onToggleExpand,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onReorderFolders,
  isLoading,
  className,
}: SortableFolderTreeProps) {
  const t = useTranslations('folders');
  const tProjects = useTranslations('projects');

  const [activeFolder, setActiveFolder] = useState<IFolder | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleContextAction = useCallback(
    (folder: IFolder, action: FolderContextAction) => {
      switch (action) {
        case 'rename':
          onRenameFolder?.(folder);
          break;
        case 'move':
          onMoveFolder?.(folder);
          break;
        case 'delete':
          onDeleteFolder?.(folder);
          break;
        case 'newSubfolder':
          onCreateFolder?.(folder._id?.toString() ?? null);
          break;
      }
    },
    [onRenameFolder, onMoveFolder, onDeleteFolder, onCreateFolder]
  );

  const getFolderById = useCallback(
    (id: string): IFolder | undefined => {
      return folders.find((f) => f._id?.toString() === id);
    },
    [folders]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const folder = getFolderById(event.active.id as string);
      if (folder) {
        setActiveFolder(folder);
      }
    },
    [getFolderById]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveFolder(null);

      if (!over || active.id === over.id || !onReorderFolders) {
        return;
      }

      const activeFolder = getFolderById(active.id as string);
      const overFolder = getFolderById(over.id as string);

      if (!activeFolder || !overFolder) {
        return;
      }

      // Only reorder if same parent level
      const activeParentId = activeFolder.parentId ?? null;
      const overParentId = overFolder.parentId ?? null;

      if (activeParentId === overParentId) {
        // Get siblings at this level
        const siblings = folders
          .filter((f) => (f.parentId ?? null) === activeParentId)
          .sort((a, b) => a.order - b.order);

        const oldIndex = siblings.findIndex(
          (f) => f._id?.toString() === active.id
        );
        const newIndex = siblings.findIndex(
          (f) => f._id?.toString() === over.id
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(siblings, oldIndex, newIndex);
          const orderedIds = newOrder.map((f) => f._id?.toString() ?? '');
          await onReorderFolders(orderedIds, activeParentId);
        }
      }
    },
    [getFolderById, folders, onReorderFolders]
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-2 p-2', className)}>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-3/4 ml-4" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  // Get root level folder IDs for sortable context
  const rootFolderIds = tree.map((node) => node._id?.toString() ?? '');

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex flex-col h-full', className)}>
        <ScrollArea className="flex-1">
          <div role="tree" aria-label={t('title')} className="p-2 space-y-1">
            {/* All Projects (Root) */}
            <button
              type="button"
              role="treeitem"
              aria-selected={currentFolderId === null}
              className={cn(
                'w-full flex items-center gap-2 h-9 px-3 rounded-md text-sm transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                currentFolderId === null
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
              onClick={() => onFolderSelect(null)}
            >
              <Home
                className={cn(
                  'h-4 w-4',
                  currentFolderId === null && 'text-primary'
                )}
              />
              <span className="flex-1 text-left truncate">
                {tProjects('allProjects')}
              </span>
            </button>

            {/* Sortable Folder Tree */}
            {tree.length > 0 ? (
              <SortableContext
                items={rootFolderIds}
                strategy={verticalListSortingStrategy}
              >
                {tree.map((node) => (
                  <SortableFolderItem
                    key={node._id?.toString()}
                    node={node}
                    depth={0}
                    currentFolderId={currentFolderId}
                    expandedIds={expandedIds}
                    onSelect={onFolderSelect}
                    onToggleExpand={onToggleExpand}
                    onContextAction={handleContextAction}
                  />
                ))}
              </SortableContext>
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t('emptyFolder')}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Create Folder Button */}
        {onCreateFolder && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-9 text-muted-foreground hover:text-foreground"
              onClick={() => onCreateFolder(null)}
            >
              <FolderPlus className="h-4 w-4" />
              {t('newFolder')}
            </Button>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeFolder && <FolderDragOverlay folder={activeFolder} />}
      </DragOverlay>
    </DndContext>
  );
}
