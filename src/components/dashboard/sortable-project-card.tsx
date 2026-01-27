'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectCard } from './project-card';
import type { IProject } from '@/types';

interface SortableProjectCardProps {
  project: IProject;
  onDelete?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function SortableProjectCard({
  project,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: SortableProjectCardProps) {
  const projectId = project._id?.toString() ?? '';

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `project-${projectId}`,
    disabled: isSelectionMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'opacity-50 z-50',
        isSelectionMode && 'cursor-pointer'
      )}
      onClick={isSelectionMode ? onToggleSelect : undefined}
    >
      {/* Selection Checkbox (visible in selection mode) */}
      {isSelectionMode && (
        <div
          className={cn(
            'absolute top-2 left-2 z-10 h-5 w-5 rounded border-2 flex items-center justify-center',
            isSelected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-background border-muted-foreground/30'
          )}
        >
          {isSelected && (
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      )}

      {/* Drag Handle (visible on hover, not in selection mode) */}
      {!isSelectionMode && (
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className={cn(
            'absolute top-2 right-2 z-10 h-8 w-8 flex items-center justify-center rounded-md',
            'bg-background/80 backdrop-blur-sm border shadow-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'cursor-grab active:cursor-grabbing hover:bg-accent'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <ProjectCard project={project} onDelete={onDelete} />
    </div>
  );
}

// Drag overlay for project card
interface ProjectDragOverlayProps {
  project: IProject;
}

export function ProjectDragOverlay({ project }: ProjectDragOverlayProps) {
  return (
    <div className="w-72 opacity-90 shadow-2xl rounded-lg overflow-hidden">
      <ProjectCard project={project} />
    </div>
  );
}
