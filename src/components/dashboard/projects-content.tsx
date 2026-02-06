'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { ProjectCard } from '@/components/dashboard/project-card';
import { SortableProjectCard } from '@/components/dashboard/sortable-project-card';
import { EmptyState } from '@/components/dashboard/empty-state';
import { NewProjectDialog } from '@/components/dashboard/new-project-dialog';
import { useProjectDnd } from '@/contexts/project-dnd-context';
import {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

import {
  FolderTree,
  FolderBreadcrumb,
  CreateFolderDialog,
  EditFolderDialog,
  DeleteFolderDialog,
  MoveFolderDialog,
  MoveToFolderDialog,
  BulkActionBar,
  ProjectsToolbar,
} from '@/components/folders';
import { DroppableFolderTree } from '@/components/folders/droppable-folder-tree';

import { useFolderTree } from '@/hooks/use-folder-tree';
import { useFolderNavigation, useProjectFilter } from '@/hooks/use-folder-navigation';
import { useBulkSelection, useBulkProjectActions } from '@/hooks/use-bulk-selection';
import { useFolderSidebar } from '@/contexts/folder-sidebar-context';
import type { IProject, IFolder } from '@/types';

interface ProjectsContentProps {
  initialProjects?: IProject[];
}

export function ProjectsContent({ initialProjects = [] }: ProjectsContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('projects');
  const tFolders = useTranslations('folders');
  const tBulk = useTranslations('bulk');
  const tDashboard = useTranslations('dashboard');

  // Get folder ID from URL query parameter
  const folderIdFromUrl = searchParams.get('folder');

  // Projects state
  const [projects, setProjects] = useState<IProject[]>(initialProjects);
  const [isLoadingProjects, setIsLoadingProjects] = useState(initialProjects.length === 0);

  // Folder tree hook
  const folderTree = useFolderTree({
    onError: (error) => toast.error(error),
  });

  // Navigation hook
  const navigation = useFolderNavigation({
    folders: folderTree.folders,
    initialFolderId: folderIdFromUrl,
    initialSort: 'created-desc',
    initialView: 'grid',
  });

  // Sync URL folder parameter to navigation state (URL -> state)
  useEffect(() => {
    if (folderIdFromUrl !== navigation.currentFolderId) {
      navigation.navigateTo(folderIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderIdFromUrl]);

  // Sync navigation state to URL (state -> URL)
  useEffect(() => {
    const currentUrlFolderId = searchParams.get('folder');
    if (navigation.currentFolderId !== currentUrlFolderId) {
      const params = new URLSearchParams(searchParams.toString());
      if (navigation.currentFolderId) {
        params.set('folder', navigation.currentFolderId);
      } else {
        params.delete('folder');
      }
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation.currentFolderId]);

  // Project filter
  const projectFilter = useProjectFilter({
    folderId: navigation.currentFolderId,
    sortOption: navigation.sortOption,
  });

  // Bulk selection
  const bulkSelection = useBulkSelection({
    items: projects,
    getItemId: (p) => p._id?.toString() ?? '',
  });

  // Bulk actions
  const bulkActions = useBulkProjectActions({
    selectedIds: bulkSelection.selectedIds,
    onSuccess: (action, count) => {
      if (action === 'move') {
        toast.success(tBulk('moved', { count }));
      } else if (action === 'delete') {
        toast.success(tBulk('deleted', { count }));
      }
      bulkSelection.deselectAll();
      fetchProjects();
    },
    onError: (error) => toast.error(error),
  });

  // Folder sidebar context (sync state for sidebar folder view)
  const folderSidebar = useFolderSidebar();

  // Sync folder state to context (for sidebar to display)
  useEffect(() => {
    folderSidebar.setFolderTree(folderTree.tree);
  }, [folderTree.tree]);

  useEffect(() => {
    folderSidebar.setCurrentFolderId(navigation.currentFolderId);
  }, [navigation.currentFolderId]);

  useEffect(() => {
    folderSidebar.setExpandedIds(folderTree.expandedIds);
  }, [folderTree.expandedIds]);

  useEffect(() => {
    folderSidebar.setIsFolderLoading(folderTree.isLoading);
  }, [folderTree.isLoading]);

  // Set callbacks for sidebar folder actions
  useEffect(() => {
    folderSidebar.setOnFolderSelect(() => navigation.navigateTo);
    folderSidebar.setOnToggleExpand(() => folderTree.toggleExpanded);
    folderSidebar.setOnCreateFolder(() => (parentId: string | null) => {
      // If parentId is null (clicking "New Folder"), default to current folder
      setCreateFolderParentId(parentId ?? navigation.currentFolderId);
      setCreateFolderOpen(true);
    });
    folderSidebar.setOnRenameFolder(() => setEditFolderTarget);
    folderSidebar.setOnDeleteFolder(() => setDeleteFolderTarget);
    folderSidebar.setOnMoveFolder(() => setMoveFolderTarget);

    return () => {
      // Cleanup callbacks on unmount
      folderSidebar.setOnFolderSelect(null);
      folderSidebar.setOnToggleExpand(null);
      folderSidebar.setOnCreateFolder(null);
      folderSidebar.setOnRenameFolder(null);
      folderSidebar.setOnDeleteFolder(null);
      folderSidebar.setOnMoveFolder(null);
    };
  }, [navigation.navigateTo, navigation.currentFolderId, folderTree.toggleExpanded]);

  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [editFolderTarget, setEditFolderTarget] = useState<IFolder | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<IFolder | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<IFolder | null>(null);
  const [moveProjectsOpen, setMoveProjectsOpen] = useState(false);
  const [mobileFolderOpen, setMobileFolderOpen] = useState(false);

  // DnD state for projects
  const [activeProject, setActiveProject] = useState<IProject | null>(null);
  const { registerHandlers, unregisterHandlers } = useProjectDnd();

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const params = new URLSearchParams();
      if (navigation.currentFolderId) {
        params.set('folderId', navigation.currentFolderId);
      }
      params.set('sort', navigation.sortOption);

      const response = await fetch(`/api/projects?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [navigation.currentFolderId, navigation.sortOption]);

  // Refetch when folder or sort changes
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handler for creating folder
  const handleCreateFolder = useCallback(
    async (data: { name: string; parentId?: string | null; color?: string }) => {
      const result = await folderTree.createFolder(data);
      if (result) {
        toast.success(tFolders('created'));
      }
      return result;
    },
    [folderTree, tFolders]
  );

  // Handler for editing folder (name and color)
  const handleEditFolder = useCallback(
    async (id: string, data: { name: string; color?: string }) => {
      const success = await folderTree.updateFolder(id, data);
      if (success) {
        toast.success(tFolders('updated'));
      }
      return success;
    },
    [folderTree, tFolders]
  );

  // Handler for deleting folder
  const handleDeleteFolder = useCallback(
    async (id: string) => {
      const success = await folderTree.deleteFolder(id);
      if (success) {
        toast.success(tFolders('deleted'));
        // If we deleted the current folder, navigate to root
        if (navigation.currentFolderId === id) {
          navigation.navigateToRoot();
        }
      }
      return success;
    },
    [folderTree, tFolders, navigation]
  );

  // Handler for moving folder
  const handleMoveFolder = useCallback(
    async (id: string, newParentId: string | null) => {
      const success = await folderTree.updateFolder(id, { parentId: newParentId });
      if (success) {
        toast.success(tFolders('moved'));
      }
      return success;
    },
    [folderTree, tFolders]
  );

  // Count projects in delete target folder
  const deleteFolderProjectCount = deleteFolderTarget
    ? projects.filter((p) => p.folderId === deleteFolderTarget._id?.toString()).length
    : 0;

  // Filter projects by current folder
  const filteredProjects = navigation.currentFolderId
    ? projects.filter((p) => p.folderId === navigation.currentFolderId)
    : projects.filter((p) => !p.folderId);

  // Sort projects
  const sortedProjects = [...filteredProjects].sort(projectFilter.sortComparator);

  // Project IDs for sortable context
  const projectIds = sortedProjects.map((p) => `project-${p._id?.toString()}`);

  // DnD handlers for projects
  const handleProjectDragStart = useCallback(
    (event: DragStartEvent): IProject | null => {
      const idStr = event.active.id as string;
      if (idStr.startsWith('project-')) {
        const projectId = idStr.replace('project-', '');
        const project = sortedProjects.find((p) => p._id?.toString() === projectId);
        if (project) {
          setActiveProject(project);
          return project;
        }
      }
      return null;
    },
    [sortedProjects]
  );

  const handleProjectDragOver = useCallback(
    (_event: DragOverEvent) => {
      // Visual feedback is handled by droppable isOver state
    },
    []
  );

  const handleProjectDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveProject(null);

      if (!over) {
        return;
      }

      const activeId = (active.id as string).replace('project-', '');
      const overId = over.id as string;

      // Check if dropping on a folder
      if (overId.startsWith('folder-drop-')) {
        const targetFolderId = overId === 'folder-drop-root' 
          ? null 
          : overId.replace('folder-drop-', '');

        // Move project to folder
        try {
          const response = await fetch('/api/projects/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'move',
              projectIds: [activeId],
              folderId: targetFolderId,
            }),
          });

          if (response.ok) {
            toast.success(tBulk('moved', { count: 1 }));
            fetchProjects();
          } else {
            toast.error('Failed to move project');
          }
        } catch (error) {
          toast.error('Failed to move project');
        }
        return;
      }

      // Otherwise, reordering projects
      if (active.id === over.id) {
        return;
      }

      const overProjectId = overId.replace('project-', '');
      const oldIndex = sortedProjects.findIndex((p) => p._id?.toString() === activeId);
      const newIndex = sortedProjects.findIndex((p) => p._id?.toString() === overProjectId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedProjects, oldIndex, newIndex);
        const orderedIds = newOrder.map((p) => p._id?.toString() ?? '');

        // Optimistically update local state with new order values
        setProjects((prev) => {
          // Update order field for reordered projects
          const reorderedWithNewOrder = newOrder.map((p, index) => ({
            ...p,
            order: index,
          }));
          
          const otherProjects = prev.filter(
            (p) => !orderedIds.includes(p._id?.toString() ?? '')
          );
          return [...otherProjects, ...reorderedWithNewOrder];
        });

        // Call API to persist order
        try {
          const response = await fetch('/api/projects/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectIds: orderedIds,
              folderId: navigation.currentFolderId,
            }),
          });

          if (!response.ok) {
            // Revert on failure
            fetchProjects();
            toast.error('Failed to reorder projects');
          }
        } catch (error) {
          fetchProjects();
          toast.error('Failed to reorder projects');
        }
      }
    },
    [sortedProjects, navigation.currentFolderId, fetchProjects, tBulk]
  );

  // Register DnD handlers
  useEffect(() => {
    registerHandlers({
      onDragStart: handleProjectDragStart,
      onDragOver: handleProjectDragOver,
      onDragEnd: handleProjectDragEnd,
    });
    return () => unregisterHandlers();
  }, [handleProjectDragStart, handleProjectDragOver, handleProjectDragEnd, registerHandlers, unregisterHandlers]);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {/* Mobile folder button (only on mobile - md-3xl uses sidebar toggle) */}
               <Sheet open={mobileFolderOpen} onOpenChange={setMobileFolderOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden shrink-0">
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                 <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>{tFolders('title')}</SheetTitle>
                  </SheetHeader>
                  <DroppableFolderTree
                    tree={folderTree.tree}
                    currentFolderId={navigation.currentFolderId}
                    expandedIds={folderTree.expandedIds}
                    onFolderSelect={(id) => {
                      navigation.navigateTo(id);
                      setMobileFolderOpen(false);
                    }}
                    onToggleExpand={folderTree.toggleExpanded}
                    onCreateFolder={(parentId) => {
                      // If parentId is null (clicking "New Folder"), default to current folder
                      setCreateFolderParentId(parentId ?? navigation.currentFolderId);
                      setCreateFolderOpen(true);
                      setMobileFolderOpen(false);
                    }}
                    onRenameFolder={(folder) => {
                      setEditFolderTarget(folder);
                      setMobileFolderOpen(false);
                    }}
                    onDeleteFolder={(folder) => {
                      setDeleteFolderTarget(folder);
                      setMobileFolderOpen(false);
                    }}
                    onMoveFolder={(folder) => {
                      setMoveFolderTarget(folder);
                      setMobileFolderOpen(false);
                    }}
                    isLoading={folderTree.isLoading}
                    className="h-[calc(100vh-120px)]"
                  />
                </SheetContent>
              </Sheet>

              <h1 className="text-2xl font-bold tracking-tight truncate">
                {t('title')}
              </h1>
            </div>

            {/* Breadcrumb */}
            {navigation.breadcrumbs.length > 1 && (
              <FolderBreadcrumb
                breadcrumbs={navigation.breadcrumbs}
                onNavigate={navigation.navigateTo}
                className="mb-2"
              />
            )}

            <p className="text-sm text-muted-foreground">
              {t('totalProjects', { count: sortedProjects.length })}
            </p>
          </div>

          <NewProjectDialog onProjectCreated={fetchProjects} folderId={navigation.currentFolderId} />
        </div>

        <Separator />

        {/* Toolbar */}
        <ProjectsToolbar
          sortOption={navigation.sortOption}
          onSortChange={navigation.setSortOption}
          viewMode={navigation.viewMode}
          onViewModeChange={navigation.setViewMode}
          isSelectionMode={bulkSelection.isSelectionMode}
          onToggleSelectionMode={bulkSelection.toggleSelectionMode}
        />

        {/* Projects Grid/List with DnD */}
        {isLoadingProjects ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        ) : sortedProjects.length > 0 ? (
          <SortableContext items={projectIds} strategy={rectSortingStrategy}>
            <div
              className={
                navigation.viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-3'
              }
            >
              {sortedProjects.map((project) => (
                <SortableProjectCard
                  key={project._id?.toString()}
                  project={project}
                  onDelete={fetchProjects}
                  isSelectionMode={bulkSelection.isSelectionMode}
                  isSelected={bulkSelection.isSelected(project._id?.toString() ?? '')}
                  onToggleSelect={() => bulkSelection.toggle(project._id?.toString() ?? '')}
                />
              ))}
            </div>
          </SortableContext>
        ) : (
          <EmptyState
            action={
              <NewProjectDialog onProjectCreated={fetchProjects} folderId={navigation.currentFolderId}>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  {tDashboard('createFirst')}
                </Button>
              </NewProjectDialog>
            }
          />
        )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={bulkSelection.selectedCount}
        isVisible={bulkSelection.isSelectionMode && bulkSelection.selectedCount > 0}
        onSelectAll={bulkSelection.selectAll}
        onDeselectAll={bulkSelection.deselectAll}
        onMoveToFolder={() => setMoveProjectsOpen(true)}
        onDelete={async () => {
          if (confirm(tBulk('deleteConfirm'))) {
            await bulkActions.deleteSelected();
          }
        }}
        isProcessing={bulkActions.isProcessing}
        totalCount={sortedProjects.length}
      />

      {/* Dialogs */}
      <CreateFolderDialog
        folders={folderTree.folders}
        defaultParentId={createFolderParentId}
        onCreateFolder={handleCreateFolder}
        open={createFolderOpen}
        onOpenChange={(open) => {
          setCreateFolderOpen(open);
          if (!open) setCreateFolderParentId(null);
        }}
      />

      <EditFolderDialog
        folder={editFolderTarget}
        open={!!editFolderTarget}
        onOpenChange={(open) => !open && setEditFolderTarget(null)}
        onSave={handleEditFolder}
      />

      <DeleteFolderDialog
        folder={deleteFolderTarget}
        projectCount={deleteFolderProjectCount}
        open={!!deleteFolderTarget}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
        onDelete={handleDeleteFolder}
      />

      <MoveFolderDialog
        folder={moveFolderTarget}
        folders={folderTree.folders}
        open={!!moveFolderTarget}
        onOpenChange={(open) => !open && setMoveFolderTarget(null)}
        onMove={handleMoveFolder}
        canMoveToFolder={folderTree.canMoveToFolder}
      />

      <MoveToFolderDialog
        folders={folderTree.folders}
        selectedCount={bulkSelection.selectedCount}
        open={moveProjectsOpen}
        onOpenChange={setMoveProjectsOpen}
        onMove={async (folderId) => {
          const success = await bulkActions.moveToFolder(folderId);
          return success;
        }}
      />
    </div>
  );
}
