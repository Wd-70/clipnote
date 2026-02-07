'use client';

import { Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function ThemeSettingsCard() {
  const t = useTranslations('settingsPage');
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          {t('theme')}
        </CardTitle>
        <CardDescription>{t('preferences')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="dark-mode">{t('darkMode')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('darkModeDesc')}
            </p>
          </div>
          <Switch
            id="dark-mode"
            checked={isDark}
            onCheckedChange={handleThemeChange}
            disabled={!mounted}
          />
        </div>
      </CardContent>
    </Card>
  );
}
