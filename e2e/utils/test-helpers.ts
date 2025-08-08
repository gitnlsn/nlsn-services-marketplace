import puppeteer, { type Page } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { puppeteerConfig, BASE_URL } from '../config';

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

export async function launchBrowser() {
  const browser = await puppeteer.launch(puppeteerConfig);
  const version = await browser.version();
  console.log(`Browser version: ${version}`);
  return browser;
}

export async function takeScreenshot(
  page: Page,
  name: string,
  fullPage: boolean = true
): Promise<string> {
  const screenshotDir = path.join(process.cwd(), 'e2e', 'screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(screenshotDir, `${name}-${timestamp}.png`) as `${string}.png`;
  
  await page.screenshot({ 
    path: screenshotPath,
    fullPage 
  });
  
  console.log(`✅ Screenshot saved to: ${screenshotPath}`);
  return screenshotPath;
}

export async function navigateToLandingPage(page: Page) {
  console.log('Navigating to landing page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await page.waitForSelector('body', { timeout: 5000 });
  
  const title = await page.title();
  console.log(`Page title: ${title}`);
  return title;
}

export async function setViewport(page: Page, viewport: ViewportConfig) {
  await page.setViewport({ width: viewport.width, height: viewport.height });
  console.log(`Viewport set to ${viewport.name}: ${viewport.width}x${viewport.height}`);
}

export const VIEWPORTS = {
  desktop: { name: 'desktop', width: 1920, height: 1080 },
  tablet: { name: 'tablet', width: 768, height: 1024 },
  mobile: { name: 'mobile', width: 375, height: 667 },
} as const;