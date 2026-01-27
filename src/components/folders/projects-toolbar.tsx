'use client';

import { useTranslations } from 'next-intl';
import { LayoutGrid, List, SortAsc, Plus, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import type { SortOption, ViewMode } from '@/hooks/use-folder-navigation';

interface ProjectsToolbarProps {
  // Sort controls
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;

  // View controls
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // Selection mode
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;

  // Create button
  onCreateProject?: () => void;

  // Styling
  className?: string;
}

export function ProjectsToolbar({
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  isSelectionMode = false,
  onToggleSelectionMode,
  onCreateProject,
  className,
}: ProjectsToolbarProps) {
  const t = useTranslations('sort');
  const tCommon = useTranslations('common');
  const tView = useTranslations('view');
  const tProjects = useTranslations('projects');

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'created-desc', label: t('createdDesc') },
    { value: 'created-asc', label: t('createdAsc') },
    { value: 'name-asc', label: t('nameAsc') },
    { value: 'name-desc', label: t('nameDesc') },
    { value: 'manual', label: t('manual') },
  ];

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        className
      )}
    >
      {/* Left side: Sort */}
      <div className="flex items-center gap-2">
        <SortAsc className="h-4 w-4 text-muted-foreground" />
        <Select value={sortOption} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder={t('label')} />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right side: View toggle, Selection, Create */}
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && onViewModeChange(v as ViewMode)}
          className="border rounded-md"
        >
          <ToggleGroupItem
            value="grid"
            aria-label={tView('grid')}
            className="h-9 w-9 data-[state=on]:bg-muted"
          >
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label={tView('list')}
            className="h-9 w-9 data-[state=on]:bg-muted"
          >
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Selection Mode Toggle */}
        {onToggleSelectionMode && (
          <Button
            variant={isSelectionMode ? 'secondary' : 'outline'}
            size="sm"
            className="h-9 gap-2"
            onClick={onToggleSelectionMode}
          >
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Select</span>
          </Button>
        )}

        {/* Create Project */}
        {onCreateProject && (
          <Button size="sm" className="h-9 gap-2" onClick={onCreateProject}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{tProjects('title')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// Compact version for mobile
interface ProjectsToolbarCompactProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ProjectsToolbarCompact({
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  className,
}: ProjectsToolbarCompactProps) {
  const t = useTranslations('sort');
  const tView = useTranslations('view');

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <Select value={sortOption} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created-desc">{t('createdDesc')}</SelectItem>
          <SelectItem value="created-asc">{t('createdAsc')}</SelectItem>
          <SelectItem value="name-asc">{t('nameAsc')}</SelectItem>
          <SelectItem value="name-desc">{t('nameDesc')}</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-1">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewModeChange('grid')}
          aria-label={tView('grid')}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewModeChange('list')}
          aria-label={tView('list')}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
