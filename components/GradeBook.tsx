import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, GradeRecord, AssessmentTool } from '../types';
import { 
  Plus, X, Trash2, Settings, Check, Loader2, Edit2, 
  FileSpreadsheet, FileUp, Wand2, BarChart3, SlidersHorizontal, 
  FileDown, PieChart, AlertTriangle, Download, Copy 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import * as XLSX from 'xlsx';
import { StudentAvatar } from './StudentAvatar';
import DrawerSheet from './DrawerSheet';

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
  // 🌍 محرك الترجمة والاتجاه
  const { assessmentTools, setAssessmentTools, t, dir } = useApp();
  const tools = useMemo(() => Array.isArray(assessmentTools) ? assessmentTools : [], [assessmentTools]);

  const [gradingSettings, setGradingSettings] = useState(() => {
    const saved = localStorage.getItem('rased_grading_settings');
    return saved ? JSON.parse(saved) : DEFAULT_GRADING_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('rased_grading_settings', JSON.stringify(gradingSettings));
  }, [gradingSettings]);

  const [selectedGrade, setSelectedGrade] = useState<string>(() => sessionStorage.getItem('rased_grade') || 'all');
  const [selectedClass, setSelectedClass] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');

  useEffect(() => {
      sessionStorage.setItem('rased_grade', selectedGrade);
      sessionStorage.setItem('rased_class', selectedClass);
  }, [selectedGrade, selectedClass]);

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  // States for Modals (Now Drawers)
  const [showToolsManager, setShowToolsManager] = useState(false);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editToolName, setEditToolName] = useState('');
  const [showDistModal, setShowDistModal] = useState(false);
  
  const [distTotal, setDistTotal] = useState<number>(gradingSettings.totalScore || 100);
  const [distFinalScore, setDistFinalScore] = useState<number>(gradingSettings.finalExamWeight || 40);
  
  // 🌟 فلترة ذكية لاسم الامتحان النهائي القادم من الذاكرة لكي يدعم الترجمة
  const finalExamNameRaw = gradingSettings.finalExamName || 'الامتحان النهائي';
  const isDefaultExamName = finalExamNameRaw === 'الامتحان النهائي' || finalExamNameRaw === 'Final Exam';
  const defaultFinalExamNameTranslated = isDefaultExamName ? t('finalExamNameDefault') : finalExamNameRaw;
  const [distFinalName, setDistFinalName] = useState<string>(defaultFinalExamNameTranslated);
  
  const [bulkFillTool, setBulkFillTool] = useState<AssessmentTool | null>(null);
  const [bulkScore, setBulkScore] = useState('');
  const [activeToolId, setActiveToolId] = useState<string>('');

  const isRamadan = true;

  useEffect(() => {
    if (tools.length > 0 && !activeToolId) {
      setActiveToolId(tools[0].id);
    }
  }, [tools, activeToolId]);

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
    if (dir === 'rtl') {
        if (percentage >= 90) return 'أ';
        if (percentage >= 80) return 'ب';
        if (percentage >= 65) return 'ج';
        if (percentage >= 50) return 'د';
        return 'هـ';
    } else {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 65) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }
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

  const handleDownloadTemplate = async () => {
    try {
      const headers = [t('nameLabel'), t('classLabelTemplate').replace(':', ''), ...tools.map(t => t.name)];
      const sampleRow: any = { [t('nameLabel')]: t('sampleStudentName'), [t('classLabelTemplate').replace(':', '')]: t('sampleClass') };
      tools.forEach(t => sampleRow[t.name] = '10');
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
      ws['!cols'] = [{ wch: 25 }, { wch: 10 }, ...tools.map(() => ({ wch: 15 }))];

      XLSX.utils.book_append_sheet(wb, ws, t('gradingTemplateSheetName'));
      const fileName = `Rased_Template.xlsx`;

      if (Capacitor.isNativePlatform()) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const result = await Filesystem.writeFile({ path: fileName, data: wbout, directory: Directory.Cache });
        await Share.share({ title: t('gradingTemplateTitle'), url: result.uri });
      } else {
        XLSX.writeFile(wb, fileName);
      }
      setShowMenu(false);
    } catch (e) {
      alert(t('errorDownloadingTemplate'));
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
      
      if (jsonData.length === 0) throw new Error(t('errorEmptyFile'));

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
                subject: teacherInfo?.subject || t('generalSubject'),
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
      
      alert(`${t('alertGradesImported1')} ${updatedCount} ${t('alertGradesImported2')}`);
      setShowMenu(false);
    } catch (error: any) { 
      alert(`${t('importErrorMsg')}: ` + error.message); 
    } finally { 
      setIsImporting(false); 
      if (e.target) e.target.value = ''; 
    }
  };

  const handleExportExcel = async () => {
    if (filteredStudents.length === 0) return alert(t('noStudentsToExport'));
    setIsExporting(true);
    
    try {
      const data = filteredStudents.map(student => {
        const row: any = { [t('nameLabel')]: student.name, [t('classLabelTemplate').replace(':', '')]: student.classes[0] || '' };
        const semGrades = getSemesterGrades(student, currentSemester);
        let total = 0;
        
        tools.forEach(tool => {
          const g = semGrades.find(grade => grade.category.trim() === tool.name.trim());
          row[tool.name] = g ? g.score : '';
          total += g ? Number(g.score) : 0;
        });
        
        row[t('excelTotal')] = total;
        row[t('excelGrade')] = getGradeSymbol(total);
        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, t('gradesSheetName'));
      
      const fileName = `Grades_Report_${currentSemester}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`;
      
      if (Capacitor.isNativePlatform()) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const result = await Filesystem.writeFile({ 
            path: fileName, 
            data: wbout, 
            directory: Directory.Cache 
        });
        await Share.share({ title: t('gradesReportTitle'), url: result.uri });
      } else { 
        XLSX.writeFile(wb, fileName); 
      }
      setShowMenu(false);
    } catch (e) {
        alert(t('exportError'));
    } finally { 
        setIsExporting(false); 
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    if (!activeToolId) return alert(t('alertSelectToolFirst'));
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
        subject: teacherInfo?.subject || t('subjectFallback'),
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

  const handleCopyContinuousTotal = () => {
    const gradesList = filteredStudents.map(student => {
        const semGrades = getSemesterGrades(student, currentSemester);
        let continuousTotal = 0;
        let hasAnyGrade = false;
        
        tools.forEach(tool => {
            if (!tool.isFinal) { 
                const g = semGrades.find(grade => grade.category.trim() === tool.name.trim());
                if (g && g.score !== null && g.score !== undefined && g.score !== '') {
                    continuousTotal += Number(g.score);
                    hasAnyGrade = true;
                }
            }
        });
        
        return hasAnyGrade ? continuousTotal.toString() : ''; 
    });
    
    const textToCopy = gradesList.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert(t('alertContinuousTotalCopied'));
    }).catch(() => alert(t('alertCopyError')));
  };

  const handleAddTool = () => {
    if (newToolName.trim()) {
      if (tools.some(t => t.name === newToolName.trim())) return alert(t('alertToolExists'));
      const newTool: AssessmentTool = { id: Math.random().toString(36).substr(2, 9), name: newToolName.trim(), maxScore: 0 };
      setAssessmentTools([...tools, newTool]);
      setNewToolName('');
      setIsAddingTool(false);
      setActiveToolId(newTool.id);
    }
  };

  const handleDeleteTool = (id: string) => {
    if (confirm(t('confirmDeleteTool'))) {
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
    alert(t('alertDistributionSaved'));
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
          subject: teacherInfo?.subject || t('subjectFallback'), 
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
    if (confirm(`${t('confirmClearGradesWarning1')} ${currentSemester}${t('confirmClearGradesWarning2')}`)) {
      setStudents(prev => prev.map(s => ({
          ...s,
          grades: (s.grades || []).filter(g => (g.semester || '1') !== currentSemester)
      })));
      setShowMenu(false);
    }
  };

  // 🌍 تطبيق الـ dir
  return (
   <div className={`flex flex-col h-full space-y-6 pb-24 md:pb-8 overflow-hidden relative ${isRamadan ? 'text-white' : 'text-slate-800'} ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
            
  <header 
    className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent ${isRamadan ? 'text-white' : 'text-slate-800'}`}
    style={{ WebkitAppRegion: 'drag' } as any}
>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-1.5 rounded-xl border border-white/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg md:text-2xl font-black tracking-wide">{t('gradeBookTitle')}</h1>
            <button 
                onClick={() => setShowToolsManager(true)} 
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-95 border border-white/10 cursor-pointer relative z-50" 
                title={t('manageTools')}
                style={{ WebkitAppRegion: 'no-drag' } as any}
            >
              <Settings className="w-4 h-4 text-white" />
            </button>
          </div>
          
          <div className="relative z-[9999]" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button onClick={() => setShowMenu(!showMenu)} className={`cursor-pointer relative z-50 p-2 rounded-xl border border-white/20 active:scale-95 transition-all ${showMenu ? (isRamadan ? 'bg-white/20 text-white' : 'bg-white text-[#1e3a8a]') : 'bg-white/10 text-white'}`}>
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-full mt-2 w-64 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in zoom-in-95 origin-top-left ${isRamadan ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
                  <div className="p-1">
                    <button onClick={() => { setShowDistModal(true); setShowMenu(false); }} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} border-b ${isRamadan ? 'hover:bg-white/5 border-white/10' : 'hover:bg-slate-50 border-slate-50'}`}>
                      <PieChart className={`w-4 h-4 ${isRamadan ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <div className="flex flex-col items-start text-xs font-bold">
                        <span className={isRamadan ? 'text-indigo-100' : 'text-slate-800'}>{t('gradeDistributionSettings')}</span>
                        <span className={`text-[9px] ${isRamadan ? 'text-indigo-200/60' : 'text-slate-400'}`}>{t('setFinalGradeAndWeight')}</span>
                      </div>
                    </button>

                    <button onClick={handleDownloadTemplate} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} border-b ${isRamadan ? 'hover:bg-white/5 border-white/10' : 'hover:bg-slate-50 border-slate-50'}`}>
                      <FileSpreadsheet className={`w-4 h-4 ${isRamadan ? 'text-amber-400' : 'text-amber-600'}`} />
                      <span className={`text-xs font-bold ${isRamadan ? 'text-indigo-100' : 'text-slate-700'}`}>{t('downloadEmptyTemplate')}</span>
                    </button>

                    <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} ${isRamadan ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                      {isImporting ? <Loader2 className={`w-4 h-4 animate-spin ${isRamadan ? 'text-emerald-400' : 'text-emerald-600'}`} /> : <FileUp className={`w-4 h-4 ${isRamadan ? 'text-emerald-400' : 'text-emerald-600'}`} />}
                      <span className={`text-xs font-bold ${isRamadan ? 'text-indigo-100' : 'text-slate-700'}`}>{t('importFromExcel')}</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />

                    <button onClick={handleExportExcel} disabled={isExporting} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} ${isRamadan ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                      {isExporting ? <Loader2 className={`w-4 h-4 animate-spin ${isRamadan ? 'text-blue-400' : 'text-blue-600'}`} /> : <FileDown className={`w-4 h-4 ${isRamadan ? 'text-blue-400' : 'text-blue-600'}`} />}
                      <span className={`text-xs font-bold ${isRamadan ? 'text-indigo-100' : 'text-slate-700'}`}>{t('exportReport')}</span>
                    </button>

                    <button onClick={handleClearGrades} className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} border-t ${isRamadan ? 'hover:bg-rose-500/20 text-rose-400 border-white/10' : 'hover:bg-red-50 text-red-600 border-slate-50'}`}>
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs font-bold">{t('resetSemesterGrades')}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ✅ الحاوية للخطوط الثلاثة */}
        <div className="space-y-3 relative z-50 w-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
          
          {/* ================= 1. كبسولة الفصول والصفوف (مدمجة) ================= */}
          <div className="w-full overflow-x-auto no-scrollbar pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className={`inline-flex items-center p-1.5 rounded-full border backdrop-blur-md transition-all ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                  
                  {/* زر (الكل) */}
                  <button 
                      onClick={() => { setSelectedGrade('all'); setSelectedClass('all'); }} 
                      className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedGrade === 'all' && selectedClass === 'all' ? (isRamadan ? 'bg-white/15 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-sm') : (isRamadan ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-800')}`}
                  >
                      {t('allGradesList')}
                  </button>

                  {/* أزرار الصفوف (Grades) */}
                  {availableGrades.map(g => (
                      <React.Fragment key={`grade-${g}`}>
                          <div className={`w-[1px] h-5 mx-1.5 rounded-full shrink-0 ${isRamadan ? 'bg-white/10' : 'bg-slate-300'}`} />
                          <button 
                              onClick={() => { setSelectedGrade(g); setSelectedClass('all'); }} 
                              className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedGrade === g && selectedClass === 'all' ? (isRamadan ? 'bg-white/15 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-sm') : (isRamadan ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-800')}`}
                          >
                              {t('gradePrefix')} {g}
                          </button>
                      </React.Fragment>
                  ))}

                  {/* أزرار الفصول (Classes) */}
                  {visibleClasses.map(c => (
                      <React.Fragment key={`class-${c}`}>
                          <div className={`w-[1px] h-5 mx-1.5 rounded-full shrink-0 ${isRamadan ? 'bg-white/10' : 'bg-slate-300'}`} />
                          <button 
                              onClick={() => setSelectedClass(c)} 
                              className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedClass === c ? (isRamadan ? 'bg-white/15 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-sm') : (isRamadan ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-800')}`}
                          >
                              {c}
                          </button>
                      </React.Fragment>
                  ))}
              </div>
          </div>

          {/* ================= 2. كبسولة أدوات التقويم (Tools) ================= */}
          <div className="w-full overflow-x-auto no-scrollbar pb-1 mt-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className={`inline-flex items-center p-1.5 rounded-full border backdrop-blur-md transition-all ${isRamadan ? 'bg-indigo-900/30 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'}`}>
                  {tools.map((tool, index) => (
                      <React.Fragment key={tool.id}>
                          {index > 0 && <div className={`w-[1px] h-5 mx-1.5 rounded-full shrink-0 ${isRamadan ? 'bg-indigo-500/30' : 'bg-indigo-200'}`} />}
                          <button 
                              onClick={() => setActiveToolId(tool.id)} 
                              className={`relative px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all duration-300 ${activeToolId === tool.id ? (isRamadan ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-indigo-600 text-white shadow-md') : (isRamadan ? 'text-indigo-200/70 hover:text-white hover:bg-white/5' : 'text-indigo-600/70 hover:text-indigo-900 hover:bg-indigo-100/50')}`}
                          >
                              {activeToolId === tool.id && <Check className="w-3.5 h-3.5" />}
                              {tool.isFinal && <span className="text-amber-400">★</span>}
                              {tool.name}
                          </button>
                      </React.Fragment>
                  ))}
                  {tools.length === 0 && (
                      <span className={`px-4 py-2 text-xs font-bold ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`}>{t('noToolsAdded')}</span>
                  )}
              </div>
          </div>

          <div className={`grid grid-cols-3 gap-2 mt-2 p-2 rounded-xl border ${isRamadan ? 'bg-black/20 border-white/10' : 'bg-white/10 border-white/20 shadow-inner'}`}>
            {tools.length > 0 && (
              <button 
                onClick={handleCopyContinuousTotal} 
                className={`py-2 px-1 text-white rounded-lg text-[9px] md:text-[10px] font-bold flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-colors text-center ${isRamadan ? 'bg-amber-600/80 hover:bg-amber-500' : 'bg-amber-500 hover:bg-amber-600'}`}
                title={t('copyContinuousTotalTitle')}
              >
                <Copy className="w-3.5 h-3.5 mb-0.5" /> {t('continuousAssessment')}
              </button>
            )}

            {activeToolId && (
              <>
                <button 
                  onClick={() => {
                    const tool = tools.find(t => t.id === activeToolId);
                    if (!tool) return;
                    
                    const gradesList = filteredStudents.map(student => {
                      const grade = getStudentGradeForActiveTool(student);
                      return grade !== '' ? grade : ''; 
                    });
                    
                    const textToCopy = gradesList.join('\n');
                    navigator.clipboard.writeText(textToCopy).then(() => {
                      alert(`${t('alertToolCopied1')}${tool.name}${t('alertToolCopied2')}`);
                    }).catch(() => alert(t('alertCopyError')));
                  }} 
                  className={`py-2 px-1 text-white rounded-lg text-[9px] md:text-[10px] font-bold flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-colors text-center ${isRamadan ? 'bg-emerald-600/80 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                >
                  <Copy className="w-3.5 h-3.5 mb-0.5" /> {t('copyTool')}
                </button>

                <button onClick={() => setBulkFillTool(tools.find(t => t.id === activeToolId) || null)} className={`py-2 px-1 text-white rounded-lg text-[9px] md:text-[10px] font-bold flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-colors text-center ${isRamadan ? 'bg-indigo-600/80 hover:bg-indigo-500' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                  <Wand2 className="w-3.5 h-3.5 mb-0.5" /> {t('bulkFill')}
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-28 custom-scrollbar relative z-10">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filteredStudents.map(student => {
            const currentGrade = getStudentGradeForActiveTool(student);
            const semGrades = getSemesterGrades(student, currentSemester);
            const totalScore = semGrades.reduce((acc, curr) => acc + (curr.score || 0), 0);
            const symbolColor = getSymbolColor(totalScore, isRamadan);

            return (
              <div key={student.id} className={`rounded-2xl p-2 shadow-sm border flex flex-col items-center relative transition-colors ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                <StudentAvatar gender={student.gender} className={`w-10 h-10 mb-1.5 border-2 shadow-sm ${isRamadan ? 'border-indigo-900/50' : 'border-white'}`} />
                
                <h3 className={`font-bold text-[10px] leading-[1.2] text-center break-words mb-2 w-full min-h-[30px] flex items-center justify-center ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
                  {student.name}
                </h3>
                
                <div className={`flex items-center justify-center gap-1.5 mb-2 w-full py-1 rounded-lg border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                    <span className={`text-sm font-black ${isRamadan ? symbolColor.split(' ')[0] : symbolColor.replace('bg-', 'text-').replace('50', '600')}`}>{totalScore}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${symbolColor}`}>{getGradeSymbol(totalScore)}</span>
                </div>
                
                <div className="w-full relative mt-auto">
                    <input 
                        type="tel" 
                        maxLength={3} 
                        value={currentGrade} 
                        onChange={e => handleGradeChange(student.id, e.target.value)} 
                        placeholder="-" 
                        className={`w-full h-8 rounded-lg text-center font-black text-sm outline-none border-2 transition-all ${isRamadan ? 'bg-[#1e293b] border-white/20 focus:border-amber-400 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 focus:border-indigo-400 text-slate-800'}`} 
                    />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🌟 1. اللوحة المنزلقة: إدارة أدوات التقويم */}
      <DrawerSheet isOpen={showToolsManager} onClose={() => { setShowToolsManager(false); setIsAddingTool(false); }} isRamadan={isRamadan} dir={dir} mode="side">
        <div className="flex flex-col h-full w-full">
          <div className={`flex justify-between items-center mb-6 pb-2 border-b shrink-0 ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
            <h3 className="font-black text-lg">{t('assessmentToolsTitle')}</h3>
          </div>
          
          {!isAddingTool ? (
            <>
              <button onClick={() => setIsAddingTool(true)} className={`w-full py-3.5 mb-4 rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 ${isRamadan ? 'bg-indigo-600/80 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                <Plus className="w-4 h-4" /> {t('addNewTool')}
              </button>
              
              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar p-1">
                {tools.length > 0 ? (
                  tools.map(tool => (
                    <div key={tool.id} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm group transition-colors ${isRamadan ? 'bg-[#1e293b] border-white/10' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        {tool.isFinal && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isRamadan ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>{t('final')}</span>}
                        <span className={`text-xs font-bold ${isRamadan ? 'text-indigo-100' : 'text-slate-700'}`}>{tool.name}</span>
                      </div>
                      <div className="flex gap-1">
                        {!tool.isFinal && <button onClick={() => handleDeleteTool(tool.id)} className={`p-1.5 rounded-lg transition-colors ${isRamadan ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-50 text-rose-500'}`}><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                  ))
                ) : <p className={`text-xs py-4 font-bold ${isRamadan ? 'text-slate-500' : 'text-gray-400'}`}>{t('noToolsAdded')}</p>}
              </div>
            </>
          ) : (
            <div className="animate-in fade-in zoom-in duration-200 flex flex-col h-full">
              <input autoFocus placeholder={t('toolNamePlaceholder')} value={newToolName} onChange={e => setNewToolName(e.target.value)} className={`w-full p-4 rounded-2xl mb-4 font-bold text-sm outline-none border transition-colors shrink-0 ${isRamadan ? 'bg-[#1e293b] border-indigo-500/30 focus:border-indigo-400 text-white placeholder:text-indigo-200/40' : 'bg-gray-50 border-slate-200 focus:border-indigo-500 text-slate-800'}`} />
              <div className="flex gap-2 mt-auto pt-4 shrink-0">
                <button onClick={() => setIsAddingTool(false)} className={`flex-1 py-3 font-bold text-xs rounded-xl transition-colors ${isRamadan ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-slate-500 hover:bg-gray-200'}`}>{t('closeBtn') || 'إلغاء'}</button>
                <button onClick={handleAddTool} className={`flex-[2] py-3 font-black text-xs rounded-xl shadow-lg transition-colors ${isRamadan ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>{t('saveTool')}</button>
              </div>
            </div>
          )}
        </div>
      </DrawerSheet>

      {/* 🌟 2. اللوحة المنزلقة: إعدادات توزيع الدرجات */}
      <DrawerSheet isOpen={showDistModal} onClose={() => setShowDistModal(false)} isRamadan={isRamadan} dir={dir} mode="side">
        <div className="flex flex-col h-full w-full">
          <div className={`flex justify-between items-center mb-6 pb-2 border-b shrink-0 ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
             <h3 className={`font-black text-lg ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{t('gradeDistributionSettings')}</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-4">
            <div className={`p-4 rounded-2xl border ${isRamadan ? 'bg-[#1e293b] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <label className={`block text-${dir === 'rtl' ? 'right' : 'left'} text-xs font-black mb-2 ${isRamadan ? 'text-indigo-200' : 'text-slate-700'}`}>{t('totalSubjectScoreLabel')}</label>
              <input type="number" value={distTotal} onChange={e => setDistTotal(Number(e.target.value))} className={`w-full p-3 border rounded-xl text-center font-black text-lg outline-none transition-colors ${isRamadan ? 'bg-[#0f172a] border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-white border-gray-200 focus:border-indigo-500'}`} />
            </div>
             <div className={`p-4 rounded-2xl border ${isRamadan ? 'bg-[#1e293b] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <label className={`block text-${dir === 'rtl' ? 'right' : 'left'} text-xs font-black mb-2 ${isRamadan ? 'text-indigo-200' : 'text-slate-700'}`}>{t('finalExamScoreLabel')}</label>
              <input type="number" value={distFinalScore} onChange={e => setDistFinalScore(Number(e.target.value))} className={`w-full p-3 border rounded-xl text-center font-black text-lg outline-none transition-colors ${isRamadan ? 'bg-[#0f172a] border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-white border-gray-200 focus:border-indigo-500'}`} />
              <p className={`text-[10px] mt-2 font-bold text-${dir === 'rtl' ? 'right' : 'left'} ${isRamadan ? 'text-slate-400' : 'text-gray-400'}`}>{t('finalExamNote')}</p>
            </div>
             <div className={`p-4 rounded-2xl border ${isRamadan ? 'bg-[#1e293b] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <label className={`block text-${dir === 'rtl' ? 'right' : 'left'} text-xs font-black mb-2 ${isRamadan ? 'text-indigo-200' : 'text-slate-700'}`}>{t('finalExamNameLabel')}</label>
              <input type="text" value={distFinalName} onChange={e => setDistFinalName(e.target.value)} className={`w-full p-3 border rounded-xl text-center font-bold text-sm outline-none transition-colors ${isRamadan ? 'bg-[#0f172a] border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-white border-gray-200 focus:border-indigo-500'}`} placeholder={t('finalExamNameExample')} />
            </div>
            <div className={`flex items-center justify-between p-4 rounded-xl border ${isRamadan ? 'bg-[#1e293b] border-white/10' : 'bg-blue-50 border-blue-100'}`}>
              <div className="text-center flex-1"><span className={`block text-xs font-bold mb-1 ${isRamadan ? 'text-blue-300' : 'text-blue-600'}`}>{t('continuousAssessment')}</span><span className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{distTotal - distFinalScore}</span></div>
              <div className={`text-xl font-black mx-2 ${isRamadan ? 'text-slate-600' : 'text-slate-300'}`}>+</div>
              <div className="text-center flex-1"><span className={`block text-xs font-bold mb-1 ${isRamadan ? 'text-blue-300' : 'text-blue-600'}`}>{t('final')}</span><span className={`text-xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{distFinalScore}</span></div>
              <div className={`text-xl font-black mx-2 ${isRamadan ? 'text-slate-600' : 'text-slate-300'}`}>=</div>
              <div className="text-center flex-1"><span className={`block text-xs font-bold mb-1 ${isRamadan ? 'text-blue-300' : 'text-blue-600'}`}>{distTotal}</span></div>
            </div>
          </div>
          
          <div className={`pt-4 mt-auto border-t shrink-0 ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
            <button onClick={handleSaveDistribution} className={`w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all ${isRamadan ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-[#1e3a8a] hover:bg-[#172554] text-white'}`}>{t('saveDistribution')}</button>
          </div>
        </div>
      </DrawerSheet>

      {/* 🌟 3. اللوحة المنزلقة: التعبئة السريعة (Bulk Fill) */}
      <DrawerSheet isOpen={!!bulkFillTool} onClose={() => { setBulkFillTool(null); setBulkScore(''); }} isRamadan={isRamadan} dir={dir} mode="bottom">
        {bulkFillTool && (
          <div className="flex flex-col items-center justify-center text-center h-full pb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border shrink-0 ${isRamadan ? 'bg-indigo-900/50 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-500 border-indigo-100'}`}><Wand2 className="w-8 h-8" /></div>
            <h3 className={`font-black text-xl mb-2 ${isRamadan ? 'text-white' : 'text-slate-900'}`}>{t('bulkFill')}</h3>
            <p className={`text-xs font-bold mb-6 inline-block px-3 py-1.5 rounded-lg ${isRamadan ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>{bulkFillTool.name}</p>
            
            <div className="w-full mt-auto space-y-4 shrink-0">
                <input type="number" autoFocus placeholder={t('score')} className={`w-full rounded-xl p-4 text-center text-xl font-black outline-none border transition-colors ${isRamadan ? 'bg-[#1e293b] border-white/10 focus:border-indigo-400 text-white' : 'bg-gray-50 border-slate-200 focus:border-indigo-500 text-slate-800'}`} value={bulkScore} onChange={e => setBulkScore(e.target.value)} />
                <button onClick={handleBulkFill} className={`w-full py-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all ${isRamadan ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>{t('applyBulkFill')}</button>
            </div>
          </div>
        )}
      </DrawerSheet>

    </div>
  );
};

export default GradeBook;
