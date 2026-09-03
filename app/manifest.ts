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
    // The source art is already a full-bleed dark square with the ball and
    // score inside the middle 80%, which is exactly the maskable safe zone —
    // so the 512 serves both purposes and Android stops letterboxing it.
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Same file, second purpose: Next's Manifest type rejects the spec's
      // space-separated `'any maskable'`, so the pair is declared explicitly.
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    // Shown in the Android install sheet. `form_factor: 'wide'` is what makes
    // a desktop shot render there instead of being ignored.
    screenshots: [
      {
        src: '/screenshots/mobile-main-scoring.png',
        sizes: '1000x1514',
        type: 'image/png',
        form_factor: 'narrow',
      },
      {
        src: '/screenshots/desktop-main-scoring.png',
        sizes: '2560x1426',
        type: 'image/png',
        form_factor: 'wide',
      },
    ],
  };
}
