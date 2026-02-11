import { Metadata } from 'next';
import { getDB, DBProject } from '@/lib/db/adapter';
import SharePageClient from './SharePageClient';

interface PageProps {
  params: Promise<{ shareId: string }>;
}

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

// Generate dynamic metadata for Open Graph
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;

  const defaultMetadata: Metadata = {
    title: '공유된 클립 - ClipNote',
    description: 'ClipNote로 만든 비디오 클립을 확인해보세요.',
  };

  try {
    const db = await getDB();
    const project = await db.Project.findOne({ shareId }) as DBProject | null;

    if (!project || !project.isShared) {
      return defaultMetadata;
    }

    const clips = parseClipsFromNotes(project.notes);
    const title = `${project.title} - ClipNote`;
    const description = `${clips.length}개의 하이라이트 클립이 포함된 영상입니다. ClipNote로 만들어졌습니다.`;
    const thumbnailUrl = project.thumbnailUrl || '/og-default.png';

    return {
      title,
      description,
      openGraph: {
        title: project.title,
        description,
        type: 'video.other',
        siteName: 'ClipNote',
        images: [
          {
            url: thumbnailUrl,
            width: 1200,
            height: 630,
            alt: project.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: project.title,
        description,
        images: [thumbnailUrl],
      },
    };
  } catch (error) {
    console.error('Failed to generate metadata:', error);
    return defaultMetadata;
  }
}

export default function SharePage() {
  return <SharePageClient />;
}
