'use client';

import { useState, Fragment, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scriptContent: string;
}

export function ExportDialog({ open, onOpenChange, scriptContent }: ExportDialogProps) {
  const [copiedStates, setCopiedStates] = useState<boolean[]>([]);

  // Parse the script content into structured command blocks
  const parsedCommandBlocks = useMemo(() => {
    const blocks: { title: string; command: string }[] = [];
    const lines = scriptContent.split('\n');
    let currentTitle = '';
    let currentCommandLines: string[] = [];

    lines.forEach(line => {
      // Check for step headers (e.g., "# --- 1단계: 개별 클립 파일 다운로드 ---")
      const stepHeaderMatch = line.match(/^# ---\s(\d단계:.*?)\s---$/);
      if (stepHeaderMatch) {
        if (currentTitle && currentCommandLines.length > 0) {
          blocks.push({
            title: currentTitle,
            command: currentCommandLines.join('\n').trim(),
          });
        }
        currentTitle = stepHeaderMatch[1];
        currentCommandLines = [];
      } else if (!line.startsWith('#') && line.trim() !== '') {
        // Only include non-comment and non-empty lines in the command block
        currentCommandLines.push(line);
      }
    });

    // Add the last block
    if (currentTitle && currentCommandLines.length > 0) {
      blocks.push({
        title: currentTitle,
        command: currentCommandLines.join('\n').trim(),
      });
    }
    return blocks;
  }, [scriptContent]);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => {
        const newState = [...prev];
        newState[index] = true;
        return newState;
      });
      toast.success('클립보드에 복사되었습니다!');
      setTimeout(() => {
        setCopiedStates(prev => {
          const newState = [...prev];
          newState[index] = false;
          return newState;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('클립보드 복사에 실패했습니다.');
    }
  };

  // Reset copied states when dialog opens/closes or blocks change
  useEffect(() => {
    setCopiedStates(new Array(parsedCommandBlocks.length).fill(false));
  }, [open, parsedCommandBlocks.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>클립 내보내기 스크립트</DialogTitle>
          <DialogDescription>
            아래 스크립트를 PowerShell 또는 터미널에 붙여넣어 클립을 다운로드하고 병합하세요. 각 단계별로 복사할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4 rounded-md border bg-muted/20 text-sm font-mono">
          {parsedCommandBlocks.map((block, blockIndex) => (
            <Fragment key={blockIndex}>
              <div className="flex items-center justify-between my-2">
                <span className="font-semibold text-base text-primary">
                  {block.title}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(block.command, blockIndex)}
                        className="gap-1 text-muted-foreground hover:text-foreground"
                      >
                        {copiedStates[blockIndex] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedStates[blockIndex] ? '복사됨!' : '복사'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>이 명령어 블록 복사</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <pre className={cn("bg-transparent p-2 rounded-md overflow-x-auto", blockIndex < parsedCommandBlocks.length - 1 && "mb-4 border-b pb-4")}>
                <code>{block.command}</code>
              </pre>
            </Fragment>
          ))}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
