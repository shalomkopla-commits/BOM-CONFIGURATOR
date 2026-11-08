import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  const res = NextResponse.redirect(`${origin}/login`, { status: 302 });
  res.cookies.delete('bom_local_auth');
  return res;
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  const res = NextResponse.redirect(`${origin}/login`, { status: 302 });
  res.cookies.delete('bom_local_auth');
  return res;
}


