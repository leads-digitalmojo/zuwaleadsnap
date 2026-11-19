# REA (Reverse Engineer Anything) — Evidence & Inspection Report

**Tool:** [morluto/rea](https://github.com/morluto/rea) (v6.9.0)  
**Target:** `https://app.leadsnap.com/`  
**Provider:** `rea-playwright-browser-scenario`  
**Evidence ID:** `ev_dabb80472527071d99a42b4bc16ec7e5197d8fbea0edaa60585111de4a0a7d0b`  
**Execution Timestamp:** 2026-11-19 12:41:35 UTC  
**Evidence File:** [`leadsnap-rea/evidence/evidence_app_leadsnap.json`](./evidence/evidence_app_leadsnap.json)  
**Captured Screenshot:** [`leadsnap-rea/evidence/leadsnap_login_viewport.png`](./evidence/leadsnap_login_viewport.png)  

---

## 1. Execution Summary

The REA toolkit (`npx --yes rea-agents@latest capture-browser-scenario`) was deployed in an isolated Ubuntu 24.04 environment to capture, inspect, and analyze the live LeadSnap web application (`https://app.leadsnap.com/`).

```bash
REA_BROWSER_NO_SANDBOX=true npx --yes rea-agents@latest capture-browser-scenario \
  /tmp/leadsnap-capture.json --format json > evidence_app_leadsnap.json
```

---

## 2. Recovered Runtime & Technology Evidence

From the authenticated REA evidence bundle, the following structural characteristics were recovered:

### 2.1 Client Framework & State Management
- **State Store:** Evidence in the recovered DOM reveals active cleanup of `window.localStorage.removeItem('Vuex');`, confirming that LeadSnap is architected on **Vue.js + Vuex** for client-side state handling.
- **Client Scripting:** Includes `jQuery 3.3.1` (`https://code.jquery.com/jquery-3.3.1.min.js`), Bootstrap CSS grid, and FontAwesome icons (`font-awesome.min.css`).
- **Device & Timezone Fingerprinting:**
  ```javascript
  d = new Date();
  var offset = d.toString().split("GMT")[1].split(" (")[0];
  $('#timezone').val(offset);
  if (localStorage.getItem('ls_known_device')) {
      document.getElementById('known_device').value = '1';
  }
  ```

### 2.2 Backend Architecture & Sessions
- **Application Framework:** Built on **Laravel / PHP**, identified by:
  - `laravel_session` HttpOnly session cookie
  - `XSRF-TOKEN` cookie containing encrypted Base64 payload with HMAC signatures
  - Form action routes: `https://app.leadsnap.com/signin`, `https://app.leadsnap.com/register`, `https://app.leadsnap.com/forgot-password`
- **Security & Proxy:** Gated through **Cloudflare** (`cf-ray`, `cf-cache-status: DYNAMIC`, Cloudflare Turnstile/JS challenge integration).

---

## 3. Evidence Artifacts Index

1. **Complete Evidence JSON:** [`leadsnap-rea/evidence/evidence_app_leadsnap.json`](./evidence/evidence_app_leadsnap.json) (141.4 KB)
2. **Viewport Screenshot:** [`leadsnap-rea/evidence/leadsnap_login_viewport.png`](./evidence/leadsnap_login_viewport.png) (121.5 KB PNG)
3. **DOM Content Hash:** `8bd120cb88d53c6dcf1a46b9e1d33959874c4fa783dd76279e471cac2e0432e2`
