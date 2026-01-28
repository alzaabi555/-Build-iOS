import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorType } from '../types';
import { 
  Search, Edit2, Sparkles, Trash2, Plus, 
  UserPlus, Settings, Trophy, Frown, CloudRain, PartyPopper, 
  Menu, FileSpreadsheet, Smile, AlertCircle, User, Clock, Volume2, VolumeX, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';
import ExcelImport from './ExcelImport';
import { useApp } from '../context/AppContext';

// --- تعريفات الشخصيات الكرتونية العمانية (3D Style SVG) ---
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
      <path d="M54 75 Q100 25 146 75 L146 65 Q100 15 54 65 Z" fill="url(#kummahBase)" />
      <path d="M54 75 Q100 25 146 75" fill="none" stroke="#e2e8f0" strokeWidth="1" />
      <path d="M60 70 Q100 35 140 70" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2" opacity="0.6" />
      <path d="M65 60 Q100 28 135 60" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="52" cy="95" r="9" fill="#ebb082" />
      <circle cx="148" cy="95" r="9" fill="#ebb082" />
    </g>
    <g>
      <ellipse cx="82" cy="95" rx="6" ry="8" fill="#1e293b" />
      <circle cx="84" cy="93" r="2.5" fill="white" opacity="0.9" />
      <ellipse cx="118" cy="95" rx="6" ry="8" fill="#1e293b" />
      <circle cx="120" cy="93" r="2.5" fill="white" opacity="0.9" />
      <path d="M75 82 Q82 78 89 82" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M111 82 Q118 78 125 82" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M90 115 Q100 122 110 115" fill="none" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="75" cy="108" rx="6" ry="3" fill="#fda4af" opacity="0.4" filter="blur(2px)" />
      <ellipse cx="125" cy="108" rx="6" ry="3" fill="#fda4af" opacity="0.4" filter="blur(2px)" />
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
      <path d="M62 95 C62 60 138 60 138 95" fill="none" stroke="#f1f5f9" strokeWidth="1" opacity="0.5" />
    </g>
    <g>
      <ellipse cx="86" cy="95" rx="5.5" ry="7.5" fill="#1e293b" />
      <circle cx="88" cy="93" r="2.5" fill="white" opacity="0.9" />
      <ellipse cx="114" cy="95" rx="5.5" ry="7.5" fill="#1e293b" />
      <circle cx="116" cy="93" r="2.5" fill="white" opacity="0.9" />
      <path d="M80 92 L78 90 M120 92 L122 90" stroke="#1e293b" strokeWidth="1.5" />
      <path d="M94 112 Q100 116 106 112" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" />
      <circle cx="80" cy="105" r="5" fill="#fbcfe8" opacity="0.5" filter="blur(2px)" />
      <circle cx="120" cy="105" r="5" fill="#fbcfe8" opacity="0.5" filter="blur(2px)" />
    </g>
  </svg>
);

// دالة مساعدة لاختيار الصورة المناسبة
const getStudentAvatar = (student: Student) => {
    if (student.avatar) return <img src={student.avatar} className="w-full h-full object-cover" alt={student.name} />;
    return student.gender === 'female' ? <OmaniGirlAvatarSVG /> : <OmaniBoyAvatarSVG />;
};

interface StudentListProps {
  students: Student[];
  classes: string[];
  onAddClass: (name: string) => void;
  // ✅ دمج: إضافة خاصية gender
  onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string, gender?: 'male' | 'female') => void;
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
  onAction: (s: Student, type: 'positive' | 'negative' | 'edit' | 'delete') => void, 
  currentSemester: '1' | '2',
  // ✅ دمج: دالة تبديل الجنس
  onToggleGender: (s: Student) => void
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
                  {/* ✅ دمج: الصورة مع خاصية الضغط للتبديل */}
                  <div 
                      onClick={(e) => { e.stopPropagation(); onToggleGender(student); }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold overflow-hidden shrink-0 shadow-sm border border-black/5 cursor-pointer active:scale-90 transition-transform select-none ${student.gender === 'female' ? 'bg-pink-50 border-pink-100' : 'bg-blue-50 border-blue-100'}`}
                      title="اضغط لتبديل النوع (ذكر/أنثى)"
                  >
                      {getStudentAvatar(student)}
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
  const { teacherInfo, periodTimes } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showManageClasses, setShowManageClasses] = useState(false); 
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  const [newGradeInput, setNewGradeInput] = useState('');
  const [newSectionInput, setNewSectionInput] = useState('');

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editSection, setEditSection] = useState('');
  // ✅ دمج: حالة الجنس
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editAvatar, setEditAvatar] = useState('');

  const [showNegativeReasons, setShowNegativeReasons] = useState<{student: Student} | null>(null);
  const [showPositiveReasons, setShowPositiveReasons] = useState<{student: Student} | null>(null);
  const [customBehaviorReason, setCustomBehaviorReason] = useState('');
  const [customBehaviorPoints, setCustomBehaviorPoints] = useState<string>('1');
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1');
  
  const [enableAnimations, setEnableAnimations] = useState(() => {
      const saved = localStorage.getItem('rased_animations');
      return saved !== 'false';
  });

  const [currentAutoPeriod, setCurrentAutoPeriod] = useState<string | null>(null);

  const [feedbackAnimation, setFeedbackAnimation] = useState<{ type: BehaviorType, text: string } | null>(null);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);
  const [isRandomPicking, setIsRandomPicking] = useState(false);

  useEffect(() => {
      localStorage.setItem('rased_animations', enableAnimations.toString());
  }, [enableAnimations]);

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
              setCurrentAutoPeriod(null);
          }
      };
      calculatePeriod();
      const timer = setInterval(calculatePeriod, 60000);
      return () => clearInterval(timer);
  }, [periodTimes]);

  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      
      classes.forEach(c => {
          if (c.includes('/')) {
              grades.add(c.split('/')[0].trim());
          } else {
              const numMatch = c.match(/^(\d+)/);
              if (numMatch) grades.add(numMatch[1]);
              else if(c.trim().split(' ')[0].length > 1) grades.add(c.trim().split(' ')[0]);
          }
      });

      students.forEach(s => {
          if (s.grade) grades.add(s.grade);
      });

      return Array.from(grades).sort((a, b) => {
          const numA = parseInt(a);
          const numB = parseInt(b);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b, 'ar');
      });
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
          if (s.grade === selectedGrade) {
              matchGrade = true;
          } else if (s.classes[0]) {
              const cls = s.classes[0];
              if (cls.includes('/')) matchGrade = cls.split('/')[0].trim() === selectedGrade;
              else matchGrade = cls.startsWith(selectedGrade);
          } else {
              matchGrade = false;
          }
      }
      return matchName && matchClass && matchGrade;
  }), [students, searchTerm, selectedClass, selectedGrade]);

  useEffect(() => { if (feedbackAnimation) { const timer = setTimeout(() => setFeedbackAnimation(null), 1800); return () => clearTimeout(timer); } }, [feedbackAnimation]);

  const playBehaviorSound = (type: BehaviorType) => { 
      if (!enableAnimations) return;
      try { const audio = new Audio(type === 'positive' ? SOUNDS.positive : SOUNDS.negative); audio.volume = 0.6; audio.play().catch(e => console.warn('Audio play blocked', e)); } catch (e) { console.error('Failed to play sound', e); } 
  };

  const handleAction = (student: Student, type: 'positive' | 'negative' | 'edit' | 'delete') => {
      if (type === 'positive') setShowPositiveReasons({ student });
      else if (type === 'negative') setShowNegativeReasons({ student });
      else if (type === 'edit') {
          setEditingStudent(student); 
          setEditName(student.name);
          
          const currentClass = student.classes[0] || '';
          if (currentClass.includes('/')) {
              const parts = currentClass.split('/');
              setEditGrade(parts[0]);
              setEditSection(parts[1]);
          } else {
              const numMatch = currentClass.match(/^(\d+)/);
              if (numMatch) {
                  setEditGrade(numMatch[1]);
                  setEditSection(currentClass.replace(numMatch[1], '').replace(/[\/\-\(\)]/g, '').trim());
              } else {
                  const parts = currentClass.split(' ');
                  setEditGrade(parts[0]);
                  setEditSection(parts.slice(1).join(' ').replace(/[\(\)]/g, ''));
              }
          }
          
          setEditPhone(student.parentPhone || ''); 
          setEditAvatar(student.avatar || ''); 
          // ✅ دمج: تحميل الجنس الحالي
          setEditGender(student.gender || 'male');
          setShowManualAddModal(true);
      }
      else if (type === 'delete') {
          if(confirm(`حذف الطالب ${student.name}؟`)) onDeleteStudent(student.id);
      }
  };

  // ✅ دمج: دالة تبديل الجنس السريع
  const handleToggleGender = (student: Student) => {
      const newGender = student.gender === 'female' ? 'male' : 'female';
      onUpdateStudent({ ...student, gender: newGender });
  };

  const handleSaveStudent = () => {
      if (editName.trim() && editGrade.trim() && editSection.trim()) {
          const combinedClassName = `${editGrade.trim()}/${editSection.trim()}`;
          
          if (editingStudent) {
              onUpdateStudent({ 
                  ...editingStudent, 
                  name: editName, 
                  classes: [combinedClassName], 
                  parentPhone: editPhone, 
                  avatar: editAvatar, 
                  grade: editGrade.trim(),
                  // ✅ دمج: حفظ الجنس
                  gender: editGender
              });
          } else {
              // ✅ دمج: حفظ الجنس
              onAddStudentManually(editName, combinedClassName, editPhone, editAvatar, editGender);
          }
          setShowManualAddModal(false); setEditingStudent(null); 
          setEditName(''); setEditPhone(''); setEditGrade(''); setEditSection(''); setEditAvatar('');
          setEditGender('male'); // Reset
      } else {
          alert('يرجى تعبئة اسم الطالب، المرحلة، والشعبة');
      }
  };

  const handleAddNewClass = () => {
      if (newGradeInput.trim() && newSectionInput.trim()) {
          const formattedName = `${newGradeInput.trim()}/${newSectionInput.trim()}`;
          onAddClass(formattedName);
          setNewGradeInput('');
          setNewSectionInput('');
          setShowAddClassModal(false);
      } else {
          alert('يرجى إدخال اسم المرحلة والشعبة');
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
      if (enableAnimations) {
          playBehaviorSound(type);
          setFeedbackAnimation({ type, text: type === 'positive' ? 'أحسنت!' : 'انتبه!' });
      }
      
      const newBehavior = { 
          id: Math.random().toString(36).substr(2, 9), 
          date: new Date().toISOString(), 
          type, 
          description: reason, 
          points: Math.abs(points), 
          semester: currentSemester,
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
      const relatedClasses = classes.filter(c => c.startsWith(grade) || (c.includes('/') && c.split('/')[0].trim() === grade));
      if (confirm(`هل أنت متأكد من حذف المرحلة "${grade}" بالكامل؟\nسيتم حذف الفصول التالية: ${relatedClasses.join(', ')}`)) { 
          relatedClasses.forEach(c => onDeleteClass(c)); 
          if (selectedGrade === grade) { setSelectedGrade('all'); setSelectedClass('all'); } 
      }
  };

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
            {feedbackAnimation && enableAnimations && (
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

        {/* ================= HEADER (Hybrid Fix: Fixed on Mobile, Sticky on Desktop) ================= */}
        {/* ✅ هذا هو الهيدر "الهجين" الذي يحافظ على شكل الموبايل ويحل مشكلة الويندوز */}
        <div className="fixed md:sticky top-0 z-40 md:z-30 bg-[#1e3a8a] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300 rounded-b-[2.5rem] md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
            <div className="flex justify-between items-center mb-6 mt-2">
                <h1 className="text-2xl font-black tracking-tight">قائمة الطلاب</h1>
                {/* ... (Menu & Search - Same as before) ... */}
                <div className="relative">
                    <button onClick={() => setShowMenuDropdown(!showMenuDropdown)} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all shadow-sm border border-white/10"><Menu className="w-6 h-6" /></button>
                    {showMenuDropdown && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenuDropdown(false)}></div>
                            <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden origin-top-left z-50 animate-in zoom-in-95 duration-200 text-right text-slate-800">
                                <div className="flex flex-col py-1">
                                    <button onClick={() => { setShowManualAddModal(true); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full"><UserPlus className="w-4 h-4 text-[#1e3a8a]" /><span className="text-xs font-bold">إضافة طالب</span></button>
                                    <button onClick={() => { setShowImportModal(true); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 w-full"><FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" /><span className="text-xs font-bold">استيراد من Excel</span></button>
                                    <button onClick={() => { pickRandomStudent(); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 w-full"><Sparkles className="w-4 h-4 text-[#1e3a8a]" /><span className="text-xs font-bold">القرعة العشوائية</span></button>
                                    <button onClick={() => { setShowManageClasses(true); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 w-full"><Settings className="w-4 h-4 text-[#1e3a8a]" /><span className="text-xs font-bold">إعدادات عامة</span></button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

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

        {/* List Content */}
        <div className="h-full overflow-y-auto custom-scrollbar">
            {/* ✅ الفراغ الوهمي: يظهر فقط في الهاتف (block) ويختفي في الويندوز (md:hidden) */}
            <div className="w-full h-[280px] shrink-0 block md:hidden"></div>
            
            <div className="px-4 pb-24 pt-2 md:pt-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a]"></span>الطلاب ({filteredStudents.length})</h3>
                </div>
                {filteredStudents.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {filteredStudents.map(student => (
                            <StudentItem 
                                key={student.id} 
                                student={student} 
                                onAction={handleAction} 
                                currentSemester={currentSemester}
                                // ✅ تمرير دالة الجنس
                                onToggleGender={handleToggleGender}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50"><User className="w-16 h-16 text-gray-400 mb-4" /><p className="text-sm font-bold text-gray-500">لا يوجد طلاب مطابقين</p></div>
                )}
            </div>
        </div>

        {/* MODALS */}

        {/* ✅ دمج: مودال إضافة طالب (محدث مع خيار الجنس) */}
        <Modal isOpen={showManualAddModal} onClose={() => { setShowManualAddModal(false); setEditingStudent(null); setEditName(''); setEditPhone(''); setEditGrade(''); setEditSection(''); setEditGender('male'); }}>
            <div className="text-center">
                <h3 className="font-black text-xl mb-4 text-slate-800">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                <div className="space-y-3">
                    <input className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="اسم الطالب" value={editName} onChange={e => setEditName(e.target.value)} />
                    
                    <div className="flex gap-2">
                        <input className="w-1/2 p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="المرحلة (مثال: 5)" value={editGrade} onChange={e => setEditGrade(e.target.value)} />
                        <input className="w-1/2 p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="الشعبة (مثال: 1)" value={editSection} onChange={e => setEditSection(e.target.value)} />
                    </div>

                    <input className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:border-indigo-500 text-slate-800" placeholder="رقم ولي الأمر (اختياري)" value={editPhone} onChange={e => setEditPhone(e.target.value)} type="tel" />
                    
                    {/* ✅ دمج: أزرار اختيار الجنس */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button onClick={() => setEditGender('male')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${editGender === 'male' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>ذكر 👨‍🎓</button>
                        <button onClick={() => setEditGender('female')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${editGender === 'female' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>أنثى 👩‍🎓</button>
                    </div>

                    <button onClick={handleSaveStudent} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-lg mt-2">حفظ</button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={!!showPositiveReasons} onClose={() => setShowPositiveReasons(null)} className="max-w-xs rounded-[2rem] z-[50]">
            <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-emerald-600 flex items-center justify-center gap-2">
                    <Smile className="w-6 h-6" /> سلوك إيجابي
                </h3>
                <CurrentPeriodInfo />
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {['مشاركة فعالة ', 'واجب منزلي', 'نظافة', 'تعاون', 'إجابة نموذجية', 'هدوء'].map(r => (
                        <button key={r} onClick={() => { if(showPositiveReasons) handleAddBehavior(showPositiveReasons.student, 'positive', r, 1); }} className="p-3 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors rounded-xl border border-emerald-100 active:scale-95">{r}</button>
                    ))}
                </div>
                <div className="flex gap-2 bg-emerald-50/50 p-1.5 rounded-xl border border-emerald-100">
                    <input placeholder="سبب آخر..." value={customBehaviorReason} onChange={e => setCustomBehaviorReason(e.target.value)} className="flex-1 p-2 bg-white rounded-lg text-xs font-bold border border-emerald-100 focus:border-emerald-500 outline-none text-slate-800" />
                    <button onClick={() => { if(showPositiveReasons) handleManualBehaviorSubmit('positive', showPositiveReasons.student); }} className="p-2 bg-emerald-600 text-white rounded-lg active:scale-95 transition-transform shadow-lg shadow-emerald-200"><Plus className="w-4 h-4"/></button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={!!showNegativeReasons} onClose={() => setShowNegativeReasons(null)} className="max-w-xs rounded-[2rem] z-[50]">
            <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-rose-600 flex items-center justify-center gap-2"><AlertCircle className="w-6 h-6" /> سلوك سلبي</h3>
                <CurrentPeriodInfo />
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {['كثرة الكلام وعدم الانتباه','نسيان الدفتر','إزعاج', 'نسيان كتاب', 'نوم', 'تأخر', 'ألفاظ', 'شجار'].map(r => (
                        <button key={r} onClick={() => { if(showNegativeReasons) handleAddBehavior(showNegativeReasons.student, 'negative', r, -1); }} className="p-3 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors rounded-xl border border-rose-100 active:scale-95">{r}</button>
                    ))}
                </div>
                <div className="flex gap-2 bg-rose-50/50 p-1.5 rounded-xl border border-rose-100"><input placeholder="سبب آخر..." value={customBehaviorReason} onChange={e => setCustomBehaviorReason(e.target.value)} className="flex-1 p-2 bg-white rounded-lg text-xs font-bold border border-rose-100 focus:border-rose-500 outline-none text-slate-800" /><button onClick={() => { if(showNegativeReasons) handleManualBehaviorSubmit('negative', showNegativeReasons.student); }} className="p-2 bg-rose-600 text-white rounded-lg active:scale-95 transition-transform shadow-lg shadow-rose-200"><Plus className="w-4 h-4"/></button></div>
            </div>
        </Modal>

        <Modal isOpen={showManageClasses} onClose={() => setShowManageClasses(false)} className="max-w-md rounded-[2rem]">
            <div className="text-center text-slate-900">
                <h3 className="font-black text-xl mb-6 flex items-center justify-center gap-2"><Settings className="w-6 h-6 text-indigo-600"/> الإعدادات العامة</h3>
                <div className="mb-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                    <div className="text-right"><h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">{enableAnimations ? <Volume2 size={16} className="text-emerald-500"/> : <VolumeX size={16} className="text-slate-400"/>} المؤثرات الصوتية والبصرية</h4><p className="text-[10px] text-slate-500 mt-1">تشغيل الأصوات والرسوم المتحركة عند رصد السلوك</p></div>
                    <button onClick={() => setEnableAnimations(!enableAnimations)} className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 ${enableAnimations ? 'bg-emerald-500' : 'bg-slate-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enableAnimations ? 'translate-x-0' : '-translate-x-5'}`}></div></button>
                </div>
                <div className="space-y-6 text-right border-t border-slate-100 pt-6">
                    <div><h4 className="text-xs font-black text-indigo-600 mb-2 border-b border-gray-200 pb-1">إدارة المراحل (Grades)</h4>{availableGrades.length > 0 ? (<div className="grid grid-cols-2 gap-2">{availableGrades.map(g => (<div key={g} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200"><span className="text-sm font-bold">الصف {g}</span><button onClick={() => executeDeleteGrade(g)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></div>))}</div>) : <p className="text-[10px] text-gray-400">لا توجد مراحل مضافة.</p>}</div>
                    <div><h4 className="text-xs font-black text-indigo-600 mb-2 border-b border-gray-200 pb-1">إدارة الفصول (Classes)</h4>{classes.length > 0 ? (<div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">{classes.map(c => (<div key={c} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200"><span className="text-sm font-bold">{c}</span><button onClick={() => executeDeleteClass(c)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></div>))}</div>) : <p className="text-[10px] text-gray-400">لا توجد فصول مضافة.</p>}</div>
                </div>
                <button onClick={() => setShowManageClasses(false)} className="mt-6 w-full py-3 bg-gray-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-gray-200">حفظ وإغلاق</button>
            </div>
        </Modal>

        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} className="max-w-md rounded-[2rem]"><ExcelImport existingClasses={classes} onImport={(s) => { onBatchAddStudents(s); setShowImportModal(false); }} onAddClass={onAddClass} /></Modal>
        
        <Modal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} className="max-w-xs rounded-[2rem]">
            <div className="text-center">
                <h3 className="font-black text-lg mb-4 text-slate-800 flex items-center justify-center gap-2"><Layers size={20}/> إضافة فصل جديد</h3>
                <div className="space-y-3">
                    <input className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:border-indigo-500 text-slate-800 text-center" placeholder="المرحلة (مثال: 6)" value={newGradeInput} onChange={e => setNewGradeInput(e.target.value)} />
                    <input className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none border border-gray-200 focus:border-indigo-500 text-slate-800 text-center" placeholder="الشعبة (مثال: 1)" value={newSectionInput} onChange={e => setNewSectionInput(e.target.value)} />
                    <button onClick={handleAddNewClass} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">إضافة</button>
                </div>
            </div>
        </Modal>
        
        {/* ✅ دمج: مودال القرعة العشوائية مع دعم صورة الأفاتار الجديدة */}
        <Modal isOpen={isRandomPicking || !!randomStudent} onClose={() => { setRandomStudent(null); setIsRandomPicking(false); }} className="max-w-xs rounded-[2.5rem]">
            <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-indigo-100 shadow-xl overflow-hidden relative bg-white">
                    {randomStudent ? (
                        getStudentAvatar(randomStudent)
                    ) : (
                        <Sparkles className="w-10 h-10 text-indigo-400 animate-spin" />
                    )}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 min-h-[2rem]">{randomStudent ? randomStudent.name : 'جاري الاختيار...'}</h3>
                {randomStudent && <p className="text-sm font-bold text-gray-500 mb-6">{randomStudent.classes[0]}</p>}
                {randomStudent && (<button onClick={() => { setRandomStudent(null); pickRandomStudent(); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg w-full">اختيار آخر</button>)}
            </div>
        </Modal>

    </div>
  );
};

export default StudentList;
