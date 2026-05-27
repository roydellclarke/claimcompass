/** @type {import('next').NextConfig} */
// Where the frontend proxies /api/* to. Resolved at server start, so it can be
// overridden per-deployment with the BACKEND_URL env var. Defaults to the
// docker-compose service name "backend".
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
