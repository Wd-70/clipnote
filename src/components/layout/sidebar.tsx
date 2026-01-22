'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Coins, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ChevronsLeft
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/layout/theme-toggle';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Sidebar({ className, ...props }: SidebarProps) {
  const pathname = usePathname();
  
  // Mock user data
  const user = {
    name: '김클립',
    email: 'user@clipnote.ai',
    points: 1250,
    avatar: '', // Placeholder for avatar URL
  };

  const navItems = [
    {
      title: '대시보드',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: '내 프로젝트',
      href: '/projects',
      icon: FolderOpen,
    },
    {
      title: '포인트',
      href: '/points',
      icon: Coins,
    },
    {
      title: '설정',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <div className={cn("pb-12 min-h-screen", className)} {...props}>
      <div className="space-y-4 py-4 h-full flex flex-col">
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
              <Button
                key={item.href}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all",
                  pathname === item.href 
                    ? "bg-secondary font-medium shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className={cn("h-4 w-4", pathname === item.href ? "text-primary" : "")} />
                  {item.title}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-auto px-3">
          <div className="bg-card/50 border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">보유 포인트</span>
              <Coins className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">{user.points.toLocaleString()} P</div>
            <Button size="sm" className="w-full mt-3 text-xs h-8" variant="outline" asChild>
              <Link href="/points/charge">충전하기</Link>
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
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
