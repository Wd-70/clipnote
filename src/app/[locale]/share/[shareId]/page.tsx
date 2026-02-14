import { Metadata } from 'next';
import { getDB, DBProject } from '@/lib/db/adapter';
import SharePageClient from './SharePageClient';

interface PageProps {
  params: Promise<{ shareId: string }>;
}

// Resolve a thumbnail URL with platform-specific fallback
function resolveThumbnail(project: DBProject): string | null {
  if (project.thumbnailUrl) return project.thumbnailUrl;
  if (project.platform === 'YOUTUBE' && project.videoId) {
    return `https://img.youtube.com/vi/${project.videoId}/hqdefault.jpg`;
  }
  return null;
}

// Convert seconds to ISO 8601 duration (e.g., PT5M30S)
function toISO8601Duration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  let result = 'PT';
  if (h > 0) result += `${h}H`;
  if (m > 0) result += `${m}M`;
  if (s > 0 || result === 'PT') result += `${s}S`;
  return result;
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

  for (const rawLine of lines) {
    // Strip comments (// or #, but not :// in URLs)
    let line = rawLine;
    const dblSlash = line.indexOf('//');
    if (dblSlash !== -1 && (dblSlash === 0 || line[dblSlash - 1] !== ':')) {
      line = line.substring(0, dblSlash);
    } else {
      const hash = line.indexOf('#');
      if (hash !== -1) line = line.substring(0, hash);
    }
    if (!line.trim()) continue;

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
    title: '공유된 클립',
    description: 'ClipNote로 만든 비디오 클립을 확인해보세요.',
  };

  try {
    const db = await getDB();
    const project = await db.Project.findOne({ shareId }) as DBProject | null;

    if (!project || !project.isShared) {
      return defaultMetadata;
    }

    const clips = parseClipsFromNotes(project.notes);
    const clipSummary = clips.length > 0
      ? clips.slice(0, 3).map(c => c.text).filter(Boolean).join(' · ') || `${clips.length}개의 하이라이트 클립`
      : `${project.title} - ClipNote로 만든 비디오 클립`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://clipnote.link';
    const shareUrl = `${baseUrl}/share/${shareId}`;
    const thumbnailUrl = resolveThumbnail(project);
    // Always provide an image: project thumbnail → YouTube thumbnail → default OG
    const ogImage = thumbnailUrl || `${baseUrl}/opengraph-image`;

    return {
      title: project.title,
      description: clipSummary,
      alternates: {
        canonical: shareUrl,
        types: {
          'application/json+oembed': `${baseUrl}/api/oembed?url=${encodeURIComponent(shareUrl)}`,
        },
      },
      openGraph: {
        title: project.title,
        description: clipSummary,
        url: shareUrl,
        type: 'video.other',
        siteName: 'ClipNote',
        images: [{ url: ogImage, width: 1200, height: 630, alt: project.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: project.title,
        description: clipSummary,
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error('Failed to generate metadata:', error);
    return defaultMetadata;
  }
}

export default async function SharePage({ params }: PageProps) {
  const { shareId } = await params;
  let jsonLd = null;

  try {
    const db = await getDB();
    const project = await db.Project.findOne({ shareId }) as DBProject | null;

    if (project && project.isShared) {
      const clips = parseClipsFromNotes(project.notes);
      const clipSummary = clips.length > 0
        ? clips.slice(0, 3).map(c => c.text).filter(Boolean).join(' · ') || `${clips.length}개의 하이라이트 클립`
        : `${project.title} - ClipNote로 만든 비디오 클립`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://clipnote.link';
      const totalDuration = clips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);

      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: project.title,
        description: clipSummary,
        thumbnailUrl: resolveThumbnail(project) || `${baseUrl}/opengraph-image`,
        uploadDate: project.createdAt ? new Date(project.createdAt).toISOString() : new Date().toISOString(),
        duration: toISO8601Duration(project.duration || totalDuration),
        embedUrl: `${baseUrl}/embed/${shareId}`,
        ...(project.shareViewCount != null && {
          interactionStatistic: {
            '@type': 'InteractionCounter',
            interactionType: { '@type': 'WatchAction' },
            userInteractionCount: project.shareViewCount,
          },
        }),
      };
    }
  } catch {
    // Silently fail - JSON-LD is non-critical
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <SharePageClient />
    </>
  );
}
