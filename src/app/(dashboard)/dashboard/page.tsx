"use client";

import { Suspense, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PointsDisplay } from "@/components/dashboard/points-display";
import { ProjectCard } from "@/components/dashboard/project-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog";
import { IProject } from "@/types";

function DashboardContent() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [points, setPoints] = useState(0);
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
    // TODO: Fetch real user points from API
    setPoints(1250);
  }, []);

  const handleProjectDeleted = () => {
    // Refresh project list after deletion
    fetchProjects();
  };

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Section: Points & Header */}
      <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your video projects and track your analysis credits.
          </p>
        </div>
        <div className="w-full md:w-auto min-w-[300px]">
          <PointsDisplay points={points} />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Projects Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Recent Projects</h2>
            <p className="text-sm text-muted-foreground">
              You have {projects.length} active projects.
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
                  Create First Project
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
