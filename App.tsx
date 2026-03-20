import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, CheckSquare
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import TeacherTasks from './components/TeacherTasks';
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
import StudentGroups from './components/StudentGroups';
import { useSchoolBell } from './hooks/useSchoolBell';

import RamadanTheme from './components/RamadanTheme';

// --- 3D ICONS COMPONENTS ---
const Dashboard3D = ({ active, isRamadan }: { active: boolean, isRamadan?: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="dash_bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={isRamadan ? "#fbbf24" : "#6366f1"} /><stop offset="100%" stopColor={isRamadan ? "#d97706" : "#4338ca"} /></linearGradient></defs>
    <rect x="10" y="10" width="20" height="20" rx="6" fill="url(#dash_bg)" />
    <rect x="34" y="10" width="20" height="20" rx="6" fill={isRamadan ? "#3730a3" : "#a5b4fc"} />
    <rect x="10" y="34" width="20" height="20" rx="6" fill={isRamadan ? "#312e81" : "#c7d2fe"} />
    <rect x="34" y="34" width="20" height="20" rx="6" fill="url(#dash_bg)" />
  </svg>
);
const Attendance3D = ({ active, isRamadan }: { active: boolean, isRamadan?: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="cal_bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={isRamadan ? "#fbbf24" : "#f87171"} /><stop offset="100%" stopColor={isRamadan ? "#d97706" : "#dc2626"} /></linearGradient></defs>
    <rect x="12" y="14" width="40" height="40" rx="8" fill={isRamadan ? "#1e1b4b" : "white"} stroke={isRamadan ? "#4f46e5" : "#e5e7eb"} strokeWidth="2" />
    <path d="M12 24 L52 24 L52 18 Q52 14 48 14 L16 14 Q12 14 12 18 Z" fill="url(#cal_bg)" />
    <circle cx="20" cy="12" r="3" fill={isRamadan ? "#fcd34d" : "#991b1b"} />
    <circle cx="44" cy="12" r="3" fill={isRamadan ? "#fcd34d" : "#991b1b"} />
    <path d="M22 38 L30 46 L44 30" fill="none" stroke={isRamadan ? "#34d399" : "#10b981"} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Students3D = ({ active, isRamadan }: { active: boolean, isRamadan?: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="user_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={isRamadan ? "#fbbf24" : "#3b82f6"} /><stop offset="100%" stopColor={isRamadan ? "#b45309" : "#1d4ed8"} /></linearGradient></defs>
    <circle cx="32" cy="24" r="12" fill="url(#user_grad)" />
    <path d="M14 54 C14 40 50 40 50 54 L50 58 L14 58 Z" fill="url(#user_grad)" />
  </svg>
);
const Grades3D = ({ active, isRamadan }: { active: boolean, isRamadan?: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={isRamadan ? "#fde68a" : "#fbbf24"} /><stop offset="1" stopColor={isRamadan ? "#f59e0b" : "#d97706"} /></linearGradient>
      <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={isRamadan ? "#a7f3d0" : "#34d399"} /><stop offset="1" stopColor={isRamadan ? "#10b981" : "#059669"} /></linearGradient>
      <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={isRamadan ? "#c7d2fe" : "#818cf8"} /><stop offset="1" stopColor={isRamadan ? "#6366f1" : "#4f46e5"} /></linearGradient>
    </defs>
    <rect x="12" y="34" width="10" height="20" rx="2" fill="url(#bar1)" />
    <rect x="27" y="24" width="10" height="30" rx="2" fill="url(#bar2)" />
    <rect x="42" y="14" width="10" height="40" rx="2" fill="url(#bar3)" />
  </svg>
);
const Tasks3D = ({ active, isRamadan }: { active: boolean, isRamadan?: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="task_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={isRamadan ? "#fbbf24" : "#10b981"} /><stop offset="100%" stopColor={isRamadan ? "#d97706" : "#059669"} /></linearGradient></defs>
    <rect x="14" y="10" width="36" height="44" rx="6" fill={isRamadan ? "#0f172a" : "white"} stroke={isRamadan ? "#10b981" : "#059669"} strokeWidth="2" />
    <rect x="20" y="20" width="24" height="4" rx="2" fill="url(#task_grad)" />
    <rect x="20" y="30" width="24" height="4" rx="2" fill="url(#task_grad)" />
    <rect x="20" y="40" width="16" height="4" rx="2" fill="url(#task_grad)" />
  </svg>
);

const AppContent: React.FC = () => {
  const {
    isDataLoaded, students, setStudents, classes, setClasses,
    teacherInfo, setTeacherInfo, schedule, setSchedule,
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester,
    t, dir
  } = useApp();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [appVersion, setAppVersion] = useState('4.4.1');
  const isRamadan = true;

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

  const [showWelcome, setShowWelcome] = useState<boolean>(() => !localStorage.getItem('rased_welcome_seen'));
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => localStorage.getItem('bell_enabled') === 'true');

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

  const mobileNavItems = [
    { id: 'dashboard', label: t('navDashboard'), IconComponent: Dashboard3D },
    { id: 'attendance', label: t('navAttendance'), IconComponent: Attendance3D },
    { id: 'students', label: t('navStudents'), IconComponent: Students3D },
    { id: 'grades', label: t('navGrades'), IconComponent: Grades3D },
    { id: 'tasks', label: t('tasks') || 'المهام', IconComponent: Tasks3D },
  ];
  
  const desktopNavItems = [
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'attendance', label: t('navAttendance'), icon: CalendarCheck },
    { id: 'students', label: t('navStudents'), icon: Users },
    { id: 'groups', label: t('navGroups'), icon: Users },
    { id: 'grades', label: t('navGrades'), icon: BarChart3 },
    { id: 'tasks', label: t('tasks') || 'المهام', icon: CheckSquare },
    { id: 'leaderboard', label: t('navKnights'), icon: Medal },
    { id: 'reports', label: t('navReports'), icon: FileText },
    { id: 'guide', label: t('navGuide'), icon: BookOpen },
    { id: 'settings', label: t('navSettings'), icon: SettingsIcon },
    { id: 'about', label: t('navAbout'), icon: Info },
  ];

  if (!isDataLoaded) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-[#020617] fixed inset-0 z-[99999]" dir={dir}>
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-300 font-medium text-sm">{t('loadingData')}</p>
      </div>
    );
  }

  if (showWelcome) return <WelcomeScreen onFinish={handleFinishWelcome} />;

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setShowMoreMenu(false);
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
      case 'tasks':
        return <TeacherTasks students={students} teacherSubject={teacherInfo?.subject || 'عام'} />;
      case 'attendance': return <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />;
      case 'students':
        return <StudentList
          students={students} classes={classes} onAddClass={(n) => setClasses(p => [...p, n])} 
          onAddStudentManually={(n, c, p, a, g) => setStudents(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: n, classes: [c], attendance: [], behaviors: [], grades: [], grade: '', parentPhone: p, avatar: a, gender: g || 'male' }])}
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
      case 'guide': return <UserGuide />;
      case 'settings': return <Settings />;
      case 'about': return <About />;
      default: return null;
    }
  };

  return (
    <div className={`flex h-full font-sans overflow-hidden relative transition-colors duration-1000 ${isRamadan ? 'bg-[#020617] text-white' : 'bg-[#f3f4f6] text-slate-900'} ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      <RamadanTheme />

      <aside className={`hidden md:flex w-72 flex-col z-50 h-full relative ${dir === 'rtl' ? 'border-l' : 'border-r'} ${isRamadan ? 'bg-[#0f172a]/60 backdrop-blur-2xl border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="p-8 flex items-center gap-4 relative z-10">
          <div className="w-12 h-12"><BrandLogo className="w-full h-full" showText={false} /></div>
          <div>
            <h1 className="text-2xl font-black">{t('appNameMain')}</h1>
            <span className="text-[10px] font-bold text-amber-400">{t('appSubtitleMain')}</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-4 relative z-10">
          {desktopNavItems.map(item => (
            <button key={item.id} onClick={() => handleNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-indigo-200/70 hover:bg-white/5'}`}>
              <item.icon className="w-5 h-5" />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 md:pb-4 px-4 md:px-8 pt-safe relative z-10">
          <div className="max-w-5xl mx-auto w-full min-h-full">{renderContent()}</div>
        </div>
      </main>

      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[9999] h-[85px] rounded-t-[2.5rem] flex justify-around items-end pb-4 border-t ${isRamadan ? 'bg-[#0f172a]/80 backdrop-blur-2xl border-white/10' : 'bg-white/95 border-slate-200'}`}>
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => handleNavigate(item.id)} className="relative w-full h-full flex flex-col items-center justify-end pb-1 active:scale-90 transition-transform">
              <div className={`absolute top-0 transition-all duration-500 ${isActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
                <div className="w-11 h-11"><item.IconComponent active={isActive} isRamadan={isRamadan} /></div>
              </div>
              <span className={`text-[10px] font-black ${isActive ? 'text-indigo-400' : 'text-indigo-200/50'}`}>{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => setShowMoreMenu(true)} className="relative w-full h-full flex flex-col items-center justify-end pb-1">
          <div className="absolute top-0 translate-y-1 scale-90 w-11 h-11"><More3D active={showMoreMenu} isRamadan={isRamadan} /></div>
          <span className="text-[10px] font-black text-indigo-200/50">{t('navMore') || 'المزيد'}</span>
        </button>
      </div>

      <Modal isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} className="max-w-md rounded-[2rem] mb-28 md:hidden z-[10000] bg-transparent">
        <div className="grid grid-cols-3 gap-3 p-4 rounded-[2rem] border bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <button onClick={() => handleNavigate('groups')} className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10"><Users className="w-7 h-7 text-emerald-400" /><span className="font-bold text-[10px] text-white">المجموعات</span></button>
          <button onClick={() => handleNavigate('leaderboard')} className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10"><Medal className="w-7 h-7 text-indigo-400" /><span className="font-bold text-[10px] text-white">الفرسان</span></button>
          <button onClick={() => handleNavigate('reports')} className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10"><FileText className="w-7 h-7 text-indigo-400" /><span className="font-bold text-[10px] text-white">التقارير</span></button>
          <button onClick={() => handleNavigate('settings')} className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10"><SettingsIcon className="w-7 h-7 text-slate-400" /><span className="font-bold text-[10px] text-white">الإعدادات</span></button>
          <button onClick={() => handleNavigate('guide')} className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10"><BookOpen className="w-7 h-7 text-cyan-400" /><span className="font-bold text-[10px] text-white">الدليل</span></button>
          <button onClick={() => handleNavigate('about')} className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/5 border border-white/10"><Info className="w-7 h-7 text-purple-400" /><span className="font-bold text-[10px] text-white">عن راصد</span></button>
        </div>
      </Modal>
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </ThemeProvider>
);

export default App;
