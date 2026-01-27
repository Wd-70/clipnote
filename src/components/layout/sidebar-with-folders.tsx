'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  FolderOpen,
  Coins,
  Settings,
  User as UserIcon,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { DroppableFolderTree } from '@/components/folders/droppable-folder-tree';
import { useFolderSidebar } from '@/contexts/folder-sidebar-context';

interface SidebarWithFoldersProps {
  className?: string;
}

export function SidebarWithFolders({ className }: SidebarWithFoldersProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tSidebar = useTranslations('sidebar');
  const tCommon = useTranslations('common');
  const tFolders = useTranslations('folders');

  // Get folder state from context
  const {
    showFolders,
    setShowFolders,
    folderTree,
    currentFolderId,
    expandedIds,
    isFolderLoading,
    onFolderSelect,
    onToggleExpand,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    onMoveFolder,
  } = useFolderSidebar();

  // Check if on projects page
  const pathWithoutLocale = pathname.replace(/^\/(ko|en|ja|zh)/, '');
  const isOnProjectsPage =
    pathWithoutLocale === '/projects' || pathWithoutLocale.startsWith('/projects/');

  // Mock user data
  const user = {
    name: 'ClipUser',
    email: 'user@clipnote.ai',
    points: 1250,
    avatar: '',
  };

  const navItems = [
    {
      title: t('dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: t('projects'),
      href: '/projects',
      icon: FolderOpen,
      hasSubMenu: isOnProjectsPage,
    },
    {
      title: t('points'),
      href: '/points',
      icon: Coins,
    },
    {
      title: t('settings'),
      href: '/settings',
      icon: Settings,
    },
  ];

  const isActiveRoute = (href: string) => {
    const pathWithoutLocale2 = pathname.replace(/^\/(ko|en|ja|zh)/, '');
    return pathWithoutLocale2 === href || pathWithoutLocale2.startsWith(href + '/');
  };

  // Folders View
  if (showFolders && isOnProjectsPage) {
    return (
      <div className={cn('pb-12 h-screen flex flex-col', className)}>
        {/* Header with back button */}
        <div className="px-3 py-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowFolders(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('projects')}
          </Button>
        </div>

        {/* Folder title */}
        <div className="px-5 py-3 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            {tFolders('title')}
          </h2>
        </div>

        {/* Folder tree - takes remaining space */}
        <div className="flex-1 overflow-hidden">
          <DroppableFolderTree
            tree={folderTree}
            currentFolderId={currentFolderId ?? null}
            expandedIds={expandedIds}
            onFolderSelect={(id: string | null) => {
              onFolderSelect?.(id);
            }}
            onToggleExpand={onToggleExpand ?? (() => {})}
            onCreateFolder={onCreateFolder ?? undefined}
            onRenameFolder={onRenameFolder ?? undefined}
            onDeleteFolder={onDeleteFolder ?? undefined}
            onMoveFolder={onMoveFolder ?? undefined}
            isLoading={isFolderLoading}
            className="h-full"
          />
        </div>
      </div>
    );
  }

  // Navigation View (default)
  return (
    <div className={cn('pb-12 h-screen', className)}>
      <div className="py-4 h-full flex flex-col overflow-y-auto">
        {/* Top Section: Logo and Navigation */}
        <div className="px-3 py-2">
          <Link href="/" className="flex items-center pl-2 mb-10 gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              C
            </div>
            <h2 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              ClipNote
            </h2>
          </Link>
          <div className="space-y-1">
            {navItems.map((item) => (
              <div key={item.href}>
                {item.hasSubMenu ? (
                  // Projects item with folder toggle
                  <div className="space-y-1">
                    <Button
                      variant={isActiveRoute(item.href) ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-between gap-3 h-11 transition-all',
                        isActiveRoute(item.href)
                          ? 'bg-secondary font-medium shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      asChild
                    >
                      <Link href={item.href}>
                        <span className="flex items-center gap-3">
                          <item.icon
                            className={cn(
                              'h-4 w-4',
                              isActiveRoute(item.href) ? 'text-primary' : ''
                            )}
                          />
                          {item.title}
                        </span>
                      </Link>
                    </Button>
                    {/* Folder toggle button */}
                    {isActiveRoute(item.href) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between pl-11 h-9 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setShowFolders(true)}
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="h-3.5 w-3.5" />
                          {tFolders('title')}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ) : (
                  // Regular nav item
                  <Button
                    variant={isActiveRoute(item.href) ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3 h-11 transition-all',
                      isActiveRoute(item.href)
                        ? 'bg-secondary font-medium shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      <item.icon
                        className={cn(
                          'h-4 w-4',
                          isActiveRoute(item.href) ? 'text-primary' : ''
                        )}
                      />
                      {item.title}
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Spacer to push bottom content down */}
        <div className="flex-1"></div>

        {/* Bottom Section: Points and User Info */}
        <div className="px-3 space-y-4">
          <div className="bg-card/50 border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {tSidebar('currentPoints')}
              </span>
              <Coins className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">
              {user.points.toLocaleString()} {tCommon('points')}
            </div>
            <Button
              size="sm"
              className="w-full mt-3 text-xs h-8"
              variant="outline"
              asChild
            >
              <Link href="/points/charge">{tSidebar('recharge')}</Link>
            </Button>
          </div>

          <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-md hover:bg-muted/50 transition-colors">
            <Avatar className="h-9 w-9 border">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>
                <UserIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium leading-none truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {user.email}
              </p>
            </div>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
