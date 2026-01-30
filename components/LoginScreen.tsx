import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { auth, googleProvider, signInWithCredential, GoogleAuthProvider } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ هذا هو الإصلاح السحري: تهيئة الإضافة عند فتح الشاشة
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (Capacitor.isNativePlatform()) {
        // --- للموبايل (آيفون) ---
        // 1. طلب الدخول
        const googleUser = await GoogleAuth.signIn();
        
        // 2. إنشاء بيانات الاعتماد لفايربيس
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        
        // 3. الدخول
        const result = await signInWithCredential(auth, credential);
        onLoginSuccess(result.user);
      } else {
        // --- للويندوز/الويب ---
        const result = await signInWithPopup(auth, googleProvider);
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err?.message?.includes('cancelled')) {
        setError(null);
      } else {
        setError("تعذر تسجيل الدخول. يرجى المحاولة مجدداً.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-[#1e3a8a] rounded-b-[40%] z-0 scale-x-150" />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-8 mt-12">
           {/* شعار بسيط */}
           <div className="text-4xl font-black text-[#1e3a8a]">R</div>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">تسجيل الدخول</h2>
        <p className="text-gray-500 text-sm font-bold mb-10">تطبيق راصد</p>

        <button 
          onClick={handleGoogleLogin} 
          disabled={isLoading}
          className="w-full max-w-sm bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-700 py-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 mb-4"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          ) : (
            <span className="font-bold">دخول عبر Google</span>
          )}
        </button>

        <button onClick={() => onLoginSuccess(null)} className="text-gray-400 font-bold text-xs mt-4">
          الدخول كزائر
        </button>
        {error && <p className="text-rose-500 text-xs font-bold mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default LoginScreen;
