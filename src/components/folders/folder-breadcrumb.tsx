'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BreadcrumbItem {
  id: string | null;
  name: string;
  depth: number;
}

interface FolderBreadcrumbProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
  className?: string;
}

export function FolderBreadcrumb({
  breadcrumbs,
  onNavigate,
  className,
}: FolderBreadcrumbProps) {
  const tProjects = useTranslations('projects');

  if (breadcrumbs.length <= 1) {
    // Only root, no need for breadcrumb
    return null;
  }

  // On mobile, show truncated version
  const visibleBreadcrumbs = breadcrumbs;
  const showEllipsis = false; // Could implement responsive truncation

  return (
    <nav
      aria-label="Folder navigation"
      className={cn('flex items-center gap-1 text-sm', className)}
    >
      {visibleBreadcrumbs.map((item, index) => {
        const isLast = index === visibleBreadcrumbs.length - 1;
        const isRoot = item.id === null;

        return (
          <div key={item.id ?? 'root'} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                className="h-4 w-4 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
            )}

            {isLast ? (
              // Current folder (non-clickable)
              <span
                className="font-medium text-foreground truncate max-w-[200px]"
                aria-current="page"
              >
                {isRoot ? tProjects('allProjects') : item.name}
              </span>
            ) : (
              // Clickable breadcrumb
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => onNavigate(item.id)}
              >
                {isRoot ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {tProjects('allProjects')}
                    </span>
                  </span>
                ) : (
                  <span className="truncate max-w-[150px]">{item.name}</span>
                )}
              </Button>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Compact version for tight spaces
interface FolderBreadcrumbCompactProps {
  currentFolder: { id: string | null; name: string } | null;
  onNavigateUp?: () => void;
  className?: string;
}

export function FolderBreadcrumbCompact({
  currentFolder,
  onNavigateUp,
  className,
}: FolderBreadcrumbCompactProps) {
  const tProjects = useTranslations('projects');

  if (!currentFolder || currentFolder.id === null) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        {tProjects('allProjects')}
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-1 text-sm', className)}>
      {onNavigateUp && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0.5 text-muted-foreground hover:text-foreground"
            onClick={onNavigateUp}
          >
            <Home className="h-3.5 w-3.5" />
          </Button>
          <ChevronRight
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </>
      )}
      <span className="font-medium text-foreground truncate">
        {currentFolder.name}
      </span>
    </div>
  );
}
