'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isSupabaseEnvConfigured } from '@/utils/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
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
      setErrorMsg(`התחברות נכשלה: ${error.message}`);
    }
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

        {/* Prominent Error Message Alert */}
        {errorMsg && (
          <div className="bg-red-50 border-2 border-red-400 text-red-900 text-xs rounded-xl p-3.5 font-bold flex items-start gap-2 shadow-sm animate-pulse">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1 leading-relaxed">
              <span className="block text-red-800 font-extrabold">התחברות נכשלה:</span>
              <span className="font-normal text-red-700">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Primary Supabase Google OAuth Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleOAuthLogin}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm border-2 border-slate-300 shadow-sm flex items-center justify-center gap-3 transition disabled:opacity-50 hover:border-blue-500"
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
