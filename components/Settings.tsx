import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, AlertTriangle, FileJson, Trash2, 
  Download, RefreshCw, Loader2, Zap, Database, ArrowRight, Globe, Settings as SettingsIcon 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

// ✅ أيقونات 3D فخمة
const Icon3DProfile = ({ isRamadan }: { isRamadan?: boolean }) => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="gradP" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isRamadan ? "#fbbf24" : "#3b82f6"} />
        <stop offset="100%" stopColor={isRamadan ? "#b45309" : "#1d4ed8"} />
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="50" cy="35" r="18" fill="url(#gradP)" filter="url(#glow)" />
    <path d="M20 85 Q50 100 80 85 V75 Q50 55 20 75 Z" fill="url(#gradP)" />
  </svg>
);

const Icon3DDatabase = ({ isRamadan }: { isRamadan?: boolean }) => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="gradD" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isRamadan ? "#34d399" : "#10b981"} />
        <stop offset="100%" stopColor={isRamadan ? "#064e3b" : "#059669"} />
      </linearGradient>
    </defs>
    <path d="M20 30 Q50 15 80 30 V70 Q50 85 20 70 Z" fill="url(#gradD)" filter="url(#glow)" />
    <path d="M20 50 Q50 35 80 50" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
  </svg>
);

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

  useEffect(() => {
      setName(teacherInfo?.name || '');
      setSchool(teacherInfo?.school || '');
      setCivilId(teacherInfo?.civilId || '');
  }, [teacherInfo]);

  // 🌍 زر تبديل اللغة
  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

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
    } catch (error) { alert(t('alertExportError')); } finally { setLoading(null); }
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
        } catch (error) { alert(t('alertInvalidFile')); } finally { setLoading(null); }
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
      } catch (e) { alert('Error'); } finally { setLoading(null); }
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-500 relative z-10 ${language === 'ar' ? 'text-right' : 'text-left'} ${isRamadan ? 'text-white' : 'bg-[#fcfdfe] text-slate-800'}`} dir={dir}>
      
      {/* ================= 🩺 الهيدر القياسي الممتد للنوتش ================= */}
   <header 
    className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent ${isRamadan ? 'text-white' : 'text-slate-800'}`}
    style={{ WebkitAppRegion: 'drag' } as any}
>
        <div className="flex justify-between items-center max-w-4xl mx-auto w-full">
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
            
            {/* 🌍 زر التبديل */}
            <button 
              onClick={toggleLanguage} 
              style={{ WebkitAppRegion: 'no-drag' } as any}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all active:scale-95 shadow-sm ${isRamadan ? 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-800/50 border border-indigo-500/30' : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'}`}
            >
              <Globe size={18} />
              {language === 'ar' ? 'English' : 'العربية'}
            </button>
        </div>
      </header>

      {/* ================= 📝 محتوى الصفحة داخل حاوية تمرير مستقلة ================= */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28 custom-scrollbar relative z-10">
        <div className="space-y-8 max-w-4xl relative z-10 mx-auto w-full">
          
          {/* بطاقة الملف الشخصي */}
          <div className={`rounded-[2.5rem] p-8 transition-all duration-300 border ${isRamadan ? 'bg-[#0f172a]/60 backdrop-blur-2xl border-white/10' : 'bg-white border-slate-50 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]'}`}>
            <div className="flex items-center gap-5 mb-6">
              <Icon3DProfile isRamadan={isRamadan} />
              <div>
                  <h2 className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{t('profileTitle')}</h2>
                  <p className={`text-xs font-bold ${isRamadan ? 'text-indigo-200/70' : 'text-slate-400'}`}>{t('profileSubtitle')}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                  <label className={`text-[10px] font-black mx-2 uppercase ${isRamadan ? 'text-indigo-300' : 'text-slate-400'}`}>{t('civilIdLabel')}</label>
                  <input type="text" value={civilId} onChange={e => setCivilId(e.target.value)} className={`w-full rounded-2xl px-5 py-4 border outline-none text-sm font-black transition-all ${isRamadan ? 'bg-indigo-900/50 border-indigo-500/50 text-white placeholder:text-indigo-300 focus:border-amber-400' : 'bg-indigo-50 border-indigo-200 text-indigo-900 focus:ring-4 focus:ring-indigo-500/10'}`} placeholder={t('civilIdPlaceholder')} />
              </div>
              <div className="space-y-2">
                  <label className={`text-[10px] font-black mx-2 uppercase ${isRamadan ? 'text-indigo-300' : 'text-slate-400'}`}>{t('teacherNameLabel')}</label>
                  <input value={name} onChange={e => setName(e.target.value)} className={`w-full rounded-2xl px-5 py-4 border outline-none text-sm font-bold transition-all ${isRamadan ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`} placeholder={t('teacherNamePlaceholder')} />
              </div>
              <div className="space-y-2">
                  <label className={`text-[10px] font-black mx-2 uppercase ${isRamadan ? 'text-indigo-300' : 'text-slate-400'}`}>{t('schoolNameLabel')}</label>
                  <input value={school} onChange={e => setSchool(e.target.value)} className={`w-full rounded-2xl px-5 py-4 border outline-none text-sm font-bold transition-all ${isRamadan ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`} placeholder={t('schoolNamePlaceholder')} />
              </div>
            </div>

            <button onClick={() => setTeacherInfo({ ...teacherInfo, name, school, civilId })} className={`mt-6 w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${isRamadan ? 'bg-amber-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-xl shadow-blue-200'}`}>
              <Save size={18} /> {t('saveProfileBtn')}
            </button>
          </div>

          {/* بطاقة النسخ المحلي */}
          <div className={`rounded-[2.5rem] p-8 border ${isRamadan ? 'bg-[#0f172a]/60 border-white/10' : 'bg-white border-emerald-50 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]'}`}>
            <div className="flex items-center gap-5 mb-8">
              <Icon3DDatabase isRamadan={isRamadan} />
              <div>
                <h2 className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{t('backupTitle')}</h2>
                <p className={`text-xs font-bold px-2 py-1 rounded-lg mt-1 inline-block ${isRamadan ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>{t('backupSubtitle')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button onClick={handleBackup} className="group flex flex-col items-center justify-center p-7 rounded-[2.2rem] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black shadow-lg">
                <Database className="w-9 h-9 mb-3" /> {t('createBackupBtn')}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="group flex flex-col items-center justify-center p-7 rounded-[2.2rem] border-2 border-emerald-100 text-emerald-700 font-black hover:bg-emerald-50 transition-all">
                <RefreshCw className="w-9 h-9 mb-3" /> {t('importBackupBtn')}
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
          </div>

          {/* منطقة الخطر */}
          <div className={`rounded-[2.5rem] p-8 border ${isRamadan ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50/30 border-rose-100'}`}>
            <button onClick={handleFactoryReset} className="w-full py-4 border-2 border-rose-100 text-rose-500 rounded-2xl font-black hover:bg-rose-50 shadow-sm transition-all flex items-center justify-center gap-2">
              <Trash2 size={16} /> {t('dangerZoneBtn')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
