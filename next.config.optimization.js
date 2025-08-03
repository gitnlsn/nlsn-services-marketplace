// Optional Next.js optimization configuration
// This file provides additional optimizations that can be imported into next.config.js

/** @type {import('next').NextConfig} */
const optimizationConfig = {
  // Bundle analysis and optimization
  experimental: {
    // Enable optimizePackageImports for better tree shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
    
    // Enable modern bundling optimizations
    turbo: {
      resolveAlias: {
        // Optimize common library imports
        '@/components': './src/components',
        '@/lib': './src/lib',
        '@/hooks': './src/hooks',
      },
    },
  },

  // Image optimization
  images: {
    // Enable modern image formats
    formats: ['image/webp', 'image/avif'],
    
    // Optimize image loading
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    
    // Add image domains if needed
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Bundle analyzer - only in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: isServer ? 8888 : 8889,
          openAnalyzer: true,
        })
      );
    }

    // Optimize chunks
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            enforce: true,
          },
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            priority: 20,
            enforce: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }

    // Optimize for better tree shaking
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;

    return config;
  },

  // Compression
  compress: true,

  // Production source maps for better debugging
  productionBrowserSourceMaps: false, // Set to true if you need source maps in production

  // Optimize fonts
  optimizeFonts: true,

  // Server-side rendering optimizations
  swcMinify: true,

  // Static optimization
  trailingSlash: false,
  
  // Reduce bundle size by removing unused CSS
  experimental: {
    ...optimizationConfig.experimental,
    cssChunking: true,
  },
};

module.exports = optimizationConfig;