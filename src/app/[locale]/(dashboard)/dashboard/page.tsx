"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PointsDisplay } from "@/components/dashboard/points-display";
import { ProjectCard } from "@/components/dashboard/project-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog";
import { useUser } from "@/contexts/user-context";
import { IProject } from "@/types";

function DashboardContent() {
  const t = useTranslations('dashboard');
  const { user } = useUser();
  const [projects, setProjects] = useState<IProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('[Dashboard] Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectDeleted = () => {
    // Refresh project list after deletion
    fetchProjects();
  };

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">{t('loadingDashboard')}</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Section: Points & Header */}
      <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('description')}
          </p>
        </div>
        <div className="w-full md:w-auto min-w-[300px]">
          <PointsDisplay points={user?.points ?? 0} />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Projects Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{t('recentProjects')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('projectCount', { count: projects.length })}
            </p>
          </div>
          
          <NewProjectDialog onProjectCreated={fetchProjects} />
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={String(project._id)} className="h-full">
                <ProjectCard project={project} onDelete={handleProjectDeleted} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            action={
              <NewProjectDialog onProjectCreated={fetchProjects}>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('createFirst')}
                </Button>
              </NewProjectDialog>
            } 
          />
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
