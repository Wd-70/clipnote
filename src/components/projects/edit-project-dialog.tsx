'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface EditProjectDialogProps {
  projectId: string;
  projectTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (newTitle: string) => void;
}

export function EditProjectDialog({
  projectId,
  projectTitle,
  open,
  onOpenChange,
  onSave,
}: EditProjectDialogProps) {
  const t = useTranslations('projectEdit');
  const tCommon = useTranslations('common');

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(projectTitle);
      setError(null);
    }
  }, [open, projectTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t('titleRequired'));
      return;
    }

    // Check if title changed
    if (title.trim() === projectTitle) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('saveFailed'));
      }

      toast.success(t('saved'));
      onSave?.(title.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-project-title">{t('projectTitle')}</Label>
            <Input
              id="edit-project-title"
              placeholder={t('titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              autoFocus
              maxLength={200}
              onFocus={(e) => e.target.select()}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
