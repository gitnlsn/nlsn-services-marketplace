#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * 
 * This script helps analyze the Next.js bundle and identify optimization opportunities.
 * Run with: npm run analyze
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting bundle analysis...\n');

// Check if webpack-bundle-analyzer is installed
try {
  require.resolve('webpack-bundle-analyzer');
} catch (e) {
  console.log('📦 Installing webpack-bundle-analyzer...');
  exec('npm install --save-dev webpack-bundle-analyzer', (error) => {
    if (error) {
      console.error('❌ Failed to install webpack-bundle-analyzer:', error);
      process.exit(1);
    }
    console.log('✅ webpack-bundle-analyzer installed successfully\n');
    runAnalysis();
  });
  return;
}

runAnalysis();

function runAnalysis() {
  console.log('🏗️  Building production bundle with analysis...');
  
  // Set environment variable for analysis
  process.env.ANALYZE = 'true';
  
  exec('npm run build', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Build failed:', error);
      console.error(stderr);
      process.exit(1);
    }
    
    console.log('✅ Build completed successfully!');
    console.log('📊 Bundle analyzer should open automatically in your browser');
    console.log('   - Client bundle: http://localhost:8889');
    console.log('   - Server bundle: http://localhost:8888');
    
    // Provide optimization suggestions
    console.log('\n💡 Optimization Tips:');
    console.log('   1. Look for large vendor chunks that can be split');
    console.log('   2. Identify unused dependencies that can be removed');
    console.log('   3. Check for duplicate code across chunks');
    console.log('   4. Consider lazy loading for large components');
    
    // Generate bundle report
    generateBundleReport();
  });
}

function generateBundleReport() {
  const buildDir = path.join(process.cwd(), '.next');
  
  if (!fs.existsSync(buildDir)) {
    console.log('⚠️  Build directory not found, skipping report generation');
    return;
  }
  
  try {
    // Read build stats
    const statsPath = path.join(buildDir, 'build-manifest.json');
    if (fs.existsSync(statsPath)) {
      const buildManifest = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      
      console.log('\n📋 Bundle Report:');
      console.log('================');
      
      // Analyze pages
      const pages = Object.keys(buildManifest.pages);
      console.log(`📄 Total pages: ${pages.length}`);
      
      // Find largest chunks
      const allFiles = new Set();
      Object.values(buildManifest.pages).forEach(files => {
        files.forEach(file => allFiles.add(file));
      });
      
      console.log(`📦 Total chunks: ${allFiles.size}`);
      
      // Check for common optimization opportunities
      const vendorChunks = Array.from(allFiles).filter(file => 
        file.includes('vendors') || file.includes('node_modules')
      );
      
      if (vendorChunks.length > 0) {
        console.log(`🔧 Vendor chunks found: ${vendorChunks.length}`);
        console.log('   Consider code splitting for large vendor libraries');
      }
      
      // Check for CSS chunks
      const cssChunks = Array.from(allFiles).filter(file => file.endsWith('.css'));
      console.log(`🎨 CSS chunks: ${cssChunks.length}`);
      
      if (cssChunks.length > 5) {
        console.log('   Consider CSS optimization and purging unused styles');
      }
    }
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Review the bundle analyzer output');
    console.log('   2. Implement lazy loading for large components');
    console.log('   3. Consider using dynamic imports for route-specific code');
    console.log('   4. Optimize third-party library imports');
    
  } catch (error) {
    console.error('⚠️  Could not generate detailed report:', error.message);
  }
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n🛑 Analysis interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Analysis terminated');
  process.exit(0);
});