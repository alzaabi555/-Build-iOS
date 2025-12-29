import React, { useState, useEffect, useRef } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, ThumbsUp, ThumbsDown, FileBarChart, X, UserPlus, Filter, Edit, FileSpreadsheet, GraduationCap, ChevronLeft, Clock, Download, MessageCircle, Smartphone, Loader2, Sparkles, Shuffle, Settings, Trash2, Check, PenSquare, ChevronDown, UserX, MoveRight, LogOut, SlidersHorizontal, MoreHorizontal, Plus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

declare var html2pdf: any;

interface StudentListProps {
  students: Student[];
  classes: string[];
  onAddClass: (name: string) => void;
  onAddStudentManually: (name: string, className: string, phone?: string) => void;
  onUpdateStudent: (s: Student) => void;
  onDeleteStudent: (id: string) => void;
  onViewReport: (s: Student) => void;
  onSwitchToImport: () => void;
  currentSemester: '1' | '2';
  onSemesterChange: (sem: '1' | '2') => void;
  onEditClass: (oldName: string, newName: string) => void;
  onDeleteClass: (className: string) => void;
}

const StudentList: React.FC<StudentListProps> = ({ students, classes, onAddClass, onAddStudentManually, onUpdateStudent, onDeleteStudent, onViewReport, onSwitchToImport, currentSemester, onSemesterChange, onEditClass, onDeleteClass }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [showAddSheet, setShowAddSheet] = useState(false); // iOS Action Sheet style
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showClassManager, setShowClassManager] = useState(false);
  
  // Random Picker State
  const [isRandomPicking, setIsRandomPicking] = useState(false);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);

  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClass, setEditClass] = useState('');

  // Class Management State
  const [newClassName, setNewClassName] = useState('');
  const [editingClassOldName, setEditingClassOldName] = useState<string | null>(null);
  const [editingClassNewName, setEditingClassNewName] = useState('');

  // Negative Behavior Reason
  const [showNegativeReasons, setShowNegativeReasons] = useState<{student: Student} | null>(null);

  const NEGATIVE_REASONS = [
      "إزعاج في الحصة", "عدم حل الواجب", "نشيان الكتب/الأدوات", "التأخر عن الحصة", 
      "النوم في الحصة", "مشاجرة مع زميل", "استخدام الهاتف", "أكل/شرب في الحصة"
  ];

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || s.classes?.includes(selectedClass);
    return matchesSearch && matchesClass;
  });

  const handleAddBehavior = (student: Student, type: BehaviorType, description: string = 'سلوك عام', points: number = 1) => {
    const newBehavior = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type,
      description,
      points,
      semester: currentSemester
    };
    onUpdateStudent({ ...student, behaviors: [newBehavior, ...(student.behaviors || [])] });
    if(showNegativeReasons) setShowNegativeReasons(null);
  };

  const pickRandomStudent = () => {
    if (filteredStudents.length === 0) return;
    setIsRandomPicking(true);
    let counter = 0;
    const interval = setInterval(() => {
      setRandomStudent(filteredStudents[Math.floor(Math.random() * filteredStudents.length)]);
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        setIsRandomPicking(false);
      }
    }, 100);
  };

  const handleSaveEdit = () => {
      if (editingStudent && editName) {
          onUpdateStudent({
              ...editingStudent,
              name: editName,
              parentPhone: editPhone,
              classes: [editClass]
          });
          setEditingStudent(null);
      }
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const name = (form.elements.namedItem('name') as HTMLInputElement).value;
      const className = (form.elements.namedItem('className') as HTMLSelectElement).value || (form.elements.namedItem('newClassName') as HTMLInputElement).value;
      const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;

      if (name && className) {
          onAddStudentManually(name, className, phone);
          setShowManualAddModal(false);
          setShowAddSheet(false);
      }
  };

  const generateClassReport = async () => {
      // Logic for generating simple PDF list
      alert('سيتم إضافة ميزة تقرير الفصل قريباً');
  };

  // --- iOS Style Components ---

  const ActionButton = ({ icon: Icon, onClick, className, label }: any) => (
      <button 
        onClick={onClick} 
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-90 transition-transform ${className}`}
      >
          <Icon className="w-6 h-6 mb-1" strokeWidth={2.5} />
          {label && <span className="text-[9px] font-bold">{label}</span>}
      </button>
  );

  return (
    <div className="min-h-full bg-[#f2f2f7] pb-24 md:pb-8">
      
      {/* iOS Navigation Bar */}
      <div className="sticky top-0 z-30 bg-[#f2f2f7]/90 backdrop-blur-xl border-b border-gray-300/50 pt-safe-top transition-all">
          <div className="px-4 pb-2">
              <div className="flex justify-between items-end mb-3 pt-2">
                  <div>
                      <h1 className="text-3xl font-black text-black tracking-tight">الطلاب</h1>
                      <p className="text-xs text-gray-500 font-bold mt-0.5">{filteredStudents.length} طالب</p>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={pickRandomStudent} className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-indigo-600 active:bg-gray-300 transition-colors">
                          <Sparkles className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                      <button onClick={() => setShowClassManager(true)} className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-blue-600 active:bg-gray-300 transition-colors">
                          <SlidersHorizontal className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                      <button onClick={() => setShowAddSheet(true)} className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-transform">
                          <Plus className="w-6 h-6" strokeWidth={3} />
                      </button>
                  </div>
              </div>

              {/* iOS Search Bar */}
              <div className="relative mb-3">
                  <Search className="absolute right-3 top-2 w-4 h-4 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="بحث" 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-[#767680]/12 rounded-xl py-2 pr-9 pl-4 text-sm font-medium text-right outline-none placeholder:text-gray-500 focus:bg-[#767680]/20 transition-colors"
                  />
              </div>

              {/* Class Filters (Pills) */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button 
                      onClick={() => setSelectedClass('all')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedClass === 'all' ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                  >
                      الكل
                  </button>
                  {classes.map(c => (
                      <button 
                          key={c}
                          onClick={() => setSelectedClass(c)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedClass === c ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-white text-gray-600 border border-gray-200'}`}
                      >
                          {c}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Student List (Inset Grouped Style) */}
      <div className="px-4 mt-2 space-y-3">
          {filteredStudents.map(student => (
              <div key={student.id} className="bg-white p-3.5 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100/50 active:scale-[0.99] transition-transform duration-100">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0" onClick={() => onViewReport(student)}>
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-black text-lg shrink-0 border border-gray-200">
                          {student.name.charAt(0)}
                      </div>
                      
                      {/* Info */}
                      <div className="min-w-0">
                          <h3 className="text-sm font-black text-gray-900 truncate mb-0.5">{student.name}</h3>
                          <p className="text-[10px] text-gray-400 font-bold truncate">{student.classes[0]} • {student.grade || 'طالب'}</p>
                      </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1.5 border-r border-gray-100 pr-1.5">
                      <button 
                        onClick={() => handleAddBehavior(student, 'positive', 'سلوك إيجابي', 1)}
                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center active:bg-emerald-600 active:text-white transition-colors"
                      >
                          <ThumbsUp className="w-4 h-4" />
                      </button>
                      
                      <button 
                        onClick={() => setShowNegativeReasons({student})}
                        className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center active:bg-rose-600 active:text-white transition-colors"
                      >
                          <ThumbsDown className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => {
                            setEditingStudent(student);
                            setEditName(student.name);
                            setEditPhone(student.parentPhone || '');
                            setEditClass(student.classes[0] || '');
                        }}
                        className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100"
                      >
                          <MoreHorizontal className="w-5 h-5" />
                      </button>
                  </div>
              </div>
          ))}

          {filteredStudents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-500">لا يوجد طلاب</p>
                  <p className="text-xs text-gray-400 mt-1">اضغط + لإضافة طلاب جدد</p>
              </div>
          )}
      </div>

      {/* --- MODALS & SHEETS --- */}

      {/* 1. Add Options Sheet (Bottom Sheet) */}
      {showAddSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={() => setShowAddSheet(false)}></div>
              <div className="bg-[#f2f2f7] rounded-t-[24px] p-4 w-full max-w-md mx-auto z-10 animate-in slide-in-from-bottom duration-300 pb-safe">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                      <button onClick={() => setShowManualAddModal(true)} className="bg-white p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform shadow-sm">
                          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                              <UserPlus className="w-6 h-6" />
                          </div>
                          <span className="font-bold text-sm text-gray-800">إضافة يدوية</span>
                      </button>
                      <button onClick={onSwitchToImport} className="bg-white p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform shadow-sm">
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                              <FileSpreadsheet className="w-6 h-6" />
                          </div>
                          <span className="font-bold text-sm text-gray-800">استيراد Excel</span>
                      </button>
                  </div>
                  
                  <button onClick={() => setShowAddSheet(false)} className="w-full bg-white py-3.5 rounded-xl text-red-500 font-bold text-sm shadow-sm active:bg-gray-50">
                      إلغاء
                  </button>
              </div>
          </div>
      )}

      {/* 2. Negative Reason Sheet */}
      {showNegativeReasons && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowNegativeReasons(null)}></div>
              <div className="bg-[#f2f2f7] rounded-t-[24px] p-4 w-full max-w-md mx-auto z-10 animate-in slide-in-from-bottom duration-300 pb-safe max-h-[80vh] overflow-y-auto">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
                  <h3 className="text-center font-bold text-gray-900 mb-4">اختر سبب المخالفة</h3>
                  
                  <div className="space-y-2">
                      {NEGATIVE_REASONS.map((reason) => (
                          <button 
                            key={reason}
                            onClick={() => handleAddBehavior(showNegativeReasons.student, 'negative', reason, -1)}
                            className="w-full bg-white p-3.5 rounded-xl text-right font-bold text-sm text-gray-800 active:bg-gray-50 flex justify-between items-center"
                          >
                              {reason}
                              <ChevronLeft className="w-4 h-4 text-gray-300" />
                          </button>
                      ))}
                  </div>
                  
                  <button onClick={() => setShowNegativeReasons(null)} className="w-full mt-4 bg-white py-3.5 rounded-xl text-red-500 font-bold text-sm shadow-sm">
                      إلغاء
                  </button>
              </div>
          </div>
      )}

      {/* 3. Random Picker Overlay */}
      {isRandomPicking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="text-center animate-in zoom-in duration-300">
                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/50">
                      <span className="text-4xl font-black text-indigo-600">{randomStudent?.name.charAt(0)}</span>
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2">{randomStudent?.name}</h2>
                  <p className="text-indigo-300 font-bold">جاري الاختيار...</p>
              </div>
          </div>
      )}
      {!isRandomPicking && randomStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setRandomStudent(null)}>
              <div className="bg-white w-[90%] max-w-sm p-8 rounded-[2.5rem] text-center shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <Sparkles className="absolute top-0 right-0 w-40 h-40 text-yellow-400 opacity-20 -translate-y-1/2 translate-x-1/2" />
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg text-white text-3xl font-black">
                      {randomStudent.name.charAt(0)}
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">{randomStudent.name}</h2>
                  <p className="text-gray-500 font-bold mb-8">تم الاختيار عشوائياً للمشاركة</p>
                  <button onClick={() => setRandomStudent(null)} className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-black text-sm">
                      رائع!
                  </button>
              </div>
          </div>
      )}

      {/* 4. Add Student Modal */}
      {showManualAddModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowManualAddModal(false)}>
              <div className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-lg text-gray-900">طالب جديد</h3>
                      <button onClick={() => setShowManualAddModal(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
                  </div>
                  <form onSubmit={handleManualAddSubmit} className="space-y-4">
                      <input name="name" type="text" placeholder="اسم الطالب" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all" required autoFocus />
                      <input name="phone" type="tel" placeholder="رقم ولي الأمر (اختياري)" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all" />
                      
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 mr-1">الفصل</label>
                          <select name="className" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none">
                              {classes.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>

                      <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all mt-2">
                          حفظ الطالب
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* 5. Edit Student Modal */}
      {editingStudent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditingStudent(null)}>
              <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-black text-gray-400">
                          {editingStudent.name.charAt(0)}
                      </div>
                      <h3 className="font-black text-lg text-gray-900">تعديل البيانات</h3>
                  </div>
                  
                  <div className="space-y-3">
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-blue-500" placeholder="اسم الطالب" />
                      <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-blue-500" placeholder="رقم الهاتف" />
                      <select value={editClass} onChange={e => setEditClass(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-bold text-sm outline-none">
                          {classes.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>

                  <div className="flex gap-2 mt-6">
                      <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-sm">حفظ</button>
                      <button onClick={() => { onDeleteStudent(editingStudent.id); setEditingStudent(null); }} className="px-4 bg-red-50 text-red-600 rounded-xl font-bold"><Trash2 className="w-5 h-5"/></button>
                  </div>
              </div>
          </div>
      )}

      {/* 6. Class Manager Modal */}
      {showClassManager && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowClassManager(false)}>
              <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black text-lg text-gray-900">إدارة الفصول</h3>
                      <button onClick={() => setShowClassManager(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 mb-4">
                      {classes.map(cls => (
                          <div key={cls} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                              {editingClassOldName === cls ? (
                                  <div className="flex gap-2 w-full">
                                      <input 
                                        type="text" 
                                        value={editingClassNewName} 
                                        onChange={e => setEditingClassNewName(e.target.value)} 
                                        className="flex-1 bg-white border border-blue-300 rounded-lg px-2 text-sm font-bold outline-none"
                                        autoFocus
                                      />
                                      <button onClick={() => { onEditClass(cls, editingClassNewName); setEditingClassOldName(null); }} className="p-2 bg-blue-500 text-white rounded-lg"><Check className="w-4 h-4"/></button>
                                  </div>
                              ) : (
                                  <>
                                      <span className="font-bold text-sm text-gray-700">{cls}</span>
                                      <div className="flex gap-1">
                                          <button onClick={() => { setEditingClassOldName(cls); setEditingClassNewName(cls); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4"/></button>
                                          <button onClick={() => onDeleteClass(cls)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                      </div>
                                  </>
                              )}
                          </div>
                      ))}
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="اسم فصل جديد..." 
                            value={newClassName} 
                            onChange={e => setNewClassName(e.target.value)} 
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-blue-500"
                          />
                          <button onClick={() => { if(newClassName) { onAddClass(newClassName); setNewClassName(''); } }} className="bg-black text-white px-4 rounded-xl font-black text-xl">+</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default StudentList;