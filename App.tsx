import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, Menu, X
} from 'lucide-react';

// ✅ Router: لإصلاح شكل التطبيق والقوائم
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import { auth } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// استيراد المكونات
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

// أيقونات القائمة السفلية (للموبايل)
const Dashboard3D = ({ active }: { active: boolean }) => ( <LayoutDashboard className={`w-7 h-7 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} /> );
const Attendance3D = ({ active }: { active: boolean }) => ( <CalendarCheck className={`w-7 h-7 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} /> );
const Students3D = ({ active }: { active: boolean }) => ( <Users className={`w-7 h-7 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} /> );
const Grades3D = ({ active }: { active: boolean }) => ( <BarChart3 className={`w-7 h-7 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} /> );
const More3D = ({ active }: { active: boolean }) => ( <SettingsIcon className={`w-7 h-7 transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`} strokeWidth={active ? 2.5 : 2} /> );

const AppContent: React.FC = () => {
  const {
    isDataLoaded, teacherInfo, setTeacherInfo, schedule, setSchedule,
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester,
    students, setStudents, classes, setClasses
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('checking');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('3.6.0');

  // ✅ تهيئة Google مرة واحدة عند البداية
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    }
    const fetchVersion = async () => {
      try {
        if (window.electron) setAppVersion(await window.electron.getAppVersion());
        else if (Capacitor.isNativePlatform()) setAppVersion((await CapacitorApp.getInfo()).version);
      } catch (e) { console.error(e); }
    };
    fetchVersion();
  }, []);

  // 🔐 مراقبة الدخول + مؤقت الطوارئ (الحل لمشكلة التعليق)
  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!isMounted) return;
        const isGuest = localStorage.getItem('guest_mode') === 'true';
        if (isGuest || user) {
            setAuthStatus('logged_in');
        } else {
            setAuthStatus('logged_out');
        }
    });

    // ⏳ مؤقت الطوارئ: إذا مر 3 ثواني وما زال "جاري التحميل"، اعتبره خروج
    const safetyTimeout = setTimeout(() => {
        if (authStatus === 'checking' && isMounted) {
            console.warn("Auth check timed out, forcing login screen.");
            setAuthStatus('logged_out');
        }
    }, 3000); 

    return () => { isMounted = false; unsubscribe(); clearTimeout(safetyTimeout); };
  }, [authStatus]); // إضافة authStatus للمراقبة

  const handleLoginSuccess = (user: any) => {
    localStorage.setItem('guest_mode', user ? 'false' : 'true');
    setAuthStatus('logged_in');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const [showWelcome, setShowWelcome] = useState<boolean>(() => !localStorage.getItem('rased_welcome_seen'));
  
  // دوال مساعدة
  const handleUpdateStudent = (updated: any) => setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  const handleAddClass = (name: string) => setClasses(prev => [...prev, name]);
  const handleDeleteClass = (className: string) => {
    setClasses(prev => prev.filter(c => c !== className));
    setStudents(prev => prev.map(s => { if (s.classes.includes(className)) { return { ...s, classes: s.classes.filter(c => c !== className) }; } return s; }));
  };
  const handleAddStudent = (name: string, className: string, phone?: string, avatar?: string, gender?: 'male' | 'female') => {
    setStudents(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, classes: [className], attendance: [], behaviors: [], grades: [], grade: '', parentPhone: phone, avatar: avatar, gender: gender || 'male' }]);
  };

  // القائمة الجانبية (كمبيوتر)
  const desktopNavItems = [
    { path: '/', label: 'الرئيسية', icon: LayoutDashboard },
    { path: '/attendance', label: 'الحضور', icon: CalendarCheck },
    { path: '/students', label: 'الطلاب', icon: Users },
    { path: '/grades', label: 'الدرجات', icon: BarChart3 },
    { path: '/leaderboard', label: 'فرسان الشهر', icon: Medal },
    { path: '/reports', label: 'التقارير', icon: FileText },
    { path: '/settings', label: 'الإعدادات', icon: SettingsIcon },
    { path: '/guide', label: 'الدليل', icon: BookOpen },
    { path: '/about', label: 'حول', icon: Info },
  ];

  // القائمة السفلية (موبايل)
  const mobileNavItems = [
    { path: '/', label: 'الرئيسية', IconComponent: Dashboard3D },
    { path: '/attendance', label: 'الحضور', IconComponent: Attendance3D },
    { path: '/students', label: 'الطلاب', IconComponent: Students3D },
    { path: '/grades', label: 'الدرجات', IconComponent: Grades3D },
    { path: '/settings', label: 'المزيد', IconComponent: More3D },
  ];

  // شاشة التحميل (تظهر فقط إذا البيانات لم تجهز بعد)
  if (!isDataLoaded || authStatus === 'checking') {
      return (
        <div className="flex flex-col h-full w-full items-center justify-center bg-gray-50 fixed inset-0 z-[99999]">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">جاري التحضير...</p>
        </div>
      );
  }

  if (showWelcome) return <WelcomeScreen onFinish={() => { localStorage.setItem('rased_welcome_seen', 'true'); setShowWelcome(false); }} />;
  
  // ✅ التوجيه الصحيح إذا لم يكن مسجلاً
  if (authStatus === 'logged_out') return <LoginScreen onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="flex h-full bg-[#f3f4f6] font-sans text-slate-900 overflow-hidden relative">
      
      {/* 🖥️ القائمة الجانبية (مخفية في الموبايل) */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-l border-slate-200 shadow-sm z-50">
         <div className="p-8 flex items-center gap-4"><div className="w-12 h-12"><BrandLogo className="w-full h-full" showText={false} /></div><div><h1 className="text-2xl font-black text-slate-900">راصد</h1><span className="text-[10px] font-bold text-indigo-600">نسخة المعلم</span></div></div>
         <div className="px-6 mb-4"><div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100"><div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300 shadow-sm">{teacherInfo.avatar ? <img src={teacherInfo.avatar} className="w-full h-full object-cover" /> : <span className="font-black text-slate-500 text-lg flex items-center justify-center h-full">{teacherInfo.name?.[0]}</span>}</div><div className="overflow-hidden"><p className="text-xs font-bold text-slate-900 truncate">{teacherInfo.name || 'مرحباً بك'}</p><p className="text-[10px] text-gray-500 truncate">{teacherInfo.school || 'المدرسة'}</p></div></div></div>
         <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
            {desktopNavItems.map(item => {
                const isActive = location.pathname === item.path;
                return (<button key={item.path} onClick={() => handleNavigate(item.path)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><item.icon className="w-5 h-5" />{item.label}</button>);
            })}
         </nav>
         <div className="p-4 text-center border-t border-slate-100"><p className="text-[10px] font-bold text-gray-400">الإصدار {appVersion}</p></div>
      </aside>

      {/* 📱 المحتوى الرئيسي */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-8 safe-area-top pb-24 md:pb-8" id="main-scroll-container">
          <SyncStatusBar />
          <div className="max-w-7xl mx-auto min-h-full">
            <Routes>
                <Route path="/" element={<Dashboard students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({ ...prev, ...i }))} schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={() => {}} onNavigate={handleNavigate} onOpenSettings={() => handleNavigate('/settings')} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes} notificationsEnabled={true} onToggleNotifications={() => {}} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} />} />
                <Route path="/attendance" element={<AttendanceTracker students={students} classes={classes} setStudents={setStudents} />} />
                <Route path="/students" element={<StudentList students={students} classes={classes} onAddClass={handleAddClass} onAddStudentManually={handleAddStudent} onBatchAddStudents={(s) => setStudents(p=>[...p, ...s])} onUpdateStudent={handleUpdateStudent} onDeleteStudent={(id) => setStudents(p=>p.filter(x=>x.id!==id))} onViewReport={()=>{}} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} onDeleteClass={handleDeleteClass} />} />
                <Route path="/grades" element={<GradeBook students={students} classes={classes} onUpdateStudent={handleUpdateStudent} setStudents={setStudents} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} teacherInfo={teacherInfo} />} />
                <Route path="/leaderboard" element={<Leaderboard students={students} classes={classes} onUpdateStudent={handleUpdateStudent} />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<UserGuide />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<Dashboard students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({ ...prev, ...i }))} schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={() => {}} onNavigate={handleNavigate} onOpenSettings={() => handleNavigate('/settings')} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes} notificationsEnabled={true} onToggleNotifications={() => {}} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} />} />
            </Routes>
          </div>
        </div>
      </main>

      {/* 📱 القائمة السفلية للموبايل */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        <div className="flex justify-around items-center h-[70px] px-2">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button key={item.path} onClick={() => handleNavigate(item.path)} className="relative flex flex-col items-center justify-center w-full h-full group active:scale-95 transition-transform">
                <div className={`transition-all duration-300 ${isActive ? '-translate-y-1' : ''}`}>
                  <item.IconComponent active={isActive} />
                </div>
                <span className={`text-[10px] font-black mt-1 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{item.label}</span>
                {isActive && <div className="absolute bottom-2 w-1 h-1 bg-indigo-600 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <HashRouter>
           <AppContent />
        </HashRouter>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
