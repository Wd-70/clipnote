'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { SidebarWithFolders } from './sidebar-with-folders';

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title = 'ClipNote' }: MobileHeaderProps) {
  return (
    <header className="h-14 border-b md:hidden flex items-center px-4 bg-background/50 backdrop-blur-sm sticky top-0 z-40 shrink-0">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarWithFolders className="border-none" />
        </SheetContent>
      </Sheet>
      <div className="font-bold text-lg">{title}</div>
    </header>
  );
}
