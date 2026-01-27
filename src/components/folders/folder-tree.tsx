'use client';

import { useTranslations } from 'next-intl';
import { FolderPlus, Home, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderIcon } from './folder-icon';
import type { FolderTreeNode } from '@/hooks/use-folder-tree';
import type { IFolder } from '@/types';
import type { FolderContextAction } from './folder-tree-item';

interface FolderTreeProps {
  tree: FolderTreeNode[];
  currentFolderId: string | null;
  expandedIds: Set<string>;
  onFolderSelect: (folderId: string | null) => void;
  onToggleExpand: (folderId: string) => void;
  onCreateFolder?: (parentId: string | null) => void;
  onRenameFolder?: (folder: IFolder) => void;
  onDeleteFolder?: (folder: IFolder) => void;
  onMoveFolder?: (folder: IFolder) => void;
  isLoading?: boolean;
  className?: string;
}

export function FolderTree({
  tree,
  currentFolderId,
  expandedIds,
  onFolderSelect,
  onToggleExpand,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  isLoading,
  className,
}: FolderTreeProps) {
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

          {/* Folder Tree */}
          {tree.length > 0 ? (
            tree.map((node) => (
              <TreeItemRecursive
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

// Internal recursive component for tree items
interface TreeItemRecursiveProps {
  node: FolderTreeNode;
  depth: number;
  currentFolderId: string | null;
  expandedIds: Set<string>;
  onSelect: (folderId: string | null) => void;
  onToggleExpand: (folderId: string) => void;
  onContextAction: (folder: IFolder, action: FolderContextAction) => void;
}

function TreeItemRecursive({
  node,
  depth,
  currentFolderId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onContextAction,
}: TreeItemRecursiveProps) {
  const t = useTranslations('folders');
  const folderId = node._id?.toString() ?? '';
  const isActive = currentFolderId === folderId;
  const isExpanded = expandedIds.has(folderId);
  const hasChildren = node.children.length > 0;
  const canCreateSubfolder = node.depth < 2;
  const projectCount = node.projectCount ?? 0;

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

  return (
    <div className="select-none">
      <div
        role="treeitem"
        tabIndex={0}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isActive}
        className={cn(
          'group flex items-center gap-1 h-9 px-2 rounded-md cursor-pointer transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isActive
            ? 'bg-secondary text-secondary-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
        style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
        onClick={() => onSelect(folderId)}
        onKeyDown={handleKeyDown}
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
          size="sm"
          className={cn('shrink-0', isActive && 'text-primary')}
        />

        {/* Folder Name */}
        <span className="flex-1 truncate text-sm">{node.name}</span>

        {/* Project Count Badge */}
        {projectCount > 0 && (
          <span
            className={cn(
              'h-5 min-w-[20px] px-1.5 text-[10px] font-medium rounded-full',
              'bg-muted text-muted-foreground',
              'group-hover:opacity-0 transition-opacity'
            )}
          >
            {projectCount}
          </span>
        )}

        {/* Context Menu */}
        <div
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'flex items-center'
          )}
        >
          <ContextMenuButton
            folder={node}
            canCreateSubfolder={canCreateSubfolder}
            onAction={(action) => onContextAction(node, action)}
          />
        </div>
      </div>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <div role="group" aria-label={`${node.name} subfolders`}>
          {node.children.map((child) => (
            <TreeItemRecursive
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

// Context menu button component
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Pencil,
  FolderInput,
  Trash2,
} from 'lucide-react';

interface ContextMenuButtonProps {
  folder: IFolder;
  canCreateSubfolder: boolean;
  onAction: (action: FolderContextAction) => void;
}

function ContextMenuButton({
  folder,
  canCreateSubfolder,
  onAction,
}: ContextMenuButtonProps) {
  const t = useTranslations('folders');

  return (
    <DropdownMenu>
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
            onAction('rename');
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {t('rename')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onAction('move');
          }}
        >
          <FolderInput className="mr-2 h-4 w-4" />
          {t('moveFolder')}
        </DropdownMenuItem>
        {canCreateSubfolder && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onAction('newSubfolder');
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
            onAction('delete');
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('deleteFolder')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
