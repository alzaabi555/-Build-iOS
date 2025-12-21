
import React, { useState, useEffect, useRef } from 'react';
import { Student, AttendanceStatus, BehaviorType } from './types';
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
  School,
  User,
  Database,
  Trash2,
  Download,
  Save
} from 'lucide-react';

const App: React.FC = () => {
  // Persistence: Load initial state from local storage or defaults
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'attendance' | 'import' | 'report'>(() => {
    return (localStorage.getItem('activeTab') as any) || 'dashboard';
  });
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('studentData');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem('selectedStudent');
    return saved ? JSON.parse(saved) : null;
  });

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to save data whenever students change
  useEffect(() => {
    localStorage.setItem('studentData', JSON.stringify(students));
    localStorage.setItem('activeTab', activeTab);
    localStorage.setItem('selectedStudent', JSON.stringify(selectedStudent));
    
    // Visual "Saving" indicator
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 1500);
  }, [students, activeTab, selectedStudent]);

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (selectedStudent?.id === updatedStudent.id) {
      setSelectedStudent(updatedStudent);
    }
  };

  const handleImportStudents = (newStudents: Student[]) => {
    setStudents(prev => [...prev, ...newStudents]);
  };

  const handleClearData = () => {
    if (window.confirm('هل أنت متأكد من مسح كافة البيانات؟ لا يمكن التراجع عن هذه الخطوة.')) {
      setStudents([]);
      setSelectedStudent(null);
      localStorage.clear();
      setShowSettingsModal(false);
    }
  };

  const handleBackupData = () => {
    const dataStr = JSON.stringify(students, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `نسخة_احتياطية_الطلاب_${new Date().toLocaleDateString('ar-EG')}.json`;
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
          onUpdateStudent={handleUpdateStudent} 
          onViewReport={(s) => { setSelectedStudent(s); setActiveTab('report'); }} 
        />;
      case 'attendance':
        return <AttendanceTracker students={students} setStudents={setStudents} />;
      case 'import':
        return <ExcelImport onImport={handleImportStudents} />;
      case 'report':
        return selectedStudent ? (
          <div>
            <button 
              onClick={() => setActiveTab('students')}
              className="flex items-center text-blue-600 mb-4 no-print"
            >
              <ChevronLeft className="w-5 h-5 ml-1" />
              العودة لقائمة الطلاب
            </button>
            <StudentReport student={selectedStudent} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
             <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
             <p>الرجاء اختيار طالب لعرض تقريره</p>
             <button onClick={() => setActiveTab('students')} className="mt-4 text-blue-600 font-medium">الذهاب للقائمة</button>
          </div>
        );
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
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-gray-50 shadow-xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 px-6 py-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowInfoModal(true)}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
            >
                <Info className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">نظام مدرستي</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse">
              <Save className="w-3 h-3" />
              تم الحفظ
            </span>
          )}
          <button onClick={() => setShowSettingsModal(true)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <SettingsIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Settings Modal (Data Management) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 no-print">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  إدارة البيانات
                </h3>
                <button onClick={() => setShowSettingsModal(false)} className="p-1.5 bg-gray-100 rounded-full text-gray-400">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50/50 p-4 rounded-2xl mb-4">
                <p className="text-[10px] text-blue-600 font-bold mb-1">حالة التخزين</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  يتم حفظ جميع التغييرات تلقائياً في متصفحك. يمكنك العودة في أي وقت وستجد بياناتك كما هي.
                </p>
              </div>

              <button 
                onClick={handleBackupData}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">نسخة احتياطية</span>
                </div>
              </button>

              <button 
                onClick={handleClearData}
                className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-red-700">مسح كل البيانات</span>
                </div>
              </button>
            </div>

            <button 
                onClick={() => setShowSettingsModal(false)}
                className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-gray-200 active:scale-95 transition-all"
            >
                تم
            </button>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 no-print">
            <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-end mb-2">
                    <button onClick={() => setShowInfoModal(false)} className="p-1.5 bg-gray-100 rounded-full text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-100">
                        <User className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">محمد درويش الزعابي</h2>
                    <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm font-bold mb-6">
                        <School className="w-4 h-4" />
                        <span>مدرسة الابداع للبنين</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-widest font-bold">
                        تطبيق الإدارة المدرسية المتكامل<br/>
                        نسخة ذكية متطابقة مع iOS
                    </p>
                    <button 
                        onClick={() => setShowInfoModal(false)}
                        className="mt-6 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-gray-200"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 py-6 no-print">
        {renderContent()}
      </main>

      {/* Print View Wrapper */}
      <div className="hidden print:block bg-white min-h-screen p-8">
        {activeTab === 'report' && selectedStudent && <StudentReport student={selectedStudent} />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-lg border-t flex justify-around items-center py-3 px-4 no-print shadow-[0_-5px_20px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1.5 transition-all relative ${
              activeTab === item.id ? 'text-blue-600 scale-110' : 'text-gray-400'
            }`}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] font-bold">{item.label}</span>
            {activeTab === item.id && <div className="absolute -top-3 w-1 h-1 bg-blue-600 rounded-full"></div>}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
