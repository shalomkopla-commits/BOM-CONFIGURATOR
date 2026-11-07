import { createBrowserClient } from '@supabase/ssr';
import { AppUser, ConfiguratorState } from '@/types/configurator';
import { INITIAL_STATE, INITIAL_USERS } from '@/data/initialData';

const STORAGE_KEY = 'bom_configurator_state_v8';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id')
);

// Use createBrowserClient from @supabase/ssr so cookie sessions are shared with middleware
export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function loadConfiguratorState(): Promise<{
  state: ConfiguratorState;
  source: 'supabase' | 'localStorage' | 'seed';
}> {
  // 1. Try Supabase first if configured
  if (supabase) {
    try {
      const fetchPromise = supabase
        .from('configurator_state')
        .select('state_data')
        .eq('id', 'default')
        .maybeSingle();

      // Fetch live app_users table so any manual insert/update is reflected in real-time
      const fetchUsersPromise = supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Supabase fetch timeout') }), 5000)
      );

      const [stateResult, usersResult] = await Promise.all([
        Promise.race([fetchPromise, timeoutPromise]),
        Promise.race([fetchUsersPromise, timeoutPromise]),
      ]);

      if (!stateResult.error && stateResult.data?.state_data) {
        const remoteState = stateResult.data.state_data as ConfiguratorState;
        if (remoteState && Array.isArray(remoteState.orders) && remoteState.orders.length > 0) {
          // If live app_users rows exist, merge them directly into the state
          if (usersResult.data && Array.isArray(usersResult.data) && usersResult.data.length > 0) {
            const liveUsers: AppUser[] = usersResult.data.map((u: any) => ({
              id: u.id,
              email: u.email,
              fullName: u.full_name || u.email.split('@')[0],
              role: u.role || 'viewer',
              provider: u.provider || 'google',
              active: u.active !== false,
              createdAt: u.created_at || '',
              lastSignInAt: u.last_sign_in_at || '',
              updatedBy: u.updated_by || '',
            }));
            remoteState.users = liveUsers;
          }

          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteState));
          }
          return { state: remoteState, source: 'supabase' };
        }
      }
    } catch (err) {
      console.warn('Supabase load fallback to localStorage:', err);
    }
  }

  // 2. Fallback to browser localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ConfiguratorState;
        if (parsed && Array.isArray(parsed.orders) && parsed.orders.length > 0) {
          return { state: parsed, source: 'localStorage' };
        }
      }
    } catch (err) {
      console.warn('localStorage parse error, using INITIAL_STATE:', err);
    }
  }

  // 3. Ultimate safe fallback: initial seeded data
  return { state: structuredClone(INITIAL_STATE), source: 'seed' };
}

export async function saveConfiguratorState(
  state: ConfiguratorState,
  updatedBy = 'מערכת'
): Promise<{ syncedToSupabase: boolean }> {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save state to localStorage:', err);
    }
  }

  if (supabase) {
    try {
      const { error } = await supabase.from('configurator_state').upsert(
        {
          id: 'default',
          state_data: state,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        },
        { onConflict: 'id' }
      );
      if (!error) {
        return { syncedToSupabase: true };
      }
    } catch (err) {
      console.warn('Supabase sync warning:', err);
    }
  }

  return { syncedToSupabase: false };
}

export async function resetConfiguratorState(): Promise<ConfiguratorState> {
  const fresh = structuredClone(INITIAL_STATE);
  await saveConfiguratorState(fresh, 'איפוס מערכת');
  return fresh;
}

export async function signInWithGoogleOAuth(): Promise<{ redirected: boolean; error?: string }> {
  if (supabase) {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      if (error) return { redirected: false, error: error.message };
      return { redirected: true };
    } catch (err) {
      return { redirected: false, error: String(err) };
    }
  }
  return { redirected: false };
}

export async function getAuthenticatedGoogleUser(): Promise<{
  email: string;
  fullName: string;
  role: string;
} | null> {
  if (!supabase) return null;
  try {
    const fetchUser = supabase.auth.getUser();
    const timeout = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 4000)
    );
    const {
      data: { user },
    } = await Promise.race([fetchUser, timeout]);

    if (!user || !user.email) return null;

    const emailLower = user.email.toLowerCase();

    // Query public.app_users for the user's role
    const { data: profile } = await supabase
      .from('app_users')
      .select('email, full_name, role')
      .eq('email', emailLower)
      .maybeSingle();

    return {
      email: emailLower,
      fullName:
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        emailLower.split('@')[0],
      role: profile?.role || 'manager',
    };
  } catch {
    return null;
  }
}
