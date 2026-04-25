/** @type {import('next').NextConfig} */
const nextConfig = {
  // Private superadmin bookmark URL (no in-app links); serves the same page as /superadmin/login.
  async rewrites() {
    return [{ source: '/super/signin', destination: '/superadmin/login' }];
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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
};

module.exports = nextConfig;
