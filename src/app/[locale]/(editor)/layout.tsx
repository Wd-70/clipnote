import { SidebarWithFolders } from '@/components/layout/sidebar-with-folders';
import { MobileHeader } from '@/components/layout/mobile-header';
import { FolderSidebarSync } from '@/components/layout/folder-sidebar-sync';
import { FolderSidebarProvider } from '@/contexts/folder-sidebar-context';
import { ProjectDndProvider } from '@/contexts/project-dnd-context';

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FolderSidebarProvider>
      <ProjectDndProvider>
        {/* Sync folder data to sidebar context for navigation */}
        <FolderSidebarSync />
        <div className="flex min-h-screen lg:h-screen bg-background">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 border-r fixed inset-y-0 z-30 bg-background/50 backdrop-blur-sm">
            <SidebarWithFolders />
          </aside>

          {/* Main Layout */}
          <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300 lg:h-screen lg:overflow-hidden">
            {/* Mobile Header with menu - Client Component to avoid hydration mismatch */}
            <MobileHeader />

            {/* Editor Content - no max-width constraint, minimal padding */}
            <main
              className="flex-1 flex flex-col lg:min-h-0 lg:overflow-auto"
              style={{ scrollbarGutter: 'stable' }}
            >
              {children}
            </main>
          </div>
        </div>
      </ProjectDndProvider>
    </FolderSidebarProvider>
  );
}
