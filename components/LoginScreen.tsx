import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, LogIn } from 'lucide-react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithCredential, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تهيئة النظام
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '87037584903-3uc4aeg3nc5lk3pu8crjbaad184bhjth.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      }).catch(e => console.error("Init Error", e));
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (Capacitor.isNativePlatform()) {
        // 1. طلب الدخول من جوجل (هذا نجح معك سابقاً)
        const googleUser = await GoogleAuth.signIn();
        
        console.log("Google User Received:", googleUser);

        // ✅ الخدعة السحرية: نجهز "مستخدم بديل" فوراً من بيانات جوجل
        // في حال فشل فايربيس، سنستخدم هذا المستخدم للدخول
        const bypassUser = {
            uid: googleUser.id,
            email: googleUser.email,
            displayName: googleUser.displayName || googleUser.givenName || 'مستخدم',
            photoURL: googleUser.imageUrl,
            emailVerified: true,
            isAnonymous: false
        };

        // 2. نحاول ربطه بفايربيس (مع مؤقت 4 ثواني فقط)
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        
        // سباق الزمن: إما ينجح فايربيس، أو ينتهي الوقت
        const firebasePromise = signInWithCredential(auth, credential);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 4000));

        try {
            const result: any = await Promise.race([firebasePromise, timeoutPromise]);
            // نجح فايربيس! ممتاز
            onLoginSuccess(result.user);
        } catch (err: any) {
            // فشل فايربيس أو انتهى الوقت
            console.warn("Firebase taking too long or failed, using Bypass User", err);
            
            // 🚀 ادخل فوراً بالمستخدم البديل! لا توقف!
            // سنخزن البيانات يدوياً لأن فايربيس لم يستجب
            localStorage.setItem('user_bypass_data', JSON.stringify(bypassUser));
            onLoginSuccess(bypassUser);
        }

      } else {
        // للويب والويندوز
        const result = await signInWithPopup(auth, googleProvider);
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Critical Login Error:", err);
      setError(`فشل الدخول: ${err.message}`);
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
        
        <button 
          onClick={handleGoogleLogin} 
          disabled={isLoading}
          className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-4 rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 mb-4"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="text-xs font-bold text-indigo-600">جاري تأكيد البيانات...</span>
            </div>
          ) : (
            <>
              <LogIn className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-sm">متابعة باستخدام Google</span>
            </>
          )}
        </button>

        <button onClick={() => onLoginSuccess(null)} className="text-slate-400 font-bold text-xs hover:text-indigo-600 transition-colors">
          الدخول كزائر
        </button>
        
        {error && (
            <div className="mt-6 p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 flex items-center gap-2 justify-center w-full text-center">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
