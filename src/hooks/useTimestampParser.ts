'use client';

import { useMemo, useCallback } from 'react';
import { parseNotesToClips } from '@/lib/utils/timestamp';
import type { ParsedClip } from '@/types';

interface UseTimestampParserReturn {
  clips: ParsedClip[];
  parseText: (text: string, duration?: number) => ParsedClip[];
  totalDuration: number;
  clipCount: number;
}

/**
 * Hook for parsing timestamp notes into clips
 * @param notesText - The notes text to parse
 * @param videoDuration - Optional video duration for single-timestamp mode
 */
export function useTimestampParser(notesText: string, videoDuration?: number): UseTimestampParserReturn {
  const clips = useMemo(() => {
    return parseNotesToClips(notesText, videoDuration);
  }, [notesText, videoDuration]);

  const parseText = useCallback((text: string, duration?: number): ParsedClip[] => {
    return parseNotesToClips(text, duration);
  }, []);

  const totalDuration = useMemo(() => {
    return clips.reduce((total, clip) => total + clip.duration, 0);
  }, [clips]);

  const clipCount = clips.length;

  return {
    clips,
    parseText,
    totalDuration,
    clipCount,
  };
}
