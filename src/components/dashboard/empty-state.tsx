import { Film, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  action?: React.ReactNode;
}

export function EmptyState({ action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-900">
      <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-4 ring-1 ring-zinc-200 dark:ring-zinc-700">
        <Film className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
      </div>
      
      <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
        No projects yet
      </h3>
      
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8 text-sm leading-relaxed">
        Start by adding a YouTube or Chzzk video URL. AI will analyze the content and help you edit faster.
      </p>
      
      {action || (
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Project
        </Button>
      )}
    </div>
  );
}
