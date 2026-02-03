import React, { useRef, useState } from 'react';
import { Save, Upload, Trash2, AlertTriangle, Database, Download, RefreshCw, Loader2, ServerCog, Shield } from 'lucide-react';
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
        students, classes, hiddenClasses, groups, schedule, periodTimes, teacherInfo, assessmentTools, certificateSettings
      };
      const fileName = `Rased_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const jsonString = JSON.stringify(dataToSave, null, 2);

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({ path: fileName, data: jsonString, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: 'نسخة احتياطية - راصد', url: result.uri });
      } else {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); document.body.removeChild(link);
      }
      alert('تم إنشاء النسخة الاحتياطية بنجاح ✅');
    } catch (error) { console.error(error); alert('حدث خطأ أثناء النسخ الاحتياطي'); } finally { setLoading(null); }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!confirm('سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في الملف. هل أنت متأكد؟')) { if(fileInputRef.current) fileInputRef.current.value = ''; return; }
    setLoading('restore');
    try {
      const text = await file.text(); const data = JSON.parse(text);
      if (data.students && Array.isArray(data.students)) {
          setStudents(data.students); setClasses(data.classes || []); if(data.hiddenClasses) setHiddenClasses(data.hiddenClasses); if(data.groups) setGroups(data.groups); if(data.schedule) setSchedule(data.schedule); if(data.periodTimes) setPeriodTimes(data.periodTimes); if(data.teacherInfo) setTeacherInfo(data.teacherInfo); if(data.assessmentTools) setAssessmentTools(data.assessmentTools); if(data.certificateSettings) setCertificateSettings(data.certificateSettings);
          alert('تم استعادة البيانات بنجاح ✅\nيرجى إعادة تشغيل التطبيق لضمان عمل كل شيء بشكل صحيح.');
      } else { throw new Error('الملف غير صالح'); }
    } catch (error) { console.error(error); alert('ملف النسخة الاحتياطية غير صالح أو تالف.'); } finally { setLoading(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleFactoryReset = async () => {
      if (confirm('⚠️ تحذير شديد ⚠️\n\nهل أنت متأكد تماماً من حذف جميع البيانات؟\nهذا الإجراء لا يمكن التراجع عنه!')) {
          if (confirm('تأكيد نهائي: هل تريد حذف كل شيء والبدء من جديد؟')) {
              setLoading('reset');
              try {
                  setStudents([]); setClasses([]); setHiddenClasses([]);
                  setGroups([{ id: 'g1', name: 'الصقور', color: 'emerald' }, { id: 'g2', name: 'النمور', color: 'orange' }]);
                  setSchedule([{ dayName: 'الأحد', periods: Array(8).fill('') }, { dayName: 'الاثنين', periods: Array(8).fill('') }, { dayName: 'الثلاثاء', periods: Array(8).fill('') }, { dayName: 'الأربعاء', periods: Array(8).fill('') }, { dayName: 'الخميس', periods: Array(8).fill('') }]);
                  setPeriodTimes(Array(8).fill(null).map((_, i) => ({ periodNumber: i + 1, startTime: '', endTime: '' })));
                  setTeacherInfo({ name: '', school: '', subject: '', governorate: '', avatar: '', stamp: '', ministryLogo: '', academicYear: '' });
                  setAssessmentTools([]);
                  localStorage.clear();
                  if (Capacitor.isNativePlatform()) { await Filesystem.deleteFile({ path: 'rased_database_v2.json', directory: Directory.Data }).catch(() => {}); }
                  alert('تم حذف جميع البيانات وإعادة تعيين التطبيق.'); window.location.reload();
              } catch (e) { console.error(e); alert('حدث خطأ أثناء الحذف'); } finally { setLoading(null); }
          }
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
        
        {/* ================= HEADER (Blue & Curved) ================= */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-6 pt-[env(safe-area-inset-top)] pb-8 transition-all duration-300">
            <div className="flex items-center gap-3 mt-4">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                    <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-wide">إدارة البيانات</h1>
                    <p className="text-[10px] text-blue-200 font-bold opacity-80">النسخ الاحتياطي والاستعادة</p>
                </div>
            </div>
        </div>

        {/* ================= CONTENT AREA ================= */}
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
            
            <div className="w-full h-[140px] shrink-0"></div>

            <div className="px-4 pb-24">
                <div className="space-y-6">
                    
                    {/* Backup Card */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Download size={24}/></div>
                            <div>
                                <h3 className="font-black text-lg text-slate-900">النسخ الاحتياطي</h3>
                                <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">حفظ جميع بياناتك (الطلاب، الدرجات، الإعدادات) في ملف واحد آمن.</p>
                            </div>
                        </div>
                        <button onClick={handleBackup} disabled={loading !== null} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                            {loading === 'backup' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            إنشاء نسخة احتياطية الآن
                        </button>
                    </div>

                    {/* Restore Card */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><Upload size={24}/></div>
                            <div>
                                <h3 className="font-black text-lg text-slate-900">استعادة البيانات</h3>
                                <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">استرجاع بياناتك من ملف سابق. <span className="text-rose-500">سيتم استبدال البيانات الحالية.</span></p>
                            </div>
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} disabled={loading !== null} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                            {loading === 'restore' ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            اختيار ملف للاستعادة
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleRestore} accept=".json" className="hidden" />
                    </div>

                    {/* Danger Zone Card */}
                    <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-inner relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-rose-600" />
                            <h3 className="font-black text-lg text-rose-700">منطقة الخطر</h3>
                        </div>
                        <p className="text-xs font-bold text-rose-600/80 mb-6 leading-relaxed">
                            حذف جميع البيانات وإعادة ضبط المصنع. هذا الإجراء لا يمكن التراجع عنه وسيؤدي لفقدان جميع البيانات المسجلة نهائياً.
                        </p>
                        <button onClick={handleFactoryReset} disabled={loading !== null} className="w-full py-3 bg-white border-2 border-rose-200 text-rose-600 rounded-xl font-black text-xs hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center justify-center gap-2 shadow-sm">
                            {loading === 'reset' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            حذف كل شيء وإعادة الضبط
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default Settings;
