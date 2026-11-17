import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "https://voeeewzhkzcmcpknfpby.supabase.co";
const SUPABASE_ANON_KEY = process.env["SUPABASE_ANON_KEY"] ?? "";

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const DEFAULT_ADMIN_EMAILS = [
  "dev@digitalmojo.in",
  "admin@digitalmojo.in",
  "nikhil@digitalmojo.in",
  "info@digitalmojo.in",
];

function getAdminEmails(): Set<string> {
  const envAdmins = process.env["ADMIN_EMAILS"];
  const list = envAdmins ? envAdmins.split(",").map((e) => e.trim().toLowerCase()) : DEFAULT_ADMIN_EMAILS;
  return new Set(list);
}

export function isAllowedDomain(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@digitalmojo.in");
}

export function resolveUserRole(email: string, metadataRole?: unknown): "admin" | "user" {
  const normEmail = email.trim().toLowerCase();
  if (getAdminEmails().has(normEmail)) return "admin";
  if (metadataRole === "admin") return "admin";
  return "user";
}

/**
 * Express middleware to authenticate Supabase JWTs and enforce @digitalmojo.in domain.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Authentication required. Please sign in with your @digitalmojo.in account." });
    return;
  }

  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);

    if (error || !user || !user.email) {
      res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
      return;
    }

    if (!isAllowedDomain(user.email)) {
      res.status(403).json({
        error: "Access denied. Only @digitalmojo.in organization accounts are authorized to access MojoMap.",
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: resolveUserRole(user.email, user.user_metadata?.["role"]),
    };

    next();
  } catch (err) {
    res.status(500).json({ error: "Authentication check failed: " + (err as Error).message });
  }
}

/**
 * Optional authentication: extracts user if token provided, but doesn't block unauthenticated.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    next();
    return;
  }

  try {
    const { data: { user } } = await supabaseServer.auth.getUser(token);
    if (user && user.email && isAllowedDomain(user.email)) {
      req.user = {
        id: user.id,
        email: user.email,
        role: resolveUserRole(user.email, user.user_metadata?.["role"]),
      };
    }
  } catch {
    // proceed as guest
  }
  next();
}
