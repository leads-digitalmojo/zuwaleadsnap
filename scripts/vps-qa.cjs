const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const puppeteer = require('puppeteer');
const sqlite3 = require('better-sqlite3');

dotenv.config({ path: '/var/www/mojomap/.env' });

async function runVpsChecks() {
  const report = {};

  // 1. SQLite Database & Tables
  try {
    const db = sqlite3('/var/www/mojomap/mojomap.db');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    const required = [
      'businesses',
      'scans',
      'scan_points',
      'serp_cache',
      'keyword_data_cache',
      'scan_shares',
      'api_cost_log',
      'keyword_lists',
      'scheduled_scans'
    ];
    const missing = required.filter(t => !tables.includes(t));
    report.db = { ok: missing.length === 0, tables, missing };
  } catch (err) {
    report.db = { ok: false, error: err.message };
  }

  // 2. Google Places API
  try {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw new Error('GOOGLE_PLACES_API_KEY not defined in .env');
    const res = await axios.post('https://places.googleapis.com/v1/places:searchText', {
      textQuery: 'Digital Mojo Hyderabad',
      maxResultCount: 1
    }, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    const place = res.data.places?.[0];
    report.places = { ok: !!place, name: place?.displayName?.text || null };
  } catch (err) {
    report.places = { ok: false, error: err.message };
  }

  // 3. Headless Chrome Puppeteer
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const version = await browser.version();
    await browser.close();
    report.puppeteer = { ok: true, version };
  } catch (err) {
    report.puppeteer = { ok: false, error: err.message };
  }

  // 4. PM2 Status
  try {
    const { execSync } = require('child_process');
    const pm2Status = execSync('pm2 jlist', { encoding: 'utf8' });
    const apps = JSON.parse(pm2Status);
    const mojomap = apps.find(a => a.name === 'mojomap-api');
    report.pm2 = { ok: mojomap?.pm2_env?.status === 'online', status: mojomap?.pm2_env?.status, uptime: mojomap?.pm2_env?.pm_uptime };
  } catch (err) {
    report.pm2 = { ok: false, error: err.message };
  }

  console.log(JSON.stringify(report, null, 2));
}

runVpsChecks().catch(err => {
  console.error(err);
  process.exit(1);
});
