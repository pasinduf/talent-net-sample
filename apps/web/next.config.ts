import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Output as a standalone build — required for Amplify SSR deployments
  output: 'standalone',

  // Transpile shared monorepo packages
  transpilePackages: ['@talent-net/types'],

  // Public env vars accessible in the browser
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  },

  // Image optimization config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },

  // Route groups configuration
  async redirects() {
    return [];
  },
};

export default nextConfig;
