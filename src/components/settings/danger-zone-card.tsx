'use client';

import { Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function DangerZoneCard() {
  const t = useTranslations('settingsPage');

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/user/export');
      if (!res.ok) throw new Error('Export failed');

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clipnote-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('saveFailed'));
    }
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion with confirmation dialog
    toast.error('Account deletion is not yet implemented');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {t('dangerZone')}
        </CardTitle>
        <CardDescription>{t('deleteAccountDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">{t('exportData')}</h4>
            <p className="text-sm text-muted-foreground mb-3">
              {t('exportDataDesc')}
            </p>
            <Button variant="outline" onClick={handleExportData}>
              {t('exportData')}
            </Button>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">
              {t('deleteAccount')}
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              {t('deleteAccountDesc')}
            </p>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              {t('deleteAccount')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
