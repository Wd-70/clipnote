import { SidebarWithFolders } from '@/components/layout/sidebar-with-folders';
import { MobileHeader } from '@/components/layout/mobile-header';
import { FolderSidebarProvider } from '@/contexts/folder-sidebar-context';
import { ProjectDndProvider } from '@/contexts/project-dnd-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FolderSidebarProvider>
      <ProjectDndProvider>
        <div className="flex min-h-screen bg-background">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 border-r fixed inset-y-0 z-30 bg-background/50 backdrop-blur-sm">
            <SidebarWithFolders />
          </aside>

          {/* Mobile Layout */}
          <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
            {/* Mobile Header - Client Component to avoid hydration mismatch */}
            <MobileHeader />

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 pt-6">
              <div className="max-w-7xl mx-auto space-y-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ProjectDndProvider>
    </FolderSidebarProvider>
  );
}
