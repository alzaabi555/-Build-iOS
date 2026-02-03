import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, ThumbsUp, ThumbsDown, Edit2, Sparkles, Trash2, Plus, LayoutGrid, UserPlus, Upload, Settings, Trophy, Frown, MoreVertical, FileSpreadsheet, Dices, PlusCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const StudentList: React.FC<StudentListProps> = ({ students, classes, onAddClass, onAddStudentManually, onBatchAddStudents, onUpdateStudent, onDeleteStudent, onViewReport, currentSemester, onDeleteClass }) => {
  const { teacherInfo, defaultStudentGender, setDefaultStudentGender } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showManageClasses, setShowManageClasses] = useState(false); 
  
  // Dropdown Menu State
  const [showMenu, setShowMenu] = useState(false);

  const [newClassInput, setNewClassInput] = useState('');
  
  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // New Student State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>(defaultStudentGender);
  const [newStudentClass, setNewStudentClass] = useState('');

  useEffect(() => {
      if (classes.length > 0 && !newStudentClass) {
          setNewStudentClass(classes[0]);
      }
  }, [classes]);

  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      students.forEach(s => {
          if (s.grade) grades.add(s.grade);
          else if (s.classes[0]) {
              const match = s.classes[0].match(/^(\d+)/);
              if (match) grades.add(match[1]);
          }
      });
      return Array.from(grades).sort();
  }, [students, classes]);

  const filteredStudents = useMemo(() => {
      return students.filter(student => {
          const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesClass = selectedClass === 'all' || student.classes.includes(selectedClass);
          let matchesGrade = true;
          if (selectedGrade !== 'all') {
             matchesGrade = student.grade === selectedGrade || (student.classes[0] && student.classes[0].startsWith(selectedGrade));
          }
          return matchesSearch && matchesClass && matchesGrade;
      });
  }, [students, searchTerm, selectedClass, selectedGrade]);

  const playSound = (type: 'positive' | 'negative') => {
      const audio = new Audio(SOUNDS[type]);
      audio.volume = 0.5;
      audio.play().catch(e => console.error(e));
  };

  const handleBehavior = (student: Student, type: BehaviorType) => {
      playSound(type === 'positive' ? 'positive' : 'negative');
      const newBehavior = {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          type,
          description: type === 'positive' ? 'سلوك إيجابي سريع' : 'سلوك بحاجة لتحسين',
          points: type === 'positive' ? 1 : -1,
          semester: currentSemester
      };
      onUpdateStudent({ ...student, behaviors: [newBehavior, ...(student.behaviors || [])] });
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
                        <p className="text-[10px] text-blue-200 font-bold opacity-80">{students.length} طالب مسجل</p>
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
                    {classes.filter(c => selectedGrade === 'all' || c.startsWith(selectedGrade)).map(c => (
                        <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedClass === c ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>{c}</button>
                    ))}
                </div>
            </div>
        </header>

        {/* Student List */}
        <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-20">
            {filteredStudents.length > 0 ? filteredStudents.map(student => (
                <div key={student.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden group">
                     {/* Random Avatar/Icon */}
                     <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl shadow-sm shrink-0 overflow-hidden">
                         <img 
                            src={student.avatar || (student.gender === 'female' ? './assets/student_girl.png' : './assets/student_boy.png')} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerText = student.gender === 'female' ? '👩‍🎓' : '👨‍🎓';
                            }}
                         />
                     </div>
                     
                     <div className="flex-1 min-w-0">
                         <h3 className="font-bold text-slate-800 text-sm truncate">{student.name}</h3>
                         <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-bold">{student.classes[0]}</span>
                             {student.parentPhone && <span className="text-[10px] text-slate-400 font-mono">{student.parentPhone}</span>}
                         </div>
                     </div>

                     <div className="flex gap-2">
                        <button onClick={() => handleBehavior(student, 'positive')} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 active:scale-90 transition-all border border-emerald-100">
                             <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleBehavior(student, 'negative')} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 active:scale-90 transition-all border border-rose-100">
                             <ThumbsDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingStudent(student)} className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all border border-slate-100">
                             <Edit2 className="w-4 h-4" />
                        </button>
                     </div>
                </div>
            )) : (
                <div className="col-span-full flex flex-col items-center justify-center py-10 opacity-50">
                    <UserPlus className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="font-bold text-slate-400">لا يوجد طلاب مطابقين</p>
                </div>
            )}
        </div>

        {/* Modals */}
        {/* Manual Add Student Modal */}
        <Modal isOpen={showManualAddModal} onClose={() => setShowManualAddModal(false)} className="max-w-sm rounded-[2rem]">
            <div className="text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                    <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-slate-800 mb-6">إضافة طالب جديد</h3>
                <div className="space-y-3">
                    <input type="text" placeholder="اسم الطالب" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500" />
                    <select value={newStudentClass} onChange={e => setNewStudentClass(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500">
                        <option value="" disabled>اختر الفصل</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="tel" placeholder="رقم ولي الأمر (اختياري)" value={newStudentPhone} onChange={e => setNewStudentPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500" />
                    <div className="flex gap-2">
                        <button onClick={() => setNewStudentGender('male')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${newStudentGender === 'male' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-400'}`}>طالب 👨‍🎓</button>
                        <button onClick={() => setNewStudentGender('female')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${newStudentGender === 'female' ? 'bg-pink-50 border-pink-200 text-pink-600' : 'border-slate-200 text-slate-400'}`}>طالبة 👩‍🎓</button>
                    </div>
                    <button onClick={handleManualAddSubmit} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-indigo-700 mt-2">إضافة</button>
                </div>
            </div>
        </Modal>

        {/* Add Class Modal */}
        <Modal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} className="max-w-sm rounded-[2rem]">
            <div className="text-center">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
                    <LayoutGrid className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-slate-800 mb-6">إضافة فصل جديد</h3>
                <div className="space-y-3">
                    <input type="text" placeholder="اسم الفصل (مثال: 5/1)" value={newClassInput} onChange={e => setNewClassInput(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-amber-500" />
                    <button onClick={handleAddClassSubmit} className="w-full py-3 bg-amber-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-amber-700 mt-2">إضافة الفصل</button>
                </div>
            </div>
        </Modal>

        {/* Import Modal */}
        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} className="max-w-lg rounded-[2rem]">
            <div className="text-center mb-4">
                <h3 className="font-black text-lg text-slate-800">استيراد من Excel</h3>
                <p className="text-xs text-slate-400 font-bold">يمكنك إضافة فصل كامل دفعة واحدة</p>
            </div>
            <ExcelImport 
                existingClasses={classes} 
                onImport={(students) => { onBatchAddStudents(students); setShowImportModal(false); }} 
                onAddClass={onAddClass}
            />
        </Modal>

        {/* Manage Classes Modal */}
        <Modal isOpen={showManageClasses} onClose={() => setShowManageClasses(false)} className="max-w-sm rounded-[2rem]">
            <div className="text-center mb-4">
                <h3 className="font-black text-lg text-slate-800">إدارة الفصول</h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                {classes.map(c => (
                    <div key={c} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="font-bold text-sm text-slate-700">{c}</span>
                        <button 
                            onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف الفصل ${c}؟ سيتم حذف جميع الطلاب المرتبطين به.`)) {
                                    if (onDeleteClass) onDeleteClass(c);
                                }
                            }}
                            className="p-2 bg-white text-rose-500 rounded-lg shadow-sm border border-rose-100 hover:bg-rose-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {classes.length === 0 && <p className="text-center text-xs text-slate-400">لا توجد فصول</p>}
            </div>
        </Modal>

        {/* Edit Student Modal */}
        <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} className="max-w-sm rounded-[2rem]">
            {editingStudent && (
                <div className="text-center">
                    <h3 className="font-black text-lg text-slate-800 mb-6">تعديل بيانات الطالب</h3>
                    <div className="space-y-3">
                        <input type="text" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500" placeholder="اسم الطالب" />
                        <select value={editingStudent.classes[0] || ''} onChange={e => setEditingStudent({...editingStudent, classes: [e.target.value]})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500">
                             {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="tel" value={editingStudent.parentPhone || ''} onChange={e => setEditingStudent({...editingStudent, parentPhone: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500" placeholder="رقم ولي الأمر" />
                        
                        <div className="flex gap-2">
                            <button onClick={() => setEditingStudent({...editingStudent, gender: 'male'})} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${editingStudent.gender === 'male' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-400'}`}>طالب 👨‍🎓</button>
                            <button onClick={() => setEditingStudent({...editingStudent, gender: 'female'})} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${editingStudent.gender === 'female' ? 'bg-pink-50 border-pink-200 text-pink-600' : 'border-slate-200 text-slate-400'}`}>طالبة 👩‍🎓</button>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button onClick={() => { if(confirm('هل أنت متأكد من حذف الطالب؟')) { onDeleteStudent(editingStudent.id); setEditingStudent(null); }}} className="flex-1 py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-black text-sm hover:bg-rose-100">حذف</button>
                            <button onClick={handleEditStudentSave} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-indigo-700">حفظ التعديلات</button>
                        </div>
                        <button onClick={() => onViewReport(editingStudent)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-sm shadow-lg hover:bg-slate-700 mt-2">عرض تقرير الطالب</button>
                    </div>
                </div>
            )}
        </Modal>

    </div>
  );
};

export default StudentList;