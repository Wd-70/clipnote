import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clipnote.link';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/share/', '/en/', '/ja/', '/zh/'],
        disallow: ['/dashboard', '/projects', '/settings', '/points', '/admin', '/api/', '/embed/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
