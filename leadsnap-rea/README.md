# LeadSnap Heat Map — Complete Reverse Engineering Analysis & Architecture Package (REA)

**Target Product:** [LeadSnap App](https://app.leadsnap.com/) (GBP Geo-Grid Rank Tracker & Heat Map Engine)  
**Deliverable Directory:** `leadsnap-rea/`  
**Purpose:** Replicate 100% of LeadSnap's Heat Map features, UI layout, terminology, and workflows into MojoMap for internal Digital Mojo team familiarity.

---

## Architecture Package Navigation

| Document | Topic | Summary |
| :--- | :--- | :--- |
| [01_LEADSNAP_SYSTEM_ARCHITECTURE.md](./01_LEADSNAP_SYSTEM_ARCHITECTURE.md) | **System Architecture** | Full technical decomposition, Mermaid diagrams, coordinate engine, SERP pipelines, and metrics math. |
| [02_FEATURE_SPECIFICATION_MATRIX.md](./02_FEATURE_SPECIFICATION_MATRIX.md) | **Feature Parity Matrix** | 1:1 gap analysis comparing LeadSnap vs MojoMap, itemized by module and priority. |
| [03_DATA_MODELS_AND_SCHEMA.md](./03_DATA_MODELS_AND_SCHEMA.md) | **Data Models & Schema** | Complete SQL schemas for Companies, Locations, Scans, Points, Competitors, and Alert logs. |
| [04_DATAFORSEO_INTEGRATION_AND_LOW_BALANCE_ALERT.md](./04_DATAFORSEO_INTEGRATION_AND_LOW_BALANCE_ALERT.md) | **DataForSEO & Alert System** | Live SERP payload specs, pre-scan credit estimator, balance watchdog, and Sristhi ji email template. |
| [05_UI_UX_SPECIFICATION.md](./05_UI_UX_SPECIFICATION.md) | **UI/UX & Layout Blueprint** | LeadSnap 60/40 screen layout, AGR/ATGR header, pin color palette, competitor flip, and SERP drawer. |
| [06_IMPLEMENTATION_ROADMAP.md](./06_IMPLEMENTATION_ROADMAP.md) | **Implementation Roadmap** | 6-phase engineering plan prioritizing high-impact deliverables (P0 through P2). |
| [07_REA_TOOLKIT_EVIDENCE_REPORT.md](./07_REA_TOOLKIT_EVIDENCE_REPORT.md) | **REA Evidence Report** | Raw inspection evidence generated using `morluto/rea`, including DOM, cookies, and captured screenshot. |

---

## Core Findings Summary

1. **Metrics Distinction:** LeadSnap users rely on **AGR** (Average Grid Rank of top 20 rankings) and **ATGR** (Average Total Grid Rank penalizing unranked spots as 21). MojoMap currently only shows simple average rank.
2. **Competitor Flipping ("Flip the Grid"):** In LeadSnap, clicking any competitor in the leaderboard instantaneously projects *that* competitor's rank onto the map pins from pre-cached SERP results without any new API calls.
3. **Point SERP Drawer:** Pin clicks slide out a detailed local 20-pack showing rating stars, review count, category, address, and maps links.
4. **DataForSEO Balance Watchdog:** The `GET /v3/appendix/user_data` endpoint is 100% free. A background worker can monitor `money.balance` and dispatch an email with the direct payment link (`https://app.dataforseo.com/financial/balance`) to **Sristhi ji** whenever funds drop below `$15.00`.
