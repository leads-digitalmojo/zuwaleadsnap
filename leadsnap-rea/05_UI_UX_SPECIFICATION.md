# LeadSnap UI/UX Specification & Layout Blueprint

This document details the visual layout, screen anatomy, interactions, and component structures required to reproduce LeadSnap's exact user interface in MojoMap.

---

## 1. Global Layout Structure

```
+----------------------------------------------------------------------------------------------------+
|  [Logo] MojoMap    |  Company: [ Nexus Studio v ]  Location: [ Hitech City v ]  |  Credits: 4,812  | [Avatar]
+--------------------+------------------------------------------------------------+------------------+---------+
|  [SIDEBAR]         |  MAIN CONTENT VIEWPORT                                                                  |
|                    |                                                                                         |
|  * Heat Maps       |  [Breadcrumbs: Companies > Nexus Studio > Keywords > "roof repair"]                    |
|  * Locations       |  +-----------------------------------------------------------------------------------+  |
|  * Schedules       |  | METRICS BAR:  AGR: 3.4  |  ATGR: 8.9  |  Top 3 Pack: 42%  |  Top 10 Pack: 78%     |  |
|  * Reports         |  +-----------------------------------------------------------------------------------+  |
|  * Settings        |  |  MAP VIEW (60% Width)                 |  COMPETITOR LEADERBOARD (40% Width)       |  |
|                    |  |                                       |                                           |  |
|                    |  |       (3)   (2)   (1)                 |  [Search Competitor...]                   |  |
|                    |  |    (4)   (1)   (2)   (5)              |  Rank  Business Name       Reviews  Flip  |  |
|                    |  |  (12)  (8)   (1)   (4)  (14)          |  #1    Nexus Studio (You)   4.9 (84) [x]  |  |
|                    |  |    (15)  (9)   (3)   (11)             |  #2    Apex Roofing Pro     4.8 (112)[Flip|  |
|                    |  |       (20)  (18)  (16)                |  #3    Prime Shield Roof    4.6 (45) [Flip|  |
|                    |  |                                       |  #4    Hyd Elite Restor.    4.7 (91) [Flip|  |
|                    |  +---------------------------------------+-------------------------------------------+  |
|                    |  TIMELINE / RUN SCRUBBER: [ < Previous Scan (Nov 10) ]  [ Next Scan (Nov 17) > ] [Play] |
|                    |  EXPORT BAR:  [ Copy Public Link ]   [ Download PDF Report ]   [ Export CSV Data ]      |
+--------------------+-----------------------------------------------------------------------------------------+
```

---

## 2. Key UI Components & Interactions

### 2.1 The Metrics Summary Bar
Positioned prominently above the map:
- **AGR (Average Grid Rank):** Large bold number with a tooltip: *"Average position across points where the business ranks in the top 20"*.
- **ATGR (Average Total Grid Rank):** Large bold number with a tooltip: *"Average across all points on the grid (unranked points count as 21)"*.
- **Top 3 Pack Share (%):** Visual mini-progress ring or green badge showing dominance in Google's high-conversion 3-pack.
- **Top 10 Pack Share (%):** Amber badge showing presence on the first page of local search results.
- **Points Monitored:** Total points (e.g. `61 points · 9x9 Circle · 1.5 km radius`).

### 2.2 Geo-Grid Map Pin Styling (LeadSnap Exact Palette)
Pins are circular SVG elements with centered rank numbers:
- **Rank 1 – 3 (Top 3 Pack):** Solid Green `#16a34a` with white text.
- **Rank 4 – 10 (First Page):** Orange / Amber `#f59e0b` with white text.
- **Rank 11 – 20 (Deep Local SERP):** Red `#ef4444` with white text.
- **Rank 20+ / Unranked:** Dark Maroon / Crimson `#881337` with `20+` or `X` text.
- **Center Business Pin:** Special icon marker indicating the physical GBP address location.

### 2.3 The "Flip the Grid" Interaction
In the Competitor Leaderboard on the right:
1. Every competitor has a **"Flip Map"** button (or eye icon).
2. Clicking **"Flip Map"**:
   - The map instantaneously re-renders every pin number to reflect *that* competitor's ranking position at each coordinate.
   - The Metrics Bar updates to show that competitor's AGR, ATGR, and Top 3 Share.
   - An indicator banner appears: *"Viewing Grid as [Competitor Name] · [Click to Return to Your Listing]"*.
   - Zero API calls are executed—data is projected instantly from the pre-cached point SERPs!

### 2.4 Point SERP Inspection Drawer
Clicking any individual pin on the map opens a slide-over drawer on the right:
- Coordinate details: Latitude, Longitude, and distance from center.
- Full Top 20 Google Maps SERP list at that exact coordinate:
  - Rank badge (`#1`, `#2`, `#3`, etc.)
  - Business title with verified badge
  - Review stars (`★★★★★`) and count (e.g. `(142)`)
  - Primary category pill (e.g. `Roofing Contractor`)
  - Address & Phone
  - One-click link to open Google Maps listing directly.

### 2.5 Historical Timeline & Progress Scrubber
Directly underneath the map:
- Displays all historical dates on which this keyword was scanned.
- Selecting different dates updates the map pins dynamically.
- **Delta Overlay Mode:** A toggle switch to highlight rank changes compared to the prior run:
  - Green `+3` badge (improved rank)
  - Red `-2` badge (dropped rank)
  - Blue `NEW` badge (entered ranking for the first time).

### 2.6 Pre-Scan Grid Builder & Credit Estimator
When creating a new scan:
- **Location Selector:** Typeahead search with Google Places API.
- **Keyword Input:** Multiple keywords supported with chip tags.
- **Grid Shape:** Square vs Circle toggle.
- **Grid Dimensions:** 3x3, 5x5, 7x7, 9x9, 11x11, 13x13, 15x15.
- **Spacing Selector:** Toggle between Distance Between Points (Miles/Km) and Total Radius.
- **Live Estimation Pill:** *"Total Points: 61 · Keywords: 3 · Total Credits: 183 (~$0.46)"*.
- **Action:** *"Run Instant Scan"* or *"Schedule Recurring"*.
