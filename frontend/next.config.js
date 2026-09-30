/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['static.arasaac.org', 'api.arasaac.org'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.arasaac.org',
      },
      {
        protocol: 'https',
        hostname: 'api.arasaac.org',
      }
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  }
};

module.exports = nextConfig;
