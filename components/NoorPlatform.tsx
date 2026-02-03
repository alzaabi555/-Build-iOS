import React, { useState, useRef } from 'react';
import { Globe, RefreshCw, ExternalLink, ChevronLeft, ShieldCheck, Lock, RotateCw, AlertCircle } from 'lucide-react';

const NoorPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [key, setKey] = useState(0); 
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const NOOR_URL = "https://lms.moe.gov.om/"; 

  const handleReload = () => {
    setIsLoading(true);
    setKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(NOOR_URL, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans relative animate-in fade-in duration-500">
        
        {/* ================= HEADER ================= */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-6 pt-[env(safe-area-inset-top)] pb-8 transition-all duration-300">
            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-sm">
                        <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-wide flex items-center gap-2">
                            المنصة التعليمية
                            {/* تعديل: لون خلفية صلب وواضح */}
                            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full border border-emerald-400 flex items-center gap-1 shadow-sm">
                                <Lock className="w-3 h-3" /> آمن
                            </span>
                        </h1>
                        <p className="text-[10px] text-blue-100 font-bold opacity-90">بوابة التعليم الإلكتروني (MOE)</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleReload} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all active:scale-95 border border-white/10" title="تحديث الصفحة">
                        <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleOpenExternal} className="bg-white text-[#1e3a8a] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-slate-100 transition-all active:scale-95">
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">فتح خارجي</span>
                    </button>
                </div>
            </div>
        </div>

        {/* ================= CONTENT AREA ================= */}
        <div className="flex-1 h-full pt-[120px] px-4 pb-24 overflow-hidden flex flex-col">
            
            <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden flex flex-col mt-4">
                
                {/* Browser Toolbar - تعديل: نص أغمق */}
                <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-3 px-4">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    </div>
                    <div className="flex-1 bg-white border border-slate-300 rounded-lg py-1.5 px-3 flex items-center gap-2 text-xs text-slate-800 font-bold shadow-sm">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span className="truncate font-mono dir-ltr select-all">{NOOR_URL}</span>
                    </div>
                </div>

                {/* Iframe */}
                <div className="flex-1 relative bg-slate-100 w-full h-full">
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-[#1e3a8a] rounded-full animate-spin mb-4"></div>
                            {/* تعديل: نص التحميل أغمق */}
                            <p className="text-sm font-black text-indigo-900">جاري الاتصال بالمنصة...</p>
                        </div>
                    )}
                    
                    <iframe 
                        key={key}
                        ref={iframeRef}
                        src={NOOR_URL}
                        className="w-full h-full border-none"
                        onLoad={() => setIsLoading(false)}
                        title="Oman Educational Platform"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                    />

                    {/* Fallback Message - تعديل جذري للألوان */}
                    <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none px-4">
                        <div className="inline-flex items-center gap-2 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl border border-amber-700 pointer-events-auto">
                            <AlertCircle className="w-4 h-4 fill-white text-amber-600" />
                            <span>إذا لم تظهر الصفحة، استخدم زر "فتح خارجي" بالأعلى</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Note - تعديل: نص أغمق */}
            <div className="text-center mt-4">
                <p className="text-[10px] text-slate-600 font-black flex items-center justify-center gap-1 opacity-80">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> اتصال مشفر وآمن عبر وزارة التربية والتعليم
                </p>
            </div>
        </div>
    </div>
  );
};

export default NoorPage;
