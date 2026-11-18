const puppeteer = require('puppeteer');
const fs = require('fs');

async function testBrowser() {
  console.log('Launching headless browser to test https://rankmap.digitalmojo.in...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  // Test 1: Desktop Viewport
  console.log('Testing Desktop Viewport (1280x800)...');
  await page.setViewport({ width: 1280, height: 800 });
  const res = await page.goto('https://rankmap.digitalmojo.in', { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Page Response Status:', res.status());

  await new Promise(r => setTimeout(r, 2000));
  const desktopTitle = await page.title();
  console.log('Page Title:', desktopTitle);

  // Check login view elements
  const loginHeader = await page.$eval('h1, h2, .auth-title, form', el => el ? el.textContent : null).catch(() => null);
  console.log('Auth Screen Content detected:', loginHeader?.slice(0, 80));

  // Test 2: Mobile Viewport (iPhone 375x667)
  console.log('Testing Mobile Viewport (375x667)...');
  await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 1000));

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  console.log(`Viewport Width: ${clientWidth}px, Document Scroll Width: ${scrollWidth}px`);

  const hasHorizontalScroll = scrollWidth > clientWidth;
  console.log('Has Horizontal Overflow on Mobile:', hasHorizontalScroll ? 'YES (FAIL)' : 'NO (PASS)');

  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Console Errors:', consoleErrors);
  }
  console.log('Page Errors count:', pageErrors.length);
  if (pageErrors.length > 0) {
    console.log('Page Errors:', pageErrors);
  }

  await browser.close();

  if (pageErrors.length === 0 && !hasHorizontalScroll) {
    console.log('\n>>> BROWSER E2E TEST: ALL PASS! <<<');
  } else {
    console.log('\n>>> BROWSER E2E TEST: ISSUES FOUND <<<');
    process.exit(1);
  }
}

testBrowser().catch(err => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
