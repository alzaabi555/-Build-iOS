import React from 'react';
import { Users, Phone, ShieldCheck, Mail, GitBranch, Info, ChevronLeft, ChevronRight, Code2, AlertTriangle, ExternalLink } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useApp } from '../context/AppContext'; // 🌍 استيراد محرك اللغات

const About: React.FC = () => {
  // 🌍 استدعاء دوال الترجمة والاتجاه
  const { t, dir } = useApp();

  // 🌙 المستشعر الرمضاني
  const isRamadan = true;
  
  const ChevronIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-500 relative z-10 ${language === 'ar' ? 'text-right' : 'text-left'} ${isRamadan ? 'text-white' : 'bg-[#fcfdfe] text-slate-800'}`} dir={dir}>
      
      {/* ================= 🩺 الهيدر القياسي الممتد للنوتش ================= */}
      <header className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
        <div className="flex justify-between items-center max-w-2xl mx-auto w-full pb-4">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl border border-white/20 shadow-sm">
                    <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-wide">{t('navAbout')}</h1>
                </div>
            </div>
        </div>
      </header>

      {/* ================= 🚀 محتوى الصفحة الفضائي ================= */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28 custom-scrollbar relative z-10">
          <div className={`flex flex-col items-center max-w-2xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500`}>
              
              {/* 🛸 الهوية ومجسم الشعار */}
              <div className="flex flex-col items-center mb-10 mt-4">
                  <div className={`w-32 h-32 rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-6 border p-4 relative group hover:scale-105 transition-transform duration-500 select-none backdrop-blur-xl ${isRamadan ? 'bg-white/10 border-white/20' : 'bg-white border-slate-100'}`}>
                      <div className={`absolute inset-0 rounded-[2.5rem] blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 ${isRamadan ? 'bg-gradient-to-tr from-indigo-500/40 to-amber-500/40' : 'bg-gradient-to-tr from-blue-500/20 to-purple-500/20'}`}></div>
                      <BrandLogo className="w-full h-full relative z-10 drop-shadow-xl" showText={false} />
                  </div>
                  
                  <h1 className={`text-3xl font-black mb-2 tracking-tight transition-colors ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
                      {t('appNameAbout')}
                  </h1>
                  <div className={`px-4 py-1.5 rounded-full font-black text-xs shadow-sm border ${isRamadan ? 'bg-white/10 border-white/10 text-indigo-200' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                      {t('appVersionLabel')}
                  </div>
              </div>
              
              <div className="w-full space-y-6">
                  
                  {/* 👨‍💻 بطاقة المطور وحقوق الملكية */}
                  <div className="space-y-2">
                    <h3 className={`px-4 text-[10px] font-black uppercase tracking-wider ${isRamadan ? 'text-indigo-300/70' : 'text-slate-400'}`}>حقوق الملكية الفكرية</h3>
                    <div className={`rounded-3xl overflow-hidden border p-6 transition-all duration-500 ${isRamadan ? 'bg-white/5 border-white/10 backdrop-blur-md' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                <Code2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black">{t('intellectualPropertyTitle')}</h2>
                                <p className={`text-xs font-bold mt-0.5 ${isRamadan ? 'text-indigo-200/70' : 'text-slate-500'}`}>{t('aboutDeveloperTitle')}</p>
                            </div>
                        </div>
                        
                        <div className={`space-y-4 text-sm font-bold leading-relaxed ${isRamadan ? 'text-slate-300' : 'text-slate-600'}`}>
                            <p className="bg-black/5 p-4 rounded-2xl border border-white/5">
                                {t('aboutDeveloperDesc')} <span className={`font-black ${isRamadan ? 'text-amber-400' : 'text-indigo-600'}`}>{t('developerName')}</span> {t('aboutDeveloperDescCont')}
                            </p>
                            <p className="bg-black/5 p-4 rounded-2xl border border-white/5">
                                {t('ipRightsDesc1')} <span className={`font-black ${isRamadan ? 'text-amber-400' : 'text-indigo-600'}`}>{t('appNameQuote')}</span> {t('ipRightsDesc2')}
                            </p>
                        </div>
                    </div>
                  </div>

                  {/* 🛡️ البطاقة القانونية (منطقة التحذير) */}
                  <div className={`rounded-3xl overflow-hidden border p-6 transition-all duration-500 ${isRamadan ? 'bg-rose-950/30 border-rose-900/50' : 'bg-rose-50 border-rose-100'}`}>
                      <div className="flex items-center gap-3 mb-4">
                          <AlertTriangle className={`w-5 h-5 ${isRamadan ? 'text-rose-400' : 'text-rose-600'}`} />
                          <h3 className={`font-black text-base ${isRamadan ? 'text-rose-400' : 'text-rose-700'}`}>{t('legalWarningTitle')}</h3>
                      </div>
                      <ul className={`list-inside space-y-2 text-xs font-bold ${dir === 'rtl' ? 'pr-2' : 'pl-2'} ${isRamadan ? 'text-rose-200/80' : 'text-rose-800/80'}`}>
                          <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></div><span>{t('legalWarning1')}</span></li>
                          <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></div><span>{t('legalWarning2')}</span></li>
                          <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></div><span>{t('legalWarning3')}</span></li>
                      </ul>
                      <div className={`mt-5 pt-4 border-t text-[10px] font-black text-center ${isRamadan ? 'border-rose-900/50 text-rose-400/60' : 'border-rose-200 text-rose-500'}`}>
                          {t('legalWarningFooter')}
                      </div>
                  </div>

                  {/* 📞 بطاقة التواصل والدعم (القائمة العصرية) */}
                  <div className="space-y-2">
                    <h3 className={`px-4 text-[10px] font-black uppercase tracking-wider ${isRamadan ? 'text-indigo-300/70' : 'text-slate-400'}`}>الدعم الفني والتواصل</h3>
                    <div className={`rounded-3xl overflow-hidden border flex flex-col divide-y transition-all duration-500 ${isRamadan ? 'bg-white/5 border-white/10 divide-white/5' : 'bg-white border-slate-100 divide-slate-50 shadow-sm'}`}>
                        
                        {/* الدعم عبر الهاتف */}
                        <a href="tel:98344555" className={`w-full p-4 flex items-center justify-between transition-colors active:bg-white/5 ${isRamadan ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${isRamadan ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <Phone size={20} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-sm">{t('techSupport')}</span>
                                    <span className={`text-xs font-black tracking-wider mt-0.5 ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`} dir="ltr">98344555</span>
                                </div>
                            </div>
                            <ExternalLink size={16} className={isRamadan ? 'text-slate-600' : 'text-slate-400'} />
                        </a>

                        {/* البريد الإلكتروني */}
                        <a href="mailto:mohammad.alzaabi21@edu.moe.om" className={`w-full p-4 flex items-center justify-between transition-colors active:bg-white/5 ${isRamadan ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`p-2.5 rounded-xl shrink-0 ${isRamadan ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <Mail size={20} />
                                </div>
                                <div className="flex flex-col items-start min-w-0 pr-2">
                                    <span className="font-bold text-sm">{t('emailLabel')}</span>
                                    <span className={`text-[10px] font-bold mt-0.5 truncate w-full ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`}>mohammad.alzaabi21@edu.moe.om</span>
                                </div>
                            </div>
                            <ExternalLink size={16} className={`shrink-0 ${isRamadan ? 'text-slate-600' : 'text-slate-400'}`} />
                        </a>

                        {/* Github */}
                        <a href="https://*****" target="_blank" rel="noreferrer" className={`w-full p-4 flex items-center justify-between transition-colors active:bg-white/5 ${isRamadan ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${isRamadan ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                    <GitBranch size={20} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-sm">GitBranch</span>
                                    <span className={`text-xs font-bold mt-0.5 ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`}>******</span>
                                </div>
                            </div>
                            <ExternalLink size={16} className={isRamadan ? 'text-slate-600' : 'text-slate-400'} />
                        </a>

                    </div>
                  </div>

              </div>
              
              {/* Footer */}
              <div className={`mt-10 mb-4 flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors ${isRamadan ? 'text-slate-500' : 'text-slate-400'}`}>
                  <ShieldCheck size={16} className="mb-1 opacity-50" />
                  <span>{t('allRightsReservedFooter')} {new Date().getFullYear()}</span>
                  <span>MADE WITH ❤️ IN OMAN</span>
              </div>

          </div>
      </div>
    </div>
  );
};

export default About;
