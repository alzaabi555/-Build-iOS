import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, Edit2, Trash2, Plus, LayoutGrid, Settings, UserPlus, Upload, Sparkles, X, Trophy, Frown, CloudRain, PartyPopper, Check, Users, Volume2, VolumeX, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import ExcelImport from './ExcelImport';
import { useApp } from '../context/AppContext';

// ✅ تعريف الواجهة لتجنب الأخطاء
export interface StudentListProps {
  students: Student[];
  classes: string[];
  onAddClass: (name: string) => void;
  onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string, gender?: 'male' | 'female') => void;
  onBatchAddStudents: (students: Student[]) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onViewReport: (student: Student) => void;
  currentSemester: 1 | 2;
  onSemesterChange: (sem: 1 | 2) => void;
  onDeleteClass: (className: string) => void;
}

// ============================================================================
// ✅ 1. الشخصيات العمانية التفاعلية (Flat Vector with Moods)
// ============================================================================

type Mood = 'neutral' | 'happy' | 'sad';

// مكون الولد العماني (دشداشة وكمة)
const OmaniBoyAvatarSVG = ({ mood }: { mood: Mood }) => {
    let mouthPath = "M56 72Q60 75 64 72"; // neutral
    let browY = 0;
    if (mood === 'happy') {
        mouthPath = "M54 70 Q60 80 66 70"; // big smile
        browY = -2; 
    } else if (mood === 'sad') {
        mouthPath = "M56 76 Q60 70 64 76"; // frown
        browY = 2; 
    }

    return (
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full transition-all duration-300">
            <circle cx="60" cy="60" r="55" fill="#F1F5F9" />
            <path d="M25 115C25 95 95 95 95 115V120H25V115Z" fill="white" />
            <path d="M25 115C25 90 40 85 60 85C80 85 95 90 95 115" stroke="#E2E8F0" strokeWidth="1" />
            <path d="M60 85V100" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <circle cx="60" cy="102" r="2" fill="#CBD5E1" />
            <rect x="50" y="70" width="20" height="20" fill="#EBB082" />
            <circle cx="60" cy="65" r="22" fill="#EBB082" />
            <path d="M38 55C38 40 45 35 60 35C75 35 82 40 82 55H38Z" fill="white" />
            <path d="M38 55H82V60C82 60 75 62 60 62C45 62 38 60 38 60V55Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
            <path d="M45 45H75" stroke="#60A5FA" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M42 50H78" stroke="#60A5FA" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="60" cy="40" r="2" fill="#60A5FA" />
            <g transform={`translate(0, ${browY})`} className="transition-transform duration-300">
                <circle cx="53" cy="65" r="2.5" fill="#1E293B" />
                <circle cx="67" cy="65" r="2.5" fill="#1E293B" />
            </g>
            <path d={mouthPath} stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" fill="none" className="transition-all duration-300" />
        </svg>
    );
};

// مكون البنت العمانية (لحاف ومريول ملون حسب اختيار المعلمة)
const OmaniGirlAvatarSVG = ({ mood, uniformColor }: { mood: Mood, uniformColor: 'blue' | 'maroon' }) => {
    let mouthPath = "M57 69Q60 71 63 69"; 
    if (mood === 'happy') {
        mouthPath = "M55 68 Q60 76 65 68"; 
    } else if (mood === 'sad') {
        mouthPath = "M57 72 Q60 66 63 72"; 
    }

    const primaryColor = uniformColor === 'blue' ? '#2563EB' : '#9F1239'; 
    const secondaryColor = uniformColor === 'blue' ? '#1E40AF' : '#881337';

    return (
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full transition-all duration-300">
            <circle cx="60" cy="60" r="55" fill="#F1F5F9" />
            <path d="M30 115C30 95 90 95 90 115V120H30V115Z" fill={primaryColor} />
            <path d="M30 115C30 100 45 100 45 120" fill={secondaryColor} opacity="0.2" />
            <path d="M90 115C90 100 75 100 75 120" fill={secondaryColor} opacity="0.2" />
            <rect x="52" y="80" width="16" height="15" fill="white" />
            <path d="M40 60C40 30 50 25 60 25C70 25 80 30 80 60V80C80 90 40 90 40 80V60Z" fill="white" />
            <circle cx="60" cy="62" r="16" fill="#EBB082" />
            <path d="M44 60C44 45 50 40 60 40C70 40 76 45 76 60" stroke="#E2E8F0" strokeWidth="1" />
            <circle cx="55" cy="62" r="2" fill="#1E293B" />
            <circle cx="65" cy="62" r="2" fill="#1E293B" />
            <path d={mouthPath} stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" fill="none" className="transition-all duration-300" />
            <path d="M53 60L51 58" stroke="#1E293B" strokeWidth="1" opacity={mood==='sad'?0:1} />
            <path d="M67 60L69 58" stroke="#1E293B" strokeWidth="1" opacity={mood==='sad'?0:1}/>
        </svg>
    );
};

// دالة اختيار الأفاتار (تم التحديث لتقبل لون الزي المختار يدوياً)
const getStudentAvatar = (student: Student, mood: Mood = 'neutral', girlUniform: 'blue' | 'maroon' = 'blue') => {
    if (student.avatar) return <img src={student.avatar} className="w-full h-full object-cover rounded-full" alt={student.name} />;
    
    if (student.gender === 'female') {
        return <OmaniGirlAvatarSVG mood={mood} uniformColor={girlUniform} />;
    }
    return <OmaniBoyAvatarSVG mood={mood} />;
};

// ============================================================================
// بقية الأيقونات (لم يتم لمسها)
// ============================================================================
const Icon3DMenu = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-6 h-6"}><defs><linearGradient id="menuGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#f1f5f9" /></linearGradient><filter id="menuShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.2" /></filter></defs><rect x="20" y="25" width="60" height="10" rx="5" fill="url(#menuGrad)" filter="url(#menuShadow)" /><rect x="20" y="45" width="60" height="10" rx="5" fill="url(#menuGrad)" filter="url(#menuShadow)" /><rect x="20" y="65" width="60" height="10" rx="5" fill="url(#menuGrad)" filter="url(#menuShadow)" /></svg>);
const Icon3DPositive = () => (<svg viewBox="0 0 100 100" className="w-10 h-10"><defs><linearGradient id="posGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#16a34a" /></linearGradient><filter id="posShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" /></filter></defs><circle cx="50" cy="50" r="45" fill="url(#posGrad)" filter="url(#posShadow)" /><circle cx="35" cy="40" r="5" fill="white" /><circle cx="65" cy="40" r="5" fill="white" /><path d="M30 65 Q50 80 70 65" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" /></svg>);
const Icon3DNegative = () => (<svg viewBox="0 0 100 100" className="w-10 h-10"><defs><linearGradient id="negGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#dc2626" /></linearGradient><filter id="negShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" /></filter></defs><circle cx="50" cy="50" r="45" fill="white" filter="url(#negShadow)" /><circle cx="50" cy="50" r="40" fill="none" stroke="url(#negGrad)" strokeWidth="6" /><path d="M50 25 V55" stroke="url(#negGrad)" strokeWidth="6" strokeLinecap="round" /><circle cx="50" cy="70" r="4" fill="url(#negGrad)" /></svg>);
const Icon3DAdd = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-5 h-5"}><defs><linearGradient id="gradAdd" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#2563eb" /></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(#gradAdd)" /><path d="M50 25 V75 M25 50 H75" stroke="white" strokeWidth="8" strokeLinecap="round" /></svg>);
const Icon3DExcel = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-5 h-5"}><defs><linearGradient id="gradEx" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></linearGradient></defs><rect x="25" y="20" width="50" height="60" rx="5" fill="url(#gradEx)" /><path d="M35 35 H65 M35 45 H65 M35 55 H50" stroke="white" strokeWidth="4" strokeLinecap="round" /></svg>);
const Icon3DRandom = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-5 h-5"}><defs><linearGradient id="gradRand" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs><rect x="20" y="20" width="60" height="60" rx="10" fill="url(#gradRand)" /><circle cx="35" cy="35" r="5" fill="white"/><circle cx="65" cy="65" r="5" fill="white"/><circle cx="50" cy="50" r="5" fill="white"/></svg>);
const Icon3DSettings = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-5 h-5"}><defs><linearGradient id="gradSet" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#475569" /></linearGradient></defs><circle cx="50" cy="50" r="25" fill="none" stroke="url(#gradSet)" strokeWidth="15" strokeDasharray="10 5" /><circle cx="50" cy="50" r="10" fill="#cbd5e1" /></svg>);
const Icon3DDelete = () => (<svg viewBox="0 0 100 100" className="w-5 h-5"><rect x="25" y="25" width="50" height="60" rx="5" fill="#fee2e2" /><path d="M35 15 H65 V25 H35 Z" fill="#ef4444" /><path d="M40 40 V70 M50 40 V70 M60 40 V70" stroke="#ef4444" strokeWidth="3" /></svg>);
const Icon3DEdit = () => (<svg viewBox="0 0 100 100" className="w-5 h-5"><path d="M20 80 L25 55 L75 5 L95 25 L45 75 Z" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" /><path d="M20 80 L35 80 L20 65 Z" fill="#3b82f6" /></svg>);
const Icon3DTruant = () => (<svg viewBox="0 0 100 100" className="w-5 h-5"><rect x="20" y="15" width="60" height="70" rx="2" fill="#f3e8ff" /><path d="M20 15 H50 V85 H20 Z" fill="#a855f7" /><circle cx="45" cy="50" r="3" fill="white" /></svg>);

const SOUNDS = {
    positive: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    negative: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3'
};

// --- بطاقة الطالب (تم التحديث لتقبل لون الزي المختار) ---
const StudentItem = React.memo(({ student, onClick, feedbackState, girlUniform }: { student: Student, onClick: (s: Student) => void, feedbackState: { type: BehaviorType, studentId: string } | null, girlUniform: 'blue' | 'maroon' }) => {
    const points = useMemo(() => (student.behaviors || []).reduce((acc, b) => acc + (b.type === 'positive' ? b.points : -b.points), 0), [student.behaviors]);
    
    const currentMood: Mood = useMemo(() => {
        if (feedbackState && feedbackState.studentId === student.id) {
            return feedbackState.type === 'positive' ? 'happy' : 'sad';
        }
        return 'neutral';
    }, [feedbackState, student.id]);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
            onClick={() => onClick(student)}
            className="bg-white rounded-3xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex flex-col items-center relative overflow-hidden group h-full justify-between"
        >
            <div className={`absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-lg ${points >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                {points}
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-2 mt-2 rounded-full border-4 border-indigo-50 shadow-inner overflow-hidden bg-slate-50 transform group-hover:scale-105 transition-transform flex-shrink-0">
                {getStudentAvatar(student, currentMood, girlUniform)}
            </div>
            <h3 className="font-black text-slate-900 text-[10px] sm:text-xs text-center w-full mb-1 leading-snug line-clamp-3 min-h-[2.5em] flex items-center justify-center break-words px-1">
                {student.name}
            </h3>
            <p className="text-[9px] text-slate-400 font-bold bg-slate-50 px-3 py-0.5 rounded-full mt-auto">
                {student.classes[0]}
            </p>
        </motion.div>
    );
}, (prev, next) => prev.student === next.student && prev.feedbackState === next.feedbackState && prev.girlUniform === next.girlUniform);

const StudentList: React.FC<StudentListProps> = ({ students, classes, onAddClass, onAddStudentManually, onBatchAddStudents, onUpdateStudent, onDeleteStudent, onViewReport, currentSemester, onDeleteClass }) => {
  const { teacherInfo } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showManageClasses, setShowManageClasses] = useState(false); 
  const [showMenu, setShowMenu] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newClassInput, setNewClassInput] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  const [showNegativeReasons, setShowNegativeReasons] = useState<{student: Student} | null>(null);
  const [showPositiveReasons, setShowPositiveReasons] = useState<{student: Student} | null>(null);
  const [customBehaviorReason, setCustomBehaviorReason] = useState('');
  const [customBehaviorPoints, setCustomBehaviorPoints] = useState<string>('1');
  const [feedbackAnimation, setFeedbackAnimation] = useState<{ type: BehaviorType, text: string, studentId: string } | null>(null);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
  const [isRandomPicking, setIsRandomPicking] = useState(false);
  const [participatedIds, setParticipatedIds] = useState<string[]>([]);

  // ✅ 1. إعدادات الصوت والزي (حفظ محلي)
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => localStorage.getItem('rased_sound') !== 'false');
  const [girlUniformColor, setGirlUniformColor] = useState<'blue' | 'maroon'>(() => (localStorage.getItem('rased_girl_uniform') as 'blue' | 'maroon') || 'blue');

  const toggleSound = () => {
      const newState = !isSoundEnabled;
      setIsSoundEnabled(newState);
      localStorage.setItem('rased_sound', String(newState));
  };

  const changeGirlUniform = (color: 'blue' | 'maroon') => {
      setGirlUniformColor(color);
      localStorage.setItem('rased_girl_uniform', color);
  };

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
  }, [students]);

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

  // ✅ تشغيل الصوت فقط إذا كان مفعلاً
  const playBehaviorSound = (type: BehaviorType) => {
      if (!isSoundEnabled) return;
      try {
          const audio = new Audio(type === 'positive' ? SOUNDS.positive : SOUNDS.negative);
          audio.volume = 0.6; audio.play().catch(e => console.warn('Audio play blocked', e));
      } catch (e) { console.error('Failed to play sound', e); }
  };

  const handleStudentClick = (student: Student) => { setSelectedStudent(student); };

  const handleAction = (type: 'positive' | 'negative' | 'edit' | 'delete' | 'truant', student: Student) => {
      if (type === 'positive') { setShowPositiveReasons({ student }); setSelectedStudent(null); }
      else if (type === 'negative') { setShowNegativeReasons({ student }); setSelectedStudent(null); }
      else if (type === 'edit') {
          setEditingStudent(student); setEditName(student.name); setEditClass(student.classes[0]);
          setEditPhone(student.parentPhone || ''); setEditAvatar(student.avatar || '');
          setEditGender(student.gender || 'male'); setShowManualAddModal(true); setSelectedStudent(null);
      }
      else if (type === 'delete') { if(confirm(`حذف الطالب ${student.name}؟`)) { onDeleteStudent(student.id); setSelectedStudent(null); } }
      else if (type === 'truant') { if(confirm('تسجيل هروب لهذا الطالب؟')) { handleAddBehavior(student, 'negative', 'تسرب من الحصة', 3); setSelectedStudent(null); } }
  };

  const handleToggleGender = (student: Student) => {
      const newGender = student.gender === 'female' ? 'male' : 'female';
      onUpdateStudent({ ...student, gender: newGender });
  };

  const handleBulkGenderUpdate = (gender: 'male' | 'female') => {
      if (confirm(`هل أنت متأكد من توحيد الأيقونات لجميع الطلاب؟`)) {
          students.forEach(student => { if (student.gender !== gender) onUpdateStudent({ ...student, gender }); });
          alert('تم التحديث بنجاح! 🎉');
      }
  };

  const handleSaveStudent = () => {
      if (editName.trim() && editClass.trim()) {
          const inferredGrade = editClass.trim().match(/^(\d+)/)?.[1] || '';
          if (editingStudent) onUpdateStudent({ ...editingStudent, name: editName, classes: [editClass], parentPhone: editPhone, avatar: editAvatar, grade: inferredGrade, gender: editGender });
          else onAddStudentManually(editName, editClass, editPhone, editAvatar, editGender);
          setShowManualAddModal(false); setEditingStudent(null); setEditName(''); setEditPhone(''); setEditClass(''); setEditAvatar(''); setEditGender('male');
      }
  };

  const pickRandomStudent = () => {
      const pool = filteredStudents;
      if (pool.length === 0) return;
      let eligible = pool.filter(s => !participatedIds.includes(s.id));
      if (eligible.length === 0) { setParticipatedIds([]); eligible = pool; }
      setIsRandomPicking(true);
      let count = 0;
      const interval = setInterval(() => {
          const random = eligible[Math.floor(Math.random() * eligible.length)];
          setRandomStudent(random);
          count++;
          if (count > 10) {
              clearInterval(interval); setIsRandomPicking(false);
              if (random) setParticipatedIds(prev => [...prev, random.id]);
          }
      }, 100);
  };

  const handleAddBehavior = (student: Student, type: BehaviorType, reason: string, points: number) => {
      playBehaviorSound(type);
      setFeedbackAnimation({ type, text: type === 'positive' ? 'أحسنت!' : 'انتبه!', studentId: student.id });
      const newBehavior = { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), type, description: reason, points: Math.abs(points), semester: currentSemester };
      const updatedStudent = { ...student, behaviors: [newBehavior, ...(student.behaviors || [])] };
      onUpdateStudent(updatedStudent); setShowPositiveReasons(null); setShowNegativeReasons(null);
  };

  const handleManualBehaviorSubmit = (type: BehaviorType, student: Student) => {
      if (customBehaviorReason.trim()) {
          handleAddBehavior(student, type, customBehaviorReason, parseInt(customBehaviorPoints) || 1);
          setCustomBehaviorReason('');
      }
  };

  const executeDeleteClass = (className: string) => {
      if (!onDeleteClass) return;
      if (confirm(`حذف الفصل "${className}"؟`)) { onDeleteClass(className); if (selectedClass === className) setSelectedClass('all'); }
  };

  const executeDeleteGrade = (grade: string) => {
      if (!onDeleteClass) return;
      const related = classes.filter(c => c.startsWith(grade));
      if (confirm(`حذف الصف "${grade}" بالكامل؟`)) { related.forEach(c => onDeleteClass(c)); if (selectedGrade === grade) { setSelectedGrade('all'); setSelectedClass('all'); } }
  };

  return (
    <div className="flex flex-col h-full text-slate-800 relative bg-[#f3f4f6]">
        <AnimatePresence>
            {feedbackAnimation && (
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
                    <div className={`p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 border-4 backdrop-blur-xl ${feedbackAnimation.type === 'positive' ? 'bg-emerald-500/90 border-emerald-600 text-white' : 'bg-rose-500/90 border-rose-600 text-white'}`}>
                        <div className="bg-white/20 p-6 rounded-full shadow-inner">{feedbackAnimation.type === 'positive' ? <Trophy className="w-20 h-20 text-yellow-300 drop-shadow-md" /> : <Frown className="w-20 h-20 text-white drop-shadow-md" />}</div>
                        <h2 className="text-4xl font-black tracking-tight drop-shadow-sm">{feedbackAnimation.text}</h2>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="fixed md:sticky top-0 z-40 md:z-30 bg-[#1e3a8a] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300 rounded-b-[2.5rem] w-full left-0 right-0">
            <div className="flex justify-between items-center mb-6 mt-2 relative">
                <div className="w-10"></div>
                <h1 className="text-2xl font-black tracking-tight absolute left-1/2 transform -translate-x-1/2 text-white">قائمة الطلاب</h1>
                <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all shadow-sm border border-white/10"><Icon3DMenu className="w-6 h-6" /></button>
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-left text-slate-800">
                                <div className="flex flex-col py-1">
                                    <button onClick={() => { setShowManualAddModal(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-right w-full font-bold text-sm text-slate-700"><Icon3DAdd /> إضافة طالب</button>
                                    <button onClick={() => { setShowImportModal(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-right w-full font-bold text-sm border-t border-slate-50 text-slate-700"><Icon3DExcel /> استيراد من Excel</button>
                                    <button onClick={() => { pickRandomStudent(); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-right w-full font-bold text-sm border-t border-slate-50 text-slate-700"><Icon3DRandom /> القرعة العشوائية</button>
                                    <button onClick={() => { setShowManageClasses(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-right w-full font-bold text-sm border-t border-slate-50 text-slate-700"><Icon3DSettings /> إعدادات عامة</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="space-y-3 mb-2 px-1">
                <div className="relative">
                    <Search className="absolute right-3 top-3 w-4 h-4 text-white/50" />
                    <input type="text" placeholder="بحث عن طالب..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/10 rounded-xl py-2.5 pr-9 pl-3 text-xs font-bold outline-none border border-white/10 focus:border-white/30 text-white placeholder-white/50" />
                </div>
                {availableGrades.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-full transition-all border ${selectedGrade === 'all' ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30 hover:bg-white/10'}`}>كل المراحل</button>
                        {availableGrades.map(g => (<button key={g} onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-full transition-all border ${selectedGrade === g ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30 hover:bg-white/10'}`}>صف {g}</button>))}
                    </div>
                )}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {visibleClasses.map(c => (<button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-xl transition-all ${selectedClass === c ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>{c}</button>))}
                    <button onClick={() => setShowAddClassModal(true)} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 active:scale-95 text-white shadow-sm flex items-center justify-center"><Plus className="w-4 h-4"/></button>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
             <div className="w-full h-[280px] shrink-0 md:h-0"></div>
             <div className="px-4 pb-24 pt-2 -mt-4 relative z-10">
                {filteredStudents.length > 0 ? (
                    // ✅ تم تمرير إعدادات الزي هنا
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {filteredStudents.map(student => (<StudentItem key={student.id} student={student} onClick={handleStudentClick} feedbackState={feedbackAnimation} girlUniform={girlUniformColor} />))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50"><LayoutGrid className="w-16 h-16 text-gray-400 mb-4" /><p className="text-sm font-bold text-gray-500">لا يوجد طلاب مطابقين</p></div>
                )}
            </div>
        </div>

        <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} className="max-w-xs rounded-[2.5rem]">
            {selectedStudent && (
                <div className="text-center pt-2">
                    <div className="flex flex-col items-center mb-6">
                        {/* ✅ تمرير الزي المختار للمودال */}
                        <div onClick={() => handleToggleGender(selectedStudent)} className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-lg overflow-hidden bg-slate-50 mb-3 cursor-pointer active:scale-95 transition-transform">{getStudentAvatar(selectedStudent, 'neutral', girlUniformColor)}</div>
                        <h2 className="text-xl font-black text-slate-900 mb-1">{selectedStudent.name}</h2>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{selectedStudent.classes[0]}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button onClick={() => handleAction('positive', selectedStudent)} className="flex flex-col items-center justify-center gap-2 bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl group"><div className="w-12 h-12 bg-white rounded-full flex items-center justify-center"><Icon3DPositive /></div><span className="font-black text-xs text-emerald-700">سلوك إيجابي</span></button>
                        <button onClick={() => handleAction('negative', selectedStudent)} className="flex flex-col items-center justify-center gap-2 bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl group"><div className="w-12 h-12 bg-white rounded-full flex items-center justify-center"><Icon3DNegative /></div><span className="font-black text-xs text-rose-700">سلوك سلبي</span></button>
                    </div>
                    <div className="flex gap-2 justify-center border-t border-slate-100 pt-4">
                        <button onClick={() => handleAction('edit', selectedStudent)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"><Icon3DEdit /> تعديل</button>
                        <button onClick={() => handleAction('truant', selectedStudent)} className="flex-1 py-2 bg-purple-50 text-purple-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"><Icon3DTruant /> تسرب</button>
                        <button onClick={() => handleAction('delete', selectedStudent)} className="flex-1 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"><Icon3DDelete /> حذف</button>
                    </div>
                </div>
            )}
        </Modal>

        <Modal isOpen={showManualAddModal} onClose={() => { setShowManualAddModal(false); setEditingStudent(null); }}>
            <div className="text-center">
                <h3 className="font-black text-xl mb-4">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                <div className="space-y-3">
                    <input className="w-full p-3 rounded-xl font-bold text-sm border" placeholder="اسم الطالب" value={editName} onChange={e => setEditName(e.target.value)} />
                    <input className="w-full p-3 rounded-xl font-bold text-sm border" placeholder="الصف" value={editClass} onChange={e => setEditClass(e.target.value)} />
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => setEditGender('male')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${editGender === 'male' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>ذكر</button>
                        <button onClick={() => setEditGender('female')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${editGender === 'female' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>أنثى</button>
                    </div>
                    <button onClick={handleSaveStudent} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black">حفظ</button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={isRandomPicking || !!randomStudent} onClose={() => { setRandomStudent(null); setIsRandomPicking(false); }} className="max-w-xs rounded-[2.5rem]">
            <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-indigo-100 shadow-xl overflow-hidden bg-white">
                    {/* ✅ تمرير الزي المختار للقرعة */}
                    {randomStudent ? getStudentAvatar(randomStudent, 'neutral', girlUniformColor) : <Sparkles className="w-10 h-10 text-indigo-400 animate-spin" />}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                    {randomStudent ? randomStudent.name : 'جاري الاختيار...'}
                </h3>
                {randomStudent && (
                    <div className="mb-6">
                        <p className="text-xs font-bold text-gray-500">{randomStudent.classes[0]}</p>
                        <p className="text-[10px] text-emerald-600 font-black mt-1">باقي {filteredStudents.length - participatedIds.length} طلاب</p>
                    </div>
                )}
                {randomStudent && (
                    <div className="flex flex-col gap-2">
                        <button onClick={() => { setRandomStudent(null); pickRandomStudent(); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg w-full">طالب آخر</button>
                        <button onClick={() => setParticipatedIds([])} className="text-[10px] font-bold text-slate-400 hover:text-rose-500">تصفير القرعة</button>
                    </div>
                )}
            </div>
        </Modal>

        {/* ✅ نافذة الإعدادات العامة (تم تحديثها بالصوت والزي) */}
        <Modal isOpen={showManageClasses} onClose={() => setShowManageClasses(false)}>
            <div className="text-center p-4">
                <h3 className="font-black text-xl mb-6">الإعدادات العامة</h3>
                
                {/* 1. إعدادات الصوت */}
                <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100 flex items-center justify-between">
                    <div className="text-right">
                        <h4 className="text-sm font-black text-slate-800">أصوات التفاعل</h4>
                        <p className="text-[10px] text-slate-400">تشغيل صوت عند منح النقاط</p>
                    </div>
                    <button onClick={toggleSound} className={`p-3 rounded-xl transition-all ${isSoundEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                        {isSoundEnabled ? <Volume2 className="w-5 h-5"/> : <VolumeX className="w-5 h-5"/>}
                    </button>
                </div>

                {/* 2. إعدادات المظهر (توحيد الأيقونات) */}
                <div className="bg-indigo-50 p-4 rounded-2xl mb-6 border border-indigo-100">
                    <h4 className="text-xs font-black text-indigo-700 mb-3 text-right">المظهر العام للطلاب</h4>
                    
                    {/* اختيار الجنس */}
                    <div className="flex gap-3 mb-3">
                        <button onClick={() => handleBulkGenderUpdate('male')} className="flex-1 bg-white py-3 rounded-xl shadow-sm font-bold text-xs text-slate-700 border border-indigo-50">👦 تحويل الكل لبنين</button>
                        <button onClick={() => handleBulkGenderUpdate('female')} className="flex-1 bg-white py-3 rounded-xl shadow-sm font-bold text-xs text-slate-700 border border-indigo-50">👧 تحويل الكل لبنات</button>
                    </div>

                    {/* اختيار لون الزي للبنات */}
                    <div className="mt-4 pt-4 border-t border-indigo-100/50">
                        <h4 className="text-[10px] font-black text-indigo-400 mb-2 text-right flex items-center gap-1"><Palette className="w-3 h-3"/> لون زي البنات الموحد</h4>
                        <div className="flex gap-2">
                            <button onClick={() => changeGirlUniform('blue')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border-2 ${girlUniformColor === 'blue' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-transparent text-slate-500'}`}>
                                🔵 أزرق
                            </button>
                            <button onClick={() => changeGirlUniform('maroon')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border-2 ${girlUniformColor === 'maroon' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-transparent text-slate-500'}`}>
                                🔴 عنابي
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. إدارة البيانات */}
                <div className="text-right border-t border-slate-100 pt-4">
                    <p className="text-[10px] text-rose-400 font-bold mb-2">منطقة الخطر (الحذف)</p>
                    <div className="flex gap-2">
                        {availableGrades.map(g => (
                            <button key={g} onClick={() => executeDeleteGrade(g)} className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold border border-rose-100">حذف صف {g}</button>
                        ))}
                    </div>
                </div>

                <button onClick={() => setShowManageClasses(false)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-sm mt-6 shadow-lg">حفظ وإغلاق</button>
            </div>
        </Modal>

        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} className="max-w-md rounded-[2rem]">
            <ExcelImport existingClasses={classes} onImport={(s) => { onBatchAddStudents(s); setShowImportModal(false); }} onAddClass={onAddClass} />
        </Modal>

        <Modal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} className="max-w-xs rounded-[2rem]">
            <div className="text-center p-4">
                <h3 className="font-black text-lg mb-4">إضافة فصل</h3>
                <input className="w-full p-3 rounded-xl border mb-4 outline-none" placeholder="اسم الفصل" value={newClassInput} onChange={e => setNewClassInput(e.target.value)} />
                <button onClick={() => { if(newClassInput.trim()) { onAddClass(newClassInput.trim()); setNewClassInput(''); setShowAddClassModal(false); } }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black">إضافة</button>
            </div>
        </Modal>

        <Modal isOpen={!!showPositiveReasons} onClose={() => setShowPositiveReasons(null)}>
            <div className="text-center p-4">
                <h3 className="font-black text-lg mb-4 text-emerald-600">سلوك إيجابي</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {['مشاركة مميزة', 'واجب منزلي', 'نظافة', 'تعاون', 'إجابة نموذجية', 'هدوء'].map(r => (
                        <button key={r} onClick={() => { if(showPositiveReasons) handleAddBehavior(showPositiveReasons.student, 'positive', r, 1); }} className="p-3 bg-white text-xs font-bold border rounded-xl">{r}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input placeholder="سبب آخر..." value={customBehaviorReason} onChange={e => setCustomBehaviorReason(e.target.value)} className="flex-1 p-2 border rounded-lg text-xs" />
                    <button onClick={() => { if(showPositiveReasons) handleManualBehaviorSubmit('positive', showPositiveReasons.student); }} className="p-2 bg-emerald-600 text-white rounded-lg"><Plus className="w-4 h-4"/></button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={!!showNegativeReasons} onClose={() => setShowNegativeReasons(null)}>
            <div className="text-center p-4">
                <h3 className="font-black text-lg mb-4 text-rose-600">سلوك سلبي</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {['إزعاج', 'نسيان كتاب', 'نوم', 'تأخر', 'ألفاظ', 'شجار'].map(r => (
                        <button key={r} onClick={() => { if(showNegativeReasons) handleAddBehavior(showNegativeReasons.student, 'negative', r, -1); }} className="p-3 bg-white text-xs font-bold border rounded-xl">{r}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input placeholder="سبب آخر..." value={customBehaviorReason} onChange={e => setCustomBehaviorReason(e.target.value)} className="flex-1 p-2 border rounded-lg text-xs" />
                    <button onClick={() => { if(showNegativeReasons) handleManualBehaviorSubmit('negative', showNegativeReasons.student); }} className="p-2 bg-rose-600 text-white rounded-lg"><Plus className="w-4 h-4"/></button>
                </div>
            </div>
        </Modal>

    </div>
  );
};

export default StudentList;
