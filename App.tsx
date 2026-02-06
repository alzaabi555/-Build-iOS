
import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { 
  LayoutDashboard, Users, CalendarCheck, BarChart3, 
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal
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

// 3D ICONS COMPONENTS (ابقِها كما هي عندك)
const Dashboard3D = ({ active }: { active: boolean }) => (/* ... */);
const Attendance3D = ({ active }: { active: boolean }) => (/* ... */);
const Students3D = ({ active }: { active: boolean }) => (/* ... */);
const Grades3D = ({ active }: { active: boolean }) => (/* ... */);
const More3D = ({ active }: { active: boolean }) => (/* ... */);

// ========= AppContent: بدون أي LoginScreen أو authStatus =========
const AppContent: React.FC = () => {
  const { 
    isDataLoaded, students, setStudents, classes, setClasses, 
    teacherInfo, setTeacherInfo, schedule, setSchedule, 
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester
  } = useApp();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    return !localStorage.getItem('rased_welcome_seen');
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('bell_enabled') === 'true';
  });

  useSchoolBell(periodTimes, schedule, notificationsEnabled);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      const backListener = CapacitorApp.addListener('backButton', () => {
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

  if (!isDataLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 fixed inset-0 z-[99999]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (showWelcome) {
    return <WelcomeScreen onFinish={handleFinishWelcome} />;
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
            onViewReport={() => {}}
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
        return null;
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
      {/* ... ضع هنا نفس aside, main, mobile nav, Modal من كودك السابق كما أعطيتك في الرد الماضي */}
      {/* نفس JSX بالضبط، فقط بدون أي LoginScreen أو authStatus */}
    </div>
  );
};

// ========= App: نقطة الدخول الوحيدة =========
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = (user: any | null) => {
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <ThemeProvider>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
