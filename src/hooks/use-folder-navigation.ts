'use client';

import { useCallback, useMemo, useState } from 'react';
import type { IFolder } from '@/types';

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'created-asc'
  | 'created-desc'
  | 'manual';

export type ViewMode = 'grid' | 'list';

interface UseFolderNavigationOptions {
  folders: IFolder[];
  initialFolderId?: string | null;
  initialSort?: SortOption;
  initialView?: ViewMode;
  onNavigate?: (folderId: string | null) => void;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
  depth: number;
}

interface UseFolderNavigationReturn {
  // Current state
  currentFolderId: string | null;
  currentFolder: IFolder | null;
  breadcrumbs: BreadcrumbItem[];
  
  // View settings
  sortOption: SortOption;
  viewMode: ViewMode;
  
  // Navigation actions
  navigateTo: (folderId: string | null) => void;
  navigateToRoot: () => void;
  navigateUp: () => void;
  navigateToBreadcrumb: (index: number) => void;
  
  // View settings actions
  setSortOption: (option: SortOption) => void;
  setViewMode: (mode: ViewMode) => void;
  
  // Utilities
  canNavigateUp: boolean;
  isAtRoot: boolean;
  getCurrentDepth: () => number;
}

/**
 * Hook for managing folder navigation state (current folder, breadcrumbs, sorting, view mode)
 */
export function useFolderNavigation(
  options: UseFolderNavigationOptions
): UseFolderNavigationReturn {
  const {
    folders,
    initialFolderId = null,
    initialSort = 'created-desc',
    initialView = 'grid',
    onNavigate,
  } = options;

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    initialFolderId
  );
  const [sortOption, setSortOption] = useState<SortOption>(initialSort);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  // Get folder by ID
  const getFolderById = useCallback(
    (id: string | null): IFolder | null => {
      if (!id) return null;
      return folders.find((f) => f._id?.toString() === id) ?? null;
    },
    [folders]
  );

  // Current folder object
  const currentFolder = useMemo(
    () => getFolderById(currentFolderId),
    [currentFolderId, getFolderById]
  );

  // Build breadcrumb path
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const path: BreadcrumbItem[] = [
      { id: null, name: 'All Projects', depth: -1 },
    ];

    if (!currentFolderId) return path;

    // Build path from root to current folder
    const buildPath = (folderId: string): BreadcrumbItem[] => {
      const folder = getFolderById(folderId);
      if (!folder) return [];

      const parentPath = folder.parentId
        ? buildPath(folder.parentId)
        : [];

      return [
        ...parentPath,
        {
          id: folder._id?.toString() ?? null,
          name: folder.name,
          depth: folder.depth,
        },
      ];
    };

    return [...path, ...buildPath(currentFolderId)];
  }, [currentFolderId, getFolderById]);

  // Navigation actions
  const navigateTo = useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId);
      onNavigate?.(folderId);
    },
    [onNavigate]
  );

  const navigateToRoot = useCallback(() => {
    navigateTo(null);
  }, [navigateTo]);

  const navigateUp = useCallback(() => {
    if (!currentFolder) return;
    navigateTo(currentFolder.parentId ?? null);
  }, [currentFolder, navigateTo]);

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      const breadcrumb = breadcrumbs[index];
      if (breadcrumb) {
        navigateTo(breadcrumb.id);
      }
    },
    [breadcrumbs, navigateTo]
  );

  // Computed values
  const canNavigateUp = currentFolderId !== null;
  const isAtRoot = currentFolderId === null;

  const getCurrentDepth = useCallback((): number => {
    return currentFolder?.depth ?? -1;
  }, [currentFolder]);

  return {
    // Current state
    currentFolderId,
    currentFolder,
    breadcrumbs,

    // View settings
    sortOption,
    viewMode,

    // Navigation actions
    navigateTo,
    navigateToRoot,
    navigateUp,
    navigateToBreadcrumb,

    // View settings actions
    setSortOption,
    setViewMode,

    // Utilities
    canNavigateUp,
    isAtRoot,
    getCurrentDepth,
  };
}

/**
 * Hook for filtering and sorting projects within a folder
 */
interface UseProjectFilterOptions {
  folderId: string | null;
  sortOption: SortOption;
}

export function useProjectFilter(options: UseProjectFilterOptions) {
  const { folderId, sortOption } = options;

  // Build query params for API call
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (folderId === null) {
      // Root level - can optionally show uncategorized only
      // params.set('uncategorized', 'true');
    } else {
      params.set('folderId', folderId);
    }

    params.set('sort', sortOption);
    
    return params.toString();
  }, [folderId, sortOption]);

  // Sort comparator function for client-side sorting
  const sortComparator = useCallback(
    <T extends { title: string; createdAt: Date | string; order?: number }>(
      a: T,
      b: T
    ): number => {
      switch (sortOption) {
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'created-asc':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case 'created-desc':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'manual':
          return (a.order ?? 0) - (b.order ?? 0);
        default:
          return 0;
      }
    },
    [sortOption]
  );

  return {
    queryParams,
    sortComparator,
  };
}
