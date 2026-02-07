'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';

export function NotificationSettingsCard() {
  const t = useTranslations('settingsPage');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          {t('notifications')}
        </CardTitle>
        <CardDescription>{t('preferences')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications">{t('emailNotifications')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('emailNotificationsDesc')}
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="marketing">{t('marketing')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('marketingDesc')}
            </p>
          </div>
          <Switch
            id="marketing"
            checked={marketing}
            onCheckedChange={setMarketing}
          />
        </div>
      </CardContent>
    </Card>
  );
}
