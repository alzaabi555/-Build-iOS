import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, AlertTriangle, FileJson, Trash2, 
  Download, RefreshCw, Loader2, Zap, Database, ArrowRight, Cloud, CheckCircle, XCircle 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import Modal from './Modal';

// ⚠️ استبدل هذا الرابط برابط الـ API السري الذي حصلت عليه من Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXUII_Q_6K6TuewJ0k44mi8mCB-6LQNbDo9rhVdaVOvYCyKFRNCBuddLe_PyLorCdT/exec";

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

// ✅ مكون المزامنة السحابية (مدمج كأيقونة 3D)
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
    groups, setGroups, categorizations, setCategorizations, gradeSettings, setGradeSettings
  } = useApp();

  const [name, setName] = useState(teacherInfo?.name || '');
  const [school, setSchool] = useState(teacherInfo?.school || '');
  const [loading, setLoading] = useState<'backup' | 'restore' | 'reset' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حالات المزامنة السحابية
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // 🌙 المستشعر الرمضاني اللحظي (يمنع الوميض تماماً)
  const [isRamadan] = useState(() => {
      try {
          const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' }).formatToParts(new Date());
          return parseInt(parts.find(p => p.type === 'month')?.value || '0') === 9;
      } catch(e) {
          return false;
      }
  });

  useEffect(() => {
      setName(teacherInfo?.name || '');
      setSchool(teacherInfo?.school || '');
  }, [teacherInfo]);

  // ==========================================
  // 🚀 محرك المزامنة السحابية (The Cloud Sync Engine)
  // ==========================================
  const handleCloudSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      if (!teacherInfo.name) {
        alert("يرجى إدخال اسم المعلم أولاً في الملف الشخصي ليتم استخدامه كمعرف للمزامنة.");
        setIsSyncing(false);
        return;
      }

      // 1. المعرف الفريد للمعلم (استخدمنا اسم المعلم أو رقمه إن وجد)
      const teacherId = "teacher_" + teacherInfo.name.replace(/\s+/g, '_');

      // 2. جلب التوقيت المحلي لآخر تعديل (تعديل: إذا لم يوجد ختم، نضعه 0 للسماح بالسحب)
      let localLastUpdated = Number(localStorage.getItem('lastLocalUpdate'));
      if (!localLastUpdated) {
        localLastUpdated = 0; // ✅ التعديل المطلوب: البدء من الصفر للأجهزة الجديدة
      }

      // 3. تغليف البيانات في الكبسولات السحابية (DataJSON)
      const recordsToSync = [
        { id: "students_data", type: "Students", data: JSON.stringify(students), lastUpdated: localLastUpdated },
        { id: "tools_data", type: "Tools", data: JSON.stringify(assessmentTools), lastUpdated: localLastUpdated },
        { id: "groups_data", type: "Groups", data: JSON.stringify(groups || []), lastUpdated: localLastUpdated },
        { id: "categorizations_data", type: "Categorizations", data: JSON.stringify(categorizations || []), lastUpdated: localLastUpdated },
        { id: "gradeSettings_data", type: "GradeSettings", data: JSON.stringify(gradeSettings), lastUpdated: localLastUpdated },
        { id: "classes_data", type: "Classes", data: JSON.stringify(classes), lastUpdated: localLastUpdated },
        { id: "teacher_info_data", type: "TeacherInfo", data: JSON.stringify(teacherInfo), lastUpdated: localLastUpdated },
      ];

      // 4. إرسال الكبسولات إلى جوجل شيت
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'sync',
          teacherPhone: teacherId,
          records: recordsToSync
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        // 5. استقبال البيانات من السحابة وفك تشفيرها
        let updatedLocally = false;

        result.records.forEach((serverRec: any) => {
          // "الأحدث يفوز": إذا كانت السحابة تحمل نسخة أحدث من جهازك، قم بتحديث جهازك!
          if (serverRec.lastUpdated > localLastUpdated) {
            const parsedData = JSON.parse(serverRec.data);
            
            if (serverRec.id === "students_data") setStudents(parsedData);
            if (serverRec.id === "tools_data") setAssessmentTools(parsedData);
            if (serverRec.id === "groups_data") setGroups(parsedData);
            if (serverRec.id === "categorizations_data") setCategorizations(parsedData);
            if (serverRec.id === "gradeSettings_data") setGradeSettings(parsedData);
            if (serverRec.id === "classes_data") setClasses(parsedData);
            if (serverRec.id === "teacher_info_data") setTeacherInfo(parsedData);
            
            // تحديث التوقيت المحلي ليتطابق مع السحابة
            localStorage.setItem('lastLocalUpdate', serverRec.lastUpdated.toString());
            updatedLocally = true;
          }
        });
        
        setSyncStatus('success');
        alert(updatedLocally ? "✅ تمت المزامنة بنجاح! تم سحب التحديثات من السحابة إلى جهازك." : "✅ تمت المزامنة! بياناتك الحالية هي الأحدث ورفعت للسحابة.");
      } else {
        throw new Error("فشل المزامنة من السيرفر");
      }

    } catch (error) {
      console.error("Sync Error:", error);
      setSyncStatus('error');
      alert("❌ حدث خطأ أثناء المزامنة. تأكد من اتصالك بالإنترنت ومن صحة رابط السكربت.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };


  // ✅ 1. إنشاء نسخة احتياطية محلية
  const handleBackup = async () => {
    setLoading('backup');
    try {
      const dataToSave = {
        version: '3.8.7',
        timestamp: new Date().toISOString(),
        students, classes, hiddenClasses, groups,
        schedule, periodTimes, teacherInfo,
        assessmentTools, certificateSettings, categorizations
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

  // ✅ 2. استعادة البيانات محلياً
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
                if(data.categorizations) setCategorizations(data.categorizations);
                if(data.schedule) setSchedule(data.schedule);
                if(data.periodTimes) setPeriodTimes(data.periodTimes);
                if(data.teacherInfo) setTeacherInfo(data.teacherInfo);
                if(data.assessmentTools) setAssessmentTools(data.assessmentTools);
                if(data.certificateSettings) setCertificateSettings(data.certificateSettings);
                
                // تحديث الختم الزمني ليعتبر هذا التحديث هو الأحدث للسحابة
                localStorage.setItem('lastLocalUpdate', Date.now().toString());

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
      
      {/* العنوان الرئيسي (تمت إضافة md:pl-40 والسحب) */}
      <div 
          className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700 md:pl-40" 
          style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div style={{ WebkitAppRegion: 'no-drag' } as any}>
            <h1 className={`text-4xl font-black tracking-tight ${isRamadan ? 'text-white' : 'text-slate-900'}`}>الإعدادات</h1>
            <p className={`text-sm font-bold mt-2 flex items-center gap-2 ${isRamadan ? 'text-indigo-200/70' : 'text-slate-400'}`}>
                <span className={`w-8 h-1 rounded-full inline-block ${isRamadan ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                تخصيص الهوية وإدارة البيانات السحابية والمحلية
            </p>
        </div>
      </div>

      <div className="space-y-8 max-w-4xl relative z-10 pb-10">
        
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


        {/* 🚀 بطاقة المزامنة السحابية (جديد) */}
        <div className={`rounded-[2.5rem] p-8 relative overflow-hidden border transition-colors ${isRamadan ? 'bg-[#1e1b4b]/80 backdrop-blur-2xl border-indigo-500/30 shadow-[0_0_50px_rgba(79,70,229,0.2)]' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 shadow-[0_10px_40px_-15px_rgba(79,70,229,0.15)]'}`}>
          <div className={`absolute top-0 right-0 w-40 h-40 rounded-full -mr-20 -mt-20 blur-3xl ${isRamadan ? 'bg-indigo-500/20' : 'bg-indigo-400/20'}`}></div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <Icon3DSync isRamadan={isRamadan} />
              <div>
                <h2 className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-indigo-900'}`}>المزامنة السحابية الذكية</h2>
                <p className={`text-xs font-bold mt-1 ${isRamadan ? 'text-indigo-200' : 'text-indigo-600/70'}`}>مزامنة بياناتك بين الأندرويد والويندوز بضغطة زر</p>
              </div>
            </div>
            
            <button 
              onClick={handleCloudSync} 
              disabled={isSyncing}
              className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${
                syncStatus === 'success' ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30' :
                syncStatus === 'error' ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30' :
                isRamadan ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-900/50' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : 
               syncStatus === 'success' ? <CheckCircle className="w-5 h-5" /> :
               syncStatus === 'error' ? <XCircle className="w-5 h-5" /> :
               <Cloud className="w-5 h-5" />}
              {isSyncing ? 'جاري الاتصال بالسحابة...' : 
               syncStatus === 'success' ? 'تمت المزامنة بنجاح' :
               syncStatus === 'error' ? 'فشل الاتصال حاول مجدداً' : 'مزامنة البيانات الآن'}
            </button>
          </div>
        </div>


        {/* بطاقة النسخ المحلي */}
        <div className={`rounded-[2.5rem] p-8 border transition-colors ${isRamadan ? 'bg-[#0f172a]/60 backdrop-blur-2xl border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white border-emerald-50 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]'}`}>
          <div className="flex items-center gap-5 mb-8">
            <Icon3DDatabase isRamadan={isRamadan} />
            <div>
              <h2 className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>النسخ الاحتياطي المحلي</h2>
              <p className={`text-xs font-bold px-2 py-1 rounded-lg mt-1 inline-block ${isRamadan ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>حفظ واستعادة البيانات يدوياً (ملف JSON)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
