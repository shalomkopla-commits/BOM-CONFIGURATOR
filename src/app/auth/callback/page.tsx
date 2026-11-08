'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<string>('מאמת התחברות ומעביר למערכת...');

  useEffect(() => {
    async function handleAuth() {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorParam = params.get('error');
      const errorDesc = params.get('error_description');

      if (errorParam) {
        const reason = encodeURIComponent(errorDesc || errorParam);
        window.location.href = `/login?error=${reason}`;
        return;
      }

      if (code && supabase) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            window.location.href = `/login?error=${encodeURIComponent(exchangeError.message)}`;
            return;
          }
        } catch (err: any) {
          console.warn('OAuth exchange error:', err);
        }
      }

      window.location.href = '/';
    }

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-100 mb-2">התחברות באמצעות Google</h2>
        <p className="text-xs text-slate-400">{status}</p>
      </div>
    </div>
  );
}
