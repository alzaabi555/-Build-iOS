import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Save, Cloud, DownloadCloud, UploadCloud, 
  CheckCircle2, AlertTriangle, RefreshCw, LogOut, Clock, 
  ShieldCheck, Smartphone, Share2, Trash2
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const Settings: React.FC = () => {
  const { teacherInfo, setTeacherInfo, students, setStudents, classes, schedule, periodTimes } = useApp();
  
  // تحديد نوع الجهاز بدقة
  const platform = Capacitor.getPlatform(); // 'ios', 'android', 'web'
  const isIOS = platform === 'ios';
  const isCloudSupported = platform !== 'ios'; // السحابة مدعومة في كل شيء ما عدا الآيفون حالياً

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastCloudUpdate, setLastCloudUpdate] = useState<string>('غير معروف');
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user && isCloudSupported) checkLastUpdate(user.uid);
    });
    return () => unsubscribe();
  }, []);

  const checkLastUpdate = async (uid: string) => {
      try {
          const docSnap = await getDoc(doc(db, 'users', uid));
          if (docSnap.exists() && docSnap.data().lastUpdated) {
              const date = new Date(docSnap.data().lastUpdated);
              setLastCloudUpdate(date.toLocaleString('ar-EG'));
          }
      } catch (e) {}
  };

  // ☁️ دوال السحابة (للأندرويد والويندوز)
  const handleCloudAction = async (action: 'upload' | 'download') => {
    if (!currentUser) {
        // محاولة تسجيل دخول ويب (للأندرويد والويندوز)
        try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch(e) { console.error(e); }
        return;
    }

    if (!window.confirm(action === 'upload' ? 'رفع البيانات للسحابة؟' : 'استبدال البيانات من السحابة؟')) return;

    setIsSyncing(true);
    setSyncMessage('جاري الاتصال...');

    try {
        if (action === 'upload') {
            const fullData = { teacherInfo, students, classes, schedule, periodTimes, lastUpdated: new Date().toISOString() };
            await setDoc(doc(db, 'users', currentUser.uid), fullData);
            setSyncMessage('✅ تم الرفع بنجاح!');
            setLastCloudUpdate(new Date().toLocaleString('ar-EG'));
        } else {
            const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.students) { setStudents(data.students); localStorage.setItem('rased_students', JSON.stringify(data.students)); }
                if (data.classes) localStorage.setItem('classes', JSON.stringify(data.classes));
                if (data.schedule) localStorage.setItem('schedule', JSON.stringify(data.schedule));
                if (data.teacherInfo) setTeacherInfo(prev => ({...prev, ...data.teacherInfo}));
                setSyncMessage('✅ تم الاسترجاع!');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                throw new Error('لا توجد بيانات');
            }
        }
        setSyncStatus('success');
    } catch (error: any) {
        setSyncStatus('error');
        setSyncMessage(`فشل: ${error.message}`);
    } finally {
        setIsSyncing(false);
    }
  };

  // 📱 دوال النسخ المحلي (للآيفون)
  const handleLocalBackup = async () => {
      setIsSyncing(true);
      setSyncMessage('جاري تحضير الملف...');
      try {
          const backupData = {
              teacherInfo, students, classes, schedule, periodTimes,
              exportDate: new Date().toISOString(),
              appVersion: '3.7.3'
          };
          const fileName = `backup_rased_${Date.now()}.json`;
          
          // 1. كتابة الملف في الذاكرة المؤقتة
          await Filesystem.writeFile({
              path: fileName,
              data: JSON.stringify(backupData),
              directory: Directory.Cache,
              encoding: Encoding.UTF8
          });

          // 2. مشاركة الملف (حفظ في الملفات أو إرسال واتساب)
          const result = await Filesystem.getUri({
              directory: Directory.Cache,
              path: fileName
          });

          await Share.share({
              title: 'نسخة احتياطية - راصد',
              text: 'ملف النسخة الاحتياطية لتطبيق راصد',
              url: result.uri,
              dialogTitle: 'حفظ النسخة الاحتياطية'
          });

          setSyncStatus('success');
          setSyncMessage('✅ تم تصدير النسخة بنجاح');
      } catch (error: any) {
          console.error(error);
          setSyncStatus('error');
          setSyncMessage('فشل التصدير'); // قد يكون المستخدم ألغى المشاركة
      } finally {
          setIsSyncing(false);
      }
  };

  const handleFactoryReset = async () => {
      if (window.confirm("⚠️ تحذير خطير:\nسيتم حذف جميع الطلاب والبيانات من هذا الهاتف نهائياً.\nهل أنت متأكد؟")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">الإعدادات</h2>
          <p className="text-slate-500 text-sm font-bold">
            {isIOS ? 'نسخة الآيفون (تخزين محلي)' : 'إدارة البيانات والمزامنة'}
          </p>
        </div>
      </header>

      {/* 🟢 قسم الأندرويد والويندوز (سحابي) */}
      {isCloudSupported && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100 relative overflow-hidden mb-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center"><Cloud className="w-6 h-6 text-indigo-600" /></div>
                    <div><h3 className="text-lg font-bold text-slate-800">المزامنة السحابية</h3><p className="text-xs text-slate-500 font-bold">{currentUser ? 'متصل ✅' : 'غير متصل'}</p></div>
                </div>
                <div className="text-left hidden sm:block">
                    <div className="flex items-center gap-1 justify-end text-slate-400 text-[10px] font-bold"><Clock className="w-3 h-3" /> آخر تحديث:</div>
                    <div className="text-xs font-black text-indigo-600 dir-ltr">{lastCloudUpdate}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => handleCloudAction('upload')} disabled={isSyncing} className="flex items-center justify-center gap-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-all active:scale-95 group">
                    <UploadCloud className="w-6 h-6 text-indigo-600" />
                    <div className="text-right"><span className="block text-sm font-black text-indigo-900">رفع للسحابة</span></div>
                </button>
                <button onClick={() => handleCloudAction('download')} disabled={isSyncing} className="flex items-center justify-center gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition-all active:scale-95 group">
                    <DownloadCloud className="w-6 h-6 text-emerald-600" />
                    <div className="text-right"><span className="block text-sm font-black text-emerald-900">استعادة من السحابة</span></div>
                </button>
            </div>
            {syncMessage && <div className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${syncStatus === 'success' ? 'bg-emerald-100 text-emerald-800' : syncStatus === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100'}`}>{isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : syncStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{syncMessage}</div>}
        </div>
      )}

      {/* 🍎 قسم الآيفون (محلي) */}
      {isIOS && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden mb-6">
              <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center"><Smartphone className="w-6 h-6 text-orange-600" /></div>
                  <div><h3 className="text-lg font-bold text-slate-800">التخزين المحلي</h3><p className="text-xs text-slate-500 font-bold">البيانات محفوظة على هذا الآيفون</p></div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  <button onClick={handleLocalBackup} disabled={isSyncing} className="flex items-center justify-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95">
                      <Share2 className="w-6 h-6 text-slate-600" />
                      <div className="text-right">
                          <span className="block text-sm font-black text-slate-900">تصدير نسخة احتياطية</span>
                          <span className="block text-[10px] text-slate-500 font-bold">حفظ ملف البيانات أو مشاركته</span>
                      </div>
                  </button>
                  
                  <button onClick={handleFactoryReset} className="flex items-center justify-center gap-3 p-4 rounded-xl border border-rose-100 bg-rose-50 hover:bg-rose-100 transition-all active:scale-95">
                      <Trash2 className="w-6 h-6 text-rose-600" />
                      <div className="text-right">
                          <span className="block text-sm font-black text-rose-900">حذف جميع البيانات</span>
                          <span className="block text-[10px] text-rose-500 font-bold">إعادة ضبط المصنع</span>
                      </div>
                  </button>
              </div>
              {syncMessage && <div className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${syncStatus === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100'}`}>{syncMessage}</div>}
          </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-black text-sm text-slate-800 mb-4">بيانات المعلم</h3>
        <div className="space-y-3">
            <div><label className="block text-xs font-bold text-slate-500 mb-1">الاسم</label><input type="text" value={teacherInfo.name} onChange={(e) => setTeacherInfo({...teacherInfo, name: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-bold text-slate-700" /></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1">المدرسة</label><input type="text" value={teacherInfo.school} onChange={(e) => setTeacherInfo({...teacherInfo, school: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-bold text-slate-700" /></div>
        </div>
      </div>
      
      {!isIOS && <div className="pt-4"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 py-4 rounded-xl font-bold border border-rose-100 hover:bg-rose-100 transition-colors"><LogOut className="w-5 h-5" /> تسجيل الخروج</button></div>}
    </div>
  );
};

export default Settings;
