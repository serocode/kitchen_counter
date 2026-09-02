import type { MetadataRoute } from 'next';
import { siteDescription, siteName, siteTagline } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName} — ${siteTagline}`,
    short_name: siteName,
    description: siteDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#090e15',
    theme_color: '#090e15',
    categories: ['sports', 'utilities'],
    icons: [
      {
        src: '/kitchen_counter.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
