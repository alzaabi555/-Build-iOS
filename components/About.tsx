import React, { useState } from 'react';
import { Users, Phone, ShieldCheck, Mail, Github, Info } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useApp } from '../context/AppContext'; // 🌍 استيراد محرك اللغات

const About: React.FC = () => {
  // 🌍 استدعاء دوال الترجمة والاتجاه
  const { t, dir } = useApp();

  // 🌙 المستشعر الرمضاني اللحظي (يمنع الوميض تماماً)
  const isRamadan = true;
  
  return (
    <div className={`flex flex-col h-full overflow-hidden ${isRamadan ? 'text-white' : 'text-slate-800'} ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      
      {/* ================= 🩺 الهيدر القياسي الممتد للنوتش ================= */}
      <header className={`shrink-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6 shadow-sm w-full transition-all duration-300 ${isRamadan ? 'bg-[#0f172a]/80 border-b border-white/10 text-white backdrop-blur-xl' : 'bg-[#446A8D] text-white border-b border-[#3b5d7c]'}`}>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl border border-white/20">
                    <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-wide">{t('navAbout')}</h1>
                    <p className={`text-[10px] font-bold opacity-80 ${isRamadan ? 'text-indigo-200' : 'text-blue-200'}`}>{t('appVersionLabel')}</p>
                </div>
            </div>
        </div>
      </header>

      {/* ================= 📝 محتوى الصفحة الأصلي للمستخدم ================= */}
      <div className="flex-1 overflow-y-auto px-2 pt-4 pb-28 custom-scrollbar relative z-10">
          <div className={`flex flex-col items-center p-6 animate-in fade-in zoom-in duration-500 relative z-10 transition-colors`}>
              
              {/* Logo Container */}
              <div className={`w-32 h-32 rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-6 border p-4 relative group hover:scale-105 transition-all select-none backdrop-blur-xl ${isRamadan ? 'bg-white/10 border-white/20' : 'bg-white border-white/20'}`}>
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/50 to-purple-50/50 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <BrandLogo className="w-full h-full relative z-10" showText={false} />
              </div>
              
              <h1 className={`text-4xl font-black mb-1 tracking-tighter transition-colors ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{t('appNameAbout')}</h1>
              <p className={`px-4 py-1 rounded-full font-black text-[10px] mb-8 border-none shadow-sm transition-colors ${isRamadan ? 'text-indigo-200 bg-white/10' : 'text-slate-500 bg-white'}`}>
                {t('appVersionLabel')}
              </p>
              
              <div className="max-w-2xl w-full space-y-6">
                  
                  {/* قسم الملكية الفكرية والتحذير القانوني */}
                  <div className={`border rounded-[2.5rem] p-8 transition-all duration-500 ${isRamadan ? 'bg-[#0f172a]/80 border-white/10 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
                      <div className="flex items-center gap-3 mb-6 justify-center">
                          <ShieldCheck className={`w-6 h-6 ${isRamadan ? 'text-amber-400' : 'text-indigo-600'}`} />
                          <h2 className="text-xl font-black">{t('intellectualPropertyTitle')}</h2>
                      </div>
                      
                      <div className={`space-y-4 text-sm leading-relaxed ${isRamadan ? 'text-indigo-100/90' : 'text-slate-700'}`}>
                          <p>
                              <strong className={isRamadan ? 'text-amber-300' : 'text-indigo-700'}>{t('aboutDeveloperTitle')}</strong><br />
                              {t('aboutDeveloperDesc')}<span className="font-black">{t('developerName')}</span>{t('aboutDeveloperDescCont')}
                          </p>
                          
                          <p>
                              <strong className={isRamadan ? 'text-amber-300' : 'text-indigo-700'}>{t('ipRightsTitle')}</strong><br />
                              {t('ipRightsDesc1')}<span className="font-black">{t('appNameQuote')}</span>{t('ipRightsDesc2')}
                          </p>

                          <div className={`p-5 rounded-2xl border-2 border-dashed ${isRamadan ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-100'}`}>
                              <p className={`font-black mb-2 flex items-center gap-2 ${isRamadan ? 'text-rose-400' : 'text-rose-600'}`}>
                                  {t('legalWarningTitle')}
                              </p>
                              <ul className={`list-disc list-inside space-y-1 text-xs font-bold ${dir === 'rtl' ? '' : 'text-left'} ${isRamadan ? 'text-rose-200/80' : 'text-rose-800/80'}`}>
                                  <li>{t('legalWarning1')}</li>
                                  <li>{t('legalWarning2')}</li>
                                  <li>{t('legalWarning3')}</li>
                              </ul>
                              <p className={`mt-3 text-[10px] italic ${isRamadan ? 'text-rose-300/60' : 'text-rose-500'}`}>
                                  {t('legalWarningFooter')}
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
                              <div>
                                  <p className={`text-[9px] font-black opacity-60 ${isRamadan ? 'text-indigo-200' : 'text-slate-500'}`}>{t('preparationAndDesign')}</p>
                                  <h3 className="text-sm font-black">{t('developerName')}</h3>
                              </div>
                          </div>

                          {/* بطاقة الدعم الفني */}
                          <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-gray-100'}`}>
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isRamadan ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                                  <Phone size={24} />
                              </div>
                              <div>
                                  <p className={`text-[9px] font-black opacity-60 ${isRamadan ? 'text-emerald-200' : 'text-slate-500'}`}>{t('techSupport')}</p>
                                  <h3 className="text-sm font-black" dir="ltr">98344555</h3>
                              </div>
                          </div>
                      </div>

                      {/* روابط إضافية */}
                      <div className="flex flex-col items-center gap-3 mt-6">
                          <div className="flex justify-center gap-6">
                              <a href="https://*****" target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-[10px] font-bold transition-colors ${isRamadan ? 'text-indigo-300 hover:text-white' : 'text-slate-500 hover:text-indigo-600'}`}>
                                  <Github size={14} /> GitHub: ******
                              </a>
                          </div>
                          <div className={`flex items-center justify-center gap-2 text-[10px] font-bold w-full ${isRamadan ? 'text-indigo-200/70' : 'text-slate-500'}`}>
                              <Mail size={14} className="shrink-0" /> 
                              <span className="break-all">{t('emailLabel')} mohammad.alzaabi21@edu.moe.om</span>
                          </div>
                      </div>
                  </div>
              </div>
              
              <p className={`mt-10 text-[10px] font-bold transition-colors ${isRamadan ? 'text-white/30' : 'text-slate-300'}`}>
                  {t('allRightsReservedFooter')} {new Date().getFullYear()}
              </p>
          </div>
      </div>
    </div>
  );
};

export default About;
