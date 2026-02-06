import { Suspense } from "react";
import { History } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from 'next-intl/server';
import { PointsBalance } from "@/components/points/points-balance";

async function PointsContent() {
  const t = await getTranslations('pointsPage');

  // TODO: Fetch real points history from API
  const pointsHistory = [
    { id: 1, type: 'charge', amount: 1000, date: '2026-01-20', description: 'Points Charged' },
    { id: 2, type: 'usage', amount: -50, date: '2026-01-21', description: 'AI Analysis - Untitled Project' },
    { id: 3, type: 'charge', amount: 300, date: '2026-01-22', description: 'Bonus Points' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('description')}
        </p>
      </div>

      <Separator className="my-6" />

      {/* Current Balance - Client Component */}
      <PointsBalance />

      {/* Points Packages */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('chargeOptions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:border-blue-500 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Small</CardTitle>
              <CardDescription>200 Points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1</div>
              <p className="text-xs text-muted-foreground mt-1">No bonus</p>
            </CardContent>
          </Card>

          <Card className="hover:border-blue-500 transition-colors cursor-pointer border-blue-200 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg">Medium</CardTitle>
              <CardDescription>600 Points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$3</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+50 bonus</p>
            </CardContent>
          </Card>

          <Card className="hover:border-blue-500 transition-colors cursor-pointer border-blue-300 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-lg">Large</CardTitle>
              <CardDescription>1,000 Points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$5</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+100 bonus</p>
            </CardContent>
          </Card>

          <Card className="hover:border-blue-500 transition-colors cursor-pointer border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="text-lg">Pro</CardTitle>
              <CardDescription>2,000 Points</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$10</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+300 bonus</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage History */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          {t('usageHistory')}
        </h2>
        <Card>
          <CardContent className="p-0">
            {pointsHistory.length > 0 ? (
              <div className="divide-y">
                {pointsHistory.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">{item.date}</p>
                    </div>
                    <div className={`text-lg font-semibold ${item.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()} P
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                {t('noHistory')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function PointsPage() {
  const tCommon = await getTranslations('common');
  
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center">{tCommon('loading')}</div>}>
      <PointsContent />
    </Suspense>
  );
}
