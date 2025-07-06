/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configure external image domains
  images: {
    domains: [
      'gateway.pinata.cloud',
      'lavender-left-hookworm-315.mypinata.cloud', // Add your Pinata gateway
      'ipfs.io',
      'cloudflare-ipfs.com',
      'nftstorage.link',
      'via.placeholder.com',
      'api.dicebear.com',
      'drive.google.com',
      'lh3.googleusercontent.com',
      'docs.google.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.mypinata.cloud', // Allow all Pinata cloud subdomains
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        port: '',
        pathname: '/**',
      }
    ]
  },
}

module.exports = nextConfig