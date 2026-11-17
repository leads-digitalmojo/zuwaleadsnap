# MojoMap — Product Walkthrough & Video Recording Script
> **Official Demo & Presentation Script for Digital Mojo Teams and Stakeholders**  
> **Target Video Duration:** 4 to 5 minutes  
> **Resolution:** 1080p (1920×1080) or 4K at 60fps  
> **Brand Aesthetic:** Warm Canvas (`#F5F4EF`), Deep Ink (`#111013`), Signature Gold (`#F0BC00`)

---

## 🎬 Pre-Recording Setup Checklist

1. **Local Services Running:**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:4000/health` (returns `{"status":"ok"}`)
2. **Browser Window:**
   - Clean Chrome / Brave profile with bookmarks bar hidden (`Ctrl+Shift+B` / `Cmd+Shift+B`).
   - Zoom level at 100% or 110% for crisp typography.
   - Cleared `sessionStorage` or use Incognito tab to demonstrate the pristine login flow.
3. **Audio Setup:**
   - Crisp condenser or USB microphone with noise suppression.
   - Pacing: Confident, crisp, conversational.

---

## ⏱️ Video Timeline Overview

| Scene | Timestamp | Focus Topic |
|---|---|---|
| **Scene 1** | 0:00 – 0:35 | Introduction, Security Wall & Zero-Bypass Gate |
| **Scene 2** | 0:35 – 1:15 | Frictionless Auto-Provisioning & 2FA Email OTP |
| **Scene 3** | 1:15 – 1:40 | First-Time Profile Onboarding (Name & Team) |
| **Scene 4** | 1:40 – 2:30 | Setting Up a Geo-Grid Scan (Search, Keyword, Grid Geometry) |
| **Scene 5** | 2:30 – 3:20 | Real-Time Heatmap Analysis & Localized SERP Breakdown |
| **Scene 6** | 3:20 – 3:55 | Competitor Leaderboard & Local Share of Voice |
| **Scene 7** | 3:55 – 4:35 | Multi-Format Client Reporting (Interactive Share, PDF, CSV) |
| **Scene 8** | 4:35 – 5:00 | Scan History, Role-Based Access & Outro |

---

## 📝 Detailed Scene-by-Scene Script

### Scene 1: Introduction & Security Wall (0:00 – 0:35)

#### 🖥️ Visual Action
- **Screen:** Open browser to `http://localhost:3000`.
- **Display:** Show the clean, minimalist Login Screen with the Digital Mojo signature branding. Emphasize that no dashboard components or sidebars are mounted behind the scenes.

#### 🎙️ Voiceover
> *"Welcome to MojoMap — Digital Mojo’s next-generation local SEO and Google Maps ranking intelligence engine.*
>
> *Before we dive in, notice the security architecture: MojoMap is built with a zero-bypass authentication wall. No client dashboards, internal routes, or background queries are ever exposed without authenticated credentials. Furthermore, access is strictly sandboxed to `@digitalmojo.in` team members."*

---

### Scene 2: Frictionless Auto-Provisioning & 2FA Email OTP (0:35 – 1:15)

#### 🖥️ Visual Action
- **Click:** Select the **"Email OTP"** tab on the login card.
- **Input:** Type in an official `@digitalmojo.in` email address (e.g., `nikhil@digitalmojo.in` or `dev@digitalmojo.in`).
- **Click:** Click **"Send Verification Code"**.
- **Display:** Show the 6-digit OTP code input boxes and the 30-second resend cooldown timer.
- **Input:** Enter the 6-digit verification code.

#### 🎙️ Voiceover
> *"One of our primary goals was frictionless onboarding for our internal teams. There’s no need to ask an administrator to manually create an account. Any team member with a `@digitalmojo.in` email can log in directly.*
>
> *When you request a sign-in code, Supabase Auth dispatches a one-time 6-digit password directly to your inbox via our dedicated mail relay. Because you’re logging in directly through verified OTP, two-factor authentication is satisfied instantly without redundant prompts."*

---

### Scene 3: First-Time Profile Onboarding (1:15 – 1:40)

#### 🖥️ Visual Action
- **Display:** Show the clean **"Welcome to MojoMap"** onboarding modal if logging in as a new user.
- **Input:** Fill in **Full Name** (*e.g., "Nikhil Sharma"*) and select **Department / Team** (*e.g., "SEO & Performance Marketing"*).
- **Click:** Click **"Complete Setup & Enter Dashboard"**.
- **Display:** The dashboard smoothly transitions into view. Point the cursor to the bottom-left profile badge and top-right header showing the user's Full Name and initial avatar.

#### 🎙️ Voiceover
> *"When a team member logs in for the very first time, MojoMap greets them with a one-time onboarding step to capture their full name and department.*
>
> *Once completed, this automatically synchronizes with their secure profile metadata, personalizing their workspace, scan attributions, and role permissions across the entire platform."*

---

### Scene 4: Setting Up a Geo-Grid Scan (1:40 – 2:30)

#### 🖥️ Visual Action
- **Step 1 Card:** Type a business name in the **Business Search** field (e.g., *"Nexus Studio Hyderabad"* or a local restaurant/clinic). Show the instant Google Places autocomplete dropdown. Select the business.
- **Step 2 Card:** Show the **Keyword Input** card. Type target keywords (e.g., *"podcast studio hyderabad"*, *"recording studio"*).
- **Step 3 Card:** Point out the **Grid Geometry** controls:
  - Toggle between **Square** and **Circle** shapes.
  - Switch between **3×3**, **5×5**, **7×7**, up to **13×13** matrix sizes.
  - Adjust the **Point Spacing** slider (e.g., `0.5 km`, `1.0 km`, `2.0 km`).
- **Noticeable Detail:** Highlight the **Zero-Emoji UI** — every status and option is represented by high-clarity SVG vector icons.
- **Click:** Click **"Start Grid Scan"**.

#### 🎙️ Voiceover
> *"Running a localized ranking audit takes under sixty seconds. The workflow is organized into three intuitive steps:*
>
> *Step 1: Select the target business using live Google Places autocomplete, which captures exact coordinates and Google Place ID.*
>
> *Step 2: Enter target local search queries.*
>
> *Step 3: Define your scan geometry. Whether you need a tight 3x3 radius around a downtown block or an expansive 13x13 grid across the entire metropolitan area, MojoMap calculates the exact GPS coordinates and search radius.*
>
> *Notice the visual polish: we adhere strictly to Digital Mojo’s design system — deep charcoal ink, signature gold accents, and a zero-emoji policy powered entirely by clean SVG iconography."*

---

### Scene 5: Real-Time Heatmap Analysis & Localized SERP (2:30 – 3:20)

#### 🖥️ Visual Action
- **Display:** As the scan completes, show the interactive **Google Map**.
- **Map Interaction:**
  - Zoom in and pan across the grid pins.
  - Highlight the color-coded visual hierarchy:
    - **Green (#10B981):** Top 3 positions (Google Local 3-Pack).
    - **Yellow (#F59E0B):** Positions 4 to 10 (Page 1 visibility).
    - **Orange (#F97316):** Positions 11 to 20.
    - **Red / Gray (#EF4444):** 20+ or unranked.
- **Click:** Click on any specific pin in the grid.
- **Display:** Show the modal/drawer displaying the exact localized Google Maps SERP result for that specific latitude and longitude.

#### 🎙️ Voiceover
> *"Once the scan finishes, MojoMap renders a geo-spatial rank heatmap directly on Google Maps.*
>
> *Each pin represents a virtual searcher standing at that exact coordinate on mobile or desktop. Green pins indicate dominant Google 3-Pack rankings, yellow shows first-page contention, and red pinpoints areas where visibility drops off.*
>
> *Clicking on any individual pin unpacks the exact local SERP captured at that coordinate, revealing exactly which competitors are outranking the business from that intersection."*

---

### Scene 6: Competitor Leaderboard & Local Share of Voice (3:20 – 3:55)

#### 🖥️ Visual Action
- **Scroll:** Scroll down to the **Competitor Leaderboard** table below the map.
- **Display:** Show the ranking metrics:
  - Business Name & Category
  - Average Rank across all scanned coordinates
  - Share of Voice percentage
  - Google Star Rating & Total Review Count
- **Interaction:** Hover over competitor rows to demonstrate table sorting and visual feedback.

#### 🎙️ Voiceover
> *"Beneath the interactive map is the Competitor Leaderboard. Rather than looking at a single ranking in isolation, this table aggregates data across all scanned coordinates.*
>
> *You can instantly see the client’s Average Rank, their local Share of Voice, and how their review velocity and star ratings compare against the top competitors dominating the territory."*

---

### Scene 7: Multi-Format Client Deliverables (3:55 – 4:35)

#### 🖥️ Visual Action
- **Navigate:** Point cursor to the top right **Export / Share Bar**.
- **Action 1 (Share Link):** Click **"Share Report"**. Show the copied tokenized URL. Briefly paste and preview in a new tab: show that it loads a client-facing, interactive view without requiring login.
- **Action 2 (PDF Export):** Click **"Export PDF"**. Show the generated high-fidelity A4 document with branded cover, map snapshot, and metrics.
- **Action 3 (CSV Export):** Click **"Export CSV"** to demonstrate raw data access for spreadsheet analysts.

#### 🎙️ Voiceover
> *"When it’s time to deliver findings to clients, MojoMap offers three professional export channels:*
>
> *First, interactive Share Links: generating a client-safe URL where prospects can interact with their live map without needing a Digital Mojo login.*
>
> *Second, A4 PDF Reports: rendered server-side via headless Chromium, packaging the map, competitor analysis, and KPI cards into a presentation-ready deliverable.*
>
> *And third, raw CSV exports containing granular point-by-point coordinates, ranks, and competitor attributes for advanced data teams."*

---

### Scene 8: Scan History, Role-Based Access & Outro (4:35 – 5:00)

#### 🖥️ Visual Action
- **Navigate:** Click **"Scan History"** in the sidebar.
- **Display:** Show the paginated list of all past scans, complete with status tags, grid size badges, and quick "View" buttons.
- **Point out:** Pagination controls at the bottom (`Previous`, `Page Numbers`, `Next`).
- **Display:** Highlight role-based scoping: normal team members see their scans; administrators have full cross-organizational visibility.
- **Final Shot:** Return to the dashboard overview.

#### 🎙️ Voiceover
> *"All audits are archived in the Scan History with fast pagination and instant reload capabilities. Normal team members manage their own client audits, while administrators maintain full visibility across the entire agency's search operations.*
>
> *MojoMap combines security, speed, and actionable geo-spatial intelligence to help Digital Mojo dominate local search. Thank you for watching."*

---

## 💡 Quick Tips for the Presenter

1. **Keep Mouse Movements Deliberate:** Move smoothly from one card to the next without rapid zig-zagging.
2. **Highlight the Zero-Emoji Professionalism:** Clients appreciate that the interface looks like an institutional analytics platform rather than a toy.
3. **Show Real Coordinates:** When clicking on pins, point out how the rank changes as you move just 1 to 2 kilometers away from the business's physical storefront.
