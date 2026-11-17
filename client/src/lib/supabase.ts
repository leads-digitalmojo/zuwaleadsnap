import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "https://azgfvsjpuvzneoxoqcxl.supabase.co";
const supabaseAnonKey = (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isDigitalMojoEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@digitalmojo.in");
}

export function isAdminEmail(email: string): boolean {
  const norm = email.trim().toLowerCase();
  const admins = ["dev@digitalmojo.in", "admin@digitalmojo.in", "nikhil@digitalmojo.in", "info@digitalmojo.in"];
  return admins.includes(norm);
}
