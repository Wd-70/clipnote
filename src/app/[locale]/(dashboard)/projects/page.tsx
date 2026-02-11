import { Suspense } from "react";
import { getTranslations } from 'next-intl/server';
import { ProjectsContent } from "@/components/dashboard/projects-content";
import { Skeleton } from "@/components/ui/skeleton";
import { IProject } from "@/types";

export const dynamic = 'force-dynamic';

async function getInitialProjects(): Promise<IProject[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') || 
                    'http://localhost:7847';
    
    const response = await fetch(`${baseUrl}/api/projects?sort=created-desc`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
  } catch (error) {
    console.error('[Projects] Failed to fetch initial projects:', error);
  }
  return [];
}

function ProjectsLoading() {
  return (
    <div className="flex gap-6">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-6 border rounded-lg bg-card p-4 space-y-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4 ml-4" />
          <Skeleton className="h-9 w-full" />
        </div>
      </aside>
      
      {/* Content skeleton */}
      <div className="flex-1 space-y-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function ProjectsPage() {
  const initialProjects = await getInitialProjects();
  
  return (
    <Suspense fallback={<ProjectsLoading />}>
      <ProjectsContent initialProjects={initialProjects} />
    </Suspense>
  );
}
