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

// ✅ أيقونات 3D فخمة بتدرجات محسنة
const Icon3DProfile = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="gradP" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="50" cy="35" r="18" fill="url(#gradP)" filter="url(#glow)" />
    <path d="M20 85 Q50 100 80 85 V75 Q50 55 20 75 Z" fill="url(#gradP)" />
  </svg>
);

const Icon3DDatabase = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="gradD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" /></linearGradient>
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

  // ✅ 2. استعادة البيانات (تم إصلاح الأقواس المتداخلة هنا)
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

                // 2. الحفظ الفوري في ملف النظام (لضمان بقاء البيانات بعد الريلود)
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
                    // ... (بقية الـ localStorage للويب)
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
    <div className="flex flex-col h-full bg-[#fcfdfe] pb-24 text-right px-6 pt-12" dir="rtl">
      
      {/* العنوان الرئيسي */}
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">الإعدادات</h1>
        <p className="text-slate-400 text-sm font-bold mt-2 flex items-center gap-2">
            <span className="w-8 h-1 bg-blue-500 rounded-full inline-block"></span>
            تخصيص الهوية وإدارة الأمان المحلي
        </p>
      </div>

      <div className="space-y-8 max-w-4xl">
        
        {/* بطاقة الملف الشخصي */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-50 transition-transform hover:scale-[1.01]">
          <div className="flex items-center gap-5 mb-6">
            <Icon3DProfile />
            <div>
                <h2 className="text-xl font-black text-slate-800">الملف الشخصي</h2>
                <p className="text-xs text-slate-400 font-bold">تعديل بيانات المعلم في التقارير والشهادات</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">اسم المعلم</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100 outline-none text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="اسمك الكريم" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">اسم المدرسة</label>
                <input value={school} onChange={e => setSchool(e.target.value)} className="w-full bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100 outline-none text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="اسم المدرسة" />
            </div>
          </div>
          <button onClick={() => setTeacherInfo({ ...teacherInfo, name, school })} className="mt-6 w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Save size={18} />
            حفظ البيانات الشخصية
          </button>
        </div>

        {/* بطاقة إدارة البيانات (النسخ الاحتياطي والاستعادة) */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-emerald-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="flex items-center gap-5 mb-8 relative z-10">
            <Icon3DDatabase />
            <div>
              <h2 className="text-xl font-black text-slate-800">إدارة قاعدة البيانات</h2>
              <p className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg mt-1 inline-block">حفظ واستعادة البيانات يدوياً (JSON)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
            <button onClick={handleBackup} disabled={loading !== null} className="group flex flex-col items-center justify-center p-7 rounded-[2.2rem] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-2xl shadow-emerald-200 active:scale-95 transition-all">
              {loading === 'backup' ? <Loader2 className="w-9 h-9 animate-spin mb-3" /> : <Database className="w-9 h-9 mb-3" />}
              <span className="font-black text-sm">إنشاء نسخة احتياطية</span>
              <span className="text-[10px] mt-1 opacity-80 font-bold">تصدير كافة البيانات لملف خارجي</span>
            </button>
            
            <button onClick={() => fileInputRef.current?.click()} disabled={loading !== null} className="group flex flex-col items-center justify-center p-7 rounded-[2.2rem] bg-white border-2 border-emerald-100 text-emerald-700 active:scale-95 transition-all shadow-sm">
              {loading === 'restore' ? <Loader2 className="w-9 h-9 animate-spin mb-3 text-emerald-500" /> : <RefreshCw className="w-9 h-9 mb-3 text-emerald-500" />}
              <span className="font-black text-sm">استيراد من ملف</span>
              <span className="text-[10px] mt-1 text-slate-400 font-bold">استبدال البيانات الحالية من ملف سابق</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
        </div>

        {/* بطاقة الصيانة والمسح */}
        <div className="bg-rose-50/30 rounded-[2.5rem] p-8 border border-rose-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-500 shadow-inner">
                <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">منطقة الخطر</h2>
              <p className="text-xs text-rose-400 font-bold">إجراءات لا يمكن التراجع عنها</p>
            </div>
          </div>
          <p className="text-[11px] text-rose-700 font-bold mb-4 px-2">في حال واجهت بطء شديد أو أردت بدء العام الدراسي من الصفر، يمكنك مسح كافة البيانات المخزنة على هذا الجهاز.</p>
          <button onClick={handleFactoryReset} disabled={loading !== null} className="w-full py-4 bg-white border-2 border-rose-100 text-rose-500 rounded-2xl font-black text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2 shadow-sm">
            {loading === 'reset' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            إعادة ضبط المصنع (حذف كل شيء)
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;
