import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithCredential, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // التأكد من تهيئة الإضافة
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize().catch(e => console.error("Plugin Init Failed:", e));
    }
    
    // التقاط العائدين من الويب (Redirect)
    getRedirectResult(auth).then((result) => {
        if (result) onLoginSuccess(result.user);
    }).catch(e => console.error(e));
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    console.log("Starting Login Process...");

    try {
      if (Capacitor.isNativePlatform()) {
        
        // ⚡️ حيلة ذكية: نحاول استخدام الإضافة الأصلية، لكن نضع لها وقتاً محدداً
        // إذا لم تفتح خلال 3 ثواني، ننتقل فوراً لطريقة الويب
        const nativePromise = GoogleAuth.signIn();
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("TIMEOUT")), 3000)
        );

        try {
            // سباق بين الإضافة الأصلية والمؤقت
            const googleUser: any = await Promise.race([nativePromise, timeoutPromise]);
            
            // إذا نجحت الأصلية
            const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
            const result = await signInWithCredential(auth, credential);
            onLoginSuccess(result.user);

        } catch (raceError: any) {
            if (raceError.message === "TIMEOUT") {
                console.log("Native plugin stuck! Switching to Web Redirect...");
                // 🌐 الخطة البديلة: الويب (مضمونة الفتح)
                await signInWithRedirect(auth, googleProvider);
            } else {
                throw raceError;
            }
        }

      } else {
        // للكمبيوتر
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      // تجربة أخيرة: إذا فشل كل شيء، جرب الويب مرة أخرى
      if (Capacitor.isNativePlatform()) {
          try {
             await signInWithRedirect(auth, googleProvider);
             return;
          } catch(e) {}
      }
      setError("حدث خطأ في الدخول. حاول مرة أخرى.");
      setIsLoading(false);
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
        <p className="text-slate-400 text-xs font-bold mb-12">تطبيق راصد</p>
        
        <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-4 rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 mb-4">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> : <span className="font-bold text-sm">متابعة باستخدام Google</span>}
        </button>
        
        <button onClick={() => onLoginSuccess(null)} className="text-slate-400 font-bold text-xs hover:text-indigo-600 transition-colors">الدخول كزائر</button>
        
        {error && <div className="mt-6 p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 flex gap-2 justify-center w-full"><AlertTriangle className="w-4 h-4" />{error}</div>}
      </div>
    </div>
  );
};

export default LoginScreen;
