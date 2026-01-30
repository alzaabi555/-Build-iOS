import React, { useEffect, useRef, useState } from 'react';
import { Loader2, User } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { signInWithGoogle, auth } from '../services/firebase'; // 👈 تأكد من استيراد auth
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'; // 👈 استيراد دوال فايربيس
import { Capacitor } from '@capacitor/core';

interface LoginScreenProps {
  onLoginSuccess: (user: any | null) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isElectron = typeof window !== 'undefined' && !!(window as any)?.electron;
  const completedRef = useRef(false);

  // دالة لتبديل الكود بالتوكن (خاصة بالويندوز)
  const exchangeCodeForCredential = async (code: string) => {
    try {
      // 1. طلب تبديل الكود من جوجل
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', '87037584903-3uc4aeg3nc5lk3pu8crjbaad184bhjth.apps.googleusercontent.com');
      params.append('redirect_uri', 'com.googleusercontent.apps.87037584903-3uc4aeg3nc5lk3pu8crjbaad184bhjth:/oauth');
      params.append('grant_type', 'authorization_code');

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error_description || 'فشل تبديل الكود');

      // 2. إنشاء اعتماد لفايربيس
      // نستخدم id_token لأنه الأهم للمصادقة
      const credential = GoogleAuthProvider.credential(data.id_token, data.access_token);

      // 3. تسجيل الدخول الفعلي في فايربيس
      return await signInWithCredential(auth, credential);

    } catch (err) {
      console.error('Exchange Error:', err);
      throw err;
    }
  };

  // ---------------------------------------------------------
  // 🎧 الاستماع لنتائج Electron
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isElectron) return;

    const api = (window as any)?.electron;
    if (!api) return;

    const unsubCode = api.onGoogleAuthCode?.(async (data: { code: string; state?: string }) => {
        if (completedRef.current) return;
        completedRef.current = true;
        
        try {
          // 👇 هنا السحر: لا نكتفي بالكود، بل نسجل دخول في فايربيس
          const userCredential = await exchangeCodeForCredential(data.code);
          
          setIsLoading(false);
          // نرسل مستخدم فايربيس الحقيقي للواجهة
          onLoginSuccess(userCredential.user);
          
        } catch (err) {
          console.error(err);
          setError('فشل الاتصال بقاعدة البيانات (Firebase Error).');
          setIsLoading(false);
        }
      }) ?? (() => {});

    const unsubErr = api.onGoogleAuthError?.((data: { error: string }) => {
        if (completedRef.current) return;
        completedRef.current = true;
        setIsLoading(false);
        setError(data?.error || 'فشل تسجيل الدخول.');
      }) ?? (() => {});

    return () => {
      try { unsubCode(); } catch {}
      try { unsubErr(); } catch {}
    };
  }, [isElectron, onLoginSuccess]);

  // ---------------------------------------------------------
  // 🚀 دالة الزر
  // ---------------------------------------------------------
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    completedRef.current = false;

    try {
      if (isElectron) {
        const api = (window as any)?.electron;
        if (!api?.startGoogleLogin) throw new Error('Electron bridge غير جاهز');

        await api.startGoogleLogin({
          clientId: '87037584903-3uc4aeg3nc5lk3pu8crjbaad184bhjth.apps.googleusercontent.com',
          redirectUri: 'com.googleusercontent.apps.87037584903-3uc4aeg3nc5lk3pu8crjbaad184bhjth:/oauth', 
          scopes: ['openid', 'email', 'profile'],
          state: String(Date.now()),
        });
        return; 
      }

      if (Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.initialize({
            clientId: '87037584903-lavg5se9f7mfkuvhnqbj53skmorord0u.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
        });
        const googleUser = await GoogleAuth.signIn();
        // للموبايل أيضاً نحتاج ربط مع فايربيس (لكن خطوة لاحقة، ركز في الويندوز الآن)
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        onLoginSuccess(userCredential.user);
        
        setIsLoading(false);
        return;
      }

      const user = await signInWithGoogle();
      onLoginSuccess(user);
      setIsLoading(false);

    } catch (err: any) {
      console.error(err);
      setError('فشل تسجيل الدخول. حاول مرة أخرى.');
      setIsLoading(false);
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
