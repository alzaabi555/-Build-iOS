import React, { useState, useEffect, Suspense } from 'react';
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
  Settings,
  ChevronLeft,
  GraduationCap,
  School,
  CheckCircle2
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('activeTab') || 'dashboard';
    } catch { return 'dashboard'; }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('studentData');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [classes, setClasses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('classesData');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [teacherInfo, setTeacherInfo] = useState(() => {
    try {
      return {
        name: localStorage.getItem('teacherName') || '',
        school: localStorage.getItem('schoolName') || ''
      };
    } catch {
      return { name: '', school: '' };
    }
  });

  const [isSetupComplete, setIsSetupComplete] = useState(!!teacherInfo.name && !!teacherInfo.school);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('studentData', JSON.stringify(students));
      localStorage.setItem('classesData', JSON.stringify(classes));
      localStorage.setItem('activeTab', activeTab);
      localStorage.setItem('teacherName', teacherInfo.name);
      localStorage.setItem('schoolName', teacherInfo.school);
    } catch (e) {
      console.warn("Storage restricted", e);
    }
  }, [students, classes, activeTab, teacherInfo]);

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

  if (!isSetupComplete) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white px-8" style={{direction: 'rtl'}}>
        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-100">
           <School className="text-white w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">نظام مدرستي</h1>
        <p className="text-xs text-gray-400 font-bold mb-10 text-center">قم بإعداد بياناتك للبدء</p>
        <div className="w-full max-w-sm space-y-4">
          <input type="text" className="w-full bg-gray-50 rounded-2xl py-4 px-5 text-sm font-bold outline-none border border-transparent focus:border-blue-200 transition-all" placeholder="اسم المعلم" value={teacherInfo.name} onChange={(e) => setTeacherInfo({...teacherInfo, name: e.target.value})} />
          <input type="text" className="w-full bg-gray-50 rounded-2xl py-4 px-5 text-sm font-bold outline-none border border-transparent focus:border-blue-200 transition-all" placeholder="اسم المدرسة" value={teacherInfo.school} onChange={(e) => setTeacherInfo({...teacherInfo, school: e.target.value})} />
          <button onClick={() => setIsSetupComplete(true)} disabled={!teacherInfo.name || !teacherInfo.school} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm active:scale-95 flex items-center justify-center gap-2">دخول <CheckCircle2 className="w-5 h-5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2f7]" style={{direction: 'rtl'}}>
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 safe-top">
        <div className="px-5 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">م</div>
              <div>
                <h1 className="text-[11px] font-black text-gray-900 leading-tight truncate max-w-[120px]">{teacherInfo.school}</h1>
                <p className="text-[9px] font-bold text-gray-400">أ. {teacherInfo.name}</p>
              </div>
          </div>
          <button className="p-2 bg-gray-50 text-gray-400 rounded-xl"><Settings className="w-5 h-5" /></button>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <Suspense fallback={<div className="text-center p-10 font-bold text-gray-400 text-xs">جاري التحميل...</div>}>
            {activeTab === 'dashboard' && <Dashboard students={students} teacherInfo={teacherInfo} onSelectStudent={(s) => { setSelectedStudentId(s.id); setActiveTab('report'); }} />}
            {activeTab === 'students' && <StudentList students={students} classes={classes} onAddClass={(c) => setClasses(prev => [...prev, c].sort())} onAddStudentManually={handleAddStudentManually} onUpdateStudent={handleUpdateStudent} onViewReport={(s) => { setSelectedStudentId(s.id); setActiveTab('report'); }} />}
            {activeTab === 'attendance' && <AttendanceTracker students={students} classes={classes} setStudents={setStudents} />}
            {activeTab === 'grades' && <GradeBook students={students} classes={classes} onUpdateStudent={handleUpdateStudent} />}
            {activeTab === 'import' && <ExcelImport existingClasses={classes} onImport={(ns) => { setStudents(prev => [...prev, ...ns]); setActiveTab('students'); }} onAddClass={(c) => setClasses(prev => [...prev, c].sort())} />}
            {activeTab === 'report' && selectedStudentId && (
              <div>
                <button onClick={() => setActiveTab('students')} className="mb-4 flex items-center gap-1 text-blue-600 font-bold text-xs"><ChevronLeft className="w-4 h-4" /> العودة للطلاب</button>
                <StudentReport student={students.find(s => s.id === selectedStudentId)!} />
              </div>
            )}
          </Suspense>
        </div>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 safe-bottom z-50">
        <div className="flex justify-around items-center py-3 max-w-md mx-auto">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'الرئيسية' },
            { id: 'attendance', icon: CalendarCheck, label: 'الحضور' },
            { id: 'grades', icon: GraduationCap, label: 'الدرجات' },
            { id: 'students', icon: Users, label: 'الطلاب' },
            { id: 'import', icon: FileUp, label: 'استيراد' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
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