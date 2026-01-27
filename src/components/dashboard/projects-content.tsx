'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { EmptyState } from '@/components/dashboard/empty-state';
import { NewProjectDialog } from '@/components/dashboard/new-project-dialog';

import {
  FolderTree,
  FolderBreadcrumb,
  CreateFolderDialog,
  RenameFolderDialog,
  DeleteFolderDialog,
  MoveFolderDialog,
  MoveToFolderDialog,
  BulkActionBar,
  ProjectsToolbar,
} from '@/components/folders';

import { useFolderTree } from '@/hooks/use-folder-tree';
import { useFolderNavigation, useProjectFilter } from '@/hooks/use-folder-navigation';
import { useBulkSelection, useBulkProjectActions } from '@/hooks/use-bulk-selection';
import type { IProject, IFolder } from '@/types';

interface ProjectsContentProps {
  initialProjects?: IProject[];
}

export function ProjectsContent({ initialProjects = [] }: ProjectsContentProps) {
  const router = useRouter();
  const t = useTranslations('projects');
  const tFolders = useTranslations('folders');
  const tBulk = useTranslations('bulk');
  const tDashboard = useTranslations('dashboard');

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
    initialSort: 'created-desc',
    initialView: 'grid',
  });

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

  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<IFolder | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<IFolder | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<IFolder | null>(null);
  const [moveProjectsOpen, setMoveProjectsOpen] = useState(false);
  const [mobileFolderOpen, setMobileFolderOpen] = useState(false);

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

  // Handler for renaming folder
  const handleRenameFolder = useCallback(
    async (id: string, name: string) => {
      const success = await folderTree.updateFolder(id, { name });
      if (success) {
        toast.success(tFolders('renamed'));
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

  return (
    <div className="flex gap-6">
      {/* Desktop Folder Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-6 border rounded-lg bg-card">
          <div className="p-3 border-b">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {tFolders('title')}
            </h2>
          </div>
          <FolderTree
            tree={folderTree.tree}
            currentFolderId={navigation.currentFolderId}
            expandedIds={folderTree.expandedIds}
            onFolderSelect={navigation.navigateTo}
            onToggleExpand={folderTree.toggleExpanded}
            onCreateFolder={(parentId) => {
              setCreateFolderParentId(parentId);
              setCreateFolderOpen(true);
            }}
            onRenameFolder={setRenameFolderTarget}
            onDeleteFolder={setDeleteFolderTarget}
            onMoveFolder={setMoveFolderTarget}
            isLoading={folderTree.isLoading}
            className="h-[400px]"
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {/* Mobile folder button */}
              <Sheet open={mobileFolderOpen} onOpenChange={setMobileFolderOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden shrink-0">
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>{tFolders('title')}</SheetTitle>
                  </SheetHeader>
                  <FolderTree
                    tree={folderTree.tree}
                    currentFolderId={navigation.currentFolderId}
                    expandedIds={folderTree.expandedIds}
                    onFolderSelect={(id) => {
                      navigation.navigateTo(id);
                      setMobileFolderOpen(false);
                    }}
                    onToggleExpand={folderTree.toggleExpanded}
                    onCreateFolder={(parentId) => {
                      setCreateFolderParentId(parentId);
                      setCreateFolderOpen(true);
                      setMobileFolderOpen(false);
                    }}
                    onRenameFolder={(folder) => {
                      setRenameFolderTarget(folder);
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

          <NewProjectDialog onProjectCreated={fetchProjects} />
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
          onCreateProject={() => {
            // Trigger new project dialog - handled by NewProjectDialog
          }}
        />

        {/* Projects Grid/List */}
        {isLoadingProjects ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        ) : sortedProjects.length > 0 ? (
          <div
            className={
              navigation.viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                : 'space-y-3'
            }
          >
            {sortedProjects.map((project) => (
              <div
                key={project._id?.toString()}
                className={
                  bulkSelection.isSelectionMode
                    ? 'relative cursor-pointer'
                    : ''
                }
                onClick={
                  bulkSelection.isSelectionMode
                    ? () => bulkSelection.toggle(project._id?.toString() ?? '')
                    : undefined
                }
              >
                {bulkSelection.isSelectionMode && (
                  <div
                    className={`absolute top-2 left-2 z-10 h-5 w-5 rounded border-2 flex items-center justify-center ${
                      bulkSelection.isSelected(project._id?.toString() ?? '')
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-background border-muted-foreground/30'
                    }`}
                  >
                    {bulkSelection.isSelected(project._id?.toString() ?? '') && (
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
                <ProjectCard
                  project={project}
                  onDelete={fetchProjects}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            action={
              <NewProjectDialog onProjectCreated={fetchProjects}>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  {tDashboard('createFirst')}
                </Button>
              </NewProjectDialog>
            }
          />
        )}
      </div>

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

      <RenameFolderDialog
        folder={renameFolderTarget}
        open={!!renameFolderTarget}
        onOpenChange={(open) => !open && setRenameFolderTarget(null)}
        onRename={handleRenameFolder}
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
