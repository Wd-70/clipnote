import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB, DBProject } from '@/lib/db/adapter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface NoteItem {
  startTime: number;
  endTime: number;
  text: string;
}

// Generate short unique share ID
function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Parse clips from notes string
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
          // HH:MM:SS format
          return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + (ms ? parseFloat(`0.${ms}`) : 0);
        }
        // MM:SS format
        return parseInt(h) * 60 + parseInt(m) + (ms ? parseFloat(`0.${ms}`) : 0);
      };
      
      let startTime: number;
      let endTime: number;
      
      if (match[4]) {
        // HH:MM:SS format for start
        startTime = parseTime(match[1], match[2], match[4], match[5]);
      } else {
        // MM:SS format for start
        startTime = parseTime(match[1], match[2], undefined, match[3]);
      }
      
      if (match[9]) {
        // HH:MM:SS format for end
        endTime = parseTime(match[6], match[7], match[9], match[10]);
      } else {
        // MM:SS format for end
        endTime = parseTime(match[6], match[7], undefined, match[8]);
      }
      
      // Extract text after timestamp
      const textStart = (match.index || 0) + match[0].length;
      const text = line.substring(textStart).trim();
      
      clips.push({ startTime, endTime, text });
    }
  }
  
  return clips;
}

// POST /api/projects/[id]/share - Create share link
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    // Dev mode: use dev-user-id if no session
    const userId = session?.user?.id || (process.env.NODE_ENV === 'development' ? 'dev-user-id' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    
    // Get the project
    const project = db.Project.findOne({
      _id: id,
      userId,
    }) as DBProject | null;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if share already exists for this project
    const existingShare = db.SharedProject.findOne({ projectId: id });
    if (existingShare) {
      // Return existing share
      return NextResponse.json({ 
        data: existingShare,
        message: 'Share link already exists'
      });
    }

    // Parse clips from notes - handle both string and array format
    const notesData = typeof project.notes === 'string' 
      ? project.notes 
      : (project.notes as NoteItem[]);
    const clips = parseClipsFromNotes(notesData);

    if (clips.length === 0) {
      return NextResponse.json({ 
        error: 'No clips found. Add timestamps to your notes first.' 
      }, { status: 400 });
    }

    // Generate unique share ID
    let shareId = generateShareId();
    let attempts = 0;
    while (db.SharedProject.findOne({ shareId }) && attempts < 10) {
      shareId = generateShareId();
      attempts++;
    }

    // Create shared project
    const sharedProject = db.SharedProject.create({
      shareId,
      projectId: id,
      userId,
      title: project.title,
      videoUrl: project.videoUrl,
      platform: project.platform,
      videoId: project.videoId,
      thumbnailUrl: project.thumbnailUrl,
      clips,
      viewCount: 0,
    });

    return NextResponse.json({ 
      data: sharedProject,
      message: 'Share link created successfully'
    });
  } catch (error) {
    console.error('[API /api/projects/[id]/share POST]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/share - Get share info for a project
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    // Dev mode: use dev-user-id if no session
    const userId = session?.user?.id || (process.env.NODE_ENV === 'development' ? 'dev-user-id' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    
    // Get share for this project
    const share = db.SharedProject.findOne({ projectId: id, userId });

    if (!share) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: share });
  } catch (error) {
    console.error('[API /api/projects/[id]/share GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/share - Delete share link
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    // Dev mode: use dev-user-id if no session
    const userId = session?.user?.id || (process.env.NODE_ENV === 'development' ? 'dev-user-id' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    
    // Delete share for this project
    const share = db.SharedProject.findOneAndDelete({ projectId: id, userId });

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Share link deleted successfully' });
  } catch (error) {
    console.error('[API /api/projects/[id]/share DELETE]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
