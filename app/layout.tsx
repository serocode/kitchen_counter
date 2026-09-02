import type { Metadata, Viewport } from 'next'
import { siteDescription, siteDescriptionShort, siteName, siteTagline, siteUrl } from '@/lib/site'
import { Inter, Lexend } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#090e15',
}

export const metadata: Metadata = {
  // Resolves every relative URL below (and the OG image) to an absolute one.
  metadataBase: new URL(siteUrl),
  // Keyword first, brand second: nobody searches for the brand yet.
  title: {
    default: `${siteTagline} — Free Online Scorekeeper | ${siteName}`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    'pickleball scoreboard',
    'pickleball doubles scoring',
    'pickleball score keeper',
    'doubles serving rotation',
    'pickleball stats tracker',
    'online pickleball scoreboard',
  ],
  authors: [{ name: 'serocode', url: 'https://github.com/serocode' }],
  creator: 'serocode',
  category: 'sports',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName,
    title: `${siteName} — ${siteTagline}`,
    description: siteDescriptionShort,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} — ${siteTagline}`,
    description: siteDescriptionShort,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/kitchen_counter.png',
    apple: '/kitchen_counter.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${lexend.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
