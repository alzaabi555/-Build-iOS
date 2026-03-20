import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, AlertTriangle, FileJson, Trash2, 
  Download, RefreshCw, Loader2, Zap, Database, ArrowRight, Cloud, CloudUpload, CloudDownload, CheckCircle, XCircle, Globe, Settings as SettingsIcon 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

// ⚠️ الرابط السري الخاص بك
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXUII_Q_6K6TuewJ0k44mi8mCB-6LQNbDo9rhVdaVOvYCyKFRNCBuddLe_PyLorCdT/exec";

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

const Icon3DSync = ({ isRamadan }: { isRamadan?: boolean }) => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="gradS" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isRamadan ? "#c084fc" : "#8b5cf6"} />
        <stop offset="100%" stopColor={isRamadan ? "#581c87" : "#4c1d95"} />
      </linearGradient>
    </defs>
    <path d="M10 50 Q30 20 50 30 T90 50 Q70 80 50 70 T10 50 Z" fill="url(#gradS)" filter="url(#glow)" />
    <circle cx="50" cy="50" r="15" fill="#fff" fillOpacity="0.2" />
  </svg>
);

const Settings = () => {
  const { 
    teacherInfo, setTeacherInfo, students, setStudents, 
    classes, setClasses, schedule, setSchedule, 
    periodTimes, setPeriodTimes, assessmentTools, setAssessmentTools,
    certificateSettings, setCertificateSettings, hiddenClasses, setHiddenClasses,
    groups, setGroups, categorizations, setCategorizations, gradeSettings, setGradeSettings,
    language, setLanguage, t, dir // 🌍 جلب محرك اللغات
  } = useApp();

  const [name, setName] = useState(teacherInfo?.name || '');
  const [school, setSchool] = useState(teacherInfo?.school || '');
  const [civilId, setCivilId] = useState(teacherInfo?.civilId || ''); 
  
  const [loading, setLoading] = useState<'backup' | 'restore' | 'reset' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // ==========================================
  // 🚀 1. زر الرفع المباشر للسحابة
  // ==========================================
  const handleUploadToCloud = async () => {
    if (!teacherInfo.civilId) return alert(t('alertEnterCivilId'));
    if (!confirm(t('alertConfirmPush'))) return;
    
    setIsUploading(true);
    try {
      const cleanId = teacherInfo.civilId.trim();
      const teacherUniqueId = "id_" + cleanId;
      const forceTimestamp = Date.now(); 

      const recordsToSync = [
        { id: "tools_data", type: "Tools", data: JSON.stringify(assessmentTools), lastUpdated: forceTimestamp },
        { id: "groups_data", type: "Groups", data: JSON.stringify(groups || []), lastUpdated: forceTimestamp },
        { id: "categorizations_data", type: "Categorizations", data: JSON.stringify(categorizations || []), lastUpdated: forceTimestamp },
        { id: "gradeSettings_data", type: "GradeSettings", data: JSON.stringify(gradeSettings), lastUpdated: forceTimestamp },
        { id: "classes_data", type: "Classes", data: JSON.stringify(classes), lastUpdated: forceTimestamp },
        { id: "teacher_info_data", type: "TeacherInfo", data: JSON.stringify(teacherInfo), lastUpdated: forceTimestamp },
        { id: "schedule_data", type: "Schedule", data: JSON.stringify(schedule || {}), lastUpdated: forceTimestamp },
        { id: "periodTimes_data", type: "PeriodTimes", data: JSON.stringify(periodTimes || []), lastUpdated: forceTimestamp },
        { id: "certSettings_data", type: "CertSettings", data: JSON.stringify(certificateSettings || {}), lastUpdated: forceTimestamp },
        { id: "hiddenClasses_data", type: "HiddenClasses", data: JSON.stringify(hiddenClasses || []), lastUpdated: forceTimestamp },
      ];

      if (!students || students.length === 0) {
          recordsToSync.push({ id: "students_chunk_0", type: "StudentsChunk", data: "[]", lastUpdated: forceTimestamp });
      } else {
          const CHUNK_SIZE = 100;
          for (let i = 0; i < students.length; i += CHUNK_SIZE) {
            recordsToSync.push({
              id: `students_chunk_${i}`, 
              type: "StudentsChunk", 
              data: JSON.stringify(students.slice(i, i + CHUNK_SIZE)), 
              lastUpdated: forceTimestamp 
            });
          }
      }

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'sync', teacherPhone: teacherUniqueId, records: recordsToSync })
      });

      const result = await response.json();
      if (result.status === 'success') {
        alert(t('alertPushSuccess'));
      } else { throw new Error("Server Error"); }
    } catch (error) {
      alert(t('alertSyncError'));
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================================
  // 📥 2. زر الجلب المباشر
  // ==========================================
  const handleDownloadFromCloud = async () => {
    if (!teacherInfo.civilId) return alert(t('alertEnterCivilId'));
    if (!confirm(t('alertConfirmPull'))) return;

    setIsDownloading(true);
    try {
      const cleanId = teacherInfo.civilId.trim();
      const teacherUniqueId = "id_" + cleanId;

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'sync', teacherPhone: teacherUniqueId, records: [] }) 
      });

      const result = await response.json();

      if (result.status === 'success' && result.records && result.records.length > 0) {
        let incomingChunks: any[] = [];
        let hasData = false;

        let newAssessmentTools = assessmentTools;
        let newGroups = groups;
        let newCategorizations = categorizations;
        let newGradeSettings = gradeSettings;
        let newClasses = classes;
        let newTeacherInfo = teacherInfo;
        let newSchedule = schedule;
        let newPeriodTimes = periodTimes;
        let newCertificateSettings = certificateSettings;
        let newHiddenClasses = hiddenClasses;
        let newStudents = students;

        result.records.forEach((serverRec: any) => {
            hasData = true;
            try {
                const parsedData = JSON.parse(serverRec.data);
                
                if (serverRec.id === "tools_data") newAssessmentTools = parsedData;
                if (serverRec.id === "groups_data") newGroups = parsedData;
                if (serverRec.id === "categorizations_data") newCategorizations = parsedData;
                if (serverRec.id === "gradeSettings_data") newGradeSettings = parsedData;
                if (serverRec.id === "classes_data") newClasses = parsedData;
                if (serverRec.id === "teacher_info_data") newTeacherInfo = parsedData;
                
                if (serverRec.id === "schedule_data") newSchedule = parsedData;
                if (serverRec.id === "periodTimes_data") newPeriodTimes = parsedData;
                if (serverRec.id === "certSettings_data") newCertificateSettings = parsedData;
                if (serverRec.id === "hiddenClasses_data") newHiddenClasses = parsedData;

                if (serverRec.type === "StudentsChunk") {
                  incomingChunks.push({id: serverRec.id, data: parsedData});
                }
            } catch (e) { console.error("Error parsing", e); }
        });

        if (incomingChunks.length > 0) {
            incomingChunks.sort((a, b) => {
                const numA = parseInt(a.id.replace('students_chunk_', ''));
                const numB = parseInt(b.id.replace('students_chunk_', ''));
                return numA - numB;
            });
            newStudents = incomingChunks.reduce((acc, chunk) => acc.concat(chunk.data), []);
            
            const uniqueStudentsMap = new Map();
            newStudents.forEach((student: any) => {
                if (student && student.id) {
                    uniqueStudentsMap.set(student.id, student);
                }
            });
            newStudents = Array.from(uniqueStudentsMap.values());
            
        } else if (hasData) {
            newStudents = []; 
        }

        if (hasData) {
            const dataToSave = {
              version: '3.8.7',
              timestamp: new Date().toISOString(),
              students: newStudents,
              classes: newClasses,
              hiddenClasses: newHiddenClasses,
              groups: newGroups,
              schedule: newSchedule,
              periodTimes: newPeriodTimes,
              teacherInfo: newTeacherInfo,
              assessmentTools: newAssessmentTools,
              certificateSettings: newCertificateSettings,
              categorizations: newCategorizations,
              gradeSettings: newGradeSettings 
            };

            const jsonString = JSON.stringify(dataToSave, null, 2);

            if (Capacitor.isNativePlatform() || (window as any).electron !== undefined) {
                await Filesystem.writeFile({ path: 'raseddatabasev2.json', data: jsonString, directory: Directory.Data, encoding: Encoding.UTF8 });
            }

            setStudents(newStudents);
            setClasses(newClasses);
            setAssessmentTools(newAssessmentTools);
            setTeacherInfo(newTeacherInfo);

            alert(t('alertPullSuccess'));
            setTimeout(() => window.location.reload(), 1500);
        } else {
            alert(t('alertNoDataForId'));
        }
      } else { 
        alert(t('alertNoDataInCloud')); 
      }
    } catch (error) {
      alert(t('alertSyncError'));
    } finally {
      setIsDownloading(false);
    }
  };

  // ✅ الدوال الأساسية للنسخ الاحتياطي
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
     <header className={`shrink-0 z-40 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 w-full transition-all duration-300 bg-transparent ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
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

          {/* 🚀 بطاقة المزامنة السحابية */}
          <div className={`rounded-[2.5rem] p-8 relative overflow-hidden border transition-colors ${isRamadan ? 'bg-[#1e1b4b]/80 border-indigo-500/30 shadow-[0_0_50px_rgba(79,70,229,0.2)]' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 shadow-[0_10px_40px_-15px_rgba(79,70,229,0.15)]'}`}>
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full -mr-20 -mt-20 blur-3xl ${isRamadan ? 'bg-indigo-500/20' : 'bg-indigo-400/20'}`}></div>
            <div className="flex flex-col items-start gap-6 relative z-10">
              <div className="flex items-center gap-5">
                <Icon3DSync isRamadan={isRamadan} />
                <div>
                  <h2 className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-indigo-900'}`}>{t('syncTitle')}</h2>
                  <p className={`text-xs font-bold mt-1 ${isRamadan ? 'text-indigo-200' : 'text-indigo-600/70'}`}>{t('syncSubtitle')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <button 
                  onClick={handleUploadToCloud} 
                  disabled={isUploading || isDownloading} 
                  className={`w-full px-6 py-5 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${isRamadan ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}
                >
                  {isUploading ? <Loader2 className="animate-spin w-5 h-5" /> : <CloudUpload className="w-5 h-5" />}
                  {isUploading ? t('pushingBtn') : t('pushBtn')}
                </button>

                <button 
                  onClick={handleDownloadFromCloud} 
                  disabled={isUploading || isDownloading} 
                  className={`w-full px-6 py-5 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${isRamadan ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'}`}
                >
                  {isDownloading ? <Loader2 className="animate-spin w-5 h-5" /> : <CloudDownload className="w-5 h-5" />}
                  {isDownloading ? t('pullingBtn') : t('pullBtn')}
                </button>
              </div>
              <div className={`text-[10px] font-bold px-2 ${isRamadan ? 'text-indigo-300' : 'text-indigo-700/60'}`}>
                {t('syncNote1')}<br/>
                {t('syncNote2')}
              </div>
            </div>
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
