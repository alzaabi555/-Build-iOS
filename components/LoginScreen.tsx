
import React, { useState } from 'react';
import { ShieldCheck, Smartphone, Loader2, Globe } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { signInWithGoogle } from '../services/firebase';

interface LoginScreenProps {
  onLoginSuccess: (user: any | null) => void; // null means guest/offline mode
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    onLoginSuccess(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F2F7] relative overflow-hidden">
        {/* الخلفية الجمالية المتحركة */}
        <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-rose-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{animationDelay: '1s'}}></div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
            
            {/* الشعار والهوية */}
            <div className="flex flex-col items-center mb-12 animate-in fade-in zoom-in duration-700">
                <div className="w-28 h-28 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white to-slate-100 opacity-50"></div>
                    <BrandLogo className="w-16 h-16 relative z-10" showText={false} />
                </div>
                <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">راصد</h1>
                <p className="text-sm font-bold text-slate-500 tracking-wide">الإدارة المدرسية الذكية</p>
            </div>

            {/* أزرار الإجراءات */}
            <div className="w-full max-w-sm space-y-4 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                
                {/* زر جوجل */}
                <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full h-14 bg-white hover:bg-gray-50 active:scale-95 transition-all rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    ) : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            <span className="text-base font-bold text-slate-800">متابعة باستخدام Google</span>
                        </>
                    )}
                </button>

                {/* فاصل */}
                <div className="flex items-center gap-4 px-2">
                    <div className="h-px bg-slate-300 flex-1 opacity-50"></div>
                    <span className="text-xs font-bold text-slate-400">أو</span>
                    <div className="h-px bg-slate-300 flex-1 opacity-50"></div>
                </div>

                {/* زر الدخول المحلي */}
                <button 
                    onClick={handleGuestMode}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 text-white"
                >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-base font-bold">الاستمرار محلياً (بدون نت)</span>
                </button>

                {error && (
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold text-center border border-rose-100 animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}
            </div>
        </div>

        {/* التذييل */}
        <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 bg-white/50 backdrop-blur-md py-2 px-4 rounded-full inline-flex border border-white/20 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>بياناتك محفوظة بأمان تام ومشفرة على جهازك</span>
            </div>
        </div>
    </div>
  );
};

export default LoginScreen;
