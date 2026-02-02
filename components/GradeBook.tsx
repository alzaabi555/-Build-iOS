import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, GradeRecord, AssessmentTool } from '../types';
import { Plus, X, Trash2, Settings, Check, Loader2, Edit2, FileSpreadsheet, AlertTriangle, Calculator, LayoutGrid } from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import * as XLSX from 'xlsx';

// ============================================================================
// ✅ 1. الشخصيات العمانية (تم التوحيد مع باقي التطبيق)
// ============================================================================

// 👦 الولد العماني (فيكتور)
const OmaniBoyAvatarSVG = () => (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
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
        <circle cx="53" cy="65" r="2.5" fill="#1E293B" />
        <circle cx="67" cy="65" r="2.5" fill="#1E293B" />
        <path d="M56 72Q60 75 64 72" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
);

// 👧 البنت العمانية (تقبل لون الزي)
const OmaniGirlAvatarSVG = ({ uniformColor }: { uniformColor: 'blue' | 'maroon' }) => {
    const primaryColor = uniformColor === 'blue' ? '#2563EB' : '#9F1239';
    const secondaryColor = uniformColor === 'blue' ? '#1E40AF' : '#881337';

    return (
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
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
            <path d="M57 69Q60 71 63 69" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M53 60L51 58" stroke="#1E293B" strokeWidth="1" />
            <path d="M67 60L69 58" stroke="#1E293B" strokeWidth="1" />
        </svg>
    );
};

// دالة اختيار الأفاتار (محدثة لتقرأ لون الزي)
const getStudentAvatar = (student: Student, girlUniform: 'blue' | 'maroon' = 'blue') => {
    if (student.avatar) return <img src={student.avatar} className="w-full h-full object-cover rounded-full" alt={student.name} />;
    
    if (student.gender === 'female') {
        return <OmaniGirlAvatarSVG uniformColor={girlUniform} />;
    }
    return <OmaniBoyAvatarSVG />;
};

// ============================================================================
// بقية الأيقونات (لم يتم لمسها)
// ============================================================================
const Icon3DGradingConfig = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-6 h-6"}><defs><linearGradient id="gradCalc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#2563eb" /></linearGradient><filter id="shadowCalc" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="2" /><feOffset dx="1" dy="2" result="offsetblur" /><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect x="20" y="15" width="60" height="70" rx="10" fill="url(#gradCalc)" filter="url(#shadowCalc)" /><rect x="30" y="25" width="40" height="15" rx="4" fill="#dbeafe" /><circle cx="35" cy="55" r="5" fill="white" opacity="0.8" /><circle cx="50" cy="55" r="5" fill="white" opacity="0.8" /><circle cx="65" cy="55" r="5" fill="white" opacity="0.8" /><circle cx="35" cy="70" r="5" fill="white" opacity="0.8" /><circle cx="50" cy="70" r="5" fill="white" opacity="0.8" /><circle cx="65" cy="70" r="5" fill="#fbbf24" /></svg>);
const Icon3DMenu = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-6 h-6"}><defs><linearGradient id="gradMenu" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#f1f5f9" /></linearGradient><filter id="shadowMenu" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" /><feOffset dx="0" dy="2" result="offsetblur" /><feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect x="20" y="25" width="60" height="10" rx="5" fill="url(#gradMenu)" filter="url(#shadowMenu)" /><rect x="20" y="45" width="60" height="10" rx="5" fill="url(#gradMenu)" filter="url(#shadowMenu)" /><rect x="20" y="65" width="60" height="10" rx="5" fill="url(#gradMenu)" filter="url(#shadowMenu)" /></svg>);
const Icon3DImport = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-6 h-6"}><defs><linearGradient id="gradImportSheet" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></linearGradient><linearGradient id="gradArrowUp" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#2563eb" /></linearGradient></defs><rect x="25" y="30" width="50" height="55" rx="6" fill="url(#gradImportSheet)" /><path d="M35 45 H65 M35 55 H65 M35 65 H65" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.6" /><path d="M50 10 L30 30 H40 V50 H60 V30 H70 L50 10 Z" fill="url(#gradArrowUp)" stroke="white" strokeWidth="2" /></svg>);
const Icon3DExport = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-6 h-6"}><defs><linearGradient id="gradExportSheet" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></linearGradient><linearGradient id="gradArrowDown" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#2563eb" /></linearGradient></defs><rect x="25" y="15" width="50" height="55" rx="6" fill="url(#gradExportSheet)" /><path d="M35 30 H65 M35 40 H65 M35 50 H65" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.6" /><path d="M50 90 L70 70 H60 V50 H40 V70 H30 L50 90 Z" fill="url(#gradArrowDown)" stroke="white" strokeWidth="2" /></svg>);
const Icon3DTools = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-6 h-6"}><defs><linearGradient id="gradGear" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#94a3b8" /></linearGradient><filter id="shadowGear" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" /><feOffset dx="1" dy="1" result="offsetblur" /><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="50" cy="50" r="20" fill="white" stroke="url(#gradGear)" strokeWidth="15" strokeDasharray="10 6" filter="url(#shadowGear)" /><circle cx="50" cy="50" r="10" fill="#cbd5e1" /></svg>);
const Icon3DClear = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-6 h-6"}><defs><linearGradient id="gradTrash" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#dc2626" /></linearGradient><filter id="shadowTrash" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="2" /><feOffset dx="1" dy="2" result="offsetblur" /><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M25 30 L30 85 Q32 90 38 90 H62 Q68 90 70 85 L75 30" fill="url(#gradTrash)" filter="url(#shadowTrash)" /><rect x="20" y="20" width="60" height="10" rx="3" fill="#ef4444" /><path d="M40 20 L42 12 Q43 10 46 10 H54 Q57 10 58 12 L60 20" fill="#ef4444" /><path d="M40 45 L40 75 M50 45 L50 75 M60 45 L60 75" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.5" /></svg>);
const Icon3DBulk = ({ className }: { className?: string }) => (<svg viewBox="0 0 100 100" className={className || "w-6 h-6"}><defs><linearGradient id="gradWand" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#d97706" /></linearGradient><linearGradient id="gradHandle" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient><filter id="shadowWand" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" /><feOffset dx="1" dy="1" result="offsetblur" /><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M20 80 L40 60" stroke="url(#gradHandle)" strokeWidth="10" strokeLinecap="round" filter="url(#shadowWand)" /><path d="M40 60 L80 20" stroke="url(#gradWand)" strokeWidth="8" strokeLinecap="round" /><path d="M80 20 L90 10 M70 10 L80 20 M90 30 L80 20" stroke="white" strokeWidth="2" opacity="0.8" /><circle cx="80" cy="20" r="5" fill="white" filter="blur(2px)" /></svg>);

// -----------------------------------------------------------

interface GradeBookProps {
  students: Student[];
  classes: string[];
  onUpdateStudent: (s: Student) => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  currentSemester: '1' | '2';
  onSemesterChange: (sem: '1' | '2') => void;
  teacherInfo?: { name: string; school: string; subject: string; governorate: string };
}

const DEFAULT_GRADING_SETTINGS = {
  totalScore: 100,
  finalExamWeight: 40,
  finalExamName: 'الامتحان النهائي'
};

const GradeBook: React.FC<GradeBookProps> = ({ 
  students = [], 
  classes = [], 
  onUpdateStudent, 
  setStudents, 
  currentSemester, 
  onSemesterChange, 
  teacherInfo 
}) => {
  const { assessmentTools, setAssessmentTools } = useApp();
  const tools = useMemo(() => Array.isArray(assessmentTools) ? assessmentTools : [], [assessmentTools]);
  
  const [gradingSettings, setGradingSettings] = useState(() => {
      const saved = localStorage.getItem('rased_grading_settings');
      return saved ? JSON.parse(saved) : DEFAULT_GRADING_SETTINGS;
  });

  const [showGradingSettingsModal, setShowGradingSettingsModal] = useState(false);

  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [showAddGrade, setShowAddGrade] = useState<{ student: Student } | null>(null);
  const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showToolsManager, setShowToolsManager] = useState(false);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editToolName, setEditToolName] = useState('');
  const [bulkFillTool, setBulkFillTool] = useState<AssessmentTool | null>(null);
  const [bulkScore, setBulkScore] = useState('');
  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [score, setScore] = useState('');
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  // ✅ قراءة لون الزي الموحد لضمان التناسق
  const girlUniformColor = (localStorage.getItem('rased_girl_uniform') as 'blue' | 'maroon') || 'blue';

  useEffect(() => {
      localStorage.setItem('rased_grading_settings', JSON.stringify(gradingSettings));
  }, [gradingSettings]);

  useEffect(() => {
     if (showAddGrade && !editingGrade) { setSelectedToolId(''); setScore(''); }
  }, [showAddGrade, editingGrade]);

  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      classes.forEach(c => {
          if (c.includes('/')) {
              grades.add(c.split('/')[0].trim());
          } else {
              const numMatch = c.match(/^(\d+)/);
              if (numMatch) grades.add(numMatch[1]);
              else grades.add(c.split(' ')[0]);
          }
      });
      students.forEach(s => { if (s.grade) grades.add(s.grade); });
      return Array.from(grades).sort((a, b) => {
          const numA = parseInt(a);
          const numB = parseInt(b);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
      });
  }, [students, classes]);

  const visibleClasses = useMemo(() => {
      if (selectedGrade === 'all') return classes;
      return classes.filter(c => {
          if (c.includes('/')) return c.split('/')[0].trim() === selectedGrade;
          return c.startsWith(selectedGrade);
      });
  }, [classes, selectedGrade]);

  const cleanText = (text: string) => { if (!text) return ''; return String(text).trim(); };
  const normalizeText = (text: string) => { if (!text) return ''; return String(text).trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ـ]/g, ''); };
  const extractNumericScore = (val: any): number | null => { if (val === undefined || val === null || val === '') return null; const strVal = String(val).trim(); const cleanNum = strVal.replace(/[^0-9.]/g, ''); const num = Number(cleanNum); return isNaN(num) || cleanNum === '' ? null : num; };

  const getGradeSymbol = (score: number) => {
      const percentage = (score / gradingSettings.totalScore) * 100;
      if (percentage >= 90) return 'أ';
      if (percentage >= 80) return 'ب';
      if (percentage >= 65) return 'ج';
      if (percentage >= 50) return 'د';
      return 'هـ';
  };

  const getSymbolColor = (score: number) => {
      const percentage = (score / gradingSettings.totalScore) * 100;
      if (percentage >= 90) return 'text-emerald-600 bg-emerald-50'; 
      if (percentage >= 80) return 'text-blue-600 bg-blue-50';
      if (percentage >= 65) return 'text-amber-600 bg-amber-50';
      if (percentage >= 50) return 'text-orange-600 bg-orange-50';
      return 'text-rose-600 bg-rose-50';
  };

  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(s => {
      if (!s || typeof s !== 'object') return false;
      const matchesClass = selectedClass === 'all' || (s.classes && s.classes.includes(selectedClass));
      let matchesGrade = true;
      if (selectedGrade !== 'all') {
          if (s.grade === selectedGrade) matchesGrade = true;
          else if (s.classes[0]) {
              if (s.classes[0].includes('/')) matchesGrade = s.classes[0].split('/')[0].trim() === selectedGrade;
              else matchesGrade = s.classes[0].startsWith(selectedGrade);
          } else matchesGrade = false;
      }
      return matchesClass && matchesGrade;
    });
  }, [students, selectedClass, selectedGrade]);

  const getSemesterGrades = (student: Student, sem: '1' | '2') => { 
      if (!student || !Array.isArray(student.grades)) return []; 
      return student.grades.filter(g => { if (!g.semester) return sem === '1'; return g.semester === sem; }); 
  };

  const handleAddTool = () => { if (newToolName.trim()) { const finalName = cleanText(newToolName); if (tools.some(t => t.name === finalName)) { alert('هذه الأداة موجودة بالفعل'); return; } const newTool: AssessmentTool = { id: Math.random().toString(36).substr(2, 9), name: finalName, maxScore: 0 }; setAssessmentTools([...tools, newTool]); setNewToolName(''); setIsAddingTool(false); } };
  const handleDeleteTool = (id: string) => { if (confirm('هل أنت متأكد من حذف هذه الأداة؟')) { setAssessmentTools(tools.filter(t => t.id !== id)); } };
  const startEditingTool = (tool: AssessmentTool) => { setEditingToolId(tool.id); setEditToolName(tool.name); };
  const saveEditedTool = () => { if (editingToolId && editToolName.trim()) { const updatedTools = tools.map(t => t.id === editingToolId ? { ...t, name: cleanText(editToolName) } : t ); setAssessmentTools(updatedTools); setEditingToolId(null); setEditToolName(''); } };
  const cancelEditingTool = () => { setEditingToolId(null); setEditToolName(''); };

  const handleDeleteGrade = (gradeId: string) => { if(!showAddGrade) return; if(confirm('حذف الدرجة؟')) { const updatedGrades = showAddGrade.student.grades.filter(g => g.id !== gradeId); const updatedStudent = { ...showAddGrade.student, grades: updatedGrades }; onUpdateStudent(updatedStudent); setShowAddGrade({ student: updatedStudent }); } };
  const handleEditGrade = (grade: GradeRecord) => { setEditingGrade(grade); setScore(grade.score.toString()); const tool = tools.find(t => t.name.trim() === grade.category.trim()); setSelectedToolId(tool ? tool.id : ''); };
  const handleSaveGrade = () => { if (!showAddGrade || score === '') return; const student = showAddGrade.student; let categoryName = 'درجة عامة'; if (selectedToolId) { const tool = tools.find(t => t.id === selectedToolId); if (tool) categoryName = tool.name; } else if (editingGrade) { categoryName = editingGrade.category; } const newGrade: GradeRecord = { id: editingGrade ? editingGrade.id : Math.random().toString(36).substr(2, 9), subject: teacherInfo?.subject || 'المادة', category: categoryName.trim(), score: Number(score), maxScore: 0, date: new Date().toISOString(), semester: currentSemester }; let updatedGrades; if (editingGrade) { updatedGrades = (student.grades || []).map(g => g.id === editingGrade.id ? newGrade : g); } else { const filtered = (student.grades || []).filter(g => !(g.category.trim() === categoryName.trim() && (g.semester || '1') === currentSemester)); updatedGrades = [newGrade, ...filtered]; } const updatedStudent = { ...student, grades: updatedGrades }; onUpdateStudent(updatedStudent); setShowAddGrade({ student: updatedStudent }); setScore(''); setEditingGrade(null); };
  const handleBulkFill = () => { if (!bulkFillTool) return; const scoreValue = bulkScore.trim(); if (scoreValue === '') return; const numericScore = parseFloat(scoreValue); if (isNaN(numericScore)) { alert('الرجاء إدخال رقم صحيح'); return; } const toolName = bulkFillTool.name.trim(); const safeSemester = currentSemester || '1'; const visibleIds = new Set(filteredStudents.map(s => s.id)); if (visibleIds.size === 0) { alert('لا يوجد طلاب'); return; } setStudents(currentStudents => { return currentStudents.map(student => { if (!visibleIds.has(student.id)) return student; const existingGrades = Array.isArray(student.grades) ? student.grades : []; const keptGrades = existingGrades.filter(g => { const gSem = g.semester || '1'; const gName = (g.category || '').trim(); if (gSem === safeSemester && gName === toolName) return false; return true; }); const newGrade: GradeRecord = { id: Date.now().toString(36) + Math.random().toString(36).substr(2), subject: teacherInfo?.subject || 'المادة', category: toolName, score: numericScore, maxScore: bulkFillTool.maxScore || 0, date: new Date().toISOString(), semester: safeSemester }; return { ...student, grades: [newGrade, ...keptGrades] }; }); }); setBulkFillTool(null); setBulkScore(''); alert('تم الرصد الجماعي بنجاح! ✅'); };
  const handleClearGrades = () => { const targetClassText = selectedClass === 'all' ? 'جميع الطلاب' : `طلاب فصل ${selectedClass}`; if (confirm(`هل أنت متأكد من حذف جميع الدرجات المسجلة لـ ${targetClassText} في الفصل الدراسي ${currentSemester}؟\n⚠️ لا يمكن التراجع عن هذا الإجراء.`)) { setStudents(prev => prev.map(s => { const sClasses = s.classes || []; const matches = selectedClass === 'all' || sClasses.includes(selectedClass); if (matches) { const keptGrades = (s.grades || []).filter(g => { const gSem = g.semester || '1'; return gSem !== currentSemester; }); return { ...s, grades: keptGrades }; } return s; })); alert('تم حذف درجات الفصل المحدد بنجاح'); } };
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setIsImporting(true); try { const data = await file.arrayBuffer(); const workbook = XLSX.read(data, { type: 'array' }); const firstSheet = workbook.Sheets[workbook.SheetNames[0]]; const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as any[]; if (jsonData.length === 0) throw new Error('الملف فارغ'); const headers = Object.keys(jsonData[0]); const nameKeywords = ['الاسم', 'اسم الطالب', 'name', 'student', 'full name', 'المتعلم', 'student name']; const nameKey = headers.find(h => nameKeywords.some(kw => normalizeText(h).includes(normalizeText(kw)))) || headers[0]; const excludedExact = ['م', '#', 'id', 'no', 'number', 'رقم']; const excludedPartial = ['مجموع', 'total', 'تقدير', 'rank', 'average', 'معدل', 'نتيجة', 'result']; const potentialTools = headers.filter(h => { const lowerH = normalizeText(h); if (h === nameKey) return false; if (excludedExact.includes(lowerH)) return false; if (excludedPartial.some(ex => lowerH.includes(ex))) return false; return true; }); let updatedTools = [...tools]; potentialTools.forEach(h => { const cleanH = cleanText(h); if (cleanH && !updatedTools.some(t => t.name === cleanH)) { updatedTools.push({ id: Math.random().toString(36).substr(2, 9), name: cleanH, maxScore: 0 }); } }); setAssessmentTools(updatedTools); let updatedCount = 0; setStudents(prev => prev.map(s => { const row = jsonData.find((r: any) => { const rName = String(r[nameKey] || '').trim(); return normalizeText(rName) === normalizeText(s.name); }); if (!row) return s; updatedCount++; let newGrades = [...(s.grades || [])]; potentialTools.forEach(headerStr => { const val = extractNumericScore(row[headerStr]); if (val !== null) { const toolName = cleanText(headerStr); newGrades = newGrades.filter(g => !(g.category.trim() === toolName && (g.semester || '1') === (currentSemester || '1'))); newGrades.unshift({ id: Math.random().toString(36).substr(2, 9), subject: teacherInfo?.subject || 'عام', category: toolName, score: val, maxScore: 0, date: new Date().toISOString(), semester: currentSemester }); } }); return { ...s, grades: newGrades }; })); alert(`تم استيراد الدرجات بنجاح لـ ${updatedCount} طالب.\nتم إضافة ${potentialTools.length} أدوات تقويم جديدة.`); } catch (error: any) { console.error(error); alert('خطأ في قراءة الملف: ' + error.message); } finally { setIsImporting(false); if (e.target) e.target.value = ''; } };

  // --- Dynamic Excel Export Logic ---
  const handleExportExcel = async () => {
      if (filteredStudents.length === 0) { alert('لا يوجد طلاب'); return; }
      setIsExporting(true);
      try {
          const finalExamName = gradingSettings.finalExamName.trim();
          const finalWeight = gradingSettings.finalExamWeight;
          const continuousWeight = gradingSettings.totalScore - finalWeight;

          const continuousTools = tools.filter(t => t.name.trim() !== finalExamName);
          const finalTool = tools.find(t => t.name.trim() === finalExamName);

          const data = filteredStudents.map(student => {
              const row: any = { 'الاسم': student.name, 'الصف': student.classes[0] || '' };
              const semGrades = getSemesterGrades(student, currentSemester);
              
              let continuousSum = 0;
              continuousTools.forEach(tool => {
                  const grade = semGrades.find(g => g.category.trim() === tool.name.trim());
                  const val = grade ? Number(grade.score) : 0;
                  row[tool.name] = grade ? grade.score : '';
                  continuousSum += val;
              });

              row[`المجموع (${continuousWeight})`] = continuousSum;

              let finalScore = 0;
              if (finalWeight > 0) {
                  const grade = semGrades.find(g => g.category.trim() === finalExamName);
                  finalScore = grade ? Number(grade.score) : 0;
                  row[`${finalExamName} (${finalWeight})`] = grade ? grade.score : '';
              }

              const total = continuousSum + finalScore;
              row['المجموع الكلي'] = total;
              row['التقدير'] = getGradeSymbol(total);
              return row;
          });

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(data);
          if(!ws['!views']) ws['!views'] = [];
          ws['!views'].push({ rightToLeft: true });
          XLSX.utils.book_append_sheet(wb, ws, `درجات_${currentSemester}`);
          const fileName = `GradeBook_${new Date().getTime()}.xlsx`;
          if (Capacitor.isNativePlatform()) {
              const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
              const result = await Filesystem.writeFile({ path: fileName, data: wbout, directory: Directory.Cache });
              await Share.share({ title: 'سجل الدرجات', url: result.uri });
          } else { XLSX.writeFile(wb, fileName); }
      } catch (error) { console.error(error); alert('خطأ في التصدير'); } finally { setIsExporting(false); }
  };

  return (
    <div className="flex flex-col h-full text-slate-800 bg-[#f8fafc] relative animate-in fade-in duration-500 font-sans">
        
        {/* ================= Fixed Header ================= */}
        <div className="fixed md:sticky top-0 z-40 md:z-30 bg-[#1e3a8a] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300 rounded-b-[2.5rem] md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
            
            <div className="flex justify-between items-center mb-6 mt-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight">سجل الدرجات</h1>
                    <button onClick={() => setShowGradingSettingsModal(true)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors" title="إعدادات توزيع الدرجات">
                        <Icon3DGradingConfig className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="relative">
                    <button onClick={() => setShowMenuDropdown(!showMenuDropdown)} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all shadow-sm border border-white/10">
                        <Icon3DMenu className="w-6 h-6" />
                    </button>
                    {showMenuDropdown && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenuDropdown(false)}></div>
                            <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden origin-top-left z-50 animate-in zoom-in-95 duration-200">
                                <div className="flex flex-col py-1">
                                    <button onClick={() => { fileInputRef.current?.click(); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-right w-full group text-slate-800">
                                        {isImporting ? <Loader2 className="w-5 h-5 animate-spin text-[#1e3a8a]" /> : <Icon3DImport className="w-5 h-5" />}
                                        <span className="text-xs font-bold">استيراد درجات (Excel)</span>
                                    </button>
                                    <button onClick={() => { handleExportExcel(); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 text-right w-full group text-slate-800">
                                        {isExporting ? <Loader2 className="w-5 h-5 animate-spin text-[#1e3a8a]" /> : <Icon3DExport className="w-5 h-5" />}
                                        <span className="text-xs font-bold">تصدير إلى Excel</span>
                                    </button>
                                    <button onClick={() => { setShowToolsManager(true); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 text-right w-full group text-slate-800">
                                        <Icon3DTools className="w-5 h-5" />
                                        <span className="text-xs font-bold">إعدادات أدوات التقويم</span>
                                    </button>
                                    <button onClick={() => { handleClearGrades(); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50 transition-colors border-t border-slate-50 text-right w-full group text-rose-600">
                                        <Icon3DClear className="w-5 h-5" />
                                        <span className="text-xs font-bold">حذف درجات الفصل</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                </div>
            </div>

            {/* Filters */}
            <div className="space-y-2 mb-4 px-1">
                {availableGrades.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-full transition-all border ${selectedGrade === 'all' ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30 hover:bg-white/10'}`}>كل المراحل</button>
                        {availableGrades.map(g => (
                            <button key={g} onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-full transition-all border ${selectedGrade === g ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30 hover:bg-white/10'}`}>صف {g}</button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {visibleClasses.map(c => (
                        <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-xl transition-all ${selectedClass === c ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>{c}</button>
                    ))}
                </div>
            </div>

            {/* Tools Strip */}
            <div className="overflow-x-auto no-scrollbar flex gap-2 pt-1 pb-1">
                {tools.length > 0 ? tools.map(tool => (
                    <button key={tool.id} onClick={() => { setBulkFillTool(tool); setBulkScore(''); }} className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-[10px] font-bold text-white whitespace-nowrap hover:bg-white/20 border border-white/20 flex items-center gap-1.5 active:scale-95 transition-all">
                        <Icon3DBulk className="w-4 h-4" /> رصد {tool.name}
                    </button>
                )) : (
                    <span className="text-[10px] text-blue-200 font-bold px-2 py-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> قم بإضافة أدوات من القائمة</span>
                )}
            </div>
        </div>

        {/* ================= Content List (GRID VIEW) ================= */}
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
            <div className="w-full h-[280px] shrink-0"></div>
            <div className="px-4 pb-24 pt-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a]"></span>
                        سجل الطلاب ({filteredStudents.length})
                    </h3>
                </div>
                {filteredStudents.length > 0 ? (
                    // ✅ Grid System (Responsive: 2 mobile, 3 tablet, 4 desktop)
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredStudents.map((student) => {
                            const semGrades = getSemesterGrades(student, currentSemester);
                            const totalScore = semGrades.reduce((sum, g) => sum + (Number(g.score) || 0), 0);
                            return (
                                <div key={student.id} onClick={() => setShowAddGrade({ student })} className="bg-white rounded-3xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex flex-col items-center relative overflow-hidden group h-full justify-between">
                                    
                                    {/* Avatar (Updated to accept Uniform Color) */}
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 mt-2 mb-2 rounded-full border-4 border-indigo-50 shadow-inner overflow-hidden bg-slate-50 transform group-hover:scale-105 transition-transform flex-shrink-0">
                                        {getStudentAvatar(student, girlUniformColor)}
                                    </div>
                                    
                                    {/* Name */}
                                    <h3 className="font-black text-slate-900 text-[10px] sm:text-xs text-center w-full mb-3 leading-snug line-clamp-3 min-h-[2.5em] flex items-center justify-center break-words px-1">
                                        {student.name}
                                    </h3>

                                    {/* Grades Preview (Top 3 tools) */}
                                    <div className="flex gap-1 mb-3 w-full justify-center">
                                        {tools.slice(0, 3).map(tool => {
                                            const grade = semGrades.find(g => g.category.trim() === tool.name.trim());
                                            return (
                                                <div key={tool.id} className="flex flex-col items-center">
                                                    <span className="text-[8px] text-slate-400 font-bold mb-0.5 max-w-[40px] truncate">{tool.name}</span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${grade ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                                                        {grade ? grade.score : '-'}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Total Score Badge (Bottom) */}
                                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 flex items-center justify-center gap-2 mt-auto">
                                        <span className={`text-lg font-black ${getSymbolColor(totalScore).split(' ')[0]}`}>{totalScore}</span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">{getGradeSymbol(totalScore)}</span>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50"><FileSpreadsheet className="w-16 h-16 mb-4" /><p className="font-bold">لا يوجد طلاب مطابقين</p></div>
                )}
            </div>
        </div>

        {/* --- Grading Settings Modal --- */}
        <Modal isOpen={showGradingSettingsModal} onClose={() => setShowGradingSettingsModal(false)} className="max-w-md rounded-[2rem]">
            <div className="text-center p-2">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm"><Calculator className="w-8 h-8" /></div>
                <h3 className="font-black text-lg mb-2 text-slate-900">إعدادات توزيع الدرجات</h3>
                <p className="text-xs text-gray-500 mb-6 font-bold leading-relaxed">قم بضبط الأوزان النسبية للدرجات حسب المرحلة الدراسية التي تدرسها.</p>
                
                <div className="space-y-4 text-right">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-xs font-black text-slate-700 mb-2">1. الدرجة الكلية للمادة</label>
                        <input type="number" value={gradingSettings.totalScore} onChange={(e) => setGradingSettings({...gradingSettings, totalScore: Number(e.target.value)})} className="w-full p-3 bg-white rounded-xl border border-slate-200 text-center font-black text-slate-900 outline-none focus:border-blue-500" />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-xs font-black text-slate-700 mb-2">2. درجة الامتحان النهائي (أو المشروع)</label>
                        <input type="number" value={gradingSettings.finalExamWeight} onChange={(e) => setGradingSettings({...gradingSettings, finalExamWeight: Number(e.target.value)})} className="w-full p-3 bg-white rounded-xl border border-slate-200 text-center font-black text-slate-900 outline-none focus:border-blue-500" />
                        <p className="text-[10px] text-gray-400 mt-2 font-bold">* ضع 0 إذا كانت المادة تقويم مستمر 100%</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-xs font-black text-slate-700 mb-2">3. مسمى الامتحان النهائي</label>
                        <input type="text" value={gradingSettings.finalExamName} onChange={(e) => setGradingSettings({...gradingSettings, finalExamName: e.target.value})} className="w-full p-3 bg-white rounded-xl border border-slate-200 text-center font-bold text-slate-900 outline-none focus:border-blue-500" placeholder="مثال: الامتحان النهائي / المشروع" />
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-4 bg-blue-50 p-3 rounded-xl">
                        <span>التقويم المستمر: {gradingSettings.totalScore - gradingSettings.finalExamWeight}</span>
                        <span>+</span>
                        <span>النهائي: {gradingSettings.finalExamWeight}</span>
                        <span>=</span>
                        <span>{gradingSettings.totalScore}</span>
                    </div>
                    <button onClick={() => setShowGradingSettingsModal(false)} className="w-full py-3.5 bg-[#1e3a8a] text-white rounded-xl font-black text-sm shadow-lg hover:bg-blue-900 active:scale-95 transition-all">حفظ واعتماد التوزيع</button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={!!showAddGrade} onClose={() => { setShowAddGrade(null); setEditingGrade(null); setScore(''); }} className="max-w-sm rounded-[2rem]">
            {showAddGrade && (
                <div className="text-center text-slate-900">
                    <h3 className="font-black text-lg mb-1">{showAddGrade.student.name}</h3>
                    <p className="text-xs text-gray-500 font-bold mb-6">رصد درجة جديدة - فصل {currentSemester}</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {tools.map(tool => (
                            <button key={tool.id} onClick={() => setSelectedToolId(tool.id)} className={`p-3 rounded-xl text-xs font-black transition-all border ${selectedToolId === tool.id ? 'bg-indigo-600 text-white border-transparent shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-gray-50 shadow-sm'}`}>{tool.name}</button>
                        ))}
                    </div>
                    <div className="flex gap-2 mb-4">
                        <input type="number" autoFocus placeholder="الدرجة" className="flex-1 glass-input rounded-xl p-3 text-center text-lg font-black outline-none border border-slate-200 focus:border-indigo-500 text-slate-900 shadow-inner bg-gray-50" value={score} onChange={(e) => setScore(e.target.value)} />
                        <button onClick={handleSaveGrade} className="flex-1 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">حفظ</button>
                    </div>
                    <div className="border-t border-gray-200 pt-4 mt-2">
                        <p className="text-[10px] font-bold text-right mb-2 text-gray-400">الدرجات المرصودة:</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                            {getSemesterGrades(showAddGrade.student, currentSemester).length > 0 ? getSemesterGrades(showAddGrade.student, currentSemester).map(g => (
                                <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 shadow-sm transition-colors">
                                    <span className="text-xs font-bold text-slate-700">{g.category}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-black text-sm px-2 py-0.5 rounded-lg ${getSymbolColor(g.score)}`}>{g.score}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEditGrade(g)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                                            <button onClick={() => handleDeleteGrade(g.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                        </div>
                                    </div>
                                </div>
                            )) : <p className="text-[10px] text-gray-400 py-2">لا توجد درجات مسجلة</p>}
                        </div>
                    </div>
                </div>
            )}
        </Modal>

        <Modal isOpen={showToolsManager} onClose={() => { setShowToolsManager(false); setIsAddingTool(false); }} className="max-w-sm rounded-[2rem]">
            <div className="text-center text-slate-900">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-lg">أدوات التقويم</h3>
                    <button onClick={() => { setShowToolsManager(false); setIsAddingTool(false); }} className="p-2 glass-icon rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500"/></button>
                </div>
                {!isAddingTool ? (
                    <>
                        <button onClick={() => setIsAddingTool(true)} className="w-full py-3.5 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95"><Plus className="w-4 h-4"/> إضافة أداة جديدة</button>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {tools.length > 0 ? tools.map(tool => (
                                <div key={tool.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-colors">
                                    {editingToolId === tool.id ? (
                                        <div className="flex gap-2 w-full"><input autoFocus value={editToolName} onChange={e => setEditToolName(e.target.value)} className="flex-1 glass-input bg-gray-50 rounded-lg px-3 text-xs font-bold text-slate-800 border-slate-200" /><button onClick={saveEditedTool} className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600"><Check className="w-3.5 h-3.5"/></button><button onClick={cancelEditingTool} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X className="w-3.5 h-3.5"/></button></div>
                                    ) : (
                                        <><span className="text-xs font-bold text-slate-700 px-2">{tool.name}</span><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => startEditingTool(tool)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5"/></button><button onClick={() => handleDeleteTool(tool.id)} className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5"/></button></div></>
                                    )}
                                </div>
                            )) : <p className="text-xs text-gray-400 py-4 font-bold">لا توجد أدوات مضافة</p>}
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in zoom-in duration-200">
                        <input autoFocus placeholder="اسم الأداة (مثال: اختبار قصير 1)" value={newToolName} onChange={e => setNewToolName(e.target.value)} className="w-full p-4 glass-input bg-gray-50 rounded-2xl mb-4 font-bold text-sm outline-none border border-slate-200 focus:border-indigo-500 text-slate-800 shadow-inner" />
                        <div className="flex gap-2">
                            <button onClick={() => setIsAddingTool(false)} className="flex-1 py-3 bg-gray-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors">إلغاء</button>
                            <button onClick={handleAddTool} className="flex-[2] py-3 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">حفظ الأداة</button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>

        <Modal isOpen={!!bulkFillTool} onClose={() => { setBulkFillTool(null); setBulkScore(''); }} className="max-w-xs rounded-[2rem]">
            {bulkFillTool && (
                <div className="text-center text-slate-900">
                    <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-500 shadow-sm border border-indigo-100"><Icon3DBulk className="w-7 h-7" /></div>
                    <h3 className="font-black text-lg mb-1">رصد جماعي</h3>
                    <p className="text-xs text-indigo-600 font-bold mb-4 bg-indigo-50 inline-block px-3 py-1 rounded-lg">{bulkFillTool.name}</p>
                    <p className="text-[10px] text-gray-500 mb-4 px-2 font-medium">سيتم رصد هذه الدرجة لجميع الطلاب الظاهرين في القائمة الحالية (الذين لم ترصد لهم درجة لهذه الأداة بعد).</p>
                    <input type="number" autoFocus placeholder="الدرجة" className="w-full glass-input bg-gray-50 rounded-xl p-3 text-center text-lg font-black outline-none border border-slate-200 focus:border-indigo-500 mb-4 text-slate-800 shadow-inner" value={bulkScore} onChange={(e) => setBulkScore(e.target.value)} />
                    <button onClick={handleBulkFill} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">تطبيق الرصد</button>
                </div>
            )}
        </Modal>

    </div>
  );
};

export default GradeBook;
