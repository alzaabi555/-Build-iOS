import React, { useEffect, useRef, useState } from 'react';
import { Loader2, User } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { signInWithGoogle, auth } from '../services/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

interface LoginScreenProps {
  onLoginSuccess: (user: any | null) => void;
}

type ElectronAPI = {
  startGoogleLogin?: (payload: { scopes?: string[]; state?: string }) => Promise<{ ok: boolean; state?: string; redirectUri?: string; error?: string }>;
  exchangeGoogleCode?: (payload: { code: string }) => Promise<{ id_token: string; access_token?: string }>;
  onGoogleAuthCode?: (cb: (data: { code: string; state?: string; url?: string; via?: string }) => void) => () => void;
  onGoogleAuthError?: (cb: (data: { error: string; url?: string; via?: string }) => void) => () => void;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const completedRef = useRef(false);
  const isElectron = typeof window !== 'undefined' && !!(window as any)?.electron;

  useEffect(() => {
    if (!isElectron) return;

    const api: ElectronAPI = (window as any).electron;
    if (!api?.onGoogleAuthCode) return;

    const unsubCode = api.onGoogleAuthCode(async (data) => {
      if (completedRef.current) return;
      completedRef.current = true;

      try {
        if (!api.exchangeGoogleCode) throw new Error('exchangeGoogleCode غير متوفر');
        const token = await api.exchangeGoogleCode({ code: data.code });
        if (!token?.id_token) throw new Error('Missing id_token');

        const credential = GoogleAuthProvider.credential(token.id_token);
        const userCred = await signInWithCredential(auth, credential);

        setIsLoading(false);
        onLoginSuccess(userCred.user);
      } catch (e: any) {
        setIsLoading(false);
        setError(e?.message || 'فشل تسجيل الدخول.');
      }
    });

    const unsubErr =
      api.onGoogleAuthError?.((data) => {
        if (completedRef.current) return;
        completedRef.current = true;
        setIsLoading(false);
        setError(data?.error || 'فشل تسجيل الدخول.');
      }) ?? (() => {});

    return () => {
      try { unsubCode?.(); } catch {}
      try { unsubErr?.(); } catch {}
    };
  }, [isElectron, onLoginSuccess]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    completedRef.current = false;

    try {
      if (isElectron) {
        const api: ElectronAPI = (window as any).electron;
        if (!api?.startGoogleLogin) throw new Error('Electron bridge غير جاهز');

        const res = await api.startGoogleLogin({
          scopes: ['openid', 'email', 'profile'],
          state: String(Date.now()),
        });

        if (!res?.ok) throw new Error(res?.error || 'فشل فتح صفحة تسجيل الدخول');
        return; // انتظر code
      }

      // (اختياري) مسار الموبايل / الويب كما كان عندك
      if (Capacitor.isNativePlatform()) {
        // اتركه كما عندك أو عطّله مؤقتًا
        throw new Error('مسار الموبايل غير مفعّل هنا');
      }

      const user = await signInWithGoogle();
      onLoginSuccess(user);
      setIsLoading(false);
    } catch (e: any) {
      setIsLoading(false);
      setError(e?.message || 'فشل تسجيل الدخول. حاول مرة أخرى.');
    }
  };

  const handleGuestMode = () => onLoginSuccess(null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20">
            <BrandLogo className="w-full h-full" showText={false} />
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-slate-900">
          تسجيل الدخول
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          تطبيق راصد - الإصدار التعليمي
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-bold text-center border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 border border-slate-200 rounded-xl shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M12.0003 20.45c4.648 0 8.563-3.158 9.941-7.548h-9.941v-3.797h15.201c.15.823.23 1.678.23 2.55 0 8.048-5.839 13.797-13.75 13.797-7.614 0-13.797-6.183-13.797-13.797 0-7.614 6.183-13.797 13.797-13.797 3.714 0 7.078 1.35 9.664 3.564l-2.88 2.88c-1.745-1.498-4.018-2.408-6.784-2.408-5.502 0-10.05 4.385-10.05 9.761s4.548 9.761 10.05 9.761z" fill="#4285F4" />
                  </svg>
                  <span>متابعة باستخدام Google</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">أو</span>
              </div>
            </div>

            <button
              onClick={handleGuestMode}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 border border-transparent rounded-xl shadow-sm bg-indigo-50 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-all active:scale-[0.98]"
            >
              <User className="w-5 h-5" />
              الدخول كزائر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
