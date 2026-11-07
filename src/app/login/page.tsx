'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseEnvConfigured } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoName, setDemoName] = useState('');

  const handleGoogleOAuthLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    const supabase = createClient();

    if (!supabase) {
      setLoading(false);
      setErrorMsg(
        'משתני הסביבה של Supabase טרם הוגדרו (.env.local). ניתן להתחבר במצב הדגמה למטה או להגדיר NEXT_PUBLIC_SUPABASE_URL ו-NEXT_PUBLIC_SUPABASE_ANON_KEY.'
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
      setErrorMsg(error.message);
    }
  };

  const handleDemoGoogleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoEmail.trim() || !demoEmail.includes('@')) {
      setErrorMsg('נא להזין כתובת אימייל תקנית של חשבון Google.');
      return;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'bom_pending_google_login',
        JSON.stringify({
          email: demoEmail.trim().toLowerCase(),
          fullName: demoName.trim() || demoEmail.trim().split('@')[0],
        })
      );
    }
    router.push('/');
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-6"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-8 space-y-6 text-right">
        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
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

        {/* Role policy notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <span>🔐</span>
            <span>מדיניות הרשאות והתחברות (Google Sign-In):</span>
          </div>
          <p className="text-blue-800 leading-relaxed">
            הכניסה למערכת מתבצעת באמצעות <strong>חשבון Google</strong>. משתמש חדש שנכנס לראשונה מוגדר אוטומטית בתפקיד{' '}
            <strong>&quot;צופה&quot; (Viewer)</strong> עד שמנהל המערכת מעדכן את תפקידו במסך ניהול המשתמשים.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-800 text-xs rounded-xl p-3 font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Primary Supabase Google OAuth Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleOAuthLogin}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm border-2 border-slate-300 shadow-sm flex items-center justify-center gap-3 transition disabled:opacity-50"
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

          <div className="text-center text-[11px] text-slate-400">
            {isSupabaseEnvConfigured()
              ? '🟢 מחובר ל-Supabase Auth (OAuth 2.0 PKCE)'
              : 'מצב תצוגה מקומית (ניתן להתחבר גם ללא הגדרת מפתחות Supabase)'}
          </div>
        </div>

        {/* Quick Demo Google Sign-In */}
        <form
          onSubmit={handleDemoGoogleLogin}
          className="pt-4 border-t border-slate-200 space-y-3 text-xs"
        >
          <div className="font-bold text-slate-700">
            בדיקת כניסת משתמש Google (הדמיה מקומית מהירה):
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              כתובת Gmail / Google *
            </label>
            <input
              type="email"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              placeholder="new.user@gmail.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              שם מלא
            </label>
            <input
              type="text"
              value={demoName}
              onChange={(e) => setDemoName(e.target.value)}
              placeholder="ישראל ישראלי"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow"
          >
            היכנס עם חשבון Google זה (יוגדר כ&quot;צופה&quot; אם חדש) ⬅
          </button>
        </form>
      </div>
    </main>
  );
}

