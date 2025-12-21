
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
  Info,
  X,
  Trash2,
  Download,
  GraduationCap,
  Phone,
  User,
  UploadCloud,
  Database
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'attendance' | 'grades' | 'import' | 'report'>(() => {
    return (localStorage.getItem('activeTab') as any) || 'dashboard';
  });
  
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('studentData');
    return saved ? JSON.parse(saved) : [];
  });

  const [classes, setClasses] = useState<string[]>(() => {
    const saved = localStorage.getItem('classesData');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem('selectedStudent');
    return saved ? JSON.parse(saved) : null;
  });

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('studentData', JSON.stringify(students));
    localStorage.setItem('classesData', JSON.stringify(classes));
    localStorage.setItem('activeTab', activeTab);
    localStorage.setItem('selectedStudent', JSON.stringify(selectedStudent));
    
    setIsSaving(true);
    const timeout = setTimeout(() => setIsSaving(false), 1000);
    return () => clearTimeout(timeout);
  }, [students, classes, activeTab, selectedStudent]);

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (selectedStudent?.id === updatedStudent.id) {
      setSelectedStudent(updatedStudent);
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

  // ميزة النسخة الاحتياطية (تصدير JSON)
  const handleBackup = () => {
    const data = {
      students,
      classes,
      exportDate: new Date().toISOString(),
      appName: "Madrasati System",
      version: "1.2.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `مدرستي_نسخة_احتياطية_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('تم تصدير النسخة الاحتياطية بنجاح');
  };

  // ميزة استعادة البيانات (استيراد JSON)
  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.students && json.classes) {
          if (confirm('هل أنت متأكد من استعادة هذه النسخة؟ سيتم استبدال كافة البيانات الحالية بالبيانات الموجودة في الملف.')) {
            setStudents(json.students);
            setClasses(json.classes);
            alert('تمت استعادة البيانات بنجاح!');
            setShowSettingsModal(false);
          }
        } else {
          alert('هذا الملف غير صالح أو لا يحتوي على بيانات نظام مدرستي.');
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.');
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
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
      case 'grades':
        return <GradeBook students={students} classes={classes} onUpdateStudent={handleUpdateStudent} />;
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
    { id: 'grades', icon: GraduationCap, label: 'الدرجات' },
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
            {isSaving && <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">محفوظ</span>}
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
        <div className="flex justify-around items-center py-2 px-1 max-w-md mx-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 min-w-[55px] py-1 transition-all rounded-xl ${
                activeTab === item.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[8px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
             <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Database className="w-7 h-7 text-gray-400" />
             </div>
             <h3 className="text-base font-black text-gray-900 mb-6 text-center">إدارة بيانات النظام</h3>
             
             <div className="space-y-3">
               <button 
                onClick={handleBackup} 
                className="w-full flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-sm shadow-blue-100/50"
               >
                 <Download className="w-5 h-5"/> نسخة احتياطية (تصدير)
               </button>

               <button 
                onClick={() => restoreInputRef.current?.click()} 
                className="w-full flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-sm shadow-emerald-100/50"
               >
                 <UploadCloud className="w-5 h-5"/> استعادة البيانات (استيراد)
               </button>
               <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestore} />

               <div className="pt-2">
                 <button 
                  onClick={() => { if(confirm('هل أنت متأكد من مسح كافة البيانات؟ سيتم حذف جميع الطلاب والسجلات نهائياً ولا يمكن التراجع.')) { localStorage.clear(); location.reload(); } }} 
                  className="w-full flex items-center gap-3 p-4 bg-rose-50 text-rose-700 rounded-2xl font-black text-xs active:scale-95 transition-all"
                 >
                   <Trash2 className="w-5 h-5"/> مسح كافة البيانات
                 </button>
               </div>
             </div>

             <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-full mt-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] active:scale-95 transition-all"
             >
                إغلاق الإعدادات
             </button>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
             <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 overflow-hidden p-1">
                <img src="icon.png" alt="App Icon" className="w-full h-full object-cover rounded-[1.25rem]" />
             </div>
             <h3 className="text-lg font-black text-center text-gray-900 mb-2">حول النظام</h3>
             <p className="text-[10px] text-center text-gray-500 font-bold leading-relaxed mb-6 px-2">
                نظام مدرستي هو تطبيق متطور لإدارة شؤون الطلاب، مصمم خصيصاً لتسهيل مهام المعلمين في رصد الحضور والدرجات بطريقة احترافية.
             </p>
             
             <div className="bg-gray-50 p-4 rounded-2xl space-y-3 mb-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-[9px] font-black text-gray-400">تطوير</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-900">
                        <User className="w-3 h-3 text-blue-500" />
                        محمد الزعابي
                    </span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-[9px] font-black text-gray-400">الدعم الفني</span>
                    <a href="tel:98344555" className="flex items-center gap-1.5 text-[10px] font-black text-blue-600">
                        <Phone className="w-3 h-3" />
                        98344555
                    </a>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400">الإصدار</span>
                    <span className="text-[10px] font-black text-gray-900">1.2.0</span>
                </div>
             </div>

             <button 
                onClick={() => setShowInfoModal(false)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-100 active:scale-95 transition-all"
             >
                حسناً، فهمت
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
