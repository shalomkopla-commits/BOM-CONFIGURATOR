import { createBrowserClient } from '@supabase/ssr';

export function isSupabaseEnvConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return Boolean(
    url &&
      key &&
      url.startsWith('http') &&
      !url.includes('your-project-id')
  );
}

export function createClient() {
  if (!isSupabaseEnvConfigured()) {
    return null;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
