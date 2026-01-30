import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, Menu
} from 'lucide-react';

// نظام التوجيه (ضروري جداً لعمل التطبيق)
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import { auth } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// المكونات
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceTracker from './components/AttendanceTracker';
import GradeBook from './components/GradeBook';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Leaderboard from './components/Leaderboard';
import About from './components/About';
import UserGuide from './components/UserGuide';
import BrandLogo from './components/BrandLogo';
import WelcomeScreen from './components/WelcomeScreen';
import LoginScreen from './components/LoginScreen';
import { useSchoolBell } from './hooks/useSchoolBell';
import SyncStatusBar from './components/SyncStatusBar';

// أيقونات 3D (بحجم مضبوط للموبايل)
const Dashboard3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-8 h-8 ${active ? 'filter drop-shadow-md scale-110' : 'opacity-70 grayscale'}`}>
    <defs><linearGradient id="dash_bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#4338ca" /></linearGradient></defs>
    <rect x="10" y="10" width="20" height="20" rx="6" fill="url(#dash_bg)" />
    <rect x="34" y="10" width="20" height="20" rx="6" fill="#a5b4fc" />
    <rect x="10" y="34" width="20" height="20" rx="6" fill="#c7d2fe" />
    <rect x="34" y="34" width="20" height="20" rx="6" fill="url(#dash_bg)" />
  </svg>
);
const Attendance3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-8 h-8 ${active ? 'filter drop-shadow-md scale-110' : 'opacity-70 grayscale'}`}>
    <defs><linearGradient id="cal_bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#dc2626" /></linearGradient></defs>
    <rect x="12" y="14" width="40" height="40" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="2" />
    <path d="M12 24 L52 24 L52 18 Q52 14 48 14 L16 14 Q12 14 12 18 Z" fill="url(#cal_bg)" />
    <circle cx="20" cy="12" r="3" fill="#991b1b" /><circle cx="44" cy="12" r="3" fill="#991b1b" />
  </svg>
);
const Students3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-8 h-8 ${active ? 'filter drop-shadow-md scale-110' : 'opacity-70 grayscale'}`}>
    <defs><linearGradient id="user_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient></defs>
    <circle cx="32" cy="24" r="12" fill="url(#user_grad)" /><path d="M14 54 C14 40 50 40 50 54 L50 58 L14 58 Z" fill="url(#user_grad)" />
  </svg>
);
const Grades3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-8 h-8 ${active ? 'filter drop-shadow-md scale-110' : 'opacity-70 grayscale'}`}>
    <defs><linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbbf24" /><stop offset="1" stopColor="#d97706" /></linearGradient></defs>
    <rect x="12" y="34" width="10" height="20" rx="2" fill="url(#bar1)" /><rect x="27" y="24" width="10" height="30" rx="2" fill="#34d399" /><rect x="42" y="14" width="10" height="40" rx="2" fill="#818cf8" />
  </svg>
);
const More3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-8 h-8 ${active ? 'filter drop-shadow-md scale-110' : 'opacity-70 grayscale'}`}>
    <defs><linearGradient id="grid_grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f472b6" /><stop offset="1" stopColor="#db2777" /></linearGradient></defs>
    <rect x="14" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="34" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="14" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="34" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" />
  </svg>
);

const AppContent: React.FC = () => {
  const {
    isDataLoaded, teacherInfo, setTeacherInfo, schedule, setSchedule,
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester,
    students, setStudents, classes, setClasses
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('checking');
  const [appVersion, setAppVersion] = useState('3.6.0');

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize(); // ✅ تهيئة الدخول
    }
    const fetchVersion = async () => {
      try {
        if (window.electron) setAppVersion(await window.electron.getAppVersion());
        else if (Capacitor.isNativePlatform()) setAppVersion((await CapacitorApp.getInfo()).version);
      } catch (e) { console.error(e); }
    };
    fetchVersion();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!isMounted) return;
        if (localStorage.getItem('guest_mode') === 'true' || user) setAuthStatus('logged_in');
        else setAuthStatus('logged_out');
    });
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  const handleLoginSuccess = (user: any) => {
    localStorage.setItem('guest_mode', user ? 'false' : 'true');
    setAuthStatus('logged_in');
  };

  const handleNavigate = (path: string) => navigate(path);

  // عناصر القائمة السفلية (الموبايل)
  const mobileNavItems = [
    { id: '/', label: 'الرئيسية', IconComponent: Dashboard3D },
    { id: '/attendance', label: 'الحضور', IconComponent: Attendance3D },
    { id: '/students', label: 'الطلاب', IconComponent: Students3D },
    { id: '/grades', label: 'الدرجات', IconComponent: Grades3D },
    { id: '/settings', label: 'المزيد', IconComponent: More3D },
  ];

  // عناصر القائمة الجانبية (الكمبيوتر)
  const desktopNavItems = [
    { id: '/', label: 'الرئيسية', icon: LayoutDashboard },
    { id: '/attendance', label: 'الحضور', icon: CalendarCheck },
    { id: '/students', label: 'الطلاب', icon: Users },
    { id: '/grades', label: 'الدرجات', icon: BarChart3 },
    { id: '/leaderboard', label: 'فرسان الشهر', icon: Medal },
    { id: '/reports', label: 'التقارير', icon: FileText },
    { id: '/settings', label: 'الإعدادات', icon: SettingsIcon },
    { id: '/guide', label: 'الدليل', icon: BookOpen },
    { id: '/about', label: 'حول', icon: Info },
  ];

  if (!isDataLoaded || authStatus === 'checking') return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-600"/></div>;
  if (authStatus === 'logged_out') return <LoginScreen onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="flex h-full bg-[#f3f4f6] font-sans text-slate-900 overflow-hidden relative">
      
      {/* 🖥️ القائمة الجانبية (تظهر فقط في الشاشات الكبيرة hidden md:flex) */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-l border-slate-200 shadow-sm z-50">
         <div className="p-8 flex items-center gap-4"><div className="w-12 h-12"><BrandLogo className="w-full h-full" showText={false} /></div><div><h1 className="text-2xl font-black text-slate-900">راصد</h1><span className="text-[10px] font-bold text-indigo-600">نسخة المعلم</span></div></div>
         <div className="px-6 mb-4"><div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100"><div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300 shadow-sm">{teacherInfo.avatar ? <img src={teacherInfo.avatar} className="w-full h-full object-cover" /> : <span className="font-black text-slate-500 text-lg flex items-center justify-center h-full">{teacherInfo.name?.[0]}</span>}</div><div className="overflow-hidden"><p className="text-xs font-bold text-slate-900 truncate">{teacherInfo.name || 'مرحباً بك'}</p><p className="text-[10px] text-gray-500 truncate">{teacherInfo.school || 'المدرسة'}</p></div></div></div>
         <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
            {desktopNavItems.map(item => {
                const isActive = location.pathname === item.id;
                return (<button key={item.id} onClick={() => handleNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><item.icon className="w-5 h-5" />{item.label}</button>);
            })}
         </nav>
      </aside>

      {/* 📱 المحتوى الرئيسي (مع مسافة سفلية للموبايل فقط pb-24) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-8 safe-area-top pb-28 md:pb-8" id="main-scroll-container">
          <SyncStatusBar />
          <div className="max-w-7xl mx-auto min-h-full">
            <Routes>
                <Route path="/" element={<Dashboard students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({ ...prev, ...i }))} schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={() => {}} onNavigate={handleNavigate} onOpenSettings={() => handleNavigate('/settings')} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes} notificationsEnabled={true} onToggleNotifications={() => {}} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} />} />
                <Route path="/attendance" element={<AttendanceTracker students={students} classes={classes} setStudents={setStudents} />} />
                <Route path="/students" element={<StudentList students={students} classes={classes} onAddClass={(n) => setClasses(p=>[...p, n])} onAddStudentManually={(n,c,p,a,g) => setStudents(pr=>[...pr, {id: Math.random().toString(), name:n, classes:[c], parentPhone:p, avatar:a, gender:g || 'male', attendance:[], behaviors:[], grades:[]}])} onBatchAddStudents={(s) => setStudents(p=>[...p, ...s])} onUpdateStudent={(s) => setStudents(p=>p.map(x=>x.id===s.id?s:x))} onDeleteStudent={(id) => setStudents(p=>p.filter(x=>x.id!==id))} onViewReport={()=>{}} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} onDeleteClass={(c)=>setClasses(p=>p.filter(x=>x!==c))} />} />
                <Route path="/grades" element={<GradeBook students={students} classes={classes} onUpdateStudent={(s) => setStudents(p=>p.map(x=>x.id===s.id?s:x))} setStudents={setStudents} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} teacherInfo={teacherInfo} />} />
                <Route path="/leaderboard" element={<Leaderboard students={students} classes={classes} onUpdateStudent={(s) => setStudents(p=>p.map(x=>x.id===s.id?s:x))} />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<UserGuide />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<Dashboard students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({ ...prev, ...i }))} schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={() => {}} onNavigate={handleNavigate} onOpenSettings={() => handleNavigate('/settings')} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes} notificationsEnabled={true} onToggleNotifications={() => {}} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} />} />
            </Routes>
          </div>
        </div>
      </main>

      {/* 📱 القائمة السفلية (Bottom Navigation) - تظهر فقط في الموبايل */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        <div className="flex justify-around items-center h-[70px] px-2">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.id;
            return (
              <button key={item.id} onClick={() => handleNavigate(item.id)} className="relative flex flex-col items-center justify-center w-full h-full group active:scale-95 transition-transform">
                <div className={`transition-all duration-300 ${isActive ? '-translate-y-1' : ''}`}>
                  <item.IconComponent active={isActive} />
                </div>
                <span className={`text-[10px] font-black mt-1 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{item.label}</span>
                {isActive && <div className="absolute bottom-2 w-1 h-1 bg-indigo-600 rounded-full animate-bounce" />}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppProvider>
      <HashRouter>
         <AppContent />
      </HashRouter>
    </AppProvider>
  </ThemeProvider>
);

export default App;
