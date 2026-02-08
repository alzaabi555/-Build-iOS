import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, GradeRecord, AssessmentTool } from '../types';
import { 
  Plus, X, Trash2, Settings, Check, Loader2, Edit2, 
  FileSpreadsheet, FileUp, Wand2, BarChart3, SlidersHorizontal, 
  FileDown, PieChart, AlertTriangle 
} from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import * as XLSX from 'xlsx';
import { StudentAvatar } from './StudentAvatar';

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

  useEffect(() => {
    localStorage.setItem('rased_grading_settings', JSON.stringify(gradingSettings));
  }, [gradingSettings]);

  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showToolsManager, setShowToolsManager] = useState(false);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editToolName, setEditToolName] = useState('');
  const [showDistModal, setShowDistModal] = useState(false);
  const [distTotal, setDistTotal] = useState<number>(gradingSettings.totalScore || 100);
  const [distFinalScore, setDistFinalScore] = useState<number>(gradingSettings.finalExamWeight || 40);
  const [distFinalName, setDistFinalName] = useState<string>(gradingSettings.finalExamName || 'الامتحان النهائي');
  const [bulkFillTool, setBulkFillTool] = useState<AssessmentTool | null>(null);
  const [bulkScore, setBulkScore] = useState('');
  const [activeToolId, setActiveToolId] = useState<string>('');
  const [showAddGrade, setShowAddGrade] = useState<{ student: Student } | null>(null);
  const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [score, setScore] = useState('');

  useEffect(() => {
    if (tools.length > 0 && !activeToolId) {
      setActiveToolId(tools[0].id);
    }
  }, [tools, activeToolId]);

  useEffect(() => {
    if (showAddGrade && !editingGrade) {
      setSelectedToolId('');
      setScore('');
    }
  }, [showAddGrade, editingGrade]);

  const cleanText = (text: string) => text ? String(text).trim() : '';
  const normalizeText = (text: string) => text ? String(text).trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ـ]/g, '') : '';
  
  const extractNumericScore = (val: any): number | null => {
    if (val === undefined || val === null || val === '') return null;
    const strVal = String(val).trim();
    const cleanNum = strVal.replace(/[^0-9.]/g, '');
    const num = Number(cleanNum);
    return isNaN(num) || cleanNum === '' ? null : num;
  };

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

  const getSemesterGrades = (student: Student, sem: '1' | '2') => {
    if (!student || !Array.isArray(student.grades)) return [];
    return student.grades.filter(g => (g.semester || '1') === sem);
  };

  const availableGrades = useMemo(() => {
    const grades = new Set<string>();
    students.forEach(s => {
      if (s.grade) grades.add(s.grade);
      else if (s.classes && s.classes[0]) {
        const match = s.classes[0].match(/^(\d+)/);
        if (match) grades.add(match[1]);
      }
    });
    return Array.from(grades).sort((a, b) => {
      const na = parseInt(a);
      const nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [students, classes]);

  const visibleClasses = useMemo(() => {
    if (selectedGrade === 'all') return classes;
    return classes.filter(c => c.includes('/') ? c.split('/')[0].trim() === selectedGrade : c.startsWith(selectedGrade));
  }, [classes, selectedGrade]);

  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(s => {
      if (!s) return false;
      const matchesClass = selectedClass === 'all' || (s.classes && s.classes.includes(selectedClass));
      let matchesGrade = true;
      if (selectedGrade !== 'all') {
        if (s.grade === selectedGrade) matchesGrade = true;
        else if (s.classes && s.classes[0]) {
          if (s.classes[0].includes('/')) matchesGrade = s.classes[0].split('/')[0].trim() === selectedGrade;
          else matchesGrade = s.classes[0].startsWith(selectedGrade);
        } else {
          matchesGrade = false;
        }
      }
      return matchesClass && matchesGrade;
    });
  }, [students, selectedClass, selectedGrade]);

  const handleGradeChange = (studentId: string, value: string) => {
    if (!activeToolId) return alert('الرجاء اختيار أداة تقويم من الأعلى أولاً');
    const activeTool = tools.find(t => t.id === activeToolId);
    if (!activeTool) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const numValue = value === '' ? null : Number(value);
    if (numValue !== null && isNaN(numValue)) return;

    let updatedGrades = [...(student.grades || [])].filter(
      g => !(g.category.trim() === activeTool.name.trim() && (g.semester || '1') === currentSemester)
    );

    if (numValue !== null) {
      updatedGrades.push({
        id: Math.random().toString(36).substr(2, 9),
        subject: teacherInfo?.subject || 'المادة',
        category: activeTool.name,
        score: numValue,
        maxScore: activeTool.maxScore || 0,
        date: new Date().toISOString(),
        semester: currentSemester
      });
    }
    onUpdateStudent({ ...student, grades: updatedGrades });
  };

  const getStudentGradeForActiveTool = (student: Student) => {
    if (!activeToolId) return '';
    const activeTool = tools.find(t => t.id === activeToolId);
    if (!activeTool) return '';
    const grade = (student.grades || []).find(
      g => g.category.trim() === activeTool.name.trim() && (g.semester || '1') === currentSemester
    );
    return grade ? grade.score.toString() : '';
  };

  const handleAddTool = () => {
    if (newToolName.trim()) {
      const finalName = cleanText(newToolName);
      if (tools.some(t => t.name === finalName)) { alert('هذه الأداة موجودة بالفعل'); return; }
      const newTool: AssessmentTool = { id: Math.random().toString(36).substr(2, 9), name: finalName, maxScore: 0 };
      setAssessmentTools([...tools, newTool]);
      setNewToolName('');
      setIsAddingTool(false);
      setActiveToolId(newTool.id);
    }
  };
  const handleDeleteTool = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الأداة؟')) {
      setAssessmentTools(tools.filter(t => t.id !== id));
      if (activeToolId === id) setActiveToolId('');
    }
  };
  const startEditingTool = (tool: AssessmentTool) => { setEditingToolId(tool.id); setEditToolName(tool.name); };
  const saveEditedTool = () => {
    if (editingToolId && editToolName.trim()) {
      const updatedTools = tools.map(t => t.id === editingToolId ? { ...t, name: cleanText(editToolName) } : t);
      setAssessmentTools(updatedTools); setEditingToolId(null); setEditToolName('');
    }
  };
  const cancelEditingTool = () => { setEditingToolId(null); setEditToolName(''); };
  const handleSaveDistribution = () => {
    const newSettings = { totalScore: distTotal, finalExamWeight: distFinalScore, finalExamName: distFinalName };
    setGradingSettings(newSettings);
    let newTools = [...tools];
    let finalToolIndex = newTools.findIndex(t => t.isFinal === true);
    if (finalToolIndex === -1) finalToolIndex = newTools.findIndex(t => t.name.trim() === distFinalName.trim());
    if (finalToolIndex !== -1) newTools[finalToolIndex] = { ...newTools[finalToolIndex], name: distFinalName, maxScore: distFinalScore, isFinal: true };
    else newTools.push({ id: Math.random().toString(36).substr(2, 9), name: distFinalName, maxScore: distFinalScore, isFinal: true });
    setAssessmentTools(newTools); setShowDistModal(false); alert('تم اعتماد توزيع الدرجات وتحديث أدوات التقويم ✅');
  };
  const handleBulkFill = () => {
    if (!bulkFillTool) return;
    const scoreValue = bulkScore.trim();
    if (scoreValue === '') return;
    const numericScore = parseFloat(scoreValue);
    if (isNaN(numericScore)) { alert('الرجاء إدخال رقم صحيح'); return; }
    const toolName = bulkFillTool.name.trim();
    const safeSemester = currentSemester || '1';
    const visibleIds = new Set(filteredStudents.map(s => s.id));
    if (visibleIds.size === 0) { alert('لا يوجد طلاب'); return; }
    setStudents(currentStudents => currentStudents.map(student => {
        if (!visibleIds.has(student.id)) return student;
        const existingGrades = Array.isArray(student.grades) ? student.grades : [];
        const keptGrades = existingGrades.filter(g => {
          const gSem = g.semester || '1';
          const gName = (g.category || '').trim();
          if (gSem === safeSemester && gName === toolName) return false;
          return true;
        });
        const newGrade: GradeRecord = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          subject: teacherInfo?.subject || 'المادة',
          category: toolName, score: numericScore, maxScore: bulkFillTool.maxScore || 0,
          date: new Date().toISOString(), semester: safeSemester
        };
        return { ...student, grades: [newGrade, ...keptGrades] };
      })
    );
    setBulkFillTool(null); setBulkScore(''); alert('تم الرصد الجماعي بنجاح! ✅');
  };
  const handleClearGrades = () => {
    const targetClassText = selectedClass === 'all' ? 'جميع الطلاب' : `طلاب فصل ${selectedClass}`;
    if (confirm(`هل أنت متأكد من حذف جميع الدرجات المسجلة لـ ${targetClassText} في الفصل الدراسي ${currentSemester}؟\n⚠️ لا يمكن التراجع عن هذا الإجراء.`)) {
      setStudents(prev => prev.map(s => {
          const sClasses = s.classes || [];
          const matches = selectedClass === 'all' || sClasses.includes(selectedClass);
          if (matches) {
            const keptGrades = (s.grades || []).filter(g => (g.semester || '1') !== currentSemester);
            return { ...s, grades: keptGrades };
          }
          return s;
        })
      );
      alert('تم حذف درجات الفصل المحدد بنجاح');
    }
  };
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as any[];
      if (jsonData.length === 0) throw new Error('الملف فارغ');
      const headers = Object.keys(jsonData[0]);
      const nameKeywords = ['الاسم', 'اسم الطالب', 'name', 'student', 'full name', 'المتعلم', 'student name'];
      const nameKey = headers.find(h => nameKeywords.some(kw => normalizeText(h).includes(normalizeText(kw)))) || headers[0];
      const excludedExact = ['م', '#', 'id', 'no', 'number', 'رقم'];
      const excludedPartial = ['مجموع', 'total', 'تقدير', 'rank', 'average', 'معدل', 'نتيجة', 'result'];
      const potentialTools = headers.filter(h => {
        const lowerH = normalizeText(h);
        if (h === nameKey) return false;
        if (excludedExact.includes(lowerH)) return false;
        if (excludedPartial.some(ex => lowerH.includes(ex))) return false;
        return true;
      });
      let updatedTools = [...tools];
      potentialTools.forEach(h => {
        const cleanH = cleanText(h);
        if (cleanH && !updatedTools.some(t => t.name === cleanH)) {
          updatedTools.push({ id: Math.random().toString(36).substr(2, 9), name: cleanH, maxScore: 0 });
        }
      });
      setAssessmentTools(updatedTools);
      let updatedCount = 0;
      setStudents(prev => prev.map(s => {
          const row = jsonData.find((r: any) => normalizeText(String(r[nameKey] || '').trim()) === normalizeText(s.name));
          if (!row) return s;
          updatedCount++;
          let newGrades = [...(s.grades || [])];
          potentialTools.forEach(headerStr => {
            const val = extractNumericScore(row[headerStr]);
            if (val !== null) {
              const toolName = cleanText(headerStr);
              newGrades = newGrades.filter(g => !(g.category.trim() === toolName.trim() && (g.semester || '1') === (currentSemester || '1')));
              newGrades.unshift({
                id: Math.random().toString(36).substr(2, 9),
                subject: teacherInfo?.subject || 'عام',
                category: toolName, score: val, maxScore: 0, date: new Date().toISOString(), semester: currentSemester
              });
            }
          });
          return { ...s, grades: newGrades };
        })
      );
      alert(`تم استيراد الدرجات بنجاح لـ ${updatedCount} طالب.\nتم إضافة ${potentialTools.length} أدوات تقويم جديدة.`);
    } catch (error: any) { console.error(error); alert('خطأ في قراءة الملف: ' + error.message); } finally { setIsImporting(false); if (e.target) e.target.value = ''; }
  };
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
        if (finalWeight > 0 && finalTool) {
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
      if (!ws['!views']) ws['!views'] = [];
      ws['!views'].push({ rightToLeft: true } as any);
      XLSX.utils.book_append_sheet(wb, ws, `درجات_${currentSemester}`);
      const fileName = `GradeBook_${new Date().getTime()}.xlsx`;
      if (Capacitor.isNativePlatform()) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const result = await Filesystem.writeFile({ path: fileName, data: wbout, directory: Directory.Cache });
        await Share.share({ title: 'سجل الدرجات', url: result.uri });
      } else { XLSX.writeFile(wb, fileName); }
    } catch (error) { console.error(error); alert('خطأ في التصدير'); } finally { setIsExporting(false); }
  };
  const handleDeleteGrade = (gradeId: string) => {
    if (!showAddGrade) return;
    if (confirm('حذف الدرجة؟')) {
      const updatedGrades = showAddGrade.student.grades.filter(g => g.id !== gradeId);
      const updatedStudent = { ...showAddGrade.student, grades: updatedGrades };
      onUpdateStudent(updatedStudent); setShowAddGrade({ student: updatedStudent });
    }
  };
  const handleEditGrade = (grade: GradeRecord) => {
    setEditingGrade(grade); setScore(grade.score.toString());
    const tool = tools.find(t => t.name.trim() === grade.category.trim());
    setSelectedToolId(tool ? tool.id : '');
  };
  const handleSaveGrade = () => {
    if (!showAddGrade || score === '') return;
    const student = showAddGrade.student;
    let categoryName = 'درجة عامة';
    if (selectedToolId) { const tool = tools.find(t => t.id === selectedToolId); if (tool) categoryName = tool.name; }
    else if (editingGrade) { categoryName = editingGrade.category; }
    const newGrade: GradeRecord = {
      id: editingGrade ? editingGrade.id : Math.random().toString(36).substr(2, 9),
      subject: teacherInfo?.subject || 'المادة',
      category: categoryName.trim(), score: Number(score), maxScore: 0, date: new Date().toISOString(), semester: currentSemester
    };
    let updatedGrades;
    if (editingGrade) { updatedGrades = (student.grades || []).map(g => g.id === editingGrade.id ? newGrade : g); }
    else {
      const filtered = (student.grades || []).filter(g => !(g.category.trim() === categoryName.trim() && (g.semester || '1') === currentSemester));
      updatedGrades = [newGrade, ...filtered];
    }
    const updatedStudent = { ...student, grades: updatedGrades };
    onUpdateStudent(updatedStudent); setShowAddGrade({ student: updatedStudent }); setScore(''); setEditingGrade(null);
  };

  return (
    // ✅ التعديل هنا: overflow-hidden على الحاوية الأب
    <div className="flex flex-col h-full overflow-hidden text-slate-800">
      
      {/* Header: shrink-0 لمنع التقلص */}
      <header className="shrink-0 bg-[#446A8D] text-white pt-8 pb-6 px-6 shadow-lg relative z-30 -mx-4 -mt-4 mb-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-wide">سجل الدرجات</h1>
            <button onClick={() => setShowToolsManager(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-95 border border-white/10" title="إدارة الأدوات">
              <Settings className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className={`bg:white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 active:scale-95 transition-all ${showMenu ? 'bg-white text-[#1e3a8a]' : 'bg-white/10 text-white'}`}>
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in zoom-in-95 origin-top-left">
                  <div className="p-1">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">إدارة الدرجات</span>
                    </div>
                    <button onClick={() => { setShowDistModal(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right group border-b border-slate-50">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0"><PieChart className="w-4 h-4 text-indigo-600" /></div>
                      <div className="flex flex-col items-start"><span className="text-xs font-bold text-slate-800">إعدادات توزيع الدرجات</span><span className="text-[9px] text-slate-400">تحديد الدرجة النهائية</span></div>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">{isImporting ? <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" /> : <FileUp className="w-4 h-4 text-emerald-600" />}</div>
                      <span className="text-xs font-bold text-slate-700">استيراد درجات (Excel)</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                    <button onClick={handleExportExcel} disabled={isExporting} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">{isExporting ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" /> : <FileDown className="w-4 h-4 text-blue-600" />}</div>
                      <span className="text-xs font-bold text-slate-700">تصدير التقرير</span>
                    </button>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button onClick={handleClearGrades} className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors w-full text-right group">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></div>
                      <span className="text-xs font-bold text-red-600">تصفير الدرجات</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {availableGrades.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedGrade === 'all' ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>كل المراحل</button>
              {availableGrades.map(g => (
                <button key={g} onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedGrade === g ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>صف {g}</button>
              ))}
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {visibleClasses.map(c => (
              <button key={c} onClick={() => setSelectedClass(c)} className={`px-5 py-2.5 text-xs font-bold whitespace-nowrap transition-all rounded-xl border shadow-sm ${selectedClass === c ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>{c}</button>
            ))}
          </div>
          <div className="overflow-x-auto no-scrollbar flex gap-2 pt-1 pb-1">
            {tools.length > 0 ? (
              tools.map(tool => (
                <button key={tool.id} onClick={() => setActiveToolId(tool.id)} className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap border flex items-center gap-1.5 active:scale-95 shadow-sm transition-all ${activeToolId === tool.id ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'} ${tool.isFinal ? 'border-amber-400/50' : ''}`}>
                  {activeToolId === tool.id && <Check className="w-3 h-3" />}
                  {tool.isFinal && <span className="text-amber-400 ml-1">★</span>}
                  {tool.name}
                </button>
              ))
            ) : (
              <span className="text-[10px] text-blue-200 font-bold px-2 py-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> قم بإضافة أدوات تقويم للبدء</span>
            )}
            {activeToolId && (
              <button onClick={() => { setBulkFillTool(tools.find(t => t.id === activeToolId) || null); setBulkScore(''); }} className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-[10px] font-bold border border-indigo-400 shadow-sm ml-auto flex items-center gap-1">
                <Wand2 className="w-3 h-3" /> رصد جماعي
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ✅ التعديل هنا: إضافة حاوية للقائمة مع التمرير الداخلي */}
      <div className="flex-1 overflow-y-auto px-2 pb-20 pt-2 custom-scrollbar">
        {filteredStudents.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredStudents.map(student => {
              const currentGrade = getStudentGradeForActiveTool(student);
              const numericCurrent = currentGrade ? parseFloat(currentGrade) : 0;
              const semGrades = getSemesterGrades(student, currentSemester);
              const totalScore = semGrades.reduce((acc, curr) => acc + (curr.score || 0), 0);
              const symbol = getGradeSymbol(totalScore);
              const symbolColor = getSymbolColor(totalScore);
              const gradeColorClass = !currentGrade ? 'border-slate-200 bg-white text-slate-800' : numericCurrent >= 9 ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : numericCurrent >= 5 ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-red-400 bg-red-50 text-red-700';

              return (
                <div key={student.id} className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 flex flex-col items-center hover:shadow-md transition-all duration-200 relative" onClick={() => setShowAddGrade({ student })}>
                  <StudentAvatar gender={student.gender} className="w-16 h-16 mb-3 border-4 border-white shadow-sm" />
                  <h3 className="font-bold text-slate-800 text-xs text-center line-clamp-1 mb-3 w-full">{student.name}</h3>
                  <div className="flex items-center justify-center gap-2 mb-2 w-full bg-slate-50 py-2 rounded-xl border border-slate-100">
                      <span className={`text-lg font-black ${symbolColor.replace('bg-', 'text-').replace('50', '600')}`}>{totalScore}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${symbolColor}`}>{symbol}</span>
                  </div>
                  <div className="w-full relative mt-auto" onClick={e => e.stopPropagation()}>
                    {activeToolId ? (
                        <>
                            <input type="tel" maxLength={3} value={currentGrade} onChange={e => handleGradeChange(student.id, e.target.value)} placeholder="-" className={`w-full h-10 rounded-xl text-center font-black text-lg outline-none border-2 transition-all shadow-inner focus:ring-2 focus:ring-opacity-20 focus:ring-blue-400 ${gradeColorClass}`} />
                            <span className="block text-center text-[9px] font-bold text-slate-400 mt-1">رصد: {tools.find(t => t.id === activeToolId)?.name}</span>
                        </>
                    ) : (
                        <p className="text-center text-[9px] font-bold text-slate-300 py-2">اختر أداة للرصد</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
            <FileSpreadsheet className="w-16 h-16 mb-4" />
            <p className="font-bold">لا يوجد طلاب مطابقين</p>
          </div>
        )}
      </div>

      <Modal isOpen={showDistModal} onClose={() => setShowDistModal(false)} className="max-w-md rounded-[2rem]">
        {/* ... (باقي المودالات كما هي في الكود السابق) ... */}
        {/* تم اختصارها هنا لتوفير المساحة، انسخها من الكود السابق أو اتركها كما كانت إذا لم تتغير */}
        <div className="text-center">
          <h3 className="font-black text-xl mb-6 text-slate-800">إعدادات توزيع الدرجات</h3>
          {/* ... (نفس محتوى المودال السابق) ... */}
           <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <label className="block text-right text-xs font-black text-slate-700 mb-2">1. الدرجة الكلية للمادة</label>
              <input type="number" value={distTotal} onChange={e => setDistTotal(Number(e.target.value))} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-center font-black text-lg outline-none focus:border-indigo-500 text-slate-800" />
            </div>
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <label className="block text-right text-xs font-black text-slate-700 mb-2">2. درجة الامتحان النهائي (أو المشروع)</label>
              <input type="number" value={distFinalScore} onChange={e => setDistFinalScore(Number(e.target.value))} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-center font-black text-lg outline-none focus:border-indigo-500 text-slate-800" />
            </div>
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <label className="block text-right text-xs font-black text-slate-700 mb-2">3. مسمى الامتحان النهائي</label>
              <input type="text" value={distFinalName} onChange={e => setDistFinalName(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-center font-bold text-sm outline-none focus:border-indigo-500 text-slate-800" placeholder="مثال: الامتحان النهائي" />
            </div>
            <button onClick={handleSaveDistribution} className="w-full py-4 bg-[#1e3a8a] text-white rounded-xl font-black text-sm shadow-lg hover:bg-[#172554] active:scale-95 transition-all">حفظ واعتماد التوزيع</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showToolsManager} onClose={() => { setShowToolsManager(false); setIsAddingTool(false); }} className="max-w-sm rounded-[2rem]">
         {/* ... (نفس محتوى المودال السابق) ... */}
         <div className="text-center text-slate-900">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-lg">أدوات التقويم</h3>
            <button onClick={() => { setShowToolsManager(false); setIsAddingTool(false); }} className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          {!isAddingTool ? (
            <>
              <button onClick={() => setIsAddingTool(true)} className="w-full py-3.5 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95"><Plus className="w-4 h-4" /> إضافة أداة جديدة</button>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                {tools.length > 0 ? (
                  tools.map(tool => (
                    <div key={tool.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-colors">
                      {editingToolId === tool.id ? (
                        <div className="flex gap-2 w-full">
                          <input autoFocus value={editToolName} onChange={e => setEditToolName(e.target.value)} className="flex-1 bg-gray-50 rounded-lg px-3 text-xs font-bold text-slate-800 border-slate-200" />
                          <button onClick={saveEditedTool} className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEditingTool} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            {tool.isFinal && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">نهائي</span>}
                            <span className="text-xs font-bold text-slate-700 px-2">{tool.name}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditingTool(tool)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            {!tool.isFinal && <button onClick={() => handleDeleteTool(tool.id)} className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : <p className="text-xs text-gray-400 py-4 font-bold">لا توجد أدوات مضافة</p>}
              </div>
            </>
          ) : (
            <div className="animate-in fade-in zoom-in duration-200">
              <input autoFocus placeholder="اسم الأداة (مثال: اختبار قصير 1)" value={newToolName} onChange={e => setNewToolName(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl mb-4 font-bold text-sm outline-none border border-slate-200 focus:border-indigo-500 text-slate-800 shadow-inner" />
              <div className="flex gap-2">
                <button onClick={() => setIsAddingTool(false)} className="flex-1 py-3 bg-gray-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors">إلغاء</button>
                <button onClick={handleAddTool} className="flex-[2] py-3 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">حفظ الأداة</button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!bulkFillTool} onClose={() => { setBulkFillTool(null); setBulkScore(''); }} className="max-w-xs rounded-[2rem]">
         {/* ... (نفس محتوى المودال السابق) ... */}
         {bulkFillTool && (
          <div className="text-center text-slate-900">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-500 shadow-sm border border-indigo-100"><Wand2 className="w-7 h-7" /></div>
            <h3 className="font-black text-lg mb-1">رصد جماعي</h3>
            <p className="text-xs text-indigo-600 font-bold mb-4 bg-indigo-50 inline-block px-3 py-1 rounded-lg">{bulkFillTool.name}</p>
            <input type="number" autoFocus placeholder="الدرجة" className="w-full bg-gray-50 rounded-xl p-3 text-center text-lg font-black outline-none border border-slate-200 focus:border-indigo-500 mb-4 text-slate-800 shadow-inner" value={bulkScore} onChange={e => setBulkScore(e.target.value)} />
            <button onClick={handleBulkFill} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">تطبيق الرصد</button>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!showAddGrade} onClose={() => { setShowAddGrade(null); setEditingGrade(null); setScore(''); }} className="max-w-md rounded-[2rem]">
         {/* ... (نفس محتوى المودال السابق) ... */}
         {showAddGrade && (
          <div className="text-right text-slate-900">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-lg">درجات الطالب: {showAddGrade.student.name}</h3>
              <button onClick={() => { setShowAddGrade(null); setEditingGrade(null); setScore(''); }} className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="mb-3">
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">أداة التقويم</label>
              <select value={selectedToolId} onChange={e => setSelectedToolId(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-200 outline-none focus:border-indigo-500">
                <option value="">درجة عامة / بدون أداة محددة</option>
                {tools.map(tool => ( <option key={tool.id} value={tool.id}>{tool.name}</option> ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">الدرجة</label>
              <input type="number" value={score} onChange={e => setScore(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border border-slate-200 outline-none focus:border-indigo-500 text-center" placeholder="أدخل الدرجة" />
            </div>
            <button onClick={handleSaveGrade} className="w-full py-3.5 bg-[#1e3a8a] text-white rounded-xl font-black text-xs shadow-lg hover:bg-[#172554] active:scale-95 transition-all mb-4">حفظ الدرجة</button>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {getSemesterGrades(showAddGrade.student, currentSemester).map(g => (
                  <div key={g.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-2 border border-slate-100">
                    <div><div className="text-[11px] font-bold text-slate-700">{g.category}</div><div className="text-[10px] text-slate-400">{new Date(g.date).toLocaleDateString('ar-EG')}</div></div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black bg-white rounded-lg px-2 py-1 border border-slate-200">{g.score}</span>
                      <button onClick={() => handleEditGrade(g)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteGrade(g.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )
              )}
              {getSemesterGrades(showAddGrade.student, currentSemester).length === 0 && <p className="text-center text-[11px] text-slate-400 font-bold">لا توجد درجات مسجلة لهذا الفصل.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GradeBook;