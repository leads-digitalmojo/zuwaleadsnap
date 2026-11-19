const axios = require('axios');

async function extract() {
  const res = await axios.get('https://app.leadsnap.com', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const html = res.data;
  console.log('HTML Length:', html.length);

  const scripts = [];
  const styles = [];
  const links = [];

  // Match scripts
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
  }

  // Match styles
  const styleRegex = /<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi;
  while ((match = styleRegex.exec(html)) !== null) {
    styles.push(match[1]);
  }

  console.log('Found Scripts:', scripts);
  console.log('Found Styles:', styles);
}

extract().catch(console.error);
