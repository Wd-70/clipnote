'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  const t = useTranslations('notFound');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <FileQuestion className="w-8 h-8 text-muted-foreground" />
        </div>

        <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
        <h2 className="text-xl font-semibold mb-2">{t('subtitle')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('description')}
        </p>

        <div className="flex items-center justify-center gap-4">
          <Button asChild variant="default">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              {tCommon('home')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {tNav('dashboard')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
