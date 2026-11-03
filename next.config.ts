import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Removed `partialPrefetching` — not a real Next.js option.
  //
  // `cacheComponents` is valid on Next 16 but changes caching semantics and
  // requires Suspense boundaries you haven't added yet. Enable it deliberately
  // once you've audited.
  //
  // The previous `turbopack.rules` block for `@tailwindcss/turbopack` was
  // suspicious — Tailwind v4 on Turbopack typically uses PostCSS via
  // postcss.config.mjs. If `pnpm install` warned about a missing package,
  // that's why. Add a postcss.config.mjs with `@tailwindcss/postcss` and drop
  // the turbopack rule.
};

export default nextConfig;