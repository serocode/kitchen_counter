/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Hosts allowed to load dev-only /_next/* resources. Hostname only — the
  // port is stripped before matching, and '192.168.1.*' works if DHCP moves us.
  allowedDevOrigins: ['192.168.1.19', '192.168.1.7'],
}

export default nextConfig
