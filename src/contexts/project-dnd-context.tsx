'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ProjectDragOverlay } from '@/components/dashboard/sortable-project-card';
import type { IProject } from '@/types';

interface ProjectDndState {
  activeProject: IProject | null;
  // Handlers registered by projects-content
  registerHandlers: (handlers: DndHandlers) => void;
  unregisterHandlers: () => void;
}

interface DndHandlers {
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  getActiveProject: () => IProject | null;
}

const ProjectDndContext = createContext<ProjectDndState | null>(null);

export function ProjectDndProvider({ children }: { children: ReactNode }) {
  const [handlers, setHandlers] = useState<DndHandlers | null>(null);
  const [activeProject, setActiveProject] = useState<IProject | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const customCollisionDetection = useCallback((args: any) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const folderCollision = pointerCollisions.find((c: any) =>
        c.id.toString().startsWith('folder-drop-')
      );
      if (folderCollision) {
        console.log('✅ Folder collision detected:', folderCollision.id);
        return [folderCollision];
      }
    }
    return closestCenter(args);
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      handlers?.onDragStart(event);
      const project = handlers?.getActiveProject();
      setActiveProject(project ?? null);
    },
    [handlers]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      handlers?.onDragOver(event);
    },
    [handlers]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      handlers?.onDragEnd(event);
      setActiveProject(null);
    },
    [handlers]
  );

  return (
    <ProjectDndContext.Provider
      value={{
        activeProject,
        registerHandlers: setHandlers,
        unregisterHandlers: () => setHandlers(null),
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {children}
        <DragOverlay
          dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}
          style={{ cursor: 'grabbing' }}
        >
          {activeProject && (
            <div style={{ transform: 'translate(288px, 0)' }}>
              <ProjectDragOverlay project={activeProject} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </ProjectDndContext.Provider>
  );
}

export const useProjectDnd = () => {
  const ctx = useContext(ProjectDndContext);
  if (!ctx) throw new Error('useProjectDnd must be within ProjectDndProvider');
  return ctx;
};
