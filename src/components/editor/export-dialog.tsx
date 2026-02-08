'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Copy,
  Check,
  Download,
  FileText,
  Merge,
  Trash2,
  Terminal,
  Sparkles,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ParsedClip } from '@/types';
import { useTranslations } from 'next-intl';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: ParsedClip[];
  videoUrl: string;
  projectTitle: string;
}

// Format seconds to yt-dlp timestamp format
function formatSecondsForYtDlp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Sanitize filename
function sanitizeFilename(name: string, useUnderscore: boolean): string {
  // Remove or replace invalid characters
  let sanitized = name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, useUnderscore ? '_' : ' ')
    .trim();

  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return sanitized || 'Untitled';
}

interface CommandBlockProps {
  stepNumber: number;
  title: string;
  description: string;
  command: string;
  icon: React.ReactNode;
  accentColor: string;
  copied: boolean;
  onCopy: () => void;
  defaultExpanded?: boolean;
  copyLabel: string;
  copiedLabel: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  canDisable?: boolean;
}

function CommandBlock({
  stepNumber,
  title,
  description,
  command,
  icon,
  accentColor,
  copied,
  onCopy,
  defaultExpanded = true,
  copyLabel,
  copiedLabel,
  enabled,
  onEnabledChange,
  canDisable = true,
}: CommandBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden shadow-sm transition-opacity",
      !enabled && "opacity-50"
    )}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors",
          `border-l-4`,
          accentColor
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {canDisable && (
            <Checkbox
              checked={enabled}
              onCheckedChange={(checked) => onEnabledChange(checked === true)}
              onClick={(e) => e.stopPropagation()}
              className="mr-1"
            />
          )}
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold",
            accentColor.replace('border-l-', 'bg-').replace('-500', '-500')
          )}>
            {stepNumber}
          </div>
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <h4 className="font-semibold text-sm">{title}</h4>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={copied ? "default" : "secondary"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            disabled={!enabled}
            className={cn(
              "gap-1.5 transition-all",
              copied && "bg-green-500 hover:bg-green-600"
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? copiedLabel : copyLabel}
          </Button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Code Content */}
      {expanded && enabled && (
        <div className="border-t bg-zinc-950 dark:bg-zinc-900">
          <ScrollArea className="max-h-[200px]">
            <pre className="p-4 text-xs font-mono text-zinc-100 whitespace-pre-wrap break-all">
              <code>{command}</code>
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export function ExportDialog({
  open,
  onOpenChange,
  clips,
  videoUrl,
  projectTitle,
}: ExportDialogProps) {
  const t = useTranslations('export');
  const tCommon = useTranslations('common');
  const tError = useTranslations('error');

  // Settings state - default to spaces (useUnderscore = false)
  const [useUnderscore, setUseUnderscore] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);

  // Step enabled states
  const [stepEnabled, setStepEnabled] = useState({
    download: true,
    fileList: true,
    merge: true,
    cleanup: true,
  });

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      setCopiedStates({});
    }
  }, [open]);

  // Generate filenames based on settings
  const generateFilename = useCallback((clip: ParsedClip, index: number) => {
    const sanitizedTitle = sanitizeFilename(projectTitle, useUnderscore);
    const clipNumber = (index + 1).toString().padStart(2, '0');
    const clipName = sanitizeFilename(clip.text || `clip${clipNumber}`, useUnderscore);
    const separator = useUnderscore ? '_' : ' ';
    return `${sanitizedTitle}${separator}${clipNumber}${separator}${clipName}.mp4`;
  }, [projectTitle, useUnderscore]);

  // Generate commands based on settings
  const commands = useMemo(() => {
    if (clips.length === 0) return null;

    const sanitizedTitle = sanitizeFilename(projectTitle, useUnderscore);
    const separator = useUnderscore ? '_' : ' ';
    const outputFilename = `ClipNote${separator}${sanitizedTitle}.mp4`;

    // Step 1: Download commands (individual commands for each clip)
    const individualCommands = clips.map((clip, index) => {
      const start = formatSecondsForYtDlp(clip.startTime);
      const end = formatSecondsForYtDlp(clip.endTime);
      const filename = generateFilename(clip, index);
      return `yt-dlp --download-sections "*${start}-${end}" --force-keyframes-at-cuts -f "bv+ba/b/best" -o "${filename}" "${videoUrl}"`;
    });
    // Join with semicolon for Windows PowerShell compatibility
    const downloadCommand = individualCommands.join('; ');

    // Step 2: File list (using .NET to write UTF-8 without BOM)
    const fileListLines = clips.map((clip, index) => {
      const filename = generateFilename(clip, index);
      return `"file '${filename}'"`;
    }).join(',\n');

    const fileListCommand = `[System.IO.File]::WriteAllLines("filelist.txt", @(
${fileListLines}
), [System.Text.UTF8Encoding]::new($false))`;

    // Step 3: Merge command
    const mergeCommand = `ffmpeg -f concat -safe 0 -i filelist.txt -c copy "${outputFilename}"`;

    // Step 4: Cleanup
    const cleanupPattern = useUnderscore
      ? `${sanitizedTitle}${separator}*.mp4`
      : `"${sanitizedTitle}${separator}*.mp4"`;
    const cleanupCommand = `Remove-Item ${cleanupPattern}, filelist.txt`;

    return {
      download: downloadCommand,
      fileList: fileListCommand,
      merge: mergeCommand,
      cleanup: cleanupCommand,
      outputFilename,
    };
  }, [clips, videoUrl, projectTitle, useUnderscore, generateFilename]);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast.success(tError('clipboardSuccess'));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      toast.error(tError('clipboardFailed'));
    }
  };

  const handleCopyAll = async () => {
    if (!commands) return;

    // Build command list based on enabled steps
    const commandParts: string[] = [];

    if (stepEnabled.download) {
      commandParts.push(commands.download);
    }
    if (stepEnabled.fileList) {
      commandParts.push(commands.fileList);
    }
    if (stepEnabled.merge) {
      commandParts.push(commands.merge);
    }
    if (stepEnabled.cleanup) {
      commandParts.push(commands.cleanup);
    }

    if (commandParts.length === 0) {
      toast.error(t('noStepsSelected'));
      return;
    }

    const joinedCommand = commandParts.join('; ');
    await handleCopy('all', joinedCommand);
  };

  const handleStepEnabledChange = (step: keyof typeof stepEnabled, enabled: boolean) => {
    setStepEnabled(prev => {
      const newState = { ...prev, [step]: enabled };

      // If disabling a step, also disable dependent steps
      if (!enabled) {
        if (step === 'download') {
          newState.fileList = false;
          newState.merge = false;
          newState.cleanup = false;
        } else if (step === 'fileList') {
          newState.merge = false;
          newState.cleanup = false;
        } else if (step === 'merge') {
          newState.cleanup = false;
        }
      }

      // If enabling a step, also enable required previous steps
      if (enabled) {
        if (step === 'cleanup') {
          newState.download = true;
          newState.fileList = true;
          newState.merge = true;
        } else if (step === 'merge') {
          newState.download = true;
          newState.fileList = true;
        } else if (step === 'fileList') {
          newState.download = true;
        }
      }

      return newState;
    });
  };

  // Count enabled steps
  const enabledStepCount = Object.values(stepEnabled).filter(Boolean).length;

  if (!commands) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">{t('title')}</DialogTitle>
                <DialogDescription className="mt-1">
                  {t('description', { count: clips.length })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3 w-3" />
              {tCommon('clips', { count: clips.length })}
            </Badge>
            <Badge variant="outline" className="gap-1.5 max-w-full">
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{commands.outputFilename}</span>
            </Badge>
          </div>
        </div>

        {/* Settings Toggle */}
        <div className="flex-shrink-0 px-6 py-3 border-b bg-muted/30">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            {t('settings')}
            {showSettings ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showSettings && (
            <div className="mt-4 space-y-4">
              <Separator />
              {/* Filename Format Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div className="space-y-0.5">
                  <Label htmlFor="filename-format" className="text-sm font-medium">
                    {t('filenameFormat')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {useUnderscore ? t('filenameUnderscore') : t('filenameSpace')}
                  </p>
                </div>
                <Switch
                  id="filename-format"
                  checked={useUnderscore}
                  onCheckedChange={setUseUnderscore}
                />
              </div>
            </div>
          )}
        </div>

        {/* Commands */}
        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          <div className="space-y-3">
            <CommandBlock
              stepNumber={1}
              title={t('step1')}
              description={t('step1Desc', { count: clips.length })}
              command={commands.download}
              icon={<Download className="h-4 w-4 text-blue-500" />}
              accentColor="border-l-blue-500"
              copied={copiedStates['download'] ?? false}
              onCopy={() => handleCopy('download', commands.download)}
              copyLabel={tCommon('copy')}
              copiedLabel={tCommon('copied')}
              enabled={stepEnabled.download}
              onEnabledChange={(enabled) => handleStepEnabledChange('download', enabled)}
              canDisable={false}
            />

            <CommandBlock
              stepNumber={2}
              title={t('step2')}
              description={t('step2Desc')}
              command={commands.fileList}
              icon={<FileText className="h-4 w-4 text-amber-500" />}
              accentColor="border-l-amber-500"
              copied={copiedStates['fileList'] ?? false}
              onCopy={() => handleCopy('fileList', commands.fileList)}
              defaultExpanded={false}
              copyLabel={tCommon('copy')}
              copiedLabel={tCommon('copied')}
              enabled={stepEnabled.fileList}
              onEnabledChange={(enabled) => handleStepEnabledChange('fileList', enabled)}
              canDisable={false}
            />

            <CommandBlock
              stepNumber={3}
              title={t('step3')}
              description={t('step3Desc')}
              command={commands.merge}
              icon={<Merge className="h-4 w-4 text-green-500" />}
              accentColor="border-l-green-500"
              copied={copiedStates['merge'] ?? false}
              onCopy={() => handleCopy('merge', commands.merge)}
              defaultExpanded={false}
              copyLabel={tCommon('copy')}
              copiedLabel={tCommon('copied')}
              enabled={stepEnabled.merge}
              onEnabledChange={(enabled) => handleStepEnabledChange('merge', enabled)}
              canDisable={false}
            />

            <CommandBlock
              stepNumber={4}
              title={t('step4')}
              description={t('step4Desc')}
              command={commands.cleanup}
              icon={<Trash2 className="h-4 w-4 text-red-500" />}
              accentColor="border-l-red-500"
              copied={copiedStates['cleanup'] ?? false}
              onCopy={() => handleCopy('cleanup', commands.cleanup)}
              defaultExpanded={false}
              copyLabel={tCommon('copy')}
              copiedLabel={tCommon('copied')}
              enabled={stepEnabled.cleanup}
              onEnabledChange={(enabled) => handleStepEnabledChange('cleanup', enabled)}
              canDisable={true}
            />
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t('requiredTools')}: <span className="font-medium text-foreground">yt-dlp</span>, <span className="font-medium text-foreground">ffmpeg</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('close')}
            </Button>
            <Button
              onClick={handleCopyAll}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              {copiedStates['all'] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedStates['all'] ? tCommon('copied') : t('copyAll')}
              <Badge variant="secondary" className="ml-1 bg-white/20 text-white text-xs">
                {enabledStepCount}
              </Badge>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
