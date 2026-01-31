/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
  // External packages for server components (Next.js 16+)
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  // Empty turbopack config to use default Turbopack
  turbopack: {},
}

module.exports = nextConfig
