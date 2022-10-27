const path = require('path');
/** @type {import('next').NextConfig} */
const cluster = process.env.SOLANA_CLUSTER;
const IMGIX_URL = cluster === "devnet"
  ? "nina-dev.imgix.net"
  : "nina.imgix.net"
const NEXT_PUBLIC_IMGIX_TOKEN = cluster === "devnet" ? process.env.NEXT_PUBLIC_IMGIX_TOKEN_DEV : process.env.NEXT_PUBLIC_IMGIX_TOKEN

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    IMGIX_URL,
    NEXT_PUBLIC_IMGIX_TOKEN,
    NINA_API_ENDPOINT: process.env.NINA_API_ENDPOINT,
    NINA_PROGRAM_ID: process.env.NINA_PROGRAM_ID,
    SOLANA_CLUSTER_URL: process.env.SOLANA_CLUSTER_URL,
  },
  images: {
    loader: 'imgix',
    path: `https://${IMGIX_URL}/`,
    domains: ["www.arweave.net", "arweave.net", IMGIX_URL],
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920, 2048],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@nina-protocol/js-sdk": path.resolve(__dirname, "../src"),
    }
    return config
  }
}

module.exports = nextConfig
