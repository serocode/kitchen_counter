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

export const siteTagline = 'Pickleball Doubles Scoreboard';

export const siteDescription =
  'A free pickleball doubles scoreboard that tracks server position, side-out rotation, and the third number for you. Live scoring, player stats, match history, and a screen that stays awake on the court.';

/** Short form for OpenGraph/Twitter cards, which truncate around 200 characters. */
export const siteDescriptionShort =
  'Free doubles pickleball scoreboard with automatic server rotation, live stats, and saved match history. No account needed.';
