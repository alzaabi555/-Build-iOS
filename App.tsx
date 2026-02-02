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
import SyncStatusBar from './components/SyncStatusBar';

// ============================================================================
// 💎 طقم أيقونات القائمة السفلية (Vector Icons)
// ============================================================================

// 1. الرئيسية (Dashboard)
const NavIconDashboard = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`w-full h-full transition-all duration-300 ${active ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="9" height="9" rx="3" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"/>
    <rect x="13" y="2" width="9" height="9" rx="3" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" opacity={active ? 0.6 : 1}/>
    <rect x="2" y="13" width="9" height="9" rx="3" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" opacity={active ? 0.4 : 1}/>
    <rect x="13" y="13" width="9" height="9" rx="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

// 2. الحضور (Attendance)
const NavIconAttendance = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`w-full h-full transition-all duration-300 ${active ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="4" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.1 : 0} stroke="currentColor" strokeWidth="2"/>
    <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {active ? (
        <path d="M8 14L11 17L16 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    ) : (
        <path d="M3 10H21" stroke="currentColor" strokeWidth="2"/>
    )}
  </svg>
);

// 3. الطلاب (Students)
const NavIconStudents = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`w-full h-full transition-all duration-300 ${active ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"/>
    <path d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {active && <path d="M12 4L15 2L12 0L9 2L12 4Z" fill="currentColor" fillOpacity={0.5} />}
  </svg>
);

// 4. الدرجات (Grades)
const NavIconGrades = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`w-full h-full transition-all duration-300 ${active ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 20V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    {active && <circle cx="18" cy="4" r="2" fill="currentColor" />}
  </svg>
);

// 5. المزيد (More)
const NavIconMore = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`w-full h-full transition-all duration-300 ${active ? 'text-indigo-600 rotate-90' : 'text-slate-400'}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="2" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="2" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="2" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="14" width="7" height="7" rx="2" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const AppContent: React.FC = () => {
  const { teacherInfo, setTeacherInfo, schedule, setSchedule, periodTimes, setPeriodTimes, currentSemester, setCurrentSemester, students, setStudents, classes, setClasses } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('logged_in'); 
  const [showMoreMenu, setShowMoreMenu] = useState(false); 

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

  const handleUpdateStudent = (updated: any) => setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  const handleAddClass = (name: string) => setClasses(prev => [...prev, name]);
  const handleDeleteClass = (className: string) => { setClasses(prev => prev.filter(c => c !== className)); setStudents(prev => prev.map(s => { if (s.classes.includes(className)) { return { ...s, classes: s.classes.filter(c => c !== className) }; } return s; })); };
  const handleAddStudent = (name: string, className: string, phone?: string, avatar?: string, gender?: 'male' | 'female') => { setStudents(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, classes: [className], attendance: [], behaviors: [], grades: [], grade: '', parentPhone: phone, avatar: avatar, gender: gender || 'male' }]); };

  // ✅ استخدام أيقونات الفيكتور الجديدة هنا
  const mobileNavItems = [
    { id: '/', label: 'الرئيسية', IconComponent: NavIconDashboard },
    { id: '/attendance', label: 'الحضور', IconComponent: NavIconAttendance },
    { id: '/students', label: 'الطلاب', IconComponent: NavIconStudents },
    { id: '/grades', label: 'الدرجات', IconComponent: NavIconGrades },
  ];
  const isMoreActive = showMoreMenu;

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

      {/* --- 📱 Mobile Bottom Nav (Vector Icons) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] h-[85px] bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex justify-around items-end pb-4 border-t border-slate-200/60 pb-safe safe-area-bottom">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.id;
          return (
            <button key={item.id} onClick={() => handleNavigate(item.id)} className="relative w-full h-full flex flex-col items-center justify-end group pb-1 touch-manipulation active:scale-90 transition-transform">
              <div className={`absolute top-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) pointer-events-none ${isActive ? '-translate-y-6 scale-110' : 'translate-y-1 scale-90'}`}>
                <div className={`w-8 h-8 ${isActive ? 'drop-shadow-lg' : ''}`}><item.IconComponent active={isActive} /></div>
              </div>
              {/* النص يظهر فقط عند التفعيل كما طلبت */}
              <span className={`text-[10px] font-black transition-all duration-300 pointer-events-none ${isActive ? 'translate-y-0 text-indigo-600 opacity-100' : 'translate-y-4 text-gray-400 opacity-0'}`}>{item.label}</span>
              {isActive && <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
            </button>
          );
        })}
        
        {/* زر المزيد (Vector) */}
        <button onClick={() => setShowMoreMenu(true)} className="relative w-full h-full flex flex-col items-center justify-end group pb-1 touch-manipulation active:scale-90 transition-transform">
          <div className={`absolute top-0 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) pointer-events-none ${isMoreActive ? '-translate-y-6 scale-110' : 'translate-y-1 scale-90'}`}>
            <div className={`w-8 h-8 ${isMoreActive ? 'drop-shadow-lg' : ''}`}><NavIconMore active={isMoreActive} /></div>
          </div>
          <span className={`text-[10px] font-black transition-all duration-300 pointer-events-none ${isMoreActive ? 'translate-y-0 text-indigo-600 opacity-100' : 'translate-y-4 text-gray-400 opacity-0'}`}>المزيد</span>
          {isMoreActive && <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
        </button>
      </div>

      {/* --- 🗂️ Menu Modal --- */}
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
