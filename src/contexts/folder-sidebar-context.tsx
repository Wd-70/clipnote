'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { FolderTreeNode } from '@/hooks/use-folder-tree';
import type { IFolder } from '@/types';

interface FolderSidebarState {
  // Toggle state
  showFolders: boolean;
  setShowFolders: (show: boolean) => void;
  toggleFolders: () => void;

  // Folder data (set by projects page, used by sidebar)
  folderTree: FolderTreeNode[];
  setFolderTree: (tree: FolderTreeNode[]) => void;
  
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  
  expandedIds: Set<string>;
  setExpandedIds: (ids: Set<string>) => void;
  
  isFolderLoading: boolean;
  setIsFolderLoading: (loading: boolean) => void;

  // Callbacks (set by projects page)
  onFolderSelect: ((id: string | null) => void) | null;
  setOnFolderSelect: (fn: ((id: string | null) => void) | null) => void;
  
  onToggleExpand: ((id: string) => void) | null;
  setOnToggleExpand: (fn: ((id: string) => void) | null) => void;
  
  onCreateFolder: ((parentId: string | null) => void) | null;
  setOnCreateFolder: (fn: ((parentId: string | null) => void) | null) => void;
  
  onRenameFolder: ((folder: IFolder) => void) | null;
  setOnRenameFolder: (fn: ((folder: IFolder) => void) | null) => void;
  
  onDeleteFolder: ((folder: IFolder) => void) | null;
  setOnDeleteFolder: (fn: ((folder: IFolder) => void) | null) => void;
  
  onMoveFolder: ((folder: IFolder) => void) | null;
  setOnMoveFolder: (fn: ((folder: IFolder) => void) | null) => void;
}

const FolderSidebarContext = createContext<FolderSidebarState | null>(null);

export function FolderSidebarProvider({ children }: { children: ReactNode }) {
  const [showFolders, setShowFolders] = useState(false);
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isFolderLoading, setIsFolderLoading] = useState(false);

  // Callbacks
  const [onFolderSelect, setOnFolderSelect] = useState<((id: string | null) => void) | null>(null);
  const [onToggleExpand, setOnToggleExpand] = useState<((id: string) => void) | null>(null);
  const [onCreateFolder, setOnCreateFolder] = useState<((parentId: string | null) => void) | null>(null);
  const [onRenameFolder, setOnRenameFolder] = useState<((folder: IFolder) => void) | null>(null);
  const [onDeleteFolder, setOnDeleteFolder] = useState<((folder: IFolder) => void) | null>(null);
  const [onMoveFolder, setOnMoveFolder] = useState<((folder: IFolder) => void) | null>(null);

  const toggleFolders = useCallback(() => {
    setShowFolders((prev) => !prev);
  }, []);

  return (
    <FolderSidebarContext.Provider
      value={{
        showFolders,
        setShowFolders,
        toggleFolders,
        folderTree,
        setFolderTree,
        currentFolderId,
        setCurrentFolderId,
        expandedIds,
        setExpandedIds,
        isFolderLoading,
        setIsFolderLoading,
        onFolderSelect,
        setOnFolderSelect,
        onToggleExpand,
        setOnToggleExpand,
        onCreateFolder,
        setOnCreateFolder,
        onRenameFolder,
        setOnRenameFolder,
        onDeleteFolder,
        setOnDeleteFolder,
        onMoveFolder,
        setOnMoveFolder,
      }}
    >
      {children}
    </FolderSidebarContext.Provider>
  );
}

export function useFolderSidebar() {
  const context = useContext(FolderSidebarContext);
  if (!context) {
    throw new Error('useFolderSidebar must be used within FolderSidebarProvider');
  }
  return context;
}

// Hook for checking if we're on projects page (to show folder toggle in sidebar)
export function useIsProjectsPage() {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname;
  const pathWithoutLocale = pathname.replace(/^\/(ko|en|ja|zh)/, '');
  return pathWithoutLocale === '/projects' || pathWithoutLocale.startsWith('/projects/');
}
