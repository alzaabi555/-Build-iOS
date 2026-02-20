import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2
} from 'lucide-react';

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
import { useSchoolBell } from './hooks/useSchoolBell';

// 🌙 استدعاء الثيم الخارجي المستقل
import RamadanTheme from './components/RamadanTheme';

// --- 3D ICONS COMPONENTS (أصبحت تستشعر رمضان وتغير ألوانها) ---
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
const More3D = ({ active, isRamadan }: { active: boolean, isRamadan?: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:scale-105'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="grid_grad" x1="0%" y1="0%" x2="1" y2="1"><stop offset="0%" stopColor={isRamadan ? "#fbbf24" : "#f472b6"} /><stop offset="100%" stopColor={isRamadan ? "#d97706" : "#db2777"} /></linearGradient></defs>
    <rect x="14" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="34" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="14" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="34" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" />
  </svg>
);

const AppContent: React.FC = () => {
  const {
    isDataLoaded, students, setStudents, classes, setClasses,
    teacherInfo, setTeacherInfo, schedule, setSchedule,
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester,
  } = useApp();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [appVersion, setAppVersion] = useState('3.8.6');
  
  // المستشعر الذكي لشهر رمضان
  const [isRamadan, setIsRamadan] = useState(false);

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

    try {
        const today = new Date();
        const hijriFormatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' });
        const parts = hijriFormatter.formatToParts(today);
        const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
        if (hMonth === 9) {
            setIsRamadan(true);
        }
    } catch(e) {
        console.error("Hijri Date parsing skipped.");
    }
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

  if (!isDataLoaded) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-gray-50 fixed inset-0 z-[99999]">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium text-sm">جاري استعادة البيانات المحلية...</p>
      </div>
    );
  }

  if (showWelcome) return <WelcomeScreen onFinish={handleFinishWelcome} />;

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setShowMoreMenu(false);
  };

  const handleUpdateStudent = (updated: any) => setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  const handleAddClass = (name: string) => setClasses(prev => [...prev, name]);
  const handleDeleteClass = (className: string) => {
    setClasses(prev => prev.filter(c => c !== className));
    setStudents(prev => prev.map(s => s.classes.includes(className) ? { ...s, classes: s.classes.filter(c => c !== className) } : s));
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
          currentSemester={currentSemester} onSemesterChange={setCurrentSemester}
        />;
      case 'attendance': return <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />;
      case 'students':
        return <StudentList
          students={students} classes={classes} onAddClass={handleAddClass} onAddStudentManually={handleAddStudent}
          onBatchAddStudents={(newS) => setStudents(prev => [...prev, ...newS])} onUpdateStudent={handleUpdateStudent}
          onDeleteStudent={(id) => setStudents(prev => prev.filter(s => s.id !== id))} onViewReport={(s) => { }}
          currentSemester={currentSemester} onSemesterChange={setCurrentSemester} onDeleteClass={handleDeleteClass}
        />;
      case 'grades':
        return <GradeBook
          students={students} classes={classes} onUpdateStudent={handleUpdateStudent} setStudents={setStudents}
          currentSemester={currentSemester} onSemesterChange={setCurrentSemester} teacherInfo={teacherInfo}
        />;
      case 'leaderboard': return <Leaderboard students={students} classes={classes} onUpdateStudent={handleUpdateStudent} teacherInfo={teacherInfo} />;
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
    <div className={`flex h-full font-sans overflow-hidden relative transition-colors duration-1000 ${isRamadan ? 'bg-[#020617] text-white' : 'bg-[#f3f4f6] text-slate-900'}`}>
      
      {/* 🌙 الثيم الرمضاني يغطي الشاشة بالكامل من الخلف */}
      <RamadanTheme />

      {/* Sidebar (Desktop) - تأثير زجاجي في رمضان */}
      <aside className={`hidden md:flex w-72 flex-col z-50 shadow-sm h-full relative transition-all duration-500 ${isRamadan ? 'bg-[#0f172a]/60 backdrop-blur-2xl border-l border-white/10' : 'bg-white border-l border-slate-200'}`}>
        <div className="p-8 flex items-center gap-4 relative z-10">
          <div className="w-12 h-12"><BrandLogo className="w-full h-full" showText={false} /></div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${isRamadan ? 'text-white' : 'text-slate-900'}`}>راصد</h1>
            <span className={`text-[10px] font-bold tracking-wider ${isRamadan ? 'text-amber-400' : 'text-indigo-600'}`}>نسخة المعلم المستقلة</span>
          </div>
        </div>
        
        <div className="px-6 mb-6 relative z-10">
          <div className={`p-4 rounded-2xl flex items-center gap-3 border transition-colors ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border shrink-0 ${isRamadan ? 'bg-[#1e1b4b] border-indigo-500/30' : 'bg-slate-200 border-slate-300'}`}>
              {teacherInfo?.avatar ? <img src={teacherInfo.avatar} className="w-full h-full object-cover" /> : <span className={`font-black text-lg ${isRamadan ? 'text-indigo-200' : 'text-slate-500'}`}>{teacherInfo?.name?.[0] || 'م'}</span>}
            </div>
            <div className="overflow-hidden">
              <p className={`text-xs font-bold truncate ${isRamadan ? 'text-white' : 'text-slate-900'}`}>{teacherInfo?.name || 'مرحباً بك'}</p>
              <p className={`text-[10px] truncate ${isRamadan ? 'text-indigo-200/70' : 'text-gray-500'}`}>{teacherInfo?.school || 'المدرسة'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-4 relative z-10">
          {desktopNavItems.map(item => (
            <button key={item.id} onClick={() => handleNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? (isRamadan ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-indigo-600 text-white shadow-lg') : (isRamadan ? 'text-indigo-200/70 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}>
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? (isRamadan ? 'text-amber-400' : 'text-white') : (isRamadan ? 'text-indigo-400/50' : 'text-slate-400')}`} strokeWidth={2.5} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className={`p-6 text-center border-t relative z-10 ${isRamadan ? 'border-white/10' : 'border-slate-200'}`}>
          <p className={`text-[10px] font-bold ${isRamadan ? 'text-indigo-200/40' : 'text-gray-400'}`}>الإصدار {appVersion}</p>
        </div>
      </aside>

      {/* Main Container - شفاف ليظهر الثيم من خلفه */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative z-10 ${isRamadan ? 'bg-transparent' : 'bg-[#f3f4f6]'}`}>
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-32 md:pb-4 px-4 md:px-8 pt-safe relative z-10">
          <div className="max-w-5xl mx-auto w-full min-h-full">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Bottom Nav (Mobile) - تأثير زجاجي في رمضان */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-[9999] h-[85px] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex justify-around items-end pb-4 border-t transition-colors duration-500 ${isRamadan ? 'bg-[#0f172a]/80 backdrop-blur-2xl border-white/10' : 'bg-white/95 backdrop-blur-xl border-slate-200/60'}`}>
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => handleNavigate(item.id)} className="relative w-full h-full flex flex-col items-center justify-end pb-1 touch-manipulation active:scale-90 transition-transform">
              <div className={`absolute top-0 transition-all duration-500 ${isActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
                {/* 🌙 تمرير مستشعر رمضان للأيقونات لكي تغير ألوانها */}
                <div className="w-11 h-11"><item.IconComponent active={isActive} isRamadan={isRamadan} /></div>
              </div>
              <span className={`text-[10px] font-black transition-all ${isActive ? (isRamadan ? 'text-amber-400' : 'text-indigo-600') : (isRamadan ? 'text-indigo-200/50 opacity-100' : 'text-gray-400 opacity-0')}`}>{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => setShowMoreMenu(true)} className="relative w-full h-full flex flex-col items-center justify-end pb-1 touch-manipulation active:scale-90 transition-transform">
          <div className={`absolute top-0 transition-all duration-500 ${isMoreActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
            <div className="w-11 h-11"><More3D active={isMoreActive} isRamadan={isRamadan} /></div>
          </div>
          <span className={`text-[10px] font-black transition-all ${isMoreActive ? (isRamadan ? 'text-amber-400' : 'text-indigo-600') : (isRamadan ? 'text-indigo-200/50 opacity-100' : 'text-gray-400 opacity-0')}`}>المزيد</span>
        </button>
      </div>

      {/* More Menu Modal - 🌙 أصبحت تتزين برمضان أيضاً */}
      <Modal isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} className={`max-w-md rounded-[2rem] mb-28 md:hidden z-[10000] ${isRamadan ? 'bg-transparent' : ''}`}>
        <div className={`grid grid-cols-3 gap-3 p-4 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white border-transparent'}`}>
          <button onClick={() => handleNavigate('leaderboard')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 border aspect-square transition-all ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-amber-50 border-amber-200'}`}>
            <Medal className={`w-7 h-7 ${isRamadan ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className={`font-bold text-[10px] ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>فرسان الشهر</span>
          </button>
          <button onClick={() => handleNavigate('reports')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 border aspect-square transition-all ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-indigo-50 border-indigo-200'}`}>
            <FileText className={`w-7 h-7 ${isRamadan ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span className={`font-bold text-[10px] ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>التقارير</span>
          </button>
          <button onClick={() => handleNavigate('settings')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 border aspect-square transition-all ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-100 border-gray-300'}`}>
            <SettingsIcon className={`w-7 h-7 ${isRamadan ? 'text-slate-400' : 'text-gray-600'}`} />
            <span className={`font-bold text-[10px] ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>الإعدادات</span>
          </button>
          <button onClick={() => handleNavigate('guide')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 border aspect-square transition-all ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-cyan-50 border-cyan-200'}`}>
            <BookOpen className={`w-7 h-7 ${isRamadan ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className={`font-bold text-[10px] ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>الدليل</span>
          </button>
          <button onClick={() => handleNavigate('about')} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 border aspect-square transition-all ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-purple-50 border-purple-200'}`}>
            <Info className={`w-7 h-7 ${isRamadan ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className={`font-bold text-[10px] ${isRamadan ? 'text-indigo-100' : 'text-slate-800'}`}>حول التطبيق</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
