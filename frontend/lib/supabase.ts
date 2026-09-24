import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

const PLACEHOLDER_URL = "http://127.0.0.1:54321";
const PLACEHOLDER_KEY = "dev-placeholder-anon-key";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("your-project") &&
      key !== "your-anon-key"
  );
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}
