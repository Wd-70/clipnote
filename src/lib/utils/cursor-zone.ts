// Timestamp pattern: supports MM:SS, M:SS, HH:MM:SS, and optional decimal seconds
// Groups: (startTime)(separator)(endTime)(space)(description)
export const TIMESTAMP_PATTERN = /^((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)?(\s*-\s*)?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?)?(\s+)?(.*)$/;

// Cursor zone tracking for preserving cursor position across timestamp edits.
// We split a line into zones: [startTime][separator][endTime][rest]
// and remember which zone the cursor is in + offset within that zone.
export type CursorZone = 'start' | 'sep' | 'end' | 'rest';
export interface CursorZoneInfo { zone: CursorZone; offset: number }

export function getCursorZone(line: string, cursorInLine: number): CursorZoneInfo {
  const match = line.match(TIMESTAMP_PATTERN);
  if (!match) return { zone: 'rest', offset: line.length - cursorInLine };

  const [, startTime, separator, endTime] = match;
  const startEnd = startTime?.length || 0;
  const sepEnd = startEnd + (separator?.length || 0);
  const endTimeEnd = sepEnd + (endTime?.length || 0);

  if (startEnd > 0 && cursorInLine <= startEnd) return { zone: 'start', offset: cursorInLine };
  if (sepEnd > startEnd && cursorInLine <= sepEnd) return { zone: 'sep', offset: cursorInLine - startEnd };
  if (endTimeEnd > sepEnd && cursorInLine <= endTimeEnd) return { zone: 'end', offset: cursorInLine - sepEnd };
  // 'rest' zone: offset from line end (stable when timestamps change)
  return { zone: 'rest', offset: line.length - cursorInLine };
}

export function restoreCursorInLine(newLine: string, zoneInfo: CursorZoneInfo): number {
  const match = newLine.match(TIMESTAMP_PATTERN);
  if (!match) return Math.max(0, newLine.length - zoneInfo.offset);

  const [, startTime, separator, endTime] = match;
  const startEnd = startTime?.length || 0;
  const sepEnd = startEnd + (separator?.length || 0);
  const endTimeEnd = sepEnd + (endTime?.length || 0);

  switch (zoneInfo.zone) {
    case 'start': return Math.min(zoneInfo.offset, startEnd);
    case 'sep': return startEnd + Math.min(zoneInfo.offset, (separator?.length || 0));
    case 'end': return sepEnd + Math.min(zoneInfo.offset, (endTime?.length || 0));
    case 'rest': return Math.max(endTimeEnd, newLine.length - zoneInfo.offset);
  }
}
