'use client';

import { CreditCard, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useUser } from '@/contexts/user-context';

export function PointsBalance() {
  const t = useTranslations('pointsPage');
  const tPoints = useTranslations('points');
  const { user, isLoading } = useUser();

  const points = user?.points ?? 0;

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('currentBalance')}
          </CardTitle>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-24 mt-2" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          {t('currentBalance')}
        </CardTitle>
        <CardDescription>
          {tPoints('estimatedMinutes', { minutes: points })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {points.toLocaleString()} P
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {tPoints('estimatedMinutes', { minutes: points })}
            </p>
          </div>
          <Link href="/points/charge">
            <Button size="lg">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('chargePoints')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
