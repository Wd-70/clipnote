import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProjectCard } from "@/components/dashboard/project-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog";
import { IProject } from "@/types";
import { getTranslations } from 'next-intl/server';

async function ProjectsContent() {
  const t = await getTranslations('projects');
  const tDashboard = await getTranslations('dashboard');
  
  // Fetch real projects from API
  let projects: IProject[] = [];
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') || 
                    'http://localhost:3500';
    
    const response = await fetch(`${baseUrl}/api/projects`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const data = await response.json();
      projects = data.data || [];
    }
  } catch (error) {
    console.error('[Projects] Failed to fetch projects:', error);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('description')}
          </p>
        </div>
        <NewProjectDialog />
      </div>

      <Separator className="my-6" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('totalProjects', { count: projects.length })}
          </p>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={String(project._id)} className="h-full">
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            action={
              <NewProjectDialog>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  {tDashboard('createFirst')}
                </Button>
              </NewProjectDialog>
            } 
          />
        )}
      </div>
    </div>
  );
}

export default async function ProjectsPage() {
  const t = await getTranslations('projects');
  
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center">{t('loading')}</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
