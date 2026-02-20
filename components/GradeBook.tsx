import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, GradeRecord, AssessmentTool } from '../types';
import { 
  Plus, X, Trash2, Settings, Check, Loader2, Edit2, 
  FileSpreadsheet, FileUp, Wand2, BarChart3, SlidersHorizontal, 
  FileDown, PieChart, AlertTriangle, Download 
} from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
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

  // ✅ ذاكرة الجلسة للفلاتر
  const [selectedGrade, setSelectedGrade] = useState<string>(() => sessionStorage.getItem('rased_grade') || 'all');
  const [selectedClass, setSelectedClass] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');

  useEffect(() => {
      sessionStorage.setItem('rased_grade', selectedGrade);
      sessionStorage.setItem('rased_class', selectedClass);
  }, [selectedGrade, selectedClass]);

  // States للمودالات والإدارة
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
  
  // بيانات توزيع الدرجات المؤقتة
  const [distTotal, setDistTotal] = useState<number>(gradingSettings.totalScore || 100);
  const [distFinalScore, setDistFinalScore] = useState<number>(gradingSettings.finalExamWeight || 40);
  const [distFinalName, setDistFinalName] = useState<string>(gradingSettings.finalExamName || 'الامتحان النهائي');
  
  const [bulkFillTool, setBulkFillTool] = useState<AssessmentTool | null>(null);
  const [bulkScore, setBulkScore] = useState('');
  const [activeToolId, setActiveToolId] = useState<string>('');

 // 🌙 المستشعر الرمضاني اللحظي (يمنع الوميض تماماً)
  const [isRamadan] = useState(() => {
      try {
          const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' }).formatToParts(new Date());
          return parseInt(parts.find(p => p.type === 'month')?.value || '0') === 9;
      } catch(e) {
          return false;
      }
  });

  useEffect(() => {
    if (tools.length > 0 && !activeToolId) {
      setActiveToolId(tools[0].id);
    }
  }, [tools, activeToolId]);

  // --- دوال مساعدة للاستيراد والتصدير ---
  const cleanText = (text: string) => text ? String(text).trim() : '';
  const normalizeText = (text: string) => text ? String(text).trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ـ]/g, '') : '';
  
  const extractNumericScore = (val: any): number | null => {
    if (val === undefined || val === null || val === '') return null;
    const strVal = String(val).trim();
    const cleanNum = strVal.replace(/[^0-9.]/g, '');
    const num = Number(cleanNum);
    return isNaN(num) || cleanNum === '' ? null : num;
  };

  // دالة استخراج التقدير
  const getGradeSymbol = (score: number) => {
    const percentage = (score / gradingSettings.totalScore) * 100;
    if (percentage >= 90) return 'أ';
    if (percentage >= 80) return 'ب';
    if (percentage >= 65) return 'ج';
    if (percentage >= 50) return 'د';
    return 'هـ';
  };

  const getSymbolColor = (score: number, isRamadanTheme: boolean) => {
    const percentage = (score / gradingSettings.totalScore) * 100;
    if (percentage >= 90) return isRamadanTheme ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-600 bg-emerald-50';
    if (percentage >= 80) return isRamadanTheme ? 'text-blue-400 bg-blue-500/20' : 'text-blue-600 bg-blue-50';
    if (percentage >= 65) return isRamadanTheme ? 'text-amber-400 bg-amber-500/20' : 'text-amber-600 bg-amber-50';
    if (percentage >= 50) return isRamadanTheme ? 'text-orange-400 bg-orange-500/20' : 'text-orange-600 bg-orange-50';
    return isRamadanTheme ? 'text-rose-400 bg-rose-500/20' : 'text-rose-600 bg-rose-50';
  };

  const getSemesterGrades = (student: Student, sem: '1' | '2') => {
    return (student.grades || []).filter(g => (g.semester || '1') === sem);
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
    return Array.from(grades).sort((a, b) => parseInt(a) - parseInt(b));
  }, [students]);

  const visibleClasses = useMemo(() => {
    if (selectedGrade === 'all') return classes;
    return classes.filter(c => c.startsWith(selectedGrade));
  }, [classes, selectedGrade]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = selectedClass === 'all' || s.classes.includes(selectedClass);
      let matchesGrade = true;
      if (selectedGrade !== 'all') {
        matchesGrade = s.grade === selectedGrade || (s.classes[0] && s.classes[0].startsWith(selectedGrade));
      }
      return matchesClass && matchesGrade;
    });
  }, [students, selectedClass, selectedGrade]);

  // ✅ ميزة جديدة: تحميل قالب إكسل جاهز
  const handleDownloadTemplate = async () => {
    try {
      const headers = ['الاسم', 'الصف', ...tools.map(t => t.name)];
      const sampleRow: any = { 'الاسم': 'مثال: محمد علي', 'الصف': '1/5' };
      tools.forEach(t => sampleRow[t.name] = '10');
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
      ws['!cols'] = [{ wch: 25 }, { wch: 10 }, ...tools.map(() => ({ wch: 15 }))];

      XLSX.utils.book_append_sheet(wb, ws, "قالب_الرصد");
      const fileName = `Rased_Template.xlsx`;

      if (Capacitor.isNativePlatform()) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const result = await Filesystem.writeFile({ path: fileName, data: wbout, directory: Directory.Cache });
        await Share.share({ title: 'قالب رصد الدرجات', url: result.uri });
      } else {
        XLSX.writeFile(wb, fileName);
      }
      setShowMenu(false);
    } catch (e) {
      alert('حدث خطأ أثناء تحميل القالب');
    }
  };

  // ✅ دالة الاستيراد من Excel
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
      const nameKeywords = ['الاسم', 'اسم الطالب', 'name', 'student'];
      const nameKey = headers.find(h => nameKeywords.some(kw => normalizeText(h).includes(normalizeText(kw)))) || headers[0];

      const potentialTools = headers.filter(h => {
        const lowerH = normalizeText(h);
        if (h === nameKey) return false;
        if (lowerH.startsWith('__empty')) return false; 
        if (!cleanText(h)) return false; 
        const excludedPartial = ['مجموع', 'total', 'تقدير', 'نتيجة', 'rank', 'م'];
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
              newGrades = newGrades.filter(g => !(g.category.trim() === toolName.trim() && (g.semester || '1') === currentSemester));
              newGrades.unshift({
                id: Math.random().toString(36).substr(2, 9),
                subject: teacherInfo?.subject || 'عام',
                category: toolName, 
                score: val, 
                maxScore: 0, 
                date: new Date().toISOString(), 
                semester: currentSemester
              });
            }
          });
          return { ...s, grades: newGrades };
        })
      );
      
      alert(`تم استيراد الدرجات لـ ${updatedCount} طالب بنجاح ✅`);
      setShowMenu(false);
    } catch (error: any) { 
      alert('خطأ في الاستيراد: ' + error.message); 
    } finally { 
      setIsImporting(false); 
      if (e.target) e.target.value = ''; 
    }
  };

  // ✅ دالة تصدير التقرير
  const handleExportExcel = async () => {
    if (filteredStudents.length === 0) return alert('لا يوجد طلاب لتصدير درجاتهم');
    setIsExporting(true);
    
    try {
      const data = filteredStudents.map(student => {
        const row: any = { 'الاسم': student.name, 'الصف': student.classes[0] || '' };
        const semGrades = getSemesterGrades(student, currentSemester);
        let total = 0;
        
        tools.forEach(tool => {
          const g = semGrades.find(grade => grade.category.trim() === tool.name.trim());
          row[tool.name] = g ? g.score : '';
          total += g ? Number(g.score) : 0;
        });
        
        row['المجموع'] = total;
        row['التقدير'] = getGradeSymbol(total);
        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "الدرجات");
      
      const fileName = `Grades_Report_${currentSemester}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`;
      
      if (Capacitor.isNativePlatform()) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const result = await Filesystem.writeFile({ 
            path: fileName, 
            data: wbout, 
            directory: Directory.Cache 
        });
        await Share.share({ title: 'تقرير الدرجات', url: result.uri });
      } else { 
        XLSX.writeFile(wb, fileName); 
      }
      setShowMenu(false);
    } catch (e) {
        alert('حدث خطأ أثناء التصدير');
    } finally { 
        setIsExporting(false); 
    }
  };

  // دالة الرصد اليدوي
  const handleGradeChange = (studentId: string, value: string) => {
    if (!activeToolId) return alert('الرجاء اختيار أداة تقويم أولاً');
    const activeTool = tools.find(t => t.id === activeToolId);
    if (!activeTool) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const numValue = value === '' ? null : Number(value);
    let updatedGrades = (student.grades || []).filter(
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

  // إدارة أدوات التقويم
  const handleAddTool = () => {
    if (newToolName.trim()) {
      if (tools.some(t => t.name === newToolName.trim())) return alert('موجودة مسبقاً');
      const newTool: AssessmentTool = { id: Math.random().toString(36).substr(2, 9), name: newToolName.trim(), maxScore: 0 };
      setAssessmentTools([...tools, newTool]);
      setNewToolName('');
      setIsAddingTool(false);
      setActiveToolId(newTool.id);
    }
  };

  const handleDeleteTool = (id: string) => {
    if (confirm('حذف هذه الأداة؟')) {
      setAssessmentTools(tools.filter(t => t.id !== id));
      if (activeToolId === id) setActiveToolId('');
    }
  };

  const handleSaveDistribution = () => {
    const newSettings = { totalScore: distTotal, finalExamWeight: distFinalScore, finalExamName: distFinalName };
    setGradingSettings(newSettings);
    
    let newTools = [...tools];
    let finalToolIndex = newTools.findIndex(t => t.isFinal === true);
    if (finalToolIndex === -1) finalToolIndex = newTools.findIndex(t => t.name.trim() === distFinalName.trim());
    
    if (finalToolIndex !== -1) {
      newTools[finalToolIndex] = { ...newTools[finalToolIndex], name: distFinalName, maxScore: distFinalScore, isFinal: true };
    } else {
      newTools.push({ id: Math.random().toString(36).substr(2, 9), name: distFinalName, maxScore: distFinalScore, isFinal: true });
    }
    
    setAssessmentTools(newTools);
    setShowDistModal(false);
    alert('تم اعتماد توزيع الدرجات ✅');
  };

  const handleBulkFill = () => {
    if (!bulkFillTool || bulkScore === '') return;
    const numericScore = parseFloat(bulkScore);
    const visibleIds = new Set(filteredStudents.map(s => s.id));
    
    setStudents(prev => prev.map(student => {
        if (!visibleIds.has(student.id)) return student;
        const keptGrades = (student.grades || []).filter(g => !(g.category.trim() === bulkFillTool.name.trim() && (g.semester || '1') === currentSemester));
        const newGrade: GradeRecord = { 
          id: Math.random().toString(36), 
          subject: teacherInfo?.subject || 'المادة', 
          category: bulkFillTool.name, 
          score: numericScore, 
          maxScore: bulkFillTool.maxScore || 0, 
          date: new Date().toISOString(), 
          semester: currentSemester 
        };
        return { ...student, grades: [newGrade, ...keptGrades] };
    }));
    setBulkFillTool(null);
    setBulkScore('');
  };

  const handleClearGrades = () => {
    if (confirm(`⚠️ تحذير: سيتم حذف جميع درجات الطلاب في الفصل الدراسي ${currentSemester}، هل أنت متأكد؟`)) {
      setStudents(prev => prev.map(s => ({
          ...s,
          grades: (s.grades || []).filter(g => (g.semester || '1') !== currentSemester)
      })));
      setShowMenu(false);
    }
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden relative ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
      
      {/* Header */}
      <header className={`fixed md:sticky top-0 z-40 md:z-30 shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-500 md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto ${isRamadan ? 'bg-white/5 backdrop-blur-3xl border-b border-white/10 text-white' : 'bg-[#446A8D] text-white'}`}>
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
            <button onClick={() => setShowMenu(!showMenu)} className={`bg:white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 active:scale-95 transition-all ${showMenu ? (isRamadan ? 'bg-white/20 text-white' : 'bg-white text-[#1e3a8a]') : 'bg-white/10 text-white'}`}>
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                <div className={`absolute left-0 top-full mt-2 w-64 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in zoom-in-95 origin-top-left ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
                  <div className="p-1">
                    {/* زر توزيع الدرجات */}
                    <button onClick={() => { setShowDistModal(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right border-b ${isRamadan ? 'hover:bg-white/10 border-white/10' : 'hover:bg-slate-50 border-slate-50'}`}>
                      <PieChart className={`w-4 h-4 ${isRamadan ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <div className="flex flex-col items-start text-xs font-bold">
                        <span className={isRamadan ? 'text-indigo-100' : 'text-slate-800'}>إعدادات توزيع الدرجات</span>
                        <span className={`text-[9px] ${isRamadan ? 'text-indigo-200/60' : 'text-slate-400'}`}>تحديد الدرجة النهائية والوزن</span>
                      </div>
                    </button>

                    {/* زر تحميل القالب */}
                    <button onClick={handleDownloadTemplate} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right border-b ${isRamadan ? 'hover:bg-white/10 border-white/10' : 'hover:bg-slate-50 border-slate-50'}`}>
                      <FileSpreadsheet className={`w-4 h-4 ${isRamadan ? 'text-amber-400' : 'text-amber-600'}`} />
                      <span className={`text-xs font-bold ${isRamadan ? 'text-indigo-100' : 'text-slate-700'}`}>تحميل قالب إكسل فارغ</span>
                    </button>

                    {/* زر استيراد Excel */}
                    <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right ${isRamadan ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
                      {isImporting ? <Loader2 className={`w-4 h-4 animate-spin ${isRamadan ? 'text-emerald-400' : 'text-emerald-600'}`} /> : <FileUp className={`w-4 h-4 ${isRamadan ? 'text-emerald-400' : 'text-emerald-600'}`} />}
                      <span className={`text-xs font-bold ${isRamadan ? 'text-indigo-100' : 'text-slate-700'}`}>استيراد من Excel</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />

                    {/* زر تصدير التقرير */}
                    <button onClick={handleExportExcel} disabled={isExporting} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right ${isRamadan ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}>
                      {isExporting ? <Loader2 className={`w-4 h-4 animate-spin ${isRamadan ? 'text-blue-400' : 'text-blue-600'}`} /> : <FileDown className={`w-4 h-4 ${isRamadan ? 'text-blue-400' : 'text-blue-600'}`} />}
                      <span className={`text-xs font-bold ${isRamadan ? 'text-indigo-100' : 'text-slate-700'}`}>تصدير التقرير</span>
                    </button>

                    {/* زر تصفير الدرجات */}
                    <button onClick={handleClearGrades} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full text-right border-t ${isRamadan ? 'hover:bg-rose-500/20 text-rose-400 border-white/10' : 'hover:bg-red-50 text-red-600 border-slate-50'}`}>
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs font-bold">تصفير درجات الفصل</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedGrade === 'all' ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20'}`}>كل المراحل</button>
            {availableGrades.map(g => (
              <button key={g} onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all rounded-xl border ${selectedGrade === g ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20'}`}>صف {g}</button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => setSelectedClass('all')} className={`px-5 py-2.5 text-xs font-bold whitespace-nowrap transition-all rounded-xl border shadow-sm ${selectedClass === 'all' ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20'}`}>الكل</button>
            {visibleClasses.map(c => (
              <button key={c} onClick={() => setSelectedClass(c)} className={`px-5 py-2.5 text-xs font-bold whitespace-nowrap transition-all rounded-xl border shadow-sm ${selectedClass === c ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20'}`}>{c}</button>
            ))}
          </div>
          
          <div className="overflow-x-auto no-scrollbar flex gap-2 pt-1 pb-1">
            {tools.map(tool => (
                <button key={tool.id} onClick={() => setActiveToolId(tool.id)} className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap border flex items-center gap-1.5 active:scale-95 shadow-sm transition-all ${activeToolId === tool.id ? (isRamadan ? 'bg-white/20 text-amber-300 border-amber-400/50 shadow-md' : 'bg-white text-[#1e3a8a] border-white shadow-md') : 'bg-white/10 hover:bg-white/20 text-white border-white/20'} ${tool.isFinal ? 'border-amber-400/50' : ''}`}>
                  {activeToolId === tool.id && <Check className="w-3 h-3" />}
                  {tool.isFinal && <span className="text-amber-400 ml-1">★</span>}
                  {tool.name}
                </button>
            ))}
            {activeToolId && (
              <button onClick={() => setBulkFillTool(tools.find(t => t.id === activeToolId) || null)} className={`px-3 py-2 text-white rounded-xl text-[10px] font-bold ml-auto flex items-center gap-1 shadow-md active:scale-95 transition-colors ${isRamadan ? 'bg-indigo-600/80 hover:bg-indigo-500' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                <Wand2 className="w-3 h-3" /> رصد جماعي
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Student List Grid */}
      <div className="flex-1 overflow-y-auto px-2 pb-20 custom-scrollbar pt-64 md:pt-2">
        <div className="grid grid-cols-2 gap-3">
          {filteredStudents.map(student => {
            const currentGrade = getStudentGradeForActiveTool(student);
            const semGrades = getSemesterGrades(student, currentSemester);
            const totalScore = semGrades.reduce((acc, curr) => acc + (curr.score || 0), 0);
            const symbolColor = getSymbolColor(totalScore, isRamadan);

            return (
              <div key={student.id} className={`rounded-[1.5rem] p-4 shadow-sm border flex flex-col items-center relative transition-colors ${isRamadan ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-white border-slate-100'}`}>
                <StudentAvatar gender={student.gender} className={`w-16 h-16 mb-3 border-4 shadow-sm ${isRamadan ? 'border-indigo-900/50' : 'border-white'}`} />
                <h3 className={`font-bold text-xs text-center line-clamp-1 mb-3 w-full ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{student.name}</h3>
                
                <div className={`flex items-center justify-center gap-2 mb-2 w-full py-2 rounded-xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                    <span className={`text-lg font-black ${isRamadan ? symbolColor.split(' ')[0] : symbolColor.replace('bg-', 'text-').replace('50', '600')}`}>{totalScore}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${symbolColor}`}>{getGradeSymbol(totalScore)}</span>
                </div>
                
                <div className="w-full relative mt-auto">
                    <input 
                        type="tel" 
                        maxLength={3} 
                        value={currentGrade} 
                        onChange={e => handleGradeChange(student.id, e.target.value)} 
                        placeholder="-" 
                        className={`w-full h-10 rounded-xl text-center font-black text-lg outline-none border-2 transition-all ${isRamadan ? 'bg-[#0f172a]/50 border-white/20 focus:border-amber-400 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 focus:border-indigo-400 text-slate-800'}`} 
                    />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. مودال إدارة الأدوات */}
      <Modal isOpen={showToolsManager} onClose={() => { setShowToolsManager(false); setIsAddingTool(false); }} className={`max-w-sm rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
         <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white text-slate-900 border-transparent'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-lg">أدوات التقويم</h3>
            <button onClick={() => { setShowToolsManager(false); setIsAddingTool(false); }} className={`p-2 rounded-full transition-colors ${isRamadan ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><X className={`w-5 h-5 ${isRamadan ? 'text-slate-400' : 'text-gray-500'}`} /></button>
          </div>
          {!isAddingTool ? (
            <>
              <button onClick={() => setIsAddingTool(true)} className={`w-full py-3.5 mb-4 rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${isRamadan ? 'bg-indigo-600/80 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}><Plus className="w-4 h-4" /> إضافة أداة جديدة</button>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                {tools.length > 0 ? (
                  tools.map(tool => (
                    <div key={tool.id} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm group transition-colors ${isRamadan ? 'bg-white/5 border-white/10 hover:border-indigo-400/50' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                      <div className="flex items-center gap-2">
                        {tool.isFinal && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isRamadan ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>نهائي</span>}
                        <span className={`text-xs font-bold ${isRamadan ? 'text-indigo-100' : 'text-slate-700'}`}>{tool.name}</span>
                      </div>
                      <div className="flex gap-1">
                        {!tool.isFinal && <button onClick={() => handleDeleteTool(tool.id)} className={`p-1.5 rounded-lg transition-colors ${isRamadan ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-50 text-rose-500'}`}><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                  ))
                ) : <p className={`text-xs py-4 font-bold ${isRamadan ? 'text-slate-500' : 'text-gray-400'}`}>لا توجد أدوات مضافة</p>}
              </div>
            </>
          ) : (
            <div className="animate-in fade-in zoom-in duration-200">
              <input autoFocus placeholder="اسم الأداة (مثال: اختبار قصير 1)" value={newToolName} onChange={e => setNewToolName(e.target.value)} className={`w-full p-4 rounded-2xl mb-4 font-bold text-sm outline-none border transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white placeholder:text-indigo-200/40' : 'bg-gray-50 border-slate-200 focus:border-indigo-500 text-slate-800'}`} />
              <div className="flex gap-2">
                <button onClick={() => setIsAddingTool(false)} className={`flex-1 py-3 font-bold text-xs rounded-xl transition-colors ${isRamadan ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-slate-500 hover:bg-gray-200'}`}>إلغاء</button>
                <button onClick={handleAddTool} className={`flex-[2] py-3 font-black text-xs rounded-xl shadow-lg transition-colors ${isRamadan ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>حفظ الأداة</button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 2. مودال توزيع الدرجات */}
      <Modal isOpen={showDistModal} onClose={() => setShowDistModal(false)} className={`max-w-md rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
        <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white text-slate-900 border-transparent'}`}>
          <h3 className={`font-black text-xl mb-6 ${isRamadan ? 'text-white' : 'text-slate-800'}`}>إعدادات توزيع الدرجات</h3>
          <div className="space-y-6">
            <div className={`p-4 rounded-2xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <label className={`block text-right text-xs font-black mb-2 ${isRamadan ? 'text-indigo-200' : 'text-slate-700'}`}>1. الدرجة الكلية للمادة</label>
              <input type="number" value={distTotal} onChange={e => setDistTotal(Number(e.target.value))} className={`w-full p-3 border rounded-xl text-center font-black text-lg outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-white border-gray-200 focus:border-indigo-500'}`} />
            </div>
             <div className={`p-4 rounded-2xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <label className={`block text-right text-xs font-black mb-2 ${isRamadan ? 'text-indigo-200' : 'text-slate-700'}`}>2. درجة الامتحان النهائي (أو المشروع)</label>
              <input type="number" value={distFinalScore} onChange={e => setDistFinalScore(Number(e.target.value))} className={`w-full p-3 border rounded-xl text-center font-black text-lg outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-white border-gray-200 focus:border-indigo-500'}`} />
              <p className={`text-[10px] mt-2 font-bold text-right ${isRamadan ? 'text-slate-400' : 'text-gray-400'}`}>* ضع 0 إذا كانت المادة تقويم مستمر 100%</p>
            </div>
             <div className={`p-4 rounded-2xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <label className={`block text-right text-xs font-black mb-2 ${isRamadan ? 'text-indigo-200' : 'text-slate-700'}`}>3. مسمى الامتحان النهائي</label>
              <input type="text" value={distFinalName} onChange={e => setDistFinalName(e.target.value)} className={`w-full p-3 border rounded-xl text-center font-bold text-sm outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-white border-gray-200 focus:border-indigo-500'}`} placeholder="مثال: الامتحان النهائي" />
            </div>
            <div className={`flex items-center justify-between p-4 rounded-xl border ${isRamadan ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-100'}`}>
              <div className="text-center flex-1"><span className={`block text-xs font-bold mb-1 ${isRamadan ? 'text-blue-300' : 'text-blue-600'}`}>التقويم المستمر</span><span className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{distTotal - distFinalScore}</span></div>
              <div className={`text-xl font-black mx-2 ${isRamadan ? 'text-slate-600' : 'text-slate-300'}`}>+</div>
              <div className="text-center flex-1"><span className={`block text-xs font-bold mb-1 ${isRamadan ? 'text-blue-300' : 'text-blue-600'}`}>النهائي</span><span className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{distFinalScore}</span></div>
              <div className={`text-xl font-black mx-2 ${isRamadan ? 'text-slate-600' : 'text-slate-300'}`}>=</div>
              <div className="text-center flex-1"><span className={`block text-xs font-bold mb-1 ${isRamadan ? 'text-blue-300' : 'text-blue-600'}`}>{distTotal}</span></div>
            </div>
            <button onClick={handleSaveDistribution} className={`w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all ${isRamadan ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-[#1e3a8a] hover:bg-[#172554] text-white'}`}>حفظ واعتماد التوزيع</button>
          </div>
        </div>
      </Modal>

      {/* 3. مودال الرصد الجماعي */}
      <Modal isOpen={!!bulkFillTool} onClose={() => { setBulkFillTool(null); setBulkScore(''); }} className={`max-w-xs rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
         {bulkFillTool && (
          <div className={`text-center p-6 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white text-slate-900 border-transparent'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 border ${isRamadan ? 'bg-indigo-900/50 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-500 border-indigo-100'}`}><Wand2 className="w-7 h-7" /></div>
            <h3 className={`font-black text-lg mb-1 ${isRamadan ? 'text-white' : 'text-slate-900'}`}>رصد جماعي</h3>
            <p className={`text-xs font-bold mb-4 inline-block px-3 py-1 rounded-lg ${isRamadan ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>{bulkFillTool.name}</p>
            <input type="number" autoFocus placeholder="الدرجة" className={`w-full rounded-xl p-3 text-center text-lg font-black outline-none border mb-4 transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-gray-50 border-slate-200 focus:border-indigo-500 text-slate-800'}`} value={bulkScore} onChange={e => setBulkScore(e.target.value)} />
            <button onClick={handleBulkFill} className={`w-full py-3.5 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all ${isRamadan ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>تطبيق الرصد</button>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default GradeBook;
