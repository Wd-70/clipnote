'use client';

import { useCallback, useMemo, useState } from 'react';

interface UseBulkSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

interface UseBulkSelectionReturn {
  // State
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  selectedCount: number;

  // Actions
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  selectMultiple: (ids: string[]) => void;
  
  // Utilities
  isSelected: (id: string) => boolean;
  getSelectedItems: <T>(items: T[], getId: (item: T) => string) => T[];
  
  // Mode control
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelectionMode: () => void;
}

/**
 * Hook for managing bulk selection of items (projects, folders)
 */
export function useBulkSelection<T>(
  options: UseBulkSelectionOptions<T>
): UseBulkSelectionReturn {
  const { items, getItemId, onSelectionChange } = options;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const selectedCount = selectedIds.size;

  // Update selection and notify
  const updateSelection = useCallback(
    (newSelection: Set<string>) => {
      setSelectedIds(newSelection);
      onSelectionChange?.(newSelection);
    },
    [onSelectionChange]
  );

  // Select a single item
  const select = useCallback(
    (id: string) => {
      const newSelection = new Set(selectedIds);
      newSelection.add(id);
      updateSelection(newSelection);
    },
    [selectedIds, updateSelection]
  );

  // Deselect a single item
  const deselect = useCallback(
    (id: string) => {
      const newSelection = new Set(selectedIds);
      newSelection.delete(id);
      updateSelection(newSelection);
      
      // Exit selection mode if nothing selected
      if (newSelection.size === 0) {
        setIsSelectionMode(false);
      }
    },
    [selectedIds, updateSelection]
  );

  // Toggle selection of a single item
  const toggle = useCallback(
    (id: string) => {
      if (selectedIds.has(id)) {
        deselect(id);
      } else {
        select(id);
        // Enter selection mode when first item is selected
        if (!isSelectionMode) {
          setIsSelectionMode(true);
        }
      }
    },
    [selectedIds, select, deselect, isSelectionMode]
  );

  // Select all items
  const selectAll = useCallback(() => {
    const allIds = items.map(getItemId);
    updateSelection(new Set(allIds));
    setIsSelectionMode(true);
  }, [items, getItemId, updateSelection]);

  // Deselect all items
  const deselectAll = useCallback(() => {
    updateSelection(new Set());
    setIsSelectionMode(false);
  }, [updateSelection]);

  // Select multiple items
  const selectMultiple = useCallback(
    (ids: string[]) => {
      const newSelection = new Set(selectedIds);
      ids.forEach((id) => newSelection.add(id));
      updateSelection(newSelection);
      if (!isSelectionMode && ids.length > 0) {
        setIsSelectionMode(true);
      }
    },
    [selectedIds, updateSelection, isSelectionMode]
  );

  // Check if item is selected
  const isSelected = useCallback(
    (id: string): boolean => selectedIds.has(id),
    [selectedIds]
  );

  // Get selected items from a list
  const getSelectedItems = useCallback(
    <U>(itemList: U[], getId: (item: U) => string): U[] => {
      return itemList.filter((item) => selectedIds.has(getId(item)));
    },
    [selectedIds]
  );

  // Enter selection mode
  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  // Exit selection mode and clear selection
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    updateSelection(new Set());
  }, [updateSelection]);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    if (isSelectionMode) {
      exitSelectionMode();
    } else {
      enterSelectionMode();
    }
  }, [isSelectionMode, enterSelectionMode, exitSelectionMode]);

  return {
    // State
    selectedIds,
    isSelectionMode,
    selectedCount,

    // Actions
    select,
    deselect,
    toggle,
    selectAll,
    deselectAll,
    selectMultiple,

    // Utilities
    isSelected,
    getSelectedItems,

    // Mode control
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectionMode,
  };
}

/**
 * Hook for bulk operations on projects
 */
interface UseBulkProjectActionsOptions {
  selectedIds: Set<string>;
  onSuccess?: (action: 'move' | 'delete', count: number) => void;
  onError?: (error: string) => void;
}

interface UseBulkProjectActionsReturn {
  isProcessing: boolean;
  moveToFolder: (folderId: string | null) => Promise<boolean>;
  deleteSelected: () => Promise<boolean>;
}

export function useBulkProjectActions(
  options: UseBulkProjectActionsOptions
): UseBulkProjectActionsReturn {
  const { selectedIds, onSuccess, onError } = options;
  const [isProcessing, setIsProcessing] = useState(false);

  // Move selected projects to a folder
  const moveToFolder = useCallback(
    async (folderId: string | null): Promise<boolean> => {
      if (selectedIds.size === 0) return false;

      setIsProcessing(true);
      try {
        const res = await fetch('/api/projects/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'move',
            projectIds: Array.from(selectedIds),
            folderId,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to move projects');
        }

        onSuccess?.('move', selectedIds.size);
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to move projects';
        onError?.(message);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedIds, onSuccess, onError]
  );

  // Delete selected projects
  const deleteSelected = useCallback(async (): Promise<boolean> => {
    if (selectedIds.size === 0) return false;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/projects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          projectIds: Array.from(selectedIds),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete projects');
      }

      onSuccess?.('delete', selectedIds.size);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete projects';
      onError?.(message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, onSuccess, onError]);

  return {
    isProcessing,
    moveToFolder,
    deleteSelected,
  };
}
