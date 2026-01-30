mport React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import {
  LayoutDashboard, Users, CalendarCheck, BarChart3,
  Settings as SettingsIcon, Info, FileText, BookOpen, Medal, Loader2, Menu, X
} from 'lucide-react';

// ✅ استعادة Router والملاحة (هذا هو القلب النابض للتطبيق الذي كان مفقوداً)
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import { auth } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// استيراد المكونات
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

// محتوى التطبيق الداخلي (يجب أن يكون داخل Router)
const AppContent: React.FC = () => {
  const {
    isDataLoaded, teacherInfo, setTeacherInfo, schedule, setSchedule,
    periodTimes, setPeriodTimes, currentSemester, setCurrentSemester,
    students, setStudents, classes, setClasses
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged_in' | 'logged_out'>('checking');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('3.6.0');

  useEffect(() => {
    // ✅ تهيئة Google Auth للآيفون لضمان استقبال الرد
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    }

    const fetchVersion = async () => {
      try {
        if (window.electron && window.electron.getAppVersion) {
          const ver = await window.electron.getAppVersion();
          setAppVersion(ver);
        } else if (Capacitor.isNativePlatform()) {
          const info = await CapacitorApp.getInfo();
          setAppVersion(info.version);
        }
      } catch (error) { console.error(error); }
    };
    fetchVersion();
  }, []);

  // 🔐 مراقبة حالة الدخول
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!isMounted) return;
        const isGuest = localStorage.getItem('guest_mode') === 'true';
        if (isGuest || user) {
            setAuthStatus('logged_in');
        } else {
            setAuthStatus('logged_out');
        }
    });
    
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  const handleLoginSuccess = (user: any) => {
    localStorage.setItem('guest_mode', user ? 'false' : 'true');
    setAuthStatus('logged_in');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // تعريف عناصر القائمة
  const menuItems = [
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

  if (!isDataLoaded || authStatus === 'checking') {
    return <div className="flex flex-col h-full w-full items-center justify-center bg-gray-50 fixed inset-0 z-[99999]"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" /><p className="text-slate-500 font-medium">جاري التحضير...</p></div>;
  }

  // ✅ استخدام التوجيه الشرطي بدلاً من إخفاء المكونات (لضمان عدم تحميل الشاشات فوق بعضها)
  if (authStatus === 'logged_out') {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // الهيكل الرئيسي للتطبيق (القائمة + المحتوى)
  return (
    <div className="flex h-full bg-[#f3f4f6] font-sans text-slate-900 overflow-hidden relative">
      
      {/* زر القائمة للموبايل */}
      <div className="md:hidden fixed top-4 right-4 z-[60]">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="bg-white p-3 rounded-xl shadow-lg text-indigo-900 border border-indigo-100 active:scale-95 transition-transform">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* القائمة الجانبية (تعود لشكلها الطبيعي وتنزلق في الموبايل) */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-72 bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
         <div className="p-8 flex items-center gap-4 border-b border-slate-100">
            <div className="w-10 h-10"><BrandLogo className="w-full h-full" showText={false} /></div>
            <div><h1 className="text-xl font-black text-slate-900">راصد</h1><span className="text-[10px] font-bold text-indigo-600">نسخة المعلم</span></div>
         </div>
         
         <div className="p-4">
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100 mb-2">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 shadow-sm shrink-0">
                    {teacherInfo.avatar ? <img src={teacherInfo.avatar} className="w-full h-full object-cover" /> : <span className="font-black text-slate-500 text-lg">{teacherInfo.name?.[0]}</span>}
                </div>
                <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">{teacherInfo.name || 'مرحباً بك'}</p>
                    <p className="text-[10px] text-gray-500 truncate">{teacherInfo.school || 'المدرسة'}</p>
                </div>
            </div>
         </div>

         <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
            {menuItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                    <button key={item.path} onClick={() => handleNavigate(item.path)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        {item.label}
                    </button>
                );
            })}
         </nav>
         <div className="p-4 text-center border-t border-slate-100"><p className="text-[10px] font-bold text-gray-400">الإصدار {appVersion}</p></div>
      </aside>

      {/* المحتوى الرئيسي - يعود للعمل مع Routes */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 ${isMobileMenuOpen ? 'opacity-50 pointer-events-none scale-95' : ''}`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-20 md:pt-8 safe-area-top" id="main-scroll-container">
          <SyncStatusBar />
          <div className="max-w-7xl mx-auto min-h-full">
            <Routes>
                <Route path="/" element={<Dashboard students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({ ...prev, ...i }))} schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={() => {}} onNavigate={handleNavigate} onOpenSettings={() => handleNavigate('/settings')} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes} notificationsEnabled={true} onToggleNotifications={() => {}} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} />} />
                <Route path="/attendance" element={<AttendanceTracker students={students} classes={classes} setStudents={setStudents} />} />
                <Route path="/students" element={<StudentList students={students} classes={classes} onAddClass={(n) => setClasses(p=>[...p, n])} onAddStudentManually={(n,c,p,a,g) => setStudents(pr=>[...pr, {id: Math.random().toString(), name:n, classes:[c], parentPhone:p, avatar:a, gender:g || 'male', attendance:[], behaviors:[], grades:[]}])} onBatchAddStudents={(s) => setStudents(p=>[...p, ...s])} onUpdateStudent={(s) => setStudents(p=>p.map(x=>x.id===s.id?s:x))} onDeleteStudent={(id) => setStudents(p=>p.filter(x=>x.id!==id))} onViewReport={()=>{}} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} onDeleteClass={(c)=>setClasses(p=>p.filter(x=>x!==c))} />} />
                <Route path="/grades" element={<GradeBook students={students} classes={classes} onUpdateStudent={(s) => setStudents(p=>p.map(x=>x.id===s.id?s:x))} setStudents={setStudents} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} teacherInfo={teacherInfo} />} />
                <Route path="/leaderboard" element={<Leaderboard students={students} classes={classes} onUpdateStudent={(s) => setStudents(p=>p.map(x=>x.id===s.id?s:x))} />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<UserGuide />} />
                <Route path="/about" element={<About />} />
                {/* Fallback route */}
                <Route path="*" element={<Dashboard students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={(i) => setTeacherInfo(prev => ({ ...prev, ...i }))} schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={() => {}} onNavigate={handleNavigate} onOpenSettings={() => handleNavigate('/settings')} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes} notificationsEnabled={true} onToggleNotifications={() => {}} currentSemester={currentSemester as any} onSemesterChange={setCurrentSemester as any} />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

// ⚠️ هام جداً: هذا ما يجعل التنقل يعمل
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
