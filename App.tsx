import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2
} from 'lucide-react';

// ✅ استيراد المصادقة من فايربيس
import { auth } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';

// ✅ استدعاء مكتبات الموبايل (للإصدار)
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceTracker from './components/AttendanceTracker';
import GradeBook from './components/GradeBook';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Modal from './components/Modal';
import Leaderboard from './components/Leaderboard';
import About from './components/About';
import UserGuide from './components/UserGuide';
import BrandLogo from './components/BrandLogo';
import WelcomeScreen from './components/WelcomeScreen';
import LoginScreen from './components/LoginScreen';
import { useSchoolBell } from './hooks/useSchoolBell';
import SyncStatusBar from './components/SyncStatusBar';

// --- 3D ICONS COMPONENTS (SVG) ---
const Dashboard3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="dash_bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#4338ca" /></linearGradient><filter id="inset_shadow"><feOffset dx="0" dy="2" /><feGaussianBlur stdDeviation="2" result="offset-blur" /><feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" /><feFlood floodColor="black" floodOpacity="0.2" result="color" /><feComposite operator="in" in="color" in2="inverse" result="shadow" /><feComposite operator="over" in="shadow" in2="SourceGraphic" /></filter></defs>
    <rect x="10" y="10" width="20" height="20" rx="6" fill="url(#dash_bg)" />
    <rect x="34" y="10" width="20" height="20" rx="6" fill="#a5b4fc" />
    <rect x="10" y="34" width="20" height="20" rx="6" fill="#c7d2fe" />
    <rect x="34" y="34" width="20" height="20" rx="6" fill="url(#dash_bg)" />
    <path d="M10 16 Q20 10 30 16 L30 30 L10 30 Z" fill="white" opacity="0.1" />
  </svg>
);
const Attendance3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="cal_bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#dc2626" /></linearGradient></defs>
    <rect x="12" y="14" width="40" height="40" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="2" />
    <path d="M12 24 L52 24 L52 18 Q52 14 48 14 L16 14 Q12 14 12 18 Z" fill="url(#cal_bg)" />
    <circle cx="20" cy="12" r="3" fill="#991b1b" /><circle cx="44" cy="12" r="3" fill="#991b1b" />
    <path d="M22 38 L30 46 L44 30" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} />
  </svg>
);
const Students3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000svg">
    <defs><linearGradient id="user_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient></defs>
    <circle cx="32" cy="24" r="12" fill="url(#user_grad)" /><path d="M14 54 C14 40 50 40 50 54 L50 58 L14 58 Z" fill="url(#user_grad)" /><ellipse cx="32" cy="20" rx="6" ry="3" fill="white" opacity="0.3" />
  </svg>
);
const Grades3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbbf24" /><stop offset="1" stopColor="#d97706" /></linearGradient>
      <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#059669" /></linearGradient>
      <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#818cf8" /><stop offset="1" stopColor="#4f46e5" /></linearGradient>
    </defs>
    <path d="M12 44 L22 44 L22 54 L12 54 Z" fill="url(#bar1)" transform="translate(0, -10)" />
    <rect x="12" y="34" width="10" height="20" rx="2" fill="url(#bar1)" /><rect x="27" y="24" width="10" height="30" rx="2" fill="url(#bar2)" /><rect x="42" y="14" width="10" height="40" rx="2" fill="url(#bar3)" />
    <path d="M22 36 L25 33 L25 51 L22 54 Z" fill="#b45309" opacity="0.5" /><path d="M37 26 L40 23 L40 51 L37 54 Z" fill="#047857" opacity="0.5" /><path d="M52 16 L55 13 L55 51 L52 54 Z" fill="#3730a3" opacity="0.5" />
  </svg>
);
const More3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="grid_grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f472b6" /><stop offset="1" stopColor="#db2777" /></linearGradient></defs>
    <rect x="14" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="34" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="14" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="34" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" />
    <circle cx="22" cy="22" r="3" fill="white" opacity="0.2" /><circle cx="42" cy="22" r="3" fill="white" opacity="0.2" /><circle cx="22" cy="42" r="3" fill="white" opacity="0.2" /><circle cx="42" cy="42" r="3" fill="white" opacity="0.2" />
  </svg>
);

// Main App Container
const AppContent: React.FC = () => {
  const {
    isDataLoaded, students, setStudents, classes, setClasses,
    teacherInfo, setTeacherInfo, schedule, setSchedule,
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester,
  } = useApp();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('checking');
   
  const [appVersion, setAppVersion] = useState('3.6.0');

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
      } catch (error) {
        console.error("Failed to get version", error);
      }
    };
    fetchVersion();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        const isGuest = localStorage.getItem('guest_mode') === 'true';

        if (isGuest) {
            setAuthStatus('logged_in');
        } else if (firebaseUser) {
            setAuthStatus('logged_in');
        } else {
            setAuthStatus('logged_out');
        }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const api = (window as any)?.electron;
    if (!api?.onDeepLink) return;
    const unsubscribe = api.onDeepLink((url: string) => {
      console.log('Deep link received:', url);
    });
    return () => {
      try { unsubscribe?.(); } catch {}
    };
  }, []);

  const handleLoginSuccess = (user: any | null) => {
    if (user) {
      localStorage.setItem('guest_mode', 'false');
    } else {
      localStorage.setItem('guest_mode', 'true');
    }
    setAuthStatus('logged_in');
  };

  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    return !localStorage.getItem('rased_welcome_seen');
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('bell_enabled') === 'true';
  });

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

  if (!isDataLoaded || authStatus === 'checking') {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-gray-50 fixed inset-0 z-[99999]">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">جاري استعادة البيانات...</p>
      </div>
    );
  }

  if (showWelcome) return <WelcomeScreen onFinish={handleFinishWelcome} />;
  if (authStatus === 'logged_out') return <LoginScreen onLoginSuccess={handleLoginSuccess} />;

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setShowMoreMenu(false);
  };

  const handleUpdateStudent = (updated: any) => setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  const handleAddClass = (name: string) => setClasses(prev => [...prev, name]);
  const handleDeleteClass = (className: string) => {
    setClasses(prev => prev.filter(c => c !== className));
    setStudents(prev => prev.map(s => {
      if (s.classes.includes(className)) {
        return { ...s, classes: s.classes.filter(c => c !== className) };
      }
      return s;
    }));
  };
  const handleAddStudent = (name: string, className: string, phone?: string, avatar?: string, gender?: 'male' | 'female') => {
    setStudents(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name, classes: [className], attendance: [], behaviors: [], grades: [], grade: '',
      parentPhone: phone, avatar: avatar, gender: gender || 'male'
    }]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
          students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({ ...prev, ...i }))}
          schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={() => { }} onNavigate={handleNavigate}
          onOpenSettings={() => setActiveTab('settings')} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes}
          notificationsEnabled={notificationsEnabled} onToggleNotifications={handleToggleNotifications}
          // 👇 التعديل الهام هنا: (as any) لتجاوز خطأ الأرقام والنصوص
          currentSemester={currentSemester as any} 
          onSemesterChange={setCurrentSemester as any}
        />;
      case 'attendance': return <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />;
      case 'students':
        return <StudentList
          students={students} classes={classes} onAddClass={handleAddClass} onAddStudentManually={handleAddStudent}
          onBatchAddStudents={(newS) => setStudents(prev => [...prev, ...newS])} onUpdateStudent={handleUpdateStudent}
          onDeleteStudent={(id) => setStudents(prev => prev.filter(s => s.id !== id))} onViewReport={(s) => { }}
          // 👇 التعديل الهام هنا أيضاً
          currentSemester={currentSemester as any} 
          onSemesterChange={setCurrentSemester as any} 
          onDeleteClass={handleDeleteClass}
        />;
      case 'grades':
        return <GradeBook
          students={students} classes={classes} onUpdateStudent={handleUpdateStudent} setStudents={setStudents}
          // 👇 وهنا أيضاً
          currentSemester={currentSemester as any} 
          onSemesterChange={setCurrentSemester as any} 
          teacherInfo={teacherInfo}
        />;
      case 'leaderboard': return <Leaderboard students={students} classes={classes} onUpdateStudent={handleUpdateStudent} />;
      case 'reports': return <Reports />;
      case 'guide': return <UserGuide />;
      case 'settings': return <Settings />;
      case 'about': return <About />;
      default: return null;
    }
  };

  const mobileNavItems = [
    { id: 'dashboard', label: 'الرئيسية', IconComponent: Dashboard3D },
    { id: 'attendance', label: 'الحضور', IconComponent: Attendance3D },
    { id: 'students', label: 'الطلاب', IconComponent: Students3D },
    { id: 'grades', label: 'الدرجات', IconComponent: Grades3D },
  ];
  const desktopNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'attendance', label: 'الحضور', icon: CalendarCheck },
    { id: 'students', label: 'الطلاب', icon: Users },
    { id: 'grades', label: 'الدرجات', icon: BarChart3 },
    { id: 'leaderboard', label: 'فرسان الشهر', icon: Medal },
    { id: 'reports', label: 'التقارير', icon: FileText },
    { id: 'guide', label: 'دليل المستخدم', icon: BookOpen },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
    { id: 'about', label: 'حول التطبيق', icon: Info },
  ];
  const isMoreActive = !mobileNavItems.some(item => item.id === activeTab);

  return (
    <div className="flex h-full bg-[#f3f4f6] font-sans overflow-hidden text-slate-900 relative">
      <aside className="hidden md:flex w-72 flex-col bg-white border-l border-slate-200 z-50 shadow-sm transition-all h-full">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12"><BrandLogo className="w-full h-full" showText={false} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">راصد</h1>
            <span className="text-[10px] font-bold text-indigo-600 tracking-wider">نسخة المعلم</span>
          </div>
        </div>
        <div className="px-6 mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 shadow-sm shrink-0">
              {teacherInfo.avatar ? <img src={teacherInfo.avatar} className="w-full h-full object-cover" /> : <span className="font-black text-slate-500 text-lg">{teacherInfo.name?.[0]}</span>}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{teacherInfo.name || 'مرحباً بك'}</p>
              <p className="text-[10px] text-gray-500 truncate">{teacherInfo.school || 'المدرسة'}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-4">
          {desktopNavItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => handleNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-100'}`}>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'} transition-colors`} strokeWidth={2.5} />
                <span className="font-bold text-sm">{item.label}</span>
                {isActive && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
              </button>
            );
          })}
        </nav>
        <div className="p-6 text-center border-t border-slate-200">
          <p className="text-[10px] font-bold text-gray-400">الإصدار {appVersion}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f3f4f6] z-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-32 md:pb-4 px-4 md:px-8 pt-safe overscroll-contain" id="main-scroll-container">
          <SyncStatusBar />
          <div className="max-w-5xl mx-auto w-full min-h-full">
            {renderContent()}
          </div>
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] h-[85px] bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex justify-around items-end pb-4 border-t border-slate-200/60 pb-safe safe-area-bottom transition-transform duration-300 translate-z-0 pointer-events-auto">
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => handleNavigate(item.id)} className="relative w-full h-full flex flex-col items-center justify-end group pb-1 touch-manipulation active:scale-90 transition-transform" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <div className={`absolute top-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) pointer-events-none ${isActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
                <div className={`w-11 h-11 ${isActive ? 'drop-shadow-2xl' : ''}`}><item.IconComponent active={isActive} /></div>
              </div>
              <span className={`text-[10px] font-black transition-all duration-300 pointer-events-none ${isActive ? 'translate-y-0 text-indigo-600 opacity-100' : 'translate-y-4 text-gray-400 opacity-0'}`}>{item.label}</span>
              {isActive && <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
            </button>
          );
        })}
        <button onClick={() => setShowMoreMenu(true)} className="relative w-full h-full flex flex-col items-center justify-end group pb-1 touch-manipulation active:scale-90 transition-transform" style={{ WebkitTapHighlightColor: 'transparent' }}>
          <div className={`absolute top-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) pointer-events-none ${isMoreActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
            <div className={`w-11 h-11 ${isMoreActive ? 'drop-shadow-2xl' : ''}`}><More3D active={isMoreActive} /></div>
          </div>
          <span className={`text-[10px] font-black transition-all duration-300 pointer-events-none ${isMoreActive ? 'translate-y-0 text-indigo-600 opacity-100' : 'translate-y-4 text-gray-400 opacity-0'}`}>المزيد</span>
          {isMoreActive && <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
        </button>
      </div>

      <Modal isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} className="max-w-md rounded-[2rem] mb-28 md:hidden z-[10000]">
        <div className="text-center mb-6">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <h3 className="font-black text-slate-800 text-lg">القائمة الكاملة</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => handleNavigate('leaderboard')} className="p-4 bg-amber-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-amber-200 aspect-square shadow-sm"><Medal className="w-7 h-7 text-amber-600" /><span className="font-bold text-[10px] text-amber-800">فرسان الشهر</span></button>
          <button onClick={() => handleNavigate('reports')} className="p-4 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-indigo-200 aspect-square shadow-sm"><FileText className="w-7 h-7 text-indigo-600" /><span className="font-bold text-[10px] text-indigo-800">التقارير</span></button>
          <button onClick={() => handleNavigate('settings')} className="p-4 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-gray-300 aspect-square shadow-sm"><SettingsIcon className="w-7 h-7 text-gray-600" /><span className="font-bold text-[10px] text-gray-800">الإعدادات</span></button>
          <button onClick={() => handleNavigate('guide')} className="p-4 bg-cyan-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-cyan-200 aspect-square shadow-sm"><BookOpen className="w-7 h-7 text-cyan-600" /><span className="font-bold text-[10px] text-cyan-800">الدليل</span></button>
          <button onClick={() => handleNavigate('about')} className="p-4 bg-purple-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-purple-200 aspect-square shadow-sm"><Info className="w-7 h-7 text-purple-600" /><span className="font-bold text-[10px] text-purple-800">حول التطبيق</span></button>
        </div>
      </Modal>
    </div>
  );
};

export default App;
