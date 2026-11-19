# MojoMap -> LeadSnap Parity: Implementation Roadmap

This document outlines the phased engineering plan to transition **MojoMap** into a 1:1 replica of **LeadSnap's** Heat Map & Geo-Grid Rank Tracker module.

---

## Phase 1: DataForSEO Balance Watchdog & Sristhi Ji Alerts (Priority P0)

**Goal:** Ensure DataForSEO funds never unexpectedly run dry during scans by alerting Sristhi ji with direct payment links.

1. **Backend Service (`src/lib/balanceWatchdog.ts`):**
   - Query `GET https://api.dataforseo.com/v3/appendix/user_data` every 4 hours.
   - Evaluate `money.balance < 15.00`.
   - Implement 24-hour alert debounce to prevent notification fatigue.
2. **Email Notification Engine (`src/lib/emailAlerts.ts`):**
   - HTML template with MojoMap branding and live balance status.
   - Prominent CTA button linking directly to `https://app.dataforseo.com/financial/balance`.
   - Deliver via configured SMTP / Zoho ZeptoMail to `SRISTHI_EMAIL`.
3. **Environment Variables:**
   - `DATAFORSEO_MIN_BALANCE_USD=15.0`
   - `SRISTHI_EMAIL=srishti@digitalmojo.in` (configurable)

---

## Phase 2: LeadSnap Local SEO Metrics Parity (Priority P0)

**Goal:** Compute and surface AGR, ATGR, and Top 3 Share metrics across backend and frontend.

1. **Metrics Calculations (`src/lib/metrics.ts`):**
   - Compute **AGR (Average Grid Rank):** Mean of points where rank $\le 20$.
   - Compute **ATGR (Average Total Grid Rank):** Mean of all points, with unranked points scored as $21$.
   - Compute **Top 3 Pack Share (%):** Points with rank $\le 3$ / Total points.
   - Compute **Top 10 Pack Share (%):** Points with rank $\le 10$ / Total points.
2. **Database Migration:**
   - Add `agr`, `atgr`, `top3_percentage`, `top10_percentage` to `scans` table.
3. **Frontend Metrics Card (`client/src/components/MetricsHeader.tsx`):**
   - Replace simple average rank with 4-card metric strip matching LeadSnap.

---

## Phase 3: "Flip the Grid" Competitor Projection & Point Drawer (Priority P0)

**Goal:** Enable 1-click competitor map projection without additional API calls.

1. **SERP Snapshot Storage (`src/lib/scanner.ts`):**
   - Ensure `scan_points.serp_results_json` stores all 20 Google Maps results at each coordinate.
2. **Client-Side Grid Flipping (`client/src/components/ScanResultsMap.tsx`):**
   - Add state: `activeEntity: { type: 'target' } | { type: 'competitor', placeId: string, name: string }`.
   - On competitor selection, dynamically map point pins to *that* competitor's ranking position at each coordinate.
   - Recalculate AGR, ATGR, and Top 3 Share on the fly for the selected competitor.
3. **SERP Drawer Enhancement:**
   - On pin click, display full Google Maps local 20 pack with ratings, review counts, categories, and direct map links.

---

## Phase 4: UI Layout Alignment (LeadSnap 60/40 Split & Credit Estimator) (Priority P1)

**Goal:** Mirror LeadSnap's visual layout density and pre-scan quote experience.

1. **Desktop 60/40 Split View:**
   - Left 60%: Interactive Map viewport.
   - Right 40%: Competitor Leaderboard with quick "Flip" buttons.
2. **Pre-Scan Credit Calculator:**
   - Show dynamic live credit quote on the scan builder: `Points × Keywords = Credits (~$Cost)`.
3. **Miles vs Kilometers Toggle:**
   - Add unit selector (`km` or `miles`) for spacing and radius.

---

## Phase 5: Historical Timeline & Delta Scrubber (Priority P1)

**Goal:** Provide week-over-week progress tracking with visual delta badges.

1. **Timeline Slider:**
   - Date picker and historical scrubber under the map.
2. **Delta Badges:**
   - Option to display $+2$ (green) or $-1$ (red) compared to previous scan.

---

## Phase 6: White-Label Client Reports & PDF Polish (Priority P2)

**Goal:** Deliver client-ready, unbranded or custom-branded shareable links and PDFs.

1. **Share Token Enhancement:**
   - Toggle to include or exclude competitor leaderboard in shared links.
2. **PDF Vector Report Polish:**
   - Match LeadSnap's multi-page agency report layout (Cover, Heatmap Screenshot, Metrics, Competitor Breakdown).
