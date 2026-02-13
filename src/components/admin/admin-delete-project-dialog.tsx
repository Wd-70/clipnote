'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface AdminDeleteProjectDialogProps {
  project: { _id: string; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (projectId: string) => Promise<void>;
}

export function AdminDeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onConfirm,
}: AdminDeleteProjectDialogProps) {
  const t = useTranslations('admin.projects');
  const tCommon = useTranslations('common');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await onConfirm(project._id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium">{project?.title}</span>
            <br />
            <br />
            {t('deleteWarning')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? tCommon('deleting') : tCommon('delete')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
