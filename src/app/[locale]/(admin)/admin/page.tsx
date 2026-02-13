'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminOverview } from '@/components/admin/admin-overview';
import { AdminUsers } from '@/components/admin/admin-users';
import { AdminProjects } from '@/components/admin/admin-projects';
import { AdminCache } from '@/components/admin/admin-cache';
import { AdminTools } from '@/components/admin/admin-tools';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const t = useTranslations('admin');
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (value: string) => {
    router.push(`/admin?tab=${value}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
          <TabsTrigger value="projects">{t('tabs.projects')}</TabsTrigger>
          <TabsTrigger value="cache">{t('tabs.cache')}</TabsTrigger>
          <TabsTrigger value="tools">{t('tabs.tools')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AdminOverview />
        </TabsContent>
        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>
        <TabsContent value="projects">
          <AdminProjects />
        </TabsContent>
        <TabsContent value="cache">
          <AdminCache />
        </TabsContent>
        <TabsContent value="tools">
          <AdminTools />
        </TabsContent>
      </Tabs>
    </div>
  );
}
