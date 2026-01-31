import React, { useState } from 'react';
import { Save, RotateCcw, AlertTriangle, FileJson, UploadCloud, DownloadCloud, User, Smartphone, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import Modal from './Modal';

// ============================================================================
// ✅ أيقونات 3D للإعدادات (خاصة بهذه الصفحة)
// ============================================================================

const Icon3DProfile = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10">
    <defs>
      <linearGradient id="gradProfile" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <filter id="shadowProfile" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.3" />
      </filter>
    </defs>
    <circle cx="50" cy="40" r="15" fill="url(#gradProfile)" filter="url(#shadowProfile)" />
    <path d="M25 80 Q50 90 75 80 V70 Q50 50 25 70 Z" fill="url(#gradProfile)" filter="url(#shadowProfile)" />
    <circle cx="50" cy="40" r="10" fill="white" opacity="0.2" />
  </svg>
);

const Icon3DBackup = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10">
    <defs>
      <linearGradient id="gradBackup" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="shadowBackup" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.3" />
      </filter>
    </defs>
    <path d="M30 60 L50 40 L70 60 M50 40 V80" stroke="url(#gradBackup)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30 60 Q10 60 10 40 Q10 15 40 15 Q50 5 65 15 Q90 15 90 45 Q90 60 70 60" fill="none" stroke="url(#gradBackup)" strokeWidth="5" strokeLinecap="round" filter="url(#shadowBackup)" />
  </svg>
);

const Icon3DRestore = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10">
    <defs>
      <linearGradient id="gradRestore" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <filter id="shadowRestore" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.3" />
      </filter>
    </defs>
    <path d="M30 40 L50 60 L70 40 M50 60 V20" stroke="url(#gradRestore)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 70 Q20 90 50 90 Q80 90 80 70" fill="none" stroke="url(#gradRestore)" strokeWidth="5" strokeLinecap="round" filter="url(#shadowRestore)" />
  </svg>
);

const Icon3DReset = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10">
    <defs>
      <linearGradient id="gradReset" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
      <filter id="shadowReset" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.3" />
      </filter>
    </defs>
    <path d="M25 30 L30 85 Q32 90 38 90 H62 Q68 90 70 85 L75 30" fill="url(#gradReset)" filter="url(#shadowReset)" />
    <rect x="20" y="20" width="60" height="10" rx="3" fill="#ef4444" />
    <path d="M40 45 L60 75 M60 45 L40 75" stroke="white" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const Icon3DInfo = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10">
    <defs>
      <linearGradient id="gradInfo" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <filter id="shadowInfo" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.3" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="40" fill="white" stroke="url(#gradInfo)" strokeWidth="8" filter="url(#shadowInfo)" />
    <path d="M50 30 V35 M50 45 V75" stroke="url(#gradInfo)" strokeWidth="8" strokeLinecap="round" />
  </svg>
);

// ============================================================================

const SettingsPage = () => {
  const { teacherInfo, setTeacherInfo, students, setStudents, assessmentTools, setAssessmentTools } = useApp();
  
  // Local state for editing
  const [name, setName] = useState(teacherInfo.name);
  const [school, setSchool] = useState(teacherInfo.school);
  const [subject, setSubject] = useState(teacherInfo.subject);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Save Profile
  const handleSaveProfile = () => {
    setTeacherInfo({ ...teacherInfo, name, school, subject });
    alert('تم حفظ البيانات بنجاح! ✅');
  };

  // Backup Data (Export JSON)
  const handleBackup = async () => {
    setIsLoading(true);
    try {
      const backupData = {
        version: '1.0',
        date: new Date().toISOString(),
        teacherInfo,
        students,
        assessmentTools
      };
      const fileName = `Rased_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const jsonString = JSON.stringify(backupData, null, 2);

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: 'نسخة احتياطية - راصد',
          url: result.uri,
        });
      } else {
        // Web fallback
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      alert('تم إنشاء النسخة الاحتياطية بنجاح 📦');
    } catch (error) {
      console.error('Backup error:', error);
      alert('حدث خطأ أثناء النسخ الاحتياطي');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore Data (Import JSON)
  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.students && Array.isArray(data.students)) {
        if(confirm('هل أنت متأكد؟ سيتم استبدال البيانات الحالية بالنسخة الاحتياطية.')) {
            setStudents(data.students);
            if (data.teacherInfo) setTeacherInfo(data.teacherInfo);
            if (data.assessmentTools) setAssessmentTools(data.assessmentTools);
            alert('تمت استعادة البيانات بنجاح! 🔄');
        }
      } else {
        alert('ملف غير صالح');
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('حدث خطأ أثناء استعادة البيانات');
    } finally {
      setIsLoading(false);
      if (event.target) event.target.value = '';
    }
  };

  // Reset App
  const handleResetApp = () => {
    if (confirm('تحذير: سيتم حذف جميع الطلاب والدرجات والسجلات. هل أنت متأكد تماماً؟')) {
        setStudents([]);
        setAssessmentTools([]); // Optional: Keep tools or reset them
        localStorage.clear();
        alert('تم تصفير التطبيق بالكامل 🗑️');
        window.location.reload();
    }
    setShowResetModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 font-sans pb-24">
      
      {/* ================= HEADER (Blue & Fixed) ================= */}
      <div className="fixed md:sticky top-0 z-40 bg-[#1e3a8a] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-8 rounded-b-[2.5rem] w-full">
        <div className="flex justify-center items-center mt-4">
          <h1 className="text-2xl font-black tracking-tight drop-shadow-md">الإعدادات</h1>
        </div>
        <div className="text-center mt-2 opacity-80 text-sm font-bold">
            تخصيص التطبيق وإدارة البيانات
        </div>
      </div>

      {/* Spacer for Fixed Header */}
      <div className="w-full h-[140px] shrink-0"></div>

      {/* ================= CONTENT ================= */}
      <div className="px-4 space-y-6 -mt-6 relative z-10">

        {/* 1. Profile Section */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-50 p-2 rounded-2xl border border-blue-100">
                    <Icon3DProfile />
                </div>
                <h2 className="text-lg font-black text-slate-800">بيانات المعلم</h2>
            </div>
            
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 mr-1">الاسم الكريم</label>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-3 border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-colors">
                        <User className="w-4 h-4 text-slate-400" />
                        <input value={name} onChange={e => setName(e.target.value)} className="bg-transparent w-full text-sm font-bold text-slate-900 outline-none" placeholder="أدخل اسمك" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 mr-1">المدرسة</label>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-3 border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-colors">
                        <Smartphone className="w-4 h-4 text-slate-400" />
                        <input value={school} onChange={e => setSchool(e.target.value)} className="bg-transparent w-full text-sm font-bold text-slate-900 outline-none" placeholder="اسم المدرسة" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 mr-1">المادة الدراسية</label>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-3 border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-colors">
                        <FileJson className="w-4 h-4 text-slate-400" />
                        <input value={subject} onChange={e => setSubject(e.target.value)} className="bg-transparent w-full text-sm font-bold text-slate-900 outline-none" placeholder="المادة (مثال: رياضيات)" />
                    </div>
                </div>
                <button onClick={handleSaveProfile} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> حفظ البيانات
                </button>
            </div>
        </div>

        {/* 2. Data Management Section */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-xl">💾</span> النسخ الاحتياطي
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
                <button onClick={handleBackup} disabled={isLoading} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 active:scale-95 transition-all group">
                    <div className="mb-2 transform group-hover:scale-110 transition-transform"><Icon3DBackup /></div>
                    <span className="text-xs font-black text-emerald-700">حفظ نسخة</span>
                    <span className="text-[9px] font-bold text-emerald-500/70 mt-1">تصدير ملف</span>
                </button>

                <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50 border border-amber-100 hover:bg-amber-100 active:scale-95 transition-all group">
                    <div className="mb-2 transform group-hover:scale-110 transition-transform"><Icon3DRestore /></div>
                    <span className="text-xs font-black text-amber-700">استعادة</span>
                    <span className="text-[9px] font-bold text-amber-500/70 mt-1">استيراد ملف</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleRestore} accept=".json" className="hidden" />
            </div>
        </div>

        {/* 3. Danger Zone */}
        <div className="bg-rose-50 rounded-[2rem] p-5 border border-rose-100">
            <h2 className="text-lg font-black text-rose-800 mb-4 flex items-center gap-2">
                <span className="text-xl">⚠️</span> منطقة الخطر
            </h2>
            <button onClick={() => setShowResetModal(true)} className="w-full py-4 bg-white border border-rose-200 rounded-2xl flex items-center justify-between px-4 hover:bg-rose-100 active:scale-95 transition-all group">
                <div className="flex items-center gap-3">
                    <Icon3DReset />
                    <div className="text-right">
                        <span className="block text-xs font-black text-rose-700">تصفير التطبيق</span>
                        <span className="block text-[9px] font-bold text-rose-400">حذف جميع البيانات والطلاب</span>
                    </div>
                </div>
                <AlertTriangle className="w-5 h-5 text-rose-400 group-hover:text-rose-600 animate-pulse" />
            </button>
        </div>

        {/* 4. App Info */}
        <div className="text-center pb-4">
            <div className="w-12 h-12 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                <Icon3DInfo />
            </div>
            <h3 className="font-black text-slate-400 text-sm">راصد التعليمي</h3>
            <p className="text-[10px] font-bold text-slate-300">الإصدار 3.6.0</p>
        </div>

      </div>

      {/* Confirmation Modal for Reset */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} className="max-w-xs rounded-[2rem]">
          <div className="text-center p-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                  <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="font-black text-xl text-slate-900 mb-2">هل أنت متأكد؟</h3>
              <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
                  سيتم حذف جميع الطلاب، الدرجات، وسجلات الحضور. <br/> <span className="text-rose-600">لا يمكن التراجع عن هذا الإجراء!</span>
              </p>
              <div className="flex gap-2">
                  <button onClick={() => setShowResetModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-200">إلغاء</button>
                  <button onClick={handleResetApp} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-xs hover:bg-rose-700 shadow-lg shadow-rose-200">نعم، حذف الكل</button>
              </div>
          </div>
      </Modal>

    </div>
  );
};

export default SettingsPage;
