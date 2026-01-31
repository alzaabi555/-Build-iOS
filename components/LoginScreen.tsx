import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    // 🛑 مؤقت أمان: إذا تأخر الدخول أكثر من 8 ثواني، نوقف التحميل
    const timeout = setTimeout(() => {
        setIsLoading(false);
        setError("استغرق الدخول وقتاً طويلاً. يرجى التحقق من الإنترنت والمحاولة مجدداً.");
    }, 8000);

    try {
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        clearTimeout(timeout); // إلغاء المؤقت إذا نجح الدخول
        onLoginSuccess(result.user);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        clearTimeout(timeout);
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      console.error("Login Error:", err);
      if (err?.message && !err.message.includes('cancelled')) {
        setError("تعذر تسجيل الدخول. حاول مرة أخرى.");
      }
    } finally {
      // لا نوقف التحميل هنا فوراً لأن onLoginSuccess قد تحتاج وقتاً للانتقال، نتركه للمؤقت أو النجاح
      if (!isLoading) setIsLoading(false); 
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="absolute top-0 left-0 right-0 h-[35%] bg-[#1e3a8a] rounded-b-[50%] z-0 shadow-lg scale-x-125" />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 mt-10">
           <span className="text-5xl font-black text-[#1e3a8a]">R</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">تسجيل الدخول</h2>
        <p className="text-slate-400 text-xs font-bold mb-12">تطبيق راصد - الإصدار التعليمي</p>
        <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-4 rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 mb-4">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> : <span className="font-bold text-sm">متابعة باستخدام Google</span>}
        </button>
        <button onClick={() => onLoginSuccess(null)} className="text-slate-400 font-bold text-xs hover:text-indigo-600 transition-colors">الدخول كزائر</button>
        {error && <div className="mt-6 p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 text-center w-full">{error}</div>}
      </div>
    </div>
  );
};

export default LoginScreen;
