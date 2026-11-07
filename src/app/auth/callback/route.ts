import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isSupabaseEnvConfigured } from '@/utils/supabase/client';

function formatNowHe(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/';

  if (errorParam) {
    const reason = encodeURIComponent(errorDescription || errorParam);
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  if (code && isSupabaseEnvConfigured()) {
    const cookieStore = cookies();
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options: CookieOptions;
            }[]
          ) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore if in restricted context
              }
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && user.email) {
          const ts = formatNowHe();
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email.split('@')[0];
          const avatarUrl = user.user_metadata?.avatar_url || null;

          const { data: existingUser } = await supabase
            .from('app_users')
            .select('id, role')
            .eq('email', user.email.toLowerCase())
            .maybeSingle();

          if (!existingUser) {
            await supabase.from('app_users').insert({
              id: user.id,
              email: user.email.toLowerCase(),
              full_name: fullName,
              avatar_url: avatarUrl,
              role: 'viewer',
              provider: 'google',
              active: true,
              created_at: ts,
              last_sign_in_at: ts,
              updated_by: 'Google Sign-In (הוגדר אוטומטית כצופה)',
            });
          } else {
            await supabase
              .from('app_users')
              .update({
                last_sign_in_at: ts,
                avatar_url: avatarUrl,
              })
              .eq('id', existingUser.id);
          }
        }
      } catch (profileErr) {
        console.warn('Profile sync non-fatal error:', profileErr);
      }

      return redirectResponse;
    } else {
      const errReason = encodeURIComponent(exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=${errReason}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_auth_code_received`);
}
