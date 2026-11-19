const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const EMAIL = process.env.LEADSNAP_EMAIL;
const PASSWORD = process.env.LEADSNAP_PASSWORD;

async function run() {
  console.log('Testing LeadSnap login with email:', EMAIL);
  if (!EMAIL || !PASSWORD) {
    console.error('Missing credentials in .env');
    process.exit(1);
  }

  const outputDir = path.join(__dirname, '..', 'leadsnap-rea', 'captures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const networkLog = [];
  const apiResponses = [];

  page.on('request', req => {
    networkLog.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType()
    });
  });

  page.on('response', async res => {
    const url = res.url();
    const status = res.status();
    const contentType = res.headers()['content-type'] || '';

    if (contentType.includes('application/json') || url.includes('/api/') || url.includes('/ajax/')) {
      try {
        const text = await res.text();
        apiResponses.push({
          url,
          status,
          contentType,
          body: text.slice(0, 5000)
        });
      } catch (e) {
        // stream may be closed
      }
    }
  });

  console.log('Navigating to https://app.leadsnap.com/ ...');
  await page.goto('https://app.leadsnap.com/', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Current URL:', page.url());
  await page.screenshot({ path: path.join(outputDir, '01_login_page.png') });

  // Check form inputs
  const emailInput = await page.$('input[name="email"], input[type="email"]');
  const passInput = await page.$('input[name="password"], input[type="password"]');
  const submitBtn = await page.$('button[type="submit"], input[type="submit"], .login_content form button, .login_content form input[type="submit"]');

  if (!emailInput || !passInput) {
    console.error('Could not find login inputs. Inspecting page...');
    const bodyHtml = await page.content();
    fs.writeFileSync(path.join(outputDir, 'login_error.html'), bodyHtml);
    await browser.close();
    process.exit(1);
  }

  console.log('Filling login form...');
  await emailInput.type(EMAIL, { delay: 50 });
  await passInput.type(PASSWORD, { delay: 50 });

  console.log('Submitting form...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Navigation wait:', e.message)),
    submitBtn ? submitBtn.click() : page.keyboard.press('Enter')
  ]);

  await new Promise(r => setTimeout(r, 4000));

  const afterLoginUrl = page.url();
  console.log('URL after login:', afterLoginUrl);
  await page.screenshot({ path: path.join(outputDir, '02_after_login.png') });

  const pageTitle = await page.title();
  console.log('Page title after login:', pageTitle);

  // Check if login failed or if 2FA/OTP or captcha is present
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Page text snippet:', bodyText.slice(0, 300).replace(/\n+/g, ' '));

  // Save network and API logs
  fs.writeFileSync(path.join(outputDir, 'network_requests.json'), JSON.stringify(networkLog, null, 2));
  fs.writeFileSync(path.join(outputDir, 'api_responses.json'), JSON.stringify(apiResponses, null, 2));

  // Extract cookies
  const cookies = await page.cookies();
  fs.writeFileSync(path.join(outputDir, 'cookies.json'), JSON.stringify(cookies, null, 2));

  await browser.close();
  console.log('Initial login inspection finished successfully!');
}

run().catch(err => {
  console.error('Fatal error during LeadSnap login:', err);
  process.exit(1);
});
