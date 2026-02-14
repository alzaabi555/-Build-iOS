import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { 
  LayoutDashboard, Users, CalendarCheck, BarChart3, 
  Settings as SettingsIcon, Grid, Info, FileText, BookOpen, Medal,
  ClipboardCheck, Trophy, Menu 
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

// Main App Container
const AppContent: React.FC = () => {
  const { 
      isDataLoaded, students, setStudents, classes, setClasses, 
      teacherInfo, setTeacherInfo, schedule, setSchedule, 
      periodTimes, setPeriodTimes, currentSemester, setCurrentSemester
  } = useApp();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // State to manage authentication status (Local Only)
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('checking');

  // Handle Android Back Button
  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (showMoreMenu) {
          setShowMoreMenu(false);
        } else if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
        } else {
          // If on dashboard and no modal is open, exit app
          CapacitorApp.exitApp();
        }
      });

      return () => {
        backListener.then(listener => listener.remove());
      };
    }
  }, [showMoreMenu, activeTab]);

  useEffect(() => {
      // Check if user has already made a choice (Guest or Auth)
      const isGuest = localStorage.getItem('guest_mode') === 'true';
      if (isGuest) {
          setAuthStatus('logged_in');
      } else {
          setAuthStatus('logged_out');
      }
  }, []);

  const handleLoginSuccess = (user: any | null) => {
      // In local mode, we treat everything as guest
      localStorage.setItem('guest_mode', 'true');
      setAuthStatus('logged_in');
  };

  // Welcome Screen State
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
      return !localStorage.getItem('rased_welcome_seen');
  });

  // Notification State
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
  
  // 1. Loading State
  if (!isDataLoaded || authStatus === 'checking') {
      return (
          <div className="flex h-full w-full items-center justify-center bg-gray-50 fixed inset-0 z-[99999]">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
      );
  }

  // 2. Welcome Screen (First Time Only)
  if (showWelcome) {
      return <WelcomeScreen onFinish={handleFinishWelcome} />;
  }

  // 3. Login Screen (If not started yet)
  if (authStatus === 'logged_out') {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 4. Main App
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

  const handleAddStudent = (name: string, className: string, phone?: string, avatar?: string, gender?: 'male'|'female') => {
      setStudents(prev => [...prev, { 
          id: Math.random().toString(36).substr(2,9), 
          name, classes: [className], attendance:[], behaviors:[], grades:[], grade: '', parentPhone: phone, avatar: avatar, gender: gender || 'male'
      }]);
  };

  const renderContent = () => {
      switch (activeTab) {
          case 'dashboard':
              return <Dashboard 
                  students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({...prev, ...i}))}
                  schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={() => {}} onNavigate={handleNavigate}
                  onOpenSettings={() => setActiveTab('settings')} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes}
                  notificationsEnabled={notificationsEnabled} onToggleNotifications={handleToggleNotifications}
                  currentSemester={currentSemester} onSemesterChange={setCurrentSemester}
              />;
          case 'attendance': return <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />;
          case 'students':
              return <StudentList 
                  students={students} classes={classes} onAddClass={handleAddClass} onAddStudentManually={handleAddStudent}
                  onBatchAddStudents={(newS) => setStudents(prev => [...prev, ...newS])} onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={(id) => setStudents(prev => prev.filter(s => s.id !== id))} onViewReport={(s) => {}}
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
          default: return <Dashboard students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={() => {}} schedule={schedule} onUpdateSchedule={() => {}} onSelectStudent={() => {}} onNavigate={handleNavigate} onOpenSettings={() => {}} periodTimes={periodTimes} setPeriodTimes={() => {}} notificationsEnabled={false} onToggleNotifications={() => {}} currentSemester={currentSemester} onSemesterChange={setCurrentSemester} />;
      }
  };

  // عناصر القائمة السفلية
  const mobileNavItems = [
      { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
      { id: 'attendance', label: 'الغياب', icon: ClipboardCheck },
      { id: 'students', label: 'الطلاب', icon: Users },
      { id: 'grades', label: 'الدرجات', icon: BookOpen },
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
        {/* Sidebar (لنسخة الكمبيوتر) */}
        <aside className="hidden md:flex w-72 flex-col bg-white border-l border-slate-200 z-50 shadow-sm transition-all h-full">
            <div className="p-8 flex items-center gap-4">
                <div className="w-12 h-12">
                    <BrandLogo className="w-full h-full" showText={false} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">راصد</h1>
                    <span className="text-[10px] font-bold text-[#446A8D] tracking-wider">نسخة المعلم</span>
                </div>
            </div>
            <div className="px-6 mb-6">
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 shadow-sm shrink-0">
                         {teacherInfo.avatar ? <img src={teacherInfo.avatar} className="w-full h-full object-cover"/> : <span className="font-black text-slate-500 text-lg">{teacherInfo.name?.[0]}</span>}
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
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-[#446A8D] text-white shadow-lg shadow-indigo-200 scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-100'}`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#446A8D]'} transition-colors`} strokeWidth={2.5} />
                            <span className="font-bold text-sm">{item.label}</span>
                            {isActive && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                        </button>
                    );
                })}
            </nav>
            <div className="p-6 text-center border-t border-slate-200">
                <p className="text-[10px] font-bold text-gray-400">الإصدار 3.6.0</p>
            </div>
        </aside>

        {/* Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#f3f4f6] z-0">
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-24 md:pb-4 px-4 md:px-8 pt-safe overscroll-contain" id="main-scroll-container">
                <div className="max-w-5xl mx-auto w-full min-h-full">
                    {renderContent()}
                </div>
            </div>
        </main>

        {/* ✅ القائمة السفلية (شكل الدائرة العائمة - Floating Circle Style) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9999]">
            {/* خلفية الشريط */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-slate-100"></div>
            
            {/* عناصر التنقل */}
            <div className="relative flex justify-around items-end h-20 px-2">
                {mobileNavItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className="relative flex flex-col items-center justify-end w-full h-full pb-3 group"
                        >
                            {/* الدائرة الخلفية المتحركة (تظهر عند التفعيل فقط) */}
                            <div 
                                className={`absolute transition-all duration-300 ease-out rounded-full flex items-center justify-center shadow-lg
                                    ${isActive 
                                        ? 'bg-[#446A8D] w-12 h-12 -top-4 opacity-100 scale-100' // لون الهيدر + رفع للأعلى
                                        : 'bg-transparent w-8 h-8 top-4 opacity-0 scale-50'
                                    }`}
                            >
                                {/* الأيقونة داخل الدائرة (بيضاء عند التفعيل) */}
                                <item.icon 
                                    size={24} 
                                    strokeWidth={2.5}
                                    color="white"
                                    className={`${isActive ? 'opacity-100' : 'opacity-0'}`}
                                />
                            </div>

                            {/* الأيقونة العادية (تظهر عند عدم التفعيل) */}
                            <div className={`transition-all duration-300 ${isActive ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                                <item.icon 
                                    size={26} 
                                    strokeWidth={2}
                                    className="text-slate-400 group-hover:text-slate-600"
                                />
                            </div>
                            
                            {/* النص */}
                            <span 
                                className={`text-[10px] font-bold mt-1 transition-all duration-300 
                                    ${isActive ? 'text-[#446A8D] translate-y-1' : 'text-slate-500'}`}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* زر المزيد (بنفس الستايل) */}
                <button
                    onClick={() => setShowMoreMenu(true)}
                    className="relative flex flex-col items-center justify-end w-full h-full pb-3 group"
                >
                    <div 
                        className={`absolute transition-all duration-300 ease-out rounded-full flex items-center justify-center shadow-lg
                            ${isMoreActive 
                                ? 'bg-[#446A8D] w-12 h-12 -top-4 opacity-100 scale-100' 
                                : 'bg-transparent w-8 h-8 top-4 opacity-0 scale-50'
                            }`}
                    >
                        <Menu 
                            size={24} 
                            strokeWidth={2.5}
                            color="white"
                            className={`${isMoreActive ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </div>

                    <div className={`transition-all duration-300 ${isMoreActive ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                        <Menu 
                            size={26} 
                            strokeWidth={2}
                            className="text-slate-400 group-hover:text-slate-600"
                        />
                    </div>
                    
                    <span 
                        className={`text-[10px] font-bold mt-1 transition-all duration-300 
                            ${isMoreActive ? 'text-[#446A8D] translate-y-1' : 'text-slate-500'}`}
                    >
                        المزيد
                    </span>
                </button>
            </div>
        </nav>

        {/* Menu Modal (Existing) */}
        <Modal isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} className="max-w-md rounded-[2rem] mb-24 md:hidden z-[10000]">
            <div className="text-center mb-6">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
                <h3 className="font-black text-slate-800 text-lg">القائمة الكاملة</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => handleNavigate('leaderboard')} className="p-4 bg-amber-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-amber-200 aspect-square shadow-sm">
                    <Medal className="w-7 h-7 text-amber-600" />
                    <span className="font-bold text-[10px] text-amber-800">فرسان الشهر</span>
                </button>
                <button onClick={() => handleNavigate('reports')} className="p-4 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-indigo-200 aspect-square shadow-sm">
                    <FileText className="w-7 h-7 text-indigo-600" />
                    <span className="font-bold text-[10px] text-indigo-800">التقارير</span>
                </button>
                <button onClick={() => handleNavigate('settings')} className="p-4 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-gray-300 aspect-square shadow-sm">
                    <SettingsIcon className="w-7 h-7 text-gray-600" />
                    <span className="font-bold text-[10px] text-gray-800">الإعدادات</span>
                </button>
                <button onClick={() => handleNavigate('guide')} className="p-4 bg-cyan-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-cyan-200 aspect-square shadow-sm">
                    <BookOpen className="w-7 h-7 text-cyan-600" />
                    <span className="font-bold text-[10px] text-cyan-800">الدليل</span>
                </button>
                <button onClick={() => handleNavigate('about')} className="p-4 bg-purple-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-purple-200 aspect-square shadow-sm">
                    <Info className="w-7 h-7 text-purple-600" />
                    <span className="font-bold text-[10px] text-purple-800">حول التطبيق</span>
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
