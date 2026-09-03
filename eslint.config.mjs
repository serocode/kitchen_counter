import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

/**
 * Next 16 removed the `next lint` command, so ESLint is wired up directly.
 * `eslint-config-next` ships flat-config arrays, which nest inside
 * `defineConfig` as-is.
 *
 * ESLint is pinned to 9.x: `eslint-plugin-react` (a transitive dependency of
 * eslint-config-next) still declares `eslint: ^9.7` as its peak peer range and
 * calls `context.getFilename()`, which ESLint 10 removed.
 */
export default defineConfig([
  globalIgnores(['.next/**', 'next-env.d.ts', 'tsconfig.tsbuildinfo']),
  nextCoreWebVitals,
  nextTypeScript,
  {
    name: 'kitchen-counter/overrides',
    rules: {
      // next.config.ts sets `images.unoptimized: true`, so `next/image` would
      // add a wrapper and a client component for no optimization benefit. The
      // two images here are a 16KB header logo and small base64 player photos.
      '@next/next/no-img-element': 'off',

      // Pages-Router-only rule: it fires on any <link> font in <head>, but a
      // stylesheet in an App Router *root* layout does apply to every route.
      '@next/next/no-page-custom-font': 'off',

      // eslint-plugin-react-hooks v7 turned the React Compiler rule set on by
      // default. Every hit in this codebase is an effect synchronising with an
      // external system (localStorage, the Screen Wake Lock API) — the case the
      // rule's own docs carve out but cannot detect. Kept as a warning so new
      // occurrences stay visible instead of being silently allowed.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
