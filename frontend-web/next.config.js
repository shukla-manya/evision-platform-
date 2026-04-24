/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['evision-uploads.s3.ap-south-1.amazonaws.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
};

module.exports = nextConfig;
