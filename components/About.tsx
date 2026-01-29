import React, { useEffect, useState } from 'react';
import { Users, Phone, ShieldCheck, Heart } from 'lucide-react';
import BrandLogo from './BrandLogo';

const About: React.FC = () => {
  // 1. حالة لتخزين رقم الإصدار
  const [appVersion, setAppVersion] = useState('3.6.0'); // قيمة افتراضية

  // 2. جلب الإصدار الحقيقي عند فتح الصفحة
  useEffect(() => {
    // التأكد من وجود الجسر (window.electron)
    if (window.electron && window.electron.getAppVersion) {
      window.electron.getAppVersion().then((ver: string) => {
        setAppVersion(ver);
      });
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans overflow-hidden relative">
      
      {/* ================= Header (Blue & Curved) ================= */}
      <div className="bg-[#1e3a8a] text-white pt-12 pb-24 px-6 rounded-b-[3rem] relative shadow-xl z-10 flex flex-col items-center justify-center overflow-hidden">
          
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

          {/* Logo Container */}
          <div className="w-32 h-32 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mb-6 p-4 relative z-10 border-4 border-blue-400/30">
              <BrandLogo className="w-full h-full" showText={false} />
          </div>

          <h1 className="text-3xl font-black mb-2 tracking-wide text-white drop-shadow-md">تطبيق راصد</h1>
          
          {/* ✅ 3. هنا تم وضع المتغير الديناميكي بدلاً من الرقم الثابت */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full text-blue-50 font-black text-xs shadow-sm" dir="ltr">
              V {appVersion} • الإصدار الملكي
          </div>
      </div>

      {/* ================= Content (Floating Card) ================= */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 -mt-16 relative z-20 pb-20">
          
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 text-center animate-in slide-in-from-bottom-8 duration-500">
              
              <div className="flex items-center justify-center gap-2 mb-8">
                  <div className="h-1 w-12 bg-gray-200 rounded-full"></div>
              </div>

              <h2 className="text-lg font-black text-slate-800 mb-8 relative inline-block">
                  فريق العمل
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#1e3a8a] rounded-full"></div>
              </h2>
              
              <div className="flex flex-col gap-4">
                  {/* Developer Card */}
                  <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-indigo-100 transition-colors shadow-sm group">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#1e3a8a] shadow-sm shrink-0 border border-slate-100 group-hover:scale-110 transition-transform">
                          <Users className="w-7 h-7" />
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">إعداد وتصميم</p>
                          <h3 className="text-base font-black text-slate-900">أ. محمد درويش الزعابي</h3>
                      </div>
                  </div>

                  {/* Contact Card */}
                  <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-emerald-100 transition-colors shadow-sm group">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0 border border-slate-100 group-hover:scale-110 transition-transform">
                          <Phone className="w-7 h-7" />
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">للتواصل والدعم الفني</p>
                          <h3 className="text-base font-black text-slate-900 font-mono" dir="ltr">98344555</h3>
                      </div>
                  </div>
              </div>
              
              <div className="mt-10 pt-6 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-bold leading-relaxed flex flex-col items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-slate-300" />
                      تم تطوير هذا التطبيق لخدمة المعلم العماني وتسهيل المهام اليومية داخل الغرفة الصفية.
                  </p>
              </div>
          </div>

          <div className="text-center mt-8 mb-4">
              <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                 هديتي لكم يا معلميني الاعزاء  <Heart className="w-3 h-3 text-rose-400 fill-rose-400" /> 
              </p>
              <p className="text-[10px] font-bold text-slate-300 mt-1">
                  alzaabi555 جميع الحقوق محفوظة © {new Date().getFullYear()}
              </p>
          </div>

      </div>
    </div>
  );
};

export default About;
