const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const EMAIL = process.env.LEADSNAP_EMAIL;
const PASSWORD = process.env.LEADSNAP_PASSWORD;

async function run() {
  console.log('--- REA Deep Inspection of Existing Completed Scan 1581314 (0 CREDITS CONSUMED) ---');

  const outputDir = path.join(__dirname, '..', 'leadsnap-rea', 'captures', 'scan_1581314');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load cookies if available
  const cookiePath = path.join(__dirname, '..', 'leadsnap-rea', 'captures', 'cookies.json');
  let savedCookies = [];
  if (fs.existsSync(cookiePath)) {
    savedCookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1680,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1050 });

  if (savedCookies.length > 0) {
    console.log('Restoring saved session cookies...');
    await page.setCookie(...savedCookies);
  }

  const apiPayloads = {};

  page.on('response', async res => {
    const url = res.url();
    const contentType = res.headers()['content-type'] || '';
    if (url.includes('/api/v1/') && contentType.includes('application/json')) {
      try {
        const json = await res.json();
        const endpointKey = url.split('?')[0].replace('https://app.leadsnap.com/api/v1/', '');
        apiPayloads[endpointKey] = {
          url,
          data: json
        };
        console.log('Captured API endpoint:', endpointKey);
      } catch (e) {}
    }
  });

  // Navigate to history or directly to the scan
  console.log('Navigating to Heat Map History page...');
  await page.goto('https://app.leadsnap.com/rank-tracking/history', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(outputDir, '01_history_table.png'), fullPage: true });

  console.log('Current History Page URL:', page.url());

  // Wait 3 seconds
  await new Promise(r => setTimeout(r, 3000));

  // Find the scan link or button to view scan 1581314
  console.log('Looking for view button for scan 1581314...');
  const viewLink = await page.$('a[href*="1581314"], button[data-id="1581314"], tr:first-child a, .action-view');
  
  // Or navigate directly to the heatmap view
  const targetScanUrls = [
    'https://app.leadsnap.com/rank-tracking/heatmaps/1581314',
    'https://app.leadsnap.com/rank-tracking/view-heatmap/1581314',
    'https://app.leadsnap.com/rank-tracking/heatmap/1581314'
  ];

  let scanPageLoaded = false;
  for (const scanUrl of targetScanUrls) {
    console.log('Attempting scan view URL:', scanUrl);
    const res = await page.goto(scanUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null);
    if (res && res.status() === 200 && !page.url().includes('/404') && !page.url().includes('/history')) {
      console.log('Found active scan URL:', page.url());
      scanPageLoaded = true;
      break;
    }
  }

  if (!scanPageLoaded) {
    console.log('Navigating via history page row click...');
    await page.goto('https://app.leadsnap.com/rank-tracking/history', { waitUntil: 'networkidle2' });
    // Click first row eye icon or title
    const firstRowClickable = await page.$('table tbody tr:first-child a, table tbody tr:first-child .fa-eye, table tbody tr:first-child td:nth-child(2)');
    if (firstRowClickable) {
      await firstRowClickable.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      console.log('Navigated to:', page.url());
    }
  }

  await new Promise(r => setTimeout(r, 5000));

  console.log('Final Scan Page URL:', page.url());
  await page.screenshot({ path: path.join(outputDir, '02_scan_detail_full.png'), fullPage: false });

  // Save all captured API payloads for this scan
  fs.writeFileSync(path.join(outputDir, 'scan_api_payloads.json'), JSON.stringify(apiPayloads, null, 2));

  // Extract DOM structure of the heat map page
  const pageDom = await page.evaluate(() => {
    return {
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText),
      metricCards: Array.from(document.querySelectorAll('.metric, .card, .widget, .stat, [class*="metric"], [class*="stat"], [class*="badge"]')).map(el => el.innerText).filter(t => t.length > 0 && t.length < 100).slice(0, 30),
      tableHeaders: Array.from(document.querySelectorAll('th')).map(th => th.innerText),
      competitorRowsCount: document.querySelectorAll('tbody tr').length
    };
  });

  fs.writeFileSync(path.join(outputDir, 'scan_dom_analysis.json'), JSON.stringify(pageDom, null, 2));
  console.log('DOM Analysis:', pageDom);

  await browser.close();
  console.log('Inspection complete! Saved artifacts to:', outputDir);
}

run().catch(err => {
  console.error('Error during scan inspection:', err);
  process.exit(1);
});
