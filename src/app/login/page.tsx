'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isSupabaseEnvConfigured } from '@/utils/supabase/client';
import { loadConfiguratorState } from '@/lib/supabase';
import { deriveDefaultUsername, INITIAL_USERS } from '@/data/initialData';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const errorQuery = searchParams.get('error');
    if (errorQuery) {
      if (errorQuery === 'auth_callback_failed') {
        setErrorMsg('התחברות נכשלה בעת אימות הנתונים מול Google ו-Supabase. אנא נסה שוב.');
      } else if (errorQuery === 'no_auth_code_received') {
        setErrorMsg('התחברות נכשלה: לא התקבל קוד אימות מחשבון Google.');
      } else {
        setErrorMsg(`התחברות נכשלה: ${decodeURIComponent(errorQuery)}`);
      }
    }
  }, [searchParams]);

  const handleGoogleOAuthLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    const supabase = createClient();

    if (!supabase) {
      setLoading(false);
      setErrorMsg(
        'משתני הסביבה של Supabase טרם הוגדרו (.env.local). ניתן להתחבר באמצעות שם משתמש וסיסמה למעלה.'
      );
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrorMsg(`התחברות נכשלה: ${error.message}`);
    }
  };

  const handleUsernamePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const userInput = username.trim().toLowerCase();
    const passInput = password.trim();

    if (!userInput || !passInput) {
      setErrorMsg('נא להזין שם משתמש וסיסמה.');
      return;
    }

    setCredLoading(true);
    try {
      const { state } = await loadConfiguratorState();
      const usersPool =
        state.users && state.users.length > 0 ? state.users : INITIAL_USERS;

      const matchedUser = usersPool.find((u) => {
        const uName = (
          u.username || deriveDefaultUsername(u.fullName, u.email)
        )
          .trim()
          .toLowerCase();
        const uEmail = (u.email || '').trim().toLowerCase();
        const uEmailLocal = uEmail.split('@')[0];
        return (
          uName === userInput ||
          uEmail === userInput ||
          uEmailLocal === userInput
        );
      });

      if (!matchedUser) {
        setCredLoading(false);
        setErrorMsg(
          'משתמש לא נמצא במערכת. לא ניתן לפתוח חשבון חדש ללא Google — פנה למנהל המערכת להקמת משתמש או התחבר באמצעות חשבון Google.'
        );
        return;
      }

      if (matchedUser.active === false) {
        setCredLoading(false);
        setErrorMsg('חשבון משתמש זה מושהה כעת ע"י מנהל המערכת.');
        return;
      }

      const expectedPass = matchedUser.password || '123456';
      if (passInput !== expectedPass) {
        setCredLoading(false);
        setErrorMsg('סיסמה שגויה. אנא נסה שוב.');
        return;
      }

      // Set session cookie for middleware + localStorage for client hydration
      document.cookie = `bom_local_auth=${encodeURIComponent(
        matchedUser.email
      )}; path=/; max-age=86400; SameSite=Lax`;

      window.localStorage.setItem(
        'bom_pending_google_login',
        JSON.stringify({
          email: matchedUser.email,
          fullName: matchedUser.fullName,
          role: matchedUser.role,
        })
      );

      router.push('/');
      router.refresh();
    } catch (err) {
      setCredLoading(false);
      setErrorMsg(`שגיאה באימות המשתמש: ${String(err)}`);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-6"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-8 space-y-5 text-right">
        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
            ⚙️
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              BOM Configurator
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              קונפיגורטור מוצר וניהול עץ מוצר (BOM) לפי דרישת לקוח
            </p>
          </div>
        </div>

        {/* Prominent Error Message Alert */}
        {errorMsg && (
          <div className="bg-red-50 border-2 border-red-400 text-red-900 text-xs rounded-xl p-3.5 font-bold flex items-start gap-2 shadow-sm">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1 leading-relaxed">
              <span className="block text-red-800 font-extrabold">התחברות נכשלה:</span>
              <span className="font-normal text-red-700">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Username & Password Login Form (for existing / admin-created users only) */}
        <form onSubmit={handleUsernamePasswordLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              שם משתמש (למשל: <span className="font-mono">Shalom.kopla</span>)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="FirstName.LastName"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-left bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-left bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={credLoading || loading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {credLoading ? 'מאמת פרטי התחברות...' : 'התחבר עם שם משתמש וסיסמה'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-slate-400 text-xs font-semibold">
            או התחברות / הרשמה ראשונית
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Primary Supabase Google OAuth Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading || credLoading}
            onClick={handleGoogleOAuthLogin}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm border-2 border-slate-300 shadow-sm flex items-center justify-center gap-3 transition disabled:opacity-50 hover:border-blue-500 cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">
              G
            </span>
            <span>
              {loading
                ? 'מעביר להתחברות Google...'
                : 'התחבר באמצעות חשבון Google'}
            </span>
          </button>

          {/* Role & Account Creation Policy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>🔐</span>
              <span>מדיניות פתיחת חשבון והרשאות:</span>
            </div>
            <p className="text-blue-800 leading-relaxed">
              פתיחת חשבון חדש למשתמשים עצמאיים מתאפשרת <strong>אך ורק באמצעות התחברות עם Google</strong> (מוגדר אוטומטית כ<strong>&quot;צופה&quot;</strong>). משתמשים ללא חשבון Google מוקמים ע&quot;י מנהל המערכת בלבד.
            </p>
          </div>

          <div className="text-center text-[11px] text-slate-400">
            {isSupabaseEnvConfigured()
              ? '🟢 מחובר ל-Supabase Auth'
              : 'מצב תצוגה מקומית'}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
          טוען עמוד התחברות...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
