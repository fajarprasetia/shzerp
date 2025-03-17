/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Disable React strict mode temporarily to prevent double rendering issues
  reactStrictMode: false,
  // Set output to 'standalone' for better compatibility
  output: 'standalone',
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
