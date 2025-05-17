/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'shunhuizhiye.id',
      },
    ],
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Set output to 'standalone' for better compatibility
  output: 'standalone',
  // Disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable static page generation completely
  staticPageGenerationTimeout: 1,
  // Experimental features
  experimental: {
    // Use serverActions instead of serverExternalPackages
    serverActions: {
      allowedOrigins: ['localhost:3000', 'shunhuizhiye.id'],
    },
  },
  // Simplified webpack configuration
  webpack: (config, { isServer }) => {
    // Handle bcrypt in browser
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        bcrypt: path.resolve(__dirname, './lib/bcrypt-browser.js'),
      };
    }

    // Ignore problematic modules
    config.module.rules.push({
      test: /\.html$/,
      issuer: /node_modules/,
      use: 'ignore-loader',
    });

    // Add SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
}

module.exports = nextConfig;
