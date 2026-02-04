
import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, ThumbsUp, ThumbsDown, Edit2, Trash2, LayoutGrid, UserPlus, FileSpreadsheet, MoreVertical, Settings, Users, AlertCircle, X } from 'lucide-react';
import Modal from './Modal';
import ExcelImport from './ExcelImport';
import { useApp } from '../context/AppContext';

interface StudentListProps {
    students: Student[];
    classes: string[];
    onAddClass: (name: string) => void;
    onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string, gender?: 'male'|'female') => void;
    onBatchAddStudents: (students: Student[]) => void;
    onUpdateStudent: (student: Student) => void;
    onDeleteStudent: (id: string) => void;
    onViewReport: (student: Student) => void;
    currentSemester: '1' | '2';
    onDeleteClass?: (className: string) => void; 
    onSemesterChange?: (sem: '1' | '2') => void;
    onEditClass?: (oldName: string, newName: string) => void;
}

const SOUNDS = {
    positive: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    negative: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3'
};

const NEGATIVE_BEHAVIORS = [
    { id: '1', title: 'إزعاج في الحصة', points: -1 },
    { id: '2', title: 'عدم حل الواجب', points: -2 },
    { id: '3', title: 'نسيان الكتاب', points: -1 },
    { id: '4', title: 'تأخر عن الحصة', points: -1 },
    { id: '5', title: 'سلوك غير لائق', points: -3 },
    { id: '6', title: 'النوم في الفصل', points: -1 },
];

const StudentList: React.FC<StudentListProps> = ({ 
    students = [], 
    classes = [], 
    onAddClass, 
    onAddStudentManually, 
    onBatchAddStudents, 
    onUpdateStudent, 
    onDeleteStudent, 
    currentSemester, 
    onDeleteClass 
}) => {
  const { defaultStudentGender } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showManageClasses, setShowManageClasses] = useState(false); 
  const [showMenu, setShowMenu] = useState(false);

  const [newClassInput, setNewClassInput] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>(defaultStudentGender);
  const [newStudentClass, setNewStudentClass] = useState('');

  // Negative Behavior Logic
  const [showNegativeModal, setShowNegativeModal] = useState(false);
  const [selectedStudentForBehavior, setSelectedStudentForBehavior] = useState<Student | null>(null);

  const safeClasses = useMemo(() => Array.isArray(classes) ? classes : [], [classes]);
  const safeStudents = useMemo(() => Array.isArray(students) ? students : [], [students]);

  useEffect(() => {
      if (safeClasses.length > 0 && !newStudentClass) {
          setNewStudentClass(safeClasses[0]);
      }
  }, [safeClasses]);

  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      if (safeStudents.length > 0) {
          safeStudents.forEach(s => {
              if (!s) return;
              if (s.grade) {
                  grades.add(s.grade);
              } else if (s.classes && s.classes[0]) {
                  const match = s.classes[0].match(/^(\d+)/);
                  if (match) grades.add(match[1]);
              }
          });
      }
      return Array.from(grades).sort();
  }, [safeStudents]);

  const filteredStudents = useMemo(() => {
      if (safeStudents.length === 0) return [];
      
      return safeStudents.filter(student => {
          if (!student) return false;
          const nameMatch = (student.name || '').toLowerCase().includes(searchTerm.toLowerCase());
          const studentClasses = student.classes || [];
          const matchesClass = selectedClass === 'all' || studentClasses.includes(selectedClass);
          
          let matchesGrade = true;
          if (selectedGrade !== 'all') {
             const firstClass = studentClasses[0] || '';
             matchesGrade = student.grade === selectedGrade || firstClass.startsWith(selectedGrade);
          }
          return nameMatch && matchesClass && matchesGrade;
      });
  }, [safeStudents, searchTerm, selectedClass, selectedGrade]);

  const playSound = (type: 'positive' | 'negative') => {
      const audio = new Audio(SOUNDS[type]);
      audio.volume = 0.5;
      audio.play().catch(e => console.error(e));
  };

  const handleBehavior = (student: Student, type: BehaviorType) => {
      if (type === 'positive') {
          // إضافة فورية للنقاط الإيجابية
          playSound('positive');
          const newBehavior = {
              id: Math.random().toString(36).substr(2, 9),
              date: new Date().toISOString(),
              type: 'positive' as const,
              description: 'سلوك إيجابي (تعزيز سريع)',
              points: 1,
              semester: currentSemester
          };
          onUpdateStudent({ ...student, behaviors: [newBehavior, ...(student.behaviors || [])] });
      } else {
          // فتح نافذة للاختيار للسلوك السلبي
          setSelectedStudentForBehavior(student);
          setShowNegativeModal(true);
      }
  };

  const confirmNegativeBehavior = (title: string, points: number) => {
      if (!selectedStudentForBehavior) return;
      playSound('negative');
      const newBehavior = {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          type: 'negative' as const,
          description: title,
          points: points,
          semester: currentSemester
      };
      onUpdateStudent({ 
          ...selectedStudentForBehavior, 
          behaviors: [newBehavior, ...(selectedStudentForBehavior.behaviors || [])] 
      });
      setShowNegativeModal(false);
      setSelectedStudentForBehavior(null);
  };

  const handleManualAddSubmit = () => {
      if (newStudentName && newStudentClass) {
          onAddStudentManually(newStudentName, newStudentClass, newStudentPhone, undefined, newStudentGender);
          setNewStudentName('');
          setNewStudentPhone('');
          setShowManualAddModal(false);
      }
  };

  const handleAddClassSubmit = () => {
      if (newClassInput.trim()) {
          onAddClass(newClassInput.trim());
          setNewClassInput('');
          setShowAddClassModal(false);
      }
  };
  
  const handleEditStudentSave = () => {
      if (editingStudent) {
          onUpdateStudent(editingStudent);
          setEditingStudent(null);
      }
  };

  // دالة تحديد مسار الصورة الصحيح بناءً على الجنس
  const getStudentDisplayImage = (avatar: string | undefined, gender: string | undefined) => {
      if (avatar && (avatar.startsWith('data:image') || avatar.length > 50)) {
          return avatar; 
      }
      return gender === 'female' ? './student_girl.png' : './student_boy.png';
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-24 md:pb-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <header className="bg-[#1e3a8a] text-white pt-8 pb-10 px-6 rounded-b-[2.5rem] shadow-lg relative z-10 -mx-4 -mt-4">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-wide">الطلاب</h1>
                        <p className="text-[10px] text-blue-200 font-bold opacity-80">{safeStudents.length} طالب مسجل</p>
                    </div>
                </div>

                <div className="relative">
                     <button onClick={() => setShowMenu(!showMenu)} className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 active:scale-95 transition-all">
                        <MoreVertical className="w-5 h-5 text-white" />
                     </button>
                     {showMenu && (
                        <>
                         <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                         <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in zoom-in-95 origin-top-left">
                             <div className="p-1">
                                 <button onClick={() => { setShowManualAddModal(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right text-xs font-bold text-slate-700">
                                     <UserPlus className="w-4 h-4 text-indigo-600" /> إضافة طالب يدوياً
                                 </button>
                                 <button onClick={() => { setShowImportModal(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right text-xs font-bold text-slate-700">
                                     <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> استيراد من Excel
                                 </button>
                                 <div className="my-1 border-t border-slate-100"></div>
                                 <button onClick={() => { setShowAddClassModal(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right text-xs font-bold text-slate-700">
                                     <LayoutGrid className="w-4 h-4 text-amber-600" /> إضافة فصل جديد
                                 </button>
                                 <button onClick={() => { setShowManageClasses(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right text-xs font-bold text-slate-700">
                                     <Settings className="w-4 h-4 text-slate-500" /> إدارة الفصول
                                 </button>
                             </div>
                         </div>
                        </>
                     )}
                </div>
            </div>

            {/* Search & Filters */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute right-4 top-3.5 w-5 h-5 text-blue-200" />
                    <input 
                        type="text" 
                        placeholder="بحث عن طالب..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 pr-12 pl-4 text-sm font-bold text-white placeholder:text-blue-200/50 outline-none focus:bg-white/20 transition-all"
                    />
                </div>
                
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedGrade === 'all' && selectedClass === 'all' ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>الكل</button>
                    {availableGrades.map(g => (
                         <button key={g} onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedGrade === g ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>صف {g}</button>
                    ))}
                    {safeClasses.filter(c => selectedGrade === 'all' || c.startsWith(selectedGrade)).map(c => (
                        <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedClass === c ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>{c}</button>
                    ))}
                </div>
            </div>
        </header>

        {/* Student List - New Vertical Card Design */}
        <div className="px-4 grid grid-cols-2 lg:grid-cols-3 gap-3 pb-20">
            {filteredStudents.length > 0 ? filteredStudents.map(student => (
                <div key={student.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col items-center overflow-hidden hover:shadow-md transition-all">
                     
                     {/* Upper Part: Image & Info */}
                     <div className="p-4 flex flex-col items-center w-full relative">
                         <div className="w-16 h-16 rounded-full bg-slate-50 border-4 border-white shadow-sm mb-3 overflow-hidden relative group">
                             {/* Fallback Layer */}
                             <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-0">
                                 <span className="text-3xl filter grayscale opacity-50">
                                    {student.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}
                                 </span>
                             </div>
                             
                             {/* Image Layer */}
                             <img 
                                src={getStudentDisplayImage(student.avatar, student.gender)} 
                                className="w-full h-full object-cover relative z-10 transition-opacity duration-300" 
                                alt={student.name}
                                onError={(e) => {
                                    e.currentTarget.style.opacity = '0';
                                }}
                             />
                         </div>
                         <h3 className="font-black text-slate-800 text-sm text-center line-clamp-1 w-full">{student.name}</h3>
                         <div className="flex gap-1 mt-1">
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-bold">{student.classes && student.classes.length > 0 ? student.classes[0] : 'غير محدد'}</span>
                         </div>
                     </div>

                     {/* Divider */}
                     <div className="w-full h-px bg-slate-100"></div>

                     {/* Actions Row */}
                     <div className="flex w-full divide-x divide-x-reverse divide-slate-100">
                        <button onClick={() => handleBehavior(student, 'positive')} className="flex-1 py-3 flex flex-col items-center justify-center hover:bg-emerald-50 active:bg-emerald-100 transition-colors group">
                             <ThumbsUp className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                        </button>
                        
                        <button onClick={() => handleBehavior(student, 'negative')} className="flex-1 py-3 flex flex-col items-center justify-center hover:bg-rose-50 active:bg-rose-100 transition-colors group">
                             <ThumbsDown className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                        </button>
                        
                        <button onClick={() => setEditingStudent(student)} className="flex-1 py-3 flex flex-col items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors group">
                             <Edit2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        </button>
                     </div>
                </div>
            )) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50 col-span-full text-center">
                    <UserPlus className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-sm font-bold text-gray-400">لا يوجد طلاب مطابقين للبحث</p>
                    {safeClasses.length === 0 && <p className="text-xs text-indigo-400 mt-2 font-bold cursor-pointer" onClick={() => setShowAddClassModal(true)}>ابدأ بإضافة فصل جديد</p>}
                </div>
            )}
        </div>

        {/* Modals (No changes to logic, just structure) */}
        <Modal isOpen={showManualAddModal} onClose={() => setShowManualAddModal(false)} className="max-w-md rounded-[2rem]">
             <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
                    <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="font-black text-xl mb-6 text-slate-800">إضافة طالب جديد</h3>
                <div className="space-y-3">
                    <input type="text" placeholder="اسم الطالب" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800" />
                    <select value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800">
                        <option value="" disabled>اختر الفصل</option>
                        {safeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="tel" placeholder="رقم ولي الأمر (اختياري)" value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800" />
                     <div className="flex gap-2">
                        <button onClick={() => setNewStudentGender('male')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${newStudentGender === 'male' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>طالب 👨‍🎓</button>
                        <button onClick={() => setNewStudentGender('female')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${newStudentGender === 'female' ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>طالبة 👩‍🎓</button>
                    </div>
                    <button onClick={handleManualAddSubmit} disabled={!newStudentName || !newStudentClass} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 mt-2">حفظ الطالب</button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} className="max-w-lg rounded-[2rem]">
            <ExcelImport existingClasses={safeClasses} onImport={(data) => { onBatchAddStudents(data); setShowImportModal(false); }} onAddClass={onAddClass} />
        </Modal>

        <Modal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} className="max-w-sm rounded-[2rem]">
             <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-slate-800">إضافة فصل جديد</h3>
                <input autoFocus type="text" placeholder="اسم الفصل (مثال: 5/1)" value={newClassInput} onChange={(e) => setNewClassInput(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800 mb-4" />
                <button onClick={handleAddClassSubmit} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg">إضافة</button>
             </div>
        </Modal>

        <Modal isOpen={showManageClasses} onClose={() => setShowManageClasses(false)} className="max-w-sm rounded-[2rem]">
            <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-slate-800">إدارة الفصول</h3>
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-2">
                    {safeClasses.map(cls => (
                        <div key={cls} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="font-bold text-sm text-slate-800">{cls}</span>
                            <div className="flex gap-2">
                                <button onClick={() => { if(onDeleteClass && confirm('هل أنت متأكد من حذف هذا الفصل؟ سيتم إخفاء الطلاب المرتبطين به.')) onDeleteClass(cls); }} className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                    {safeClasses.length === 0 && <p className="text-xs text-gray-400">لا توجد فصول مضافة</p>}
                </div>
            </div>
        </Modal>
        
        {/* Negative Behavior Modal */}
        <Modal isOpen={showNegativeModal} onClose={() => { setShowNegativeModal(false); setSelectedStudentForBehavior(null); }} className="max-w-sm rounded-[2rem]">
            <div className="text-center">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                        تنبيه سلوكي
                    </h3>
                    <button onClick={() => setShowNegativeModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500"><X className="w-4 h-4"/></button>
                </div>
                
                <p className="text-xs font-bold text-gray-500 mb-4">اختر نوع الملاحظة للطالب <span className="text-indigo-600">{selectedStudentForBehavior?.name}</span></p>
                
                <div className="grid grid-cols-2 gap-2">
                    {NEGATIVE_BEHAVIORS.map(b => (
                        <button 
                            key={b.id}
                            onClick={() => confirmNegativeBehavior(b.title, b.points)}
                            className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all flex flex-col items-center gap-1"
                        >
                            <span>{b.title}</span>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full shadow-sm">{b.points}</span>
                        </button>
                    ))}
                </div>
            </div>
        </Modal>

        {/* Edit Student Modal */}
        <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} className="max-w-md rounded-[2rem]">
            {editingStudent && (
                 <div className="text-center">
                    <h3 className="font-black text-xl mb-6 text-slate-800">تعديل بيانات الطالب</h3>
                    <div className="space-y-3">
                        <input type="text" value={editingStudent.name} onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800" placeholder="الاسم" />
                        <select value={editingStudent.classes && editingStudent.classes.length > 0 ? editingStudent.classes[0] : ''} onChange={(e) => setEditingStudent({...editingStudent, classes: [e.target.value]})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800">
                            {safeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="tel" value={editingStudent.parentPhone || ''} onChange={(e) => setEditingStudent({...editingStudent, parentPhone: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-800" placeholder="رقم الهاتف" />
                        <div className="flex gap-2">
                            <button onClick={() => setEditingStudent({...editingStudent, gender: 'male'})} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${editingStudent.gender === 'male' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>طالب 👨‍🎓</button>
                            <button onClick={() => setEditingStudent({...editingStudent, gender: 'female'})} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all border ${editingStudent.gender === 'female' ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>طالبة 👩‍🎓</button>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={handleEditStudentSave} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg">حفظ التعديلات</button>
                            <button onClick={() => { if(confirm('هل أنت متأكد من حذف الطالب؟')) { onDeleteStudent(editingStudent.id); setEditingStudent(null); }}} className="px-4 py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-black text-sm"><Trash2 className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>

    </div>
  );
};

export default StudentList;
