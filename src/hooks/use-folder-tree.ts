'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IFolder } from '@/types';

export interface FolderTreeNode extends IFolder {
  children: FolderTreeNode[];
  isExpanded: boolean;
  projectCount?: number;
}

interface UseFolderTreeOptions {
  initialFolders?: IFolder[];
  projectCountMap?: Map<string | null, number>;
  onError?: (error: string) => void;
}

interface UseFolderTreeReturn {
  // State
  folders: IFolder[];
  tree: FolderTreeNode[];
  isLoading: boolean;
  error: string | null;
  expandedIds: Set<string>;

  // Actions
  fetchFolders: () => Promise<void>;
  createFolder: (data: {
    name: string;
    parentId?: string | null;
    color?: string;
    icon?: string;
  }) => Promise<IFolder | null>;
  updateFolder: (
    id: string,
    data: Partial<Pick<IFolder, 'name' | 'parentId' | 'color' | 'icon'>>
  ) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<boolean>;
  reorderFolders: (
    orderedIds: string[],
    parentId?: string | null
  ) => Promise<boolean>;

  // UI State
  toggleExpanded: (folderId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Utilities
  getFolderById: (id: string) => IFolder | undefined;
  getFolderPath: (id: string) => IFolder[];
  getChildFolders: (parentId: string | null) => IFolder[];
  canMoveToFolder: (
    folderId: string,
    targetParentId: string | null
  ) => boolean;
}

/**
 * Build a tree structure from flat folder array
 */
function buildTree(
  folders: IFolder[],
  expandedIds: Set<string>,
  projectCountMap?: Map<string | null, number>,
  parentId: string | null = null
): FolderTreeNode[] {
  return folders
    .filter((f) => (f.parentId ?? null) === parentId)
    .sort((a, b) => a.order - b.order)
    .map((folder) => {
      const folderId = folder._id?.toString() ?? '';
      return {
        ...folder,
        children: buildTree(folders, expandedIds, projectCountMap, folderId),
        isExpanded: expandedIds.has(folderId),
        projectCount: projectCountMap?.get(folderId) ?? 0,
      };
    });
}

/**
 * Hook for managing folder tree state and operations
 */
export function useFolderTree(
  options: UseFolderTreeOptions = {}
): UseFolderTreeReturn {
  const { initialFolders = [], projectCountMap, onError } = options;

  const [folders, setFolders] = useState<IFolder[]>(initialFolders);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build tree whenever folders, expanded state, or project counts change
  const tree = useMemo(
    () => buildTree(folders, expandedIds, projectCountMap),
    [folders, expandedIds, projectCountMap]
  );

  // Fetch all folders from API
  const fetchFolders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/folders');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch folders');
      }
      const data = await res.json();
      setFolders(data.data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch folders';
      setError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Create a new folder
  const createFolder = useCallback(
    async (data: {
      name: string;
      parentId?: string | null;
      color?: string;
      icon?: string;
    }): Promise<IFolder | null> => {
      try {
        const res = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const resData = await res.json();
          throw new Error(resData.error || 'Failed to create folder');
        }

        const resData = await res.json();
        const newFolder = resData.data as IFolder;

        // Update local state
        setFolders((prev) => [...prev, newFolder]);

        // Auto-expand parent if exists
        if (data.parentId) {
          setExpandedIds((prev) => new Set(prev).add(data.parentId!));
        }

        return newFolder;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create folder';
        setError(message);
        onError?.(message);
        return null;
      }
    },
    [onError]
  );

  // Update a folder
  const updateFolder = useCallback(
    async (
      id: string,
      data: Partial<Pick<IFolder, 'name' | 'parentId' | 'color' | 'icon'>>
    ): Promise<boolean> => {
      try {
        const res = await fetch(`/api/folders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const resData = await res.json();
          throw new Error(resData.error || 'Failed to update folder');
        }

        const resData = await res.json();
        const updatedFolder = resData.data as IFolder;

        // Update local state
        setFolders((prev) =>
          prev.map((f) => (f._id?.toString() === id ? updatedFolder : f))
        );

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update folder';
        setError(message);
        onError?.(message);
        return false;
      }
    },
    [onError]
  );

  // Delete a folder (recursive)
  const deleteFolder = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/folders/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const resData = await res.json();
          throw new Error(resData.error || 'Failed to delete folder');
        }

        // Remove folder and all children from local state
        const idsToRemove = new Set<string>();
        const collectIds = (folderId: string) => {
          idsToRemove.add(folderId);
          folders
            .filter((f) => f.parentId === folderId)
            .forEach((f) => collectIds(f._id?.toString() ?? ''));
        };
        collectIds(id);

        setFolders((prev) =>
          prev.filter((f) => !idsToRemove.has(f._id?.toString() ?? ''))
        );

        // Remove from expanded set
        setExpandedIds((prev) => {
          const next = new Set(prev);
          idsToRemove.forEach((id) => next.delete(id));
          return next;
        });

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete folder';
        setError(message);
        onError?.(message);
        return false;
      }
    },
    [folders, onError]
  );

  // Reorder folders
  const reorderFolders = useCallback(
    async (
      orderedIds: string[],
      parentId?: string | null
    ): Promise<boolean> => {
      try {
        const res = await fetch('/api/folders/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds, parentId }),
        });

        if (!res.ok) {
          const resData = await res.json();
          throw new Error(resData.error || 'Failed to reorder folders');
        }

        // Update local state with new order
        setFolders((prev) => {
          const updated = [...prev];
          orderedIds.forEach((id, index) => {
            const folder = updated.find((f) => f._id?.toString() === id);
            if (folder) {
              folder.order = index;
            }
          });
          return updated;
        });

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to reorder folders';
        setError(message);
        onError?.(message);
        return false;
      }
    },
    [onError]
  );

  // Toggle folder expanded state
  const toggleExpanded = useCallback((folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  // Expand all folders
  const expandAll = useCallback(() => {
    setExpandedIds(new Set(folders.map((f) => f._id?.toString() ?? '')));
  }, [folders]);

  // Collapse all folders
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Get folder by ID
  const getFolderById = useCallback(
    (id: string): IFolder | undefined => {
      return folders.find((f) => f._id?.toString() === id);
    },
    [folders]
  );

  // Get folder path (breadcrumb)
  const getFolderPath = useCallback(
    (id: string): IFolder[] => {
      const path: IFolder[] = [];
      let current = getFolderById(id);

      while (current) {
        path.unshift(current);
        current = current.parentId
          ? getFolderById(current.parentId)
          : undefined;
      }

      return path;
    },
    [getFolderById]
  );

  // Get child folders of a parent
  const getChildFolders = useCallback(
    (parentId: string | null): IFolder[] => {
      return folders
        .filter((f) => (f.parentId ?? null) === parentId)
        .sort((a, b) => a.order - b.order);
    },
    [folders]
  );

  // Check if folder can be moved to target (prevent circular reference)
  const canMoveToFolder = useCallback(
    (folderId: string, targetParentId: string | null): boolean => {
      if (!targetParentId) return true; // Can always move to root
      if (folderId === targetParentId) return false; // Can't move to self

      // Check if target is a descendant of the folder being moved
      const isDescendant = (
        parentId: string,
        checkId: string
      ): boolean => {
        const children = folders.filter(
          (f) => f.parentId === parentId
        );
        for (const child of children) {
          if (child._id?.toString() === checkId) return true;
          if (isDescendant(child._id?.toString() ?? '', checkId)) return true;
        }
        return false;
      };

      return !isDescendant(folderId, targetParentId);
    },
    [folders]
  );

  // Load folders on mount if not provided initially
  useEffect(() => {
    if (initialFolders.length === 0) {
      fetchFolders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    folders,
    tree,
    isLoading,
    error,
    expandedIds,

    // Actions
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,

    // UI State
    toggleExpanded,
    expandAll,
    collapseAll,
    setExpandedIds,

    // Utilities
    getFolderById,
    getFolderPath,
    getChildFolders,
    canMoveToFolder,
  };
}
