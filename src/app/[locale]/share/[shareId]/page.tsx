import { Metadata } from 'next';
import SharePageClient from './SharePageClient';

interface PageProps {
  params: Promise<{ shareId: string }>;
}

// Generate dynamic metadata for Open Graph
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  
  try {
    // Fetch share data for metadata
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3500';
    const res = await fetch(`${baseUrl}/api/share/${shareId}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        title: '공유된 클립 - ClipNote',
        description: 'ClipNote로 만든 비디오 클립을 확인해보세요.',
      };
    }

    const { data } = await res.json();
    
    const title = `${data.title} - ClipNote`;
    const description = `${data.clips.length}개의 하이라이트 클립이 포함된 영상입니다. ClipNote로 만들어졌습니다.`;
    const thumbnailUrl = data.thumbnailUrl || '/og-default.png';

    return {
      title,
      description,
      openGraph: {
        title: data.title,
        description,
        type: 'video.other',
        siteName: 'ClipNote',
        images: [
          {
            url: thumbnailUrl,
            width: 1200,
            height: 630,
            alt: data.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: data.title,
        description,
        images: [thumbnailUrl],
      },
    };
  } catch (error) {
    console.error('Failed to generate metadata:', error);
    return {
      title: '공유된 클립 - ClipNote',
      description: 'ClipNote로 만든 비디오 클립을 확인해보세요.',
    };
  }
}

export default function SharePage() {
  return <SharePageClient />;
}
