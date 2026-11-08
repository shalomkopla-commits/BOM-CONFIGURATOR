import { createBrowserClient } from '@supabase/ssr';
import {
  AppUser,
  CatalogRule,
  ConfiguratorState,
  Order,
  RecycleBinItem,
  SystemType,
} from '@/types/configurator';
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

// --- Entity Mappers: TypeScript <-> PostgreSQL Relational Tables ---

function mapDbToRule(r: any): CatalogRule {
  return {
    sku: r.sku,
    rev: r.rev || 'Rev A',
    desc: r.description || r.desc || '',
    category: r.category,
    parentSku: r.parent_sku || 'ROOT',
    matchPower: Array.isArray(r.match_power) ? r.match_power : [],
    matchFocal: Array.isArray(r.match_focal) ? r.match_focal : [],
    matchVoltage: Array.isArray(r.match_voltage) ? r.match_voltage : [],
    matchEnv: Array.isArray(r.match_env) ? r.match_env : [],
    matchUsage: Array.isArray(r.match_usage) ? r.match_usage : [],
    cost: r.cost || '$0',
    imgType: r.img_type || 'optics',
    customImg: r.custom_img || null,
    active: r.active !== false,
  };
}

function mapRuleToDb(r: CatalogRule) {
  return {
    sku: r.sku,
    rev: r.rev || 'Rev A',
    description: r.desc || (r as any).description || '',
    category: r.category,
    parent_sku: r.parentSku || 'ROOT',
    match_power: r.matchPower || [],
    match_focal: r.matchFocal || [],
    match_voltage: r.matchVoltage || [],
    match_env: r.matchEnv || [],
    match_usage: r.matchUsage || [],
    cost: r.cost || '$0',
    img_type: r.imgType || 'optics',
    custom_img: r.customImg || null,
    active: r.active !== false,
  };
}

function mapDbToSystem(s: any): SystemType {
  return {
    id: s.id,
    name: s.name,
    allowedPowers: Array.isArray(s.allowed_powers) ? s.allowed_powers : [],
    allowedFocals: Array.isArray(s.allowed_focals) ? s.allowed_focals : [],
    allowedVoltages: Array.isArray(s.allowed_voltages) ? s.allowed_voltages : [],
    allowedEnvs: Array.isArray(s.allowed_envs) ? s.allowed_envs : [],
    allowedUsages: Array.isArray(s.allowed_usages) ? s.allowed_usages : [],
    power: s.power || '',
    voltage: s.voltage || '',
    channels: Number(s.channels) || 1,
    psuCount: Number(s.psu_count) || 1,
    focal: s.focal || '',
    env: s.env || '',
    usage: s.usage || '',
    active: s.active !== false,
    customImg: s.custom_img || null,
    catQty: s.cat_qty || {},
  };
}

function mapSystemToDb(s: SystemType) {
  return {
    id: s.id,
    name: s.name,
    allowed_powers: s.allowedPowers || [],
    allowed_focals: s.allowedFocals || [],
    allowed_voltages: s.allowedVoltages || [],
    allowed_envs: s.allowedEnvs || [],
    allowed_usages: s.allowedUsages || [],
    power: s.power || '',
    voltage: s.voltage || '',
    channels: s.channels || 1,
    psu_count: s.psuCount || 1,
    focal: s.focal || '',
    env: s.env || '',
    usage: s.usage || '',
    active: s.active !== false,
    custom_img: s.customImg || null,
    cat_qty: s.catQty || {},
  };
}

function mapDbToOrder(o: any): Order {
  return {
    id: o.id,
    customer: o.customer,
    contact: o.contact,
    email: o.email || '',
    systemTypeId: o.system_type_id,
    systemName: o.system_name,
    deliveryDate: o.delivery_date,
    createdAt: o.created_at,
    createdBy: o.created_by,
    updatedAt: o.updated_at,
    updatedBy: o.updated_by,
    power: o.power,
    focal: o.focal,
    voltage: o.voltage,
    env: o.env,
    usage: o.usage,
    channels: Number(o.channels) || 1,
    psuCount: Number(o.psu_count) || 1,
    status: o.status,
    locked: o.locked === true,
    bom: Array.isArray(o.bom) ? o.bom : [],
  };
}

function mapOrderToDb(o: Order) {
  return {
    id: o.id,
    customer: o.customer,
    contact: o.contact,
    email: o.email || '',
    system_type_id: o.systemTypeId,
    system_name: o.systemName,
    delivery_date: o.deliveryDate,
    created_at: o.createdAt,
    created_by: o.createdBy,
    updated_at: o.updatedAt,
    updated_by: o.updatedBy,
    power: o.power,
    focal: o.focal,
    voltage: o.voltage,
    env: o.env,
    usage: o.usage,
    channels: o.channels || 1,
    psu_count: o.psuCount || 1,
    status: o.status,
    locked: o.locked === true,
    bom: o.bom || [],
  };
}

function mapDbToUser(u: any): AppUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name || u.email.split('@')[0],
    role: u.role || 'viewer',
    provider: u.provider || 'google',
    active: u.active !== false,
    createdAt: u.created_at || '',
    lastSignInAt: u.last_sign_in_at || '',
    updatedBy: u.updated_by || '',
  };
}

function mapUserToDb(u: AppUser, fallbackUpdatedBy: string) {
  const ts = new Date().toISOString();
  return {
    id: u.id,
    email: u.email.toLowerCase().trim(),
    full_name: u.fullName,
    role: u.role,
    provider: u.provider || 'google',
    active: u.active !== false,
    created_at: u.createdAt || ts,
    last_sign_in_at: u.lastSignInAt || ts,
    updated_by: u.updatedBy || fallbackUpdatedBy,
  };
}

// --- Load and Save Functions ---

export async function loadConfiguratorState(): Promise<{
  state: ConfiguratorState;
  source: 'supabase' | 'localStorage' | 'seed';
}> {
  // 1. Try Supabase first if configured
  if (supabase) {
    try {
      const timeout = 6000;
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Supabase fetch timeout') }), timeout)
      );

      // Fetch unified state snapshot and all live relational tables in parallel
      const [
        stateResult,
        rulesResult,
        systemsResult,
        ordersResult,
        usersResult,
        recycleResult,
      ] = await Promise.all([
        Promise.race([
          supabase.from('configurator_state').select('state_data').eq('id', 'default').maybeSingle(),
          timeoutPromise,
        ]),
        Promise.race([supabase.from('catalog_rules').select('*'), timeoutPromise]),
        Promise.race([supabase.from('system_types').select('*'), timeoutPromise]),
        Promise.race([supabase.from('orders').select('*'), timeoutPromise]),
        Promise.race([
          supabase.from('app_users').select('*').order('created_at', { ascending: false }),
          timeoutPromise,
        ]),
        Promise.race([supabase.from('recycle_bin').select('*'), timeoutPromise]),
      ]);

      let baseState: ConfiguratorState | null = null;
      if (!stateResult.error && stateResult.data?.state_data) {
        const remote = stateResult.data.state_data as ConfiguratorState;
        if (remote && Array.isArray(remote.orders)) {
          baseState = remote;
        }
      }

      if (!baseState) {
        baseState = structuredClone(INITIAL_STATE);
      }

      // Bi-directional live table overrides:
      // If catalog_rules table has rows, it takes precedence!
      if (!rulesResult.error && rulesResult.data && rulesResult.data.length > 0) {
        baseState.catalogRules = rulesResult.data.map(mapDbToRule);
      }

      // If system_types table has rows, it takes precedence!
      if (!systemsResult.error && systemsResult.data && systemsResult.data.length > 0) {
        baseState.systemTypes = systemsResult.data.map(mapDbToSystem);
      }

      // If orders table has rows, it takes precedence!
      if (!ordersResult.error && ordersResult.data && ordersResult.data.length > 0) {
        baseState.orders = ordersResult.data.map(mapDbToOrder);
      }

      // If app_users table has rows, it takes precedence!
      if (!usersResult.error && usersResult.data && usersResult.data.length > 0) {
        let maxNum = 100;
        const mappedUsers = usersResult.data.map(mapDbToUser);
        mappedUsers.forEach((u: AppUser) => {
          if (u.id.startsWith('USR-')) {
            const num = parseInt(u.id.replace('USR-', ''), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        baseState.users = mappedUsers.map((u: AppUser) => {
          if (!u.id || !u.id.startsWith('USR-')) {
            maxNum += 1;
            return { ...u, id: `USR-${maxNum}` };
          }
          return u;
        });
      }

      // If recycle_bin table has rows, map them
      if (!recycleResult.error && recycleResult.data && recycleResult.data.length > 0) {
        baseState.recycleBin = recycleResult.data.map((b: any) => ({
          recycleId: b.recycle_id,
          itemType: b.item_type,
          skuOrId: b.sku_or_id,
          rev: b.rev || '-',
          name: b.name,
          categoryOrDetails: b.category_or_details || '',
          deletedBy: b.deleted_by,
          deletedAt: b.deleted_at,
          deleteReason: b.delete_reason,
          payload: b.payload,
        }));
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseState));
      }
      return { state: baseState, source: 'supabase' };
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
  // Always update browser localStorage first
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save state to localStorage:', err);
    }
  }

  if (supabase) {
    try {
      // 1. Save unified snapshot state
      const statePromise = supabase.from('configurator_state').upsert(
        {
          id: 'default',
          state_data: state,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        },
        { onConflict: 'id' }
      );

      // 2. Sync catalog_rules
      const rulesPromise =
        state.catalogRules && state.catalogRules.length > 0
          ? supabase
              .from('catalog_rules')
              .upsert(state.catalogRules.map(mapRuleToDb), { onConflict: 'sku,rev' })
          : Promise.resolve({ error: null });

      // 3. Sync system_types
      const systemsPromise =
        state.systemTypes && state.systemTypes.length > 0
          ? supabase
              .from('system_types')
              .upsert(state.systemTypes.map(mapSystemToDb), { onConflict: 'id' })
          : Promise.resolve({ error: null });

      // 4. Sync orders
      const ordersPromise =
        state.orders && state.orders.length > 0
          ? supabase
              .from('orders')
              .upsert(state.orders.map(mapOrderToDb), { onConflict: 'id' })
          : Promise.resolve({ error: null });

      // 5. Sync users (upsert on unique email so ID format changes or Google OAuth UUIDs never conflict)
      const usersPromise =
        state.users && state.users.length > 0
          ? supabase
              .from('app_users')
              .upsert(
                state.users.map((u) => mapUserToDb(u, updatedBy)),
                { onConflict: 'email' }
              )
          : Promise.resolve({ error: null });

      // Handle user deletion cleanup in app_users
      const userCleanupPromise = (async () => {
        if (state.users && state.users.length > 0) {
          const keepEmails = state.users.map((u) => u.email.toLowerCase().trim());
          const { data } = await supabase.from('app_users').select('email');
          if (data && data.length > 0) {
            const toRemove = data
              .map((x) => x.email.toLowerCase().trim())
              .filter((em) => !keepEmails.includes(em));
            if (toRemove.length > 0) {
              await supabase.from('app_users').delete().in('email', toRemove);
            }
          }
        }
      })();

      // 6. Handle recycle bin cleanup in DB for deleted items
      let cleanupPromise: Promise<any> = Promise.resolve();
      if (state.recycleBin && state.recycleBin.length > 0) {
        const deletedSkus = state.recycleBin
          .filter((i) => i.itemType === 'assembly')
          .map((i) => i.skuOrId);
        const deletedSysIds = state.recycleBin
          .filter((i) => i.itemType === 'system')
          .map((i) => i.skuOrId);

        cleanupPromise = Promise.all([
          deletedSkus.length > 0
            ? supabase.from('catalog_rules').delete().in('sku', deletedSkus)
            : Promise.resolve(),
          deletedSysIds.length > 0
            ? supabase.from('system_types').delete().in('id', deletedSysIds)
            : Promise.resolve(),
          supabase.from('recycle_bin').upsert(
            state.recycleBin.map((b) => ({
              recycle_id: b.recycleId,
              item_type: b.itemType,
              sku_or_id: b.skuOrId,
              rev: b.rev || '-',
              name: b.name,
              category_or_details: b.categoryOrDetails || '',
              deleted_by: b.deletedBy,
              deleted_at: b.deletedAt,
              delete_reason: b.deleteReason,
              payload: b.payload,
            })),
            { onConflict: 'recycle_id' }
          ),
        ]);
      }

      const [
        stateRes,
        rulesRes,
        systemsRes,
        ordersRes,
        usersRes,
      ] = await Promise.all([
        statePromise,
        rulesPromise,
        systemsPromise,
        ordersPromise,
        usersPromise,
        cleanupPromise,
        userCleanupPromise,
      ]);

      if (usersRes?.error) {
        console.error('Supabase users sync error:', usersRes.error);
      }

      return { syncedToSupabase: true };
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
