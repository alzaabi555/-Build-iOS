import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// ✅ تصحيح 1: استيراد auth و provider فقط من ملفك المحلي
import { auth, googleProvider } from '../services/firebase';

// ✅ تصحيح 2: استيراد الدوال الناقصة من المكتبة الأصلية (هذا كان سبب توقف التطبيق)
import { signInWithPopup, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تهيئة جوجل
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
        // 📱 كود الموبايل
        const googleUser = await GoogleAuth.signIn();
        
        // تحويل التوكن
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        
        // ✅ استخدام الدالة المستوردة بشكل صحيح الآن
        const result = await signInWithCredential(auth, credential);
        onLoginSuccess(result.user);
      } else {
        // 💻 كود الويب
        const result = await signInWithPopup(auth, googleProvider);
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      // عرض تنبيه بالخطأ للمساعدة في التشخيص
      if (err?.message && !err.message.includes('cancelled')) {
        setError(`فشل الدخول: ${err.message}`);
        // alert(`Debug Error: ${err.message}`); // يمكن تفعيل هذا السطر إذا أردت رؤية الخطأ على الشاشة
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* خلفية زرقاء علوية */}
      <div className="absolute top-0 left-0 right-0 h-[35%] bg-[#1e3a8a] rounded-b-[50%] z-0 shadow-lg scale-x-125" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        
        {/* الشعار */}
        <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 mt-10">
           <span className="text-5xl font-black text-[#1e3a8a]">R</span>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-2">تسجيل الدخول</h2>
        <p className="text-slate-400 text-xs font-bold mb-12">تطبيق راصد - الإصدار التعليمي</p>

        {/* زر جوجل */}
        <button 
          onClick={handleGoogleLogin} 
          disabled={isLoading}
          className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-4 rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 mb-4"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          ) : (
            <>
              {/* أيقونة جوجل SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span className="font-bold text-sm">متابعة باستخدام Google</span>
            </>
          )}
        </button>

        <button onClick={() => onLoginSuccess(null)} className="text-slate-400 font-bold text-xs hover:text-indigo-600 transition-colors">
          الدخول كزائر (بدون مزامنة)
        </button>

        {error && (
          <div className="mt-6 p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 text-center w-full">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
