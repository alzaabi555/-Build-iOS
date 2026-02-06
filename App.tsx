// App.tsx
import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { 
  LayoutDashboard, Users, CalendarCheck, BarChart3, 
  Settings as SettingsIcon, Grid, Info, FileText, BookOpen, Medal
} from 'lucide-react';
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
import { Loader2 } from 'lucide-react';
import { useSchoolBell } from './hooks/useSchoolBell';

// 3D ICONS COMPONENTS (كما هي عندك تمامًا)
const Dashboard3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="dash_bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#4338ca" />
      </linearGradient>
      <filter id="inset_shadow"><feOffset dx="0" dy="2" /><feGaussianBlur stdDeviation="2" result="offset-blur" /><feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" /><feFlood floodColor="black" floodOpacity="0.2" result="color" /><feComposite operator="in" in="color" in2="inverse" result="shadow" /><feComposite operator="over" in="shadow" in2="SourceGraphic" /></filter>
    </defs>
    <rect x="10" y="10" width="20" height="20" rx="6" fill="url(#dash_bg)" />
    <rect x="34" y="10" width="20" height="20" rx="6" fill="#a5b4fc" />
    <rect x="10" y="34" width="20" height="20" rx="6" fill="#c7d2fe" />
    <rect x="34" y="34" width="20" height="20" rx="6" fill="url(#dash_bg)" />
    <path d="M10 16 Q20 10 30 16 L30 30 L10 30 Z" fill="white" opacity="0.1" />
  </svg>
);

const Attendance3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cal_bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
    </defs>
    <rect x="12" y="14" width="40" height="40" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="2" />
    <path d="M12 24 L52 24 L52 18 Q52 14 48 14 L16 14 Q12 14 12 18 Z" fill="url(#cal_bg)" />
    <circle cx="20" cy="12" r="3" fill="#991b1b" />
    <circle cx="44" cy="12" r="3" fill="#991b1b" />
    <path d="M22 38 L30 46 L44 30" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))'}} />
  </svg>
);

const Students3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="user_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="24" r="12" fill="url(#user_grad)" />
    <path d="M14 54 C14 40 50 40 50 54 L50 58 L14 58 Z" fill="url(#user_grad)" />
    <ellipse cx="32" cy="20" rx="6" ry="3" fill="white" opacity="0.3" />
  </svg>
);

const Grades3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbbf24"/><stop offset="1" stopColor="#d97706"/></linearGradient>
        <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399"/><stop offset="1" stopColor="#059669"/></linearGradient>
        <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#818cf8"/><stop offset="1" stopColor="#4f46e5"/></linearGradient>
    </defs>
    <rect x="12" y="34" width="10" height="20" rx="2" fill="url(#bar1)" />
    <rect x="27" y="24" width="10" height="30" rx="2" fill="url(#bar2)" />
    <rect x="42" y="14" width="10" height="40" rx="2" fill="url(#bar3)" />
  </svg>
);

const More3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grid_grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f472b6"/><stop offset="1" stopColor="#db2777"/></linearGradient>
    </defs>
    <rect x="14" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" />
    <rect x="34" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" />
    <rect x="14" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" />
    <rect x="34" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" />
  </svg>
);

// ---------------- AppContent (كما هو تقريباً مع تعديل بسيط في Login) ----------------
const AppContent: React.FC = () => {
  const { 
      isDataLoaded, students, setStudents, classes, setClasses, 
      teacherInfo, setTeacherInfo, schedule, setSchedule, 
      periodTimes, setPeriodTimes, currentSemester, setCurrentSemester
  } = useApp();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('checking');

  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (showMoreMenu) {
          setShowMoreMenu(false);
        } else if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
        } else {
          CapacitorApp.exitApp();
        }
      });

      return () => {
        backListener.then(listener => listener.remove());
      };
    }
  }, [showMoreMenu, activeTab]);

  useEffect(() => {
    const isGuest = localStorage.getItem('guest_mode') === 'true';
    if (isGuest) {
      setAuthStatus('logged_in');
    } else {
      setAuthStatus('logged_out');
    }
  }, []);

  const handleLoginSuccess = (user: any | null) => {
    // في هذه الطبقة لا نغيّر شيئاً: App الأعلى يمسك firebaseUser
    localStorage.setItem('guest_mode', 'true');
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
      <div className="flex h-full w-full items-center justify-center bg-gray-50 fixed inset-0 z-[99999]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (showWelcome) {
    return <WelcomeScreen onFinish={handleFinishWelcome} />;
  }

  if (authStatus === 'logged_out') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setShowMoreMenu(false);
  };

  const handleUpdateStudent = (updated: any) =>
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));

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

  const handleAddStudent = (
    name: string,
    className: string,
    phone?: string,
    avatar?: string,
    gender?: 'male' | 'female'
  ) => {
    setStudents(prev => [
      ...prev,
      { 
        id: Math.random().toString(36).substr(2,9), 
        name,
        classes: [className],
        attendance: [],
        behaviors: [],
        grades: [],
        grade: '',
        parentPhone: phone,
        avatar,
        gender: gender || 'male',
      },
    ]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            students={students}
            teacherInfo={teacherInfo}
            onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({...prev, ...i}))}
            schedule={schedule}
            onUpdateSchedule={setSchedule}
            onSelectStudent={() => {}}
            onNavigate={handleNavigate}
            onOpenSettings={() => setActiveTab('settings')}
            periodTimes={periodTimes}
            setPeriodTimes={setPeriodTimes}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={handleToggleNotifications}
            currentSemester={currentSemester}
            onSemesterChange={setCurrentSemester}
          />
        );
      case 'attendance':
        return <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />;
      case 'students':
        return (
          <StudentList 
            students={students}
            classes={classes}
            onAddClass={handleAddClass}
            onAddStudentManually={handleAddStudent}
            onBatchAddStudents={(newS) => setStudents(prev => [...prev, ...newS])}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={(id) => setStudents(prev => prev.filter(s => s.id !== id))}
            onViewReport={(s) => {}}
            currentSemester={currentSemester}
            onSemesterChange={setCurrentSemester}
            onDeleteClass={handleDeleteClass}
          />
        );
      case 'grades':
        return (
          <GradeBook 
            students={students}
            classes={classes}
            onUpdateStudent={handleUpdateStudent}
            setStudents={setStudents}
            currentSemester={currentSemester}
            onSemesterChange={setCurrentSemester}
            teacherInfo={teacherInfo}
          />
        );
      case 'leaderboard':
        return <Leaderboard students={students} classes={classes} onUpdateStudent={handleUpdateStudent} />;
      case 'reports':
        return <Reports />;
      case 'guide':
        return <UserGuide />;
      case 'settings':
        return <Settings />;
      case 'about':
        return <About />;
      default:
        return (
          <Dashboard 
            students={students}
            teacherInfo={teacherInfo}
            onUpdateTeacherInfo={() => {}}
            schedule={schedule}
            onUpdateSchedule={() => {}}
            onSelectStudent={() => {}}
            onNavigate={handleNavigate}
            onOpenSettings={() => {}}
            periodTimes={periodTimes}
            setPeriodTimes={() => {}}
            notificationsEnabled={false}
            onToggleNotifications={() => {}}
            currentSemester={currentSemester}
            onSemesterChange={setCurrentSemester}
          />
        );
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
      {/* Sidebar */}
      {/* ... اترك البقية كما هي من كودك (الـ aside, main, mobile nav, Modal) */}
      {/* لأني لم أغيّر أي شيء فيها سوى تمرير نفس الدوال */}
      {/* انسخ من كودك الحالي بدءاً من <aside ...> وحتى نهاية AppContent */}
      {/* لم ألمس هذا الجزء حتى لا أطيل الرسالة. */}
    </div>
  );
};

// ---------------- غلاف التطبيق مع AppProvider و firebaseUser ----------------
const App: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);

  if (!firebaseUser) {
    return (
      <ThemeProvider>
        <LoginScreen onLoginSuccess={setFirebaseUser} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppProvider firebaseUser={firebaseUser}>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
