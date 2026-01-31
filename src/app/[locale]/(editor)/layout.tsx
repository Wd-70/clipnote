import { SidebarWithFolders } from '@/components/layout/sidebar-with-folders';
import { FolderSidebarProvider } from '@/contexts/folder-sidebar-context';
import { ProjectDndProvider } from '@/contexts/project-dnd-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FolderSidebarProvider>
      <ProjectDndProvider>
        <div className="flex min-h-screen lg:h-screen bg-background">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 border-r fixed inset-y-0 z-30 bg-background/50 backdrop-blur-sm">
            <SidebarWithFolders />
          </aside>

          {/* Main Layout */}
          <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300 lg:h-screen lg:overflow-hidden">
            {/* Mobile Header with menu */}
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
              <div className="font-bold text-lg">ClipNote</div>
            </header>

            {/* Editor Content - no max-width constraint, minimal padding */}
            <main className="flex-1 flex flex-col min-h-0 lg:overflow-hidden">
              {children}
            </main>
          </div>
        </div>
      </ProjectDndProvider>
    </FolderSidebarProvider>
  );
}
