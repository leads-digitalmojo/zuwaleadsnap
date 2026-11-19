const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('Loading LeadSnap Share Link in Puppeteer (Public, 0 Credits)...');
  const outDir = path.join(__dirname, '..', 'leadsnap-rea', 'captures', 'share_view');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1680,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1050 });

  const capturedApis = [];

  page.on('response', async res => {
    const url = res.url();
    const contentType = res.headers()['content-type'] || '';
    if (url.includes('/api/') || contentType.includes('application/json')) {
      try {
        const text = await res.text();
        capturedApis.push({
          url,
          status: res.status(),
          contentType,
          body: text
        });
        console.log('Intercepted:', res.status(), url);
      } catch (e) {}
    }
  });

  const shareUrl = 'https://app.leadsnap.com/rank-tracking/share/1581314/11ceab50-a4ba-4de6-9c69-e50b80a7e669';
  console.log('Navigating to:', shareUrl);

  try {
    await page.goto(shareUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('DOM loaded. Waiting for network and UI to settle...');
    await new Promise(r => setTimeout(r, 8000));

    await page.screenshot({ path: path.join(outDir, '01_share_viewport.png'), fullPage: false });
    await page.screenshot({ path: path.join(outDir, '02_share_fullpage.png'), fullPage: true });

    // Save HTML and captured APIs
    const html = await page.content();
    fs.writeFileSync(path.join(outDir, 'rendered_dom.html'), html);
    fs.writeFileSync(path.join(outDir, 'intercepted_apis.json'), JSON.stringify(capturedApis, null, 2));

    console.log('Done! Screenshots and DOM saved to:', outDir);
  } catch (err) {
    console.error('Error during navigation:', err);
  } finally {
    await browser.close();
  }
}

run();
