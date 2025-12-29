
import React, { useState, useEffect, useRef } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, ThumbsUp, ThumbsDown, FileBarChart, X, UserPlus, Filter, Edit, FileSpreadsheet, GraduationCap, ChevronLeft, Clock, Download, MessageCircle, Smartphone, Loader2, Sparkles, Shuffle, Settings, Trash2, Check, PenSquare, ChevronDown, UserX, MoveRight, LogOut, SlidersHorizontal, MoreHorizontal, Plus, Camera, Image as ImageIcon, CheckCircle2, AlertTriangle, BatteryWarning, Frown, Zap, BookOpen, Clock3, Ban, UserMinus, Utensils, Heart } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';

declare var html2pdf: any;

interface StudentListProps {
  students: Student[];
  classes: string[];
  onAddClass: (name: string) => void;
  onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string) => void;
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
  const [showAddSheet, setShowAddSheet] = useState(false); 
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showClassManager, setShowClassManager] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Random Picker State
  const [isRandomPicking, setIsRandomPicking] = useState(false);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);

  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  // Class Management State
  const [newClassName, setNewClassName] = useState('');
  const [editingClassOldName, setEditingClassOldName] = useState<string | null>(null);
  const [editingClassNewName, setEditingClassNewName] = useState('');

  // Behavior Reasons States
  const [showNegativeReasons, setShowNegativeReasons] = useState<{student: Student} | null>(null);
  const [showPositiveReasons, setShowPositiveReasons] = useState<{student: Student} | null>(null);
  const [customReason, setCustomReason] = useState('');
  
  // Reporting State
  const [notificationTarget, setNotificationTarget] = useState<{student: Student, type: 'truancy'} | null>(null);

  const NEGATIVE_REASONS = [
      { id: 'noise', label: "إزعاج", icon: AlertTriangle, color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
      { id: 'homework', label: "الواجب", icon: BookOpen, color: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
      { id: 'forget', label: "نسيان", icon: Frown, color: 'text-gray-500 dark:text-gray-400 bg-gray-500/10 border-gray-500/20' },
      { id: 'late', label: "تأخير", icon: Clock3, color: 'text-orange-500 dark:text-orange-400 bg-orange-500/10 border-orange-500/20' },
      { id: 'sleep', label: "نوم", icon: BatteryWarning, color: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
      { id: 'fight', label: "مشاجرة", icon: Ban, color: 'text-red-600 dark:text-red-500 bg-red-500/10 border-red-500/20' },
      { id: 'phone', label: "هاتف", icon: Smartphone, color: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' },
      { id: 'eat', label: "أكل", icon: Utensils, color: 'text-green-500 dark:text-green-400 bg-green-500/10 border-green-500/20' },
      { id: 'escape', label: "تسرب", icon: UserMinus, color: 'text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20' }
  ];

  const POSITIVE_REASONS = [
      { id: 'share', label: "مشاركة", icon: Zap, color: 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
      { id: 'answer', label: "إجابة", icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
      { id: 'clean', label: "نظافة", icon: Sparkles, color: 'text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
      { id: 'help', label: "تطوع", icon: ThumbsUp, color: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
      { id: 'homework_done', label: "واجب", icon: BookOpen, color: 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
      { id: 'respect', label: "احترام", icon: Heart, color: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
      { id: 'calm', label: "هدوء", icon: Check, color: 'text-teal-500 dark:text-teal-400 bg-teal-500/10 border-teal-500/20' },
      { id: 'star', label: "تميز", icon: GraduationCap, color: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' }
  ];

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || s.classes?.includes(selectedClass);
    return matchesSearch && matchesClass;
  });

  // Keep logic handlers same as before...
  const handleAddBehavior = (student: Student, type: BehaviorType, description: string, points: number) => {
    const fullDesc = type === 'negative' && description === 'تسرب' ? 'التسرب من الحصة' : description;
    const newBehavior = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type,
      description: fullDesc,
      points,
      semester: currentSemester
    };
    onUpdateStudent({ ...student, behaviors: [newBehavior, ...(student.behaviors || [])] });
    if(showNegativeReasons) setShowNegativeReasons(null);
    if(showPositiveReasons) setShowPositiveReasons(null);
    setCustomReason('');
    if (fullDesc === "التسرب من الحصة") {
        if (student.parentPhone) setNotificationTarget({ student, type: 'truancy' });
        else alert('تم تسجيل السلوك، لكن لا يوجد رقم هاتف للإبلاغ.');
    }
  };

  const performNotification = async (method: 'whatsapp' | 'sms') => {
      // Logic preserved
      if(!notificationTarget || !notificationTarget.student.parentPhone) { alert('لا يوجد رقم هاتف مسجل'); return; }
      const { student } = notificationTarget;
      let cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 5) { alert('رقم الهاتف غير صحيح'); return; }
      if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
      if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
      else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) cleanPhone = '968' + cleanPhone.substring(1);
      const msg = encodeURIComponent(`السلام عليكم، نود إبلاغكم بأن الطالب ${student.name} قد تسرب من الحصة اليوم ${new Date().toLocaleDateString('ar-EG')}.`);
      if (method === 'whatsapp') {
          const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
          try { await Browser.open({ url: url }); } catch (e) { window.open(url, '_blank'); }
      } else { window.location.href = `sms:${cleanPhone}?body=${msg}`; }
      setNotificationTarget(null);
  };

  const pickRandomStudent = () => {
    if (filteredStudents.length === 0) return;
    setIsRandomPicking(true);
    let counter = 0;
    const interval = setInterval(() => {
      setRandomStudent(filteredStudents[Math.floor(Math.random() * filteredStudents.length)]);
      counter++;
      if (counter > 15) { clearInterval(interval); setIsRandomPicking(false); }
    }, 100);
  };

  const handleSaveEdit = () => {
      if (editingStudent && editName) {
          onUpdateStudent({ ...editingStudent, name: editName, parentPhone: editPhone, classes: [editClass], avatar: editAvatar });
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setEditAvatar(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const generateClassReport = async () => {
      // Logic preserved
      if (filteredStudents.length === 0) { alert('لا يوجد طلاب'); return; }
      setIsGeneratingPdf(true);
      const classNameTitle = selectedClass === 'all' ? 'جميع الفصول' : selectedClass;
      const element = document.createElement('div');
      element.setAttribute('dir', 'rtl');
      element.style.fontFamily = 'Tajawal, sans-serif';
      element.style.padding = '20px';
      const rows = filteredStudents.map((s, i) => {
          const positive = (s.behaviors || []).filter(b => b.type === 'positive').length;
          const negative = (s.behaviors || []).filter(b => b.type === 'negative').length;
          return `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px; text-align: center;">${i + 1}</td><td style="padding: 10px; font-weight: bold;">${s.name}</td><td style="padding: 10px; text-align: center;">${s.classes[0]}</td><td style="padding: 10px; text-align: center; color: green;">${positive}</td><td style="padding: 10px; text-align: center; color: red;">${negative}</td></tr>`;
      }).join('');
      element.innerHTML = `<h1 style="text-align: center; margin-bottom: 20px;">قائمة طلاب فصل: ${classNameTitle}</h1><table style="width: 100%; border-collapse: collapse; font-size: 14px;"><thead><tr style="background-color: #f3f4f6; border-bottom: 2px solid #ddd;"><th style="padding: 10px;">#</th><th style="padding: 10px; text-align: right;">الاسم</th><th style="padding: 10px;">الصف</th><th style="padding: 10px;">سلوك إيجابي</th><th style="padding: 10px;">سلوك سلبي</th></tr></thead><tbody>${rows}</tbody></table>`;
      const opt = { margin: 10, filename: `قائمة_${classNameTitle}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      try {
        if (typeof html2pdf !== 'undefined') {
            const worker = html2pdf().set(opt).from(element).toPdf();
            if (Capacitor.isNativePlatform()) {
                 const pdfBase64 = await worker.output('datauristring');
                 const result = await Filesystem.writeFile({ path: opt.filename, data: pdfBase64.split(',')[1], directory: Directory.Cache });
                 await Share.share({ title: 'قائمة الفصل', url: result.uri });
            } else { worker.save(); }
        } else { alert('مكتبة الطباعة غير جاهزة'); }
      } catch (err) { console.error(err); alert('خطأ'); } finally { setIsGeneratingPdf(false); }
  };

  // Animation variants
  const listVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-full pb-24 md:pb-8 text-slate-900 dark:text-white">
      
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-white/5 pt-safe-top transition-all bg-white/60 dark:bg-white/5 backdrop-blur-xl sticky top-0 z-30 shadow-lg">
          <div className="px-4 pb-4">
              <div className="flex justify-between items-end mb-4 pt-4">
                  <div>
                      <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">الطلاب</h1>
                      <p className="text-xs text-slate-500 dark:text-white/50 font-bold mt-0.5">{filteredStudents.length} طالب</p>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={pickRandomStudent} className="w-10 h-10 bg-indigo-50 dark:bg-white/10 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 active:bg-indigo-100 dark:active:bg-white/20 transition-all border border-transparent dark:border-white/10">
                          <Sparkles className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                      <button onClick={generateClassReport} className="w-10 h-10 bg-emerald-50 dark:bg-white/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 active:bg-emerald-100 dark:active:bg-white/20 transition-all border border-transparent dark:border-white/10">
                          {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5" strokeWidth={2.5} />}
                      </button>
                      <button onClick={() => setShowClassManager(true)} className="w-10 h-10 bg-blue-50 dark:bg-white/10 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 active:bg-blue-100 dark:active:bg-white/20 transition-all border border-transparent dark:border-white/10">
                          <SlidersHorizontal className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                      <button onClick={() => setShowAddSheet(true)} className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 dark:shadow-none active:scale-95 transition-transform hover:bg-indigo-500">
                          <Plus className="w-6 h-6" strokeWidth={3} />
                      </button>
                  </div>
              </div>

              {/* iOS Search Bar (Glass) */}
              <div className="relative mb-4">
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 dark:text-white/40" />
                  <input 
                      type="text" 
                      placeholder="بحث عن طالب..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/5 rounded-2xl py-2.5 pr-10 pl-4 text-sm font-medium text-slate-900 dark:text-white text-right outline-none placeholder:text-slate-400 dark:placeholder:text-white/20 border border-transparent dark:border-white/10 focus:bg-white dark:focus:bg-white/10 focus:border-indigo-500 transition-all"
                  />
              </div>

              {/* Class Filters (Pills) */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button 
                      onClick={() => setSelectedClass('all')}
                      className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedClass === 'all' ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-white dark:text-black dark:border-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 border-transparent dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                  >
                      الكل
                  </button>
                  {classes.map(c => (
                      <button 
                          key={c}
                          onClick={() => setSelectedClass(c)}
                          className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedClass === c ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 border-transparent dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                      >
                          {c}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Student List (Floating Glass Cards) */}
      <motion.div 
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="px-4 mt-4 space-y-3"
      >
          <AnimatePresence>
          {filteredStudents.map(student => (
              <motion.div 
                key={student.id} 
                variants={itemVariants}
                className="group bg-white/60 dark:bg-white/5 p-3 rounded-[1.5rem] flex items-center justify-between shadow-sm border border-gray-200 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 relative overflow-hidden"
              >
                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] pointer-events-none" />

                  <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer z-10" onClick={() => onViewReport(student)}>
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-white dark:from-white/10 dark:to-white/5 flex items-center justify-center text-slate-700 dark:text-white/80 font-black text-xl shrink-0 border border-gray-100 dark:border-white/10 overflow-hidden relative shadow-inner">
                          {student.avatar ? (
                              <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                              student.name.charAt(0)
                          )}
                      </div>
                      
                      {/* Info */}
                      <div className="min-w-0">
                          <h3 className="text-sm font-black text-slate-900 dark:text-white truncate mb-1">{student.name}</h3>
                          <p className="text-[10px] text-slate-500 dark:text-white/40 font-bold truncate bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md inline-block">{student.classes[0]}</p>
                      </div>
                  </div>

                  {/* Actions (Buttons) */}
                  <div className="flex items-center gap-2 z-10">
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={() => setShowPositiveReasons({student})}
                        className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 dark:border-emerald-500/30 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 transition-colors"
                      >
                          <ThumbsUp className="w-5 h-5" strokeWidth={2.5} />
                      </motion.button>
                      
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={() => setShowNegativeReasons({student})}
                        className="w-10 h-10 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 dark:border-rose-500/30 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 transition-colors"
                      >
                          <ThumbsDown className="w-5 h-5" strokeWidth={2.5} />
                      </motion.button>

                      <button 
                        onClick={() => {
                            setEditingStudent(student);
                            setEditName(student.name);
                            setEditPhone(student.parentPhone || '');
                            setEditClass(student.classes[0] || '');
                            setEditAvatar(student.avatar || '');
                        }}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-600 dark:hover:text-white transition-colors"
                      >
                          <MoreHorizontal className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                  </div>
              </motion.div>
          ))}
          </AnimatePresence>

          {filteredStudents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-white/10">
                      <Search className="w-10 h-10 text-slate-400 dark:text-white" />
                  </div>
                  <p className="text-sm font-bold text-slate-600 dark:text-white">لا يوجد طلاب</p>
                  <p className="text-xs text-slate-400 dark:text-white/50 mt-1">اضغط + لإضافة طلاب جدد</p>
              </div>
          )}
      </motion.div>

      {/* --- COMPACT MODALS (Glass Style) --- */}

      {/* 1. Add Options Modal */}
      <Modal isOpen={showAddSheet} onClose={() => setShowAddSheet(false)}>
          <div className="text-center shrink-0 mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">إضافة جديدة</h3>
              <p className="text-xs text-slate-500 dark:text-white/50 font-bold">اختر الطريقة المناسبة</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 shrink-0">
              <button onClick={() => setShowManualAddModal(true)} className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 p-4 rounded-2xl flex flex-col items-center gap-3 active:scale-95 transition-transform hover:bg-blue-500/20 dark:hover:bg-blue-500/30">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                      <UserPlus className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-blue-700 dark:text-blue-100">إضافة يدوية</span>
              </button>
              <button onClick={onSwitchToImport} className="bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 p-4 rounded-2xl flex flex-col items-center gap-3 active:scale-95 transition-transform hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                      <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-emerald-700 dark:text-emerald-100">استيراد Excel</span>
              </button>
          </div>
          
          <button onClick={() => setShowAddSheet(false)} className="w-full bg-slate-100 dark:bg-white/10 py-3 rounded-xl text-slate-500 dark:text-white/60 font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/20 shrink-0 mt-4">
              إلغاء
          </button>
      </Modal>

      {/* 2. Negative Reason Modal */}
      <Modal isOpen={!!showNegativeReasons} onClose={() => { setShowNegativeReasons(null); setCustomReason(''); }}>
          <h3 className="text-center font-black text-lg text-rose-500 dark:text-rose-400 flex items-center justify-center gap-2 shrink-0 mb-4 drop-shadow-sm">
              <ThumbsDown className="w-6 h-6" />
              مخالفة سلوكية
          </h3>

          <div className="flex gap-2 shrink-0 mb-3">
              <input 
                  type="text" 
                  value={customReason} 
                  onChange={(e) => setCustomReason(e.target.value)} 
                  placeholder="سبب آخر..." 
                  className="flex-1 bg-slate-100 dark:bg-white/5 p-3 rounded-xl text-xs font-bold border border-transparent dark:border-white/10 outline-none focus:border-rose-500/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20"
              />
              <button 
                  onClick={() => {
                      if(showNegativeReasons && customReason.trim()){
                          handleAddBehavior(showNegativeReasons.student, 'negative', customReason.trim(), -1);
                      }
                  }}
                  className="bg-rose-600 text-white px-4 rounded-xl font-black active:scale-95 shadow-lg shadow-rose-500/30"
              >
                  <Plus className="w-4 h-4" />
              </button>
          </div>
          
          {/* Grid Layout */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-3 gap-2">
                {NEGATIVE_REASONS.map((item) => (
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        key={item.id}
                        onClick={() => showNegativeReasons && handleAddBehavior(showNegativeReasons.student, 'negative', item.label, -1)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border ${item.color} hover:brightness-110 dark:hover:brightness-125 transition-all`}
                    >
                        <item.icon className="w-6 h-6 opacity-90"/>
                        <span className="text-[10px] font-black">{item.label}</span>
                    </motion.button>
                ))}
              </div>
          </div>
      </Modal>

      {/* 2.5 Positive Reason Modal */}
      <Modal isOpen={!!showPositiveReasons} onClose={() => { setShowPositiveReasons(null); setCustomReason(''); }}>
          <h3 className="text-center font-black text-lg text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 shrink-0 mb-4 drop-shadow-sm">
              <ThumbsUp className="w-6 h-6" />
              تعزيز إيجابي
          </h3>

          <div className="flex gap-2 shrink-0 mb-3">
              <input 
                  type="text" 
                  value={customReason} 
                  onChange={(e) => setCustomReason(e.target.value)} 
                  placeholder="سبب آخر..." 
                  className="flex-1 bg-slate-100 dark:bg-white/5 p-3 rounded-xl text-xs font-bold border border-transparent dark:border-white/10 outline-none focus:border-emerald-500/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20"
              />
              <button 
                  onClick={() => {
                      if(showPositiveReasons && customReason.trim()){
                          handleAddBehavior(showPositiveReasons.student, 'positive', customReason.trim(), 1);
                      }
                  }}
                  className="bg-emerald-600 text-white px-4 rounded-xl font-black active:scale-95 shadow-lg shadow-emerald-500/30"
              >
                  <Plus className="w-4 h-4" />
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-3 gap-2">
                {POSITIVE_REASONS.map((item) => (
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        key={item.id}
                        onClick={() => showPositiveReasons && handleAddBehavior(showPositiveReasons.student, 'positive', item.label, 1)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border ${item.color} hover:brightness-110 dark:hover:brightness-125 transition-all`}
                    >
                        <item.icon className="w-6 h-6 opacity-90" />
                        <span className="text-[10px] font-black">{item.label}</span>
                    </motion.button>
                ))}
              </div>
          </div>
      </Modal>

      {/* 3. Random Picker */}
      {isRandomPicking && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/90 dark:bg-black/80 backdrop-blur-xl">
              <div className="text-center animate-pulse">
                  <div className="w-40 h-40 bg-indigo-100 dark:bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl dark:shadow-[0_0_60px_rgba(79,70,229,0.5)] overflow-hidden relative border border-indigo-200 dark:border-indigo-500/30">
                      {randomStudent?.avatar ? (
                          <img src={randomStudent.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                          <span className="text-6xl font-black text-indigo-600 dark:text-indigo-300">{randomStudent?.name.charAt(0)}</span>
                      )}
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 drop-shadow-lg">{randomStudent?.name}</h2>
                  <p className="text-indigo-500 dark:text-indigo-400 font-bold tracking-widest uppercase">جاري الاختيار...</p>
              </div>
          </div>
      )}
      <Modal isOpen={!isRandomPicking && !!randomStudent} onClose={() => setRandomStudent(null)}>
          <Sparkles className="absolute top-0 right-0 w-40 h-40 text-yellow-400 opacity-20 -translate-y-1/2 translate-x-1/2 animate-pulse" />
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl text-white text-3xl font-black overflow-hidden relative border-4 border-white/20">
              {randomStudent?.avatar ? (
                  <img src={randomStudent.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                  randomStudent?.name.charAt(0)
              )}
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">{randomStudent?.name}</h2>
          <p className="text-slate-500 dark:text-white/60 font-bold mb-8 text-center">تم الاختيار عشوائياً للمشاركة</p>
          <button onClick={() => setRandomStudent(null)} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-sm shadow-lg">
              رائع!
          </button>
      </Modal>

      {/* 4. Add Student Modal */}
      <Modal isOpen={showManualAddModal} onClose={() => setShowManualAddModal(false)}>
          <div className="flex justify-between items-center shrink-0 mb-4">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">طالب جديد</h3>
              <button onClick={() => setShowManualAddModal(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20"><X className="w-5 h-5 text-slate-500 dark:text-white/70"/></button>
          </div>
          <form onSubmit={handleManualAddSubmit} className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              <input name="name" type="text" placeholder="اسم الطالب" className="w-full bg-slate-100 dark:bg-white/5 p-4 rounded-xl font-bold text-sm outline-none border border-transparent dark:border-white/10 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30" required autoFocus />
              <input name="phone" type="tel" placeholder="رقم ولي الأمر (اختياري)" className="w-full bg-slate-100 dark:bg-white/5 p-4 rounded-xl font-bold text-sm outline-none border border-transparent dark:border-white/10 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30" />
              
              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 mr-2">الفصل</label>
                  <select name="className" className="w-full bg-slate-100 dark:bg-white/5 p-4 rounded-xl font-bold text-sm outline-none text-slate-900 dark:text-white border border-transparent dark:border-white/10">
                      {classes.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                  </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all mt-4">
                  حفظ الطالب
              </button>
          </form>
      </Modal>

      {/* 5. Edit Student Modal */}
      <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)}>
          <div className="text-center shrink-0">
              <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-2xl font-black text-slate-400 dark:text-white/50 overflow-hidden border-2 border-slate-200 dark:border-white/20 shadow-lg">
                      {editAvatar ? (
                        <img src={editAvatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        editingStudent?.name.charAt(0)
                      )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer shadow-lg active:scale-90 transition-transform">
                      <Camera className="w-3 h-3" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
              </div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white mb-4">تعديل البيانات</h3>
          </div>
          
          <div className="space-y-3">
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/10 p-4 rounded-xl font-bold text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" placeholder="اسم الطالب" />
              <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/10 p-4 rounded-xl font-bold text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" placeholder="رقم الهاتف" />
              <select value={editClass} onChange={e => setEditClass(e.target.value)} className="w-full bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/10 p-4 rounded-xl font-bold text-sm text-slate-900 dark:text-white outline-none">
                  {classes.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
              </select>
          </div>

          <div className="flex gap-2 mt-4 shrink-0">
              <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs shadow-lg">حفظ</button>
              <button onClick={() => { if(editingStudent) { onDeleteStudent(editingStudent.id); setEditingStudent(null); } }} className="px-4 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30 rounded-xl font-bold hover:bg-rose-500/20 dark:hover:bg-rose-500/30"><Trash2 className="w-5 h-5"/></button>
          </div>
      </Modal>

      {/* 6. Class Manager Modal */}
      <Modal isOpen={showClassManager} onClose={() => setShowClassManager(false)}>
          <div className="flex justify-between items-center shrink-0 mb-4">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">إدارة الفصول</h3>
              <button onClick={() => setShowClassManager(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20"><X className="w-5 h-5 text-slate-500 dark:text-white/70"/></button>
          </div>

          <div className="space-y-2 pr-1 overflow-y-auto custom-scrollbar">
              {classes.map(cls => (
                  <div key={cls} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                      {editingClassOldName === cls ? (
                          <div className="flex gap-2 w-full">
                              <input 
                                type="text" 
                                value={editingClassNewName} 
                                onChange={e => setEditingClassNewName(e.target.value)} 
                                className="flex-1 bg-white dark:bg-black/40 border border-blue-500 rounded-lg px-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                autoFocus
                              />
                              <button onClick={() => { onEditClass(cls, editingClassNewName); setEditingClassOldName(null); }} className="p-2 bg-blue-500 text-white rounded-lg"><Check className="w-4 h-4"/></button>
                          </div>
                      ) : (
                          <>
                              <span className="font-bold text-xs text-slate-700 dark:text-white">{cls}</span>
                              <div className="flex gap-2">
                                  <button onClick={() => { setEditingClassOldName(cls); setEditingClassNewName(cls); }} className="p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/10 rounded-lg"><Edit className="w-3.5 h-3.5"/></button>
                                  <button onClick={() => onDeleteClass(cls)} className="p-2 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                              </div>
                          </>
                      )}
                  </div>
              ))}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-white/10 shrink-0 mt-2">
              <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="اسم فصل جديد..." 
                    value={newClassName} 
                    onChange={e => setNewClassName(e.target.value)} 
                    className="flex-1 bg-slate-100 dark:bg-white/5 border border-transparent dark:border-white/20 rounded-xl px-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                  <button onClick={() => { if(newClassName) { onAddClass(newClassName); setNewClassName(''); } }} className="bg-slate-900 dark:bg-white text-white dark:text-black px-4 rounded-xl font-black text-xl hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors">+</button>
              </div>
          </div>
      </Modal>

      {/* 7. Notification Modal */}
      <Modal isOpen={!!notificationTarget} onClose={() => setNotificationTarget(null)}>
          <h3 className="text-center font-black text-slate-900 dark:text-white text-lg mb-2 shrink-0">
              إبلاغ ولي الأمر
          </h3>
          <p className="text-center text-xs font-bold text-rose-500 dark:text-rose-400 mb-6 shrink-0">
              تم رصد تسرب للطالب: {notificationTarget?.student.name}
          </p>
          
          <div className="space-y-3">
              <button onClick={() => performNotification('whatsapp')} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/30 transition-all">
                  <MessageCircle className="w-5 h-5 fill-white" />
                  فتح واتساب مباشرة
              </button>
              <button onClick={() => performNotification('sms')} className="w-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border border-gray-200 dark:border-white/20 hover:bg-slate-200 dark:hover:bg-white/20">
                  <CheckCircle2 className="w-4 h-4" />
                  رسالة نصية SMS
              </button>
          </div>
          
          <button onClick={() => setNotificationTarget(null)} className="w-full mt-2 bg-transparent py-3 rounded-xl text-slate-400 dark:text-white/50 font-bold text-xs shrink-0 hover:text-slate-600 dark:hover:text-white">
              إغلاق
          </button>
      </Modal>

    </div>
  );
};

export default StudentList;
