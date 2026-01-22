'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoPlayerRef } from '@/components/video/video-player';
import type { ParsedClip } from '@/types';

interface UseVideoSyncOptions {
  clips: ParsedClip[];
  onClipChange?: (clipIndex: number) => void;
  autoAdvance?: boolean;
}

interface UseVideoSyncReturn {
  currentClipIndex: number;
  isVirtualMode: boolean;
  setVirtualMode: (enabled: boolean) => void;
  handleProgress: (state: { playedSeconds: number }) => void;
  jumpToClip: (clipIndex: number) => void;
  playAllClips: () => void;
  stopPlayback: () => void;
}

export function useVideoSync(
  playerRef: React.RefObject<VideoPlayerRef | null>,
  options: UseVideoSyncOptions
): UseVideoSyncReturn {
  const { clips, onClipChange, autoAdvance = true } = options;

  const [currentClipIndex, setCurrentClipIndex] = useState(-1);
  const [isVirtualMode, setVirtualMode] = useState(false);
  const isPlayingClipsRef = useRef(false);

  // Find current clip based on playback time
  const findClipAtTime = useCallback(
    (seconds: number): number => {
      return clips.findIndex(
        (clip) => seconds >= clip.startTime && seconds < clip.endTime
      );
    },
    [clips]
  );

  // Handle progress updates from video player
  const handleProgress = useCallback(
    (state: { playedSeconds: number }) => {
      const { playedSeconds } = state;

      if (!isVirtualMode || clips.length === 0) {
        // Normal playback - just track current position
        const clipIndex = findClipAtTime(playedSeconds);
        if (clipIndex !== currentClipIndex) {
          setCurrentClipIndex(clipIndex);
          onClipChange?.(clipIndex);
        }
        return;
      }

      // Virtual editing mode
      if (currentClipIndex >= 0 && currentClipIndex < clips.length) {
        const currentClip = clips[currentClipIndex];

        // Check if we've reached the end of current clip
        if (playedSeconds >= currentClip.endTime - 0.1) {
          if (autoAdvance && currentClipIndex < clips.length - 1) {
            // Jump to next clip
            const nextIndex = currentClipIndex + 1;
            const nextClip = clips[nextIndex];
            
            setCurrentClipIndex(nextIndex);
            onClipChange?.(nextIndex);
            playerRef.current?.seekTo(nextClip.startTime);
          } else {
            // End of clips - pause
            playerRef.current?.pause();
            isPlayingClipsRef.current = false;
          }
        }
      }
    },
    [clips, currentClipIndex, isVirtualMode, autoAdvance, onClipChange, findClipAtTime, playerRef]
  );

  // Jump to specific clip
  const jumpToClip = useCallback(
    (clipIndex: number) => {
      if (clipIndex >= 0 && clipIndex < clips.length) {
        const clip = clips[clipIndex];
        setCurrentClipIndex(clipIndex);
        onClipChange?.(clipIndex);
        playerRef.current?.seekTo(clip.startTime);
        playerRef.current?.play();
      }
    },
    [clips, onClipChange, playerRef]
  );

  // Play all clips in sequence (virtual editing mode)
  const playAllClips = useCallback(() => {
    if (clips.length === 0) return;

    setVirtualMode(true);
    isPlayingClipsRef.current = true;
    
    const firstClip = clips[0];
    setCurrentClipIndex(0);
    onClipChange?.(0);
    playerRef.current?.seekTo(firstClip.startTime);
    playerRef.current?.play();
  }, [clips, onClipChange, playerRef]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    isPlayingClipsRef.current = false;
    playerRef.current?.pause();
  }, [playerRef]);

  // Reset clip index when clips change
  useEffect(() => {
    setCurrentClipIndex(-1);
  }, [clips]);

  return {
    currentClipIndex,
    isVirtualMode,
    setVirtualMode,
    handleProgress,
    jumpToClip,
    playAllClips,
    stopPlayback,
  };
}
