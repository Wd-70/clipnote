'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { FolderIcon } from './folder-icon';
import type { IFolder } from '@/types';

interface DroppableFolderItemProps {
  folder: IFolder;
  isOver?: boolean;
  children?: React.ReactNode;
}

export function DroppableFolderItem({
  folder,
  children,
}: DroppableFolderItemProps) {
  const folderId = folder._id?.toString() ?? '';
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-drop-${folderId}`,
    data: {
      type: 'folder',
      folderId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors rounded-md',
        isOver && 'bg-primary/10 ring-2 ring-primary ring-offset-1'
      )}
    >
      {children}
    </div>
  );
}

// Root drop zone (for moving to "All Projects")
export function DroppableRootZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'folder-drop-root',
    data: {
      type: 'root',
      folderId: null,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors rounded-md',
        isOver && 'bg-primary/10 ring-2 ring-primary ring-offset-1'
      )}
    >
      {children}
    </div>
  );
}
