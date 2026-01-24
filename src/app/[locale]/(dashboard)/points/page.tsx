import { Suspense } from "react";
import { CreditCard, TrendingUp, History } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

async function PointsContent() {
  // TODO: Fetch real user points from API
  const points = 1250;
  const pointsHistory = [
    { id: 1, type: 'charge', amount: 1000, date: '2026-01-20', description: '포인트 충전' },
    { id: 2, type: 'usage', amount: -50, date: '2026-01-21', description: 'AI 분석 - Untitled Project' },
    { id: 3, type: 'charge', amount: 300, date: '2026-01-22', description: '보너스 포인트' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">포인트 관리</h1>
        <p className="text-muted-foreground mt-2">
          포인트를 충전하고 사용 내역을 확인하세요.
        </p>
      </div>

      <Separator className="my-6" />

      {/* Current Balance */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            현재 포인트
          </CardTitle>
          <CardDescription>AI 분석에 사용 가능한 포인트</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {points.toLocaleString()} P
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                ≈ {points} 분의 AI 분석 가능
              </p>
            </div>
            <Link href="/points/charge">
              <Button size="lg">
                <TrendingUp className="w-4 h-4 mr-2" />
                포인트 충전
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Points Packages */}
      <div>
        <h2 className="text-xl font-semibold mb-4">충전 패키지</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:border-blue-500 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">스몰</CardTitle>
              <CardDescription>200 포인트</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₩1,000</div>
              <p className="text-xs text-muted-foreground mt-1">보너스 없음</p>
            </CardContent>
          </Card>

          <Card className="hover:border-blue-500 transition-colors cursor-pointer border-blue-200 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg">미디엄</CardTitle>
              <CardDescription>600 포인트</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₩3,000</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+50 보너스</p>
            </CardContent>
          </Card>

          <Card className="hover:border-blue-500 transition-colors cursor-pointer border-blue-300 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-lg">라지</CardTitle>
              <CardDescription>1,000 포인트</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₩5,000</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+100 보너스</p>
            </CardContent>
          </Card>

          <Card className="hover:border-blue-500 transition-colors cursor-pointer border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="text-lg">프로</CardTitle>
              <CardDescription>2,000 포인트</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₩10,000</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+300 보너스 🎉</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Usage History */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          사용 내역
        </h2>
        <Card>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PointsPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center">포인트 정보를 불러오는 중...</div>}>
      <PointsContent />
    </Suspense>
  );
}
