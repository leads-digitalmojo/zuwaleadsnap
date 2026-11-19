# LeadSnap vs MojoMap — Feature Parity Matrix

This document provides a line-by-line capability comparison between **LeadSnap App (Heat Map & Rank Tracker)** and **MojoMap**, highlighting exact functional deltas required for 100% team familiarity and parity.

---

## 1. Feature Comparison & Gap Analysis Matrix

| Module | Feature Name | LeadSnap Behavior | Current MojoMap Status | Delta Required for Parity | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Grid Engine** | **Square Grids** | Supports 3x3, 5x5, 7x7, 9x9, 11x11, 13x13, 15x15 | Implemented (3x3 up to 13x13) | Add 15x15 preset | P1 |
| **Grid Engine** | **Circle Grids** | Circular radius boundary filter inside grid | Implemented (Shape selector) | Verify node count formula matches LeadSnap | P0 |
| **Grid Engine** | **Spacing & Radius** | Select spacing by distance (km/mi) OR total radius | Implemented (spacing_km) | Add Miles/Km toggle and Total Radius auto-calc | P1 |
| **Grid Engine** | **Multi-Keyword Batch** | Enter multiple keywords in one scan run | Implemented (comma/tag input) | Add keyword batch progress bar | P1 |
| **Map Display** | **Color Pin Thresholds** | 1–3: Green, 4–10: Amber, 11–20: Red, 20+: Dark Red | Implemented (pins mode) | Align color hex values exactly to LeadSnap shades | P2 |
| **Map Display** | **Numeric Badges** | Each pin shows rank number (or "X" / "20+") | Implemented | Matches LeadSnap pin badge style | Done |
| **Map Display** | **Point SERP Inspector** | Clicking a pin opens drawer with Google Top 20 | Implemented (slide-out point panel) | Add competitor rating stars & category pill | P0 |
| **Metrics** | **AGR (Avg Grid Rank)** | Mean of ranked points (1–20) | Implemented (Avg Rank) | Rename display to AGR with formula tooltip | P0 |
| **Metrics** | **ATGR (Avg Total Grid Rank)**| Mean across all points, unranked = 21 | Missing | Add ATGR metric card | P0 |
| **Metrics** | **Top 3 Pack Share (%)** | Percentage of points where rank is <= 3 | Missing | Add Top 3 Pack Share KPI pill | P0 |
| **Metrics** | **Top 10 Pack Share (%)** | Percentage of points where rank is <= 10 | Missing | Add Top 10 Pack Share KPI pill | P1 |
| **Competitors** | **Competitor Leaderboard** | Table of top competitors ranked by visibility | Implemented (`CompetitorLeaderboard`) | Add column for AGR, ATGR, Category, Review count | P0 |
| **Competitors** | **"Flip the Grid"** | Click competitor & map dynamically projects their rank | Missing | Add 1-click competitor grid projection | P0 |
| **Hierarchy** | **Companies / Clients** | Group locations under client company entities | Single business flat table | Add `companies` table grouping multiple GBPs | P1 |
| **Hierarchy** | **Locations (GBPs)** | Saved business profiles with place_id and coords | Implemented (`businesses` table) | Associate `business_id` to `company_id` | P1 |
| **Timeline** | **Scan History Timeline** | Scrub historical scans over time to see progress | Implemented (History table) | Add date picker comparison (Before / After delta) | P1 |
| **Timeline** | **Rank Delta Indicators** | Show +/- changes compared to previous scan | Missing | Show green `+2` / red `-1` badges on map pins | P1 |
| **Automation** | **Scheduled Scans** | Daily, weekly, bi-weekly, monthly recurring | Implemented (`schedules` table) | Add email notification on schedule completion | P1 |
| **Reporting** | **White-Label Web Link** | Shareable read-only link for clients without login | Implemented (`/api/report/:token`) | Add agency custom branding / logo uploader | P1 |
| **Reporting** | **PDF Export** | Vector PDF report with map, KPIs, and competitors | Implemented (Puppeteer PDF export) | Polish layout to mirror LeadSnap client report | P1 |
| **Reporting** | **CSV / Excel Export** | Raw coordinate point and ranking CSV download | Implemented | Validated | Done |
| **Cost & Wallet** | **Credit Calculation** | Pre-scan credit quote = points x keywords | Missing UI display | Display credit/cost estimation before scan click | P0 |
| **Billing Guard**| **Low Balance Alert** | Automated check; email Sristhi ji on low funds | Missing | Automated watchdog email with direct payment link | P0 |

---

## 2. Critical Top-Priority Items (P0 Deliverables)

1. **Metrics Parity (AGR, ATGR, Top 3 Share):** LeadSnap users rely heavily on AGR and ATGR to explain local ranking velocity to clients.
2. **"Flip the Grid" Competitor Projection:** Users should be able to click any competitor in the leaderboard to immediately see their coverage map without running a new scan.
3. **Point SERP Drawer Polish:** Enhance the pin-click detail view to show rich details (Rating, Review Count, Category, Address, Website, Google Maps link).
4. **DataForSEO Low Balance Watchdog for Sristhi ji:** Automated balance polling via `/v3/appendix/user_data` and transactional email dispatch with direct payment link when funds drop below `$15.00`.
