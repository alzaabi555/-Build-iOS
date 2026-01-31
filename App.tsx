import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, Menu
} from 'lucide-react';

// ✅ الأساس: نظام التوجيه
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import { auth } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// المكونات
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
import { useSchoolBell } from './hooks/useSchoolBell';
import SyncStatusBar from './components/SyncStatusBar';

// أيقونات القائمة السفلية
const Dashboard3D = ({ active }: { active: boolean }) => <LayoutDashboard className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;
const Attendance3D = ({ active }: { active: boolean }) => <CalendarCheck className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;
const Students3D = ({ active }: { active: boolean }) => <Users className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;
const Grades3D = ({ active }: { active: boolean }) => <BarChart3 className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;
const More3D = ({ active }: { active: boolean }) => <SettingsIcon className={`w-7 h-7 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />;

const AppContent: React.FC = () => {
  const {
    isDataLoaded, teacherInfo, setTeacherInfo, schedule, setSchedule,
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester,
    students, setStudents, classes, setClasses
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('checking');
  const [appVersion, setAppVersion] = useState('3.6.0');

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    }
    const fetchVersion = async () => {
      try {
        if (window.electron) setAppVersion(await window.electron.getAppVersion());
        else if (Capacitor.isNativePlatform()) setAppVersion((await CapacitorApp.getInfo()).version);
      } catch (e) { console.error(e); }
    };
    fetchVersion();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!isMounted) return;
        const isGuest = localStorage.getItem('guest_mode') === 'true';
        if (isGuest || user) setAuthStatus('logged_in');
        else setAuthStatus('logged_out');
    });
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  const handleLoginSuccess = (user: any) => {
    localStorage.setItem('guest_mode', user ? 'false' : 'true');
    setAuthStatus('logged_in');
  };

  const handleNavigate = (path: string) => navigate(path);

  const [showWelcome, setShowWelcome] = useState<boolean>(() => !localStorage.getItem('rased_welcome_seen'));
  
  // (دوال مساعدة - اختصرتها هنا للتوضيح، الكود السابق لـ App.tsx كان يحتوي عليها بالكامل)
  const handleUpdateStudent = (updated: any) => setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  const handleAddClass = (name: string) => setClasses(prev => [...prev, name]);
  const handleDeleteClass = (className: string) => { setClasses(prev => prev.filter(c => c !== className)); setStudents(prev => prev.map(s => { if (s.classes.includes(className)) { return { ...s, classes: s.classes.filter(c => c !== className) }; } return s; })); };
  const handleAddStudent = (name: string, className: string, phone?: string, avatar?: string, gender?: 'male' | 'female') => { setStudents(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, classes: [className], attendance: [], behaviors: [], grades: [], grade: '', parentPhone: phone, avatar: avatar, gender: gender || 'male' }]); };

  // القائمة السفلية للموبايل
  const mobileNavItems = [
    { path: '/', label: 'الرئيسية', IconComponent: Dashboard3D },
    { path: '/attendance', label: 'الحضور', IconComponent: Attendance3D },
    { path: '/students', label: 'الطلاب', IconComponent: Students3D },
    { path: '/grades', label: 'الدرجات', IconComponent: Grades3D },
    { path: '/settings', label: 'المزيد', IconComponent: More3D },
  ];

  if (!isDataLoaded || authStatus === 'checking') return <div className="flex flex-col h-full w-full items-center justify-center bg-gray-50 fixed inset-0 z-[99999]"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" /><p className="text-slate-500 font-medium">جاري التحضير...</p></div>;
  if (showWelcome) return <WelcomeScreen onFinish={() => { localStorage.setItem('rased_welcome_seen', 'true'); setShowWelcome(false); }} />;
  if (authStatus === 'logged_out') return <LoginScreen onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="flex h-full bg-[#f3f4f6] font-sans text-slate-900 overflow-hidden relative">
      {/* المحتوى الرئيسي */}
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

      {/* القائمة السفلية للموبايل */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        <div className="flex justify-around items-center h-[70px] px-2">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button key={item.path} onClick={() => handleNavigate(item.path)} className="relative flex flex-col items-center justify-center w-full h-full group active:scale-95 transition-transform">
                <div className={`transition-all duration-300 ${isActive ? '-translate-y-1' : ''}`}>
                  <item.IconComponent active={isActive} />
                </div>
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

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <HashRouter>
           <AppContent />
        </HashRouter>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
