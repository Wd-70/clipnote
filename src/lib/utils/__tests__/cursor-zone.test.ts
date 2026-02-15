import { describe, it, expect } from 'vitest';
import {
  TIMESTAMP_PATTERN,
  getCursorZone,
  restoreCursorInLine,
  type CursorZoneInfo,
} from '../cursor-zone';
import { formatSecondsToTime, parseTimeToSeconds } from '../timestamp';

// =========================================================================
// Helper: simulate setStartTime line transformation
// =========================================================================
function simulateSetStartTime(line: string, time: number): string {
  const timestamp = formatSecondsToTime(time);
  const match = line.match(TIMESTAMP_PATTERN);

  if (match) {
    const [, , separator, endTime, space, description] = match;
    if (endTime) {
      return `${timestamp} - ${endTime}${space || ' '}${description || ''}`;
    } else if (separator) {
      return `${timestamp} - ${description || ''}`;
    } else if (description && description.trim()) {
      return `${timestamp}${space || ' '}${description}`;
    } else {
      return timestamp;
    }
  }
  const trimmedLine = line.trim();
  return trimmedLine ? `${timestamp} ${trimmedLine}` : timestamp;
}

// =========================================================================
// Helper: simulate setEndTime line transformation
// =========================================================================
function simulateSetEndTime(line: string, time: number): string {
  const timestamp = formatSecondsToTime(time);
  const match = line.match(TIMESTAMP_PATTERN);

  if (match) {
    const [, startTime, , , , description] = match;
    if (startTime) {
      return `${startTime} - ${timestamp}${description ? ' ' + description : ' '}`;
    } else {
      return ` - ${timestamp}${description ? ' ' + description : ''}`;
    }
  }
  const trimmedLine = line.trim();
  return trimmedLine
    ? ` - ${timestamp} ${trimmedLine}`
    : ` - ${timestamp}`;
}

// =========================================================================
// Helper: simulate nudgeTimestamp (replaces only the timestamp portion)
// =========================================================================
function simulateNudge(
  line: string,
  target: 'start' | 'end',
  delta: number,
  videoDuration?: number
): string | null {
  const match = line.match(TIMESTAMP_PATTERN);
  if (!match) return null;

  const [, startTimeStr, separator, endTimeStr] = match;

  if (target === 'start' && startTimeStr) {
    let newTime = Math.max(0, parseTimeToSeconds(startTimeStr) + delta);
    if (videoDuration) newTime = Math.min(newTime, videoDuration);
    const newTimeStr = formatSecondsToTime(newTime);
    return newTimeStr + line.substring(startTimeStr.length);
  }
  if (target === 'end' && endTimeStr) {
    let newTime = Math.max(0, parseTimeToSeconds(endTimeStr) + delta);
    if (videoDuration) newTime = Math.min(newTime, videoDuration);
    const newTimeStr = formatSecondsToTime(newTime);
    const endTsOffset = (startTimeStr?.length || 0) + (separator?.length || 0);
    return line.substring(0, endTsOffset) + newTimeStr + line.substring(endTsOffset + endTimeStr.length);
  }
  return null;
}

// =========================================================================
// Helper: run full edit + undo + redo cursor preservation cycle
// =========================================================================
function testCursorPreservation(
  originalLine: string,
  cursorPos: number,
  editFn: (line: string) => string
) {
  // 1. Save zone info before edit
  const zoneInfo = getCursorZone(originalLine, cursorPos);

  // 2. Apply edit
  const editedLine = editFn(originalLine);

  // 3. Restore cursor on edited line
  const editedCursor = restoreCursorInLine(editedLine, zoneInfo);

  // 4. Simulate undo: edited → original, zone info preserved
  const undoCursor = restoreCursorInLine(originalLine, zoneInfo);

  // 5. Simulate redo: original → edited, zone info preserved
  const redoCursor = restoreCursorInLine(editedLine, zoneInfo);

  return { zoneInfo, editedLine, editedCursor, undoCursor, redoCursor };
}

// =========================================================================
// Tests
// =========================================================================

describe('TIMESTAMP_PATTERN', () => {
  it('matches line with start + end timestamps', () => {
    const m = '5:30.0 - 6:30.0 text'.match(TIMESTAMP_PATTERN)!;
    expect(m[1]).toBe('5:30.0');
    expect(m[2]).toBe(' - ');
    expect(m[3]).toBe('6:30.0');
    expect(m[5]).toBe('text');
  });

  it('matches line with start timestamp only', () => {
    const m = '5:30.0 text'.match(TIMESTAMP_PATTERN)!;
    expect(m[1]).toBe('5:30.0');
    expect(m[2]).toBeUndefined();
    expect(m[3]).toBeUndefined();
    expect(m[5]).toBe('text');
  });

  it('matches line with start + separator but no end timestamp', () => {
    const m = '5:30.0 - text'.match(TIMESTAMP_PATTERN)!;
    expect(m[1]).toBe('5:30.0');
    expect(m[2]).toBe(' - ');
    expect(m[3]).toBeUndefined();
    expect(m[5]).toBe('text');
  });

  it('matches line with no timestamps', () => {
    const m = 'some text'.match(TIMESTAMP_PATTERN)!;
    expect(m[1]).toBeUndefined();
    expect(m[2]).toBeUndefined();
    expect(m[3]).toBeUndefined();
    expect(m[5]).toBe('some text');
  });

  it('matches HH:MM:SS format', () => {
    const m = '1:05:30.0 - 1:06:00.0 text'.match(TIMESTAMP_PATTERN)!;
    expect(m[1]).toBe('1:05:30.0');
    expect(m[3]).toBe('1:06:00.0');
  });
});

// =========================================================================
// getCursorZone
// =========================================================================
describe('getCursorZone', () => {
  describe('no timestamp line', () => {
    const line = 'some text'; // 9 chars
    // No timestamps → all zone boundaries are 0 → always rest zone

    it('cursor at start → rest zone', () => {
      expect(getCursorZone(line, 0)).toEqual({ zone: 'rest', offset: 9 });
    });

    it('cursor at middle → rest zone', () => {
      expect(getCursorZone(line, 5)).toEqual({ zone: 'rest', offset: 4 });
    });

    it('cursor at end → rest zone, offset 0', () => {
      expect(getCursorZone(line, 9)).toEqual({ zone: 'rest', offset: 0 });
    });
  });

  describe('start timestamp only: "5:30.0 text"', () => {
    // Groups: start="5:30.0"(6), sep=undef, end=undef, space=" ", desc="text"
    // startEnd=6, sepEnd=6, endTimeEnd=6
    const line = '5:30.0 text'; // 11 chars

    it('cursor at 0 → start zone', () => {
      expect(getCursorZone(line, 0)).toEqual({ zone: 'start', offset: 0 });
    });

    it('cursor at 3 (inside timestamp) → start zone', () => {
      expect(getCursorZone(line, 3)).toEqual({ zone: 'start', offset: 3 });
    });

    it('cursor at 6 (end of timestamp) → start zone', () => {
      expect(getCursorZone(line, 6)).toEqual({ zone: 'start', offset: 6 });
    });

    it('cursor at 7 (after timestamp) → rest zone', () => {
      expect(getCursorZone(line, 7)).toEqual({ zone: 'rest', offset: 4 });
    });

    it('cursor at 11 (end of line) → rest zone', () => {
      expect(getCursorZone(line, 11)).toEqual({ zone: 'rest', offset: 0 });
    });
  });

  describe('start + separator: "5:30.0 - text"', () => {
    // start="5:30.0"(6), sep=" - "(3), end=undef, desc="text"
    // startEnd=6, sepEnd=9, endTimeEnd=9
    const line = '5:30.0 - text'; // 13 chars

    it('cursor at 3 → start zone', () => {
      expect(getCursorZone(line, 3)).toEqual({ zone: 'start', offset: 3 });
    });

    it('cursor at 7 → sep zone', () => {
      expect(getCursorZone(line, 7)).toEqual({ zone: 'sep', offset: 1 });
    });

    it('cursor at 9 → sep zone (boundary)', () => {
      expect(getCursorZone(line, 9)).toEqual({ zone: 'sep', offset: 3 });
    });

    it('cursor at 10 → rest zone', () => {
      expect(getCursorZone(line, 10)).toEqual({ zone: 'rest', offset: 3 });
    });
  });

  describe('start + end: "5:30.0 - 6:30.0 text"', () => {
    // start="5:30.0"(6), sep=" - "(3), end="6:30.0"(6), space=" ", desc="text"
    // startEnd=6, sepEnd=9, endTimeEnd=15
    const line = '5:30.0 - 6:30.0 text'; // 20 chars

    it('cursor at 0 → start zone', () => {
      expect(getCursorZone(line, 0)).toEqual({ zone: 'start', offset: 0 });
    });

    it('cursor at 5 → start zone', () => {
      expect(getCursorZone(line, 5)).toEqual({ zone: 'start', offset: 5 });
    });

    it('cursor at 6 → start zone (boundary)', () => {
      expect(getCursorZone(line, 6)).toEqual({ zone: 'start', offset: 6 });
    });

    it('cursor at 7 → sep zone', () => {
      expect(getCursorZone(line, 7)).toEqual({ zone: 'sep', offset: 1 });
    });

    it('cursor at 9 → sep zone (boundary)', () => {
      expect(getCursorZone(line, 9)).toEqual({ zone: 'sep', offset: 3 });
    });

    it('cursor at 10 → end zone', () => {
      expect(getCursorZone(line, 10)).toEqual({ zone: 'end', offset: 1 });
    });

    it('cursor at 12 → end zone', () => {
      expect(getCursorZone(line, 12)).toEqual({ zone: 'end', offset: 3 });
    });

    it('cursor at 15 → end zone (boundary)', () => {
      expect(getCursorZone(line, 15)).toEqual({ zone: 'end', offset: 6 });
    });

    it('cursor at 16 → rest zone', () => {
      expect(getCursorZone(line, 16)).toEqual({ zone: 'rest', offset: 4 });
    });

    it('cursor at 20 → rest zone (end)', () => {
      expect(getCursorZone(line, 20)).toEqual({ zone: 'rest', offset: 0 });
    });
  });

  describe('HH:MM:SS format: "1:05:30.0 - 1:06:00.0 text"', () => {
    // start="1:05:30.0"(9), sep=" - "(3), end="1:06:00.0"(9)
    // startEnd=9, sepEnd=12, endTimeEnd=21
    const line = '1:05:30.0 - 1:06:00.0 text'; // 26 chars

    it('cursor at 5 → start zone', () => {
      expect(getCursorZone(line, 5)).toEqual({ zone: 'start', offset: 5 });
    });

    it('cursor at 10 → sep zone', () => {
      expect(getCursorZone(line, 10)).toEqual({ zone: 'sep', offset: 1 });
    });

    it('cursor at 15 → end zone', () => {
      expect(getCursorZone(line, 15)).toEqual({ zone: 'end', offset: 3 });
    });

    it('cursor at 23 → rest zone', () => {
      expect(getCursorZone(line, 23)).toEqual({ zone: 'rest', offset: 3 });
    });
  });
});

// =========================================================================
// restoreCursorInLine
// =========================================================================
describe('restoreCursorInLine', () => {
  describe('start zone restoration', () => {
    it('restores to same offset in start zone', () => {
      const pos = restoreCursorInLine('5:31.0 - 6:30.0 text', { zone: 'start', offset: 3 });
      expect(pos).toBe(3);
    });

    it('clamps when start zone shorter', () => {
      // Original had longer start time, new has shorter → clamp
      const pos = restoreCursorInLine('5:30.0 text', { zone: 'start', offset: 8 });
      // startEnd = 6, Min(8, 6) = 6
      expect(pos).toBe(6);
    });

    it('handles HH:MM:SS → MM:SS transition', () => {
      // Was at offset 7 in "1:05:30.0" (HH:MM:SS), now "5:30.0" (MM:SS)
      const pos = restoreCursorInLine('5:30.0 - 6:30.0 text', { zone: 'start', offset: 7 });
      // startEnd = 6, Min(7, 6) = 6
      expect(pos).toBe(6);
    });
  });

  describe('sep zone restoration', () => {
    it('restores to separator position', () => {
      const pos = restoreCursorInLine('5:30.0 - 6:30.0 text', { zone: 'sep', offset: 1 });
      // startEnd=6, 6 + Min(1, 3) = 7
      expect(pos).toBe(7);
    });

    it('clamps when separator missing (fallback)', () => {
      // New line has no separator
      const pos = restoreCursorInLine('5:30.0 text', { zone: 'sep', offset: 1 });
      // startEnd=6, separator=undefined → 6 + Min(1, 0) = 6
      expect(pos).toBe(6);
    });
  });

  describe('end zone restoration', () => {
    it('restores to same offset in end zone', () => {
      const pos = restoreCursorInLine('5:30.0 - 6:30.0 text', { zone: 'end', offset: 3 });
      // sepEnd=9, 9 + Min(3, 6) = 12
      expect(pos).toBe(12);
    });

    it('clamps when end zone shorter', () => {
      const pos = restoreCursorInLine('5:30.0 - 6:30.0 text', { zone: 'end', offset: 8 });
      // sepEnd=9, 9 + Min(8, 6) = 15
      expect(pos).toBe(15);
    });

    it('falls back when no end timestamp', () => {
      const pos = restoreCursorInLine('5:30.0 - text', { zone: 'end', offset: 3 });
      // sepEnd=9, endTime=undefined → 9 + Min(3, 0) = 9
      expect(pos).toBe(9);
    });
  });

  describe('rest zone restoration', () => {
    it('restores offset from end of line', () => {
      const pos = restoreCursorInLine('5:30.0 - 6:30.0 text', { zone: 'rest', offset: 2 });
      // endTimeEnd=15, Max(15, 20-2) = Max(15, 18) = 18
      expect(pos).toBe(18);
    });

    it('restores to end when offset=0', () => {
      const pos = restoreCursorInLine('5:30.0 - 6:30.0 text', { zone: 'rest', offset: 0 });
      expect(pos).toBe(20);
    });

    it('clamps to endTimeEnd when offset exceeds text', () => {
      // offset=100 but line only 20 chars → endTimeEnd is the minimum
      const pos = restoreCursorInLine('5:30.0 - 6:30.0 text', { zone: 'rest', offset: 100 });
      // Max(15, 20-100) = Max(15, -80) = 15
      expect(pos).toBe(15);
    });

    it('works on plain text line', () => {
      const pos = restoreCursorInLine('plain text', { zone: 'rest', offset: 4 });
      // All groups undefined → startEnd=0, sepEnd=0, endTimeEnd=0
      // Max(0, 10-4) = 6
      expect(pos).toBe(6);
    });
  });
});

// =========================================================================
// Simulated setStartTime + cursor preservation
// =========================================================================
describe('cursor preservation: setStartTime', () => {
  describe('initial: no timestamp "text"', () => {
    const original = 'text'; // 4 chars

    it('cursor at start (pos 0) → rest zone, moves to description start', () => {
      const r = testCursorPreservation(original, 0, (l) => simulateSetStartTime(l, 330));
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 4 });
      // "5:30.0 text" (11 chars), no separator
      expect(r.editedLine).toBe('5:30.0 text');
      // rest,4 → Max(6, 11-4) = 7 → description start
      expect(r.editedCursor).toBe(7);
      expect(r.undoCursor).toBe(0);
      expect(r.redoCursor).toBe(r.editedCursor);
    });

    it('cursor at end (pos 4) → preserved', () => {
      const r = testCursorPreservation(original, 4, (l) => simulateSetStartTime(l, 330));
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 0 });
      expect(r.editedLine).toBe('5:30.0 text');
      expect(r.editedCursor).toBe(11); // end of edited line
      expect(r.undoCursor).toBe(4);
      expect(r.redoCursor).toBe(r.editedCursor);
    });

    it('cursor in middle (pos 2) → preserved', () => {
      const r = testCursorPreservation(original, 2, (l) => simulateSetStartTime(l, 330));
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      expect(r.editedLine).toBe('5:30.0 text');
      expect(r.editedCursor).toBe(9); // 11-2
      expect(r.undoCursor).toBe(2);
    });
  });

  describe('initial: start + separator "5:30.0 - text"', () => {
    const original = '5:30.0 - text'; // 13 chars

    it('cursor in start zone (pos 3) → stays in start zone', () => {
      const r = testCursorPreservation(original, 3, (l) => simulateSetStartTime(l, 331));
      expect(r.zoneInfo).toEqual({ zone: 'start', offset: 3 });
      expect(r.editedLine).toBe('5:31.0 - text');
      expect(r.editedCursor).toBe(3);
      expect(r.undoCursor).toBe(3);
    });

    it('cursor in sep zone (pos 7) → stays in sep zone', () => {
      const r = testCursorPreservation(original, 7, (l) => simulateSetStartTime(l, 600));
      expect(r.zoneInfo).toEqual({ zone: 'sep', offset: 1 });
      // 600s = 10:00.0 (7 chars → length change!)
      expect(r.editedLine).toBe('10:00.0 - text');
      // sep restored: startEnd(7) + Min(1, 3) = 8
      expect(r.editedCursor).toBe(8);
      // undo: startEnd(6) + Min(1, 3) = 7
      expect(r.undoCursor).toBe(7);
    });

    it('cursor in rest zone (pos 11) → stays at same offset from end', () => {
      const r = testCursorPreservation(original, 11, (l) => simulateSetStartTime(l, 331));
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      expect(r.editedCursor).toBe(11); // same position (line length unchanged)
      expect(r.undoCursor).toBe(11);
    });
  });

  describe('initial: start + end "5:30.0 - 6:30.0 text"', () => {
    const original = '5:30.0 - 6:30.0 text'; // 20 chars

    it('cursor in start zone (pos 3) → preserved', () => {
      const r = testCursorPreservation(original, 3, (l) => simulateSetStartTime(l, 331));
      expect(r.zoneInfo).toEqual({ zone: 'start', offset: 3 });
      expect(r.editedLine).toBe('5:31.0 - 6:30.0 text');
      expect(r.editedCursor).toBe(3);
      expect(r.undoCursor).toBe(3);
    });

    it('cursor in end zone (pos 12) → preserved', () => {
      const r = testCursorPreservation(original, 12, (l) => simulateSetStartTime(l, 600));
      expect(r.zoneInfo).toEqual({ zone: 'end', offset: 3 });
      // 10:00.0 (7 chars) → "10:00.0 - 6:30.0 text"
      expect(r.editedLine).toBe('10:00.0 - 6:30.0 text');
      // sepEnd=10, end offset 3 → 10+3=13
      expect(r.editedCursor).toBe(13);
      // undo: sepEnd=9, 9+3=12
      expect(r.undoCursor).toBe(12);
    });

    it('cursor in rest zone (pos 18) → preserved', () => {
      const r = testCursorPreservation(original, 18, (l) => simulateSetStartTime(l, 600));
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      // "10:00.0 - 6:30.0 text" (21 chars)
      expect(r.editedCursor).toBe(19); // 21-2
      expect(r.undoCursor).toBe(18); // 20-2
    });
  });
});

// =========================================================================
// Simulated setEndTime + cursor preservation
// =========================================================================
describe('cursor preservation: setEndTime', () => {
  describe('initial: no timestamp "text"', () => {
    const original = 'text'; // 4 chars

    it('cursor in middle (pos 2) → preserved as rest zone', () => {
      const r = testCursorPreservation(original, 2, (l) => simulateSetEndTime(l, 390));
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      // " - 6:30.0 text" (14 chars), no fake 00:00
      expect(r.editedLine).toBe(' - 6:30.0 text');
      // endTimeEnd=9, Max(9, 14-2) = 12
      expect(r.editedCursor).toBe(12);
      expect(r.undoCursor).toBe(2);
    });
  });

  describe('initial: start + separator "5:30.0 - text"', () => {
    const original = '5:30.0 - text'; // 13 chars

    it('cursor in start zone (pos 3) → stays in start zone', () => {
      const r = testCursorPreservation(original, 3, (l) => simulateSetEndTime(l, 390));
      expect(r.zoneInfo).toEqual({ zone: 'start', offset: 3 });
      // "5:30.0 - 6:30.0 text" (20 chars)
      expect(r.editedLine).toBe('5:30.0 - 6:30.0 text');
      expect(r.editedCursor).toBe(3); // still at offset 3 in start
      expect(r.undoCursor).toBe(3);
    });

    it('cursor in rest zone (pos 11) → preserved', () => {
      const r = testCursorPreservation(original, 11, (l) => simulateSetEndTime(l, 390));
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      // "5:30.0 - 6:30.0 text" (20 chars)
      expect(r.editedCursor).toBe(18); // 20-2
      expect(r.undoCursor).toBe(11); // 13-2
    });

    it('cursor in sep zone (pos 7) → stays in sep zone', () => {
      const r = testCursorPreservation(original, 7, (l) => simulateSetEndTime(l, 390));
      expect(r.zoneInfo).toEqual({ zone: 'sep', offset: 1 });
      // "5:30.0 - 6:30.0 text" → startEnd=6, 6+Min(1,3)=7
      expect(r.editedCursor).toBe(7);
      expect(r.undoCursor).toBe(7);
    });
  });

  describe('initial: start + end "5:30.0 - 6:30.0 text"', () => {
    const original = '5:30.0 - 6:30.0 text'; // 20 chars

    it('cursor in end zone (pos 12) → stays in end zone with new time', () => {
      const r = testCursorPreservation(original, 12, (l) => simulateSetEndTime(l, 420));
      expect(r.zoneInfo).toEqual({ zone: 'end', offset: 3 });
      // "5:30.0 - 7:00.0 text" (20 chars, same length)
      expect(r.editedLine).toBe('5:30.0 - 7:00.0 text');
      expect(r.editedCursor).toBe(12);
      expect(r.undoCursor).toBe(12);
    });

    it('cursor in start zone (pos 5) → unaffected', () => {
      const r = testCursorPreservation(original, 5, (l) => simulateSetEndTime(l, 3660));
      expect(r.zoneInfo).toEqual({ zone: 'start', offset: 5 });
      // 3660s = 1:01:00.0 (9 chars) → "5:30.0 - 1:01:00.0 text" (23 chars)
      expect(r.editedLine).toBe('5:30.0 - 1:01:00.0 text');
      expect(r.editedCursor).toBe(5);
      expect(r.undoCursor).toBe(5);
    });

    it('cursor in rest zone (pos 18) → preserved', () => {
      const r = testCursorPreservation(original, 18, (l) => simulateSetEndTime(l, 3660));
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      // "5:30.0 - 1:01:00.0 text" (23 chars)
      expect(r.editedCursor).toBe(21); // 23-2
      expect(r.undoCursor).toBe(18); // 20-2
    });
  });
});

// =========================================================================
// Simulated nudgeTimestamp + cursor preservation
// =========================================================================
describe('cursor preservation: nudgeTimestamp', () => {
  describe('nudge start time', () => {
    const original = '5:30.0 - 6:30.0 text'; // 20 chars

    it('+1s: cursor in start zone preserved', () => {
      const r = testCursorPreservation(original, 3, (l) => simulateNudge(l, 'start', 1)!);
      expect(r.zoneInfo).toEqual({ zone: 'start', offset: 3 });
      expect(r.editedLine).toBe('5:31.0 - 6:30.0 text');
      expect(r.editedCursor).toBe(3);
      expect(r.undoCursor).toBe(3);
    });

    it('-1s: cursor in end zone preserved', () => {
      const r = testCursorPreservation(original, 12, (l) => simulateNudge(l, 'start', -1)!);
      expect(r.zoneInfo).toEqual({ zone: 'end', offset: 3 });
      expect(r.editedLine).toBe('5:29.0 - 6:30.0 text');
      expect(r.editedCursor).toBe(12);
      expect(r.undoCursor).toBe(12);
    });

    it('+0.1s: cursor in rest zone preserved', () => {
      const r = testCursorPreservation(original, 18, (l) => simulateNudge(l, 'start', 0.1)!);
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      expect(r.editedLine).toBe('5:30.1 - 6:30.0 text');
      expect(r.editedCursor).toBe(18);
      expect(r.undoCursor).toBe(18);
    });

    it('-0.1s: cursor in sep zone preserved', () => {
      const r = testCursorPreservation(original, 7, (l) => simulateNudge(l, 'start', -0.1)!);
      expect(r.zoneInfo).toEqual({ zone: 'sep', offset: 1 });
      expect(r.editedCursor).toBe(7);
      expect(r.undoCursor).toBe(7);
    });
  });

  describe('nudge end time', () => {
    const original = '5:30.0 - 6:30.0 text'; // 20 chars

    it('+1s: cursor in end zone preserved', () => {
      const r = testCursorPreservation(original, 12, (l) => simulateNudge(l, 'end', 1)!);
      expect(r.zoneInfo).toEqual({ zone: 'end', offset: 3 });
      expect(r.editedLine).toBe('5:30.0 - 6:31.0 text');
      expect(r.editedCursor).toBe(12);
      expect(r.undoCursor).toBe(12);
    });

    it('-1s: cursor in start zone unaffected', () => {
      const r = testCursorPreservation(original, 3, (l) => simulateNudge(l, 'end', -1)!);
      expect(r.zoneInfo).toEqual({ zone: 'start', offset: 3 });
      expect(r.editedLine).toBe('5:30.0 - 6:29.0 text');
      expect(r.editedCursor).toBe(3);
      expect(r.undoCursor).toBe(3);
    });

    it('+0.1s: cursor in rest zone preserved', () => {
      const r = testCursorPreservation(original, 18, (l) => simulateNudge(l, 'end', 0.1)!);
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      expect(r.editedCursor).toBe(18);
      expect(r.undoCursor).toBe(18);
    });

    it('-0.1s: cursor in sep zone preserved', () => {
      const r = testCursorPreservation(original, 7, (l) => simulateNudge(l, 'end', -0.1)!);
      expect(r.zoneInfo).toEqual({ zone: 'sep', offset: 1 });
      expect(r.editedCursor).toBe(7);
      expect(r.undoCursor).toBe(7);
    });
  });

  describe('nudge causing timestamp length change', () => {
    it('9:59.0 → 10:00.0 (+1s): start zone cursor preserved', () => {
      const original = '9:59.0 - 10:30.0 text'; // 21 chars
      const r = testCursorPreservation(original, 3, (l) => simulateNudge(l, 'start', 1)!);
      expect(r.zoneInfo).toEqual({ zone: 'start', offset: 3 });
      // "10:00.0 - 10:30.0 text" (22 chars, start grew 6→7)
      expect(r.editedLine).toBe('10:00.0 - 10:30.0 text');
      expect(r.editedCursor).toBe(3); // still at offset 3 in start
      expect(r.undoCursor).toBe(3);
    });

    it('10:00.0 → 9:59.0 (-1s): rest zone cursor preserved', () => {
      const original = '10:00.0 - 10:30.0 text'; // 22 chars
      const r = testCursorPreservation(original, 20, (l) => simulateNudge(l, 'start', -1)!);
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      // "9:59.0 - 10:30.0 text" (21 chars, start shrunk 7→6)
      expect(r.editedLine).toBe('9:59.0 - 10:30.0 text');
      expect(r.editedCursor).toBe(19); // 21-2
      expect(r.undoCursor).toBe(20); // 22-2
    });

    it('10:00.0 → 9:59.0 (-1s): end zone cursor preserved', () => {
      const original = '10:00.0 - 10:30.0 text'; // 22 chars
      // Cursor in end zone at pos 14 (offset 14-10=4 in end)
      const r = testCursorPreservation(original, 14, (l) => simulateNudge(l, 'start', -1)!);
      expect(r.zoneInfo).toEqual({ zone: 'end', offset: 4 });
      // "9:59.0 - 10:30.0 text" → sepEnd=9, 9+4=13
      expect(r.editedCursor).toBe(13);
      // undo → sepEnd=10, 10+4=14
      expect(r.undoCursor).toBe(14);
    });

    it('end time grows: 9:59.0 → 10:00.0 (+1s)', () => {
      const original = '5:30.0 - 9:59.0 text'; // 20 chars
      const r = testCursorPreservation(original, 18, (l) => simulateNudge(l, 'end', 1)!);
      expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 2 });
      // "5:30.0 - 10:00.0 text" (21 chars, end grew 6→7)
      expect(r.editedLine).toBe('5:30.0 - 10:00.0 text');
      expect(r.editedCursor).toBe(19); // 21-2
      expect(r.undoCursor).toBe(18); // 20-2
    });
  });

  describe('nudge to boundary (0s floor)', () => {
    it('nudge start below 0 → clamped to 0', () => {
      const original = '0:02.0 - 1:00.0 text';
      const r = testCursorPreservation(original, 3, (l) => simulateNudge(l, 'start', -5)!);
      expect(r.zoneInfo).toEqual({ zone: 'start', offset: 3 });
      // 2s - 5s = -3s → clamped to 0 → "0:00.0"
      expect(r.editedLine).toBe('0:00.0 - 1:00.0 text');
      expect(r.editedCursor).toBe(3);
      expect(r.undoCursor).toBe(3);
    });
  });
});

// =========================================================================
// Korean text scenarios (multi-byte characters)
// =========================================================================
describe('cursor preservation: Korean text', () => {
  it('setEndTime with cursor between Korean chars', () => {
    // "5:30.0 - 불 끄기" (13 chars)
    const original = '5:30.0 - 불 끄기';
    expect(original.length).toBe(13);

    const r = testCursorPreservation(original, 12, (l) => simulateSetEndTime(l, 390));
    expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 1 });
    // "5:30.0 - 6:30.0 불 끄기" (20 chars)
    expect(r.editedLine).toBe('5:30.0 - 6:30.0 불 끄기');
    expect(r.editedCursor).toBe(19); // 20-1 → before 기
    expect(r.undoCursor).toBe(12); // 13-1 → before 기
  });

  it('setStartTime on plain Korean text', () => {
    const original = '불 끄기'; // 4 chars
    // Cursor between 끄 and 기 (pos 3)
    const r = testCursorPreservation(original, 3, (l) => simulateSetStartTime(l, 330));
    expect(r.zoneInfo).toEqual({ zone: 'rest', offset: 1 });
    // "5:30.0 불 끄기" (11 chars), no separator
    expect(r.editedLine).toBe('5:30.0 불 끄기');
    expect(r.editedCursor).toBe(10); // 11-1 → before 기
    expect(r.undoCursor).toBe(3);
  });

  it('nudge start with cursor in Korean description', () => {
    const original = '5:30.0 - 6:30.0 핵심 내용'; // "핵심 내용"
    const len = original.length; // 20 chars
    // Cursor at 핵|심 boundary (pos 17)
    const r = testCursorPreservation(original, 17, (l) => simulateNudge(l, 'start', 1)!);
    expect(r.zoneInfo).toEqual({ zone: 'rest', offset: len - 17 });
    expect(r.editedLine).toBe('5:31.0 - 6:30.0 핵심 내용');
    // Same length → same cursor pos
    expect(r.editedCursor).toBe(17);
    expect(r.undoCursor).toBe(17);
  });
});

// =========================================================================
// Cross-state transitions: add then remove via undo
// =========================================================================
describe('cursor preservation: cross-state undo/redo cycles', () => {
  it('no timestamp → setStartTime → undo → redo', () => {
    const original = 'hello world'; // 11 chars
    const cursorPos = 8; // between 'o' and 'r'
    const zone = getCursorZone(original, cursorPos);
    expect(zone).toEqual({ zone: 'rest', offset: 3 });

    const edited = simulateSetStartTime(original, 330);
    // No separator added
    expect(edited).toBe('5:30.0 hello world');

    const editCursor = restoreCursorInLine(edited, zone);
    expect(editCursor).toBe(15); // 18-3 → between 'o' and 'r'

    const undoCursor = restoreCursorInLine(original, zone);
    expect(undoCursor).toBe(8); // back to original

    const redoCursor = restoreCursorInLine(edited, zone);
    expect(redoCursor).toBe(15); // same as edit
  });

  it('start only → setEndTime → nudge end → undo nudge → undo setEndTime', () => {
    const line1 = '5:30.0 - text'; // 13 chars
    const cursor1 = 11; // "te|xt"
    const zone1 = getCursorZone(line1, cursor1);
    expect(zone1).toEqual({ zone: 'rest', offset: 2 });

    // Step 1: setEndTime
    const line2 = simulateSetEndTime(line1, 390);
    expect(line2).toBe('5:30.0 - 6:30.0 text');
    const cursor2 = restoreCursorInLine(line2, zone1);
    expect(cursor2).toBe(18); // 20-2

    // Step 2: nudge end +1s (zone info updated to new position)
    const zone2 = getCursorZone(line2, cursor2);
    expect(zone2).toEqual({ zone: 'rest', offset: 2 });
    const line3 = simulateNudge(line2, 'end', 1)!;
    expect(line3).toBe('5:30.0 - 6:31.0 text');
    const cursor3 = restoreCursorInLine(line3, zone2);
    expect(cursor3).toBe(18);

    // Undo nudge → back to line2, using zone2
    const undoCursor2 = restoreCursorInLine(line2, zone2);
    expect(undoCursor2).toBe(18);

    // Undo setEndTime → back to line1, using zone2 (zone from after first edit)
    // zone2 = rest,2 → on line1 (13 chars): Max(9, 13-2) = 11
    const undoCursor1 = restoreCursorInLine(line1, zone2);
    expect(undoCursor1).toBe(11);
  });
});

// =========================================================================
// Edge cases
// =========================================================================
describe('edge cases', () => {
  it('empty line → setStartTime', () => {
    const r = testCursorPreservation('', 0, (l) => simulateSetStartTime(l, 0));
    // Just the timestamp, no separator
    expect(r.editedLine).toBe('0:00.0');
    // rest,0 → Max(6, 6-0) = 6 → end of line
    expect(r.editedCursor).toBe(6);
    expect(r.undoCursor).toBe(0);
  });

  it('empty line → setEndTime', () => {
    const r = testCursorPreservation('', 0, (l) => simulateSetEndTime(l, 60));
    // " - 종료시간", no fake 00:00
    expect(r.editedLine).toBe(' - 1:00.0');
    // rest,0 → Max(9, 9-0) = 9 → end of line
    expect(r.editedCursor).toBe(9);
    expect(r.undoCursor).toBe(0);
  });

  it('cursor at zone boundary: startEnd', () => {
    const line = '5:30.0 - 6:30.0 text';
    // Cursor exactly at startEnd (6) → start zone
    expect(getCursorZone(line, 6)).toEqual({ zone: 'start', offset: 6 });
  });

  it('cursor at zone boundary: sepEnd', () => {
    const line = '5:30.0 - 6:30.0 text';
    // Cursor exactly at sepEnd (9) → sep zone
    expect(getCursorZone(line, 9)).toEqual({ zone: 'sep', offset: 3 });
  });

  it('cursor at zone boundary: endTimeEnd', () => {
    const line = '5:30.0 - 6:30.0 text';
    // Cursor exactly at endTimeEnd (15) → end zone
    expect(getCursorZone(line, 15)).toEqual({ zone: 'end', offset: 6 });
  });

  it('whitespace-only description', () => {
    const line = '5:30.0 - 6:30.0   '; // trailing spaces
    const zone = getCursorZone(line, 18);
    expect(zone.zone).toBe('rest');
    expect(zone.offset).toBe(line.length - 18);
  });

  it('decimal timestamp with multiple digits: 5:30.15', () => {
    const line = '5:30.15 - 6:30.0 text';
    // start = "5:30.15" (7 chars)
    const zone = getCursorZone(line, 6);
    expect(zone).toEqual({ zone: 'start', offset: 6 });
    expect(getCursorZone(line, 7)).toEqual({ zone: 'start', offset: 7 });
    expect(getCursorZone(line, 8).zone).toBe('sep');
  });

  it('restoreCursorInLine with start zone on no-timestamp line', () => {
    const pos = restoreCursorInLine('no timestamps here', { zone: 'start', offset: 3 });
    // No startTime → startEnd=0, Min(3, 0) = 0
    expect(pos).toBe(0);
  });
});
