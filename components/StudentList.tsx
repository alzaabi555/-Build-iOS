import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorType } from '../types';
import { 
  Search, Edit2, Sparkles, Trash2, Plus, 
  UserPlus, Settings, Trophy, Frown, CloudRain, PartyPopper, 
  Menu, FileSpreadsheet, Smile, AlertCircle, User, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import ExcelImport from './ExcelImport';
import { useApp } from '../context/AppContext';

interface StudentListProps {
  students: Student[];
  classes: string[];
  onAddClass: (name: string) => void;
  onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string) => void;
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

const StudentItem = React.memo(({ student, onAction, currentSemester }: { 
  student: Student, onAction: (s: Student, type: 'positive' | 'negative' | 'edit' | 'delete') => void, currentSemester: '1' | '2'
}) => {
  const behaviors = (student.behaviors || []).filter(b => !b.semester || b.semester === currentSemester);
  const positivePoints = behaviors.filter(b => b.type === 'positive').reduce((acc, b) => acc + b.points, 0);
  const negativePoints = behaviors.filter(b => b.type === 'negative').reduce((acc, b) => acc + Math.abs(b.points), 0);
  const netScore = positivePoints - negativePoints;

  let cardStyle = "bg-white border-slate-100";
  if (netScore > 0) cardStyle = "bg-emerald-50/60 border-emerald-200 ring-1 ring-emerald-100";
  if (netScore < 0) cardStyle = "bg-rose-50/60 border-rose-200 ring-1 ring-rose-100";

  return (
      <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          className={`group flex flex-col p-5 mb-3 rounded-[1.8rem] border transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden ${cardStyle}`}
      >
          <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold overflow-hidden shrink-0 shadow-sm border border-black/5 ${netScore > 0 ? 'bg-emerald-100 text-emerald-600' : netScore < 0 ? 'bg-rose-100 text-rose-600' : 'bg-white text-slate-400'}`}>
                      {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" /> : student.name.charAt(0)}
                  </div>
                  <div>
                      <h3 className="font-black text-slate-900 text-base leading-tight mb-1">{student.name}</h3>
                      <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-white/60 text-slate-600 px-2 py-0.5 rounded-lg font-bold border border-black/5">{student.classes[0]}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${netScore > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : netScore < 0 ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {netScore > 0 ? `+${netScore}` : netScore} نقطة
                          </span>
                      </div>
                  </div>
              </div>

              <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); onAction(student, 'edit'); }} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors">
                      <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onAction(student, 'delete'); }} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-white transition-colors">
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
          </div>

          <div className="flex gap-3 mt-2">
              <button 
                  onClick={(e) => { e.stopPropagation(); onAction(student, 'positive'); }} 
                  className="flex-1 bg-white border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                  <Smile className="w-5 h-5" strokeWidth={2.5} />
                  سلوك إيجابي
              </button>
              
              <button 
                  onClick={(e) => { e.stopPropagation(); onAction(student, 'negative'); }} 
                  className="flex-1 bg-white border-2 border-rose-100 hover:border-rose-500 hover:bg-rose-50 text-rose-600 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                  <AlertCircle className="w-5 h-5" strokeWidth={2.5} />
                  سلوك سلبي
              </button>
          </div>

      </motion.div>
  );
}, (prev, next) => prev.student === next.student && prev.currentSemester === next.currentSemester);

const StudentList: React.FC<StudentListProps> = ({ students, classes, onAddClass, onAddStudentManually, onBatchAddStudents, onUpdateStudent, onDeleteStudent, currentSemester, onDeleteClass }) => {
  const { teacherInfo, periodTimes } = useApp(); // ✅ استدعاء إعدادات الحصص
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showManageClasses, setShowManageClasses] = useState(false); 
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  const [newClassInput, setNewClassInput] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const [showNegativeReasons, setShowNegativeReasons] = useState<{student: Student} | null>(null);
  const [showPositiveReasons, setShowPositiveReasons] = useState<{student: Student} | null>(null);
  const [customBehaviorReason, setCustomBehaviorReason] = useState('');
  const [customBehaviorPoints, setCustomBehaviorPoints] = useState<string>('1');
  
  // ✅ الحالة التي ستحمل رقم الحصة الحالية تلقائياً
  const [currentAutoPeriod, setCurrentAutoPeriod] = useState<string | null>(null);

  const [feedbackAnimation, setFeedbackAnimation] = useState<{ type: BehaviorType, text: string } | null>(null);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
  const [isRandomPicking, setIsRandomPicking] = useState(false);

  // ✅ دالة ذكية لحساب الحصة الحالية بناءً على الوقت
  useEffect(() => {
      const calculatePeriod = () => {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          
          const activePeriod = periodTimes.find(pt => {
              const [sh, sm] = pt.startTime.split(':').map(Number);
              const [eh, em] = pt.endTime.split(':').map(Number);
              const start = sh * 60 + sm;
              const end = eh * 60 + em;
              return currentMinutes >= start && currentMinutes <= end;
          });

          if (activePeriod) {
              setCurrentAutoPeriod(activePeriod.periodNumber.toString());
          } else {
              setCurrentAutoPeriod(null); // خارج وقت الحصص
          }
      };

      calculatePeriod(); // حساب فوري
      const timer = setInterval(calculatePeriod, 60000); // تحديث كل دقيقة
      return () => clearInterval(timer);
  }, [periodTimes]);

  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      students.forEach(s => {
          if (s.grade) grades.add(s.grade);
          else if (s.classes[0]) { const match = s.classes[0].match(/^(\d+)/); if (match) grades.add(match[1]); }
      });
      return Array.from(grades).sort();
  }, [students, classes]);

  const visibleClasses = useMemo(() => {
      if (selectedGrade === 'all') return classes;
      return classes.filter(c => c.startsWith(selectedGrade));
  }, [classes, selectedGrade]);

  const filteredStudents = useMemo(() => students.filter(s => {
      const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = selectedClass === 'all' || s.classes?.includes(selectedClass);
      let matchGrade = true;
      if (selectedGrade !== 'all') { matchGrade = s.grade === selectedGrade || (s.classes[0] && s.classes[0].startsWith(selectedGrade)); }
      return matchName && matchClass && matchGrade;
  }), [students, searchTerm, selectedClass, selectedGrade]);

  useEffect(() => { if (feedbackAnimation) { const timer = setTimeout(() => setFeedbackAnimation(null), 1800); return () => clearTimeout(timer); } }, [feedbackAnimation]);

  const playBehaviorSound = (type: BehaviorType) => { try { const audio = new Audio(type === 'positive' ? SOUNDS.positive : SOUNDS.negative); audio.volume = 0.6; audio.play().catch(e => console.warn('Audio play blocked', e)); } catch (e) { console.error('Failed to play sound', e); } };

  const handleAction = (student: Student, type: 'positive' | 'negative' | 'edit' | 'delete') => {
      if (type === 'positive') setShowPositiveReasons({ student });
      else if (type === 'negative') setShowNegativeReasons({ student });
      else if (type === 'edit') {
          setEditingStudent(student); setEditName(student.name); setEditClass(student.classes[0]); setEditPhone(student.parentPhone || ''); setEditAvatar(student.avatar || ''); setShowManualAddModal(true);
      }
      else if (type === 'delete') {
          if(confirm(`حذف الطالب ${student.name}؟`)) onDeleteStudent(student.id);
      }
  };

  const handleSaveStudent = () => {
      if (editName.trim() && editClass.trim()) {
          const inferredGrade = editClass.trim().match(/^(\d+)/)?.[1] || '';
          if (editingStudent) {
              onUpdateStudent({ ...editingStudent, name: editName, classes: [editClass], parentPhone: editPhone, avatar: editAvatar, grade: inferredGrade });
          } else {
              onAddStudentManually(editName, editClass, editPhone, editAvatar);
          }
          setShowManualAddModal(false); setEditingStudent(null); setEditName(''); setEditPhone(''); setEditClass(''); setEditAvatar('');
      }
  };

  const pickRandomStudent = () => {
      if (filteredStudents.length === 0) return;
      setIsRandomPicking(true);
      let count = 0;
      const interval = setInterval(() => {
          const random = filteredStudents[Math.floor(Math.random() * filteredStudents.length)];
          setRandomStudent(random);
          count++;
          if (count > 10) { clearInterval(interval); setIsRandomPicking(false); }
      }, 100);
  };

  const handleAddBehavior = (student: Student, type: BehaviorType, reason: string, points: number) => {
      playBehaviorSound(type);
      setFeedbackAnimation({ type, text: type === 'positive' ? 'أحسنت!' : 'انتبه!' });
      
      const newBehavior = { 
          id: Math.random().toString(36).substr(2, 9), 
          date: new Date().toISOString(), 
          type, 
          description: reason, 
          points: Math.abs(points), 
          semester: currentSemester,
          // ✅ يتم حفظ الحصة تلقائياً هنا
          period: currentAutoPeriod || undefined 
      };
      
      const updatedStudent = { ...student, behaviors: [newBehavior, ...(student.behaviors || [])] };
      onUpdateStudent(updatedStudent);
      setShowPositiveReasons(null); 
      setShowNegativeReasons(null);
  };

  const handleManualBehaviorSubmit = (type: BehaviorType, student: Student) => {
      if (customBehaviorReason.trim()) { handleAddBehavior(student, type, customBehaviorReason, parseInt(customBehaviorPoints) || 1); setCustomBehaviorReason(''); }
  };

  const executeDeleteClass = (className: string) => {
      if (!onDeleteClass) return;
      if (confirm(`هل أنت متأكد من حذف الفصل "${className}"؟\nسيتم حذفه من سجلات جميع الطلاب.`)) { onDeleteClass(className); if (selectedClass === className) setSelectedClass('all'); }
  };

  const executeDeleteGrade = (grade: string) => {
      if (!onDeleteClass) return;
      const relatedClasses = classes.filter(c => c.startsWith(grade));
      if (confirm(`هل أنت متأكد من حذف الصف "${grade}" بالكامل؟\nسيتم حذف الفصول التالية: ${relatedClasses.join(', ')}`)) { relatedClasses.forEach(c => onDeleteClass(c)); if (selectedGrade === grade) { setSelectedGrade('all'); setSelectedClass('all'); } }
  };

  // ✅ مكون عرض الحصة الحالية (للمعلومات فقط)
  const CurrentPeriodInfo = () => (
      <div className={`mb-4 p-2 rounded-xl text-center text-xs font-bold border ${currentAutoPeriod ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
          {currentAutoPeriod ? (
              <span className="flex items-center justify-center gap-2">
                  <Clock size={14} className="animate-pulse"/>
                  يتم التسجيل في الحصة: {currentAutoPeriod}
              </span>
          ) : (
              <span>خارج أوقات الحصص (لن يتم تحديد حصة)</span>
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full text-slate-800 relative bg-[#f8fafc] animate-in fade-in duration-500">
        
        {/* Feedback Animation Overlay */}
        <AnimatePresence>
            {feedbackAnimation && (
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', damping: 15 }} className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
                    <div className={`p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 border-4 backdrop-blur-xl ${feedbackAnimation.type === 'positive' ? 'bg-emerald-500/90 border-emerald-600 text-white shadow-emerald-500/50' : 'bg-rose-500/90 border-rose-600 text-white shadow-rose-500/50'}`}>
                        <div className="bg-white/20 p-6 rounded-full shadow-inner">
                            {feedbackAnimation.type === 'positive' ? (<div className="relative"><Trophy className="w-20 h-20 text-yellow-300 drop-shadow-md" /><PartyPopper className="w-12 h-12 text-white absolute -top-4 -right-4 animate-bounce" /></div>) : (<div className="relative"><Frown className="w-20 h-20 text-white drop-shadow-md" /><CloudRain className="w-12 h-12 text-slate-200 absolute -top-4 -right-4 animate-pulse" /></div>)}
                        </div>
                        <h2 className="text-4xl font-black tracking-tight drop-shadow-sm">{feedbackAnimation.text}</h2>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Header (Blue & Curved) */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300">
            <div className="flex justify-between items-center mb-6 mt-2">
                <h1 className="text-2xl font-black tracking-tight">قائمة الطلاب</h1>
                {/* Menu Dropdown */}
                <div className="relative">
                    <button onClick={() => setShowMenuDropdown(!showMenuDropdown)} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all shadow-sm border border-white/10"><Menu className="w-6 h-6" /></button>
                    {showMenuDropdown && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenuDropdown(false)}></div>
                            <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden origin-top-left z-50 animate-in zoom-in-95 duration-200">
                                <div className="flex flex-col py-1">
                                    <button onClick={() => { setShowManualAddModal(true); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-right w-full group text-slate-800"><UserPlus className="w-4 h-4 text-[#1e3a8a]" /><span className="text-xs font-bold">إضافة طالب</span></button>
                                    <button onClick={() => { setShowImportModal(true); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 text-right w-full group text-slate-800"><FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" /><span className="text-xs font-bold">استيراد من Excel</span></button>
                                    <button onClick={() => { pickRandomStudent(); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 text-right w-full group text-slate-800"><Sparkles className="w-4 h-4 text-[#1e3a8a]" /><span className="text-xs font-bold">القرعة العشوائية</span></button>
                                    <button onClick={() => { setShowManageClasses(true); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 text-right w-full group text-slate-800"><Settings className="w-4 h-4 text-[#1e3a8a]" /><span className="text-xs font-bold">إعدادات الفصول</span></button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute right-3 top-3.5 w-4 h-4 text-blue-200" />
                <input type="text" placeholder="بحث عن طالب..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/10 backdrop-blur-md rounded-xl py-3 pr-10 pl-3 text-xs font-bold text-white placeholder-blue-200/70 outline-none border border-white/10 focus:bg-white/20 transition-all" />
            </div>

            {/* Hierarchy Filters */}
            <div className="space-y-2">
                {availableGrades.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-full transition-all border ${selectedGrade === 'all' ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30 hover:bg-white/10'}`}>كل المراحل</button>
                        {availableGrades.map(g => (
                            <button key={g} onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-full transition-all border ${selectedGrade === g ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30 hover:bg-white/10'}`}>صف {g}</button>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-1">
                        {visibleClasses.map(c => (
                            <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-xl transition-all ${selectedClass === c ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>{c}</button>
                        ))}
                        <button onClick={() => setShowAddClassModal(true)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all"><Plus className="w-4 h-4"/></button>
                    </div>
                </div>
            </div>
        </div>

        {/* ================= List Content ================= */}
        <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="w-full h-[280px] shrink-0"></div>
            <div className="px-4 pb-24 pt-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a]"></span>الطلاب ({filteredStudents.length})</h3>
                </div>
                {filteredStudents.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {filteredStudents.map(student => (
                            <StudentItem key={student.id} student={student} onAction={handleAction} currentSemester={currentSemester} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50"><User className="w-16 h-16 text-gray-400 mb-4" /><p className="text-sm font-bold text-gray-500">لا يوجد طلاب مطابقين</p></div>
                )}
            </div>
        </div>

        {/* ===================================== */}
        {/* ============ MODALS ================= */}
        {/* ===================================== */}

        {/* 1. قائمة السلوك الإيجابي (Expanded & Clear) */}
        <Modal isOpen={!!showPositiveReasons} onClose={() => setShowPositiveReasons(null)} className="max-w-xs rounded-[2rem] z-[50]">
            <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-emerald-600 flex items-center justify-center gap-2">
                    <Smile className="w-6 h-6" /> سلوك إيجابي
                </h3>
                
                {/* ✅ عرض معلومات الحصة الحالية */}
                <CurrentPeriodInfo />

                <div className="grid grid-cols-2 gap-2 mb-4">
                    {['مشاركة مميزة', 'واجب منزلي', 'نظافة', 'تعاون', 'إجابة نموذجية', 'هدوء'].map(r => (
                        <button 
                            key={r} 
                            onClick={() => { if(showPositiveReasons) handleAddBehavior(showPositiveReasons.student, 'positive', r, 1); }} 
                            className="p-3 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors rounded-xl border border-emerald-100 active:scale-95"
                        >
                            {r}
                        </button>
                    ))}
                </div>
                {/* Custom Input */}
                <div className="flex gap-2 bg-emerald-50/50 p-1.5 rounded-xl border border-emerald-100">
                    <input 
                        placeholder="سبب آخر..." 
                        value={customBehaviorReason} 
                        onChange={e => setCustomBehaviorReason(e.target.value)} 
                        className="flex-1 p-2 bg-white rounded-lg text-xs font-bold border border-emerald-100 focus:border-emerald-500 outline-none text-slate-800" 
                    />
                    <button 
                        onClick={() => { if(showPositiveReasons) handleManualBehaviorSubmit('positive', showPositiveReasons.student); }} 
                        className="p-2 bg-emerald-600 text-white rounded-lg active:scale-95 transition-transform shadow-lg shadow-emerald-200"
                    >
                        <Plus className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </Modal>

        {/* 2. قائمة السلوك السلبي (Expanded & Clear) */}
        <Modal isOpen={!!showNegativeReasons} onClose={() => setShowNegativeReasons(null)} className="max-w-xs rounded-[2rem] z-[50]">
            <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-rose-600 flex items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6" /> سلوك سلبي
                </h3>

                {/* ✅ عرض معلومات الحصة الحالية */}
                <CurrentPeriodInfo />

                <div className="grid grid-cols-2 gap-2 mb-4">
                    {['إزعاج', 'نسيان كتاب', 'نوم', 'تأخر', 'ألفاظ', 'شجار'].map(r => (
                        <button 
                            key={r} 
                            onClick={() => { if(showNegativeReasons) handleAddBehavior(showNegativeReasons.student, 'negative', r, -1); }} 
                            className="p-3 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors rounded-xl border border-rose-100 active:scale-95"
                        >
                            {r}
                        </button>
                    ))}
                </div>
                {/* Custom Input */}
                <div className="flex gap-2 bg-rose-50/50 p-1.5 rounded-xl border border-rose-100">
                    <input 
                        placeholder="سبب آخر..." 
                        value={customBehaviorReason} 
                        onChange={e => setCustomBehaviorReason(e.target.value)} 
                        className="flex-1 p-2 bg-white rounded-lg text-xs font-bold border border-rose-100 focus:border-rose-500 outline-none text-slate-800" 
                    />
                    <button 
                        onClick={() => { if(showNegativeReasons) handleManualBehaviorSubmit('negative', showNegativeReasons.student); }} 
                        className="p-2 bg-rose-600 text-white rounded-lg active:scale-95 transition-transform shadow-lg shadow-rose-200"
                    >
                        <Plus className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </Modal>

        {/* ... Other Modals ... */}
        <Modal isOpen={showManageClasses} onClose={() => setShowManageClasses(false)} className="max-w-md rounded-[2rem]">
            <div className="text-center text-slate-900">
                <h3 className="font-black text-xl mb-4">إعدادات الفصول والصفوف</h3>
                <p className="text-xs text-gray-500 mb-6 font-bold">يمكنك هنا حذف الفصول أو الصفوف الدراسية بالكامل. <br/> <span className="text-rose-500">تنبيه: الحذف سيؤثر على جميع الصفحات.</span></p>
                <div className="space-y-6 text-right">
                    <div>
                        <h4 className="text-xs font-black text-indigo-600 mb-2 border-b border-gray-200 pb-1">المراحل الدراسية (Grades)</h4>
                        {availableGrades.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {availableGrades.map(g => (<div key={g} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200"><span className="text-sm font-bold">الصف {g}</span><button onClick={() => executeDeleteGrade(g)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></div>))}
                            </div>
                        ) : <p className="text-[10px] text-gray-400">لا توجد مراحل مضافة.</p>}
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-indigo-600 mb-2 border-b border-gray-200 pb-1">الفصول (Classes)</h4>
                        {classes.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {classes.map(c => (<div key={c} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200"><span className="text-sm font-bold">{c}</span><button onClick={() => executeDeleteClass(c)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></div>))}
                            </div>
                        ) : <p className="text-[10px] text-gray-400">لا توجد فصول مضافة.</p>}
                    </div>
                </div>
                <button onClick={() => setShowManageClasses(false)} className="mt-6 w-full py-3 bg-gray-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-gray-200">إغلاق</button>
            </div>
        </Modal>

        {/* Add Student Modal */}
        <Modal isOpen={showManualAddModal} onClose={() => { setShowManualAddModal(false); setEditingStudent(null); setEditName(''); setEditPhone(''); setEditClass(''); }}>
            <div className="text-center">
                <h3 className="font-black text-xl mb-4 text-slate-800">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                <div className="space-y-3">
                    <input className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="اسم الطالب" value={editName} onChange={e => setEditName(e.target.value)} />
                    <input className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="الصف (مثال: 5/1)" value={editClass} onChange={e => setEditClass(e.target.value)} />
                    <input className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="رقم ولي الأمر (اختياري)" value={editPhone} onChange={e => setEditPhone(e.target.value)} type="tel" />
                    <button onClick={handleSaveStudent} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-lg">حفظ</button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} className="max-w-md rounded-[2rem]"><ExcelImport existingClasses={classes} onImport={(s) => { onBatchAddStudents(s); setShowImportModal(false); }} onAddClass={onAddClass} /></Modal>
        <Modal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} className="max-w-xs rounded-[2rem]"><div className="text-center"><h3 className="font-black text-lg mb-4 text-slate-800">إضافة فصل جديد</h3><input autoFocus className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm mb-4 outline-none border border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="اسم الفصل" value={newClassInput} onChange={e => setNewClassInput(e.target.value)} /><button onClick={() => { if(newClassInput.trim()) { onAddClass(newClassInput.trim()); setNewClassInput(''); setShowAddClassModal(false); } }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm">إضافة</button></div></Modal>
        
        {/* Random Picker Modal */}
        <Modal isOpen={isRandomPicking || !!randomStudent} onClose={() => { setRandomStudent(null); setIsRandomPicking(false); }} className="max-w-xs rounded-[2.5rem]">
            <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-indigo-100 shadow-xl overflow-hidden relative bg-white">{randomStudent ? (randomStudent.avatar ? <img src={randomStudent.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-indigo-600">{randomStudent.name.charAt(0)}</div>) : (<Sparkles className="w-10 h-10 text-indigo-400 animate-spin" />)}</div>
                <h3 className="text-xl font-black text-slate-900 mb-2 min-h-[2rem]">{randomStudent ? randomStudent.name : 'جاري الاختيار...'}</h3>
                {randomStudent && <p className="text-sm font-bold text-gray-500 mb-6">{randomStudent.classes[0]}</p>}
                {randomStudent && (<button onClick={() => { setRandomStudent(null); pickRandomStudent(); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg w-full">اختيار آخر</button>)}
            </div>
        </Modal>

    </div>
  );
};

export default StudentList;
