"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Edit2, FileText, Youtube, Video, Trash2 } from "lucide-react";
import { IProject } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProjectCardProps {
  project: IProject;
  onDelete?: () => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  // Safe date handling
  const createdDate = new Date(project.createdAt);
  const formattedDate = !isNaN(createdDate.getTime()) 
    ? createdDate.toLocaleDateString("ko-KR", { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown date';

  const isYoutube = project.platform === 'YOUTUBE';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      toast.success('프로젝트가 삭제되었습니다');
      
      // Call onDelete callback if provided
      if (onDelete) {
        onDelete();
      } else {
        // Fallback: refresh the page
        router.refresh();
      }
    } catch (error) {
      console.error('[ProjectCard] Delete failed:', error);
      toast.error('프로젝트 삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <Card className="group overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col h-full">
      {/* Thumbnail Section */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={project.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-zinc-300">
            <Video className="w-12 h-12" />
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-sm">
          <Link href={`/projects/${project._id}`}>
            <Button variant="secondary" size="sm" className="font-medium">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Project
            </Button>
          </Link>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm" 
                className="font-medium"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>프로젝트를 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. &quot;{project.title || 'Untitled Project'}&quot; 프로젝트와 모든 클립 정보가 영구적으로 삭제됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Platform Badge (Always visible) */}
        <div className="absolute top-3 left-3">
          <Badge 
            variant="secondary" 
            className={cn(
              "backdrop-blur-md shadow-sm border",
              isYoutube 
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/20" 
                : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200/20"
            )}
          >
            {isYoutube ? <Youtube className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            {project.platform}
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="flex-1 p-5 space-y-3">
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
          {project.title || "Untitled Project"}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3" />
            <span>
              {typeof project.notes === 'string' 
                ? (project.notes.trim() ? '클립 있음' : '클립 없음')
                : `${project.notes?.length || 0} notes`
              }
            </span>
          </div>
          <span>{formattedDate}</span>
        </div>
      </CardContent>
    </Card>
  );
}
