"use client";

import { Zap, CreditCard, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PointsDisplayProps {
  points: number;
}

export function PointsDisplay({ points }: PointsDisplayProps) {
  const t = useTranslations('points');
  
  // 1 point = 1 minute
  const estimatedMinutes = points;

  return (
    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 text-white p-6 relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-all duration-500" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-400 text-sm uppercase tracking-wider font-medium">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>{t('availableBalance')}</span>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight font-mono">
              {points.toLocaleString()}
            </span>
            <span className="text-zinc-500 font-medium">{t('pts')}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>{t('estimatedMinutes', { minutes: estimatedMinutes })}</span>
          </div>
        </div>

        <Button 
          variant="secondary" 
          className="w-full md:w-auto bg-white text-black hover:bg-zinc-200 border-0 font-medium transition-transform hover:scale-105 active:scale-95"
          onClick={() => {
            // TODO: Implement payment modal
            console.log("Open charge dialog");
          }}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {t('recharge')}
        </Button>
      </div>
    </Card>
  );
}
