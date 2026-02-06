import { NextRequest, NextResponse } from 'next/server';
import { getDB, DBProject } from '@/lib/db/adapter';

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

interface NoteItem {
  startTime: number;
  endTime: number;
  text: string;
}

// Parse clips from notes
function parseClipsFromNotes(notes: string | NoteItem[]): Array<{ startTime: number; endTime: number; text: string }> {
  if (Array.isArray(notes)) {
    return notes.map((note) => ({
      startTime: note.startTime || 0,
      endTime: note.endTime || 0,
      text: note.text || '',
    }));
  }

  if (typeof notes !== 'string') return [];

  const clips: Array<{ startTime: number; endTime: number; text: string }> = [];
  const lines = notes.split('\n');

  // Regex for timestamp format: MM:SS.d - MM:SS.d or HH:MM:SS - HH:MM:SS
  const timestampRegex = /(\d{1,2}):(\d{2})(?:\.(\d+))?(?::(\d{2})(?:\.(\d+))?)?\s*[-–]\s*(\d{1,2}):(\d{2})(?:\.(\d+))?(?::(\d{2})(?:\.(\d+))?)?/;

  for (const line of lines) {
    const match = line.match(timestampRegex);
    if (match) {
      const parseTime = (h: string, m: string, s?: string, ms?: string): number => {
        if (s !== undefined) {
          return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + (ms ? parseFloat(`0.${ms}`) : 0);
        }
        return parseInt(h) * 60 + parseInt(m) + (ms ? parseFloat(`0.${ms}`) : 0);
      };

      let startTime: number;
      let endTime: number;

      if (match[4]) {
        startTime = parseTime(match[1], match[2], match[4], match[5]);
      } else {
        startTime = parseTime(match[1], match[2], undefined, match[3]);
      }

      if (match[9]) {
        endTime = parseTime(match[6], match[7], match[9], match[10]);
      } else {
        endTime = parseTime(match[6], match[7], undefined, match[8]);
      }

      const textStart = (match.index || 0) + match[0].length;
      const text = line.substring(textStart).trim();

      clips.push({ startTime, endTime, text });
    }
  }

  return clips;
}

// GET /api/share/[shareId] - Get shared project (public endpoint)
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { shareId } = await params;

    const db = await getDB();

    // Find project by shareId
    const project = db.Project.findOne({ shareId }) as DBProject | null;

    if (!project) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Check if sharing is enabled
    if (!project.isShared) {
      return NextResponse.json({ error: 'Share link is disabled' }, { status: 403 });
    }

    // Increment view count
    db.Project.findOneAndUpdate(
      { shareId },
      { $inc: { shareViewCount: 1 } }
    );

    // Parse clips from notes
    const clips = parseClipsFromNotes(project.notes);

    // Return shared project data (excluding sensitive fields)
    return NextResponse.json({
      data: {
        shareId: project.shareId,
        title: project.title,
        videoUrl: project.videoUrl,
        platform: project.platform,
        videoId: project.videoId,
        thumbnailUrl: project.thumbnailUrl,
        clips,
        viewCount: (project.shareViewCount ?? 0) + 1, // Include current view
      }
    });
  } catch (error) {
    console.error('[API /api/share/[shareId] GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
