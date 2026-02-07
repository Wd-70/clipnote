'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/user-context';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function AccountSettingsCard() {
  const t = useTranslations('settingsPage');
  const { user, isLoading } = useUser();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize name when user data loads
  if (user && name === '' && user.name) {
    setName(user.name);
  }

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      toast.success(t('saved'));
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('account')}
          </CardTitle>
          <CardDescription>{t('profile')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('account')}
          </CardTitle>
          <CardDescription>{t('profile')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('loginRequired')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          {t('account')}
        </CardTitle>
        <CardDescription>{t('profile')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input id="email" type="email" value={user.email} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">{t('name')}</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('name')}
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t('saving') : t('saveChanges')}
        </Button>
      </CardContent>
    </Card>
  );
}
