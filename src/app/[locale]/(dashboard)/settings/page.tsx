import { Suspense } from "react";
import { User, Bell, Shield, Palette } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTranslations } from 'next-intl/server';

async function SettingsContent() {
  const t = await getTranslations('settingsPage');
  const tCommon = await getTranslations('common');
  
  // TODO: Fetch real user settings from API
  const userEmail = "dev@clipnote.local";
  const userName = "Development User";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('description')}
        </p>
      </div>

      <Separator className="my-6" />

      {/* Account Settings */}
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
            <Input id="email" type="email" value={userEmail} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t('name')}</Label>
            <Input id="name" type="text" defaultValue={userName} placeholder={t('name')} />
          </div>
          <Button>{t('saveChanges')}</Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
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
              <Label htmlFor="email-notifications">{t('notifications')}</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications when AI analysis completes
              </p>
            </div>
            <input type="checkbox" id="email-notifications" defaultChecked className="w-4 h-4" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing">Marketing</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features and events
              </p>
            </div>
            <input type="checkbox" id="marketing" className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
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
              <Label htmlFor="dark-mode">{t('theme')}</Label>
              <p className="text-sm text-muted-foreground">
                Switch to dark theme
              </p>
            </div>
            <input type="checkbox" id="dark-mode" className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
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
              <h4 className="font-medium mb-2">Export Data</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Export all your project data in JSON format
              </p>
              <Button variant="outline">Export Data</Button>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">{t('deleteAccount')}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t('deleteAccountDesc')}
              </p>
              <Button variant="destructive">{t('deleteAccount')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Development Info */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">Development Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs text-muted-foreground font-mono">
            <p>User ID: dev-user-id</p>
            <p>Email: {userEmail}</p>
            <p>Environment: Development</p>
            <p>Database: JSON-DB (.dev-db/)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SettingsPage() {
  const tCommon = await getTranslations('common');
  
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center">{tCommon('loading')}</div>}>
      <SettingsContent />
    </Suspense>
  );
}
