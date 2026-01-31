import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { auth } from '../services/firebase';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  // ✅ التهيئة الإجبارية (Hardcoded Initialization)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '87037584903-3uc4aeg3nc5lk3pu8crjbaad184bhjth.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      }).then(() => console.log('Google Auth Initialized Manually'))
        .catch(e => console.error('Init Failed', e));
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setShowReset(false);

    // مؤقت لإظهار زر الطوارئ إذا علق
    const timer = setTimeout(() => setShowReset(true), 5000);

    try {
      if (Capacitor.isNativePlatform()) {
        // محاولة الدخول
        const googleUser = await GoogleAuth.signIn();
        
        // إذا نجح، نلغي المؤقت
        clearTimeout(timer);
        
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        onLoginSuccess(result.user);
      } else {
         setError("هذه النسخة مخصصة للآيفون فقط");
         setIsLoading(false);
      }
    } catch (err: any) {
      clearTimeout(timer);
      console.error("Login Error:", err);
      setError(err.message || "فشل الدخول");
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
        
        {/* زر الطوارئ: يظهر فقط إذا تأخر التحميل */}
        {showReset && isLoading && (
            <button onClick={() => setIsLoading(false)} className="mb-4 flex items-center gap-2 text-rose-500 text-xs font-bold animate-pulse">
                <RefreshCw className="w-4 h-4" /> إلغاء وإعادة المحاولة
            </button>
        )}

        <button onClick={() => onLoginSuccess(null)} className="text-slate-400 font-bold text-xs hover:text-indigo-600 transition-colors">الدخول كزائر</button>
        
        {error && <div className="mt-6 p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 flex gap-2 justify-center w-full"><AlertTriangle className="w-4 h-4" />{error}</div>}
      </div>
    </div>
  );
};

export default LoginScreen;
