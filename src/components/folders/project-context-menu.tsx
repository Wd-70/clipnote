'use client';

import { useTranslations } from 'next-intl';
import {
  MoreHorizontal,
  Edit2,
  FolderInput,
  Trash2,
  ExternalLink,
  Copy,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ProjectAction =
  | 'edit'
  | 'move'
  | 'delete'
  | 'openInNewTab'
  | 'copyLink'
  | 'select';

interface ProjectContextMenuProps {
  projectId: string;
  projectTitle: string;
  onAction: (action: ProjectAction) => void;
  isSelected?: boolean;
  showSelectOption?: boolean;
  triggerClassName?: string;
}

export function ProjectContextMenu({
  projectId,
  projectTitle,
  onAction,
  isSelected = false,
  showSelectOption = false,
  triggerClassName,
}: ProjectContextMenuProps) {
  const t = useTranslations('projectCard');
  const tCommon = useTranslations('common');
  const tBulk = useTranslations('bulk');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', triggerClassName)}
          aria-label={`Actions for ${projectTitle}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {showSelectOption && (
          <>
            <DropdownMenuItem onClick={() => onAction('select')}>
              <CheckSquare className="mr-2 h-4 w-4" />
              {isSelected ? tBulk('deselectAll') : 'Select'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => onAction('edit')}>
          <Edit2 className="mr-2 h-4 w-4" />
          {t('editProject')}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onAction('openInNewTab')}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in new tab
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onAction('copyLink')}>
          <Copy className="mr-2 h-4 w-4" />
          {tCommon('copy')} link
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAction('move')}>
          <FolderInput className="mr-2 h-4 w-4" />
          {tBulk('moveToFolder')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onAction('delete')}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {tCommon('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Inline action buttons for list view
interface ProjectInlineActionsProps {
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  className?: string;
}

export function ProjectInlineActions({
  onEdit,
  onMove,
  onDelete,
  className,
}: ProjectInlineActionsProps) {
  const tCommon = useTranslations('common');
  const tBulk = useTranslations('bulk');

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onEdit}
        aria-label="Edit"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onMove}
        aria-label="Move"
      >
        <FolderInput className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={onDelete}
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
