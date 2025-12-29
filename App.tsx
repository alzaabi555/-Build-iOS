
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
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share as SharePlugin } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { 
  Users, 
  CalendarCheck, 
  BarChart3, 
  ChevronLeft,
  ChevronDown,
  GraduationCap,
  CheckCircle2,
  Info,
  Database,
  Trash2,
  Phone,
  Heart,
  X,
  Download,
  Share,
  Globe,
  Upload,
  AlertTriangle,
  Bell,
  RefreshCcw,
  MapPin,
  Trophy,
  HelpCircle,
  RotateCcw,
  Github,
  Save,
  FileUp
} from 'lucide-react';

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
    this.state = {
      hasError: false,
      errorMsg: ''
    };
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
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center" dir="rtl">
          <div className="bg-white w-[90%] max-w-sm p-8 rounded-[2rem] shadow-xl border border-rose-100">
             <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
             </div>
             <h2 className="text-xl font-black text-slate-800 mb-2">عذراً، حدث خطأ غير متوقع</h2>
             <p className="text-sm text-slate-500 font-bold mb-6 leading-relaxed">
               لا تقلق، بياناتك محفوظة. حدثت مشكلة تقنية بسيطة.
             </p>
             <button 
                onClick={() => window.location.reload()} 
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
             >
                <RotateCcw className="w-4 h-4" /> إعادة تشغيل التطبيق
             </button>
             <p className="mt-4 text-[10px] text-gray-400 font-mono dir-ltr overflow-hidden text-ellipsis whitespace-nowrap">{this.state.errorMsg.substring(0, 50)}...</p>
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

  const styles = type === 'success' 
    ? 'bg-emerald-500/90 text-white shadow-emerald-500/30' 
    : type === 'error' 
    ? 'bg-rose-500/90 text-white shadow-rose-500/30' 
    : type === 'bell' 
    ? 'bg-amber-500/90 text-white shadow-amber-500/30' 
    : 'bg-indigo-600/90 text-white shadow-indigo-500/30';
  
  const Icon = type === 'bell' ? Bell : (type === 'success' ? CheckCircle2 : (type === 'error' ? AlertTriangle : Info));

  return (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 ${styles} backdrop-blur-md px-6 py-3.5 rounded-full shadow-2xl z-[2000] flex items-center gap-3 animate-in slide-in-from-top-6 duration-500 border border-white/20 max-w-[90vw]`}>
      <div className="bg-white/20 p-1.5 rounded-full">
         <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-black tracking-wide">{message}</span>
    </div>
  );
};

const OMAN_GOVERNORATES = ["مسقط", "ظفار", "مسندم", "البريمي", "الداخلية", "شمال الباطنة", "جنوب الباطنة", "جنوب الشرقية", "شمال الشرقية", "الظاهرة", "الوسطى"];

const AppContent: React.FC = () => {
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
    const data = {
      students,
      classes,
      groups,
      schedule,
      periodTimes,
      teacherInfo,
      version: '3.3.0',
      date: new Date().toISOString()
    };
    
    const fileName = `Rased_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const jsonString = JSON.stringify(data);

    try {
      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        await SharePlugin.share({
          title: 'نسخة احتياطية - راصد',
          url: result.uri,
        });
      } else {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setToast({ message: 'تم حفظ النسخة الاحتياطية بنجاح', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'حدث خطأ أثناء النسخ الاحتياطي', type: 'error' });
    }
  };

  const handleRestoreData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.students && Array.isArray(data.students)) {
        if (confirm('سيتم استبدال البيانات الحالية بالنسخة المختارة. هل أنت متأكد؟')) {
          setStudents(data.students || []);
          setClasses(data.classes || []);
          if(data.groups) setGroups(data.groups);
          if(data.schedule) setSchedule(data.schedule);
          if(data.periodTimes) setPeriodTimes(data.periodTimes);
          if(data.teacherInfo) setTeacherInfo(data.teacherInfo);
          setToast({ message: 'تم استعادة البيانات بنجاح', type: 'success' });
          setShowSettingsModal(false);
        }
      } else {
        throw new Error("Invalid Format");
      }
    } catch (err) {
      setToast({ message: 'ملف النسخة الاحتياطية غير صالح', type: 'error' });
    }
    if (e.target) e.target.value = '';
  };

  const handleStartApp = (e?: React.FormEvent) => { if(e) e.preventDefault(); setIsSetupComplete(true); };
  const handleResetSetup = () => setTeacherInfo({ name: '', school: '', subject: '', governorate: '' });

  const navItems = [
    { id: 'dashboard', icon: BarChart3, label: 'الرئيسية' },
    { id: 'attendance', icon: CalendarCheck, label: 'الحضور' }, 
    { id: 'students', icon: Users, label: 'الطلاب' },
    { id: 'grades', icon: GraduationCap, label: 'الدرجات' },
    { id: 'group-competition', icon: Trophy, label: 'الدوري' }, 
    { id: 'noor', icon: Globe, label: 'نور' },
    { id: 'guide', icon: HelpCircle, label: 'الدليل' },
  ];

  if (!isSetupComplete) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 px-8 animate-in fade-in duration-700 overflow-auto" style={{direction: 'rtl'}}>
        <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-white/50">
            <div className="mb-6 flex justify-center"><div className="w-28 h-28 transform hover:scale-105 transition-transform duration-500"><BrandLogo className="w-full h-full" /></div></div>
            <h1 className="text-3xl font-black text-slate-800 mb-2 text-center tracking-tight">مرحباً بك في راصد</h1>
            <p className="text-sm text-slate-500 font-bold mb-8 text-center leading-relaxed">رفيقك الذكي لإدارة الفصل الدراسي</p>
            <form onSubmit={handleStartApp} className="space-y-4">
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 mr-2">المعلومات الشخصية</label>
                  <input type="text" className="w-full bg-white/80 rounded-2xl py-3.5 px-5 text-sm font-bold outline-none border border-transparent focus:border-indigo-300 transition-all" value={teacherInfo.name} onChange={(e) => setTeacherInfo({...teacherInfo, name: e.target.value})} placeholder="اسم المعلم" required />
                  <input type="text" className="w-full bg-white/80 rounded-2xl py-3.5 px-5 text-sm font-bold outline-none border border-transparent focus:border-indigo-300 transition-all" value={teacherInfo.school} onChange={(e) => setTeacherInfo({...teacherInfo, school: e.target.value})} placeholder="المدرسة" required />
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 mr-2">تفاصيل العمل</label>
                  <input type="text" className="w-full bg-white/80 rounded-2xl py-3.5 px-5 text-sm font-bold outline-none border border-transparent focus:border-indigo-300 transition-all" value={teacherInfo.subject} onChange={(e) => setTeacherInfo({...teacherInfo, subject: e.target.value})} placeholder="المادة الدراسية" required />
                  
                  <div className="relative">
                    <select 
                        value={teacherInfo.governorate} 
                        onChange={(e) => setTeacherInfo({...teacherInfo, governorate: e.target.value})} 
                        className="w-full bg-white/80 rounded-2xl py-3.5 px-5 text-sm font-bold outline-none border border-transparent focus:border-indigo-300 transition-all appearance-none text-slate-700"
                        required
                    >
                        <option value="" disabled>اختر المحافظة...</option>
                        {OMAN_GOVERNORATES.map(gov => <option key={gov} value={gov}>{gov}</option>)}
                    </select>
                    <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
              </div>

              <button type="submit" disabled={!teacherInfo.name || !teacherInfo.school || !teacherInfo.subject || !teacherInfo.governorate} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 flex items-center justify-center gap-2 mt-4 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  بدء الاستخدام <CheckCircle2 className="w-5 h-5" />
              </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-transparent overflow-hidden select-none" style={{direction: 'rtl'}}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <aside className="hidden md:flex w-72 flex-col h-[calc(100vh-32px)] m-4 rounded-[2rem] bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl shrink-0 z-50 overflow-hidden relative">
         <div className="p-8 flex flex-col items-center border-b border-gray-100/50">
             <div className="w-24 h-24 mb-4"><BrandLogo className="w-full h-full" showText={false} /></div>
             <h2 className="text-xl font-black text-slate-800 tracking-tight">راصد</h2>
             <p className="text-[10px] font-bold text-slate-400 mt-1">{teacherInfo.school}</p>
         </div>
         <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
            {navItems.map(item => (
               <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100/80'}`}>
                 <item.icon className="w-5 h-5" /> <span className="text-sm font-bold">{item.label}</span>
               </button>
            ))}
         </nav>
         <div className="p-4 border-t border-gray-100/50 bg-white/30">
             <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-slate-500 hover:bg-white hover:shadow-md transition-all"><Info className="w-5 h-5" /><span className="text-xs font-bold">حول التطبيق</span></button>
         </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 overflow-y-auto pt-[var(--sat)] md:pt-4 px-4 md:px-6 scrollbar-thin pb-[calc(90px+var(--sab))]" style={{ overscrollBehaviorY: 'none' }}>
          <div className="max-w-full md:max-w-7xl mx-auto h-full pt-2 md:pt-4">
            <Suspense fallback={<div className="flex justify-center items-center h-96"><div className="w-10 h-10 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent"></div></div>}>
              <div key={activeTab} className="page-enter-active">
                  {activeTab === 'dashboard' && <Dashboard students={students} teacherInfo={teacherInfo} onUpdateTeacherInfo={setTeacherInfo} schedule={schedule} onUpdateSchedule={setSchedule} onSelectStudent={(s) => { setSelectedStudentId(s.id); setActiveTab('report'); }} onNavigate={(tab) => setActiveTab(tab)} onOpenSettings={() => setShowSettingsModal(true)} periodTimes={periodTimes} setPeriodTimes={setPeriodTimes} />}
                  {activeTab === 'students' && <StudentList students={students} classes={classes} onAddClass={(c) => setClasses(prev => [...prev, c].sort())} onAddStudentManually={handleAddStudentManually} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} onViewReport={(s) => { setSelectedStudentId(s.id); setActiveTab('report'); }} onSwitchToImport={() => setActiveTab('import')} currentSemester={currentSemester} onSemesterChange={setCurrentSemester} onEditClass={handleEditClass} onDeleteClass={handleDeleteClass} />}
                  {activeTab === 'attendance' && <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />}
                  {activeTab === 'grades' && <GradeBook students={students} classes={classes} onUpdateStudent={handleUpdateStudent} setStudents={setStudents} currentSemester={currentSemester} onSemesterChange={setCurrentSemester} teacherInfo={teacherInfo} />}
                  {activeTab === 'group-competition' && <GroupCompetition students={students} classes={classes} onUpdateStudent={handleUpdateStudent} groups={groups} onUpdateGroups={setGroups} setStudents={setStudents} />}
                  {activeTab === 'import' && <ExcelImport existingClasses={classes} onImport={(ns) => { setStudents(prev => [...prev, ...ns]); setActiveTab('students'); }} onAddClass={(c) => setClasses(prev => [...prev, c].sort())} />}
                  {activeTab === 'noor' && <NoorPlatform />}
                  {activeTab === 'guide' && <UserGuide />}
                  {activeTab === 'report' && selectedStudentId && <div className="max-w-4xl mx-auto"><button onClick={() => setActiveTab('students')} className="mb-4 flex items-center gap-2 text-indigo-600 font-bold text-xs bg-white px-4 py-2 rounded-full shadow-sm"><ChevronLeft className="w-4 h-4" /> العودة</button><StudentReport student={students.find(s => s.id === selectedStudentId)!} onUpdateStudent={handleUpdateStudent} currentSemester={currentSemester} teacherInfo={teacherInfo} /></div>}
              </div>
            </Suspense>
          </div>
        </main>
        
        <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-2xl border border-white/20 z-50 shadow-2xl rounded-[2rem] h-16 flex items-center justify-around px-2">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-90 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                <div className={`p-1.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-indigo-50 -translate-y-1' : ''}`}><item.icon className="w-5 h-5" /></div>
              </button>
            ))}
        </nav>
      </div>

      {/* COMPACT SETTINGS MODAL */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)}>
          <div className="flex justify-between items-center mb-2 shrink-0">
              <h3 className="font-black text-lg text-gray-900">حول التطبيق</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500"/></button>
          </div>
          
          <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-2xl border border-gray-100 shrink-0">
              <div className="w-16 h-16 mb-2"><BrandLogo className="w-full h-full" showText={false}/></div>
              <h4 className="font-black text-gray-900">راصد</h4>
              <p className="text-[10px] font-bold text-gray-400">الإصدار 3.3.0</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              <button onClick={handleBackupData} className="w-full flex items-center gap-3 p-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors">
                  <Save className="w-4 h-4" /> حفظ نسخة احتياطية
              </button>
              
              <label className="w-full flex items-center gap-3 p-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer">
                  <FileUp className="w-4 h-4" /> استعادة بيانات
                  <input type="file" accept=".json" className="hidden" onChange={handleRestoreData} />
              </label>

              <div className="h-px bg-gray-100 my-1"></div>

              <button onClick={handleClearAllData} className="w-full flex items-center gap-3 p-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors">
                  <Trash2 className="w-4 h-4" /> حذف كافة البيانات
              </button>
          </div>

          <div className="pt-2 border-t border-gray-100 text-center shrink-0">
              <p className="text-[9px] font-bold text-gray-400">تصميم وتطوير: محمد الزعابي</p>
              <div className="flex justify-center gap-4 mt-2">
                  <a href="#" className="text-gray-400 hover:text-indigo-600"><Globe className="w-4 h-4"/></a>
                  <a href="#" className="text-gray-400 hover:text-indigo-600"><Github className="w-4 h-4"/></a>
              </div>
          </div>
      </Modal>
    </div>
  );
};

const App: React.FC = () => <ErrorBoundary><AppContent /></ErrorBoundary>;
export default App;
