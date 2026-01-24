"use client";

import { useState } from "react";
import { z } from "zod";
import { Plus, Loader2, Youtube, Play, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Platform = 'YOUTUBE' | 'CHZZK' | 'UNKNOWN';

interface NewProjectDialogProps {
  children?: React.ReactNode;
  onProjectCreated?: () => void;
}

export function NewProjectDialog({ children, onProjectCreated }: NewProjectDialogProps) {
  const t = useTranslations('newProject');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Platform detection
  const getPlatform = (url: string): Platform => {
    if (!url) return 'UNKNOWN';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YOUTUBE';
    if (url.includes('chzzk.naver.com')) return 'CHZZK';
    return 'UNKNOWN';
  };

  const platform = getPlatform(url);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate
      const projectSchema = z.object({
        url: z.string().url(t('urlRequired')),
        title: z.string().optional(),
      });
      
      projectSchema.parse({ url, title });
      
      if (platform === 'UNKNOWN') {
        throw new Error(t('unsupportedPlatform'));
      }

      // Call actual API
      console.log("Creating project:", { url, title, platform });
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: url,
          title: title || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      console.log("Project created successfully:", data);
      
      // Close dialog and reset form
      setOpen(false);
      setUrl("");
      setTitle("");
      
      // Call callback if provided, otherwise refresh page
      if (onProjectCreated) {
        onProjectCreated();
      } else {
        window.location.reload();
      }
      
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t('title')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t('videoUrl')}
              </label>
              {platform !== 'UNKNOWN' && (
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                  platform === 'YOUTUBE' ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                )}>
                  {platform === 'YOUTUBE' ? <Youtube className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {platform}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder={t('videoUrlPlaceholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={cn(
                  "pl-9", 
                  error && "border-red-500 focus-visible:ring-red-500"
                )}
                disabled={isLoading}
              />
              <div className="absolute left-3 top-2.5 text-zinc-400">
                <Video className="w-4 h-4" />
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t('projectTitle')}
              </label>
            <Input
              placeholder={t('projectTitlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              {t('autoTitle')}
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading || !url} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading ? t('analyzing') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
