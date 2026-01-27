'use client';

import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SortableItem({
  id,
  children,
  disabled = false,
  className,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && 'opacity-50 z-50',
        className
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// Drag handle component for more precise drag control
interface DragHandleProps {
  className?: string;
  children?: ReactNode;
}

export function DragHandle({ className, children }: DragHandleProps) {
  return (
    <div className={cn('cursor-grab active:cursor-grabbing', className)}>
      {children}
    </div>
  );
}
