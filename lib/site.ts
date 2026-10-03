/**
 * Single source of truth for canonical URL and shared SEO copy.
 *
 * Every absolute URL Next emits — canonical link, OpenGraph, sitemap, robots —
 * derives from `siteUrl`. Set NEXT_PUBLIC_SITE_URL in the Vercel project (and
 * in .env.local for previews); the fallback below is only a placeholder so a
 * misconfigured deploy fails visibly rather than publishing a wrong canonical.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pickleball-scoreboard-doubles.vercel.app'
).replace(/\/$/, '');

export const siteName = 'Kitchen Counter';

export const siteTagline = 'Pickleball Open Play & Doubles Scoreboard';

export const siteDescription =
  'A free pickleball open play manager and doubles scoreboard. Check players in with a skill level and Kitchen Counter matches them across your courts, keeps the queue fair, and tracks standings — plus a scoreboard that calls server position, side-outs and the third number for you.';

/** Short form for OpenGraph/Twitter cards, which truncate around 200 characters. */
export const siteDescriptionShort =
  'Free open play manager with skill-matched court rotation and live standings, plus a doubles scoreboard that calls the serve. No account needed.';
