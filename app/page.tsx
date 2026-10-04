import type { Metadata } from 'next';
import { KitchenCounterApp } from '@/components/kitchen-counter-app';
import { siteDescription, siteName, siteTagline, siteUrl } from '@/lib/site';

// Title and description are inherited from the root layout; the home route only
// needs to claim the canonical origin so query-string variants collapse into it.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Structured data for the single app route. `SoftwareApplication` is what earns
 * the rich result for a tool like this; the zero-price `offers` block is what
 * makes Google render the "Free" annotation.
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteName,
  alternateName: siteTagline,
  url: siteUrl,
  description: siteDescription,
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Open play court rotation for any number of players and courts',
    'Matches drawn by skill level, with balanced and random modes',
    'Fair queue that avoids repeat partners and back-to-back sit-outs',
    'Live standings with wins, win rate and point differential',
    'Automatic doubles serving rotation and side-out tracking',
    'Server number (the third number) called for you',
    'Live player and team statistics',
    'Finished matches saved on your device',
    'Works offline once loaded',
    'Screen wake lock for courtside use',
    'No account, no sign-up, no ads',
  ],
  author: {
    '@type': 'Person',
    name: 'serocode',
    url: 'https://github.com/serocode',
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <KitchenCounterApp />
    </>
  );
}
