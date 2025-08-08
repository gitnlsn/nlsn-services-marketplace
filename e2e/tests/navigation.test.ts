import { 
  launchBrowser, 
  takeScreenshot,
  setViewport,
  VIEWPORTS 
} from '../utils/test-helpers';
import { BASE_URL } from '../config';

async function runNavigationTests() {
  console.log('🧭 Starting Navigation E2E Tests...');
  console.log('===================================\n');
  
  let browser;
  
  try {
    browser = await launchBrowser();
    
    // Test only mobile viewport
    const viewports = [VIEWPORTS.mobile];
    
    for (const viewport of viewports) {
      console.log(`\n📐 Testing NAVIGATION in ${viewport.name.toUpperCase()} viewport`);
      console.log('-'.repeat(40));
      
      const page = await browser.newPage();
      await setViewport(page, viewport);
      
      // Navigate to the site
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await page.waitForSelector('body', { timeout: 5000 });
      
      // Check for navigation elements
      const nav = await page.$('nav, header, [role="navigation"]');
      if (nav) {
        console.log('✅ Navigation element found');
        
        // Take screenshot of navigation
        await takeScreenshot(page, `navigation-${viewport.name}`, false);
        
        // Check for links in navigation
        const navLinks = await page.$$eval('nav a, header a, [role="navigation"] a', links => 
          links.map(link => ({
            text: link.textContent?.trim(),
            href: link.getAttribute('href')
          }))
        );
        
        if (navLinks.length > 0) {
          console.log(`✅ Found ${navLinks.length} navigation links`);
          navLinks.forEach(link => {
            console.log(`   - ${link.text}: ${link.href}`);
          });
        } else {
          console.log('⚠️  No navigation links found');
        }
        
        // Check for mobile menu button in mobile/tablet views
        if (viewport.name !== 'desktop') {
          const mobileMenuButton = await page.$('[aria-label*="menu"], [class*="hamburger"], [class*="menu-toggle"], button[class*="mobile"]');
          if (mobileMenuButton) {
            console.log('✅ Mobile menu button found');
            
            // Try to click the mobile menu
            await mobileMenuButton.click();
            await page.waitForTimeout(500); // Wait for animation
            
            await takeScreenshot(page, `navigation-${viewport.name}-menu-open`, false);
            console.log('✅ Mobile menu interaction tested');
          } else {
            console.log('ℹ️  No mobile menu button (using regular navigation)');
          }
        }
      } else {
        console.log('⚠️  Warning: No navigation element found');
      }
      
      await page.close();
      console.log(`✅ ${viewport.name} viewport test completed`);
    }
    
    await browser.close();
    
    console.log('\n===================================');
    console.log('✅ All Navigation tests completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Navigation test failed:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runNavigationTests();