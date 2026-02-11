import { describe, it, expect } from 'vitest';
import { parseTimeToSeconds, formatSecondsToTime, parseNotesToClips } from '../timestamp';

describe('parseTimeToSeconds', () => {
  it('parses MM:SS format', () => {
    expect(parseTimeToSeconds('1:30')).toBe(90);
    expect(parseTimeToSeconds('0:00')).toBe(0);
    expect(parseTimeToSeconds('10:00')).toBe(600);
  });

  it('parses HH:MM:SS format', () => {
    expect(parseTimeToSeconds('1:00:00')).toBe(3600);
    expect(parseTimeToSeconds('1:30:45')).toBe(5445);
    expect(parseTimeToSeconds('0:05:30')).toBe(330);
  });

  it('parses decimal seconds', () => {
    expect(parseTimeToSeconds('1:30.5')).toBe(90.5);
    expect(parseTimeToSeconds('0:01.25')).toBe(1.25);
    expect(parseTimeToSeconds('1:00:00.5')).toBe(3600.5);
  });

  it('returns 0 for invalid input', () => {
    expect(parseTimeToSeconds('')).toBe(0);
    expect(parseTimeToSeconds('abc')).toBe(0);
  });
});

describe('formatSecondsToTime', () => {
  it('formats seconds under an hour as MM:SS.d', () => {
    expect(formatSecondsToTime(90)).toBe('1:30.0');
    expect(formatSecondsToTime(0)).toBe('0:00.0');
    expect(formatSecondsToTime(59)).toBe('0:59.0');
  });

  it('formats seconds over an hour as H:MM:SS.d', () => {
    expect(formatSecondsToTime(3600)).toBe('1:00:00.0');
    expect(formatSecondsToTime(5445)).toBe('1:30:45.0');
  });

  it('formats fractional seconds', () => {
    expect(formatSecondsToTime(90.5)).toBe('1:30.5');
  });
});

describe('parseNotesToClips', () => {
  it('parses range timestamps (MM:SS - MM:SS)', () => {
    const clips = parseNotesToClips('0:30 - 1:45 Intro\n2:00 - 3:30 Highlight');
    expect(clips).toHaveLength(2);
    expect(clips[0]).toMatchObject({ startTime: 30, endTime: 105, text: 'Intro' });
    expect(clips[1]).toMatchObject({ startTime: 120, endTime: 210, text: 'Highlight' });
  });

  it('parses HH:MM:SS range timestamps', () => {
    const clips = parseNotesToClips('1:00:00 - 1:05:30 Long section');
    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({ startTime: 3600, endTime: 3930 });
  });

  it('parses single timestamps, using next timestamp as end', () => {
    const clips = parseNotesToClips('0:30 Intro\n1:00 Middle\n2:00 End');
    expect(clips).toHaveLength(3);
    expect(clips[0]).toMatchObject({ startTime: 30, endTime: 60 });
    expect(clips[1]).toMatchObject({ startTime: 60, endTime: 120 });
    // Last clip uses fallback duration (startTime + 60)
    expect(clips[2]).toMatchObject({ startTime: 120, endTime: 180 });
  });

  it('uses videoDuration for last single timestamp clip', () => {
    const clips = parseNotesToClips('0:30 Intro\n1:00 Middle', 300);
    expect(clips).toHaveLength(2);
    expect(clips[1]).toMatchObject({ startTime: 60, endTime: 300 });
  });

  it('handles mixed range and single timestamps', () => {
    const clips = parseNotesToClips('0:30 - 1:00 Range clip\n2:00 Single clip\n3:00 Another');
    expect(clips).toHaveLength(3);
    expect(clips[0]).toMatchObject({ startTime: 30, endTime: 60, text: 'Range clip' });
    expect(clips[1]).toMatchObject({ startTime: 120, endTime: 180 });
    expect(clips[2]).toMatchObject({ startTime: 180, endTime: 240 });
  });

  it('returns empty array for empty input', () => {
    expect(parseNotesToClips('')).toEqual([]);
    expect(parseNotesToClips(null as any)).toEqual([]);
    expect(parseNotesToClips(undefined as any)).toEqual([]);
  });

  it('returns empty array for text without timestamps', () => {
    expect(parseNotesToClips('No timestamps here\nJust text')).toEqual([]);
  });

  it('skips clips where endTime <= startTime', () => {
    // Range where start equals end should be skipped
    const clips = parseNotesToClips('1:00 - 1:00 Zero duration');
    expect(clips).toHaveLength(0);
  });

  it('handles decimal timestamps in ranges', () => {
    const clips = parseNotesToClips('0:30.5 - 1:45.3 With decimals');
    expect(clips).toHaveLength(1);
    expect(clips[0].startTime).toBeCloseTo(30.5, 1);
    expect(clips[0].endTime).toBeCloseTo(105.3, 1);
  });

  it('assigns unique IDs to clips', () => {
    const clips = parseNotesToClips('0:30 - 1:00 A\n2:00 - 3:00 B');
    const ids = clips.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('calculates duration for each clip', () => {
    const clips = parseNotesToClips('0:30 - 1:30 One minute clip');
    expect(clips[0].duration).toBe(60);
  });
});
