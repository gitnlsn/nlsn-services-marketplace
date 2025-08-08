import { 
  launchBrowser,
  takeScreenshot,
  setViewport,
  VIEWPORTS 
} from '../utils/test-helpers';
import { BASE_URL } from '../config';

async function runAuthFlowTests() {
  console.log('🔐 Starting Auth Flow E2E Tests...');
  console.log('===================================\n');
  
  let browser;
  
  try {
    browser = await launchBrowser();
    
    // Test only mobile viewport
    const viewports = [VIEWPORTS.mobile];
    
    for (const viewport of viewports) {
      console.log(`\n📐 Testing AUTH FLOW in ${viewport.name.toUpperCase()} viewport`);
      console.log('-'.repeat(40));
      
      const page = await browser.newPage();
      await setViewport(page, viewport);
      
      // Navigate to the site
      console.log('Navigating to homepage...');
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await page.waitForSelector('body', { timeout: 5000 });
      
      // Take initial screenshot
      await takeScreenshot(page, `auth-${viewport.name}-initial`, false);
      
      // First, check if user is already authenticated
      console.log('Checking current authentication state...');
      const initialAuthCheck = await page.evaluateHandle(() => {
        // Check for sign out buttons or user indicators
        const signOutBtn = [...document.querySelectorAll('button, a')].find(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('sign out') || text.includes('logout');
        });
        const avatar = document.querySelector('img[src*="googleusercontent"], img[alt*="avatar" i], img[alt*="profile" i]');
        return signOutBtn || avatar;
      });
      
      const isInitiallyAuthenticated = initialAuthCheck && initialAuthCheck.asElement();
      
      if (isInitiallyAuthenticated) {
        console.log('✅ User is already authenticated');
        console.log('📋 Test flow: Sign Out → Sign In');
        await takeScreenshot(page, `auth-${viewport.name}-initially-authenticated`, false);
        
        // First, sign out
        console.log('\n══════ STEP 1: SIGN OUT ══════');
        await performSignOut(page, viewport.name);
        
        // Then sign in again
        console.log('\n══════ STEP 2: SIGN IN ══════');
        await performSignIn(page, viewport.name, browser);
      } else {
        console.log('❌ User is not authenticated');
        console.log('📋 Test flow: Sign In → Sign Out → Sign In');
        
        // First, sign in
        console.log('\n══════ STEP 1: SIGN IN ══════');
        await performSignIn(page, viewport.name, browser);
        
        // Then sign out
        console.log('\n══════ STEP 2: SIGN OUT ══════');
        await performSignOut(page, viewport.name);
        
        // Finally, sign in again
        console.log('\n══════ STEP 3: SIGN IN AGAIN ══════');
        await performSignIn(page, viewport.name, browser);
      }
      
      await page.close();
      console.log(`\n✅ ${viewport.name} viewport test completed`);
    }
    
    await browser.close();
    
    console.log('\n===================================');
    console.log('✅ All Auth Flow tests completed!\n');
    
  } catch (error) {
    console.error('❌ Auth Flow test failed:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

// Helper function to perform sign in
async function performSignIn(page: any, viewportName: string, browser: any) {
  console.log('🔑 Starting sign in process...');
  
  // Check if we're already on the sign-in page
  let currentUrl = page.url();
  if (!currentUrl.includes('api/auth/signin')) {
    // Look for sign in button on the current page
    const signInButton = await page.evaluateHandle(() => {
      const elements = [...document.querySelectorAll('button, a')];
      return elements.find(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('sign in') || text.includes('sign-in') || text.includes('signin') || text.includes('login');
      });
    });
    
    if (signInButton && signInButton.asElement()) {
      console.log('✅ Found Sign In button, clicking...');
      await signInButton.asElement()!.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log('📍 Navigating directly to sign-in page...');
      await page.goto(`${BASE_URL}/api/auth/signin`, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Check if we're on Google OAuth page
  currentUrl = page.url();
  if (currentUrl.includes('accounts.google.com')) {
    console.log('✅ Redirected to Google OAuth');
    await handleGoogleAuth(page, viewportName, browser);
  } else {
    // Look for Google Sign In button on the page
    const googleSignInButton = await page.evaluateHandle(() => {
      const elements = [...document.querySelectorAll('button, a, div[role="button"]')];
      return elements.find(el => {
        const text = el.textContent?.toLowerCase() || '';
        const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
        return text.includes('google') || ariaLabel.includes('google');
      });
    });
    
    if (googleSignInButton && googleSignInButton.asElement()) {
      console.log('✅ Found Google Sign In button, clicking...');
      await googleSignInButton.asElement()!.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await handleGoogleAuth(page, viewportName, browser);
    } else {
      console.log('❌ Could not find Google Sign In button');
    }
  }
  
  // Verify authentication
  await new Promise(resolve => setTimeout(resolve, 3000));
  const authenticated = await page.evaluateHandle(() => {
    const signOutBtn = [...document.querySelectorAll('button, a')].find(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('sign out') || text.includes('logout');
    });
    const avatar = document.querySelector('img[src*="googleusercontent"], img[alt*="avatar" i], img[alt*="profile" i]');
    return signOutBtn || avatar;
  });
  
  if (authenticated && authenticated.asElement()) {
    console.log('✅ Sign in successful');
    await takeScreenshot(page, `auth-${viewportName}-signed-in`, false);
  } else {
    console.log('⚠️  Could not verify sign in');
  }
}

// Helper function to handle Google OAuth
async function handleGoogleAuth(page: any, viewportName: string, browser: any) {
  console.log('\n' + '='.repeat(60));
  console.log('⏸️  MANUAL INTERVENTION REQUIRED');
  console.log('👤 Please complete the Google sign-in process');
  console.log('⏰ You have 5 minutes to complete authentication');
  console.log('📝 Steps:');
  console.log('   1. Select or enter your Google account');
  console.log('   2. Enter your password if prompted');
  console.log('   3. Complete any 2FA if required');
  console.log('   4. Authorize the application');
  console.log('='.repeat(60) + '\n');
  
  // Wait for authentication
  const startTime = Date.now();
  let authenticated = false;
  
  while (Date.now() - startTime < 300000) { // 5 minutes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const currentUrl = page.url();
    if (currentUrl.includes(BASE_URL.replace('http://', '').replace('https://', '')) && 
        !currentUrl.includes('api/auth/signin')) {
      authenticated = true;
      console.log('✅ Detected redirect back to application');
      break;
    }
    
    // Check if authenticated
    const authCheck = await page.evaluateHandle(() => {
      const signOutBtn = [...document.querySelectorAll('button, a')].find(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('sign out') || text.includes('logout');
      });
      const avatar = document.querySelector('img[src*="googleusercontent"], img[alt*="avatar" i], img[alt*="profile" i]');
      return signOutBtn || avatar;
    });
    
    if (authCheck && authCheck.asElement()) {
      authenticated = true;
      console.log('✅ Authentication successful');
      break;
    }
    
    // Show progress
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed > 0 && elapsed % 30 === 0) {
      const remaining = 300 - elapsed;
      console.log(`⏳ Waiting... ${remaining} seconds remaining`);
    }
  }
  
  if (!authenticated) {
    console.log('⏱️  Timeout: 5 minutes elapsed without successful authentication');
  }
}

// Helper function to perform sign out
async function performSignOut(page: any, viewportName: string) {
  console.log('🚪 Starting sign out process...');
  
  // Look for sign out button
  const signOutButton = await page.evaluateHandle(() => {
    const elements = [...document.querySelectorAll('button, a, div[role="button"], li[role="menuitem"]')];
    return elements.find(el => {
      const text = el.textContent?.toLowerCase() || '';
      const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
      return text.includes('sign out') || text.includes('signout') || 
             text.includes('logout') || text.includes('log out') || 
             ariaLabel.includes('sign out') || ariaLabel.includes('logout');
    });
  });
  
  if (signOutButton && signOutButton.asElement()) {
    console.log('✅ Found Sign Out button, clicking...');
    await signOutButton.asElement()!.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we're on sign out confirmation page
    const currentUrl = page.url();
    if (currentUrl.includes('api/auth/signout')) {
      console.log('📝 Sign out confirmation page detected');
      
      // Look for confirmation button
      const confirmButton = await page.evaluateHandle(() => {
        const buttons = [...document.querySelectorAll('button, input[type="submit"]')];
        return buttons.find(el => {
          const text = el.textContent?.toLowerCase() || '';
          const value = (el as HTMLInputElement).value?.toLowerCase() || '';
          return text.includes('sign out') || text.includes('signout') || 
                 text.includes('yes') || text.includes('confirm') ||
                 value.includes('sign out') || value.includes('signout');
        });
      });
      
      if (confirmButton && confirmButton.asElement()) {
        console.log('✅ Clicking confirmation button...');
        await confirmButton.asElement()!.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        // Try submitting the form
        const formSubmitted = await page.evaluate(() => {
          const form = document.querySelector('form');
          if (form) {
            form.submit();
            return true;
          }
          return false;
        });
        
        if (formSubmitted) {
          console.log('✅ Submitted sign out form');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    // Verify sign out
    const signedOut = await page.evaluateHandle(() => {
      const signInBtn = [...document.querySelectorAll('button, a')].find(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('sign in') || text.includes('login');
      });
      const signOutBtn = [...document.querySelectorAll('button, a')].find(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('sign out') || text.includes('logout');
      });
      return signInBtn && !signOutBtn;
    });
    
    if (signedOut) {
      console.log('✅ Sign out successful');
      await takeScreenshot(page, `auth-${viewportName}-signed-out`, false);
    } else {
      console.log('⚠️  Could not verify sign out');
    }
  } else {
    // Try looking for user menu first
    const userMenu = await page.evaluateHandle(() => {
      const avatarButtons = [...document.querySelectorAll('button img[src*="googleusercontent"], button img[alt*="avatar" i], button img[alt*="profile" i]')];
      if (avatarButtons.length > 0) return avatarButtons[0].parentElement;
      
      const menuButtons = [...document.querySelectorAll('button[aria-label*="user" i], button[aria-label*="account" i], button[aria-label*="menu" i]')];
      if (menuButtons.length > 0) return menuButtons[0];
      
      return null;
    });
    
    if (userMenu && userMenu.asElement()) {
      console.log('📍 Opening user menu...');
      await userMenu.asElement()!.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try again to find sign out button
      const signOutInMenu = await page.evaluateHandle(() => {
        const elements = [...document.querySelectorAll('button, a, div[role="button"], li[role="menuitem"]')];
        return elements.find(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('sign out') || text.includes('logout');
        });
      });
      
      if (signOutInMenu && signOutInMenu.asElement()) {
        console.log('✅ Found Sign Out in menu, clicking...');
        await signOutInMenu.asElement()!.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } else {
      console.log('❌ Could not find Sign Out option');
    }
  }
}

runAuthFlowTests();