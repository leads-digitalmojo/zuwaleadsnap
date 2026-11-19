/**
 * DataForSEO Low Balance Watchdog & Srishti Ji Alert Service
 *
 * Monitors DataForSEO account balance via zero-credit endpoint:
 *   GET /v3/appendix/user_data
 *
 * When balance < threshold ($15.00 USD), dispatches an automated, branded
 * notification to Srishti Ji (srishti@digitalmojo.in) via Zoho ZeptoMail
 * with the direct top-up link: https://app.dataforseo.com/financial/balance.
 */

import axios from "axios";

export interface DataForSeoUserData {
  login: string;
  money: number;
  rates: Record<string, number>;
}

export interface BalanceStatus {
  balance: number;
  threshold: number;
  isLow: boolean;
  currency: string;
  login: string;
  lastChecked: string;
  lastAlertSentAt: string | null;
}

// In-memory debounce state (persisted across checks in this process)
let lastAlertSentTime = 0;
let lastAlertBalance = Infinity;

function getAuth(): string {
  const login = process.env["DATAFORSEO_LOGIN"];
  const password = process.env["DATAFORSEO_PASSWORD"];
  if (!login || !password) {
    throw new Error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD not set");
  }
  return Buffer.from(`${login}:${password}`).toString("base64");
}

export async function checkDataForSeoBalance(): Promise<{
  login: string;
  balance: number;
}> {
  const res = await axios.get("https://api.dataforseo.com/v3/appendix/user_data", {
    headers: {
      Authorization: `Basic ${getAuth()}`,
      "Content-Type": "application/json",
    },
    timeout: 15_000,
  });

  const task = res.data?.tasks?.[0];
  const result = task?.result?.[0];
  const balance = typeof result?.money === "number" ? result.money : result?.money?.balance;
  if (result === undefined || typeof balance !== "number") {
    throw new Error(
      `Invalid response from DataForSEO appendix/user_data: ${res.data?.status_message || "no money field"}`
    );
  }

  return {
    login: result.login || process.env["DATAFORSEO_LOGIN"] || "",
    balance: Number(balance),
  };
}

export async function sendSrishtiBalanceAlert(
  currentBalance: number,
  threshold: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env["ZEPTOMAIL_SEND_MAIL_TOKEN"];
  const recipient = process.env["SRISHTI_EMAIL"] || "srishti@digitalmojo.in";
  const fromEmail = process.env["ZEPTOMAIL_FROM_EMAIL"] || "alerts@digitalmojo.in";
  const fromName = process.env["ZEPTOMAIL_FROM_NAME"] || "Digital Mojo Alerts";
  const topUpUrl =
    process.env["DATAFORSEO_TOPUP_URL"] || "https://app.dataforseo.com/financial/balance";

  if (!token) {
    const err = "ZEPTOMAIL_SEND_MAIL_TOKEN is not configured in environment";
    console.warn(`[BalanceWatchdog] ${err}`);
    return { success: false, error: err };
  }

  const formattedBalance = `$${currentBalance.toFixed(2)} USD`;
  const formattedThreshold = `$${threshold.toFixed(2)} USD`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #dc2626; color: #ffffff; padding: 20px 24px; text-align: left; }
    .header h2 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 24px; }
    .stat-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; }
    .stat-label { font-size: 12px; color: #991b1b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
    .stat-val { font-size: 24px; font-weight: 800; color: #dc2626; }
    .btn-container { text-align: center; margin: 28px 0 16px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
    .btn:hover { background: #1d4ed8; }
    .footer { font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; padding: 16px 24px; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>Action Required: DataForSEO Low Balance Alert</h2>
      <p>MojoMap Automated Rank Tracking Watchdog</p>
    </div>
    <div class="content">
      <p>Hi <strong>Srishti Ji</strong>,</p>
      <p>The DataForSEO account used by <strong>MojoMap</strong> for local Google Maps rank tracking has reached a low credit threshold.</p>
      
      <div class="stat-box">
        <div>
          <div class="stat-label">Current Available Balance</div>
          <div class="stat-val">${formattedBalance}</div>
        </div>
        <div style="text-align: right;">
          <div class="stat-label">Safety Threshold</div>
          <div style="font-size: 16px; font-weight: 600; color: #475569;">${formattedThreshold}</div>
        </div>
      </div>

      <p>To ensure automated geo-grid tracking and client rank scans continue uninterrupted without failing, please top up the account balance using the link below:</p>

      <div class="btn-container">
        <a href="${topUpUrl}" target="_blank" class="btn">Recharge DataForSEO Balance</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
        Direct payment URL: <a href="${topUpUrl}" style="color: #2563eb;">${topUpUrl}</a><br>
        Account Login: <code>info@digitalmojo.in</code>
      </p>
    </div>
    <div class="footer">
      This is an automated operational alert generated by MojoMap System Watchdog &middot; Digital Mojo
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
            address: recipient,
            name: "Srishti Ji",
          },
        },
      ],
      subject: `URGENT: DataForSEO Low Balance (${formattedBalance}) - Recharge Required for MojoMap`,
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
    console.log(`[BalanceWatchdog] Alert email dispatched successfully to ${recipient} (Message ID: ${msgId})`);
    lastAlertSentTime = Date.now();
    lastAlertBalance = currentBalance;
    return { success: true, messageId: msgId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[BalanceWatchdog] Failed to send ZeptoMail alert:`, message);
    return { success: false, error: message };
  }
}

/**
 * Executes a single watchdog check.
 * Debounces so emails aren't sent more than once every 12 hours unless balance drops by > $3.
 */
export async function runBalanceWatchdogCheck(
  forceEmail: boolean = false
): Promise<BalanceStatus> {
  const threshold = parseFloat(process.env["DATAFORSEO_MIN_BALANCE_USD"] || "15.00");
  const { login, balance } = await checkDataForSeoBalance();
  const isLow = balance < threshold;

  const now = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;
  const shouldSendAlert =
    isLow &&
    (forceEmail ||
      now - lastAlertSentTime > twelveHours ||
      lastAlertBalance - balance >= 3.0);

  if (shouldSendAlert) {
    console.warn(
      `[BalanceWatchdog] Low balance detected: $${balance.toFixed(2)} (threshold: $${threshold.toFixed(2)}). Sending alert...`
    );
    await sendSrishtiBalanceAlert(balance, threshold);
  }

  return {
    balance,
    threshold,
    isLow,
    currency: "USD",
    login,
    lastChecked: new Date().toISOString(),
    lastAlertSentAt: lastAlertSentTime > 0 ? new Date(lastAlertSentTime).toISOString() : null,
  };
}

/**
 * Initializes recurring background watchdog timer (every 4 hours).
 */
export function initBalanceWatchdogScheduler(): NodeJS.Timeout {
  const checkIntervalMs = 4 * 60 * 60 * 1000; // 4 hours
  console.log("[BalanceWatchdog] Scheduler initialized. Polling DataForSEO balance every 4 hours.");

  // Run initial check after 10 seconds of startup
  setTimeout(() => {
    runBalanceWatchdogCheck().catch((e) =>
      console.warn("[BalanceWatchdog] Initial check failed:", e.message)
    );
  }, 10_000);

  return setInterval(() => {
    runBalanceWatchdogCheck().catch((e) =>
      console.warn("[BalanceWatchdog] Scheduled check failed:", e.message)
    );
  }, checkIntervalMs);
}
