'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FolderIcon } from './folder-icon';
import type { FolderTreeNode } from '@/hooks/use-folder-tree';
import type { IFolder } from '@/types';
import type { FolderContextAction } from './folder-tree-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Pencil,
  FolderInput,
  FolderPlus,
  Trash2,
} from 'lucide-react';

interface SortableFolderItemProps {
  node: FolderTreeNode;
  depth: number;
  currentFolderId: string | null;
  expandedIds: Set<string>;
  isOver?: boolean;
  onSelect: (folderId: string | null) => void;
  onToggleExpand: (folderId: string) => void;
  onContextAction: (folder: IFolder, action: FolderContextAction) => void;
}

export function SortableFolderItem({
  node,
  depth,
  currentFolderId,
  expandedIds,
  isOver = false,
  onSelect,
  onToggleExpand,
  onContextAction,
}: SortableFolderItemProps) {
  const t = useTranslations('folders');
  const folderId = node._id?.toString() ?? '';
  const isActive = currentFolderId === folderId;
  const isExpanded = expandedIds.has(folderId);
  const hasChildren = node.children.length > 0;
  const canCreateSubfolder = node.depth < 2;
  const projectCount = node.projectCount ?? 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folderId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    <div ref={setNodeRef} style={style} className="select-none">
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
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          isDragging && 'opacity-50',
          isOver && 'ring-2 ring-primary ring-offset-1'
        )}
        style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
        onClick={() => onSelect(folderId)}
        onKeyDown={handleKeyDown}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            'h-5 w-5 flex items-center justify-center rounded-sm cursor-grab active:cursor-grabbing',
            'opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

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
                  onContextAction(node, 'rename');
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t('rename')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onContextAction(node, 'move');
                }}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                {t('moveFolder')}
              </DropdownMenuItem>
              {canCreateSubfolder && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onContextAction(node, 'newSubfolder');
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
                  onContextAction(node, 'delete');
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteFolder')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <div role="group" aria-label={`${node.name} subfolders`}>
          {node.children.map((child) => (
            <SortableFolderItem
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

// Drag overlay component for folder
interface FolderDragOverlayProps {
  folder: IFolder;
}

export function FolderDragOverlay({ folder }: FolderDragOverlayProps) {
  return (
    <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-card border shadow-lg">
      <FolderIcon color={folder.color} size="sm" />
      <span className="text-sm font-medium">{folder.name}</span>
    </div>
  );
}
