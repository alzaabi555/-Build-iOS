import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './theme/ThemeProvider'; // 👈 The new Theme Engine

// 🚀 Icons
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, CheckSquare, Library, CloudSync
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
import { useSchoolBell } from './hooks/useSchoolBell';

// 🌍 The New Global Layout Engine
import { AppLayout } from './components/layout/AppLayout';

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

  // Navigation config passed to AppLayout
  const mobileNavItems = [
    { id: 'dashboard', label: t('navDashboard') || (dir === 'rtl' ? 'الرئيسية' : 'Dashboard'), IconComponent: LayoutDashboard },
    { id: 'attendance', label: t('navAttendance') || (dir === 'rtl' ? 'الغياب' : 'Attendance'), IconComponent: CalendarCheck },
    { id: 'students', label: t('navStudents') || (dir === 'rtl' ? 'الطلاب' : 'Students'), IconComponent: Users },
    { id: 'grades', label: t('navGrades') || (dir === 'rtl' ? 'الدرجات' : 'Grades'), IconComponent: BarChart3 },
    { id: 'tasks', label: t('navTasks') || t('tasks') || (dir === 'rtl' ? 'المهام' : 'Tasks'), IconComponent: CheckSquare },
  ];
  
  const desktopNavItems = [
    { id: 'dashboard', label: t('navDashboard') || (dir === 'rtl' ? 'الرئيسية' : 'Dashboard'), icon: LayoutDashboard },
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
