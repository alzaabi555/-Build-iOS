import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, X, ChevronLeft
} from 'lucide-react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { auth } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
// ⚠️ لا نستورد GoogleAuth هنا لتجنب التعليق

import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceTracker from './components/AttendanceTracker';
import GradeBook from './components/GradeBook';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Modal from './components/Modal'; // تأكد أن لديك مكون Modal
import Leaderboard from './components/Leaderboard';
import About from './components/About';
import UserGuide from './components/UserGuide';
import BrandLogo from './components/BrandLogo';
import WelcomeScreen from './components/WelcomeScreen';
import LoginScreen from './components/LoginScreen';
import SyncStatusBar from './components/SyncStatusBar';

// --- 🎨 1. استعادة الأيقونات ثلاثية الأبعاد (3D Icons) ---
const Dashboard3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8]'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="dash_bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#4338ca" /></linearGradient></defs>
    <rect x="10" y="10" width="20" height="20" rx="6" fill="url(#dash_bg)" />
    <rect x="34" y="10" width="20" height="20" rx="6" fill="#a5b4fc" />
    <rect x="10" y="34" width="20" height="20" rx="6" fill="#c7d2fe" />
    <rect x="34" y="34" width="20" height="20" rx="6" fill="url(#dash_bg)" />
  </svg>
);
const Attendance3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8]'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="cal_bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#dc2626" /></linearGradient></defs>
    <rect x="12" y="14" width="40" height="40" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="2" />
    <path d="M12 24 L52 24 L52 18 Q52 14 48 14 L16 14 Q12 14 12 18 Z" fill="url(#cal_bg)" />
    <circle cx="20" cy="12" r="3" fill="#991b1b" /><circle cx="44" cy="12" r="3" fill="#991b1b" />
    <path d="M22 38 L30 46 L44 30" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Students3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8]'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="user_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient></defs>
    <circle cx="32" cy="24" r="12" fill="url(#user_grad)" /><path d="M14 54 C14 40 50 40 50 54 L50 58 L14 58 Z" fill="url(#user_grad)" />
  </svg>
);
const Grades3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8]'}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbbf24" /><stop offset="1" stopColor="#d97706" /></linearGradient>
      <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#059669" /></linearGradient>
      <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#818cf8" /><stop offset="1" stopColor="#4f46e5" /></linearGradient>
    </defs>
    <rect x="12" y="34" width="10" height="20" rx="2" fill="url(#bar1)" /><rect x="27" y="24" width="10" height="30" rx="2" fill="url(#bar2)" /><rect x="42" y="14" width="10" height="40" rx="2" fill="url(#bar3)" />
  </svg>
);
const More3D = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className={`w-full h-full transition-all duration-300 ${active ? 'filter drop-shadow-lg scale-110' : 'opacity-60 grayscale-[0.8]'}`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="grid_grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f472b6" /><stop offset="1" stopColor="#db2777" /></linearGradient></defs>
    <rect x="14" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="34" y="14" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="14" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" /><rect x="34" y="34" width="16" height="16" rx="4" fill="url(#grid_grad)" />
  </svg>
);

const AppContent: React.FC = () => {
  const { teacherInfo, setTeacherInfo, schedule, setSchedule, periodTimes, setPeriodTimes, currentSemester, setCurrentSemester, students, setStudents, classes, setClasses } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ الإصلاح التقني: البدء كـ "مسجل دخول" لمنع التعليق
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('logged_in'); 
  const [showMoreMenu, setShowMoreMenu] = useState(false); // القائمة المنبثقة

  // تحميل جوجل بأمان
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
        setTimeout(async () => {
            try {
                const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                await GoogleAuth.initialize();
            } catch (e) { console.error(e); }
        }, 1000);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && user.photoURL) setTeacherInfo(prev => ({ ...prev, avatar: user.photoURL }));
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = () => setAuthStatus('logged_in');
  const handleNavigate = (path: string) => { navigate(path); setShowMoreMenu(false); };
  const [showWelcome, setShowWelcome] = useState<boolean>(() => !localStorage.getItem('rased_welcome_seen'));

  // Helpers
  const handleUpdateStudent = (updated: any) => setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  const handleAddClass = (name: string) => setClasses(prev => [...prev, name]);
  const handleDeleteClass = (className: string) => { setClasses(prev => prev.filter(c => c !== className)); setStudents(prev => prev.map(s => { if (s.classes.includes(className)) { return { ...s, classes: s.classes.filter(c => c !== className) }; } return s; })); };
  const handleAddStudent = (name: string, className: string, phone?: string, avatar?: string, gender?: 'male' | 'female') => { setStudents(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, classes: [className], attendance: [], behaviors: [], grades: [], grade: '', parentPhone: phone, avatar: avatar, gender: gender || 'male' }]); };

  // عناصر القائمة السفلية (مع الأيقونات 3D)
  const mobileNavItems = [
    { id: '/', label: 'الرئيسية', IconComponent: Dashboard3D },
    { id: '/attendance', label: 'الحضور', IconComponent: Attendance3D },
    { id: '/students', label: 'الطلاب', IconComponent: Students3D },
    { id: '/grades', label: 'الدرجات', IconComponent: Grades3D },
  ];
  const isMoreActive = showMoreMenu;

  // عناصر القائمة الجانبية (لنسخة الآيباد/الكمبيوتر)
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

  if (authStatus === 'logged_out') {
      if (showWelcome) return <WelcomeScreen onFinish={() => { localStorage.setItem('rased_welcome_seen', 'true'); setShowWelcome(false); }} />;
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-full bg-[#f3f4f6] font-sans text-slate-900 overflow-hidden relative">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-l border-slate-200 shadow-sm z-50">
         <div className="p-8 flex items-center gap-4"><div className="w-12 h-12"><BrandLogo className="w-full h-full" showText={false} /></div><div><h1 className="text-2xl font-black text-slate-900">راصد</h1><span className="text-[10px] font-bold text-indigo-600">نسخة المعلم</span></div></div>
         <div className="px-6 mb-4"><div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100"><div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300 shadow-sm">{teacherInfo.avatar ? <img src={teacherInfo.avatar} className="w-full h-full object-cover" /> : <span className="font-black text-slate-500 text-lg flex items-center justify-center h-full">{teacherInfo.name?.[0]}</span>}</div><div className="overflow-hidden"><p className="text-xs font-bold text-slate-900 truncate">{teacherInfo.name || 'مرحباً بك'}</p><p className="text-[10px] text-gray-500 truncate">{teacherInfo.school || 'المدرسة'}</p></div></div></div>
         <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
            {desktopNavItems.map(item => {
                const isActive = location.pathname === item.path;
                return (<button key={item.path} onClick={() => handleNavigate(item.path)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><item.icon className="w-5 h-5" />{item.label}</button>);
            })}
         </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-8 safe-area-top pb-32 md:pb-8" id="main-scroll-container">
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

      {/* --- 📱 Mobile Bottom Nav (3D Icons) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-[85px] bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex justify-around items-end pb-4 border-t border-slate-200/60 pb-safe safe-area-bottom">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.id;
          return (
            <button key={item.id} onClick={() => handleNavigate(item.id)} className="relative w-full h-full flex flex-col items-center justify-end group pb-1 touch-manipulation active:scale-90 transition-transform">
              <div className={`absolute top-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) pointer-events-none ${isActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
                <div className={`w-11 h-11 ${isActive ? 'drop-shadow-2xl' : ''}`}><item.IconComponent active={isActive} /></div>
              </div>
              <span className={`text-[10px] font-black transition-all duration-300 pointer-events-none ${isActive ? 'translate-y-0 text-indigo-600 opacity-100' : 'translate-y-4 text-gray-400 opacity-0'}`}>{item.label}</span>
              {isActive && <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
            </button>
          );
        })}
        
        {/* زر المزيد (3D) */}
        <button onClick={() => setShowMoreMenu(true)} className="relative w-full h-full flex flex-col items-center justify-end group pb-1 touch-manipulation active:scale-90 transition-transform">
          <div className={`absolute top-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) pointer-events-none ${isMoreActive ? '-translate-y-7 scale-110' : 'translate-y-1 scale-90'}`}>
            <div className={`w-11 h-11 ${isMoreActive ? 'drop-shadow-2xl' : ''}`}><More3D active={isMoreActive} /></div>
          </div>
          <span className={`text-[10px] font-black transition-all duration-300 pointer-events-none ${isMoreActive ? 'translate-y-0 text-indigo-600 opacity-100' : 'translate-y-4 text-gray-400 opacity-0'}`}>المزيد</span>
          {isMoreActive && <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
        </button>
      </div>

      {/* --- 🗂️ Menu Modal (استعادة القائمة الشبكية) --- */}
      <Modal isOpen={showMoreMenu} onClose={() => setShowMoreMenu(false)} className="max-w-md rounded-[2rem] mb-28 md:hidden z-[10000]">
        <div className="text-center mb-6">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <h3 className="font-black text-slate-800 text-lg">القائمة الكاملة</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => handleNavigate('/leaderboard')} className="p-4 bg-amber-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-amber-200 aspect-square shadow-sm"><Medal className="w-7 h-7 text-amber-600" /><span className="font-bold text-[10px] text-amber-800">فرسان الشهر</span></button>
          <button onClick={() => handleNavigate('/reports')} className="p-4 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-indigo-200 aspect-square shadow-sm"><FileText className="w-7 h-7 text-indigo-600" /><span className="font-bold text-[10px] text-indigo-800">التقارير</span></button>
          <button onClick={() => handleNavigate('/settings')} className="p-4 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-gray-300 aspect-square shadow-sm"><SettingsIcon className="w-7 h-7 text-gray-600" /><span className="font-bold text-[10px] text-gray-800">الإعدادات</span></button>
          <button onClick={() => handleNavigate('/guide')} className="p-4 bg-cyan-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-cyan-200 aspect-square shadow-sm"><BookOpen className="w-7 h-7 text-cyan-600" /><span className="font-bold text-[10px] text-cyan-800">الدليل</span></button>
          <button onClick={() => handleNavigate('/about')} className="p-4 bg-purple-50 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform border border-purple-200 aspect-square shadow-sm"><Info className="w-7 h-7 text-purple-600" /><span className="font-bold text-[10px] text-purple-800">حول التطبيق</span></button>
        </div>
      </Modal>
    </div>
  );
};

const App: React.FC = () => <ThemeProvider><AppProvider><HashRouter><AppContent /></HashRouter></AppProvider></ThemeProvider>;
export default App;
