'use client';

import { useMemo, useCallback } from 'react';
import { parseNotesToClips } from '@/lib/utils/timestamp';
import type { ParsedClip } from '@/types';

interface UseTimestampParserReturn {
  clips: ParsedClip[];
  parseText: (text: string) => ParsedClip[];
  totalDuration: number;
  clipCount: number;
}

export function useTimestampParser(notesText: string): UseTimestampParserReturn {
  const clips = useMemo(() => {
    return parseNotesToClips(notesText);
  }, [notesText]);

  const parseText = useCallback((text: string): ParsedClip[] => {
    return parseNotesToClips(text);
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
