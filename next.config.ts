import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Hosts allowed to load dev-only /_next/* resources. Hostname only — the
  // port is stripped before matching, and '192.168.1.*' works if DHCP moves us.
  allowedDevOrigins: ['192.168.1.19', '192.168.1.7'],
  async headers() {
    return [
      {
        // The offline worker must never be served from a cache: it is how every
        // other file gets updated.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
