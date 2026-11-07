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
  const next = searchParams.get('next') ?? '/';

  if (code && isSupabaseEnvConfigured()) {
    const cookieStore = cookies();
    // Prepare a redirect response to the target page
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
              // Set on cookieStore for this request
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore if in restricted context
              }
              // Set directly on the outgoing NextResponse so browser stores the session cookies!
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Verify authenticated user with getUser()
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

        // Check if user already exists in public.app_users
        const { data: existingUser } = await supabase
          .from('app_users')
          .select('id, role')
          .eq('email', user.email.toLowerCase())
          .maybeSingle();

        if (!existingUser) {
          // First-time Google Sign-In: automatically register as 'viewer' (צופה)
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
          // Returning user: update last_sign_in_at
          await supabase
            .from('app_users')
            .update({
              last_sign_in_at: ts,
              avatar_url: avatarUrl,
            })
            .eq('id', existingUser.id);
        }
      }

      // Return the response with all session cookies attached!
      return redirectResponse;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
