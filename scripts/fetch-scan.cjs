const fs = require('fs');
const path = require('path');

const cookiesPath = path.join(__dirname, '..', 'leadsnap-rea', 'captures', 'cookies.json');
const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

const xsrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');
const xsrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : '';

async function testEndpoint(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'Cookie': cookieHeader,
        'X-XSRF-TOKEN': xsrfToken,
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://app.leadsnap.com/'
      }
    });
    console.log(res.status, url);
    const contentType = res.headers.get('content-type') || '';
    if (res.status === 200 && contentType.includes('application/json')) {
      const data = await res.json();
      console.log('SUCCESS for:', url, 'Keys:', Object.keys(data));
      fs.writeFileSync(
        path.join(__dirname, '..', 'leadsnap-rea', 'captures', 'scan_1581314_api.json'),
        JSON.stringify(data, null, 2)
      );
      return data;
    } else {
      const text = await res.text();
      console.log('Response body snippet:', text.slice(0, 150));
    }
  } catch (e) {
    console.error('Error fetching', url, e.message);
  }
}

async function run() {
  console.log('Testing LeadSnap Scan Endpoints (0 CREDITS CONSUMED)...');
  await testEndpoint('https://app.leadsnap.com/api/v1/heatmaps/1581314');
  await testEndpoint('https://app.leadsnap.com/api/v1/heatmaps/1581314/grid-points');
  await testEndpoint('https://app.leadsnap.com/api/v1/heatmaps/1581314/competitors');
  await testEndpoint('https://app.leadsnap.com/api/v1/heatmaps/1581314/summary');
  await testEndpoint('https://app.leadsnap.com/api/v1/share/heatmap/11ceab50-a4ba-4de6-9c69-e50b80a7e669');
  await testEndpoint('https://app.leadsnap.com/api/v1/share/11ceab50-a4ba-4de6-9c69-e50b80a7e669');
  await testEndpoint('https://app.leadsnap.com/api/v1/public/heatmaps/1581314?token=11ceab50-a4ba-4de6-9c69-e50b80a7e669');
}

run();
