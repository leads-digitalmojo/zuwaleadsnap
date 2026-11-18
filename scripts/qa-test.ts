import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const BASE_URL = process.env.TEST_URL || "https://rankmap.digitalmojo.in";

interface TestResult {
  id: string;
  category: string;
  title: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

function record(test: TestResult) {
  results.push(test);
  const mark = test.passed ? "PASS" : "FAIL";
  console.log(`[${mark}] ${test.id} - ${test.title}`);
  if (!test.passed) {
    console.error(`       Expected: ${test.expected}`);
    console.error(`       Actual:   ${test.actual}`);
  }
}

async function run() {
  console.log(`\n==========================================================`);
  console.log(`  STARTING COMPREHENSIVE QA TEST SUITE`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`==========================================================\n`);

  // --- 1. HEALTH & CONNECTIVITY ---
  try {
    const res = await axios.get(`${BASE_URL}/health`, { timeout: 8000 });
    record({
      id: "TC-HEALTH-01",
      category: "Infrastructure",
      title: "Backend API Health Endpoint Check",
      expected: "HTTP 200 with status: ok",
      actual: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      passed: res.status === 200 && res.data?.status === "ok"
    });
  } catch (err: any) {
    record({
      id: "TC-HEALTH-01",
      category: "Infrastructure",
      title: "Backend API Health Endpoint Check",
      expected: "HTTP 200",
      actual: `Error: ${err.message}`,
      passed: false
    });
  }

  // --- 2. FRONTEND SPA ROOT & HEADERS ---
  try {
    const res = await axios.get(`${BASE_URL}/`, { timeout: 8000 });
    const hasHtml = typeof res.data === "string" && res.data.includes("<div id=\"root\">");
    const hasRobots = res.headers["x-robots-tag"]?.includes("noindex");
    record({
      id: "TC-UI-01",
      category: "UI / Security",
      title: "Frontend SPA HTML Serves Cleanly with noindex Header",
      expected: "HTTP 200 HTML with #root and x-robots-tag noindex",
      actual: `Status ${res.status}, hasRoot=${hasHtml}, x-robots-tag=${res.headers["x-robots-tag"]}`,
      passed: res.status === 200 && hasHtml && !!hasRobots
    });
  } catch (err: any) {
    record({
      id: "TC-UI-01",
      category: "UI / Security",
      title: "Frontend SPA HTML Serves Cleanly",
      expected: "HTTP 200",
      actual: err.message,
      passed: false
    });
  }

  // --- 3. ASSET DELIVERY (CSS & JS) ---
  try {
    const rootRes = await axios.get(`${BASE_URL}/`, { timeout: 8000 });
    const html = rootRes.data as string;
    const jsMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    const cssMatch = html.match(/href="(\/assets\/index-[^"]+\.css)"/);

    if (jsMatch && cssMatch) {
      const jsUrl = `${BASE_URL}${jsMatch[1]}`;
      const cssUrl = `${BASE_URL}${cssMatch[1]}`;
      const [jsRes, cssRes] = await Promise.all([axios.get(jsUrl), axios.get(cssUrl)]);
      record({
        id: "TC-ASSET-01",
        category: "Performance / Assets",
        title: "Vite Client JS & CSS Bundles Accessible & Valid",
        expected: "HTTP 200 with content-type javascript and css",
        actual: `JS: HTTP ${jsRes.status} (${jsRes.data.length} bytes), CSS: HTTP ${cssRes.status} (${cssRes.data.length} bytes)`,
        passed: jsRes.status === 200 && cssRes.status === 200 && jsRes.data.length > 50000
      });
    } else {
      record({
        id: "TC-ASSET-01",
        category: "Performance / Assets",
        title: "Vite Client JS & CSS Bundles In HTML",
        expected: "Found JS & CSS tags in HTML",
        actual: "Tags missing in HTML",
        passed: false
      });
    }
  } catch (err: any) {
    record({
      id: "TC-ASSET-01",
      category: "Performance / Assets",
      title: "Asset Delivery",
      expected: "HTTP 200",
      actual: err.message,
      passed: false
    });
  }

  // --- 4. AUTH SECURITY & ROUTE GATING ---
  try {
    // Attempt unauthorized POST /scan
    const scanRes = await axios.post(`${BASE_URL}/scan`, { keyword: "test" }, { validateStatus: () => true });
    record({
      id: "TC-SEC-01",
      category: "Security",
      title: "Protected /scan Route Rejects Missing Auth Token",
      expected: "HTTP 401 Unauthorized",
      actual: `HTTP ${scanRes.status}: ${JSON.stringify(scanRes.data)}`,
      passed: scanRes.status === 401
    });
  } catch (err: any) {
    record({
      id: "TC-SEC-01",
      category: "Security",
      title: "Protected /scan Route Rejects Missing Auth Token",
      expected: "HTTP 401",
      actual: err.message,
      passed: false
    });
  }

  try {
    // Attempt unauthorized GET /api/scans
    const scansRes = await axios.get(`${BASE_URL}/api/scans`, { validateStatus: () => true });
    record({
      id: "TC-SEC-02",
      category: "Security",
      title: "Protected /api/scans Rejects Missing Auth Token",
      expected: "HTTP 401 Unauthorized",
      actual: `HTTP ${scansRes.status}`,
      passed: scansRes.status === 401
    });
  } catch (err: any) {
    record({
      id: "TC-SEC-02",
      category: "Security",
      title: "Protected /api/scans Rejects Missing Auth Token",
      expected: "HTTP 401",
      actual: err.message,
      passed: false
    });
  }

  try {
    // Attempt fake token injection
    const fakeTokenRes = await axios.get(`${BASE_URL}/api/scans`, {
      headers: { Authorization: "Bearer invalid-tampered-token-xyz" },
      validateStatus: () => true
    });
    record({
      id: "TC-SEC-03",
      category: "Security",
      title: "Protected Route Rejects Malformed / Forged JWT Token",
      expected: "HTTP 401 Unauthorized",
      actual: `HTTP ${fakeTokenRes.status}`,
      passed: fakeTokenRes.status === 401
    });
  } catch (err: any) {
    record({
      id: "TC-SEC-03",
      category: "Security",
      title: "Fake Token Rejection",
      expected: "HTTP 401",
      actual: err.message,
      passed: false
    });
  }

  // --- 5. OPTIONAL AUTH & PUBLIC REPORT VIEWING ---
  try {
    const meRes = await axios.get(`${BASE_URL}/api/me`);
    record({
      id: "TC-AUTH-04",
      category: "Authentication",
      title: "Public Session Check (/api/me) Returns Null for Unauthenticated Users",
      expected: "HTTP 200 with { user: null }",
      actual: `HTTP ${meRes.status}: ${JSON.stringify(meRes.data)}`,
      passed: meRes.status === 200 && meRes.data?.user === null
    });
  } catch (err: any) {
    record({
      id: "TC-AUTH-04",
      category: "Authentication",
      title: "Public Session Check",
      expected: "HTTP 200",
      actual: err.message,
      passed: false
    });
  }

  try {
    const repRes = await axios.get(`${BASE_URL}/api/report/nonexistent-token-12345`, { validateStatus: () => true });
    record({
      id: "TC-REP-01",
      category: "Functional",
      title: "Public Report Viewer Rejects Invalid/Expired Share Tokens Gracefully",
      expected: "HTTP 404 with error message",
      actual: `HTTP ${repRes.status}: ${JSON.stringify(repRes.data)}`,
      passed: repRes.status === 404
    });
  } catch (err: any) {
    record({
      id: "TC-REP-01",
      category: "Functional",
      title: "Public Report Viewer Rejection",
      expected: "HTTP 404",
      actual: err.message,
      passed: false
    });
  }

  // --- 6. VPS SUBSYSTEMS & DATABASE INTEGRITY ---
  try {
    const { execSync } = await import("child_process");
    const vpsOutput = execSync(`ssh mojo-vps "node /var/www/mojomap/scripts/vps-qa.cjs"`, { encoding: "utf8" });
    const jsonStart = vpsOutput.indexOf('{\n  "db":');
    const vpsReport = JSON.parse(vpsOutput.slice(jsonStart));

    // Database test
    record({
      id: "TC-DB-01",
      category: "Data and Database",
      title: "Production SQLite Schema & Core Tables Initialized",
      expected: "All 8 core tables present (businesses, scans, scan_points, ...)",
      actual: vpsReport.db.ok ? `All ${vpsReport.db.tables.length} tables present` : `Error: ${vpsReport.db.error || vpsReport.db.missing}`,
      passed: vpsReport.db.ok
    });

    // Google Places API test
    record({
      id: "TC-INTEG-01",
      category: "Third-party Integrations",
      title: "Google Places API Active & Returning Results on Production VPS",
      expected: "Returns valid business details for query",
      actual: vpsReport.places.ok ? `Verified business: "${vpsReport.places.name}"` : `Error: ${vpsReport.places.error}`,
      passed: vpsReport.places.ok
    });

    // Puppeteer Chromium Scraper test
    record({
      id: "TC-SCRAPE-01",
      category: "Functional Scraper",
      title: "Puppeteer Headless Chromium Engine Operational for Google Maps Scraping",
      expected: "Launches and returns Chrome version",
      actual: vpsReport.puppeteer.ok ? `Launched ${vpsReport.puppeteer.version}` : `Error: ${vpsReport.puppeteer.error}`,
      passed: vpsReport.puppeteer.ok
    });

    // PM2 Process Manager test
    record({
      id: "TC-OPS-01",
      category: "Process Manager",
      title: "PM2 Process Status & Uptime",
      expected: "mojomap-api status is online",
      actual: `Status: ${vpsReport.pm2.status}, uptime: ${Math.round((Date.now() - vpsReport.pm2.uptime) / 60000)}m`,
      passed: vpsReport.pm2.ok
    });

  } catch (err: any) {
    record({
      id: "TC-VPS-01",
      category: "Infrastructure",
      title: "VPS Subsystem Checks",
      expected: "All VPS checks executed cleanly",
      actual: err.message,
      passed: false
    });
  }

  // --- 9. SUMMARY & METRICS ---
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`\n==========================================================`);
  console.log(`  QA TEST SUMMARY`);
  console.log(`  Total Executed: ${total}`);
  console.log(`  Passed:         ${passed}`);
  console.log(`  Failed:         ${failed}`);
  console.log(`  Pass Rate:      ${passRate}%`);
  console.log(`==========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Fatal error running QA suite:", err);
  process.exit(1);
});
