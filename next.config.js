const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  outputFileTracingRoot: path.join(__dirname, '../'),
  experimental: {},
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // Prevent bundling native onnxruntime-node binaries; transformers will fall back to WASM in browser.
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        os: false,
      };
    }
    // Ignore binary bindings for all platforms
    config.module.rules.push({
      test: /onnxruntime_binding\.node$/,
      use: 'null-loader'
    });
    // Provide empty module for optional 'zlib-sync' dependency sometimes attempted by discord.js
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'zlib-sync': false
    };
    return config;
  },
  env: {
    TRANSFORMERS_BACKEND: 'wasm',
  }
};

module.exports = nextConfig;
