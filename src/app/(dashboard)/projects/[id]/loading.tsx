import { Skeleton } from '@/components/ui/skeleton';

export default function EditorLoading() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header skeleton */}
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-24 mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </header>

      {/* Main content skeleton */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Left: Video */}
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-video rounded-lg" />
          <Skeleton className="flex-1 min-h-[200px] rounded-lg" />
        </div>

        {/* Right: Notes */}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
