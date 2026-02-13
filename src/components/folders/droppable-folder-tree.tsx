'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDroppable } from '@dnd-kit/core';
import { FolderPlus, Home, MoreHorizontal, Pencil, FolderInput, Trash2 } from 'lucide-react';
import { FolderIcon } from './folder-icon';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FolderTreeNode } from '@/hooks/use-folder-tree';
import type { IFolder } from '@/types';
import type { FolderContextAction } from './folder-tree-item';

interface DroppableFolderTreeProps {
  tree: FolderTreeNode[];
  currentFolderId: string | null;
  expandedIds: Set<string>;
  onFolderSelect: (folderId: string | null) => void;
  onToggleExpand: (folderId: string) => void;
  onCreateFolder?: (parentId: string | null) => void;
  onRenameFolder?: (folder: IFolder) => void;
  onDeleteFolder?: (folder: IFolder) => void;
  onMoveFolder?: (folder: IFolder) => void;
  rootProjectCount?: number;
  isLoading?: boolean;
  className?: string;
}

// Wrapper for tree items to make them droppable
function DroppableTreeItem({
  node,
  depth,
  currentFolderId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onContextAction,
}: {
  node: FolderTreeNode;
  depth: number;
  currentFolderId: string | null;
  expandedIds: Set<string>;
  onSelect: (folderId: string | null) => void;
  onToggleExpand: (folderId: string) => void;
  onContextAction: (folder: IFolder, action: FolderContextAction) => void;
}) {
  const t = useTranslations('folders');
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const showMenu = isHovered || isMenuOpen;
  const folderId = node._id?.toString() ?? '';
  const isActive = currentFolderId === folderId;
  const isExpanded = expandedIds.has(folderId);
  const hasChildren = node.children.length > 0;
  const canCreateSubfolder = node.depth < 2;
  const projectCount = node.projectCount ?? 0;

  // Droppable zone
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-drop-${folderId}`,
    data: {
      type: 'folder',
      folderId,
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(folderId);
    } else if (e.key === ' ' && hasChildren) {
      e.preventDefault();
      onToggleExpand(folderId);
    } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
      e.preventDefault();
      onToggleExpand(folderId);
    } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
      e.preventDefault();
      onToggleExpand(folderId);
    }
  };

  // FolderTreeNode extends IFolder, so we can use it directly
  // Extract IFolder properties for context action (excluding children and isExpanded)
  const folderData: IFolder = {
    _id: node._id,
    userId: node.userId,
    name: node.name,
    parentId: node.parentId,
    depth: node.depth,
    color: node.color,
    icon: node.icon,
    order: node.order,
    autoCollectChannelId: node.autoCollectChannelId,
    autoCollectPlatform: node.autoCollectPlatform,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };

  return (
    <div className="select-none">
      <div
        ref={setNodeRef}
        role="treeitem"
        tabIndex={0}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isActive}
        className={cn(
          'group flex items-center gap-1 h-9 px-2 rounded-md cursor-pointer transition-all',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isActive
            ? 'bg-secondary text-secondary-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          isOver && 'ring-2 ring-primary bg-primary/10'
        )}
        style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
        onClick={() => onSelect(folderId)}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/Collapse Toggle */}
        <button
          type="button"
          className={cn(
            'h-5 w-5 flex items-center justify-center rounded-sm transition-colors shrink-0',
            'hover:bg-muted',
            !hasChildren && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folderId);
          }}
          tabIndex={-1}
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
        >
          <svg
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Folder Icon */}
        <FolderIcon
          color={node.color}
          isOpen={isExpanded}
          className={cn('shrink-0', isActive && !node.color && 'text-primary')}
        />

        {/* Folder Name */}
        <span className="flex-1 truncate text-sm">{node.name}</span>

        {/* Project Count Badge / Context Menu - mutually exclusive */}
        <div className="shrink-0 w-6 h-6 flex items-center justify-center">
          {showMenu ? (
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Folder actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onContextAction(folderData, 'rename');
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {t('editFolder')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onContextAction(folderData, 'move');
              }}
            >
              <FolderInput className="mr-2 h-4 w-4" />
              {t('moveFolder')}
            </DropdownMenuItem>
            {canCreateSubfolder && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onContextAction(folderData, 'newSubfolder');
                }}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                {t('newFolder')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onContextAction(folderData, 'delete');
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('deleteFolder')}
            </DropdownMenuItem>
          </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            projectCount > 0 && (
              <span className="h-5 min-w-[20px] px-1.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                {projectCount}
              </span>
            )
          )}
        </div>
      </div>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <div role="group" aria-label={`${node.name} subfolders`}>
          {node.children.map((child) => (
            <DroppableTreeItem
              key={child._id?.toString()}
              node={child}
              depth={depth + 1}
              currentFolderId={currentFolderId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onContextAction={onContextAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DroppableFolderTree({
  tree,
  currentFolderId,
  expandedIds,
  onFolderSelect,
  onToggleExpand,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  rootProjectCount,
  isLoading,
  className,
}: DroppableFolderTreeProps) {
  const t = useTranslations('folders');
  const tProjects = useTranslations('projects');

  const handleContextAction = (
    folder: IFolder,
    action: FolderContextAction
  ) => {
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
  };

  // Droppable for root/all projects
  const { setNodeRef: setRootRef, isOver: isRootOver } = useDroppable({
    id: 'folder-drop-root',
    data: {
      type: 'root',
      folderId: null,
    },
  });

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

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <ScrollArea className="flex-1">
        <div role="tree" aria-label={t('title')} className="p-2 space-y-1">
          {/* All Projects (Root) - Droppable */}
          <button
            ref={setRootRef}
            type="button"
            role="treeitem"
            aria-selected={currentFolderId === null}
            className={cn(
              'w-full flex items-center gap-2 h-9 px-3 rounded-md text-sm transition-all cursor-pointer',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              currentFolderId === null
                ? 'bg-secondary text-secondary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              isRootOver && 'ring-2 ring-primary bg-primary/10'
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
            {rootProjectCount != null && rootProjectCount > 0 && (
              <span
                className="h-5 min-w-[20px] px-1.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground flex items-center justify-center"
              >
                {rootProjectCount}
              </span>
            )}
          </button>

          {/* Droppable Folder Tree */}
          {tree.length > 0 ? (
            tree.map((node) => (
              <DroppableTreeItem
                key={node._id?.toString()}
                node={node}
                depth={0}
                currentFolderId={currentFolderId}
                expandedIds={expandedIds}
                onSelect={onFolderSelect}
                onToggleExpand={onToggleExpand}
                onContextAction={handleContextAction}
              />
            ))
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
  );
}
