/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: produces src/viewer/out/index.html + _next/static/* chunks.
  // scripts/inline-next-build.mjs then inlines those chunks into one
  // self-contained HTML file at templates/plan-viewer.html, same as the
  // previous Vite (vite-plugin-singlefile) build did.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  // No ESLint config in this repo - don't fail builds looking for one.
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // Bundle everything into as few chunks as possible so the inline step
    // only has to deal with one JS file instead of several code-split ones.
    config.optimization.splitChunks = false;
    config.optimization.runtimeChunk = false;
    return config;
  },
};

export default nextConfig;
