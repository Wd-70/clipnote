'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  FolderInput,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderIcon } from './folder-icon';
import type { FolderTreeNode } from '@/hooks/use-folder-tree';

export type FolderContextAction = 'rename' | 'move' | 'delete' | 'newSubfolder';

interface FolderTreeItemProps {
  node: FolderTreeNode;
  depth: number;
  isActive: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onContextAction: (action: FolderContextAction) => void;
}

export function FolderTreeItem({
  node,
  depth,
  isActive,
  onSelect,
  onToggleExpand,
  onContextAction,
}: FolderTreeItemProps) {
  const t = useTranslations('folders');
  const [isHovered, setIsHovered] = useState(false);

  const hasChildren = node.children.length > 0;
  const canCreateSubfolder = node.depth < 2; // Max 3 levels (0, 1, 2)
  const projectCount = node.projectCount ?? 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSelect();
    } else if (e.key === ' ') {
      e.preventDefault();
      if (hasChildren) {
        onToggleExpand();
      }
    } else if (e.key === 'ArrowRight' && hasChildren && !node.isExpanded) {
      e.preventDefault();
      onToggleExpand();
    } else if (e.key === 'ArrowLeft' && hasChildren && node.isExpanded) {
      e.preventDefault();
      onToggleExpand();
    }
  };

  return (
    <div className="select-none">
      <div
        role="treeitem"
        tabIndex={0}
        aria-expanded={hasChildren ? node.isExpanded : undefined}
        aria-selected={isActive}
        className={cn(
          'group flex items-center gap-1 h-9 px-2 rounded-md cursor-pointer transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isActive
            ? 'bg-secondary text-secondary-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/Collapse Toggle */}
        <button
          type="button"
          className={cn(
            'h-5 w-5 flex items-center justify-center rounded-sm transition-colors',
            'hover:bg-muted',
            !hasChildren && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          tabIndex={-1}
          aria-label={node.isExpanded ? 'Collapse folder' : 'Expand folder'}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              node.isExpanded && 'rotate-90'
            )}
          />
        </button>

        {/* Folder Icon */}
        <FolderIcon
          color={node.color}
          isOpen={node.isExpanded}
          size="sm"
          className={cn('shrink-0', isActive && !node.color && 'text-primary')}
        />

        {/* Folder Name */}
        <span className="flex-1 truncate text-sm">{node.name}</span>

        {/* Project Count Badge */}
        {projectCount > 0 && (
          <Badge
            variant="secondary"
            className={cn(
              'h-5 min-w-[20px] px-1.5 text-[10px] font-medium',
              isHovered && 'opacity-0'
            )}
          >
            {projectCount}
          </Badge>
        )}

        {/* Context Menu (visible on hover) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 opacity-0 transition-opacity',
                isHovered && 'opacity-100',
                'focus:opacity-100'
              )}
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
                onContextAction('rename');
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {t('rename')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onContextAction('move');
              }}
            >
              <FolderInput className="mr-2 h-4 w-4" />
              {t('moveFolder')}
            </DropdownMenuItem>
            {canCreateSubfolder && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onContextAction('newSubfolder');
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
                onContextAction('delete');
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('deleteFolder')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Render Children (Recursive) */}
      {hasChildren && node.isExpanded && (
        <div role="group" aria-label={`${node.name} subfolders`}>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child._id?.toString()}
              node={child}
              depth={depth + 1}
              isActive={false} // Will be controlled by parent
              onSelect={() => {}} // Will be controlled by parent
              onToggleExpand={() => {}} // Will be controlled by parent
              onContextAction={() => {}} // Will be controlled by parent
            />
          ))}
        </div>
      )}
    </div>
  );
}
