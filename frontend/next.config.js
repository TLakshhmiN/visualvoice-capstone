/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['static.arasaac.org', 'api.arasaac.org'],
    remotePatterns: [
      { protocol: 'https', hostname: 'static.arasaac.org' },
      { protocol: 'https', hostname: 'api.arasaac.org' },
      { protocol: 'https', hostname: 'lakshhminarayanan-visualvoice-api.hf.space' },
      { protocol: 'https', hostname: '*.hf.space' }
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://lakshhminarayanan-visualvoice-api.hf.space',
  }
};
module.exports = nextConfig;
