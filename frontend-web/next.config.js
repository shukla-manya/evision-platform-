/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: '/deals', destination: '/shop', permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'evision-uploads.s3.ap-south-1.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

module.exports = nextConfig;
