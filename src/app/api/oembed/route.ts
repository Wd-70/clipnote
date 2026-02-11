import { NextRequest, NextResponse } from 'next/server';
import { getDB, DBProject } from '@/lib/db/adapter';

// Helper to parse clips from notes
function parseClipsFromNotes(notes: unknown): Array<{ startTime: number; endTime: number; text: string }> {
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

// GET /api/oembed?url=...&format=json&maxwidth=...&maxheight=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const format = searchParams.get('format') || 'json';
    const maxwidth = parseInt(searchParams.get('maxwidth') || '640', 10);
    const maxheight = parseInt(searchParams.get('maxheight') || '360', 10);

    // Only JSON format supported
    if (format !== 'json') {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 501 });
    }

    if (!url) {
      return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    // Extract shareId from URL
    // Supports: /share/XXXXX, /en/share/XXXXX, /ko/share/XXXXX, etc.
    const shareIdMatch = url.match(/\/share\/([A-Za-z0-9]+)/);
    if (!shareIdMatch) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 404 });
    }
    const shareId = shareIdMatch[1];

    const db = await getDB();
    const project = await db.Project.findOne({ shareId }) as DBProject | null;

    if (!project || !project.isShared) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const clips = parseClipsFromNotes(project.notes);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

    // Constrain dimensions while maintaining 16:9 aspect ratio
    let width = Math.min(maxwidth, 640);
    let height = Math.round(width * 9 / 16);
    if (height > maxheight) {
      height = maxheight;
      width = Math.round(height * 16 / 9);
    }

    const embedUrl = `${baseUrl}/embed/${shareId}`;
    const description = `${clips.length} highlight clips`;

    const oembedResponse = {
      type: 'video',
      version: '1.0',
      title: project.title,
      provider_name: 'ClipNote',
      provider_url: baseUrl || 'https://clipnote.link',
      thumbnail_url: project.thumbnailUrl || undefined,
      thumbnail_width: project.thumbnailUrl ? 480 : undefined,
      thumbnail_height: project.thumbnailUrl ? 360 : undefined,
      html: `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`,
      width,
      height,
    };

    return NextResponse.json(oembedResponse, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[API /api/oembed]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
