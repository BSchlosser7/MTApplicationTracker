import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill them in."
  );
}

// Server-only client using the service_role key — this must never be sent
// to the browser. It bypasses RLS, which is fine here because every call
// site is a Next.js API route, not client-side code.
const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

export default supabase;

export const DOCUMENTS_BUCKET = "documents";
