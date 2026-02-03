import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, ThumbsUp, ThumbsDown, Edit2, Sparkles, Trash2, Plus, Loader2, MessageCircle, DoorOpen, LayoutGrid, FileSpreadsheet, X, UserPlus, Upload, MoreHorizontal, Settings, PartyPopper, Trophy, Frown, CloudRain, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import ExcelImport from './ExcelImport';
import { useApp } from '../context/AppContext';

// --- تعريفات الشخصيات الكرتونية العمانية (3D Style SVG) - (تم تعديل خط الشعر والكمة) ---
const OmaniBoyAvatarSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="boySkin3D" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
        <stop offset="0%" stopColor="#ffdfc4" />
        <stop offset="60%" stopColor="#ebb082" />
        <stop offset="100%" stopColor="#d49066" />
      </radialGradient>
      <linearGradient id="dishdasha3D" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="20%" stopColor="#f1f5f9" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="80%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="kummahBase" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="2" dy="4" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#softShadow)">
      <path d="M50 170 C50 140 150 140 150 170 L150 210 L50 210 Z" fill="url(#dishdasha3D)" />
      <path d="M100 150 L100 180" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="183" r="3" fill="#cbd5e1" />
    </g>
    <rect x="85" y="115" width="30" height="20" fill="#d49066" />
    <g filter="url(#softShadow)">
      <circle cx="100" cy="95" r="48" fill="url(#boySkin3D)" />
      {/* الكمة: تم إنزالها لتغطي الجبهة */}
      <path d="M53 85 Q100 95 147 85 L147 65 Q100 15 53 65 Z" fill="url(#kummahBase)" />
      <path d="M53 85 Q100 95 147 85" fill="none" stroke="#e2e8f0" strokeWidth="1" />
      <path d="M60 80 Q100 90 140 80" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2" opacity="0.6" />
      <path d="M65 70 Q100 40 135 70" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="52" cy="95" r="9" fill="#ebb082" />
      <circle cx="148" cy="95" r="9" fill="#ebb082" />
    </g>
    <g>
      <ellipse cx="82" cy="100" rx="6" ry="8" fill="#1e293b" />
      <circle cx="84" cy="98" r="2.5" fill="white" opacity="0.9" />
      <ellipse cx="118" cy="100" rx="6" ry="8" fill="#1e293b" />
      <circle cx="120" cy="98" r="2.5" fill="white" opacity="0.9" />
      <path d="M75 90 Q82 88 89 90" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M111 90 Q118 88 125 90" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M90 120 Q100 128 110 120" fill="none" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="75" cy="115" rx="6" ry="3" fill="#fda4af" opacity="0.4" filter="blur(2px)" />
      <ellipse cx="125" cy="115" rx="6" ry="3" fill="#fda4af" opacity="0.4" filter="blur(2px)" />
    </g>
  </svg>
);

const OmaniGirlAvatarSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="girlSkin3D" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
        <stop offset="0%" stopColor="#ffdfc4" />
        <stop offset="60%" stopColor="#ebb082" />
        <stop offset="100%" stopColor="#d49066" />
      </radialGradient>
      <linearGradient id="hijab3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="uniform3D" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
      <filter id="girlShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="0" dy="4" result="offsetblur" />
        <feComponentTransfer>
           <feFuncA type="linear" slope="0.25"/> 
        </feComponentTransfer>
        <feMerge> 
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/> 
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#girlShadow)">
      <path d="M40 180 C40 130 160 130 160 180 L160 210 L40 210 Z" fill="url(#uniform3D)" />
      <path d="M70 160 L70 210 M130 160 L130 210" stroke="#2563eb" strokeWidth="12" opacity="0.3" />
    </g>
    <rect x="90" y="120" width="20" height="20" fill="#d49066" />
    <g filter="url(#girlShadow)">
      <path d="M45 90 Q100 20 155 90 L155 130 Q155 160 100 170 Q45 160 45 130 Z" fill="url(#hijab3D)" />
      <circle cx="100" cy="95" r="38" fill="url(#girlSkin3D)" />
      {/* الحجاب: تم تعديل المنحنى ليغطي الشعر والجبهة */}
      <path d="M62 90 Q100 100 138 90 L138 50 Q100 40 62 50 Z" fill="url(#hijab3D)" />
      <path d="M62 90 Q100 100 138 90" fill="none" stroke="#f1f5f9" strokeWidth="1" opacity="0.5" />
    </g>
    <g>
      <ellipse cx="86" cy="100" rx="5.5" ry="7.5" fill="#1e293b" />
      <circle cx="88" cy="98" r="2.5" fill="white" opacity="0.9" />
      <ellipse cx="114" cy="100" rx="5.5" ry="7.5" fill="#1e293b" />
      <circle cx="116" cy="98" r="2.5" fill="white" opacity="0.9" />
      <path d="M80 96 L78 94 M120 96 L122 94" stroke="#1e293b" strokeWidth="1.5" />
      <path d="M94 118 Q100 122 106 118" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" />
      <circle cx="80" cy="110" r="5" fill="#fbcfe8" opacity="0.5" filter="blur(2px)" />
      <circle cx="120" cy="110" r="5" fill="#fbcfe8" opacity="0.5" filter="blur(2px)" />
    </g>
  </svg>
);

const getStudentAvatar = (student: Student) => {
    if (student.avatar) return <img src={student.avatar} className="w-full h-full object-cover" alt={student.name} />;
    return student.gender === 'female' ? <OmaniGirlAvatarSVG /> : <OmaniBoyAvatarSVG />;
};
// ----------------------------------------------------------

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

const StudentItem = React.memo(({ student, onAction, currentSemester, onToggleGender }: { 
    student: Student, 
    onAction: (s: Student, type: 'positive' | 'negative' | 'edit' | 'delete' | 'truant') => void, 
    currentSemester: '1' | '2',
    onToggleGender: (s: Student) => void
}) => {
    const totalScore = useMemo(() => (student.grades || []).filter(g => !g.semester || g.semester === currentSemester).reduce((sum, g) => sum + (Number(g.score) || 0), 0), [student.grades, currentSemester]);
    const gradeSymbol = useMemo(() => { if (totalScore >= 90) return 'أ'; if (totalScore >= 80) return 'ب'; if (totalScore >= 65) return 'ج'; if (totalScore >= 50) return 'د'; return 'هـ'; }, [totalScore]);
    
    const gradeColor = useMemo(() => { 
        if (totalScore >= 90) return 'text-emerald-700 bg-emerald-100 border-emerald-200'; 
        if (totalScore >= 80) return 'text-blue-700 bg-blue-100 border-blue-200'; 
        if (totalScore >= 65) return 'text-amber-700 bg-amber-100 border-amber-200'; 
        return 'text-rose-700 bg-rose-100 border-rose-200'; 
    }, [totalScore]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 mb-3 rounded-[1.5rem] gap-4 sm:gap-0 relative overflow-hidden transition-all duration-300
            bg-white hover:bg-white shadow-sm hover:shadow-md border border-slate-100 shimmer-hover hover:-translate-y-0.5"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${totalScore >= 90 ? 'bg-emerald-500' : totalScore >= 50 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>

            <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10 pl-3">
                {/* Avatar with Click-to-Toggle Gender */}
                <div 
                    onClick={(e) => { e.stopPropagation(); onToggleGender(student); }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0 shadow-inner border cursor-pointer active:scale-90 transition-transform select-none ${student.gender === 'female' ? 'bg-pink-50 border-pink-100' : 'bg-blue-50 border-blue-100'}`}
                    title="اضغط لتبديل النوع (ذكر/أنثى)"
                >
                    {getStudentAvatar(student)}
                </div>
                
                <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-sm truncate group-hover:text-indigo-700 transition-colors">{student.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">{student.classes[0]}</span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border ${gradeColor}`}>{gradeSymbol} ({totalScore})</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 pl-1 relative z-10">
                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shadow-inner">
                    <button onClick={(e) => { e.stopPropagation(); onAction(student, 'positive'); }} className="w-10 h-10 rounded-lg flex items-center justify-center bg-white text-emerald-600 hover:text-white hover:bg-emerald-50 shadow-sm active:scale-95 transition-all">
                        <ThumbsUp className="w-5 h-5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction(student, 'negative'); }} className="w-10 h-10 rounded-lg flex items-center justify-center bg-white text-rose-600 hover:text-white hover:bg-rose-50 shadow-sm active:scale-95 transition-all">
                        <ThumbsDown className="w-5 h-5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction(student, 'truant'); }} className="w-10 h-10 rounded-lg flex items-center justify-center bg-white text-purple-600 hover:text-white hover:bg-purple-50 shadow-sm active:scale-95 transition-all" title="تسرب">
                        <DoorOpen className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>
                
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onAction(student, 'edit'); }} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction(student, 'delete'); }} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}, (prev, next) => prev.student === next.student && prev.currentSemester === next.currentSemester);

const StudentList: React.FC<StudentListProps> = ({ students, classes, onAddClass, onAddStudentManually, onBatchAddStudents, onUpdateStudent, onDeleteStudent, onViewReport, currentSemester, onDeleteClass }) => {
  const { teacherInfo } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showManageClasses, setShowManageClasses] = useState(false); 
  
  const [newClassInput, setNewClassInput] = useState('');
  
  // Edit/Add Student States
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male'); // New Gender State
  
  const [showNegativeReasons, setShowNegativeReasons] = useState<{student: Student} | null>(null);
  const [showPositiveReasons, setShowPositiveReasons] = useState<{student: Student} | null>(null);
  const [customBehaviorReason, setCustomBehaviorReason] = useState('');
  const [customBehaviorPoints, setCustomBehaviorPoints] = useState<string>('1');

  const [feedbackAnimation, setFeedbackAnimation] = useState<{ type: BehaviorType, text: string } | null>(null);

  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
  const [isRandomPicking, setIsRandomPicking] = useState(false);
  
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

  const visibleClasses = useMemo(() => {
      if (selectedGrade === 'all') return classes;
      return classes.filter(c => c.startsWith(selectedGrade));
  }, [classes, selectedGrade]);

  const filteredStudents = useMemo(() => students.filter(s => {
      const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = selectedClass === 'all' || s.classes?.includes(selectedClass);
      
      let matchGrade = true;
      if (selectedGrade !== 'all') {
          matchGrade = s.grade === selectedGrade || (s.classes[0] && s.classes[0].startsWith(selectedGrade));
      }

      return matchName && matchClass && matchGrade;
  }), [students, searchTerm, selectedClass, selectedGrade]);

  useEffect(() => {
      if (feedbackAnimation) {
          const timer = setTimeout(() => setFeedbackAnimation(null), 1800);
          return () => clearTimeout(timer);
      }
  }, [feedbackAnimation]);

  const playBehaviorSound = (type: BehaviorType) => {
      try {
          const audio = new Audio(type === 'positive' ? SOUNDS.positive : SOUNDS.negative);
          audio.volume = 0.6; 
          audio.play().catch(e => console.warn('Audio play blocked', e));
      } catch (e) {
          console.error('Failed to play sound', e);
      }
  };

  const handleAction = (student: Student, type: 'positive' | 'negative' | 'edit' | 'delete' | 'truant') => {
      if (type === 'positive') setShowPositiveReasons({ student });
      else if (type === 'negative') setShowNegativeReasons({ student });
      else if (type === 'edit') {
          setEditingStudent(student);
          setEditName(student.name);
          setEditClass(student.classes[0]);
          setEditPhone(student.parentPhone || '');
          setEditAvatar(student.avatar || '');
          setEditGender(student.gender || 'male'); // Load existing gender
          setShowManualAddModal(true);
      }
      else if (type === 'delete') {
          if(confirm(`حذف الطالب ${student.name}؟`)) onDeleteStudent(student.id);
      }
      else if (type === 'truant') {
          if(confirm('تسجيل هروب (تسرب) لهذا الطالب؟')) {
              handleAddBehavior(student, 'negative', 'تسرب من الحصة', 3);
          }
      }
  };

  // وظيفة تبديل الجنس السريع
  const handleToggleGender = (student: Student) => {
      const newGender = student.gender === 'female' ? 'male' : 'female';
      onUpdateStudent({ ...student, gender: newGender });
  };

  const handleSaveStudent = () => {
      if (editName.trim() && editClass.trim()) {
          const inferredGrade = editClass.trim().match(/^(\d+)/)?.[1] || '';
          if (editingStudent) {
              onUpdateStudent({ ...editingStudent, name: editName, classes: [editClass], parentPhone: editPhone, avatar: editAvatar, grade: inferredGrade, gender: editGender });
          } else {
              onAddStudentManually(editName, editClass, editPhone, editAvatar, editGender);
          }
          setShowManualAddModal(false);
          setEditingStudent(null);
          setEditName(''); setEditPhone(''); setEditClass(''); setEditAvatar(''); setEditGender('male');
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
          if (count > 10) {
              clearInterval(interval);
              setIsRandomPicking(false);
          }
      }, 100);
  };

  const handleAddBehavior = (student: Student, type: BehaviorType, reason: string, points: number) => {
      playBehaviorSound(type);
      setFeedbackAnimation({ 
          type, 
          text: type === 'positive' ? 'أحسنت!' : 'انتبه!' 
      });
      const newBehavior = {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          type,
          description: reason,
          points: Math.abs(points),
          semester: currentSemester
      };
      const updatedStudent = { ...student, behaviors: [newBehavior, ...(student.behaviors || [])] };
      onUpdateStudent(updatedStudent);
      setShowPositiveReasons(null);
      setShowNegativeReasons(null);
  };

  const handleManualBehaviorSubmit = (type: BehaviorType, student: Student) => {
      if (customBehaviorReason.trim()) {
          handleAddBehavior(student, type, customBehaviorReason, parseInt(customBehaviorPoints) || 1);
          setCustomBehaviorReason('');
      }
  };

  const executeDeleteClass = (className: string) => {
      if (!onDeleteClass) return;
      if (confirm(`هل أنت متأكد من حذف الفصل "${className}"؟\nسيتم حذفه من سجلات جميع الطلاب.`)) {
          onDeleteClass(className);
          if (selectedClass === className) setSelectedClass('all');
      }
  };

  const executeDeleteGrade = (grade: string) => {
      if (!onDeleteClass) return;
      const relatedClasses = classes.filter(c => c.startsWith(grade));
      if (confirm(`هل أنت متأكد من حذف الصف "${grade}" بالكامل؟\nسيتم حذف الفصول التالية: ${relatedClasses.join(', ')}`)) {
          relatedClasses.forEach(c => onDeleteClass(c));
          if (selectedGrade === grade) {
              setSelectedGrade('all');
              setSelectedClass('all');
          }
      }
  };

  return (
    <div className="flex flex-col h-full text-slate-800 relative">
        
        {/* --- FEEDBACK ANIMATION OVERLAY --- */}
        <AnimatePresence>
            {feedbackAnimation && (
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none"
                >
                    <div className={`
                        p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 border-4
                        backdrop-blur-xl
                        ${feedbackAnimation.type === 'positive' 
                            ? 'bg-emerald-500/90 border-emerald-600 text-white shadow-emerald-500/50' 
                            : 'bg-rose-500/90 border-rose-600 text-white shadow-rose-500/50'}
                    `}>
                        <div className="bg-white/20 p-6 rounded-full shadow-inner">
                            {feedbackAnimation.type === 'positive' ? (
                                <div className="relative">
                                    <Trophy className="w-20 h-20 text-yellow-300 drop-shadow-md" />
                                    <PartyPopper className="w-12 h-12 text-white absolute -top-4 -right-4 animate-bounce" />
                                </div>
                            ) : (
                                <div className="relative">
                                    <Frown className="w-20 h-20 text-white drop-shadow-md" />
                                    <CloudRain className="w-12 h-12 text-slate-200 absolute -top-4 -right-4 animate-pulse" />
                                </div>
                            )}
                        </div>
                        <h2 className="text-4xl font-black tracking-tight drop-shadow-sm">{feedbackAnimation.text}</h2>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Sticky Header (Light Theme) */}
        <div className="fixed md:sticky top-0 z-40 md:z-30 bg-[#1e3a8a] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300 rounded-b-[2.5rem] md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
            {/* Removed pt-safe and large mt-4 to fix mobile spacing */}
            <div className="flex justify-between items-center mb-4 mt-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight drop-shadow-sm">قائمة الطلاب</h1>
                <div className="flex gap-2">
                    <button onClick={() => setShowManualAddModal(true)} className="w-10 h-10 rounded-2xl glass-icon bg-white border border-slate-200 text-indigo-600 active:scale-95 transition-all shadow-sm hover:shadow-md" title="إضافة طالب">
                        <UserPlus className="w-5 h-5"/>
                    </button>
                    <button onClick={() => setShowImportModal(true)} className="w-10 h-10 rounded-2xl glass-icon bg-white border border-slate-200 text-emerald-600 active:scale-95 transition-all shadow-sm hover:shadow-md" title="استيراد Excel">
                        <Upload className="w-5 h-5"/>
                    </button>
                    <button onClick={pickRandomStudent} className="w-10 h-10 rounded-2xl glass-icon bg-white border border-slate-200 text-purple-600 active:scale-95 transition-all shadow-sm hover:shadow-md" title="اختيار عشوائي">
                        <Sparkles className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            {/* Hierarchy Filters */}
            <div className="space-y-3 mb-2">
                {/* 1. Grades (Level) */}
                {availableGrades.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-black whitespace-nowrap transition-all rounded-xl border ${selectedGrade === 'all' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>كل المراحل</button>
                        {availableGrades.map(g => (
                            <button key={g} onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-black whitespace-nowrap transition-all rounded-xl border ${selectedGrade === g ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>صف {g}</button>
                        ))}
                    </div>
                )}

                {/* 2. Classes (Sub-level) + Search */}
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowManageClasses(true)} className="w-10 h-10 flex items-center justify-center rounded-xl glass-card bg-white border border-slate-200 hover:bg-gray-50 active:scale-95 text-slate-500 shadow-sm" title="إدارة الفصول">
                        <Settings className="w-5 h-5"/>
                    </button>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 max-w-[55%]">
                        {visibleClasses.map(c => (
                            <button key={c} onClick={() => setSelectedClass(c)} className={`px-5 py-2.5 text-xs font-black whitespace-nowrap transition-all rounded-xl border shadow-sm ${selectedClass === c ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-200' : 'bg-white border-slate-200 hover:bg-gray-50 text-slate-700'}`}>{c}</button>
                        ))}
                        <button onClick={() => setShowAddClassModal(true)} className="px-4 py-2 rounded-xl glass-card bg-white border border-slate-200 hover:bg-gray-50 active:scale-95 text-slate-500 shadow-sm"><Plus className="w-5 h-5"/></button>
                    </div>
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="بحث..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full glass-input bg-white rounded-xl py-2.5 pr-9 pl-3 text-xs font-bold outline-none border border-slate-200 focus:border-indigo-500 shadow-sm text-slate-900" 
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Student List Content */}
        <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
            {filteredStudents.length > 0 ? (
                <div className="flex flex-col gap-3 pb-24 pt-2">
                    {filteredStudents.map(student => (
                        <StudentItem 
                            key={student.id} 
                            student={student} 
                            onAction={handleAction} 
                            currentSemester={currentSemester}
                            onToggleGender={handleToggleGender}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <LayoutGrid className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-sm font-bold text-gray-500">لا يوجد طلاب مطابقين</p>
                </div>
            )}
        </div>

        {/* ... Modals ... */}
        {/* --- Add/Edit Student Modal with Gender --- */}
        <Modal isOpen={showManualAddModal} onClose={() => { setShowManualAddModal(false); setEditingStudent(null); setEditName(''); setEditPhone(''); setEditClass(''); setEditGender('male'); }}>
            <div className="text-center">
                <h3 className="font-black text-xl mb-4 text-slate-800">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                <div className="space-y-3">
                    <input className="w-full p-3 glass-input bg-white rounded-xl font-bold text-sm outline-none border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="اسم الطالب" value={editName} onChange={e => setEditName(e.target.value)} />
                    <input className="w-full p-3 glass-input bg-white rounded-xl font-bold text-sm outline-none border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="الصف (مثال: 5/1)" value={editClass} onChange={e => setEditClass(e.target.value)} />
                    <input className="w-full p-3 glass-input bg-white rounded-xl font-bold text-sm outline-none border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="رقم ولي الأمر (اختياري)" value={editPhone} onChange={e => setEditPhone(e.target.value)} type="tel" />
                    
                    {/* Gender Selection (لم يتم تغيير الإيموجي هنا لأنه ليس الصورة الرئيسية) */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button onClick={() => setEditGender('male')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${editGender === 'male' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>ذكر 👨‍🎓</button>
                        <button onClick={() => setEditGender('female')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${editGender === 'female' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>أنثى 👩‍🎓</button>
                    </div>

                    <button onClick={handleSaveStudent} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-lg mt-2">حفظ</button>
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
                                {availableGrades.map(g => (
                                    <div key={g} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-sm font-bold">الصف {g}</span>
                                        <button onClick={() => executeDeleteGrade(g)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="حذف الصف بالكامل"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-[10px] text-gray-400">لا توجد مراحل مضافة.</p>}
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-indigo-600 mb-2 border-b border-gray-200 pb-1">الفصول (Classes)</h4>
                        {classes.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {classes.map(c => (
                                    <div key={c} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-sm font-bold">{c}</span>
                                        <button onClick={() => executeDeleteClass(c)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="حذف الفصل"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-[10px] text-gray-400">لا توجد فصول مضافة.</p>}
                    </div>
                </div>
                <button onClick={() => setShowManageClasses(false)} className="mt-6 w-full py-3 bg-gray-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-gray-200">إغلاق</button>
            </div>
        </Modal>

        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} className="max-w-md rounded-[2rem]">
            <ExcelImport existingClasses={classes} onImport={(s) => { onBatchAddStudents(s); setShowImportModal(false); }} onAddClass={onAddClass} />
        </Modal>

        <Modal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} className="max-w-xs rounded-[2rem]">
            <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-slate-800">إضافة فصل جديد</h3>
                <input autoFocus className="w-full p-3 glass-input bg-white rounded-xl font-bold text-sm mb-4 outline-none border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="اسم الفصل" value={newClassInput} onChange={e => setNewClassInput(e.target.value)} />
                <button onClick={() => { if(newClassInput.trim()) { onAddClass(newClassInput.trim()); setNewClassInput(''); setShowAddClassModal(false); } }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm">إضافة</button>
            </div>
        </Modal>

        <Modal isOpen={isRandomPicking || !!randomStudent} onClose={() => { setRandomStudent(null); setIsRandomPicking(false); }} className="max-w-xs rounded-[2.5rem]">
            <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full glass-icon border-4 border-indigo-100 shadow-xl overflow-hidden relative bg-white">
                    {randomStudent ? (
                        // تم تغيير الإيموجي هنا فقط في نافذة الاختيار العشوائي
                        getStudentAvatar(randomStudent)
                    ) : (
                        <Sparkles className="w-10 h-10 text-indigo-400 animate-spin" />
                    )}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 min-h-[2rem]">
                    {randomStudent ? randomStudent.name : 'جاري الاختيار...'}
                </h3>
                {randomStudent && <p className="text-sm font-bold text-gray-500 mb-6">{randomStudent.classes[0]}</p>}
                
                {randomStudent && (
                    <button onClick={() => { setRandomStudent(null); pickRandomStudent(); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg w-full">
                        اختيار آخر
                    </button>
                )}
            </div>
        </Modal>

        <Modal isOpen={!!showPositiveReasons} onClose={() => setShowPositiveReasons(null)} className="max-w-xs rounded-[2rem]">
            <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-emerald-600">سلوك إيجابي</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {['مشاركة مميزة', 'واجب منزلي', 'نظافة', 'تعاون', 'إجابة نموذجية', 'هدوء'].map(r => (
                        <button key={r} onClick={() => { if(showPositiveReasons) handleAddBehavior(showPositiveReasons.student, 'positive', r, 1); }} className="p-3 glass-card bg-white text-xs font-bold hover:bg-emerald-50 text-slate-600 transition-colors border border-gray-200 shadow-sm">{r}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input placeholder="سبب آخر..." value={customBehaviorReason} onChange={e => setCustomBehaviorReason(e.target.value)} className="flex-1 p-2 glass-input bg-white rounded-lg text-xs font-bold border-gray-200 text-slate-800" />
                    <button onClick={() => { if(showPositiveReasons) handleManualBehaviorSubmit('positive', showPositiveReasons.student); }} className="p-2 bg-emerald-600 text-white rounded-lg"><Plus className="w-4 h-4"/></button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={!!showNegativeReasons} onClose={() => setShowNegativeReasons(null)} className="max-w-xs rounded-[2rem]">
            <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-rose-600">سلوك سلبي</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {['إزعاج', 'نسيان كتاب', 'نوم', 'تأخر', 'ألفاظ', 'شجار'].map(r => (
                        <button key={r} onClick={() => { if(showNegativeReasons) handleAddBehavior(showNegativeReasons.student, 'negative', r, -1); }} className="p-3 glass-card bg-white text-xs font-bold hover:bg-rose-50 text-slate-600 transition-colors border border-gray-200 shadow-sm">{r}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input placeholder="سبب آخر..." value={customBehaviorReason} onChange={e => setCustomBehaviorReason(e.target.value)} className="flex-1 p-2 glass-input bg-white rounded-lg text-xs font-bold border-gray-200 text-slate-800" />
                    <button onClick={() => { if(showNegativeReasons) handleManualBehaviorSubmit('negative', showNegativeReasons.student); }} className="p-2 bg-rose-600 text-white rounded-lg"><Plus className="w-4 h-4"/></button>
                </div>
            </div>
        </Modal>

    </div>
  );
};

export default StudentList;