import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, CheckSquare, Library
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
import TeacherLibrary from './components/TeacherLibrary';
import { useSchoolBell } from './hooks/useSchoolBell';

import RamadanTheme from './components/RamadanTheme';

// 👈 1. استدعاء زر المزامنة الشامل الجديد هنا
import GlobalSyncManager from './components/GlobalSyncManager'; 

// --- ✨ GLASS GLOW ICONS (التطوير الزجاجي الجديد) ---
const NavIconWrapper = ({ active, isRamadan, children }: any) => (
  <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-500 ${active ? 'scale-110' : 'opacity-40'}`}>
    <div className={`relative p-2 rounded-2xl transition-all duration-500 ${active ? (isRamadan ? 'bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.3)]') : ''}`}>
      {children}
    </div>
  </div>
);

const Dashboard3D = ({ active, isRamadan }: any) => (
  <NavIconWrapper active={active} isRamadan={isRamadan}>
    <LayoutDashboard size={24} className={active ? (isRamadan ? 'text-amber-400' : 'text-indigo-400') : 'text-white'} strokeWidth={active ? 2.5 : 2} />
  </NavIconWrapper>
);

const Attendance3D = ({ active, isRamadan }: any) => (
  <NavIconWrapper active={active} isRamadan={isRamadan}>
    <CalendarCheck size={24} className={active ? (isRamadan ? 'text-amber-400' : 'text-indigo-400') : 'text-white'} strokeWidth={active ? 2.5 : 2} />
  </NavIconWrapper>
);

const Students3D = ({ active, isRamadan }: any) => (
  <NavIconWrapper active={active} isRamadan={isRamadan}>
    <Users size={24} className={active ? (isRamadan ? 'text-amber-400' : 'text-indigo-400') : 'text-white'} strokeWidth={active ? 2.5 : 2} />
  </NavIconWrapper>
);

const Grades3D = ({ active, isRamadan }: any) => (
  <NavIconWrapper active={active} isRamadan={isRamadan}>
    <BarChart3 size={24} className={active ? (isRamadan ? 'text-amber-400' : 'text-indigo-400') : 'text-white'} strokeWidth={active ? 2.5 : 2} />
  </NavIconWrapper>
);

const Tasks3D = ({ active, isRamadan }: any) => (
  <NavIconWrapper active={active} isRamadan={isRamadan}>
    <CheckSquare size={24} className={active ? (isRamadan ? 'text-amber-400' : 'text-indigo-400') : 'text-white'} strokeWidth={active ? 2.5 : 2} />
  </NavIconWrapper>
);

const More3D = ({ active, isRamadan }: any) => (
  <NavIconWrapper active={active} isRamadan={isRamadan}>
    <div className="grid grid-cols-2 gap-1">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`w-2 h-2 rounded-sm border ${active ? (isRamadan ? 'bg-amber-400 border-amber-400' : 'bg-indigo-400 border-indigo-400') : 'border-white/50'}`}></div>
      ))}
    </div>
  </NavIconWrapper>
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
    { id: 'library', label: t('library') || 'المكتبة', icon: Library },
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
      case 'library': return <TeacherLibrary />;
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

      {/* Sidebar (Desktop) */}
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
            <button key={item.id} onClick={() => handleNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200/70 hover:bg-white/5'}`}>
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

      {/* Bottom Nav (Mobile) */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[9999] h-[85px] rounded-t-[2.5rem] flex justify-around items-end pb-4 border-t transition-colors duration-500 ${isRamadan ? 'bg-[#0f172a]/80 backdrop-blur-2xl border-white/10' : 'bg-white/95 border-slate-200'}`}>
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => handleNavigate(item.id)} className="relative w-full h-full flex flex-col items-center justify-end pb-1 active:scale-90 transition-transform">
              <div className={`absolute top-0 transition-all duration-500 ${isActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
                <div className="w-11 h-11"><item.IconComponent active={isActive} isRamadan={isRamadan} /></div>
              </div>
              <span className={`text-[10px] font-black ${isActive ? (isRamadan ? 'text-amber-400' : 'text-indigo-600') : 'text-indigo-200/50'}`}>{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => setShowMoreMenu(true)} className="relative w-full h-full flex flex-col items-center justify-end pb-1">
          <div className="absolute top-0 translate-y-1 scale-90 w-11 h-11"><More3D active={showMoreMenu} isRamadan={isRamadan} /></div>
          <span className="text-[10px] font-black text-indigo-200/50">{t('navMore') || 'المزيد'}</span>
        </button>
      </div>

      {/* More Menu Modal */}
      <Modal isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} className="max-w-md rounded-[2.5rem] mb-28 md:hidden z-[10000] bg-transparent">
        <div className={`p-5 rounded-[2.5rem] border backdrop-blur-3xl shadow-[0_10px_50px_rgba(0,0,0,0.5)] transition-all duration-500 ${isRamadan ? 'bg-[#0f172a]/80 border-white/10' : 'bg-white/90 border-slate-200'}`}>
          
          <div className={`w-12 h-1.5 rounded-full mx-auto mb-5 ${isRamadan ? 'bg-white/20' : 'bg-slate-300'}`}></div>

          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleNavigate('groups')} className={`group p-4 rounded-3xl flex flex-col items-center justify-center gap-3 border active:scale-90 transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
              <div className={`p-2.5 rounded-2xl transition-colors ${isRamadan ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-600'}`}>
                <Users size={24} strokeWidth={2.5} />
              </div>
              <span className={`font-black text-[10px] tracking-wide ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>{t('navGroups')}</span>
            </button>

            <button onClick={() => handleNavigate('leaderboard')} className={`group p-4 rounded-3xl flex flex-col items-center justify-center gap-3 border active:scale-90 transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
              <div className={`p-2.5 rounded-2xl transition-colors ${isRamadan ? 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30' : 'bg-purple-100 text-purple-600'}`}>
                <Medal size={24} strokeWidth={2.5} />
              </div>
              <span className={`font-black text-[10px] tracking-wide ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>{t('navKnights')}</span>
            </button>

            <button onClick={() => handleNavigate('reports')} className={`group p-4 rounded-3xl flex flex-col items-center justify-center gap-3 border active:scale-90 transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
              <div className={`p-2.5 rounded-2xl transition-colors ${isRamadan ? 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30' : 'bg-indigo-100 text-indigo-600'}`}>
                <FileText size={24} strokeWidth={2.5} />
              </div>
              <span className={`font-black text-[10px] tracking-wide ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>{t('navReports')}</span>
            </button>

            <button onClick={() => handleNavigate('settings')} className={`group p-4 rounded-3xl flex flex-col items-center justify-center gap-3 border active:scale-90 transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(148,163,184,0.2)]' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
              <div className={`p-2.5 rounded-2xl transition-colors ${isRamadan ? 'bg-slate-500/20 text-slate-300 group-hover:bg-slate-500/30' : 'bg-slate-200 text-slate-600'}`}>
                <SettingsIcon size={24} strokeWidth={2.5} />
              </div>
              <span className={`font-black text-[10px] tracking-wide ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>{t('navSettings')}</span>
            </button>

            <button onClick={() => handleNavigate('guide')} className={`group p-4 rounded-3xl flex flex-col items-center justify-center gap-3 border active:scale-90 transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
              <div className={`p-2.5 rounded-2xl transition-colors ${isRamadan ? 'bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30' : 'bg-cyan-100 text-cyan-600'}`}>
                <BookOpen size={24} strokeWidth={2.5} />
              </div>
              <span className={`font-black text-[10px] tracking-wide ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>{t('navGuideShort')}</span>
            </button>

            <button onClick={() => handleNavigate('about')} className={`group p-4 rounded-3xl flex flex-col items-center justify-center gap-3 border active:scale-90 transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(244,114,182,0.2)]' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
              <div className={`p-2.5 rounded-2xl transition-colors ${isRamadan ? 'bg-pink-500/20 text-pink-400 group-hover:bg-pink-500/30' : 'bg-pink-100 text-pink-600'}`}>
                <Info size={24} strokeWidth={2.5} />
              </div>
              <span className={`font-black text-[10px] tracking-wide ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>{t('navAbout')}</span>
            </button>

            <button onClick={() => handleNavigate('library')} className={`group p-4 rounded-3xl flex flex-col items-center justify-center gap-3 border active:scale-90 transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(232,121,249,0.2)]' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
              <div className={`p-2.5 rounded-2xl transition-colors ${isRamadan ? 'bg-fuchsia-500/20 text-fuchsia-400 group-hover:bg-fuchsia-500/30' : 'bg-fuchsia-100 text-fuchsia-600'}`}>
                <Library size={24} strokeWidth={2.5} />
              </div>
              <span className={`font-black text-[10px] tracking-wide ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>{t('library') || 'المكتبة'}</span>
            </button>

          </div>
        </div>
      </Modal>

      {/* 👈 2. الزر السحري تم زراعته هنا ليطفو فوق كل التطبيق بشكل آمن ومستقل */}
      <GlobalSyncManager />
      
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
