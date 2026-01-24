import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProjectCard } from "@/components/dashboard/project-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog";
import { IProject } from "@/types";

async function ProjectsContent() {
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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">내 프로젝트</h1>
          <p className="text-muted-foreground mt-2">
            모든 비디오 프로젝트를 관리하고 편집하세요.
          </p>
        </div>
        <NewProjectDialog />
      </div>

      <Separator className="my-6" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            총 {projects.length}개의 프로젝트
          </p>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.videoId || String(project._id)} className="h-full">
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
                  첫 프로젝트 만들기
                </Button>
              </NewProjectDialog>
            } 
          />
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center">프로젝트 목록을 불러오는 중...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
