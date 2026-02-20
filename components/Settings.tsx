import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, AlertTriangle, FileJson, Trash2, 
  Download, RefreshCw, Loader2, Zap, Database, ArrowRight 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import Modal from './Modal';

// ✅ أيقونات 3D فخمة بتدرجات محسنة تستشعر رمضان
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
    groups, setGroups
  } = useApp();

  const [name, setName] = useState(teacherInfo?.name || '');
  const [school, setSchool] = useState(teacherInfo?.school || '');
  const [loading, setLoading] = useState<'backup' | 'restore' | 'reset' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🌙 المستشعر الرمضاني
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

  useEffect(() => {
      setName(teacherInfo?.name || '');
      setSchool(teacherInfo?.school || '');
  }, [teacherInfo]);

  // ✅ 1. إنشاء نسخة احتياطية
  const handleBackup = async () => {
    setLoading('backup');
    try {
      const dataToSave = {
        version: '3.8.7',
        timestamp: new Date().toISOString(),
        students, classes, hiddenClasses, groups,
        schedule, periodTimes, teacherInfo,
        assessmentTools, certificateSettings
      };

      const fileName = `Rased_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const jsonString = JSON.stringify(dataToSave, null, 2);

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache, // استخدام Cache للمشاركة
          encoding: Encoding.UTF8,
        });
        await Share.share({ title: 'نسخة احتياطية - راصد', url: result.uri });
      } else {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      alert("✅ تم تصدير النسخة الاحتياطية بنجاح");
    } catch (error) {
      console.error(error);
      alert("❌ حدث خطأ أثناء التصدير");
    } finally {
      setLoading(null);
    }
  };

  // ✅ 2. استعادة البيانات
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('سيتم استبدال جميع البيانات الحالية ببيانات الملف المختار. هل أنت متأكد؟')) {
        if(fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setLoading('restore');
    const reader = new FileReader();
    
    reader.onload = async (event) => {
        try {
            const jsonString = event.target?.result as string;
            const data = JSON.parse(jsonString);

            if (data.students && Array.isArray(data.students)) {
                // 1. تحديث الحالة (Context)
                setStudents(data.students);
                setClasses(data.classes || []);
                if(data.hiddenClasses) setHiddenClasses(data.hiddenClasses);
                if(data.groups) setGroups(data.groups);
                if(data.schedule) setSchedule(data.schedule);
                if(data.periodTimes) setPeriodTimes(data.periodTimes);
                if(data.teacherInfo) setTeacherInfo(data.teacherInfo);
                if(data.assessmentTools) setAssessmentTools(data.assessmentTools);
                if(data.certificateSettings) setCertificateSettings(data.certificateSettings);

                // 2. الحفظ الفوري في ملف النظام
                const isHeavyEnvironment = Capacitor.isNativePlatform() || (window as any).electron !== undefined;
                
                if (isHeavyEnvironment) {
                    await Filesystem.writeFile({
                        path: 'raseddatabasev2.json', // نفس اسم الملف في AppContext
                        data: jsonString,
                        directory: Directory.Data,
                        encoding: Encoding.UTF8
                    });
                } else {
                    // للويب
                    localStorage.setItem('studentData', JSON.stringify(data.students));
                }

                alert("✅ تم استعادة البيانات بنجاح! سيتم إعادة تشغيل التطبيق.");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                throw new Error('الملف غير صالح');
            }
        } catch (error) {
            console.error("Import Error:", error);
            alert("❌ الملف غير صالح أو تالف");
        } finally {
            setLoading(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    reader.readAsText(file);
  };

  // ✅ 3. إعادة ضبط المصنع
  const handleFactoryReset = async () => {
      if (confirm('⚠️ تحذير نهائي: سيتم حذف جميع الطلاب والدرجات والإعدادات بشكل دائم. هل تريد الاستمرار؟')) {
          setLoading('reset');
          try {
              localStorage.clear();
              // حذف الملف الفعلي من النظام
              if (Capacitor.isNativePlatform() || (window as any).electron) {
                  await Filesystem.deleteFile({
                      path: 'raseddatabasev2.json',
                      directory: Directory.Data
                  }).catch(() => {});
              }
              alert('تم مسح البيانات بنجاح 🚀');
              window.location.reload();
          } catch (e) {
              alert('حدث خطأ أثناء مسح البيانات');
          } finally {
              setLoading(null);
          }
      }
  };

  return (
    <div className={`flex flex-col h-full pb-24 text-right px-6 pt-12 transition-colors duration-500 relative z-10 ${isRamadan ? 'text-white' : 'bg-[#fcfdfe] text-slate-800'}`} dir="rtl">
      
      {/* العنوان الرئيسي */}
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className={`text-4xl font-black tracking-tight ${isRamadan ? 'text-white' : 'text-slate-900'}`}>الإعدادات</h1>
        <p className={`text-sm font-bold mt-2 flex items-center gap-2 ${isRamadan ? 'text-indigo-200/70' : 'text-slate-400'}`}>
            <span className={`w-8 h-1 rounded-full inline-block ${isRamadan ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
            تخصيص الهوية وإدارة الأمان المحلي
        </p>
      </div>

      <div className="space-y-8 max-w-4xl relative z-10">
        
        {/* بطاقة الملف الشخصي */}
        <div className={`rounded-[2.5rem] p-8 transition-all duration-300 hover:scale-[1.01] border ${isRamadan ? 'bg-[#0f172a]/60 backdrop-blur-2xl border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-50 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]'}`}>
          <div className="flex items-center gap-5 mb-6">
            <Icon3DProfile isRamadan={isRamadan} />
            <div>
                <h2 className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>الملف الشخصي</h2>
                <p className={`text-xs font-bold ${isRamadan ? 'text-indigo-200/70' : 'text-slate-400'}`}>تعديل بيانات المعلم في التقارير والشهادات</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className={`text-[10px] font-black mr-2 uppercase ${isRamadan ? 'text-indigo-300' : 'text-slate-400'}`}>اسم المعلم</label>
                <input value={name} onChange={e => setName(e.target.value)} className={`w-full rounded-2xl px-5 py-4 border outline-none text-sm font-bold transition-all ${isRamadan ? 'bg-white/5 border-white/10 focus:border-amber-500 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-100 focus:ring-4 focus:ring-blue-500/5 text-slate-800'}`} placeholder="اسمك الكريم" />
            </div>
            <div className="space-y-2">
                <label className={`text-[10px] font-black mr-2 uppercase ${isRamadan ? 'text-indigo-300' : 'text-slate-400'}`}>اسم المدرسة</label>
                <input value={school} onChange={e => setSchool(e.target.value)} className={`w-full rounded-2xl px-5 py-4 border outline-none text-sm font-bold transition-all ${isRamadan ? 'bg-white/5 border-white/10 focus:border-amber-500 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-100 focus:ring-4 focus:ring-blue-500/5 text-slate-800'}`} placeholder="اسم المدرسة" />
            </div>
          </div>
          <button onClick={() => setTeacherInfo({ ...teacherInfo, name, school })} className={`mt-6 w-full py-4 rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${isRamadan ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-900/50' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-200'}`}>
            <Save size={18} />
            حفظ البيانات الشخصية
          </button>
        </div>

        {/* بطاقة إدارة البيانات */}
        <div className={`rounded-[2.5rem] p-8 relative overflow-hidden border transition-colors ${isRamadan ? 'bg-[#0f172a]/60 backdrop-blur-2xl border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white border-emerald-50 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]'}`}>
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl ${isRamadan ? 'bg-emerald-500/10' : 'bg-emerald-50/50'}`}></div>
          <div className="flex items-center gap-5 mb-8 relative z-10">
            <Icon3DDatabase isRamadan={isRamadan} />
            <div>
              <h2 className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>إدارة قاعدة البيانات</h2>
              <p className={`text-xs font-bold px-2 py-1 rounded-lg mt-1 inline-block ${isRamadan ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>حفظ واستعادة البيانات يدوياً (JSON)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
            <button onClick={handleBackup} disabled={loading !== null} className={`group flex flex-col items-center justify-center p-7 rounded-[2.2rem] text-white active:scale-95 transition-all ${isRamadan ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-900/50' : 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-2xl shadow-emerald-200'}`}>
              {loading === 'backup' ? <Loader2 className="w-9 h-9 animate-spin mb-3" /> : <Database className="w-9 h-9 mb-3" />}
              <span className="font-black text-sm">إنشاء نسخة احتياطية</span>
              <span className="text-[10px] mt-1 opacity-80 font-bold">تصدير كافة البيانات لملف خارجي</span>
            </button>
            
            <button onClick={() => fileInputRef.current?.click()} disabled={loading !== null} className={`group flex flex-col items-center justify-center p-7 rounded-[2.2rem] border-2 active:scale-95 transition-all ${isRamadan ? 'bg-white/5 border-emerald-500/30 text-emerald-400 hover:bg-white/10' : 'bg-white border-emerald-100 text-emerald-700 shadow-sm hover:bg-emerald-50'}`}>
              {loading === 'restore' ? <Loader2 className={`w-9 h-9 animate-spin mb-3 ${isRamadan ? 'text-emerald-400' : 'text-emerald-500'}`} /> : <RefreshCw className={`w-9 h-9 mb-3 ${isRamadan ? 'text-emerald-400' : 'text-emerald-500'}`} />}
              <span className="font-black text-sm">استيراد من ملف</span>
              <span className={`text-[10px] mt-1 font-bold ${isRamadan ? 'text-emerald-200/50' : 'text-slate-400'}`}>استبدال البيانات الحالية من ملف سابق</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
        </div>

        {/* بطاقة الصيانة والمسح */}
        <div className={`rounded-[2.5rem] p-8 border transition-colors ${isRamadan ? 'bg-rose-950/20 backdrop-blur-2xl border-rose-900/50' : 'bg-rose-50/30 border-rose-100'}`}>
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isRamadan ? 'bg-rose-900/50 text-rose-400' : 'bg-rose-100 text-rose-500'}`}>
                <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>منطقة الخطر</h2>
              <p className="text-xs text-rose-400 font-bold">إجراءات لا يمكن التراجع عنها</p>
            </div>
          </div>
          <p className={`text-[11px] font-bold mb-4 px-2 ${isRamadan ? 'text-rose-200/70' : 'text-rose-700'}`}>في حال واجهت بطء شديد أو أردت بدء العام الدراسي من الصفر، يمكنك مسح كافة البيانات المخزنة على هذا الجهاز.</p>
          <button onClick={handleFactoryReset} disabled={loading !== null} className={`w-full py-4 border-2 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${isRamadan ? 'bg-rose-950/50 border-rose-900/50 text-rose-400 hover:bg-rose-900/50' : 'bg-white border-rose-100 text-rose-500 hover:bg-rose-50 shadow-sm'}`}>
            {loading === 'reset' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            إعادة ضبط المصنع (حذف كل شيء)
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;
