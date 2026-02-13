'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  BrainCircuit,
  Wrench,
  ArrowLeft,
  Scissors,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/layout/theme-toggle';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

const tabs = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'users', icon: Users },
  { id: 'projects', icon: FolderOpen },
  { id: 'cache', icon: BrainCircuit },
  { id: 'tools', icon: Wrench },
] as const;

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const t = useTranslations('admin');
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  return (
    <div className="pb-12 h-screen flex flex-col">
      <div className="py-4 h-full flex flex-col overflow-y-auto">
        {/* Logo */}
        <div className="px-3 py-2">
          <Link
            href="/admin"
            className="flex items-center pl-2 mb-6 gap-2"
            onClick={onNavigate}
          >
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Scissors size={18} />
            </div>
            <h2 className="text-xl font-bold tracking-tight">ClipNote</h2>
            <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
              <Shield className="h-3 w-3 mr-0.5" />
              Admin
            </Badge>
          </Link>

          {/* Navigation */}
          <div className="space-y-1">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-11 transition-all',
                    isActive
                      ? 'bg-secondary font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  asChild
                >
                  <Link
                    href={`/admin?tab=${tab.id}`}
                    onClick={onNavigate}
                  >
                    <tab.icon
                      className={cn(
                        'h-4 w-4',
                        isActive ? 'text-primary' : ''
                      )}
                    />
                    {t(`tabs.${tab.id}`)}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex-1" />

        {/* Bottom */}
        <div className="px-3 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/dashboard" onClick={onNavigate}>
              <ArrowLeft className="h-4 w-4" />
              {t('backToDashboard')}
            </Link>
          </Button>
          <div className="flex justify-end px-2 py-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
