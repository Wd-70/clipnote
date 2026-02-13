'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users, FolderOpen, Share2, Coins, Database, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminStatCard } from './admin-stat-card';

interface StatsData {
  totalUsers: number;
  totalProjects: number;
  totalSharedProjects: number;
  totalPointsInCirculation: number;
  totalCacheEntries: number;
  usersByRole: Record<string, number>;
  projectsByPlatform: Record<string, number>;
  recentUsers: Array<{
    _id: string;
    email: string;
    name: string;
    role: string;
    points: number;
    createdAt: string;
  }>;
  recentProjects: Array<{
    _id: string;
    title: string;
    platform: string;
    videoId: string;
    isShared: boolean;
    createdAt: string;
  }>;
  newUsersToday: number;
  newProjectsToday: number;
}

export function AdminOverview() {
  const t = useTranslations('admin');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => setStats(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <AdminStatCard
          title={t('stats.totalUsers')}
          value={stats.totalUsers}
          icon={Users}
          trend={stats.newUsersToday > 0 ? `+${stats.newUsersToday}` : undefined}
          description={stats.newUsersToday > 0 ? t('stats.todayNew') : undefined}
        />
        <AdminStatCard
          title={t('stats.totalProjects')}
          value={stats.totalProjects}
          icon={FolderOpen}
          trend={stats.newProjectsToday > 0 ? `+${stats.newProjectsToday}` : undefined}
          description={stats.newProjectsToday > 0 ? t('stats.todayNew') : undefined}
        />
        <AdminStatCard
          title={t('stats.totalShared')}
          value={stats.totalSharedProjects}
          icon={Share2}
        />
        <AdminStatCard
          title={t('stats.totalPoints')}
          value={stats.totalPointsInCirculation}
          icon={Coins}
        />
        <AdminStatCard
          title={t('stats.cacheEntries')}
          value={stats.totalCacheEntries}
          icon={Database}
        />
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('stats.totalUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <Badge key={role} variant="secondary" className="text-sm">
                  {role}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('stats.totalProjects')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.projectsByPlatform).map(([platform, count]) => (
                <Badge key={platform} variant="outline" className="text-sm">
                  {platform}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('stats.recentUsers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.email')}</TableHead>
                  <TableHead>{t('users.role')}</TableHead>
                  <TableHead className="text-right">{t('users.points')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'PRO' ? 'default' : 'secondary'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(user.points || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('stats.recentProjects')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('projects.title')}</TableHead>
                  <TableHead>{t('projects.platform')}</TableHead>
                  <TableHead>{t('projects.shared')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentProjects.map((project) => (
                  <TableRow key={project._id}>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      {project.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{project.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      {project.isShared ? (
                        <Badge variant="default" className="text-xs">
                          <Share2 className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Private</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
