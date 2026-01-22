"use client";

import { useState } from "react";
import { z } from "zod";
import { Plus, Loader2, Youtube, Play, Video } from "lucide-react";
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

const projectSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  title: z.string().optional(),
});

type Platform = 'YOUTUBE' | 'CHZZK' | 'UNKNOWN';

interface NewProjectDialogProps {
  children?: React.ReactNode;
  onProjectCreated?: () => void;
}

export function NewProjectDialog({ children, onProjectCreated }: NewProjectDialogProps) {
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
      projectSchema.parse({ url, title });
      
      if (platform === 'UNKNOWN') {
        throw new Error("Only YouTube and Chzzk URLs are supported");
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
        setError((err as any).errors[0].message);
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
            New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Enter a video URL to start analyzing. We support YouTube and Chzzk.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Video URL
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
                placeholder="https://youtube.com/watch?v=..."
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
                Project Title (Optional)
              </label>
            <Input
              placeholder="My Awesome Clip"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              If left empty, we'll fetch the video title automatically.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading || !url} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading ? "Analyzing..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
