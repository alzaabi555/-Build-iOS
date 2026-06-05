import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, AlertTriangle, FileJson, Trash2, 
  Download, RefreshCw, Loader2, Zap, Database, ArrowRight, Globe, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, UserCircle, Shield, UploadCloud, X, Key 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../theme/ThemeProvider'; 

import { Drawer as DrawerSheet } from './ui/Drawer';

const Settings = () => {
  const { 
    teacherInfo, setTeacherInfo, students, setStudents, 
    classes, setClasses, schedule, setSchedule, 
    periodTimes, setPeriodTimes, assessmentTools, setAssessmentTools,
    certificateSettings, setCertificateSettings, hiddenClasses, setHiddenClasses,
    groups, setGroups, categorizations, setCategorizations, gradeSettings, setGradeSettings,
    language, setLanguage, t, dir,
    tasks, setTasks, library, setLibrary
  } = useApp();

  const { theme } = useTheme();

  const [name, setName] = useState(teacherInfo?.name || '');
  const [school, setSchool] = useState(teacherInfo?.school || '');
  const [civilId, setCivilId] = useState(teacherInfo?.civilId || ''); 
  
  // 💉 حالات البوابة السرية (للمعلم الأول)
  const [role, setRole] = useState(teacherInfo?.role || 'teacher');
  const [departmentName, setDepartmentName] = useState(teacherInfo?.departmentName || '');
  const [leadershipPasscode, setLeadershipPasscode] = useState('');
  const [isLeadershipUnlocked, setIsLeadershipUnlocked] = useState(teacherInfo?.role === 'senior');

  const [loading, setLoading] = useState<'backup' | 'restore' | 'reset' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRamadan = theme === 'ramadan';

  // 💉 إضافة 'leadership' للقائمة المسموحة
  const [activeDrawer, setActiveDrawer] = useState<'language' | 'profile' | 'system' | 'leadership' | null>(null);

  useEffect(() => {
      setName(teacherInfo?.name || '');
      setSchool(teacherInfo?.school || '');
      setCivilId(teacherInfo?.civilId || '');
      setRole(teacherInfo?.role || 'teacher');
      setDepartmentName(teacherInfo?.departmentName || '');
      setIsLeadershipUnlocked(teacherInfo?.role === 'senior');
  }, [teacherInfo]);

  const handleBackup = async () => {
    setLoading('backup');
    try {
      const dataToSave = {
        version: '3.8.7', timestamp: new Date().toISOString(),
        students, classes, hiddenClasses, groups, schedule, periodTimes, 
        teacherInfo, assessmentTools, certificateSettings, categorizations, gradeSettings,
        tasks, library,
        assessmentPlan: JSON.parse(localStorage.getItem('rased_assessment_plan') || 'null'),
        termPlan: JSON.parse(localStorage.getItem('rased_term_plan') || 'null')
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
                setStudents(data.students); 
                setClasses(data.classes || []);
                if(data.hiddenClasses) setHiddenClasses(data.hiddenClasses);
                
                if(data.groups) { setGroups(data.groups); localStorage.setItem('teacher_groupsData', JSON.stringify(data.groups)); }
                if(data.categorizations) setCategorizations(data.categorizations);
                if(data.schedule) setSchedule(data.schedule);
                if(data.periodTimes) setPeriodTimes(data.periodTimes);
                if(data.teacherInfo) setTeacherInfo(data.teacherInfo);
                if(data.assessmentTools) setAssessmentTools(data.assessmentTools);
                if(data.certificateSettings) setCertificateSettings(data.certificateSettings);
                if(data.gradeSettings) setGradeSettings(data.gradeSettings);
                
                if(data.tasks) { if(setTasks) setTasks(data.tasks); localStorage.setItem('teacher_tasksData', JSON.stringify(data.tasks)); }
                if(data.library) { if(setLibrary) setLibrary(data.library); localStorage.setItem('teacher_libraryData', JSON.stringify(data.library)); }
                if(data.assessmentPlan) localStorage.setItem('teacher_assessment_plan', JSON.stringify(data.assessmentPlan));
                if(data.termPlan) localStorage.setItem('teacher_term_plan', JSON.stringify(data.termPlan));

                if (Capacitor.isNativePlatform() || (window as any).electron !== undefined) {
                    await Filesystem.writeFile({ path: 'teacher_raseddatabasev2.json', data: event.target?.result as string, directory: Directory.Data, encoding: Encoding.UTF8 });
                    alert(t('alertRestoreSuccess'));
                } else {
                    localStorage.setItem('teacher_studentData', JSON.stringify(data.students));
                    localStorage.setItem('teacher_classesData', JSON.stringify(data.classes || []));
                    if(data.teacherInfo) {
                       localStorage.setItem('teacher_teacherName', data.teacherInfo.name || '');
                       localStorage.setItem('teacher_schoolName', data.teacherInfo.school || '');
                       localStorage.setItem('teacher_civilId', data.teacherInfo.civilId || '');
                    }
                    if(data.schedule) localStorage.setItem('teacher_scheduleData', JSON.stringify(data.schedule));
                    if(data.periodTimes) localStorage.setItem('teacher_periodTimes', JSON.stringify(data.periodTimes));
                    
                    alert(t('alertRestoreSuccess') + " 🚀");
                }
            }
        } catch (error) { 
            alert(t('alertInvalidFile')); 
        } finally { 
            setLoading(null); 
            setActiveDrawer(null); 
        }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = async () => {
      if (!confirm(t('alertConfirmReset'))) return;
      setLoading('reset');
      try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('teacher_')) {
              localStorage.removeItem(key);
            }
          }
          if (Capacitor.isNativePlatform() || (window as any).electron) {
              await Filesystem.deleteFile({ path: 'teacher_raseddatabasev2.json', directory: Directory.Data }).catch(() => {});
          }
          alert(t('alertResetSuccess'));
          window.location.hash = '#/'; 
          window.location.reload();
      } catch (e) { alert('Error'); } finally { setLoading(null); setActiveDrawer(null); }
  };

  const ChevronIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-500 relative z-10 text-textPrimary ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={dir}>
      
      {/* ================= 🩺 الهيدر ================= */}
      <header 
        className="shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent text-textPrimary"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex justify-between items-center max-w-4xl mx-auto w-full pb-4 pt-4">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
                    <SettingsIcon className="w-5 h-5 text-primary" />
                </div>
                <div style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <h1 className="text-xl md:text-2xl font-black tracking-wide">{t('settingsTitle')}</h1>
                    <p className="text-[10px] font-bold text-textSecondary">
                        {t('settingsSubtitle')}
                    </p>
                </div>
            </div>
        </div>
      </header>

      {/* ================= 📝 محتوى الصفحة الرئيسية ================= */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28 custom-scrollbar relative z-10">
        <div className="space-y-6 max-w-2xl relative z-10 mx-auto w-full">
          
          {/* 🌐 مجموعة إعدادات اللغة */}
          <div className="space-y-2">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-wider text-textSecondary">{t('preferencesSection')}</h3>
            <div className="glass-card rounded-2xl overflow-hidden border border-borderColor transition-all">
                <button 
                    onClick={() => setActiveDrawer('language')}
                    className="w-full p-4 flex items-center justify-between transition-colors hover:bg-bgSoft active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Globe size={20} /></div>
                        <span className="font-bold text-sm text-textPrimary">{t('appLanguageLabel')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-textSecondary">{language === 'ar' ? 'العربية' : 'English'}</span>
                        <ChevronIcon size={16} className="text-textSecondary" />
                    </div>
                </button>
            </div>
          </div>

          {/* 👤 مجموعة إعدادات الحساب */}
          <div className="space-y-2">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-wider text-textSecondary">{t('accountAndSchoolSection')}</h3>
            <div className="glass-card rounded-2xl overflow-hidden border border-borderColor transition-all">
                <button 
                    onClick={() => setActiveDrawer('profile')}
                    className="w-full p-4 flex items-center justify-between transition-colors hover:bg-bgSoft active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><UserCircle size={20} /></div>
                        <span className="font-bold text-sm text-textPrimary">{t('profileTitle')}</span>
                    </div>
                    <ChevronIcon size={16} className="text-textSecondary" />
                </button>
            </div>
          </div>

          {/* ⚙️ مجموعة إعدادات النظام */}
          <div className="space-y-2">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-wider text-textSecondary">{t('systemAndDataSection')}</h3>
            <div className="glass-card rounded-2xl overflow-hidden border border-borderColor flex flex-col divide-y divide-borderColor/50 transition-all">
                <button 
                    onClick={() => setActiveDrawer('system')}
                    className="w-full p-4 flex items-center justify-between transition-colors hover:bg-bgSoft active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><Database size={20} /></div>
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-sm text-textPrimary">{t('backupTitle')}</span>
                            <span className="text-[10px] text-textSecondary">{t('systemAndDataDesc')}</span>
                        </div>
                    </div>
                    <ChevronIcon size={16} className="text-textSecondary" />
                </button>
            </div>
          </div>

          {/* 🛡️ مجموعة إعدادات القيادة (المعلم الأول) */}
          <div className="space-y-2">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-wider text-textSecondary">إدارة الصلاحيات</h3>
            <div className="glass-card rounded-2xl overflow-hidden border border-borderColor transition-all">
                <button 
                    onClick={() => setActiveDrawer('leadership')}
                    className="w-full p-4 flex items-center justify-between transition-colors hover:bg-bgSoft active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500"><Shield size={20} /></div>
                        <span className="font-bold text-sm text-textPrimary">إعدادات المعلم الأول</span>
                    </div>
                    <ChevronIcon size={16} className="text-textSecondary" />
                </button>
            </div>
          </div>

        </div>
      </div>

      {/* ================= 🗂️ اللوحات السفلية/الجانبية المنزلقة (Drawers) ================= */}

      {/* 🌐 1. لوحة تغيير اللغة */}
      <DrawerSheet isOpen={activeDrawer === 'language'} onClose={() => setActiveDrawer(null)} dir={dir} mode="side">
        <div className="flex flex-col h-full w-full">
            <div className="flex justify-between items-center px-6 pb-4 border-b border-borderColor shrink-0">
                <h3 className="font-black text-xl text-textPrimary">{t('appLanguageTitle')}</h3>
            </div>
            <div className="p-6 space-y-3">
                <button 
                    onClick={() => { setLanguage('ar'); setActiveDrawer(null); }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${language === 'ar' ? 'border-primary bg-primary/10' : 'border-borderColor bg-bgCard hover:bg-bgSoft'}`}
                >
                    <span className="font-bold text-lg text-textPrimary">{t('arabicLangLabel')}</span>
                    {language === 'ar' && <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-white">✓</div>}
                </button>
                <button 
                    onClick={() => { setLanguage('en'); setActiveDrawer(null); }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${language === 'en' ? 'border-primary bg-primary/10' : 'border-borderColor bg-bgCard hover:bg-bgSoft'}`}
                >
                    <span className="font-bold text-lg text-textPrimary">{t('englishLangLabel')}</span>
                    {language === 'en' && <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-white">✓</div>}
                </button>
            </div>
        </div>
      </DrawerSheet>

      {/* 👤 2. لوحة البيانات الشخصية */}
      <DrawerSheet isOpen={activeDrawer === 'profile'} onClose={() => setActiveDrawer(null)} dir={dir} mode="side">
        <div className="flex flex-col h-full w-full">
            <div className="flex justify-between items-center px-6 pb-4 border-b border-borderColor shrink-0">
                <h3 className="font-black text-xl text-textPrimary">{t('profileTitle')}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="space-y-1">
                    <label className="text-xs font-bold px-1 text-textSecondary">{t('teacherNameLabel')}</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl px-4 py-3.5 outline-none text-sm font-bold transition-all border bg-bgSoft border-borderColor text-textPrimary focus:border-primary placeholder:text-textSecondary/50" placeholder={t('teacherNamePlaceholder')} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold px-1 text-textSecondary">{t('schoolNameLabel')}</label>
                    <input value={school} onChange={e => setSchool(e.target.value)} className="w-full rounded-xl px-4 py-3.5 outline-none text-sm font-bold transition-all border bg-bgSoft border-borderColor text-textPrimary focus:border-primary placeholder:text-textSecondary/50" placeholder={t('schoolNamePlaceholder')} />
                </div>
                
                <div className="space-y-1 mt-4">
                    <label className="text-xs font-bold px-1 flex items-center gap-1 text-amber-500">
                        <Key size={14}/> كود المعلم السري (للسحابة)
                    </label>
                    <input 
                        type="text" 
                        value={civilId} 
                        onChange={e => setCivilId(e.target.value)} 
                        className="w-full rounded-xl px-4 py-3.5 outline-none font-mono font-black tracking-widest text-center transition-all border bg-amber-500/5 border-amber-500/20 text-textPrimary focus:border-amber-500 placeholder:text-textSecondary/50" 
                        placeholder="أدخل رقم هاتفك أو كود خاص بك" 
                        dir="ltr"
                    />
                    <p className="text-[10px] text-center mt-1 text-textSecondary">
                        يستخدم هذا الكود لحماية وربط نسختك الاحتياطية في السحابة المركزية
                    </p>
                </div>
            </div>
            <div className="p-4 border-t border-borderColor bg-bgCard shrink-0">
                <button onClick={() => { setTeacherInfo({ ...teacherInfo, name, school, civilId }); setActiveDrawer(null); }} className="w-full py-4 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-white">
                    <Save size={18} /> {t('saveProfileBtn')}
                </button>
            </div>
        </div>
      </DrawerSheet>

      {/* ⚙️ 3. لوحة إدارة النظام والبيانات */}
      <DrawerSheet isOpen={activeDrawer === 'system'} onClose={() => setActiveDrawer(null)} dir={dir} mode="side">
        <div className="flex flex-col h-full w-full">
            <div className="flex justify-between items-center px-6 pb-4 border-b border-borderColor shrink-0">
                <h3 className="font-black text-xl text-textPrimary">{t('backupTitle')}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                
                <div className="glass-card rounded-2xl overflow-hidden border border-borderColor flex flex-col divide-y divide-borderColor/50">
                    
                    <button onClick={handleBackup} className="w-full p-4 flex items-center justify-between transition-colors hover:bg-bgSoft active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><Download size={18} /></div>
                            <span className="font-bold text-sm text-textPrimary">{t('exportBackupLocal')}</span>
                        </div>
                    </button>

                    <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 flex items-center justify-between transition-colors hover:bg-bgSoft active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><UploadCloud size={18} /></div>
                            <span className="font-bold text-sm text-textPrimary">{t('importBackup')}</span>
                        </div>
                    </button>

                </div>

                <div className="pt-6">
                    <p className="text-[10px] font-bold px-2 mb-2 uppercase text-rose-500">{t('dangerZoneTitle')}</p>
                    <div className="rounded-2xl overflow-hidden border border-rose-500/20 bg-rose-500/5 transition-all">
                        <button onClick={handleFactoryReset} className="w-full p-4 flex items-center justify-between transition-colors hover:bg-rose-500/10 active:scale-[0.99]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500"><Trash2 size={18} /></div>
                                <span className="font-bold text-sm text-rose-500">{t('dangerZoneBtn')}</span>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
        </div>
      </DrawerSheet>

      {/* 🛡️ 4. البوابة السرية (إعدادات المعلم الأول) */}
      <DrawerSheet isOpen={activeDrawer === 'leadership'} onClose={() => { setActiveDrawer(null); setLeadershipPasscode(''); }} dir={dir} mode="side">
        <div className="flex flex-col h-full w-full">
            <div className="flex justify-between items-center px-6 pb-4 border-b border-borderColor shrink-0">
                <h3 className="font-black text-xl text-textPrimary flex items-center gap-2">
                    <Shield className="text-purple-500" /> إعدادات القيادة
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {!isLeadershipUnlocked ? (
                    <div className="space-y-4 text-center mt-10">
                        <div className="w-16 h-16 mx-auto bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center">
                            <Key size={32} />
                        </div>
                        <h4 className="font-bold text-textPrimary">بوابة المعلم الأول</h4>
                        <p className="text-xs text-textSecondary">الرجاء إدخال الرمز السري لتفعيل الصلاحيات الإشرافية</p>
                        <div className="pt-4">
                          <input
                              type="password"
                              value={leadershipPasscode}
                              onChange={(e) => {
                                  setLeadershipPasscode(e.target.value);
                                  // 🔑 الرمز السري هنا هو 5555
                                  if (e.target.value === '5555') { 
                                      setIsLeadershipUnlocked(true);
                                  }
                              }}
                              className="w-full max-w-xs mx-auto text-center rounded-xl px-4 py-4 outline-none font-black tracking-[1em] transition-all border bg-bgSoft border-borderColor focus:border-purple-500 text-xl"
                              placeholder="****"
                              maxLength={4}
                              dir="ltr"
                          />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex gap-3">
                            <Shield className="w-6 h-6 shrink-0" />
                            <p className="text-xs font-bold leading-relaxed">
                                أنت الآن في وضع القيادة. يمكنك تفعيل صلاحيات "المعلم الأول" لإدارة حصص الاحتياط ومتابعة إحصائيات المعلمين في قسمك.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 rounded-xl border border-borderColor bg-bgSoft cursor-pointer transition-colors hover:bg-bgCard">
                                <span className="font-bold text-sm text-textPrimary">تفعيل صلاحيات المعلم الأول</span>
                                <input
                                    type="checkbox"
                                    checked={role === 'senior'}
                                    onChange={(e) => setRole(e.target.checked ? 'senior' : 'teacher')}
                                    className="w-5 h-5 accent-purple-500 cursor-pointer"
                                />
                            </label>

                            {role === 'senior' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 pt-2">
                                    <label className="text-xs font-bold px-1 text-textSecondary">القسم التابع لك (الذي تشرف عليه)</label>
                                    <input
                                        value={departmentName}
                                        onChange={e => setDepartmentName(e.target.value)}
                                        className="w-full rounded-xl px-4 py-3.5 outline-none text-sm font-bold transition-all border bg-bgSoft border-borderColor text-textPrimary focus:border-purple-500 placeholder:text-textSecondary/50"
                                        placeholder="مثال: قسم الرياضيات"
                                    />
                                    <p className="text-[10px] text-textSecondary px-1">
                                      هذا سيسمح للتطبيق بجلب المعلمين التابعين لنفس المادة لتوزيع الاحتياط عليهم.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isLeadershipUnlocked && (
                <div className="p-4 border-t border-borderColor bg-bgCard shrink-0">
                    <button
                        onClick={() => {
                            setTeacherInfo({ ...teacherInfo, role, departmentName });
                            setActiveDrawer(null);
                        }}
                        className="w-full py-4 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white"
                    >
                        <Save size={18} /> حفظ الصلاحيات
                    </button>
                </div>
            )}
        </div>
      </DrawerSheet>

    </div>
  );
};

export default Settings;
