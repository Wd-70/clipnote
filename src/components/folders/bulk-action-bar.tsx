'use client';

import { useTranslations } from 'next-intl';
import { X, FolderInput, Trash2, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BulkActionBarProps {
  selectedCount: number;
  isVisible: boolean;
  onSelectAll?: () => void;
  onDeselectAll: () => void;
  onMoveToFolder: () => void;
  onDelete: () => void;
  isProcessing?: boolean;
  totalCount?: number;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  isVisible,
  onSelectAll,
  onDeselectAll,
  onMoveToFolder,
  onDelete,
  isProcessing = false,
  totalCount,
  className,
}: BulkActionBarProps) {
  const t = useTranslations('bulk');

  if (!isVisible) return null;

  const allSelected = totalCount !== undefined && selectedCount === totalCount;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'animate-in slide-in-from-bottom-full duration-200',
        className
      )}
    >
      <div className="mx-auto max-w-4xl px-4 pb-4">
        <div
          className={cn(
            'flex items-center justify-between gap-4 px-4 py-3',
            'bg-background/95 backdrop-blur-sm',
            'border rounded-lg shadow-lg'
          )}
        >
          {/* Left: Selection info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium text-sm">
                {t('selectedCount', { count: selectedCount })}
              </span>
            </div>

            {/* Select/Deselect All */}
            {onSelectAll && totalCount && totalCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={allSelected ? onDeselectAll : onSelectAll}
                disabled={isProcessing}
              >
                {allSelected ? (
                  <>
                    <Square className="h-3 w-3 mr-1" />
                    {t('deselectAll')}
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3 w-3 mr-1" />
                    {t('selectAll')}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Center/Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onMoveToFolder}
              disabled={isProcessing || selectedCount === 0}
              className="gap-2"
            >
              <FolderInput className="h-4 w-4" />
              <span className="hidden sm:inline">{t('moveToFolder')}</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isProcessing || selectedCount === 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('deleteSelected')}</span>
            </Button>

            {/* Close/Cancel */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-2"
              onClick={onDeselectAll}
              disabled={isProcessing}
              aria-label={t('cancel')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline version for toolbars
interface BulkActionButtonsProps {
  selectedCount: number;
  onMoveToFolder: () => void;
  onDelete: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function BulkActionButtons({
  selectedCount,
  onMoveToFolder,
  onDelete,
  onCancel,
  isProcessing = false,
}: BulkActionButtonsProps) {
  const t = useTranslations('bulk');

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {t('selectedCount', { count: selectedCount })}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={onMoveToFolder}
        disabled={isProcessing || selectedCount === 0}
      >
        <FolderInput className="h-4 w-4 mr-2" />
        {t('moveToFolder')}
      </Button>

      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={isProcessing || selectedCount === 0}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {t('deleteSelected')}
      </Button>

      <Button variant="ghost" size="sm" onClick={onCancel} disabled={isProcessing}>
        {t('cancel')}
      </Button>
    </div>
  );
}
