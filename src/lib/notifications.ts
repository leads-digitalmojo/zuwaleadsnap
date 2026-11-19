/**
 * Automated Scan Report Email Notifications
 * Sends an email to whoever initiated the scan when results are ready.
 * Powered by Zoho ZeptoMail.
 */

import axios from "axios";
import crypto from "crypto";
import { getDb } from "./db.js";

interface ScanDetails {
  id: number;
  business_name: string;
  keyword: string;
  user_email: string | null;
  grid_size: number;
  shape: string;
  total_points: number;
  spacing_km: number;
}

export async function notifyScanComplete(scanId: number): Promise<void> {
  const db = getDb();

  const scan = db.prepare(`
    SELECT s.id, s.keyword, s.user_email, s.grid_size, s.shape, s.total_points, s.spacing_km,
           b.name AS business_name
    FROM scans s
    LEFT JOIN businesses b ON b.id = s.business_id
    WHERE s.id = ?
  `).get(scanId) as ScanDetails | undefined;

  if (!scan || !scan.user_email) {
    return; // No email attached to this scan
  }

  // Ensure public share token exists
  let share = db.prepare("SELECT token FROM scan_shares WHERE scan_id = ?").get(scanId) as
    | { token: string }
    | undefined;

  if (!share) {
    const token = crypto.randomUUID();
    db.prepare("INSERT INTO scan_shares (scan_id, token) VALUES (?, ?)").run(scanId, token);
    share = { token };
  }

  // Calculate quick metrics for the email
  const points = db.prepare(`
    SELECT rank FROM scan_points WHERE scan_id = ?
  `).all(scanId) as Array<{ rank: number | null }>;

  const ranked = points.filter((p) => typeof p.rank === "number" && p.rank > 0);
  const avgRank = ranked.length > 0
    ? (ranked.reduce((acc, p) => acc + (p.rank ?? 0), 0) / ranked.length).toFixed(1)
    : "–";

  const top3Count = points.filter((p) => typeof p.rank === "number" && p.rank >= 1 && p.rank <= 3).length;
  const top3Pct = scan.total_points > 0 ? ((top3Count / scan.total_points) * 100).toFixed(1) : "0.0";

  const reportUrl = `https://rankmap.digitalmojo.in/report/${share.token}`;
  const token = process.env["ZEPTOMAIL_SEND_MAIL_TOKEN"];
  const fromEmail = process.env["ZEPTOMAIL_FROM_EMAIL"] || "alerts@digitalmojo.in";
  const fromName = process.env["ZEPTOMAIL_FROM_NAME"] || "Digital Mojo Alerts";

  if (!token) {
    console.warn(`[notifyScanComplete] ZEPTOMAIL_SEND_MAIL_TOKEN not configured. Skipping scan completion email.`);
    return;
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f4ef; margin: 0; padding: 24px; color: #111013; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e7e6e1; overflow: hidden; box-shadow: 0 4px 12px rgba(17,16,19,0.06); }
    .header { background: #111013; color: #ffffff; padding: 24px; text-align: left; }
    .header h2 { margin: 0; font-size: 20px; font-weight: 800; color: #ffe95c; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #a1a09d; }
    .content { padding: 28px 24px; }
    .biz-title { font-size: 17px; font-weight: 700; color: #111013; margin-bottom: 4px; }
    .kw-badge { display: inline-block; background: #fff4d6; color: #b87500; border: 1px solid #ebd48f; border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 700; margin: 8px 0 16px; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 20px 0; }
    .stat-box { background: #faf9f5; border: 1px solid #e7e6e1; border-radius: 8px; padding: 12px; text-align: center; }
    .stat-label { font-size: 10px; color: #6b6a70; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
    .stat-val { font-size: 22px; font-weight: 800; color: #111013; margin-top: 4px; }
    .btn-container { text-align: center; margin: 28px 0 12px; }
    .btn { display: inline-block; background: #f0bc00; color: #111013 !important; font-weight: 800; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 6px rgba(240,188,0,0.3); }
    .footer { font-size: 12px; color: #6b6a70; border-top: 1px solid #e7e6e1; padding: 16px 24px; background: #faf9f5; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>MojoMap &middot; Geo-Grid Intelligence</h2>
      <p>Your local Google Maps rank tracking scan has completed</p>
    </div>
    <div class="content">
      <p style="margin-top:0;">Hi there,</p>
      <p>Your geo-grid rank map scan has finished processing and is ready for interactive review:</p>
      
      <div class="biz-title">${scan.business_name}</div>
      <div class="kw-badge">Keyword: "${scan.keyword}"</div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Avg Geo Rank</div>
          <div class="stat-val" style="color: #1f9d55;">${avgRank}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Top 3% Dominance</div>
          <div class="stat-val" style="color: #1f9d55;">${top3Pct}%</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total Matrix</div>
          <div class="stat-val">${scan.total_points} pts</div>
        </div>
      </div>

      <p style="font-size: 13px; color: #6b6a70; line-height: 1.5;">
        Grid configuration: <strong>${scan.grid_size}&times;${scan.grid_size} (${scan.shape})</strong> with <strong>${scan.spacing_km} km</strong> spacing.
      </p>

      <div class="btn-container">
        <a href="${reportUrl}" target="_blank" class="btn">View Interactive Rank Report &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #6b6a70; text-align: center; margin-top: 20px;">
        Direct link: <a href="${reportUrl}" style="color: #b87500;">${reportUrl}</a>
      </p>
    </div>
    <div class="footer">
      Generated automatically by MojoMap &middot; Digital Mojo &middot; Internal Operations
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const payload = {
      bounce_address: process.env["ZEPTOMAIL_BOUNCE_ADDRESS"] || undefined,
      from: {
        address: fromEmail,
        name: fromName,
      },
      to: [
        {
          email_address: {
            address: scan.user_email,
            name: scan.user_email.split("@")[0],
          },
        },
      ],
      subject: `Your MojoMap Rank Report is Ready: ${scan.business_name} - "${scan.keyword}"`,
      htmlbody: htmlBody,
    };

    const res = await axios.post("https://api.zeptomail.com/v1.1/email", payload, {
      headers: {
        Authorization: token.startsWith("Zoho-enczapikey") ? token : `Zoho-enczapikey ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    });

    const msgId = res.data?.data?.[0]?.message_id || "sent";
    console.log(`[notifyScanComplete] Report email dispatched to ${scan.user_email} (Msg ID: ${msgId})`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[notifyScanComplete] Failed to send report ready email to ${scan.user_email}:`, message);
  }
}
