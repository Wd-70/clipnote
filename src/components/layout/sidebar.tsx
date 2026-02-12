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
  Scissors,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Sidebar({ className, ...props }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tSidebar = useTranslations('sidebar');
  const tCommon = useTranslations('common');
  
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

  // Check if pathname matches, handling locale prefix
  const isActiveRoute = (href: string) => {
    // Remove locale prefix if present (e.g., /en/dashboard -> /dashboard)
    const pathWithoutLocale = pathname.replace(/^\/(ko|en|ja|zh)/, '');
    return pathWithoutLocale === href || pathWithoutLocale.startsWith(href + '/');
  };

  return (
    <div className={cn("pb-12 h-screen", className)} {...props}>
      <div className="py-4 h-full flex flex-col overflow-y-auto">
        {/* Top Section: Logo and Navigation */}
        <div className="px-3 py-2">
          <Link href="/" className="flex items-center pl-2 mb-10 gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Scissors size={18} />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              ClipNote
            </h2>
          </Link>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={isActiveRoute(item.href) ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all",
                  isActiveRoute(item.href)
                    ? "bg-secondary font-medium shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className={cn("h-4 w-4", isActiveRoute(item.href) ? "text-primary" : "")} />
                  {item.title}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        {/* Spacer to push bottom content down */}
        <div className="flex-1"></div>

        {/* Bottom Section: Points and User Info */}
        <div className="px-3 space-y-4">
          <div className="bg-card/50 border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">{tSidebar('currentPoints')}</span>
              <Coins className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">{user.points.toLocaleString()} {tCommon('points')}</div>
            <Button size="sm" className="w-full mt-3 text-xs h-8" variant="outline" asChild>
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
              <p className="text-sm font-medium leading-none truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">{user.email}</p>
            </div>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
