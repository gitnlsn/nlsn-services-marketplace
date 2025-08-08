import { 
  launchBrowser,
  setViewport,
  VIEWPORTS 
} from '../utils/test-helpers';
import { BASE_URL } from '../config';

async function runPerformanceTests() {
  console.log('⚡ Starting Performance E2E Tests...');
  console.log('====================================\n');
  
  let browser;
  
  try {
    browser = await launchBrowser();
    
    // Test only mobile viewport
    const viewports = [VIEWPORTS.mobile];
    
    for (const viewport of viewports) {
      console.log(`\n📐 Testing PERFORMANCE in ${viewport.name.toUpperCase()} viewport`);
      console.log('-'.repeat(40));
      
      const page = await browser.newPage();
      await setViewport(page, viewport);
      
      // Enable performance metrics
      await page.evaluateOnNewDocument(() => {
        window.performance.mark('pageStart');
      });
      
      // Start timing
      const startTime = Date.now();
      
      // Navigate to the site
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      
      const loadTime = Date.now() - startTime;
      console.log(`📊 Page load time: ${loadTime}ms`);
      
      // Get performance metrics
      const metrics = await page.metrics();
      console.log(`📊 Performance metrics:`);
      console.log(`   - JS Heap Used: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - Documents: ${metrics.Documents}`);
      console.log(`   - Frames: ${metrics.Frames}`);
      console.log(`   - Layout Duration: ${metrics.LayoutDuration?.toFixed(2) || 'N/A'}ms`);
      console.log(`   - Script Duration: ${metrics.ScriptDuration?.toFixed(2) || 'N/A'}ms`);
      
      // Check for large images
      const images = await page.$$eval('img', imgs => 
        imgs.map(img => ({
          src: img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
          displayWidth: img.width,
          displayHeight: img.height,
          loading: img.loading
        }))
      );
      
      if (images.length > 0) {
        console.log(`📊 Found ${images.length} images`);
        const largeImages = images.filter(img => 
          (img.width > 2000 || img.height > 2000) && !img.loading
        );
        if (largeImages.length > 0) {
          console.log(`⚠️  Warning: ${largeImages.length} large images without lazy loading`);
        } else {
          console.log('✅ Images are optimized or lazy loaded');
        }
      }
      
      // Check for web fonts
      const fonts = await page.evaluate(() => {
        const fontFaces = Array.from(document.fonts.values());
        return fontFaces.map(font => ({
          family: font.family,
          status: font.status,
          display: font.display
        }));
      });
      
      if (fonts.length > 0) {
        console.log(`📊 Found ${fonts.length} web fonts`);
        const loadedFonts = fonts.filter(f => f.status === 'loaded');
        console.log(`   - Loaded: ${loadedFonts.length}`);
      }
      
      // Check bundle size by looking at script tags
      const scripts = await page.$$eval('script[src]', scripts => 
        scripts.map(script => script.src)
      );
      console.log(`📊 Found ${scripts.length} external scripts`);
      
      // Performance thresholds
      if (loadTime < 1000) {
        console.log('✅ Excellent load time (< 1s)');
      } else if (loadTime < 3000) {
        console.log('✅ Good load time (< 3s)');
      } else if (loadTime < 5000) {
        console.log('⚠️  Acceptable load time (< 5s)');
      } else {
        console.log('❌ Slow load time (> 5s)');
      }
      
      await page.close();
      console.log(`✅ ${viewport.name} viewport test completed`);
    }
    
    await browser.close();
    
    console.log('\n====================================');
    console.log('✅ All Performance tests completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runPerformanceTests();