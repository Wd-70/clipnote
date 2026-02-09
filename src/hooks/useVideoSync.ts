'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { VideoPlayerRef } from '@/components/video/video-player';
import type { ParsedClip } from '@/types';

interface UseVideoSyncOptions {
  clips: ParsedClip[];
  onClipChange?: (clipIndex: number) => void;
  autoAdvance?: boolean;
}

interface ClipRange {
  clip: ParsedClip;
  virtualStart: number;
  virtualEnd: number;
  actualStart: number;
  actualEnd: number;
  duration: number;
}

interface UseVideoSyncReturn {
  // State
  currentClipIndex: number;
  isVirtualMode: boolean;

  // Computed values for timeline UI
  clipRanges: ClipRange[];
  totalVirtualDuration: number;
  currentVirtualTime: number;

  // Actions
  setVirtualMode: (enabled: boolean) => void;
  handleProgress: (state: { playedSeconds: number }) => void;
  jumpToClip: (clipIndex: number) => void;
  playAllClips: () => void;
  stopPlayback: () => void;
  skipToPreviousClip: () => void;
  skipToNextClip: () => void;
  seekToVirtualTime: (virtualTime: number) => void;
  togglePlay: () => void;
  exitClipMode: () => void;
}

/**
 * useVideoSync - Single source of truth for clip playback logic
 *
 * Responsibilities:
 * - Track current clip index based on playback time
 * - Handle virtual editing mode (clip-only playback)
 * - Manage all seek operations to ensure consistent behavior
 * - Calculate virtual timeline values for UI
 *
 * All seek operations should go through this hook to prevent conflicts.
 */
export function useVideoSync(
  playerRef: React.RefObject<VideoPlayerRef | null>,
  options: UseVideoSyncOptions
): UseVideoSyncReturn {
  const { clips, onClipChange, autoAdvance = true } = options;

  const [currentClipIndex, setCurrentClipIndex] = useState(-1);
  const [isVirtualMode, setVirtualMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Refs for avoiding stale closures
  const clipsRef = useRef(clips);
  const currentClipIndexRef = useRef(currentClipIndex);
  const isVirtualModeRef = useRef(isVirtualMode);

  // Track last jump time to prevent handleProgress from overwriting clip index
  const lastJumpTimeRef = useRef<number>(0);

  // Keep refs in sync
  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  useEffect(() => {
    currentClipIndexRef.current = currentClipIndex;
  }, [currentClipIndex]);

  useEffect(() => {
    isVirtualModeRef.current = isVirtualMode;
  }, [isVirtualMode]);

  // Calculate clip ranges for virtual timeline
  const clipRanges = useMemo((): ClipRange[] => {
    let accumulated = 0;
    return clips.map((clip) => {
      const duration = clip.endTime - clip.startTime;
      const range: ClipRange = {
        clip,
        virtualStart: accumulated,
        virtualEnd: accumulated + duration,
        actualStart: clip.startTime,
        actualEnd: clip.endTime,
        duration,
      };
      accumulated += duration;
      return range;
    });
  }, [clips]);

  const totalVirtualDuration = useMemo(() => {
    if (clipRanges.length === 0) return 0;
    return clipRanges[clipRanges.length - 1].virtualEnd;
  }, [clipRanges]);

  // Convert actual video time to virtual timeline time
  const actualToVirtual = useCallback(
    (actualTime: number): number => {
      for (const range of clipRanges) {
        if (actualTime >= range.actualStart && actualTime <= range.actualEnd) {
          const offsetInClip = actualTime - range.actualStart;
          return range.virtualStart + offsetInClip;
        }
      }
      // If not in any clip, find the closest one
      for (const range of clipRanges) {
        if (actualTime < range.actualStart) {
          return range.virtualStart;
        }
      }
      return totalVirtualDuration;
    },
    [clipRanges, totalVirtualDuration]
  );

  // Calculate current virtual time
  const currentVirtualTime = useMemo(() => {
    if (clips.length === 0) return 0;
    return actualToVirtual(currentTime);
  }, [currentTime, actualToVirtual, clips.length]);

  // Find current clip based on playback time
  const findClipAtTime = useCallback(
    (seconds: number): number => {
      return clipsRef.current.findIndex(
        (clip) => seconds >= clip.startTime && seconds < clip.endTime
      );
    },
    []
  );

  // Convert virtual timeline time to actual video time and clip index
  const virtualToActual = useCallback(
    (virtualTime: number): { actualTime: number; clipIndex: number } => {
      for (let i = 0; i < clipRanges.length; i++) {
        const range = clipRanges[i];
        if (virtualTime >= range.virtualStart && virtualTime < range.virtualEnd) {
          const offsetInVirtual = virtualTime - range.virtualStart;
          return {
            actualTime: range.actualStart + offsetInVirtual,
            clipIndex: i,
          };
        }
      }
      // Default to last clip end
      if (clipRanges.length > 0) {
        const lastRange = clipRanges[clipRanges.length - 1];
        return {
          actualTime: lastRange.actualEnd,
          clipIndex: clipRanges.length - 1,
        };
      }
      return { actualTime: 0, clipIndex: -1 };
    },
    [clipRanges]
  );

  // Internal function to perform seek with jump time tracking
  const performSeek = useCallback(
    (time: number, clipIndex: number, play: boolean = false) => {
      lastJumpTimeRef.current = Date.now();
      // Update ref synchronously to prevent stale value in handleProgress
      currentClipIndexRef.current = clipIndex;
      setCurrentClipIndex(clipIndex);
      onClipChange?.(clipIndex);
      playerRef.current?.seekTo(time);
      if (play) {
        playerRef.current?.play();
      }
    },
    [onClipChange, playerRef]
  );

  // Handle progress updates from video player
  const handleProgress = useCallback(
    (state: { playedSeconds: number }) => {
      const { playedSeconds } = state;
      setCurrentTime(playedSeconds);

      const currentClips = clipsRef.current;

      // Skip auto index update for 500ms after a manual jump
      const timeSinceJump = Date.now() - lastJumpTimeRef.current;
      if (timeSinceJump < 500) {
        return;
      }

      if (!isVirtualModeRef.current || currentClips.length === 0) {
        // Normal playback - just track current position
        const clipIndex = findClipAtTime(playedSeconds);
        if (clipIndex !== currentClipIndexRef.current) {
          setCurrentClipIndex(clipIndex);
          onClipChange?.(clipIndex);
        }
        return;
      }

      // Virtual editing mode - auto-advance to next clip
      const idx = currentClipIndexRef.current;
      if (idx >= 0 && idx < currentClips.length) {
        const currentClip = currentClips[idx];

        // Check if we've reached the end of current clip
        if (playedSeconds >= currentClip.endTime - 0.1) {
          if (autoAdvance && idx < currentClips.length - 1) {
            // Jump to next clip
            const nextIndex = idx + 1;
            const nextClip = currentClips[nextIndex];
            performSeek(nextClip.startTime, nextIndex, false);
          } else {
            // End of clips - pause and exit virtual mode
            playerRef.current?.pause();
            setVirtualMode(false);
          }
        }
      }
    },
    [autoAdvance, onClipChange, findClipAtTime, playerRef, performSeek]
  );

  // Jump to specific clip (enables virtual mode for auto-advance)
  const jumpToClip = useCallback(
    (clipIndex: number) => {
      const currentClips = clipsRef.current;
      if (clipIndex >= 0 && clipIndex < currentClips.length) {
        const clip = currentClips[clipIndex];
        // Enable virtual mode so clips auto-advance at the end
        isVirtualModeRef.current = true;
        setVirtualMode(true);
        performSeek(clip.startTime, clipIndex, true);
      }
    },
    [performSeek]
  );

  // Play all clips in sequence (virtual editing mode)
  const playAllClips = useCallback(() => {
    const currentClips = clipsRef.current;
    if (currentClips.length === 0) return;

    setVirtualMode(true);
    const firstClip = currentClips[0];
    performSeek(firstClip.startTime, 0, true);
  }, [performSeek]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    playerRef.current?.pause();
    setVirtualMode(false);
  }, [playerRef]);

  // Exit clip mode (switch to original video mode)
  // Call this when user interacts with original video controls
  const exitClipMode = useCallback(() => {
    if (isVirtualModeRef.current) {
      isVirtualModeRef.current = false;
      setVirtualMode(false);
    }
  }, []);

  // Skip to previous clip
  const skipToPreviousClip = useCallback(() => {
    const currentClips = clipsRef.current;
    if (currentClips.length === 0) return;

    const idx = currentClipIndexRef.current;
    const targetIndex = Math.max(0, idx <= 0 ? 0 : idx - 1);
    const targetClip = currentClips[targetIndex];
    if (targetClip) {
      performSeek(targetClip.startTime, targetIndex, false);
    }
  }, [performSeek]);

  // Skip to next clip
  const skipToNextClip = useCallback(() => {
    const currentClips = clipsRef.current;
    if (currentClips.length === 0) return;

    const idx = currentClipIndexRef.current;
    const targetIndex = Math.min(currentClips.length - 1, idx + 1);
    const targetClip = currentClips[targetIndex];
    if (targetClip) {
      performSeek(targetClip.startTime, targetIndex, false);
    }
  }, [performSeek]);

  // Seek to virtual timeline time
  const seekToVirtualTime = useCallback(
    (virtualTime: number) => {
      const { actualTime, clipIndex } = virtualToActual(virtualTime);
      performSeek(actualTime, clipIndex, false);
    },
    [virtualToActual, performSeek]
  );

  // Toggle play/pause (respects virtual mode)
  const togglePlay = useCallback(() => {
    const currentClips = clipsRef.current;
    if (currentClips.length === 0) return;

    const player = playerRef.current;
    if (!player) return;

    // Check if currently playing by examining the player state
    // We'll use a simple toggle based on calling play/pause
    // The parent component should track isPlaying state from onPlayingChange

    // If not in any clip, start from first clip
    const idx = currentClipIndexRef.current;
    if (idx < 0 && currentClips.length > 0) {
      const firstClip = currentClips[0];
      performSeek(firstClip.startTime, 0, true);
      return;
    }

    // Just toggle - parent tracks actual playing state
    player.play();
  }, [playerRef, performSeek]);

  // Reset clip index when clips change
  useEffect(() => {
    setCurrentClipIndex(-1);
  }, [clips]);

  return {
    // State
    currentClipIndex,
    isVirtualMode,

    // Computed values
    clipRanges,
    totalVirtualDuration,
    currentVirtualTime,

    // Actions
    setVirtualMode,
    handleProgress,
    jumpToClip,
    playAllClips,
    stopPlayback,
    skipToPreviousClip,
    skipToNextClip,
    seekToVirtualTime,
    togglePlay,
    exitClipMode,
  };
}
