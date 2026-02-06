
import React from 'react';
import { ShieldCheck, Smartphone } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface LoginScreenProps {
  onLoginSuccess: (user: any | null) => void; 
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  
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
                
                {/* زر الدخول المحلي (الخيار الوحيد الآن) */}
                <button 
                    onClick={handleGuestMode}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 text-white"
                >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-base font-bold">ابدأ الاستخدام (محلياً)</span>
                </button>

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
