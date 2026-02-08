
import React, { useRef, useState } from 'react';
import { Save, Upload, Trash2, AlertTriangle, Database, Download, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const Settings: React.FC = () => {
  const { 
    students, setStudents,
    classes, setClasses,
    groups, setGroups,
    schedule, setSchedule,
    periodTimes, setPeriodTimes,
    teacherInfo, setTeacherInfo,
    assessmentTools, setAssessmentTools,
    certificateSettings, setCertificateSettings,
    hiddenClasses, setHiddenClasses
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<'backup' | 'restore' | 'reset' | null>(null);

  const handleBackup = async () => {
    setLoading('backup');
    try {
      const dataToSave = {
        version: '3.6.0',
        timestamp: new Date().toISOString(),
        students,
        classes,
        hiddenClasses,
        groups,
        schedule,
        periodTimes,
        teacherInfo,
        assessmentTools,
        certificateSettings
      };

      const fileName = `Rased_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const jsonString = JSON.stringify(dataToSave, null, 2);

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: 'نسخة احتياطية - راصد',
          url: result.uri,
          dialogTitle: 'حفظ ملف البيانات',
        });
      } else {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      alert('تم إنشاء النسخة الاحتياطية بنجاح ✅');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في ملف النسخة الاحتياطية. هل أنت متأكد؟')) {
        if(fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setLoading('restore');
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.students && Array.isArray(data.students)) {
          setStudents(data.students);
          setClasses(data.classes || []);
          if(data.hiddenClasses) setHiddenClasses(data.hiddenClasses);
          if(data.groups) setGroups(data.groups);
          if(data.schedule) setSchedule(data.schedule);
          if(data.periodTimes) setPeriodTimes(data.periodTimes);
          if(data.teacherInfo) setTeacherInfo(data.teacherInfo);
          if(data.assessmentTools) setAssessmentTools(data.assessmentTools);
          if(data.certificateSettings) setCertificateSettings(data.certificateSettings);
          
          alert('تم استعادة البيانات بنجاح ✅\nيرجى إعادة تشغيل التطبيق لضمان عمل كل شيء بشكل صحيح.');
      } else {
          throw new Error('الملف غير صالح');
      }
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء استعادة البيانات. تأكد من اختيار ملف صحيح.');
    } finally {
      setLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFactoryReset = async () => {
      if (confirm('⚠️ تحذير شديد ⚠️\n\nهل أنت متأكد تماماً من حذف جميع البيانات؟\nسيتم حذف الطلاب، الدرجات، الجدول، وكل شيء.\nلا يمكن التراجع عن هذه الخطوة!')) {
          // Double check
          if (confirm('تأكيد نهائي: هل تريد حذف كل شيء والبدء من جديد؟')) {
              setLoading('reset');
              try {
                  setStudents([]);
                  setClasses([]);
                  setHiddenClasses([]);
                  
                  setGroups([
                    { id: 'g1', name: 'الصقور', color: 'emerald' }, 
                    { id: 'g2', name: 'النمور', color: 'orange' }, 
                    { id: 'g3', name: 'النجوم', color: 'purple' }, 
                    { id: 'g4', name: 'الرواد', color: 'blue' }
                  ]);
                  
                  setSchedule([
                    { dayName: 'الأحد', periods: Array(8).fill('') }, { dayName: 'الاثنين', periods: Array(8).fill('') }, 
                    { dayName: 'الثلاثاء', periods: Array(8).fill('') }, { dayName: 'الأربعاء', periods: Array(8).fill('') }, 
                    { dayName: 'الخميس', periods: Array(8).fill('') }
                  ]);
                  
                  setPeriodTimes(Array(8).fill(null).map((_, i) => ({ periodNumber: i + 1, startTime: '', endTime: '' })));
                  
                  setTeacherInfo({ name: '', school: '', subject: '', governorate: '', avatar: '', stamp: '', ministryLogo: '', academicYear: '' });
                  setAssessmentTools([]);
                  
                  localStorage.clear();
                  
                  if (Capacitor.isNativePlatform()) {
                     await Filesystem.deleteFile({
                         path: 'rased_database_v2.json',
                         directory: Directory.Data
                     }).catch(() => {});
                  }

                  alert('تم حذف جميع البيانات وإعادة تعيين التطبيق.');
                  window.location.reload();
              } catch (e) {
                  console.error(e);
                  alert('حدث خطأ أثناء الحذف');
              } finally {
                  setLoading(null);
              }
          }
      }
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 2️⃣ New Royal Blue Header */}
        <header className="bg-[#446A8D] text-white pt-12 pb-6 px-6  shadow-lg relative z-10 -mx-4 -mt-4 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 active:scale-95 transition-all">
                        <ArrowRight className="w-5 h-5 text-white" />
                    </button>
                    
                    <div>
                        <h1 className="text-2xl font-black tracking-wide">إدارة البيانات</h1>
                        <p className="text-[10px] text-blue-200 font-bold opacity-80">النسخ الاحتياطي والاستعادة</p>
                    </div>
                </div>
                
                <div className="opacity-20">
                    <Database className="w-12 h-12 text-white" />
                </div>
            </div>
        </header>

        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
            
            {/* Backup Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Download size={20}/></div>
                    <h3 className="font-black text-lg text-slate-800">النسخ الاحتياطي</h3>
                </div>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    قم بإنشاء نسخة احتياطية من جميع بياناتك (الطلاب، الدرجات، الجدول، الإعدادات) وحفظها كملف آمن.
                </p>
                <button 
                    onClick={handleBackup} 
                    disabled={loading !== null}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    {loading === 'backup' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    إنشاء نسخة احتياطية الآن
                </button>
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* Restore Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Upload size={20}/></div>
                    <h3 className="font-black text-lg text-slate-800">استعادة البيانات</h3>
                </div>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    استرجاع البيانات من ملف نسخة احتياطية سابق. سيتم استبدال البيانات الحالية بالبيانات الموجودة في الملف.
                </p>
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={loading !== null}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    {loading === 'restore' ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    استعادة من ملف
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleRestore} 
                    accept=".json" 
                    className="hidden" 
                />
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* Reset Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><AlertTriangle size={20}/></div>
                    <h3 className="font-black text-lg text-slate-800">منطقة الخطر</h3>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-rose-700 leading-relaxed mb-4">
                        حذف جميع البيانات وإعادة ضبط المصنع. هذا الإجراء لا يمكن التراجع عنه وسيؤدي لفقدان جميع البيانات المسجلة.
                    </p>
                    <button 
                        onClick={handleFactoryReset} 
                        disabled={loading !== null}
                        className="w-full py-3 bg-white border border-rose-200 text-rose-600 rounded-xl font-black text-xs hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        {loading === 'reset' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        حذف كل شيء وإعادة الضبط
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
};

export default Settings;
