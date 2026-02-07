import { Separator } from "@/components/ui/separator";
import { getTranslations } from 'next-intl/server';
import { AccountSettingsCard } from '@/components/settings/account-settings-card';
import { NotificationSettingsCard } from '@/components/settings/notification-settings-card';
import { ThemeSettingsCard } from '@/components/settings/theme-settings-card';
import { DangerZoneCard } from '@/components/settings/danger-zone-card';

export default async function SettingsPage() {
  const t = await getTranslations('settingsPage');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('description')}
        </p>
      </div>

      <Separator className="my-6" />

      {/* Account Settings */}
      <AccountSettingsCard />

      {/* Notification Settings */}
      <NotificationSettingsCard />

      {/* Appearance Settings */}
      <ThemeSettingsCard />

      {/* Privacy & Security */}
      <DangerZoneCard />

      {/* Development Info - only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="border border-dashed rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Development Mode</h3>
          <div className="space-y-1 text-xs text-muted-foreground font-mono">
            <p>Environment: {process.env.NODE_ENV}</p>
            <p>Database: JSON-DB (.dev-db/)</p>
          </div>
        </div>
      )}
    </div>
  );
}
