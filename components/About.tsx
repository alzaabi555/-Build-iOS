
import React from 'react';
import { Users, Phone } from 'lucide-react';
import BrandLogo from './BrandLogo';

const About: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 text-slate-900 animate-in fade-in zoom-in duration-500">
      
      {/* Logo Container */}
      <div className="w-40 h-40 glass-heavy rounded-[3rem] shadow-2xl flex items-center justify-center mb-8 border border-white/20 p-4 relative group hover:scale-105 transition-transform select-none bg-white">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/50 to-purple-50/50 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <BrandLogo className="w-full h-full relative z-10" showText={false} />
      </div>
      
      <h1 className="text-5xl font-black mb-2 tracking-tighter text-slate-800">تطبيق راصد</h1>
      <p className="glass-card px-6 py-2 rounded-full text-slate-500 font-black text-xs mb-10 border-none shadow-sm bg-white">V 4.0.2 • الإصدار الملكي</p>
      
      <div className="glass-heavy border border-white/20 rounded-[3rem] p-10 max-w-md w-full text-center shadow-xl bg-white/80 backdrop-blur-xl">
          <h2 className="text-xl font-black text-slate-800 mb-8 relative inline-block">
              فريق العمل
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-indigo-500 rounded-full opacity-80"></div>
          </h2>
          
          <div className="flex flex-col gap-4">
              <div className="flex items-center gap-5 p-5 glass-card rounded-[2rem] hover:bg-gray-50 transition-transform duration-300 hover:-translate-y-1 border border-gray-100 shadow-sm bg-white">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0 border border-indigo-100">
                      <Users className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">إعداد وتصميم</p>
                      <h3 className="text-lg font-black text-slate-800">أ. محمد درويش الزعابي</h3>
                  </div>
              </div>

              <div className="flex items-center gap-5 p-5 glass-card rounded-[2rem] hover:bg-gray-50 transition-transform duration-300 hover:-translate-y-1 border border-gray-100 shadow-sm bg-white">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0 border border-emerald-100">
                      <Phone className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">للتواصل والدعم الفني</p>
                      <h3 className="text-lg font-black text-slate-800" dir="ltr">98344555</h3>
                  </div>
              </div>
          </div>
          
          <div className="mt-10 pt-6 border-t border-gray-100">
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                تم تطوير هذا التطبيق لخدمة المعلم العماني وتسهيل المهام اليومية داخل الغرفة الصفية.
            </p>
          </div>
      </div>
      
      <p className="mt-12 text-[10px] font-bold text-slate-300">
          جميع الحقوق محفوظة © {new Date().getFullYear()}
      </p>
    </div>
  );
};

export default About;
