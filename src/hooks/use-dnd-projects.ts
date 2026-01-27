'use client';

import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { IProject } from '@/types';

interface UseDndProjectsOptions {
  projects: IProject[];
  currentFolderId: string | null;
  onReorder: (orderedIds: string[], folderId: string | null) => Promise<boolean>;
  onMoveToFolder: (projectIds: string[], folderId: string | null) => Promise<boolean>;
}

interface UseDndProjectsReturn {
  activeProject: IProject | null;
  overProjectId: string | null;
  overFolderId: string | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
}

export function useDndProjects({
  projects,
  currentFolderId,
  onReorder,
  onMoveToFolder,
}: UseDndProjectsOptions): UseDndProjectsReturn {
  const [activeProject, setActiveProject] = useState<IProject | null>(null);
  const [overProjectId, setOverProjectId] = useState<string | null>(null);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);

  const getProjectById = useCallback(
    (id: string): IProject | undefined => {
      return projects.find((p) => p._id?.toString() === id);
    },
    [projects]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const idStr = active.id as string;
      
      // Check if it's a project (prefixed with 'project-')
      if (idStr.startsWith('project-')) {
        const projectId = idStr.replace('project-', '');
        const project = getProjectById(projectId);
        if (project) {
          setActiveProject(project);
        }
      }
    },
    [getProjectById]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setOverProjectId(null);
        setOverFolderId(null);
        return;
      }

      const overId = over.id as string;
      
      // Check what we're hovering over
      if (overId.startsWith('project-')) {
        setOverProjectId(overId.replace('project-', ''));
        setOverFolderId(null);
      } else if (overId.startsWith('folder-drop-')) {
        setOverFolderId(overId.replace('folder-drop-', ''));
        setOverProjectId(null);
      } else {
        setOverProjectId(null);
        setOverFolderId(null);
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      const wasActiveProject = activeProject;
      setActiveProject(null);
      setOverProjectId(null);
      setOverFolderId(null);

      if (!over || !wasActiveProject) {
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) {
        return;
      }

      // Check if dropping on a folder
      if (overId.startsWith('folder-drop-')) {
        const targetFolderId = overId.replace('folder-drop-', '');
        const folderId = targetFolderId === 'root' ? null : targetFolderId;
        
        // Move project to folder
        const projectId = wasActiveProject._id?.toString();
        if (projectId) {
          await onMoveToFolder([projectId], folderId);
        }
        return;
      }

      // Otherwise, reordering projects
      if (overId.startsWith('project-')) {
        const activeProjectId = activeId.replace('project-', '');
        const overProjectId = overId.replace('project-', '');

        const oldIndex = projects.findIndex(
          (p) => p._id?.toString() === activeProjectId
        );
        const newIndex = projects.findIndex(
          (p) => p._id?.toString() === overProjectId
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(projects, oldIndex, newIndex);
          const orderedIds = newOrder.map((p) => p._id?.toString() ?? '');
          await onReorder(orderedIds, currentFolderId);
        }
      }
    },
    [activeProject, projects, currentFolderId, onReorder, onMoveToFolder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveProject(null);
    setOverProjectId(null);
    setOverFolderId(null);
  }, []);

  return {
    activeProject,
    overProjectId,
    overFolderId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
