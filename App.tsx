import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { LayoutDashboard, Users, CalendarCheck, BarChart3, Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, X, ChevronLeft } from 'lucide-react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { auth } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
// ❌ تم حذف السطر الذي يسبب التعليق (import GoogleAuth)

import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceTracker from './components/AttendanceTracker';
import GradeBook from './components/GradeBook';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Leaderboard from './components/Leaderboard';
import About from './components/About';
import UserGuide from './components/UserGuide';
import BrandLogo from './components/BrandLogo';
import WelcomeScreen from './components/WelcomeScreen';
import LoginScreen from './components/LoginScreen';
import SyncStatusBar from './components/SyncStatusBar';

const Dashboard3D = ({ active }: { active: boolean }) => <LayoutDashboard className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;
const Attendance3D = ({ active }: { active: boolean }) => <CalendarCheck className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;
const Students3D = ({ active }: { active: boolean }) => <Users className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;
const Grades3D = ({ active }: { active: boolean }) => <BarChart3 className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;
const More3D = ({ active }: { active: boolean }) => <SettingsIcon className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;

const AppContent: React.FC = () => {
  const { teacherInfo, setTeacherInfo, schedule, setSchedule, periodTimes, setPeriodTimes, currentSemester, setCurrentSemester, students, setStudents, classes, setClasses } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // 🚀 التغيير الجذري: الحالة تبدأ بـ "دخول" فوراً لتجاوز الدائرة
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('logged_in'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // تحميل جوجل في الخلفية (لا يؤثر على فتح التطبيق)
  useEffect(() => {
    const initGoogle = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                // استدعاء آمن: حتى لو فشل، التطبيق شغال
                const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                await GoogleAuth.initialize();
                console.log("Google Auth loaded silently");
            } catch (e) {
                console.error("Google Auth failed to load (App will continue work)", e);
            }
        }
    };
    // تأخير بسيط لضمان أن التطبيق فتح أولاً
    setTimeout(initGoogle, 1000);
  }, []);

  // مراقبة فايربيس
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
             if (user.photoURL) setTeacherInfo(prev => ({ ...prev, avatar: user.photoURL }));
        }
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = () => { setAuthStatus('logged_in'); };
  const handleNavigate = (path: string) => { navigate(path); setIsMobileMenuOpen(false); };
  const [showWelcome, setShowWelcome] = useState<boolean>(() => !localStorage.getItem('rased_welcome_seen'));

  // Helpers
  const handleUpdateStudent = (updated: any) => setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  const handleAddClass = (name: string) => setClasses(prev => [...prev, name]);
  const handleDeleteClass = (className: string) => { setClasses(prev => prev.filter(c => c !== className)); setStudents(prev => prev.map(s => { if (s.classes.includes(className)) { return { ...s, classes: s.classes.filter(c => c !== className) }; } return s; })); };
  const handleAddStudent = (name: string, className: string, phone?: string, avatar?: string, gender?: 'male' | 'female') => { setStudents(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, classes: [className], attendance: [], behaviors: [], grades: [], grade: '', parentPhone: phone, avatar: avatar, gender: gender || 'male' }]); };

  const mobileNavItems = [
    { path: '/', label: 'الرئيسية', IconComponent: Dashboard3D },
    { path: '/attendance', label: 'الحضور', IconComponent: Attendance3D },
    { path: '/students', label: 'الطلاب', IconComponent: Students3D },
    { path: '/grades', label: 'الدرجات', IconComponent: Grades3D },
    { path: 'MORE_MENU', label: 'المزيد', IconComponent: More3D },
  ];

  const moreMenuLinks = [
    { path: '/leaderboard', label: 'فرسان الشهر', icon: Medal, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { path: '/reports', label: 'التقارير', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
    { path: '/settings', label: 'الإعدادات', icon: SettingsIcon, color: 'text-slate-600', bg: 'bg-slate-100' },
    { path: '/guide', label: 'دليل المعلم', icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { path: '/about', label: 'حول التطبيق', icon: Info, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

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

  // ⚠️ تم إزالة شرط "checking" بالكامل
  // لن يظهر اللودر أبداً
  
  if (authStatus === 'logged_out') {
      if (showWelcome) return <WelcomeScreen onFinish={() => { localStorage.setItem('rased_welcome_seen', 'true'); setShowWelcome(false); }} />;
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-full bg-[#f3f4f6] font-sans text-slate-900 overflow-hidden relative">
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

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-8 safe-area-top pb-24 md:pb-8" id="main-scroll-container">
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

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[150] md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
          <div className="absolute bottom-24 left-4 right-4 bg-white/90 backdrop-blur-xl rounded-[2rem] p-4 shadow-2xl border border-white/50 animate-in slide-in-from-bottom-10 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 px-2">
               <span className="text-sm font-bold text-slate-500">القائمة الكاملة</span>
               <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 bg-slate-100 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {moreMenuLinks.map((item) => (
                <button key={item.path} onClick={() => handleNavigate(item.path)} className="flex items-center justify-between w-full p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-transform">
                  <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center`}><item.icon className={`w-5 h-5 ${item.color}`} /></div><span className="font-bold text-slate-700 text-sm">{item.label}</span></div>
                  <ChevronLeft className="w-5 h-5 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        <div className="flex justify-around items-center h-[70px] px-2">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === 'MORE_MENU' && isMobileMenuOpen);
            return (
              <button key={item.path} onClick={() => { if (item.path === 'MORE_MENU') { setIsMobileMenuOpen(!isMobileMenuOpen); } else { handleNavigate(item.path); } }} className="relative flex flex-col items-center justify-center w-full h-full group active:scale-95 transition-transform">
                <div className={`transition-all duration-300 ${isActive ? '-translate-y-1' : ''}`}><item.IconComponent active={isActive} /></div>
                <span className={`text-[10px] font-black mt-1 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{item.label}</span>
                {isActive && <div className="absolute bottom-2 w-1 h-1 bg-indigo-600 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => <ThemeProvider><AppProvider><HashRouter><AppContent /></HashRouter></AppProvider></ThemeProvider>;
export default App;
