import type { MetadataRoute } from 'next';
import { getDB } from '@/lib/db/adapter';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clipnote.link';
  const locales = ['ko', 'en', 'ja', 'zh'];

  // Static pages (landing page per locale)
  const staticPages: MetadataRoute.Sitemap = locales.flatMap(locale => {
    const prefix = locale === 'ko' ? '' : `/${locale}`;
    return [
      {
        url: `${baseUrl}${prefix}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 1.0,
      },
    ];
  });

  // Dynamic shared project pages
  let sharePages: MetadataRoute.Sitemap = [];
  try {
    const db = await getDB();
    const sharedProjects = await db.Project.find({ isShared: true }).select('shareId updatedAt');
    sharePages = sharedProjects.map((p: { shareId: string; updatedAt?: Date }) => ({
      url: `${baseUrl}/share/${p.shareId}`,
      lastModified: p.updatedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Failed to fetch shared projects for sitemap:', error);
  }

  return [...staticPages, ...sharePages];
}
