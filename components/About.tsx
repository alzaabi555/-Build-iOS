import React, { useState } from 'react';
import { Users, Phone, ShieldCheck, Mail, Github } from 'lucide-react';
import BrandLogo from './BrandLogo';

const About: React.FC = () => {
 // 🌙 المستشعر الرمضاني اللحظي (يمنع الوميض تماماً)
  const [isRamadan] = useState(() => {
      try {
          const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' }).formatToParts(new Date());
          return parseInt(parts.find(p => p.type === 'month')?.value || '0') === 9;
      } catch(e) {
          return false;
      }
  });

  return (
    <div className={`flex flex-col items-center min-h-full p-6 pb-20 animate-in fade-in zoom-in duration-500 relative z-10 transition-colors ${isRamadan ? 'text-white' : 'text-slate-900'}`}>
      
      {/* Logo Container */}
      <div className={`w-32 h-32 rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-6 border p-4 relative group hover:scale-105 transition-all select-none backdrop-blur-xl ${isRamadan ? 'bg-white/10 border-white/20' : 'bg-white border-white/20'}`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/50 to-purple-50/50 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <BrandLogo className="w-full h-full relative z-10" showText={false} />
      </div>
      
      <h1 className={`text-4xl font-black mb-1 tracking-tighter transition-colors ${isRamadan ? 'text-white' : 'text-slate-800'}`}>تطبيق راصد</h1>
      <p className={`px-4 py-1 rounded-full font-black text-[10px] mb-8 border-none shadow-sm transition-colors ${isRamadan ? 'text-indigo-200 bg-white/10' : 'text-slate-500 bg-white'}`}>
        V 4.4.1 • الإصدار الرسمي المعتمد
      </p>
      
      <div className="max-w-2xl w-full space-y-6">
          
          {/* قسم الملكية الفكرية والتحذير القانوني */}
          <div className={`border rounded-[2.5rem] p-8 transition-all duration-500 ${isRamadan ? 'bg-[#0f172a]/80 border-white/10 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
              <div className="flex items-center gap-3 mb-6 justify-center">
                  <ShieldCheck className={`w-6 h-6 ${isRamadan ? 'text-amber-400' : 'text-indigo-600'}`} />
                  <h2 className="text-xl font-black">الملكية الفكرية</h2>
              </div>
              
              <div className={`text-right space-y-4 text-sm leading-relaxed ${isRamadan ? 'text-indigo-100/90' : 'text-slate-700'}`}>
                  <p>
                      <strong className={isRamadan ? 'text-amber-300' : 'text-indigo-700'}>حول المطور:</strong><br />
                      تم تطوير هذا العمل بواسطة الأستاذ/ <span className="font-black">محمد درويش الزعابي</span>، انطلاقاً من رؤية تقنية تهدف إلى تمكين المعلم العماني وتيسير المهام الإدارية والتربوية اليومية باستخدام أحدث تقنيات البرمجة.
                  </p>
                  
                  <p>
                      <strong className={isRamadan ? 'text-amber-300' : 'text-indigo-700'}>حقوق الملكية الفكرية:</strong><br />
                      جميع الحقوق محفوظة © 2026. إن <span className="font-black">"تطبيق راصد"</span> بكافة عناصره البرمجية، وواجهاته الرسومية، وأدوات الرصد المبتكرة (خاصة تقنية الربط البرمجي مع البوابة التعليمية) هي ملكية فكرية حصرية للمطور.
                  </p>

                  <div className={`p-5 rounded-2xl border-2 border-dashed ${isRamadan ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-100'}`}>
                      <p className={`font-black mb-2 flex items-center gap-2 ${isRamadan ? 'text-rose-400' : 'text-rose-600'}`}>
                          تحذير قانوني:
                      </p>
                      <ul className={`list-disc list-inside space-y-1 text-xs font-bold ${isRamadan ? 'text-rose-200/80' : 'text-rose-800/80'}`}>
                          <li>إعادة هندسة التطبيق (Reverse Engineering) أو محاولة استخراج الكود المصدري.</li>
                          <li>تقليد التصميم الهوياتي أو استغلال الميزات المبتكرة ونسبها لجهة أخرى.</li>
                          <li>إعادة توزيع التطبيق خارج المتجر الرسمي دون إذن كتابي مسبق.</li>
                      </ul>
                      <p className={`mt-3 text-[10px] italic ${isRamadan ? 'text-rose-300/60' : 'text-rose-500'}`}>
                          أي محاولة لسرقة الفكرة أو تقليد المحتوى البرمجي ستعرض صاحبها للمساءلة القانونية بموجب قوانين حماية الملكية الفكرية وقوانين النشر الرقمي الدولية.
                      </p>
                  </div>
              </div>
          </div>

          {/* قسم فريق العمل والتواصل */}
          <div className={`border rounded-[2.5rem] p-8 transition-all duration-500 ${isRamadan ? 'bg-[#0f172a]/60 border-white/10 shadow-xl' : 'bg-white/80 border-gray-100 shadow-xl'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* بطاقة المصمم */}
                  <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-gray-100'}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isRamadan ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                          <Users size={24} />
                      </div>
                      <div className="text-right">
                          <p className={`text-[9px] font-black opacity-60 ${isRamadan ? 'text-indigo-200' : 'text-slate-500'}`}>إعداد وتصميم</p>
                          <h3 className="text-sm font-black">أ. محمد الزعابي</h3>
                      </div>
                  </div>

                  {/* بطاقة الدعم الفني */}
                  <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-gray-100'}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isRamadan ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                          <Phone size={24} />
                      </div>
                      <div className="text-right">
                          <p className={`text-[9px] font-black opacity-60 ${isRamadan ? 'text-emerald-200' : 'text-slate-500'}`}>الدعم الفني</p>
                          <h3 className="text-sm font-black" dir="ltr">98344555</h3>
                      </div>
                  </div>
              </div>

              {/* روابط إضافية - تم تصحيح القوس المفقود هنا */}
              <div className="flex flex-col items-center gap-3 mt-6">
                  <div className="flex justify-center gap-6">
                      <a href="https://*****" target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-[10px] font-bold transition-colors ${isRamadan ? 'text-indigo-300 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}>
                          <Github size={14} /> GitHub: ******
                      </a>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-bold ${isRamadan ? 'text-indigo-200/70' : 'text-slate-500'}`}>
                      <Mail size={14} /> 
                      <span>البريد الإلكتروني: mohammad.alzaabi21@edu.moe.om</span>
                  </div>
              </div>
          </div>
      </div>
      
      <p className={`mt-10 text-[10px] font-bold transition-colors ${isRamadan ? 'text-white/30' : 'text-slate-300'}`}>
          جميع الحقوق محفوظة © {new Date().getFullYear()}
      </p>
    </div>
  );
};

export default About;
