import React, { useState, useEffect, useRef } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, ThumbsUp, ThumbsDown, FileBarChart, X, UserPlus, Filter, Edit, FileSpreadsheet, GraduationCap, ChevronRight, Clock, Download, MessageCircle, Smartphone, Loader2, Sparkles, Shuffle, Settings, Trash2, Check, PenSquare, ChevronDown, UserX, MoveRight, LogOut, SlidersHorizontal } from 'lucide-react';
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
  const [selectedClass, setSelectedClass] = useState('all');
  const [showLogModal, setShowLogModal] = useState<{ student: Student; type: BehaviorType } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1'); 
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showContactChoice, setShowContactChoice] = useState<{student: Student, message: string} | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [showRandomPicker, setShowRandomPicker] = useState(false);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showClassManager, setShowClassManager] = useState(false);
  const [editingClassName, setEditingClassName] = useState<string | null>(null);
  const [newClassNameInput, setNewClassNameInput] = useState('');
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentClassInput, setStudentClassInput] = useState('');
  const [studentPhoneInput, setStudentPhoneInput] = useState('');
  const [logDesc, setLogDesc] = useState('');

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || (s.classes && s.classes.includes(selectedClass));
    return matchesSearch && matchesClass;
  });

  const getStudentGradeStats = (student: Student) => {
      const grades = (student.grades || []).filter(g => !g.semester || g.semester === currentSemester);
      const earned = grades.reduce((a, b) => a + (Number(b.score) || 0), 0);
      const total = grades.reduce((a, b) => a + (Number(b.maxScore) || 0), 0);
      return { earned, total };
  };

  // --- Handlers (Keep existing logic) ---
  const openCreateModal = () => { setModalMode('create'); setStudentNameInput(''); setStudentClassInput(''); setStudentPhoneInput(''); setEditingStudentId(null); setShowStudentModal(true); };
  const openEditModal = (student: Student) => { setModalMode('edit'); setStudentNameInput(student.name); setStudentClassInput(student.classes[0] || ''); setStudentPhoneInput(student.parentPhone || ''); setEditingStudentId(student.id); setShowStudentModal(true); };
  const handleRandomPick = () => { if (filteredStudents.length === 0) return; setIsShuffling(true); setShowRandomPicker(true); setRandomStudent(null); let counter = 0; const interval = setInterval(() => { const randomIndex = Math.floor(Math.random() * filteredStudents.length); setRandomStudent(filteredStudents[randomIndex]); counter++; if (counter >= 20) { clearInterval(interval); setIsShuffling(false); } }, 100); };
  const handleSaveStudent = () => { if (studentNameInput.trim() && studentClassInput.trim()) { if (modalMode === 'create') { onAddStudentManually(studentNameInput.trim(), studentClassInput.trim(), studentPhoneInput.trim()); } else if (modalMode === 'edit' && editingStudentId) { const studentToUpdate = students.find(s => s.id === editingStudentId); if (studentToUpdate) { onUpdateStudent({ ...studentToUpdate, name: studentNameInput.trim(), classes: [studentClassInput.trim()], parentPhone: studentPhoneInput.trim() }); } } setShowStudentModal(false); } else { alert('يرجى إكمال البيانات'); } };
  const handleDeleteStudentBtn = () => { if (editingStudentId && confirm('حذف الطالب؟')) { onDeleteStudent(editingStudentId); setShowStudentModal(false); } };
  const handleAddBehavior = (desc?: string) => { if (!showLogModal) return; const finalDesc = desc || logDesc; if (!finalDesc.trim()) return; let behaviorText = finalDesc; if (finalDesc === 'التسرب من الحصص') { behaviorText = `${finalDesc} (الحصة ${selectedPeriod})`; } const newBehavior = { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), type: showLogModal.type, description: behaviorText, points: showLogModal.type === 'positive' ? 1 : -1, semester: currentSemester }; onUpdateStudent({ ...showLogModal.student, behaviors: [newBehavior, ...(showLogModal.student.behaviors || [])] }); if (finalDesc === 'التسرب من الحصص' && showLogModal.student.parentPhone) { const msg = `السلام عليكم، الطالب ${showLogModal.student.name} تسرب من الحصة (${selectedPeriod}).`; setShowContactChoice({ student: showLogModal.student, message: msg }); } setShowLogModal(null); setLogDesc(''); setSelectedPeriod('1'); };
  const handleSendNotification = (method: 'whatsapp' | 'sms') => { if (!showContactChoice) return; const { student, message } = showContactChoice; let cleanPhone = student.parentPhone!.replace(/[^0-9]/g, ''); if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2); if (cleanPhone.length === 8) { cleanPhone = '968' + cleanPhone; } else if (cleanPhone.startsWith('0')) { cleanPhone = '968' + cleanPhone.substring(1); } const encodedMsg = encodeURIComponent(message); if (method === 'whatsapp') { const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`; if (Capacitor.isNativePlatform()) window.open(url, '_system'); else window.open(url, '_blank'); } else { if (Capacitor.isNativePlatform()) window.open(`sms:${cleanPhone}?&body=${encodedMsg}`, '_system'); else window.open(`sms:${cleanPhone}?&body=${encodedMsg}`, '_self'); } setShowContactChoice(null); };
  const handleSaveClassReport = async () => { if (filteredStudents.length === 0) { alert('لا يوجد طلاب'); return; } setIsGeneratingPdf(true); setTimeout(() => setIsGeneratingPdf(false), 2000); };
  const startEditingClass = (className: string) => { setEditingClassName(className); setNewClassNameInput(className); };
  const saveClassEdit = (oldName: string) => { if (newClassNameInput.trim() && newClassNameInput !== oldName) { onEditClass(oldName, newClassNameInput.trim()); } setEditingClassName(null); };
  const confirmDeleteClass = (className: string) => { if (confirm(`حذف الفصل "${className}"؟`)) { onDeleteClass(className); if (selectedClass === className) setSelectedClass('all'); } };
  const toggleClassExpand = (className: string) => { setExpandedClass(expandedClass === className ? null : className); };
  const handleMoveStudentFromManager = (student: Student, newClass: string) => { if(confirm(`نقل الطالب ${student.name} إلى ${newClass}؟`)) { onUpdateStudent({ ...student, classes: [newClass] }); } };
  const handleDeleteStudentFromManager = (studentId: string) => { if(confirm('حذف الطالب؟')) { onDeleteStudent(studentId); } };

  return (
    <div className="space-y-6 pb-28 md:pb-8">
      
      {/* 1. Glassy Header Area */}
      <div className="flex flex-col gap-4 sticky top-0 bg-white/80 backdrop-blur-2xl z-20 py-4 px-2 -mx-2 rounded-b-[2.5rem] shadow-sm border-b border-white/50">
        
        {/* Semester Switcher */}
        <div className="bg-slate-100/50 p-1.5 rounded-[1.2rem] flex relative overflow-hidden border border-white/50 shadow-inner">
             <div className={`absolute top-1.5 bottom-1.5 w-1/2 bg-white rounded-xl shadow-md transition-all duration-300 ${currentSemester === '1' ? 'right-1.5' : 'right-1/2 translate-x-1.5'}`}></div>
             <button onClick={() => onSemesterChange('1')} className={`relative z-10 flex-1 py-3 rounded-xl text-xs font-black transition-all ${currentSemester === '1' ? 'text-indigo-600' : 'text-slate-400'}`}>الفصل الأول</button>
             <button onClick={() => onSemesterChange('2')} className={`relative z-10 flex-1 py-3 rounded-xl text-xs font-black transition-all ${currentSemester === '2' ? 'text-indigo-600' : 'text-slate-400'}`}>الفصل الثاني</button>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input 
                type="text" 
                placeholder="ابحث عن طالب..." 
                className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-xs font-bold text-slate-800 placeholder:text-slate-400 shadow-sm" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <button onClick={handleRandomPick} className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-100 text-amber-600 rounded-2xl shadow-sm active:scale-95 flex items-center justify-center transition-all border border-amber-200 hover:shadow-md group" title="القرعة العشوائية">
              <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={openCreateModal} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center transition-all hover:bg-indigo-700 hover:scale-105">
              <UserPlus className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Pills (Glassy) */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 px-1">
          <button onClick={() => setShowClassManager(true)} className="w-10 h-10 rounded-full bg-white text-slate-600 flex items-center justify-center shrink-0 border border-slate-200 hover:shadow-md transition-all active:scale-95">
              <SlidersHorizontal className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          
          <button 
            onClick={() => setSelectedClass('all')} 
            className={`px-5 py-2.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all border ${selectedClass === 'all' ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-[1.02]' : 'bg-white/80 backdrop-blur-sm text-slate-500 border-slate-200 hover:bg-white'}`}
          >
              الكل
          </button>
          
          {classes.map(cls => (
            <button 
                key={cls} 
                onClick={() => setSelectedClass(cls)} 
                className={`px-5 py-2.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all border ${selectedClass === cls ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30 scale-[1.02]' : 'bg-white/80 backdrop-blur-sm text-slate-500 border-slate-200 hover:bg-white'}`}
            >
                {cls}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Premium Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
        {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
          const stats = getStudentGradeStats(student);
          const gradient = idx % 4 === 0 ? 'from-blue-400 to-indigo-500' : 
                           idx % 4 === 1 ? 'from-emerald-400 to-teal-500' : 
                           idx % 4 === 2 ? 'from-orange-400 to-rose-500' : 
                           'from-violet-400 to-purple-500';
          
          return (
            <div key={student.id} className="group relative bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-5 shadow-sm border border-white hover:shadow-xl hover:shadow-indigo-900/5 hover:-translate-y-1 transition-all duration-300">
              
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-[1.2rem] bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/20 shrink-0 relative overflow-hidden`}>
                      <span className="relative z-10">{student.name.charAt(0)}</span>
                      <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-full blur-md -mt-2 -mr-2"></div>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm leading-tight mb-1.5 truncate max-w-[140px]" title={student.name}>{student.name}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{student.classes[0]}</span>
                        {stats.total > 0 && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                                {stats.earned}/{stats.total}
                            </span>
                        )}
                    </div>
                  </div>
                </div>
                <button onClick={() => openEditModal(student)} className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                    <Edit className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowLogModal({ student, type: 'positive' })} className="flex-1 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-emerald-100/50 group/btn">
                    <ThumbsUp className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> إيجابي
                </button>
                <button onClick={() => setShowLogModal({ student, type: 'negative' })} className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-rose-100/50 group/btn">
                    <ThumbsDown className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> سلبي
                </button>
                <button onClick={() => onViewReport(student)} className="w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all border border-slate-100 shadow-sm">
                    <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          );
        }) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-300">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Search className="w-10 h-10 opacity-40" />
                </div>
                <p className="text-base font-bold text-slate-400">لا يوجد طلاب مطابقين</p>
                <div className="mt-8 flex gap-4">
                   <button onClick={onSwitchToImport} className="text-xs text-emerald-700 font-bold bg-emerald-50 px-6 py-3 rounded-2xl hover:bg-emerald-100 transition-colors shadow-sm">استيراد ملف Excel</button>
                   <button onClick={openCreateModal} className="text-xs text-indigo-700 font-bold bg-indigo-50 px-6 py-3 rounded-2xl hover:bg-indigo-100 transition-colors shadow-sm">إضافة طالب يدوياً</button>
                </div>
            </div>
        )}
      </div>

      {/* Modals - Updated Styles */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200" onClick={() => setShowLogModal(null)}>
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 border border-white/50" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 sm:hidden" />
            
            <div className="flex justify-between items-center mb-8">
              <div>
                  <h3 className="font-black text-xl text-slate-800 mb-1">رصد سلوك</h3>
                  <p className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-lg inline-block mt-1">{showLogModal.student.name}</p>
              </div>
              <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center shadow-lg transform rotate-3 ${showLogModal.type === 'positive' ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-emerald-500/30' : 'bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-rose-500/30'}`}>
                  {showLogModal.type === 'positive' ? <ThumbsUp className="w-8 h-8" strokeWidth={3} /> : <ThumbsDown className="w-8 h-8" strokeWidth={3} />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {(showLogModal.type === 'positive' ? ['مشاركة متميزة', 'إنجاز الواجب', 'مساعدة زميل', 'نظافة وترتيب'] : ['تأخر عن الحصة', 'إزعاج مستمر', 'التسرب من الحصص', 'عدم حل الواجب']).map(d => (
                <button key={d} onClick={() => d === 'التسرب من الحصص' ? setLogDesc(d) : handleAddBehavior(d)} className={`text-right p-4 rounded-2xl text-[11px] font-black transition-all active:scale-95 border shadow-sm ${showLogModal.type === 'positive' ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100' : (logDesc === d ? 'bg-rose-600 text-white border-rose-600 shadow-rose-200' : 'bg-rose-50 text-rose-800 border-rose-100 hover:bg-rose-100')}`}>{d}</button>
              ))}
            </div>

            {logDesc === 'التسرب من الحصص' && showLogModal.type === 'negative' && (
                <div className="mb-4 bg-rose-50 p-4 rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-rose-800 mb-3 block flex items-center gap-1"><Clock className="w-3 h-3"/> اختر الحصة التي تسرب منها:</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {[1,2,3,4,5,6,7,8].map(p => (
                            <button key={p} onClick={() => setSelectedPeriod(p.toString())} className={`w-10 h-10 rounded-xl text-xs font-black shrink-0 transition-all ${selectedPeriod === p.toString() ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-white text-slate-500 border border-rose-200'}`}>{p}</button>
                        ))}
                    </div>
                </div>
            )}
            
            <textarea className="w-full p-4 bg-slate-50 rounded-2xl h-28 text-sm font-medium outline-none border-none focus:ring-2 focus:ring-indigo-500/20 resize-none mb-4" placeholder="أو اكتب ملاحظة خاصة..." value={logDesc} onChange={e => setLogDesc(e.target.value)} />
            
            <button onClick={() => handleAddBehavior()} className={`w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-95 shadow-xl ${showLogModal.type === 'positive' ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700' : 'bg-rose-600 shadow-rose-200 hover:bg-rose-700'}`}>تأكيد الرصد</button>
          </div>
        </div>
      )}

      {/* Class Manager Modal (Improved) */}
      {showClassManager && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowClassManager(false)}>
              <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative flex flex-col max-h-[85vh] border border-white/50" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                      <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-600"/> إدارة الفصول والطلاب</h3>
                      <button onClick={() => setShowClassManager(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5 text-slate-500"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                      {classes.length > 0 ? classes.map(cls => {
                          const studentsInClass = students.filter(s => s.classes.includes(cls));
                          return (
                            <div key={cls} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <div className="flex items-center justify-between p-4 group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleClassExpand(cls)}>
                                    {editingClassName === cls ? (
                                        <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                                            <input type="text" value={newClassNameInput} onChange={e => setNewClassNameInput(e.target.value)} className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-indigo-700" autoFocus />
                                            <button onClick={() => saveClassEdit(cls)} className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><Check className="w-3.5 h-3.5"/></button>
                                            <button onClick={() => setEditingClassName(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl"><X className="w-3.5 h-3.5"/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expandedClass === cls ? 'rotate-180' : ''}`} />
                                                <span className="text-sm font-black text-slate-700">{cls}</span>
                                                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 font-bold">{studentsInClass.length}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => startEditingClass(cls)} className="p-2 bg-white text-blue-500 rounded-lg border border-slate-100 hover:bg-blue-50 shadow-sm"><PenSquare className="w-3.5 h-3.5"/></button>
                                                <button onClick={() => confirmDeleteClass(cls)} className="p-2 bg-white text-rose-500 rounded-lg border border-slate-100 hover:bg-rose-50 shadow-sm"><Trash2 className="w-3.5 h-3.5"/></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {expandedClass === cls && (
                                    <div className="border-t border-slate-50 bg-slate-50/50 p-2 space-y-1">
                                        {studentsInClass.length > 0 ? studentsInClass.map(s => (
                                            <div key={s.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
                                                <span className="font-bold text-slate-600 text-xs">{s.name}</span>
                                                <div className="flex gap-2">
                                                    <div className="relative group/move">
                                                        <button className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"><MoveRight className="w-3.5 h-3.5"/></button>
                                                        <div className="hidden group-hover/move:flex flex-col absolute left-0 top-8 bg-white shadow-xl border border-slate-100 rounded-xl z-50 w-32 max-h-32 overflow-y-auto p-1">
                                                            {classes.filter(c => c !== cls).map(target => (
                                                                <button key={target} onClick={() => handleMoveStudentFromManager(s, target)} className="text-right px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 font-bold text-[10px]">{target}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleDeleteStudentFromManager(s.id)} className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"><UserX className="w-3.5 h-3.5"/></button>
                                                </div>
                                            </div>
                                        )) : <p className="text-[10px] text-slate-400 text-center py-4">فارغ</p>}
                                    </div>
                                )}
                            </div>
                          );
                      }) : (
                          <div className="text-center py-10">
                              <p className="text-xs font-bold text-slate-400">لا توجد فصول</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Student Create/Edit Modal (Premium) */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center sm:p-6 animate-in fade-in duration-200" onClick={() => setShowStudentModal(false)}>
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-sm rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-safe border border-white/50" onClick={e => e.stopPropagation()}>
             <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 sm:hidden" />
             <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                     {modalMode === 'create' ? <UserPlus className="w-8 h-8" /> : <Edit className="w-8 h-8" />}
                 </div>
                 <h3 className="text-xl font-black text-slate-900">{modalMode === 'create' ? 'إضافة طالب جديد' : 'تعديل بيانات الطالب'}</h3>
             </div>
             
             <div className="space-y-5 mb-8">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 mr-2">الاسم الكامل</label>
                   <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800" value={studentNameInput} onChange={e => setStudentNameInput(e.target.value)} placeholder="اسم الطالب" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 mr-2">الفصل الدراسي</label>
                   <div className="relative">
                       <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 appearance-none" value={studentClassInput} onChange={e => setStudentClassInput(e.target.value)}>
                          <option value="">اختر الفصل...</option>
                          {classes.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                       <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 mr-2">رقم ولي الأمر</label>
                   <input type="tel" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 text-left dir-ltr" placeholder="968..." value={studentPhoneInput} onChange={e => setStudentPhoneInput(e.target.value)} />
                </div>
             </div>
             
             <div className="flex gap-3">
                <button onClick={() => setShowStudentModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-200 transition-colors">إلغاء</button>
                <button onClick={handleSaveStudent} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">حفظ البيانات</button>
             </div>

             {modalMode === 'edit' && (
                 <button 
                    type="button"
                    onClick={handleDeleteStudentBtn} 
                    className="w-full mt-4 py-3 text-rose-500 text-[10px] font-bold hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                 >
                     <Trash2 className="w-3.5 h-3.5"/> حذف الطالب نهائياً
                 </button>
             )}
          </div>
        </div>
      )}

      {/* Random Picker Modal (Luxurious) */}
      {showRandomPicker && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowRandomPicker(false)}>
              <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden border border-white/20" onClick={e => e.stopPropagation()}>
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 to-transparent pointer-events-none"></div>
                  <Sparkles className="absolute top-8 right-8 w-6 h-6 text-amber-400 animate-pulse" />
                  <Sparkles className="absolute bottom-8 left-8 w-4 h-4 text-amber-400 animate-pulse delay-75" />
                  
                  <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-lg shadow-amber-100 relative z-10">
                      <Shuffle className={`w-10 h-10 text-amber-600 ${isShuffling ? 'animate-spin' : ''}`} />
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-2 relative z-10">القرعة العشوائية</h3>
                  <p className="text-xs font-bold text-slate-400 mb-8 relative z-10">نختار لك بطلاً للمشاركة</p>
                  
                  <div className="w-full bg-slate-50/80 backdrop-blur rounded-[2rem] p-8 min-h-[140px] flex items-center justify-center border border-slate-100 mb-8 relative z-10 shadow-inner">
                      {randomStudent ? (
                          <div className="animate-in zoom-in duration-500 flex flex-col items-center">
                              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-black mb-3 shadow-lg shadow-indigo-200">
                                  {randomStudent.name.charAt(0)}
                              </div>
                              <h2 className="text-2xl font-black text-slate-800 leading-tight">{randomStudent.name}</h2>
                              <span className="text-xs font-bold text-indigo-500 mt-1 bg-indigo-50 px-3 py-1 rounded-full">{randomStudent.classes[0]}</span>
                          </div>
                      ) : (
                          <p className="text-slate-300 text-sm font-bold animate-pulse">اضغط ابدأ...</p>
                      )}
                  </div>
                  
                  <button onClick={handleRandomPick} disabled={isShuffling} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-200 active:scale-95 transition-all relative z-10 disabled:opacity-80">
                     {isShuffling ? 'جاري الاختيار...' : 'ابدأ القرعة'}
                  </button>
                  <button onClick={() => setShowRandomPicker(false)} className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors relative z-10">إغلاق</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentList;