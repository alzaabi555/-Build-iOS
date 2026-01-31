import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Save, Cloud, DownloadCloud, UploadCloud, 
  CheckCircle2, AlertTriangle, RefreshCw, LogOut, Clock, WifiOff, Wifi 
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
// ✅ هذا الملف للآيفون، لذا نحتاج هذه المكتبات (عكس الويندوز)
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

const Settings: React.FC = () => {
  const { teacherInfo, setTeacherInfo, students, setStudents, classes, schedule, periodTimes } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastCloudUpdate, setLastCloudUpdate] = useState<string>('غير معروف');
  
  // حالة الاتصال اللحظية
  const [isConnected, setIsConnected] = useState<boolean>(!!auth.currentUser);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(auth.currentUser?.email || null);

  // مراقبة حالة الاتصال وتحديث الواجهة فوراً
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsConnected(!!user);
      setCurrentUserEmail(user?.email || null);
      if (user) checkLastUpdate(user.uid);
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

  // 🔌 وظيفة الإصلاح اليدوي (لحل مشكلة Offline في الآيفون)
  const handleManualConnect = async () => {
    setIsSyncing(true);
    setSyncMessage('جاري الاتصال بجوجل...');
    
    try {
      // 1. استدعاء جوجل الأصلي
      const googleUser = await GoogleAuth.signIn();
      
      // 2. تسليم التوكن لفايربيس (هذه الخطوة المفقودة)
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      await signInWithCredential(auth, credential);
      
      setSyncStatus('success');
      setSyncMessage('✅ تم الاتصال بنجاح! أنت الآن أونلاين.');
    } catch (error: any) {
      console.error(error);
      setSyncStatus('error');
      setSyncMessage(`فشل الاتصال: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // ☁️ الرفع
  const handleUploadToCloud = async () => {
    if (!auth.currentUser) {
       // إذا لم يكن متصلاً، نشغل وظيفة الإصلاح بدلاً من الخطأ
       return handleManualConnect();
    }

    if (!window.confirm('⚠️ هل أنت متأكد من رفع بيانات هذا الهاتف للسحابة؟')) return;

    setIsSyncing(true);
    setSyncMessage('جاري الرفع...');
    
    try {
      const fullData = {
        teacherInfo, students, classes, schedule, periodTimes,
        lastUpdated: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', auth.currentUser.uid), fullData);
      setSyncStatus('success');
      setSyncMessage('✅ تم الرفع بنجاح!');
      setLastCloudUpdate(new Date().toLocaleString('ar-EG'));
    } catch (error: any) {
      setSyncStatus('error');
      setSyncMessage(`فشل الرفع: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // ☁️ السحب
  const handleDownloadFromCloud = async () => {
    if (!auth.currentUser) {
       return handleManualConnect();
    }

    if (!window.confirm('⚠️ هل تريد استبدال بيانات الهاتف ببيانات السحابة؟')) return;

    setIsSyncing(true);
    setSyncMessage('جاري السحب...');

    try {
      const docSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.students) {
            setStudents(data.students);
            localStorage.setItem('rased_students', JSON.stringify(data.students));
        }
        if (data.classes) localStorage.setItem('classes', JSON.stringify(data.classes));
        if (data.schedule) localStorage.setItem('schedule', JSON.stringify(data.schedule));
        if (data.teacherInfo) setTeacherInfo(prev => ({...prev, ...data.teacherInfo}));
        
        setSyncStatus('success');
        setSyncMessage('✅ تم الاسترجاع! سيتم التحديث...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncStatus('error');
        setSyncMessage('⚠️ لا توجد بيانات في السحابة.');
      }
    } catch (error: any) {
      setSyncStatus('error');
      setSyncMessage(`فشل: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
      if (window.confirm("تسجيل الخروج؟")) {
          await signOut(auth);
          try { await GoogleAuth.signOut(); } catch(e) {}
          localStorage.clear();
          window.location.reload();
      }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">الإعدادات</h2>
          <p className="text-slate-500 text-sm font-bold">إدارة المزامنة (آيفون)</p>
        </div>
      </header>

      {/* لوحة التحكم */}
      <div className={`rounded-2xl p-6 shadow-sm border relative overflow-hidden ${isConnected ? 'bg-white border-indigo-100' : 'bg-orange-50 border-orange-200'}`}>
        
        {/* شريط الحالة العلوي */}
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConnected ? 'bg-indigo-50' : 'bg-orange-100'}`}>
                    {isConnected ? <Wifi className="w-6 h-6 text-indigo-600" /> : <WifiOff className="w-6 h-6 text-orange-600" />}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">حالة الاتصال</h3>
                    <p className={`text-xs font-bold ${isConnected ? 'text-indigo-600' : 'text-orange-600'}`}>
                    {isConnected ? `متصل: ${currentUserEmail}` : 'غير متصل (Offline)'}
                    </p>
                </div>
            </div>
            {isConnected && (
                <div className="text-left hidden sm:block">
                    <div className="flex items-center gap-1 justify-end text-slate-400 text-[10px] font-bold"><Clock className="w-3 h-3" /> آخر نسخة:</div>
                    <div className="text-xs font-black text-indigo-600 dir-ltr">{lastCloudUpdate}</div>
                </div>
            )}
        </div>

        {/* 🚨 زر الطوارئ: يظهر فقط إذا كنت أوفلاين */}
        {!isConnected && (
            <button 
                onClick={handleManualConnect}
                disabled={isSyncing}
                className="w-full mb-4 flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 animate-pulse"
            >
                {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />}
                <span>اضغط هنا لتفعيل الاتصال بالسحابة</span>
            </button>
        )}

        {/* أزرار المزامنة (تعمل فقط عند الاتصال) */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isConnected ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <button onClick={handleUploadToCloud} className="flex items-center justify-center gap-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-all active:scale-95">
            <UploadCloud className="w-6 h-6 text-indigo-600" />
            <div className="text-right"><span className="block text-sm font-black text-indigo-900">رفع للسحابة</span></div>
          </button>

          <button onClick={handleDownloadFromCloud} className="flex items-center justify-center gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition-all active:scale-95">
            <DownloadCloud className="w-6 h-6 text-emerald-600" />
            <div className="text-right"><span className="block text-sm font-black text-emerald-900">سحب من السحابة</span></div>
          </button>
        </div>

        {syncMessage && <div className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${syncStatus === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100'}`}>{syncMessage}</div>}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-4">
        <h3 className="font-black text-sm text-slate-800 mb-4">بيانات المعلم</h3>
        <div className="space-y-3">
            <div><label className="block text-xs font-bold text-slate-500 mb-1">الاسم</label><input type="text" value={teacherInfo.name} onChange={(e) => setTeacherInfo({...teacherInfo, name: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-bold text-slate-700" /></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1">المدرسة</label><input type="text" value={teacherInfo.school} onChange={(e) => setTeacherInfo({...teacherInfo, school: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm font-bold text-slate-700" /></div>
        </div>
      </div>
      
      <div className="pt-4"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 py-4 rounded-xl font-bold border border-rose-100"><LogOut className="w-5 h-5" /> تسجيل الخروج</button></div>
    </div>
  );
};

export default Settings;
