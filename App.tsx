import React, { useState, useEffect } from 'react';
// 💉 1. حقن ملف التوكنات الأصلي (الذي يحتوي على ألوان وهوية المعلم)
import './theme/tokens.css';

// 💉 2. حقن ملف الستايل الأساسي للمعلم
import './index.css'; 

import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './theme/ThemeProvider';

// 🚀 Icons
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, CheckSquare, Library, CloudSync,
  Fingerprint, School, ArrowLeft, ShieldCheck, AlertCircle, Unlock
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// 🧱 Components
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import TeacherTasks from './components/TeacherTasks';
import AttendanceTracker from './components/AttendanceTracker';
import GradeBook from './components/GradeBook';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Leaderboard from './components/Leaderboard';
import About from './components/About';
import UserGuide from './components/UserGuide';
import BrandLogo from './components/BrandLogo';
import WelcomeScreen from './components/WelcomeScreen';
import StudentGroups from './components/StudentGroups';
import TeacherLibrary from './components/TeacherLibrary';
import GlobalSyncManager from './components/GlobalSyncManager'; 
// 💉 تم استدعاء شاشة مركز القيادة للمعلم الأول
import SeniorDashboard from './components/SeniorDashboard'; 
// 🎙️ 1. استدعاء المساعد الصوتي الخارق
import VoiceAssistant from './components/VoiceAssistant';

import { useSchoolBell } from './hooks/useSchoolBell';

// 🌍 The New Global Layout Engine
import { AppLayout } from './components/layout/AppLayout';

// ==================================================================
// 🛡️ شاشة تسجيل الدخول الأمنية (نظام حماية المعلم)
// ==================================================================
const TeacherLoginScreen: React.FC<{
  onLogin: () => void;
  teacherInfo: any;
  setTeacherInfo: any;
}> = ({ onLogin, teacherInfo, setTeacherInfo }) => {
  // 💉 الحقول دائماً فارغة لحماية الخصوصية من أعين المتطفلين
  const [civilId, setCivilId] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const savedCivilId = localStorage.getItem('rased_teacher_civil_id');
  const savedSchoolCode = localStorage.getItem('rased_admin_school_code');
  const isFirstTime = !savedCivilId || !savedSchoolCode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!civilId || !schoolCode) return;
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      if (isFirstTime) {
        // 💉 المرة الأولى: تسجيل وحفظ القفل
        localStorage.setItem('rased_teacher_civil_id', civilId.trim());
        localStorage.setItem('rased_admin_school_code', schoolCode.trim());
        if (setTeacherInfo) {
          setTeacherInfo((prev: any) => ({ ...prev, civilId: civilId.trim() }));
        }
        setIsLoading(false);
        onLogin();
      } else {
        // 💉 المرات القادمة: المطابقة مع القفل المخزن
        if (civilId.trim() === savedCivilId && schoolCode.trim() === savedSchoolCode) {
          setIsLoading(false);
          onLogin();
        } else {
          setIsLoading(false);
          setErrorMsg('بيانات الدخول غير مطابقة! الرجاء التأكد من رقمك الخاص  وكود المدرسة.');
        }
      }
    }, 800);
  };

  // 💉 ميزة الطوارئ (فك الارتباط دون مسح البيانات)
  const handleResetLock = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في فك قفل التطبيق؟ لن يتم مسح بيانات طلابك ودرجاتك، سيتم فقط السماح لك بتسجيل بيانات دخول جديدة.')) {
      localStorage.removeItem('rased_teacher_civil_id');
      localStorage.removeItem('rased_admin_school_code');
      setCivilId('');
      setSchoolCode('');
      setErrorMsg('');
      alert('تم إعادة ضبط قفل التطبيق بنجاح. يمكنك الآن تسجيل بيانات جديدة.');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center font-sans overflow-hidden relative px-6" dir="rtl"
         style={{ backgroundColor: "#0f172a", backgroundImage: `radial-gradient(at 0% 0%, #1e1b4b 0px, transparent 50%), radial-gradient(at 100% 100%, #312e81 0px, transparent 50%)` }}>
      <main className="w-full max-w-md relative z-10 flex flex-col items-center">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center p-5 rounded-2xl bg-white/10 backdrop-blur-md mb-6 shadow-2xl border border-white/10">
            {isFirstTime ? <School className="w-12 h-12 text-indigo-400" /> : <ShieldCheck className="w-12 h-12 text-emerald-400" />}
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">راصد المعلم</h1>
          <p className="text-indigo-200 font-bold tracking-wide text-sm">
            {isFirstTime ? 'إعداد قفل التطبيق لأول مرة' : 'بوابة الدخول الآمن'}
          </p>
        </div>

        <div className="w-full bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-white/90 px-1 text-right">الدخول برقمك الخاص </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-indigo-300"><Fingerprint className="w-6 h-6" /></div>
                <input type="number" value={civilId} onChange={(e) => setCivilId(e.target.value)} className="block w-full pr-14 pl-4 py-4 bg-white/10 border border-white/20 rounded-2xl focus:ring-4 focus:ring-indigo-500/30 text-white font-black text-lg outline-none text-left placeholder:text-indigo-200/50" placeholder="أدخل الرقم" required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-white/90 px-1 text-right">كود المدرسة</label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-amber-300"><School className="w-6 h-6" /></div>
                <input type="text" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} className="block w-full pr-14 pl-4 py-4 bg-white/10 border border-white/20 rounded-2xl focus:ring-4 focus:ring-amber-500/30 text-white font-black text-lg outline-none text-left placeholder:text-amber-200/50 uppercase" placeholder="مثال: 1234" required />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/50 p-3 rounded-xl text-rose-300 text-xs font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            <button type="submit" disabled={isLoading || !civilId || !schoolCode} className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-70">
              {isLoading ? <Loader2 className="animate-spin" /> : <><span>{isFirstTime ? 'تأكيد وحفظ القفل' : 'دخول آمن'}</span><ArrowLeft className="w-5 h-5" /></>}
            </button>
          </form>

          {/* 💉 ميزة استعادة الطوارئ تظهر فقط إذا كان التطبيق مقفلاً */}
          {!isFirstTime && (
            <div className="mt-8 text-center border-t border-white/10 pt-6">
              <button onClick={handleResetLock} className="text-[11px] font-bold text-indigo-300 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors">
                <Unlock className="w-3.5 h-3.5" /> هل نسيت بيانات القفل؟ اضغط هنا
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};


// ------------------------------------------------------------------
// BUSINESS LOGIC & ROUTING ONLY (No UI styling clutter here)
// ------------------------------------------------------------------

const AppContent: React.FC = () => {
  const {
    isDataLoaded, students, setStudents, classes, setClasses,
    teacherInfo, setTeacherInfo, schedule, setSchedule,
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester,
    t, dir
  } = useApp();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [appVersion, setAppVersion] = useState('4.4.1');
  
  // 💉 حالة تسجيل الدخول أصبحت false دائماً لتجبر المعلم على المطابقة عند كل فتح للتطبيق
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const [showWelcome, setShowWelcome] = useState<boolean>(() => !localStorage.getItem('rased_welcome_seen'));
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => localStorage.getItem('bell_enabled') === 'true');

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        if (window.electron && window.electron.getAppVersion) {
          const ver = await window.electron.getAppVersion();
          setAppVersion(ver);
        } else if (Capacitor.isNativePlatform()) {
          const info = await CapacitorApp.getInfo();
          setAppVersion(info.version);
        }
      } catch (error) { console.error("Version error", error); }
    };
    fetchVersion();
  }, []);

  useSchoolBell(periodTimes, schedule, notificationsEnabled);

  const handleToggleNotifications = () => {
    setNotificationsEnabled(prev => {
      const newState = !prev;
      localStorage.setItem('bell_enabled', String(newState));
      return newState;
    });
  };

  const handleFinishWelcome = () => {
    localStorage.setItem('rased_welcome_seen', 'true');
    setShowWelcome(false);
  };

  // 💉 إضافة زر "إدارة القسم" في القائمة السفلية (يظهر فقط للمعلم الأول)
  const mobileNavItems = [
    { id: 'dashboard', label: t('navDashboard') || (dir === 'rtl' ? 'الرئيسية' : 'Dashboard'), IconComponent: LayoutDashboard },
    ...(teacherInfo?.role === 'senior' ? [{ id: 'senior_dashboard', label: dir === 'rtl' ? 'القيادة' : 'Leader', IconComponent: ShieldCheck }] : []),
    { id: 'attendance', label: t('navAttendance') || (dir === 'rtl' ? 'الغياب' : 'Attendance'), IconComponent: CalendarCheck },
    { id: 'students', label: t('navStudents') || (dir === 'rtl' ? 'الطلاب' : 'Students'), IconComponent: Users },
    { id: 'grades', label: t('navGrades') || (dir === 'rtl' ? 'الدرجات' : 'Grades'), IconComponent: BarChart3 },
    { id: 'tasks', label: t('navTasks') || t('tasks') || (dir === 'rtl' ? 'المهام' : 'Tasks'), IconComponent: CheckSquare },
  ];
  
  // 💉 إضافة زر "إدارة القسم" في القائمة الجانبية (يظهر فقط للمعلم الأول)
  const desktopNavItems = [
    { id: 'dashboard', label: t('navDashboard') || (dir === 'rtl' ? 'الرئيسية' : 'Dashboard'), icon: LayoutDashboard },
    ...(teacherInfo?.role === 'senior' ? [{ id: 'senior_dashboard', label: dir === 'rtl' ? 'إدارة القسم' : 'Dept. Admin', icon: ShieldCheck }] : []),
    { id: 'attendance', label: t('navAttendance') || (dir === 'rtl' ? 'الغياب' : 'Attendance'), icon: CalendarCheck },
    { id: 'students', label: t('navStudents') || (dir === 'rtl' ? 'الطلاب' : 'Students'), icon: Users },
    { id: 'groups', label: t('navGroups') || (dir === 'rtl' ? 'المجموعات' : 'Groups'), icon: Users },
    { id: 'grades', label: t('navGrades') || (dir === 'rtl' ? 'الدرجات' : 'Grades'), icon: BarChart3 },
    { id: 'tasks', label: t('navTasks') || t('tasks') || (dir === 'rtl' ? 'المهام' : 'Tasks'), icon: CheckSquare },
    { id: 'library', label: t('navLibrary') || t('library') || (dir === 'rtl' ? 'المكتبة' : 'Library'), icon: Library },
    { id: 'leaderboard', label: t('navKnights') || (dir === 'rtl' ? 'الفرسان' : 'Leaderboard'), icon: Medal },
    { id: 'reports', label: t('navReports') || (dir === 'rtl' ? 'التقارير' : 'Reports'), icon: FileText },
    { id: 'sync', label: t('navSync') || (dir === 'rtl' ? 'مزامنة السحابة' : 'Cloud Sync'), icon: CloudSync },
    { id: 'guide', label: t('navGuide') || (dir === 'rtl' ? 'الدليل' : 'Guide'), icon: BookOpen },
    { id: 'settings', label: t('navSettings') || (dir === 'rtl' ? 'الإعدادات' : 'Settings'), icon: SettingsIcon },
    { id: 'about', label: t('navAbout') || (dir === 'rtl' ? 'حول' : 'About'), icon: Info },
  ];

  if (!isDataLoaded) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center fixed inset-0 z-[99999] bg-bgMain" dir={dir}>
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="font-medium text-sm text-textSecondary">{t('loadingData') || (dir === 'rtl' ? 'جاري تحميل البيانات...' : 'Loading Data...')}</p>
      </div>
    );
  }

  // 🛡️ بوابة الأمن: تظهر دائماً حتى يطابق المعلم بياناته بنجاح
  if (!isLoggedIn) {
    return <TeacherLoginScreen onLogin={() => setIsLoggedIn(true)} teacherInfo={teacherInfo} setTeacherInfo={setTeacherInfo} />;
  }

  if (showWelcome) return <WelcomeScreen onFinish={handleFinishWelcome} />;

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
          students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({ ...prev, ...i }))}
          schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={() => { }} onNavigate={handleNavigate}
          onOpenSettings={() => setActiveTab('settings')} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes}
          notificationsEnabled={notificationsEnabled} onToggleNotifications={handleToggleNotifications}
          currentSemester={currentSemester} onSemesterChange={setCurrentSemester}
        />;
      // 💉 المسار الجديد: شاشة مركز القيادة للمعلم الأول
      case 'senior_dashboard': return <SeniorDashboard />;
      case 'tasks': return <TeacherTasks students={students} teacherSubject={teacherInfo?.subject || 'عام'} />;
      case 'library': return <TeacherLibrary />;
      case 'attendance': return <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />;
      case 'students':
        return <StudentList
          students={students} classes={classes} onAddClass={(n) => setClasses(p => [...p, n])} 
          onAddStudentManually={(n, c, p, a, g, cid) => setStudents(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: n, classes: [c], attendance: [], behaviors: [], grades: [], grade: '', parentPhone: p, avatar: a, gender: g || 'male', parentCode: cid }])}
          onBatchAddStudents={(newS) => setStudents(prev => [...prev, ...newS])} 
          onUpdateStudent={(u) => setStudents(p => p.map(s => s.id === u.id ? u : s))}
          onDeleteStudent={(id) => setStudents(p => p.filter(s => s.id !== id))} 
          onViewReport={() => {}} currentSemester={currentSemester} onSemesterChange={setCurrentSemester} 
          onDeleteClass={(cn) => setClasses(p => p.filter(c => c !== cn))}
        />;
      case 'groups': return <StudentGroups />;
      case 'grades': return <GradeBook students={students} classes={classes} onUpdateStudent={(u) => setStudents(p => p.map(s => s.id === u.id ? u : s))} setStudents={setStudents} currentSemester={currentSemester} onSemesterChange={setCurrentSemester} teacherInfo={teacherInfo} />;
      case 'leaderboard': return <Leaderboard students={students} classes={classes} onUpdateStudent={(u) => setStudents(p => p.map(s => s.id === u.id ? u : s))} teacherInfo={teacherInfo} />;
      case 'reports': return <Reports />;
      case 'sync': return <GlobalSyncManager />;
      case 'guide': return <UserGuide />;
      case 'settings': return <Settings />;
      case 'about': return <About />;
      default: return null;
    }
  };

  return (
    <AppLayout
      dir={dir}
      activeTab={activeTab}
      onNavigate={handleNavigate}
      desktopNavItems={desktopNavItems}
      mobileNavItems={mobileNavItems}
      Logo={<BrandLogo style={{ width: '100%', height: '100%', objectFit: 'contain' }} showText={false} />}
      appName={t('appNameMain') || 'راصد'}
      appSubtitle={t('appSubtitleMain') || 'النسخة المتقدمة'}
    >
      {renderContent()}
      
      {/* 🎙️ 2. زراعة الكبسولة وتمرير مفاتيح التنقل لها */}
      <VoiceAssistant onNavigate={handleNavigate} />
      
    </AppLayout>
  );
};

// 🌟 Wrap the app with BOTH Context Providers
const App: React.FC = () => (
  <ThemeProvider>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </ThemeProvider>
);

export default App;
