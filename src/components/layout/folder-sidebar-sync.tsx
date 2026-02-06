'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFolderTree } from '@/hooks/use-folder-tree';
import { useFolderSidebar } from '@/contexts/folder-sidebar-context';

/**
 * Component that syncs folder tree data to the sidebar context.
 * Used in editor layout to provide folder navigation without projects-content.
 * Renders nothing - just syncs data.
 */
export function FolderSidebarSync() {
  const router = useRouter();
  const folderSidebar = useFolderSidebar();

  // Fetch folder tree
  const folderTree = useFolderTree();

  // Sync folder tree to context
  useEffect(() => {
    folderSidebar.setFolderTree(folderTree.tree);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderTree.tree]);

  useEffect(() => {
    folderSidebar.setExpandedIds(folderTree.expandedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderTree.expandedIds]);

  useEffect(() => {
    folderSidebar.setIsFolderLoading(folderTree.isLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderTree.isLoading]);

  // Set callbacks for folder actions
  useEffect(() => {
    // When folder is selected in editor mode, navigate to projects page with that folder
    folderSidebar.setOnFolderSelect(() => (id: string | null) => {
      if (id) {
        router.push(`/projects?folder=${id}`);
      } else {
        router.push('/projects');
      }
      folderSidebar.setShowFolders(false);
    });

    folderSidebar.setOnToggleExpand(() => folderTree.toggleExpanded);

    // Folder management actions - navigate to projects page
    // These are disabled in editor mode (read-only folder navigation)
    folderSidebar.setOnCreateFolder(null);
    folderSidebar.setOnRenameFolder(null);
    folderSidebar.setOnDeleteFolder(null);
    folderSidebar.setOnMoveFolder(null);

    return () => {
      // Cleanup callbacks on unmount
      folderSidebar.setOnFolderSelect(null);
      folderSidebar.setOnToggleExpand(null);
    };
  }, [router, folderTree.toggleExpanded]);

  // This component renders nothing
  return null;
}
