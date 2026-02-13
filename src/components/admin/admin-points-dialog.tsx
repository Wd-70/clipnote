'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface UserForPoints {
  _id: string;
  email: string;
  points: number;
}

interface AdminPointsDialogProps {
  user: UserForPoints | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, amount: number, reason: string) => Promise<void>;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export function AdminPointsDialog({
  user,
  open,
  onOpenChange,
  onSave,
}: AdminPointsDialogProps) {
  const t = useTranslations('admin.points');
  const tCommon = useTranslations('common');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setAmount(0);
      setReason('');
    }
    onOpenChange(isOpen);
  };

  const handleSave = async (adjustment: number) => {
    if (!user || adjustment === 0) return;
    setSaving(true);
    try {
      await onSave(user._id, adjustment, reason);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('currentBalance')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Badge variant="secondary" className="text-lg font-bold">
              {(user?.points || 0).toLocaleString()} P
            </Badge>
          </div>

          <div className="space-y-2">
            <Label>{t('amount')}</Label>
            <Input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('quickAdd')}</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((qa) => (
                <Button
                  key={qa}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(qa)}
                >
                  +{qa.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('reason')}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reasonPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleSave(-amount)}
            disabled={saving || amount <= 0}
          >
            {t('subtract')}
          </Button>
          <Button
            onClick={() => handleSave(amount)}
            disabled={saving || amount <= 0}
          >
            {t('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
