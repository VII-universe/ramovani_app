/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ramovani/shared-types'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8001',
        pathname: '/static/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8002',
        pathname: '/static/**',
      },
    ],
  },
};

export default nextConfig;