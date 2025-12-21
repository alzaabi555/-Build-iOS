import React, { useState, useEffect, useRef } from 'react';
import { Student } from './types';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceTracker from './components/AttendanceTracker';
import StudentReport from './components/StudentReport';
import ExcelImport from './components/ExcelImport';
import { 
  Users, 
  CalendarCheck, 
  BarChart3, 
  FileUp, 
  Settings as SettingsIcon,
  ChevronLeft,
  Info,
  X,
  User,
  Trash2,
  Download
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'attendance' | 'import' | 'report'>(() => {
    return (localStorage.getItem('activeTab') as any) || 'dashboard';
  });
  
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('studentData');
    return saved ? JSON.parse(saved) : [];
  });

  const [classes, setClasses] = useState<string[]>(() => {
    const saved = localStorage.getItem('classesData');
    if (saved) return JSON.parse(saved);
    const savedStudents = localStorage.getItem('studentData');
    if (savedStudents) {
        const parsed: Student[] = JSON.parse(savedStudents);
        return Array.from(new Set(parsed.flatMap(s => s.classes || []))).sort();
    }
    return [];
  });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem('selectedStudent');
    return saved ? JSON.parse(saved) : null;
  });

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('studentData', JSON.stringify(students));
    localStorage.setItem('classesData', JSON.stringify(classes));
    localStorage.setItem('activeTab', activeTab);
    localStorage.setItem('selectedStudent', JSON.stringify(selectedStudent));
    
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 1500);
  }, [students, classes, activeTab, selectedStudent]);

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (selectedStudent?.id === updatedStudent.id) {
      setSelectedStudent(updatedStudent);
    }
  };

  const handleImportStudents = (newStudents: Student[]) => {
    setStudents(prev => [...prev, ...newStudents]);
    // تحديث قائمة الفصول بناءً على المستورد لضمان شمولية القائمة
    const newClassesFromStudents = Array.from(new Set(newStudents.flatMap(s => s.classes || [])));
    setClasses(prev => Array.from(new Set([...prev, ...newClassesFromStudents])).sort());
    setActiveTab('students');
  };

  const handleAddClass = (className: string) => {
    if (!classes.includes(className)) {
        setClasses(prev => [...prev, className].sort());
    }
  };

  const handleClearData = () => {
    if (window.confirm('هل أنت متأكد من مسح كافة البيانات؟ لا يمكن التراجع عن هذه الخطوة.')) {
      setStudents([]);
      setClasses([]);
      setSelectedStudent(null);
      localStorage.clear();
      setShowSettingsModal(false);
    }
  };

  const handleBackupData = () => {
    const data = { students, classes };
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `مدرستي_نسخة_احتياطية_${new Date().toLocaleDateString('ar-EG')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard students={students} onSelectStudent={(s) => { setSelectedStudent(s); setActiveTab('report'); }} />;
      case 'students':
        return <StudentList 
          students={students} 
          classes={classes}
          onAddClass={handleAddClass}
          onUpdateStudent={handleUpdateStudent} 
          onViewReport={(s) => { setSelectedStudent(s); setActiveTab('report'); }} 
        />;
      case 'attendance':
        return <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />;
      case 'import':
        return <ExcelImport existingClasses={classes} onImport={handleImportStudents} onAddClass={handleAddClass} />;
      case 'report':
        return selectedStudent ? (
          <div className="pb-10">
            <button 
              onClick={() => setActiveTab('students')}
              className="flex items-center text-blue-600 mb-4 no-print font-bold px-2 py-1 rounded-lg active:bg-blue-50"
            >
              <ChevronLeft className="w-5 h-5 ml-1" />
              العودة للقائمة
            </button>
            <StudentReport student={selectedStudent} />
          </div>
        ) : null;
      default:
        return <Dashboard students={students} onSelectStudent={() => {}} />;
    }
  };

  const navItems = [
    { id: 'dashboard', icon: BarChart3, label: 'الرئيسية' },
    { id: 'attendance', icon: CalendarCheck, label: 'الحضور' },
    { id: 'students', icon: Users, label: 'الطلاب' },
    { id: 'import', icon: FileUp, label: 'استيراد' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f2f2f7] overflow-hidden">
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200 z-40 safe-top no-print shrink-0">
        <div className="px-5 h-14 flex justify-between items-center">
          <div className="flex items-center gap-2">
              <button 
                  onClick={() => setShowInfoModal(true)}
                  className="p-1.5 bg-blue-50 text-blue-600 rounded-full active:scale-90 transition-all"
              >
                  <Info className="w-5 h-5" />
              </button>
              <h1 className="text-base font-black text-gray-900">نظام مدرستي</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse">
                جار الحفظ...
              </span>
            )}
            <button onClick={() => setShowSettingsModal(true)} className="p-1.5 bg-gray-50 text-gray-400 rounded-full active:scale-90 transition-all">
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 no-print relative scroll-container">
        <div className="max-w-md mx-auto w-full pb-20">
          {renderContent()}
        </div>
      </main>

      <nav className="bg-white/95 backdrop-blur-xl border-t border-gray-200 safe-bottom no-print shrink-0 shadow-lg rounded-t-[1.25rem]">
        <div className="flex justify-around items-center py-2 px-2 max-w-md mx-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 min-w-[60px] py-1 transition-all rounded-xl ${
                activeTab === item.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[9px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white w-full max-w-[300px] rounded-[2rem] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-gray-900">إدارة البيانات</h3>
                <button onClick={() => setShowSettingsModal(false)} className="p-1.5 bg-gray-100 rounded-full"><X className="w-4 h-4"/></button>
             </div>
             <div className="space-y-3">
               <button onClick={handleBackupData} className="w-full flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold text-xs"><Download className="w-5 h-5"/> نسخة احتياطية</button>
               <button onClick={handleClearData} className="w-full flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl font-bold text-xs"><Trash2 className="w-5 h-5"/> مسح البيانات</button>
             </div>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white w-full max-w-[300px] rounded-[2rem] p-8 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4">
              <User className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">محمد درويش الزعابي</h2>
            <p className="text-blue-600 text-sm font-bold mb-6">مدرسة الابداع للبنين</p>
            <button onClick={() => setShowInfoModal(false)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;