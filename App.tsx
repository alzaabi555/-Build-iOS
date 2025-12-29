
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Student, ScheduleDay, PeriodTime, Group } from './types';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceTracker from './components/AttendanceTracker';
import GradeBook from './components/GradeBook';
import StudentReport from './components/StudentReport';
import ExcelImport from './components/ExcelImport';
import NoorPlatform from './components/NoorPlatform';
import GroupCompetition from './components/GroupCompetition';
import UserGuide from './components/UserGuide';
import BrandLogo from './components/BrandLogo';
import Modal from './components/Modal';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  CalendarCheck, 
  BarChart3, 
  ChevronLeft,
  ChevronDown,
  GraduationCap,
  CheckCircle2,
  Info,
  Trash2,
  X,
  Globe,
  AlertTriangle,
  Bell,
  RefreshCcw,
  Trophy,
  HelpCircle,
  RotateCcw,
  Github,
  Save,
  FileUp,
  Sun,
  Moon
} from 'lucide-react';

// Error Boundary
interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, errorMsg: error.toString() };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-black text-center p-6" dir="rtl">
          <div className="bg-white/60 dark:bg-white/10 backdrop-blur-xl w-[90%] max-w-sm p-8 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-xl">
             <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <AlertTriangle className="w-10 h-10 text-rose-500 dark:text-rose-400" />
             </div>
             <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">عذراً، حدث خطأ</h2>
             <p className="text-sm text-slate-500 dark:text-white/60 font-medium mb-6 leading-relaxed">
               نظام الحماية النشط قام بحفظ بياناتك. يرجى إعادة التشغيل.
             </p>
             <button 
                onClick={() => window.location.reload()} 
                className="w-full py-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-gray-200 dark:border-white/10"
             >
                <RotateCcw className="w-4 h-4" /> إعادة تشغيل النظام
             </button>
             <p className="mt-4 text-[10px] text-slate-400 dark:text-white/30 font-mono dir-ltr overflow-hidden text-ellipsis whitespace-nowrap">{this.state.errorMsg.substring(0, 50)}...</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info' | 'bell', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-100',
    error: 'bg-rose-500/20 border-rose-500/30 text-rose-800 dark:text-rose-100',
    bell: 'bg-amber-500/20 border-amber-500/30 text-amber-800 dark:text-amber-100',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-800 dark:text-blue-100'
  };
  
  const Icon = type === 'bell' ? Bell : (type === 'success' ? CheckCircle2 : (type === 'error' ? AlertTriangle : Info));

  return (
    <motion.div 
      initial={{ y: -100, opacity: 0, x: '-50%' }}
      animate={{ y: 0, opacity: 1, x: '-50%' }}
      exit={{ y: -100, opacity: 0, x: '-50%' }}
      className={`fixed top-6 left-1/2 ${colors[type]} backdrop-blur-xl border px-6 py-3.5 rounded-full shadow-lg z-[2000] flex items-center gap-3 max-w-[90vw]`}
    >
      <div className="bg-white/40 dark:bg-white/10 p-1.5 rounded-full">
         <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-bold tracking-wide">{message}</span>
    </motion.div>
  );
};

const OMAN_GOVERNORATES = ["مسقط", "ظفار", "مسندم", "البريمي", "الداخلية", "شمال الباطنة", "جنوب الباطنة", "جنوب الشرقية", "شمال الشرقية", "الظاهرة", "الوسطى"];

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [currentSemester, setCurrentSemester] = useState<'1' | '2'>(() => {
     try { return localStorage.getItem('currentSemester') === '2' ? '2' : '1'; } catch { return '1'; }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    try { const saved = localStorage.getItem('studentData'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const [classes, setClasses] = useState<string[]>(() => {
    try { const saved = localStorage.getItem('classesData'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const [groups, setGroups] = useState<Group[]>(() => {
      try {
          const saved = localStorage.getItem('groupsData');
          if (saved) return JSON.parse(saved);
          return [ { id: 'g1', name: 'الصقور', color: 'emerald' }, { id: 'g2', name: 'النمور', color: 'orange' }, { id: 'g3', name: 'النجوم', color: 'purple' }, { id: 'g4', name: 'الرواد', color: 'blue' } ];
      } catch { return [ { id: 'g1', name: 'الصقور', color: 'emerald' }, { id: 'g2', name: 'النمور', color: 'orange' }, { id: 'g3', name: 'النجوم', color: 'purple' }, { id: 'g4', name: 'الرواد', color: 'blue' } ]; }
  });

  const [schedule, setSchedule] = useState<ScheduleDay[]>(() => {
    const defaultSchedule = [ { dayName: 'الأحد', periods: Array(8).fill('') }, { dayName: 'الاثنين', periods: Array(8).fill('') }, { dayName: 'الثلاثاء', periods: Array(8).fill('') }, { dayName: 'الأربعاء', periods: Array(8).fill('') }, { dayName: 'الخميس', periods: Array(8).fill('') } ];
    try { const saved = localStorage.getItem('scheduleData'); if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) return parsed; } } catch {}
    return defaultSchedule;
  });

  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(() => {
    const defaultTimes = Array(8).fill(null).map((_, i) => ({ periodNumber: i + 1, startTime: '', endTime: '' }));
    try { const saved = localStorage.getItem('periodTimes'); if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) return defaultTimes.map((def, i) => parsed[i] || def); } } catch {}
    return defaultTimes;
  });

  const [teacherInfo, setTeacherInfo] = useState(() => {
    try { return { name: localStorage.getItem('teacherName') || '', school: localStorage.getItem('schoolName') || '', subject: localStorage.getItem('subjectName') || '', governorate: localStorage.getItem('governorate') || '' }; } catch { return { name: '', school: '', subject: '', governorate: '' }; }
  });

  const [isSetupComplete, setIsSetupComplete] = useState(!!teacherInfo.name && !!teacherInfo.school);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => localStorage.getItem('selectedStudentId') || null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info' | 'bell'} | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { bellAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1085/1085-preview.mp3'); }, []);

  useEffect(() => {
    localStorage.setItem('studentData', JSON.stringify(students));
    localStorage.setItem('classesData', JSON.stringify(classes));
    localStorage.setItem('groupsData', JSON.stringify(groups));
    localStorage.setItem('teacherName', teacherInfo.name);
    localStorage.setItem('schoolName', teacherInfo.school);
    localStorage.setItem('subjectName', teacherInfo.subject);
    localStorage.setItem('governorate', teacherInfo.governorate);
    localStorage.setItem('scheduleData', JSON.stringify(schedule));
    localStorage.setItem('periodTimes', JSON.stringify(periodTimes));
    localStorage.setItem('currentSemester', currentSemester);
    localStorage.setItem('activeTab', activeTab);
    if(selectedStudentId) localStorage.setItem('selectedStudentId', selectedStudentId);
    else localStorage.removeItem('selectedStudentId');
  }, [students, classes, groups, teacherInfo, schedule, periodTimes, currentSemester, activeTab, selectedStudentId]);


  const handleUpdateStudent = (updatedStudent: Student) => setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  const handleDeleteStudent = (studentId: string) => { setStudents(prev => prev.filter(s => s.id !== studentId)); setToast({ message: 'تم حذف الطالب بنجاح', type: 'success' }); };
  const handleAddStudentManually = (name: string, className: string, phone?: string, avatar?: string) => {
    setStudents(prev => [{ id: Math.random().toString(36).substr(2, 9), name, grade: '', classes: [className], attendance: [], behaviors: [], grades: [], parentPhone: phone, avatar }, ...prev]);
    if (!classes.includes(className)) setClasses(prev => [...prev, className].sort());
  };
  const handleEditClass = (oldName: string, newName: string) => {
      setClasses(prev => prev.map(c => c === oldName ? newName : c).sort());
      setStudents(prev => prev.map(s => ({ ...s, classes: s.classes.map(c => c === oldName ? newName : c) })));
  };
  const handleDeleteClass = (className: string) => {
      setClasses(prev => prev.filter(c => c !== className));
      setStudents(prev => prev.map(s => ({ ...s, classes: s.classes.filter(c => c !== className) })));
  };

  const handleClearAllData = () => {
    if (confirm('سيتم حذف جميع الطلاب والسجلات. هل أنت متأكد؟')) {
      setStudents([]); setClasses([]); setToast({ message: 'تم حذف البيانات', type: 'success' }); setShowSettingsModal(false);
    }
  };

  const handleBackupData = async () => {
    setToast({ message: 'تم حفظ النسخة الاحتياطية بنجاح', type: 'success' });
  };

  const handleRestoreData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setToast({ message: 'تم استعادة البيانات بنجاح', type: 'success' });
  };

  const handleStartApp = (e?: React.FormEvent) => { if(e) e.preventDefault(); setIsSetupComplete(true); };
  
  const navItems = [
    { id: 'dashboard', icon: BarChart3, label: 'الرئيسية' },
    { id: 'attendance', icon: CalendarCheck, label: 'الحضور' }, 
    { id: 'students', icon: Users, label: 'الطلاب' },
    { id: 'grades', icon: GraduationCap, label: 'الدرجات' },
    { id: 'group-competition', icon: Trophy, label: 'الدوري' }, 
    { id: 'noor', icon: Globe, label: 'نور' },
    { id: 'guide', icon: HelpCircle, label: 'الدليل' },
  ];

  // Background Ambience
  const BackgroundOrbs = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-purple-600/10 dark:bg-purple-600/20 blur-[100px] animate-pulse delay-1000" />
    </div>
  );

  if (!isSetupComplete) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-white dark:bg-black px-8 overflow-hidden" style={{direction: 'rtl'}}>
        <BackgroundOrbs />
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-xl dark:shadow-[0_0_50px_rgba(255,255,255,0.1)] w-full max-w-sm border border-gray-200 dark:border-white/10 relative z-10"
        >
            <div className="mb-6 flex justify-center"><div className="w-28 h-28"><BrandLogo className="w-full h-full" /></div></div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 text-center tracking-tight">أهلاً بك في المستقبل</h1>
            <p className="text-sm text-slate-500 dark:text-white/50 font-bold mb-8 text-center leading-relaxed">نظام راصد OS لإدارة الفصل</p>
            <form onSubmit={handleStartApp} className="space-y-4">
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 mr-2 uppercase tracking-wider">الهوية</label>
                  <input type="text" className="w-full bg-slate-100 dark:bg-white/5 rounded-2xl py-3.5 px-5 text-sm font-bold text-slate-900 dark:text-white outline-none border border-transparent focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-white/20" value={teacherInfo.name} onChange={(e) => setTeacherInfo({...teacherInfo, name: e.target.value})} placeholder="اسم المعلم" required />
                  <input type="text" className="w-full bg-slate-100 dark:bg-white/5 rounded-2xl py-3.5 px-5 text-sm font-bold text-slate-900 dark:text-white outline-none border border-transparent focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-white/20" value={teacherInfo.school} onChange={(e) => setTeacherInfo({...teacherInfo, school: e.target.value})} placeholder="المدرسة" required />
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 mr-2 uppercase tracking-wider">التفاصيل</label>
                  <input type="text" className="w-full bg-slate-100 dark:bg-white/5 rounded-2xl py-3.5 px-5 text-sm font-bold text-slate-900 dark:text-white outline-none border border-transparent focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-white/20" value={teacherInfo.subject} onChange={(e) => setTeacherInfo({...teacherInfo, subject: e.target.value})} placeholder="المادة الدراسية" required />
                  <div className="relative">
                    <select 
                        value={teacherInfo.governorate} 
                        onChange={(e) => setTeacherInfo({...teacherInfo, governorate: e.target.value})} 
                        className="w-full bg-slate-100 dark:bg-white/5 rounded-2xl py-3.5 px-5 text-sm font-bold text-slate-900 dark:text-white outline-none border border-transparent focus:border-indigo-500 transition-all appearance-none"
                        required
                    >
                        <option value="" disabled className="text-black">اختر المحافظة...</option>
                        {OMAN_GOVERNORATES.map(gov => <option key={gov} value={gov} className="text-black">{gov}</option>)}
                    </select>
                    <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40 pointer-events-none" />
                  </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                type="submit" 
                disabled={!teacherInfo.name || !teacherInfo.school || !teacherInfo.subject || !teacherInfo.governorate} 
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-lg dark:shadow-[0_0_30px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                  ابدأ الرحلة <CheckCircle2 className="w-5 h-5" />
              </motion.button>
            </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-transparent overflow-hidden select-none text-slate-900 dark:text-white transition-colors duration-500" style={{direction: 'rtl'}}>
      <BackgroundOrbs />
      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>

      <aside className="hidden md:flex w-72 flex-col h-[calc(100vh-32px)] m-4 rounded-[2rem] bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-2xl shrink-0 z-50 overflow-hidden relative">
         <div className="p-8 flex flex-col items-center border-b border-gray-100 dark:border-white/5">
             <div className="w-24 h-24 mb-4"><BrandLogo className="w-full h-full" showText={false} /></div>
             <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">راصد OS</h2>
             <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 mt-1 tracking-widest uppercase">Version 3.3.0</p>
         </div>
         <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
            {navItems.map(item => (
               <motion.button 
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.95 }}
                 key={item.id} 
                 onClick={() => setActiveTab(item.id)} 
                 className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-gray-100 dark:border-white/10' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'}`}
               >
                 <item.icon className="w-5 h-5" /> <span className="text-sm font-bold">{item.label}</span>
               </motion.button>
            ))}
         </nav>
         <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
             <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-slate-500 dark:text-white/50 hover:bg-white dark:hover:bg-white/10 transition-all mb-2">
                 {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                 <span className="text-xs font-bold">{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
             </button>
             <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-slate-500 dark:text-white/50 hover:bg-white dark:hover:bg-white/10 transition-all"><Info className="w-5 h-5" /><span className="text-xs font-bold">حول التطبيق</span></button>
         </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <main className="flex-1 overflow-y-auto pt-[var(--sat)] md:pt-4 px-4 md:px-6 scrollbar-thin pb-[calc(100px+var(--sab))]" style={{ overscrollBehaviorY: 'none' }}>
          <div className="max-w-full md:max-w-7xl mx-auto h-full pt-2 md:pt-4">
            <Suspense fallback={<div className="flex justify-center items-center h-96"><div className="w-10 h-10 border-4 border-indigo-500 rounded-full animate-spin border-t-transparent shadow-[0_0_20px_#6366f1]"></div></div>}>
              <AnimatePresence mode="wait">
                <motion.div 
                    key={activeTab} 
                    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="h-full"
                >
                    {activeTab === 'dashboard' && <Dashboard students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={setTeacherInfo} schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={(s) => { setSelectedStudentId(s.id); setActiveTab('report'); }} onNavigate={(tab) => setActiveTab(tab)} onOpenSettings={() => setShowSettingsModal(true)} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes} />}
                    {activeTab === 'students' && <StudentList students={students} classes={classes} onAddClass={(c) => setClasses(prev => [...prev, c].sort())} onAddStudentManually={handleAddStudentManually} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} onViewReport={(s) => { setSelectedStudentId(s.id); setActiveTab('report'); }} onSwitchToImport={() => setActiveTab('import')} currentSemester={currentSemester} onSemesterChange={setCurrentSemester} onEditClass={handleEditClass} onDeleteClass={handleDeleteClass} />}
                    {activeTab === 'attendance' && <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />}
                    {activeTab === 'grades' && <GradeBook students={students} classes={classes} onUpdateStudent={handleUpdateStudent} setStudents={setStudents} currentSemester={currentSemester} onSemesterChange={setCurrentSemester} teacherInfo={teacherInfo} />}
                    {activeTab === 'group-competition' && <GroupCompetition students={students} classes={classes} onUpdateStudent={handleUpdateStudent} groups={groups} onUpdateGroups={setGroups} setStudents={setStudents} />}
                    {activeTab === 'import' && <ExcelImport existingClasses={classes} onImport={(ns) => { setStudents(prev => [...prev, ...ns]); setActiveTab('students'); }} onAddClass={(c) => setClasses(prev => [...prev, c].sort())} />}
                    {activeTab === 'noor' && <NoorPlatform />}
                    {activeTab === 'guide' && <UserGuide />}
                    {activeTab === 'report' && selectedStudentId && <div className="max-w-4xl mx-auto"><button onClick={() => setActiveTab('students')} className="mb-4 flex items-center gap-2 text-slate-500 dark:text-white/70 font-bold text-xs bg-white/60 dark:bg-white/10 px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/20 transition-all"><ChevronLeft className="w-4 h-4" /> العودة</button><StudentReport student={students.find(s => s.id === selectedStudentId)!} onUpdateStudent={handleUpdateStudent} currentSemester={currentSemester} teacherInfo={teacherInfo} /></div>}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </div>
        </main>
        
        {/* Floating Mobile Dock */}
        <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white/80 dark:bg-white/10 backdrop-blur-2xl border border-white/40 dark:border-white/20 z-50 shadow-2xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-[2.5rem] h-20 flex items-center justify-around px-2">
            {navItems.map(item => (
              <motion.button 
                whileTap={{ scale: 0.8 }}
                key={item.id} 
                onClick={() => setActiveTab(item.id)} 
                className={`flex flex-col items-center justify-center w-full h-full transition-all relative group`}
              >
                <div className={`p-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white dark:bg-white/20 text-indigo-600 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.2)] -translate-y-4 border border-gray-100 dark:border-white/20' : 'text-slate-400 dark:text-white/40'}`}>
                    <item.icon className="w-6 h-6" />
                </div>
                {activeTab === item.id && <motion.div layoutId="dock-dot" className="absolute bottom-2 w-1 h-1 bg-indigo-600 dark:bg-white rounded-full" />}
              </motion.button>
            ))}
        </nav>
      </div>

      {/* Glass Settings Modal */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)}>
          <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">حول التطبيق</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 transition-all"><X className="w-5 h-5 text-slate-500 dark:text-white/70"/></button>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shrink-0 mb-4">
              <div className="w-20 h-20 mb-3"><BrandLogo className="w-full h-full" showText={false}/></div>
              <h4 className="font-black text-slate-900 dark:text-white text-xl">راصد OS</h4>
              <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 tracking-[0.2em] uppercase mt-1">Version 3.3.0</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {/* Theme Toggle in Mobile Modal */}
              <button onClick={toggleTheme} className="w-full flex items-center gap-3 p-4 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/80 rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/20 transition-all border border-transparent dark:border-white/5">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              </button>

              <button onClick={handleBackupData} className="w-full flex items-center gap-3 p-4 bg-blue-500/10 text-blue-600 dark:text-blue-200 rounded-2xl font-bold text-xs hover:bg-blue-500/20 transition-all border border-blue-500/10">
                  <Save className="w-4 h-4" /> حفظ نسخة احتياطية
              </button>
              
              <label className="w-full flex items-center gap-3 p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-200 rounded-2xl font-bold text-xs hover:bg-emerald-500/20 transition-all cursor-pointer border border-emerald-500/10">
                  <FileUp className="w-4 h-4" /> استعادة بيانات
                  <input type="file" accept=".json" className="hidden" onChange={handleRestoreData} />
              </label>

              <div className="h-px bg-gray-100 dark:bg-white/10 my-2"></div>

              <button onClick={handleClearAllData} className="w-full flex items-center gap-3 p-4 bg-rose-500/10 text-rose-600 dark:text-rose-200 rounded-2xl font-bold text-xs hover:bg-rose-500/20 transition-all border border-rose-500/10">
                  <Trash2 className="w-4 h-4" /> حذف كافة البيانات
              </button>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-white/10 text-center shrink-0">
              <p className="text-[9px] font-bold text-slate-400 dark:text-white/30">Designed by Mohammed Al-Zaabi</p>
              <div className="flex justify-center gap-4 mt-2">
                  <a href="#" className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors"><Globe className="w-4 h-4"/></a>
                  <a href="#" className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors"><Github className="w-4 h-4"/></a>
              </div>
          </div>
      </Modal>
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
