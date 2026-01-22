'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold mb-2">문제가 발생했습니다</h1>
        <p className="text-muted-foreground mb-6">
          예기치 않은 오류가 발생했습니다. 문제가 지속되면 고객센터에 문의해 주세요.
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground mb-6 font-mono">
            오류 코드: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-4">
          <Button onClick={reset} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              홈으로
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
