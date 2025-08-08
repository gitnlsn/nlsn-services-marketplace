import type { LaunchOptions } from 'puppeteer';
import { execSync } from 'child_process';
import path from 'path';

export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

// Define user data directory for browser session
export const USER_DATA_DIR = path.join(process.cwd(), 'e2e', 'browser-session');

// Function to find Google Chrome executable
function findChrome(): string | undefined {
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const path of possiblePaths) {
    try {
      // Check if file exists
      execSync(`test -f "${path}" || test -d "${path}"`);
      return path;
    } catch {
      // Path doesn't exist, continue checking
    }
  }

  // Try to find Chrome in PATH
  try {
    const chromePath = execSync('which google-chrome || which google-chrome-stable', { encoding: 'utf-8' }).trim();
    if (chromePath) return chromePath;
  } catch {
    // Chrome not found in PATH
  }

  return undefined;
}

const chromeExecutablePath = findChrome();

export const puppeteerConfig: LaunchOptions = {
  headless: false,
  executablePath: chromeExecutablePath,
  channel: chromeExecutablePath ? undefined : 'chrome', // Use 'chrome' channel if no executable found
  userDataDir: USER_DATA_DIR, // Store browser session data
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
  defaultViewport: {
    width: 1920,
    height: 1080,
  },
  slowMo: 100,
  ignoreDefaultArgs: ['--disable-extensions'],
};

export const testTimeout = 30000;

// Log which browser is being used
console.log('🌐 Browser configuration:');
if (chromeExecutablePath) {
  console.log(`   Using Google Chrome from: ${chromeExecutablePath}`);
} else {
  console.log('   Using Puppeteer channel: chrome (will download if needed)');
}
console.log(`   Session data directory: ${USER_DATA_DIR}`);