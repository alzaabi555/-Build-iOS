import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, AlertTriangle, FileJson, Trash2, 
  Download, RefreshCw, Loader2, Zap, Database, ArrowRight, Globe, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, UserCircle, Shield, UploadCloud, X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

// 🌟 المكون الجراحي: نافذة ذكية منزلقة
const DrawerSheet: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    isRamadan: boolean;
    dir: string;
    mode?: 'bottom' | 'side' | 'full'; // 🌟 السحر هنا
}> = ({ isOpen, onClose, children, isRamadan, dir, mode = 'side' }) => {
    
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    let positioningStyles = '';
    let transformStyles = '';

    if (mode === 'full') {
        positioningStyles = 'inset-0 w-full h-full rounded-none';
        transformStyles = isOpen ? 'translate-y-0' : 'translate-y-full';
    } 
    else if (mode === 'side') {
        positioningStyles = `top-0 bottom-0 h-full w-[85%] max-w-[450px] ${dir === 'rtl' ? 'right-0 rounded-l-[2.5rem] border-l' : 'left-0 rounded-r-[2.5rem] border-r'}`;
        transformStyles = isOpen ? 'translate-x-0' : (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full');
    } 
    else {
        // وضع السفلي (Bottom) مع حل مشكلة القص الإجبارية
        positioningStyles = `max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[92vh] max-md:rounded-t-[2.5rem] md:inset-y-0 ${dir === 'rtl' ? 'md:left-0 md:rounded-r-[2.5rem] border-r' : 'md:right-0 md:rounded-l-[2.5rem] border-l'} md:w-[450px] md:h-full`;
        transformStyles = isOpen ? 'translate-y-0 md:translate-x-0' : `max-md:translate-y-full ${dir === 'rtl' ? 'md:-translate-x-full' : 'md:translate-x-full'}`;
    }

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            
            <div
                className={`fixed z-[101] flex flex-col shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${positioningStyles}
                    ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}
                    ${transformStyles}
                `}
            >
                {mode === 'bottom' && (
                    <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0 cursor-pointer" onClick={onClose}>
                        <div className={`w-10 h-1.5 rounded-full ${isRamadan ? 'bg-white/20' : 'bg-slate-300'}`} />
                    </div>
                )}

                <button
                    onClick={onClose}
                    className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'} p-2 rounded-full transition-colors z-[102] ${isRamadan ? 'hover:bg-white/10 text-white/70' : 'hover:bg-slate-100 text-slate-500'} ${mode === 'bottom' ? 'hidden md:flex' : 'flex'}`}
                >
                    <X size={20} />
                </button>

                {/* حماية القص في الأسفل للوضع السفلي */}
                <div className={`flex-1 flex flex-col overflow-hidden ${mode === 'bottom' ? 'md:pt-10' : 'pt-14'} 
                    ${mode === 'bottom' ? 'max-md:pb-[calc(env(safe-area-inset-bottom)+3rem)] pb-8 md:pb-0' : ''}`}>
                    {children}
                </div>
            </div>
        </>
    );
};

const Settings = () => {
  const { 
    teacherInfo, setTeacherInfo, students, setStudents, 
    classes, setClasses, schedule, setSchedule, 
    periodTimes, setPeriodTimes, assessmentTools, setAssessmentTools,
    certificateSettings, setCertificateSettings, hiddenClasses, setHiddenClasses,
    groups, setGroups, categorizations, setCategorizations, gradeSettings, setGradeSettings,
    language, setLanguage, t, dir 
  } = useApp();

  const [name, setName] = useState(teacherInfo?.name || '');
  const [school, setSchool] = useState(teacherInfo?.school || '');
  const [civilId, setCivilId] = useState(teacherInfo?.civilId || ''); 
  
  const [loading, setLoading] = useState<'backup' | 'restore' | 'reset' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRamadan = true;

  // 🎛️ حالات فتح اللوحات (Drawers)
  const [activeDrawer, setActiveDrawer] = useState<'language' | 'profile' | 'system' | null>(null);

  useEffect(() => {
      setName(teacherInfo?.name || '');
      setSchool(teacherInfo?.school || '');
      setCivilId(teacherInfo?.civilId || '');
  }, [teacherInfo]);

  // ✅ الدوال الأساسية للنسخ الاحتياطي (محلياً Local Backup)
  const handleBackup = async () => {
    setLoading('backup');
    try {
      const dataToSave = {
        version: '3.8.7', timestamp: new Date().toISOString(),
        students, classes, hiddenClasses, groups, schedule, periodTimes, 
        teacherInfo, assessmentTools, certificateSettings, categorizations, gradeSettings
      };
      const fileName = `Rased_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const jsonString = JSON.stringify(dataToSave, null, 2);

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({ path: fileName, data: jsonString, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: 'Rased Backup', url: result.uri });
      } else {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = fileName;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      }
      alert(t('alertExportSuccess'));
    } catch (error) { alert(t('alertExportError')); } finally { setLoading(null); setActiveDrawer(null); }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm(t('alertConfirmRestore'))) return;
    setLoading('restore');
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            if (data.students) {
                setStudents(data.students); setClasses(data.classes || []);
                if(data.hiddenClasses) setHiddenClasses(data.hiddenClasses);
                if(data.groups) setGroups(data.groups);
                if(data.categorizations) setCategorizations(data.categorizations);
                if(data.schedule) setSchedule(data.schedule);
                if(data.periodTimes) setPeriodTimes(data.periodTimes);
                if(data.teacherInfo) setTeacherInfo(data.teacherInfo);
                if(data.assessmentTools) setAssessmentTools(data.assessmentTools);
                if(data.certificateSettings) setCertificateSettings(data.certificateSettings);
                if(data.gradeSettings) setGradeSettings(data.gradeSettings);
                
                if (Capacitor.isNativePlatform() || (window as any).electron !== undefined) {
                    await Filesystem.writeFile({ path: 'raseddatabasev2.json', data: event.target?.result as string, directory: Directory.Data, encoding: Encoding.UTF8 });
                }
                alert(t('alertRestoreSuccess'));
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) { alert(t('alertInvalidFile')); } finally { setLoading(null); setActiveDrawer(null); }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = async () => {
      if (!confirm(t('alertConfirmReset'))) return;
      setLoading('reset');
      try {
          localStorage.clear();
          if (Capacitor.isNativePlatform() || (window as any).electron) {
              await Filesystem.deleteFile({ path: 'raseddatabasev2.json', directory: Directory.Data }).catch(() => {});
          }
          alert(t('alertResetSuccess'));
          window.location.reload();
      } catch (e) { alert('Error'); } finally { setLoading(null); setActiveDrawer(null); }
  };

  const ChevronIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-500 relative z-10 ${language === 'ar' ? 'text-right' : 'text-left'} ${isRamadan ? 'text-white' : 'bg-[#fcfdfe] text-slate-800'}`} dir={dir}>
      
      {/* ================= 🩺 الهيدر القياسي الممتد للنوتش ================= */}
   <header 
    className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent ${isRamadan ? 'text-white' : 'text-slate-800'}`}
    style={{ WebkitAppRegion: 'drag' } as any}
>
        <div className="flex justify-between items-center max-w-4xl mx-auto w-full pb-4">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl border border-white/20">
                    <SettingsIcon className="w-5 h-5 text-white" />
                </div>
                <div style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <h1 className="text-xl md:text-2xl font-black tracking-wide">{t('settingsTitle')}</h1>
                    <p className={`text-[10px] font-bold opacity-80 ${isRamadan ? 'text-indigo-200' : 'text-blue-200'}`}>
                        {t('settingsSubtitle')}
                    </p>
                </div>
            </div>
        </div>
      </header>

      {/* ================= 📝 محتوى الصفحة الرئيسية (قائمة الخيارات الأنيقة) ================= */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28 custom-scrollbar relative z-10">
        <div className="space-y-6 max-w-2xl relative z-10 mx-auto w-full">
          
          {/* 🌐 مجموعة إعدادات اللغة */}
          <div className="space-y-2">
            <h3 className={`px-2 text-[10px] font-black uppercase tracking-wider ${isRamadan ? 'text-indigo-300/70' : 'text-slate-400'}`}>التفضيلات</h3>
            <div className={`rounded-2xl overflow-hidden border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                <button 
                    onClick={() => setActiveDrawer('language')}
                    className={`w-full p-4 flex items-center justify-between transition-colors active:bg-white/5 ${isRamadan ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isRamadan ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><Globe size={20} /></div>
                        <span className="font-bold text-sm">لغة التطبيق (Language)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isRamadan ? 'text-slate-400' : 'text-slate-400'}`}>{language === 'ar' ? 'العربية' : 'English'}</span>
                        <ChevronIcon size={16} className={isRamadan ? 'text-slate-500' : 'text-slate-400'} />
                    </div>
                </button>
            </div>
          </div>

          {/* 👤 مجموعة إعدادات الحساب */}
          <div className="space-y-2">
            <h3 className={`px-2 text-[10px] font-black uppercase tracking-wider ${isRamadan ? 'text-indigo-300/70' : 'text-slate-400'}`}>الحساب والمدرسة</h3>
            <div className={`rounded-2xl overflow-hidden border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                <button 
                    onClick={() => setActiveDrawer('profile')}
                    className={`w-full p-4 flex items-center justify-between transition-colors active:bg-white/5 ${isRamadan ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isRamadan ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}`}><UserCircle size={20} /></div>
                        <span className="font-bold text-sm">{t('profileTitle')}</span>
                    </div>
                    <ChevronIcon size={16} className={isRamadan ? 'text-slate-500' : 'text-slate-400'} />
                </button>
            </div>
          </div>

          {/* ⚙️ مجموعة إعدادات النظام */}
          <div className="space-y-2">
            <h3 className={`px-2 text-[10px] font-black uppercase tracking-wider ${isRamadan ? 'text-indigo-300/70' : 'text-slate-400'}`}>النظام والبيانات</h3>
            <div className={`rounded-2xl overflow-hidden border flex flex-col divide-y ${isRamadan ? 'bg-white/5 border-white/10 divide-white/5' : 'bg-white border-slate-100 divide-slate-50 shadow-sm'}`}>
                <button 
                    onClick={() => setActiveDrawer('system')}
                    className={`w-full p-4 flex items-center justify-between transition-colors active:bg-white/5 ${isRamadan ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isRamadan ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Database size={20} /></div>
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">{t('backupTitle')}</span>
                            <span className={`text-[10px] ${isRamadan ? 'text-slate-400' : 'text-slate-400'}`}>تصدير، استيراد، وإعادة ضبط</span>
                        </div>
                    </div>
                    <ChevronIcon size={16} className={isRamadan ? 'text-slate-500' : 'text-slate-400'} />
                </button>
            </div>
          </div>

        </div>
      </div>

      {/* ================= 🗂️ اللوحات السفلية/الجانبية المنزلقة (Drawers) ================= */}

      {/* 🌐 1. لوحة تغيير اللغة */}
      <DrawerSheet isOpen={activeDrawer === 'language'} onClose={() => setActiveDrawer(null)} isRamadan={isRamadan} dir={dir}>
        <div className="flex flex-col h-full w-full">
            <div className={`flex justify-between items-center px-6 pb-4 border-b shrink-0 ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
                <h3 className="font-black text-xl">لغة التطبيق</h3>
            </div>
            <div className="p-6 space-y-3">
                <button 
                    onClick={() => { setLanguage('ar'); setActiveDrawer(null); }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${language === 'ar' ? (isRamadan ? 'border-indigo-500 bg-indigo-500/20' : 'border-indigo-500 bg-indigo-50') : (isRamadan ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-white')}`}
                >
                    <span className="font-bold text-lg">العربية (Arabic)</span>
                    {language === 'ar' && <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isRamadan ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>✓</div>}
                </button>
                <button 
                    onClick={() => { setLanguage('en'); setActiveDrawer(null); }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${language === 'en' ? (isRamadan ? 'border-indigo-500 bg-indigo-500/20' : 'border-indigo-500 bg-indigo-50') : (isRamadan ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-white')}`}
                >
                    <span className="font-bold text-lg">English (English)</span>
                    {language === 'en' && <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isRamadan ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>✓</div>}
                </button>
            </div>
        </div>
      </DrawerSheet>

      {/* 👤 2. لوحة البيانات الشخصية */}
      <DrawerSheet isOpen={activeDrawer === 'profile'} onClose={() => setActiveDrawer(null)} isRamadan={isRamadan} dir={dir}>
        <div className="flex flex-col h-full w-full">
            <div className={`flex justify-between items-center px-6 pb-4 border-b shrink-0 ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
                <h3 className="font-black text-xl">{t('profileTitle')}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="space-y-1">
                    <label className={`text-xs font-bold px-1 ${isRamadan ? 'text-indigo-300' : 'text-slate-500'}`}>{t('teacherNameLabel')}</label>
                    <input value={name} onChange={e => setName(e.target.value)} className={`w-full rounded-xl px-4 py-3.5 outline-none text-sm font-bold transition-all border ${isRamadan ? 'bg-[#1e293b] border-white/10 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'}`} placeholder={t('teacherNamePlaceholder')} />
                </div>
                <div className="space-y-1">
                    <label className={`text-xs font-bold px-1 ${isRamadan ? 'text-indigo-300' : 'text-slate-500'}`}>{t('schoolNameLabel')}</label>
                    <input value={school} onChange={e => setSchool(e.target.value)} className={`w-full rounded-xl px-4 py-3.5 outline-none text-sm font-bold transition-all border ${isRamadan ? 'bg-[#1e293b] border-white/10 text-white focus:border-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'}`} placeholder={t('schoolNamePlaceholder')} />
                </div>
                <div className="space-y-1">
                    <label className={`text-xs font-bold px-1 flex items-center gap-1 ${isRamadan ? 'text-amber-300' : 'text-amber-600'}`}><Shield size={14}/> {t('civilIdLabel')}</label>
                    <input type="number" value={civilId} onChange={e => setCivilId(e.target.value)} className={`w-full rounded-xl px-4 py-3.5 outline-none font-mono font-black tracking-widest text-center transition-all border ${isRamadan ? 'bg-amber-900/20 border-amber-500/30 text-amber-400 focus:border-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700 focus:border-amber-500'}`} placeholder={t('civilIdPlaceholder')} />
                    <p className={`text-[10px] text-center mt-1 ${isRamadan ? 'text-slate-400' : 'text-slate-400'}`}>مطلوب لتمكين ولي الأمر من جلب درجات الطالب بأمان</p>
                </div>
            </div>
            <div className={`p-4 border-t shrink-0 ${isRamadan ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-white'}`}>
                <button onClick={() => { setTeacherInfo({ ...teacherInfo, name, school, civilId }); setActiveDrawer(null); }} className={`w-full py-4 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${isRamadan ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                    <Save size={18} /> {t('saveProfileBtn')}
                </button>
            </div>
        </div>
      </DrawerSheet>

      {/* ⚙️ 3. لوحة إدارة النظام والبيانات */}
      <DrawerSheet isOpen={activeDrawer === 'system'} onClose={() => setActiveDrawer(null)} isRamadan={isRamadan} dir={dir}>
        <div className="flex flex-col h-full w-full">
            <div className={`flex justify-between items-center px-6 pb-4 border-b shrink-0 ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
                <h3 className="font-black text-xl">{t('backupTitle')}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                
                {/* خلايا خيارات النظام */}
                <div className={`rounded-2xl overflow-hidden border flex flex-col divide-y ${isRamadan ? 'bg-white/5 border-white/10 divide-white/5' : 'bg-white border-slate-100 divide-slate-50 shadow-sm'}`}>
                    
                    <button onClick={handleBackup} className={`w-full p-4 flex items-center justify-between transition-colors active:bg-white/5 ${isRamadan ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isRamadan ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Download size={18} /></div>
                            <span className="font-bold text-sm">تصدير نسخة احتياطية (محلياً)</span>
                        </div>
                    </button>

                    <button onClick={() => fileInputRef.current?.click()} className={`w-full p-4 flex items-center justify-between transition-colors active:bg-white/5 ${isRamadan ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isRamadan ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><UploadCloud size={18} /></div>
                            <span className="font-bold text-sm">استيراد نسخة سابقة</span>
                        </div>
                    </button>

                </div>

                <div className="pt-6">
                    <p className={`text-[10px] font-bold px-2 mb-2 uppercase ${isRamadan ? 'text-rose-400/80' : 'text-rose-400'}`}>منطقة الخطر</p>
                    <div className={`rounded-2xl overflow-hidden border ${isRamadan ? 'bg-white/5 border-rose-500/30' : 'bg-white border-rose-100 shadow-sm'}`}>
                        <button onClick={handleFactoryReset} className={`w-full p-4 flex items-center justify-between transition-colors active:bg-rose-500/10 ${isRamadan ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isRamadan ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600'}`}><Trash2 size={18} /></div>
                                <span className={`font-bold text-sm ${isRamadan ? 'text-rose-400' : 'text-rose-600'}`}>{t('dangerZoneBtn')}</span>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
        </div>
      </DrawerSheet>

    </div>
  );
};

export default Settings;
