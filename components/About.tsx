import React, { useState, useEffect } from 'react';
import { Users, Phone } from 'lucide-react';
import BrandLogo from './BrandLogo';

const About: React.FC = () => {
  const [isRamadan, setIsRamadan] = useState(false);

  useEffect(() => {
      try {
          const todayDate = new Date();
          const hijriFormatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' });
          const parts = hijriFormatter.formatToParts(todayDate);
          const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
          if (hMonth === 9) {
              setIsRamadan(true);
          }
      } catch(e) {
          console.error("Hijri Date parsing skipped.");
      }
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center min-h-full p-6 animate-in fade-in zoom-in duration-500 relative z-10 transition-colors ${isRamadan ? 'text-white' : 'text-slate-900'}`}>
      
      {/* Logo Container */}
      <div className={`w-40 h-40 rounded-[3rem] shadow-2xl flex items-center justify-center mb-8 border p-4 relative group hover:scale-105 transition-all select-none backdrop-blur-xl ${isRamadan ? 'bg-white/10 border-white/20' : 'bg-white border-white/20'}`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/50 to-purple-50/50 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <BrandLogo className="w-full h-full relative z-10" showText={false} />
      </div>
      
      <h1 className={`text-5xl font-black mb-2 tracking-tighter transition-colors ${isRamadan ? 'text-white' : 'text-slate-800'}`}>تطبيق راصد</h1>
      <p className={`px-6 py-2 rounded-full font-black text-xs mb-10 border-none shadow-sm backdrop-blur-md transition-colors ${isRamadan ? 'text-indigo-200 bg-white/10' : 'text-slate-500 bg-white'}`}>V 3.8.8 • الإصدار الملكي</p>
      
      <div className={`border rounded-[3rem] p-10 max-w-md w-full text-center transition-all duration-500 ${isRamadan ? 'bg-[#0f172a]/60 backdrop-blur-2xl border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white/80 backdrop-blur-xl border-white/20 shadow-xl'}`}>
          <h2 className={`text-xl font-black mb-8 relative inline-block transition-colors ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
              فريق العمل
              <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-1.5 rounded-full opacity-80 ${isRamadan ? 'bg-amber-400' : 'bg-indigo-500'}`}></div>
          </h2>
          
          <div className="flex flex-col gap-4">
              {/* بطاقة المصمم */}
              <div className={`flex items-center gap-5 p-5 rounded-[2rem] transition-transform duration-300 hover:-translate-y-1 border shadow-sm backdrop-blur-md ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm shrink-0 border transition-colors ${isRamadan ? 'bg-indigo-500/30 text-indigo-300 border-indigo-400/30' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                      <Users className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                      <p className={`text-[10px] font-black mb-1 uppercase tracking-wider transition-colors ${isRamadan ? 'text-indigo-200/70' : 'text-slate-400'}`}>إعداد وتصميم</p>
                      <h3 className={`text-lg font-black transition-colors ${isRamadan ? 'text-white' : 'text-slate-800'}`}>أ. محمد درويش الزعابي</h3>
                  </div>
              </div>

              {/* بطاقة الدعم الفني */}
              <div className={`flex items-center gap-5 p-5 rounded-[2rem] transition-transform duration-300 hover:-translate-y-1 border shadow-sm backdrop-blur-md ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm shrink-0 border transition-colors ${isRamadan ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/30' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      <Phone className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                      <p className={`text-[10px] font-black mb-1 uppercase tracking-wider transition-colors ${isRamadan ? 'text-emerald-200/70' : 'text-slate-400'}`}>للتواصل والدعم الفني</p>
                      <h3 className={`text-lg font-black transition-colors ${isRamadan ? 'text-white' : 'text-slate-800'}`} dir="ltr">98344555</h3>
                  </div>
              </div>
          </div>
          
          <div className={`mt-10 pt-6 border-t ${isRamadan ? 'border-white/10' : 'border-gray-100'}`}>
            <p className={`text-[10px] font-bold leading-relaxed transition-colors ${isRamadan ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                تم تطوير هذا التطبيق لخدمة المعلم العماني وتسهيل المهام اليومية داخل الغرفة الصفية.
            </p>
          </div>
      </div>
      
      <p className={`mt-12 text-[10px] font-bold transition-colors ${isRamadan ? 'text-white/40' : 'text-slate-300'}`}>
          جميع الحقوق محفوظة © {new Date().getFullYear()}
      </p>
    </div>
  );
};

export default About;
