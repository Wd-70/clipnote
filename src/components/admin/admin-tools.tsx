'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskResult {
  id: string;
  title: string;
  status: 'updated' | 'skipped' | 'failed';
  platform?: string;
  channelName?: string;
  reason?: string;
}

interface RefreshResult {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
  results: TaskResult[];
}

export function AdminTools() {
  const t = useTranslations('admin.tools');

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid gap-4">
        <RefreshMetadataCard />
      </div>
    </div>
  );
}

function RefreshMetadataCard() {
  const t = useTranslations('admin.tools');
  const [mode, setMode] = useState<'missing' | 'all'>('missing');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setLogOpen(false);

    try {
      const res = await fetch('/api/admin/tasks/refresh-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setResult(data.data);
      setLogOpen(true);
      toast.success(
        `${t('completed')} — ${data.data.updated}/${data.data.total}`
      );
    } catch {
      toast.error(t('failed'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{t('refreshMetadata')}</CardTitle>
              <CardDescription className="mt-1">
                {t('refreshMetadataDesc')}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <label className="text-sm font-medium">Mode</label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as 'missing' | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="missing">
                  <div className="flex flex-col items-start">
                    <span>{t('modeMissing')}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('modeMissingDesc')}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex flex-col items-start">
                    <span>{t('modeAll')}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('modeAllDesc')}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleRun} disabled={running} className="min-w-[100px]">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('running')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('run')}
              </>
            )}
          </Button>
        </div>

        {/* Result summary */}
        {result && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ResultBadge
                  label={t('resultTotal', { total: result.total })}
                  variant="outline"
                />
                <ResultBadge
                  label={t('resultUpdated', { updated: result.updated })}
                  variant="default"
                  color="green"
                />
                <ResultBadge
                  label={t('resultSkipped', { skipped: result.skipped })}
                  variant="secondary"
                />
                <ResultBadge
                  label={t('resultFailed', { failed: result.failed })}
                  variant="destructive"
                  show={result.failed > 0}
                />
              </div>

              {/* Collapsible log */}
              {result.results.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-muted-foreground"
                    onClick={() => setLogOpen(!logOpen)}
                  >
                    <span className="text-sm">
                      {t('taskLog')} ({result.results.length})
                    </span>
                    {logOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {logOpen && (
                    <ScrollArea className="h-[300px] mt-2 border rounded-lg">
                      <div className="divide-y">
                        {result.results.map((item, i) => (
                          <div
                            key={i}
                            className="flex flex-col gap-1 px-3 py-2 text-sm overflow-hidden"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <StatusIcon status={item.status} />
                              <span className="flex-1 truncate font-medium min-w-0">
                                {item.title}
                              </span>
                              {item.platform && (
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {item.platform}
                                </Badge>
                              )}
                              {item.channelName && (
                                <span className="text-muted-foreground text-xs shrink-0">
                                  {item.channelName}
                                </span>
                              )}
                              <Badge
                                variant={
                                  item.status === 'updated'
                                    ? 'default'
                                    : item.status === 'failed'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="text-[10px] shrink-0"
                              >
                                {t(item.status)}
                              </Badge>
                            </div>
                            {item.reason && (
                              <span className="text-xs text-muted-foreground pl-7 truncate">
                                {item.reason}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'updated':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    default:
      return <SkipForward className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function ResultBadge({
  label,
  variant,
  color,
  show = true,
}: {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color?: string;
  show?: boolean;
}) {
  if (!show) return <div />;

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center text-sm font-medium ${
        color === 'green'
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
          : ''
      }`}
    >
      {label}
    </div>
  );
}
