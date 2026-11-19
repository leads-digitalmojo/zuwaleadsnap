# LeadSnap Parity — Data Models & Database Schema

This document details the reverse-engineered database schema required to support LeadSnap-identical organization hierarchies, multi-location management, geo-grid caching, competitor flips, and balance alerts.

---

## 1. Entity Relationship Overview

```mermaid
erDiagram
    COMPANIES ||--o{ LOCATIONS : "manages"
    LOCATIONS ||--o{ SCANS : "runs"
    LOCATIONS ||--o{ SCHEDULES : "schedules"
    SCANS ||--|{ SCAN_POINTS : "contains"
    SCANS ||--o{ COMPETITORS : "analyzes"
    SCANS ||--o{ SCAN_SHARES : "shares"
    DATA_FOR_SEO_LOGS ||--o{ BALANCE_ALERTS : "triggers"

    COMPANIES {
        int id PK
        string name
        string slug
        string logo_url
        string contact_email
        timestamp created_at
    }

    LOCATIONS {
        int id PK
        int company_id FK
        string name
        string place_id
        string cid
        string address
        string phone
        string website
        float lat
        float lng
        string category
        float rating
        int reviews_count
    }

    SCANS {
        int id PK
        int location_id FK
        string keyword
        int grid_size
        string shape
        float spacing_km
        int total_points
        float agr
        float atgr
        float top3_percentage
        float top10_percentage
        string status
        timestamp created_at
    }

    SCAN_POINTS {
        int id PK
        int scan_id FK
        int point_index
        float lat
        float lng
        int rank
        string matched_place_id
        text serp_results_json
    }

    COMPETITORS {
        int id PK
        int scan_id FK
        string place_id
        string name
        string address
        float rating
        int reviews_count
        string category
        float agr
        float atgr
        float top3_share
    }

    SCAN_SHARES {
        int id PK
        int scan_id FK
        string token
        boolean show_competitors
        timestamp expires_at
    }

    BALANCE_ALERTS {
        int id PK
        float balance_usd
        string recipient_email
        string status
        timestamp sent_at
    }
```

---

## 2. Table Specifications (SQL)

### 2.1 Companies / Clients (`companies`)
Supports grouping multiple locations/GBPs under one brand name (LeadSnap client directory):
```sql
CREATE TABLE IF NOT EXISTS companies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  slug          TEXT    UNIQUE NOT NULL,
  logo_url      TEXT,
  website       TEXT,
  contact_email TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### 2.2 Locations / GBP Profiles (`businesses` / `locations`)
```sql
CREATE TABLE IF NOT EXISTS locations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id     INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  name           TEXT    NOT NULL,
  place_id       TEXT,
  cid            TEXT,
  address        TEXT,
  phone          TEXT,
  website        TEXT,
  lat            REAL    NOT NULL,
  lng            REAL    NOT NULL,
  category       TEXT,
  rating         REAL    DEFAULT 0,
  reviews_count  INTEGER DEFAULT 0,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### 2.3 Scans (`scans`)
Enriched with LeadSnap's four primary visibility metrics:
```sql
CREATE TABLE IF NOT EXISTS scans (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id      INTEGER REFERENCES locations(id) ON DELETE CASCADE,
  keyword          TEXT    NOT NULL,
  center_lat       REAL    NOT NULL,
  center_lng       REAL    NOT NULL,
  grid_size        INTEGER NOT NULL,
  shape            TEXT    NOT NULL CHECK(shape IN ('square','circle','custom')),
  spacing_km       REAL    NOT NULL,
  total_points     INTEGER NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'running' CHECK(status IN ('running','complete','error')),
  error            TEXT,
  agr              REAL,   -- Average Grid Rank (1-20 ranked only)
  atgr             REAL,   -- Average Total Grid Rank (all points, unranked = 21)
  top3_percentage  REAL,   -- Share of Local Top 3 Pack (%)
  top10_percentage REAL,   -- Share of Top 10 (%)
  api_cost_usd     REAL    DEFAULT 0.0,
  user_email       TEXT,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at     INTEGER
);
```

### 2.4 Point Results & Full SERP Storage (`scan_points`)
Stores the complete Top 20 SERP results at each coordinate node, enabling instant competitor flipping:
```sql
CREATE TABLE IF NOT EXISTS scan_points (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id            INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  point_index        INTEGER NOT NULL,
  lat                REAL    NOT NULL,
  lng                REAL    NOT NULL,
  rank               INTEGER, -- Target business rank (1-20 or null if 20+)
  matched_place_id   TEXT,
  serp_results_json  TEXT,    -- Full Top 20 SERP list as JSON
  created_at         INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### 2.5 Competitor Summaries (`competitors`)
Pre-computed competitor aggregations per scan:
```sql
CREATE TABLE IF NOT EXISTS competitors (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id       INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  place_id      TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  address       TEXT,
  rating        REAL,
  reviews_count INTEGER,
  category      TEXT,
  agr           REAL,
  atgr          REAL,
  top3_share    REAL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### 2.6 DataForSEO Balance Logs & Alerts (`balance_alerts`)
Tracks balance history and prevents repeated notification spam:
```sql
CREATE TABLE IF NOT EXISTS balance_alerts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  balance_usd     REAL    NOT NULL,
  threshold_usd   REAL    NOT NULL,
  recipient_email TEXT    NOT NULL,
  status          TEXT    NOT NULL CHECK(status IN ('sent','failed','skipped')),
  error_message   TEXT,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);
```

---

## 3. Verified LeadSnap API Payload Contracts (From Live Capture #1581314)

### 3.1 Heatmap Public & Share Endpoint: `GET /api/v1/share/heatmaps/{id}/token/{token}`
Response Object:
```json
{
  "public_heatmap_data": {
    "id": 1581314,
    "business_name": "Digital Mojo - Branding and Digital Marketing Agency in Hyderabad",
    "business_place_id": "ChIJVVVxfUyXyzsRsQsvF2ScAWU",
    "grid_center_lat": 17.4176740495,
    "grid_center_lng": 78.3942513715,
    "grid_size": 13,
    "grid_point_distance": "2501",
    "grid_point_distance_row": 2501,
    "grid_distance_measure": "m",
    "average": "2.06",
    "keyword": "digital marketing agency in hyderabad",
    "status": "Complete",
    "status_code": 2,
    "total_points": 169,
    "top_3_points": 153,
    "top_3_percentage": 90.53,
    "average_position": 1,
    "top_3_position": 1,
    "market_share": "100.00",
    "market_share_position": 1,
    "points": [
      {
        "id": 198697892,
        "index": 0,
        "lat": "17.2461935736540000",
        "lng": "78.6479708067310000",
        "rank": 1,
        "is_processed": true
      }
    ]
  },
  "heatmap_settings": {
    "heatmap_grid_point_style": "original"
  }
}
```

### 3.2 Competitors Public & Share Endpoint: `GET /api/v1/share/heatmaps-competitors/{id}/token/{token}`
Response Array:
```json
[
  {
    "id": 190991298,
    "total_points": 169,
    "top_20_points": 158,
    "top_3_points": 0,
    "market_share": "0.00",
    "market_share_position": 15,
    "top_3_percentage": null,
    "average_position": 11,
    "top_3_position": 15,
    "average": 13.47,
    "north_west": 13.9,
    "north_east": 13.14,
    "south_west": 12.79,
    "south_east": 14.37,
    "place": {
      "id": 1628310,
      "google_place_id": "ChIJeSagy9iWyzsRZFyXrbVn6SE",
      "google_place_serial": "2443598302824324196",
      "latitude": "17.4421727000000000",
      "longitude": "78.3991145000000000",
      "name": "8 Views Branding and Digital Marketing Agency in Hyderabad",
      "address": "4th Floor, ABR Elite, Kakatiya Hills...",
      "phone": "+918099708888",
      "website_url": "https://8views.com/",
      "review_count": 191,
      "ave_review_rating": 4.4,
      "main_category": "Internet marketing service",
      "related_categories": ["Branding agency", "Marketing agency"]
    },
    "photos_count": 37
  }
]
```

