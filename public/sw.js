/*
 * Kitchen Counter service worker.
 *
 * Courtside wifi comes and goes, and a session lives in localStorage anyway, so
 * the only thing the network is needed for is the app itself. This keeps that
 * on the device:
 *
 *  - The page (`/`) is network-first, with a short patience so a poor
 *    connection falls back to the saved copy instead of hanging. It is saved on
 *    install, so the very first visit already works offline.
 *  - Built files, icons and the two Google font hosts are stale-while-revalidate.
 *    Built files are content-hashed, so a saved one is never the wrong one.
 *  - Everything else — analytics, other routes — goes straight to the network.
 *
 * Bump VERSION if the caching rules below change; old caches are removed on
 * activate.
 */

const VERSION = 'v1';
const PAGES = `kc-pages-${VERSION}`;
const ASSETS = `kc-assets-${VERSION}`;

const SHELL = '/';
const NAVIGATION_PATIENCE_MS = 3500;
/**
 * Files kept. Every visit re-saves the files the page used, which moves them to
 * the newest end, so trimming from the oldest end only ever drops files left
 * behind by earlier deploys.
 */
const MAX_ASSETS = 200;

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const STATIC_FILES = ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest'];

const isAsset = url =>
  url.origin === self.location.origin
    ? url.pathname.startsWith('/_next/static/') || STATIC_FILES.includes(url.pathname)
    : FONT_HOSTS.includes(url.hostname);

/**
 * Other origins are fetched with CORS. A plain no-cors response is opaque: its
 * status cannot be read, so an error page could be saved as if it were a font.
 * Google's font hosts allow CORS, and a CORS response satisfies a no-cors
 * request just as well.
 */
const toNetworkRequest = request =>
  new URL(request.url).origin === self.location.origin
    ? request
    : new Request(request.url, { mode: 'cors', credentials: 'omit' });

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map(key => cache.delete(key)));
}

/** The font files a Google Fonts stylesheet points at. */
function fontFilesIn(css) {
  const files = [];
  for (const match of css.matchAll(/url\(\s*['"]?(https:\/\/fonts\.gstatic\.com\/[^'")\s]+)['"]?\s*\)/g)) {
    files.push(match[1]);
  }
  return files;
}

/**
 * Save a response. For a Google Fonts stylesheet, save the font files it names
 * as well: the page cannot be relied on to list them, because a font is only
 * fetched once something draws with it — which can be after the page last
 * reported in. Without the file, the icons would turn into their names.
 */
async function keep(cache, request, response) {
  const css = new URL(request.url).hostname === 'fonts.googleapis.com' ? response.clone().text() : null;
  await cache.put(request, response);
  if (css) {
    await Promise.all(fontFilesIn(await css).map(href => fetchAndKeep(cache, new Request(href)).catch(() => undefined)));
  }
}

async function fetchAndKeep(cache, request) {
  const response = await fetch(toNetworkRequest(request));
  if (response.ok) await keep(cache, request, response);
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then(cache => cache.add(new Request(SHELL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.filter(key => key.startsWith('kc-') && key !== PAGES && key !== ASSETS).map(key => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function page(event) {
  const cache = await caches.open(PAGES);

  let stored = Promise.resolve();
  const fresh = fetch(event.request).then(response => {
    // An error page is not worth showing over a good saved one.
    if (!response.ok) throw new Error(`The page responded ${response.status}`);
    stored = cache.put(SHELL, response.clone());
    return response;
  });
  // Keep the worker alive until the fetch settles, even if we stop waiting for it.
  event.waitUntil(fresh.then(() => stored, () => undefined));

  const patience = new Promise(resolve => setTimeout(resolve, NAVIGATION_PATIENCE_MS, null));
  try {
    const winner = await Promise.race([fresh, patience]);
    if (winner) return winner;
  } catch {
    // Offline, or the server errored: fall back to the saved page.
  }

  const saved = await cache.match(SHELL);
  if (saved) return saved;
  // Nothing saved yet, so the network is all there is.
  return fresh;
}

async function asset(event) {
  const cache = await caches.open(ASSETS);
  const saved = await cache.match(event.request, { ignoreVary: true });

  // Saving happens beside the response, never in front of it: a page waiting on
  // a stylesheet should not also wait on the fonts that stylesheet names.
  let background = Promise.resolve();
  const network = fetch(toNetworkRequest(event.request)).then(response => {
    if (response.ok) background = keep(cache, event.request, response.clone()).then(() => trim(cache));
    return response;
  });
  event.waitUntil(network.then(() => background, () => undefined));

  return saved ?? network;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    if (url.origin === self.location.origin && url.pathname === SHELL) event.respondWith(page(event));
    return;
  }
  if (isAsset(url)) event.respondWith(asset(event));
});

/**
 * The page lists everything it loaded once it has settled. Files fetched
 * before this worker took control (the whole of a first visit) were never seen
 * by the fetch handler above, so this is what makes a first visit work offline.
 */
self.addEventListener('message', event => {
  const data = event.data;
  if (!data || data.type !== 'cache-resources' || !Array.isArray(data.urls)) return;
  event.waitUntil(cacheResources(data.urls));
});

async function cacheResources(urls) {
  const cache = await caches.open(ASSETS);
  const wanted = new Set();
  for (const raw of urls) {
    try {
      const url = new URL(raw, self.location.origin);
      if (isAsset(url)) wanted.add(url.href);
    } catch {
      // Not a URL: skip it.
    }
  }

  await Promise.all(
    [...wanted].map(href =>
      // Offline, or the file moved: the next visit tries again.
      fetchAndKeep(cache, new Request(href)).catch(() => undefined),
    ),
  );
  await trim(cache);
}
