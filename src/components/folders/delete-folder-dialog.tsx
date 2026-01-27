'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FolderIcon } from './folder-icon';
import type { IFolder } from '@/types';

interface DeleteFolderDialogProps {
  folder: IFolder | null;
  projectCount?: number;
  childFolderCount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function DeleteFolderDialog({
  folder,
  projectCount = 0,
  childFolderCount = 0,
  open,
  onOpenChange,
  onDelete,
}: DeleteFolderDialogProps) {
  const t = useTranslations('folders');
  const tCommon = useTranslations('common');

  const [isDeleting, setIsDeleting] = useState(false);

  const hasContent = projectCount > 0 || childFolderCount > 0;

  const handleDelete = async () => {
    if (!folder) return;

    setIsDeleting(true);

    try {
      const success = await onDelete(folder._id?.toString() ?? '');
      if (success) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Failed to delete folder:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('deleteConfirm')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {folder && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FolderIcon color={folder.color} size="md" />
                  <span className="font-medium text-foreground">
                    {folder.name}
                  </span>
                </div>
              )}

              <p>
                {hasContent
                  ? t('deleteWarning', {
                      name: folder?.name ?? '',
                      projectCount,
                    })
                  : t('deleteWarningEmpty', {
                      name: folder?.name ?? '',
                    })}
              </p>

              {hasContent && (
                <div className="text-sm space-y-1 text-muted-foreground">
                  {childFolderCount > 0 && (
                    <p>
                      • {childFolderCount} subfolder
                      {childFolderCount !== 1 ? 's' : ''} will be deleted
                    </p>
                  )}
                  {projectCount > 0 && (
                    <p>
                      • {projectCount} project
                      {projectCount !== 1 ? 's' : ''} will be deleted
                    </p>
                  )}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {tCommon('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? tCommon('deleting') : tCommon('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
