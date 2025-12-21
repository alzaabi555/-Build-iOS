
import React, { useState, useEffect, useRef } from 'react';
import { Student } from './types';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AttendanceTracker from './components/AttendanceTracker';
import GradeBook from './components/GradeBook';
import StudentReport from './components/StudentReport';
import ExcelImport from './components/ExcelImport';
import { 
  Users, 
  CalendarCheck, 
  BarChart3, 
  FileUp, 
  Settings as SettingsIcon,
  ChevronLeft,
  GraduationCap,
  School,
  CheckCircle2
} from 'lucide-react';

const App: React.FC = () => {
  const getSafeStorage = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved || saved === "undefined" || saved === "null") return defaultValue;
      const parsed = JSON.parse(saved);
      if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
      return parsed;
    } catch (e) {
      return defaultValue;
    }
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'attendance' | 'grades' | 'import' | 'report'>(() => {
    return (localStorage.getItem('activeTab') as any) || 'dashboard';
  });
  
  const [students, setStudents] = useState<Student[]>(() => getSafeStorage('studentData', []));
  const [classes, setClasses] = useState<string[]>(() => getSafeStorage('classesData', []));
  
  const [teacherInfo, setTeacherInfo] = useState({
    name: localStorage.getItem('teacherName') || '',
    school: localStorage.getItem('schoolName') || ''
  });

  const [isSetupComplete, setIsSetupComplete] = useState(!!teacherInfo.name && !!teacherInfo.school);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(localStorage.getItem('selectedStudentId'));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('studentData', JSON.stringify(students));
      localStorage.setItem('classesData', JSON.stringify(classes));
      localStorage.setItem('activeTab', activeTab);
      localStorage.setItem('teacherName', teacherInfo.name);
      localStorage.setItem('schoolName', teacherInfo.school);
      if (selectedStudentId) localStorage.setItem('selectedStudentId', selectedStudentId);
      setIsSaving(true);
      const timeout = setTimeout(() => setIsSaving(false), 800);
      return () => clearTimeout(timeout);
    } catch (e) {}
  }, [students, classes, activeTab, selectedStudentId, teacherInfo]);

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };

  const handleAddStudentManually = (name: string, className: string, phone?: string) => {
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      grade: '',
      classes: [className],
      attendance: [],
      behaviors: [],
      grades: [],
      parentPhone: phone
    };
    setStudents(prev => [newStudent, ...prev]);
    if (!classes.includes(className)) {
      setClasses(prev => [...prev, className].sort());
    }
  };

  const handleImportStudents = (newStudents: Student[]) => {
    setStudents(prev => [...prev, ...newStudents]);
    const newClasses = Array.from(new Set(newStudents.flatMap(s => s.classes || [])));
    setClasses(prev => Array.from(new Set([...prev, ...newClasses])).sort());
    setActiveTab('students');
  };

  const handleAddClass = (className: string) => {
    if (!classes.includes(className)) {
        setClasses(prev => [...prev, className].sort());
    }
  };

  if (!isSetupComplete) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white px-8">
        <div className="w-20 h-20 bg-blue-600 rounded-[2.2rem] flex items-center justify-center mb-10 shadow-2xl shadow-blue-100">
           <School className="text-white w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">مرحباً بك في مدرستي</h1>
        <p className="text-[10px] text-gray-400 font-bold mb-10 text-center uppercase tracking-widest">إدارة ذكية لشؤون المعلم والطلاب</p>
        <div className="w-full max-w-sm space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">اسم المعلم / المعلمة</label>
            <input type="text" className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 text-sm font-bold outline-none" placeholder="أ. أحمد الهاشمي" value={teacherInfo.name} onChange={(e) => setTeacherInfo({...teacherInfo, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">اسم المدرسة</label>
            <input type="text" className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 text-sm font-bold outline-none" placeholder="اسم المدرسة" value={teacherInfo.school} onChange={(e) => setTeacherInfo({...teacherInfo, school: e.target.value})} />
          </div>
          <button disabled={!teacherInfo.name || !teacherInfo.school} onClick={() => setIsSetupComplete(true)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50 mt-6 flex items-center justify-center gap-3">
            بدء الاستخدام <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f2f2f7] overflow-hidden">
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200 z-40 safe-top no-print shrink-0">
        <div className="px-5 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">م</div>
              <div className="flex flex-col">
                <h1 className="text-[11px] font-black text-gray-900 truncate max-w-[150px] leading-tight">{teacherInfo.school}</h1>
                <span className="text-[8px] font-bold text-gray-400">أ. {teacherInfo.name}</span>
              </div>
          </div>
          <div className="flex items-center gap-3">
            {isSaving && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
            <button className="p-2 bg-gray-50 text-gray-400 rounded-2xl active-scale border border-gray-100">
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4 no-print scroll-container">
        <div className="max-w-md mx-auto w-full pb-28">
          {activeTab === 'dashboard' && <Dashboard students={students} teacherInfo={teacherInfo} onSelectStudent={(s) => { setSelectedStudentId(s.id); setActiveTab('report'); }} />}
          {activeTab === 'students' && <StudentList students={students} classes={classes} onAddClass={handleAddClass} onAddStudentManually={handleAddStudentManually} onUpdateStudent={handleUpdateStudent} onViewReport={(s) => { setSelectedStudentId(s.id); setActiveTab('report'); }} />}
          {activeTab === 'attendance' && <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />}
          {activeTab === 'grades' && <GradeBook students={students} classes={classes} onUpdateStudent={handleUpdateStudent} />}
          {activeTab === 'import' && <ExcelImport existingClasses={classes} onImport={handleImportStudents} onAddClass={handleAddClass} />}
          {activeTab === 'report' && selectedStudentId && students.find(s => s.id === selectedStudentId) && (
            <div className="pb-10">
              <button onClick={() => setActiveTab('students')} className="flex items-center text-blue-600 mb-5 font-black px-4 py-2 bg-white rounded-2xl shadow-sm border border-gray-50 w-fit active-scale"><ChevronLeft className="w-5 h-5 ml-1" /> العودة</button>
              <StudentReport student={students.find(s => s.id === selectedStudentId)!} />
            </div>
          )}
        </div>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 safe-bottom no-print z-50 shadow-lg rounded-t-[2.5rem]">
        <div className="flex justify-around items-center py-3 px-2 max-w-md mx-auto">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'الرئيسية' },
            { id: 'attendance', icon: CalendarCheck, label: 'الحضور' },
            { id: 'grades', icon: GraduationCap, label: 'الدرجات' },
            { id: 'students', icon: Users, label: 'الطلاب' },
            { id: 'import', icon: FileUp, label: 'استيراد' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1 min-w-[60px] py-1 transition-all rounded-2xl active-scale ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-[9px] font-black">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
