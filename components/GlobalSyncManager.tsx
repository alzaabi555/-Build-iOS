import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CloudSync, Users, Database, 
  RefreshCw, CheckCircle2, X, AlertCircle, ShieldCheck
} from 'lucide-react';

// 🌐 رابط السيرفر الخاص بك (لإرسال البيانات بضغطة واحدة)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec";

const GlobalSyncManager: React.FC = () => {
  const { students, dir } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // 🚀 دالة المزامنة الشاملة (الزر السحري)
  const handleMasterSync = async () => {
    setSyncState('syncing');
    setSyncMessage('جاري رفع البيانات للسحابة...');

    try {
      // نجمع كل بيانات الطلاب (الدرجات، السلوك، الحضور) ونرسلها دفعة واحدة
      const payload = {
        students: students,
        className: 'الكل' // ليتم تحديث جميع الفصول
      };

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        setSyncState('success');
        setSyncMessage('تمت المزامنة بنجاح! التطبيقات محدثة الآن.');
        // إغلاق النافذة تلقائياً بعد 3 ثوانٍ من النجاح
        setTimeout(() => {
          setIsOpen(false);
          setSyncState('idle');
        }, 3000);
      } else {
        throw new Error(result.error || 'حدث خطأ في السيرفر');
      }
    } catch (error) {
      console.error(error);
      setSyncState('error');
      setSyncMessage('فشل الاتصال! تأكد من الإنترنت وحاول مجدداً.');
      setTimeout(() => setSyncState('idle'), 4000);
    }
  };

  return (
    <div className={`fixed z-[99999] transition-all duration-500 ${dir === 'rtl' ? 'left-6' : 'right-6'} bottom-28 md:bottom-10`}>
      
      {/* ☁️ القائمة المنبثقة (مركز القيادة) */}
      {isOpen && (
        <div className="absolute bottom-16 mb-4 w-72 bg-[#0f172a]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-5 fade-in duration-300 transform origin-bottom">
          
          <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <CloudSync className="w-5 h-5 text-cyan-400" />
              مركز المزامنة الشامل
            </h3>
            <button onClick={() => setIsOpen(false)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {syncState === 'idle' && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 mb-4 leading-relaxed">
                بضغطة واحدة، قم برفع درجات وسلوك الطلاب ليتم تحديث تطبيق (ولي الأمر) وتطبيق (الطالب) في نفس اللحظة.
              </p>
              
              <button 
                onClick={handleMasterSync}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all active:scale-95 border border-cyan-400/30"
              >
                <RefreshCw className="w-5 h-5" />
                <span>مزامنة الكل الآن</span>
              </button>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 opacity-70">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-300">الطلاب والأولياء</span>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 opacity-70">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-[9px] font-bold text-slate-300">الدرجات والسلوك</span>
                </div>
              </div>
            </div>
          )}

          {/* حالات التحميل والنجاح والخطأ */}
          {syncState === 'syncing' && (
            <div className="py-8 flex flex-col items-center justify-center animate-in fade-in">
              <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
              <p className="text-xs font-black text-cyan-100">{syncMessage}</p>
            </div>
          )}

          {syncState === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center animate-in zoom-in">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-xs font-black text-emerald-100 text-center">{syncMessage}</p>
            </div>
          )}

          {syncState === 'error' && (
            <div className="py-8 flex flex-col items-center justify-center animate-in zoom-in">
               <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                <AlertCircle className="w-8 h-8 text-rose-400" />
              </div>
              <p className="text-xs font-black text-rose-100 text-center">{syncMessage}</p>
              <button onClick={() => setSyncState('idle')} className="mt-4 text-[10px] font-bold text-slate-400 underline">حاول مرة أخرى</button>
            </div>
          )}
        </div>
      )}

      {/* 🌟 الزر العائم الرئيسي (FAB) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all duration-300 border backdrop-blur-md active:scale-90 ${
          isOpen 
            ? 'bg-slate-800 border-slate-600 rotate-180' 
            : 'bg-gradient-to-tr from-cyan-600 to-blue-500 border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:-translate-y-1'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-slate-300" />
        ) : (
          <CloudSync className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
};

export default GlobalSyncManager;
