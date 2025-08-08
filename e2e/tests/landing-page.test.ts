import { 
  launchBrowser, 
  takeScreenshot, 
  navigateToLandingPage,
  setViewport,
  VIEWPORTS 
} from '../utils/test-helpers';

async function runLandingPageTests() {
  console.log('🏠 Starting Landing Page E2E Tests...');
  console.log('=====================================\n');
  
  let browser;
  
  try {
    browser = await launchBrowser();
    
    // Test only mobile viewport
    const viewports = [VIEWPORTS.mobile];
    
    for (const viewport of viewports) {
      console.log(`\n📐 Testing LANDING PAGE in ${viewport.name.toUpperCase()} viewport`);
      console.log('-'.repeat(40));
      
      const page = await browser.newPage();
      await setViewport(page, viewport);
      
      // Navigate to landing page
      const title = await navigateToLandingPage(page);
      if (!title) {
        throw new Error(`Page title not found for ${viewport.name}`);
      }
      
      // Take screenshot
      await takeScreenshot(
        page, 
        `landing-page-${viewport.name}`, 
        viewport.name === 'desktop' // Only full page for desktop
      );
      
      // Basic content checks
      const bodyText = await page.$eval('body', el => el.textContent);
      if (!bodyText) {
        throw new Error(`Page body has no content in ${viewport.name} view`);
      }
      console.log('✅ Page has content');
      
      // Check for main element
      const mainContent = await page.$('main');
      if (mainContent) {
        console.log('✅ Main element found');
      } else {
        console.log('⚠️  Warning: No main element found');
      }
      
      await page.close();
      console.log(`✅ ${viewport.name} viewport test completed`);
    }
    
    await browser.close();
    
    console.log('\n=====================================');
    console.log('✅ All Landing Page tests completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Landing Page test failed:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runLandingPageTests();