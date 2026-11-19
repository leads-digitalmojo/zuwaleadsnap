/**
 * Express router for DataForSEO Balance Watchdog
 * Endpoints:
 *   GET  /api/balance          - Get current balance status & threshold
 *   POST /api/balance/check    - Force immediate check
 *   POST /api/balance/test-alert - Admin trigger to verify email delivery to Srishti Ji
 */

import { Router } from "express";
import {
  runBalanceWatchdogCheck,
  sendSrishtiBalanceAlert,
  checkDataForSeoBalance,
} from "../lib/balanceWatchdog.js";
import { optionalAuth, requireAuth } from "../lib/auth.js";

export const balanceRouter = Router();

// GET /api/balance - Returns current balance and threshold
balanceRouter.get("/", optionalAuth, async (_req, res) => {
  try {
    const status = await runBalanceWatchdogCheck(false);
    res.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to retrieve balance: " + message });
  }
});

// POST /api/balance/check - Force fresh balance query
balanceRouter.post("/check", optionalAuth, async (_req, res) => {
  try {
    const result = await checkDataForSeoBalance();
    const threshold = parseFloat(process.env["DATAFORSEO_MIN_BALANCE_USD"] || "15.00");
    res.json({
      ...result,
      threshold,
      isLow: result.balance < threshold,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Balance check failed: " + message });
  }
});

// POST /api/balance/test-alert - Trigger test alert email to Srishti Ji
balanceRouter.post("/test-alert", requireAuth, async (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin privilege required to trigger test alerts" });
    return;
  }

  try {
    const { balance } = await checkDataForSeoBalance();
    const threshold = parseFloat(process.env["DATAFORSEO_MIN_BALANCE_USD"] || "15.00");
    const result = await sendSrishtiBalanceAlert(balance, threshold);
    res.json({
      message: `Alert triggered to ${process.env["SRISHTI_EMAIL"] || "srishti@digitalmojo.in"}`,
      currentBalance: balance,
      threshold,
      result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Test alert failed: " + message });
  }
});
