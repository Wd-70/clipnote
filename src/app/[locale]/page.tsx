import LandingPageClient from './LandingPageClient';

export default function LandingPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clipnote.link';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ClipNote',
    url: baseUrl,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description: 'Edit videos with text notes using AI analysis',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageClient />
    </>
  );
}
