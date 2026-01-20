import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, GradeRecord, AssessmentTool } from '../types';
import { Plus, X, Trash2, Settings, Check, Loader2, Edit2, FileSpreadsheet, FileUp, Wand2, Menu, Filter, ChevronDown, Download, AlertTriangle, Calculator } from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import * as XLSX from 'xlsx';

interface GradeBookProps {
  students: Student[];
  classes: string[];
  onUpdateStudent: (s: Student) => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  currentSemester: '1' | '2';
  onSemesterChange: (sem: '1' | '2') => void;
  teacherInfo?: { name: string; school: string; subject: string; governorate: string };
}

// الإعدادات الافتراضية (يمكن للمعلم تغييرها)
const DEFAULT_GRADING_SETTINGS = {
    totalScore: 100,
    finalExamWeight: 40, // 40 للأساسي (5-9)، يمكن تغييره لـ 60 أو 70 أو 0
    finalExamName: 'الامتحان النهائي' // يمكن تغييره لـ "المشروع" أو غيره
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
  
  // --- Grading Settings State (Local Persistence) ---
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

  // Save settings whenever they change
  useEffect(() => {
      localStorage.setItem('rased_grading_settings', JSON.stringify(gradingSettings));
  }, [gradingSettings]);

  const styles = {
      card: `bg-white border border-slate-100 rounded-[1.5rem] hover:border-blue-200 hover:shadow-md transition-all duration-300 relative overflow-hidden shadow-sm group`,
      pill: 'rounded-xl border border-slate-200 shadow-sm hover:shadow-md',
  };

  useEffect(() => {
     if (showAddGrade && !editingGrade) { setSelectedToolId(''); setScore(''); }
  }, [showAddGrade, editingGrade]);

  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      students.forEach(s => { if (s.grade) grades.add(s.grade); else if (s.classes[0]) { const match = s.classes[0].match(/^(\d+)/); if (match) grades.add(match[1]); } });
      return Array.from(grades).sort();
  }, [students, classes]);

  const visibleClasses = useMemo(() => { if (selectedGrade === 'all') return classes; return classes.filter(c => c.startsWith(selectedGrade)); }, [classes, selectedGrade]);
  const cleanText = (text: string) => { if (!text) return ''; return String(text).trim(); };
  const normalizeText = (text: string) => { if (!text) return ''; return String(text).trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ـ]/g, ''); };
  const extractNumericScore = (val: any): number | null => { if (val === undefined || val === null || val === '') return null; const strVal = String(val).trim(); const cleanNum = strVal.replace(/[^0-9.]/g, ''); const num = Number(cleanNum); return isNaN(num) || cleanNum === '' ? null : num; };

  // --- نظام الرموز (ثابت لجميع المراحل) ---
  const getGradeSymbol = (score: number) => {
      // التأكد من النسبة المئوية إذا كانت الدرجة الكلية ليست 100
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
      if (selectedGrade !== 'all') { matchesGrade = s.grade === selectedGrade || (s.classes[0] && s.classes[0].startsWith(selectedGrade)); }
      return matchesClass && matchesGrade;
    });
  }, [students, selectedClass, selectedGrade]);

  const getSemesterGrades = (student: Student, sem: '1' | '2') => { 
      if (!student || !Array.isArray(student.grades)) return []; 
      return student.grades.filter(g => { if (!g.semester) return sem === '1'; return g.semester === sem; }); 
  };

  // ... (Tool Management Functions: handleAddTool, handleDeleteTool, etc. - Kept Same) ...
  const handleAddTool = () => { if (newToolName.trim()) { const finalName = cleanText(newToolName); if (tools.some(t => t.name === finalName)) { alert('هذه الأداة موجودة بالفعل'); return; } const newTool: AssessmentTool = { id: Math.random().toString(36).substr(2, 9), name: finalName, maxScore: 0 }; setAssessmentTools([...tools, newTool]); setNewToolName(''); setIsAddingTool(false); } };
  const handleDeleteTool = (id: string) => { if (confirm('هل أنت متأكد من حذف هذه الأداة؟')) { setAssessmentTools(tools.filter(t => t.id !== id)); } };
  const startEditingTool = (tool: AssessmentTool) => { setEditingToolId(tool.id); setEditToolName(tool.name); };
  const saveEditedTool = () => { if (editingToolId && editToolName.trim()) { const updatedTools = tools.map(t => t.id === editingToolId ? { ...t, name: cleanText(editToolName) } : t ); setAssessmentTools(updatedTools); setEditingToolId(null); setEditToolName(''); } };
  const cancelEditingTool = () => { setEditingToolId(null); setEditToolName(''); };

  // ... (Grade CRUD: handleDeleteGrade, handleEditGrade, handleSaveGrade, handleBulkFill, handleClearGrades - Kept Same) ...
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
          // استخدام الإعدادات الديناميكية
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

              // عمود المجموع المستمر الديناميكي
              row[`المجموع (${continuousWeight})`] = continuousSum;

              let finalScore = 0;
              if (finalWeight > 0) {
                  // إذا كان هناك امتحان نهائي بوزن أكبر من 0
                  const grade = semGrades.find(g => g.category.trim() === finalExamName);
                  finalScore = grade ? Number(grade.score) : 0;
                  
                  // إذا لم يجد الأداة (لأن المعلم لم يضفها بعد)، نضع عموداً فارغاً
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
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300">
            
            <div className="flex justify-between items-center mb-6 mt-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight">سجل الدرجات</h1>
                    {/* زر إعدادات الوزن الجديد */}
                    <button onClick={() => setShowGradingSettingsModal(true)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors" title="إعدادات توزيع الدرجات">
                        <Calculator className="w-5 h-5 text-blue-200" />
                    </button>
                </div>
                
                <div className="relative">
                    <button onClick={() => setShowMenuDropdown(!showMenuDropdown)} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all shadow-sm border border-white/10">
                        <Menu className="w-6 h-6" />
                    </button>
                    {/* القائمة المنسدلة (كما هي) */}
                    {showMenuDropdown && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenuDropdown(false)}></div>
                            <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden origin-top-left z-50 animate-in zoom-in-95 duration-200">
                                <div className="flex flex-col py-1">
                                    <button onClick={() => { fileInputRef.current?.click(); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-right w-full group text-slate-800">
                                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin text-[#1e3a8a]" /> : <FileUp className="w-4 h-4 text-[#1e3a8a]" />}
                                        <span className="text-xs font-bold">استيراد درجات (Excel)</span>
                                    </button>
                                    <button onClick={() => { handleExportExcel(); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 text-right w-full group text-slate-800">
                                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-[#1e3a8a]" /> : <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" />}
                                        <span className="text-xs font-bold">تصدير إلى Excel</span>
                                    </button>
                                    <button onClick={() => { setShowToolsManager(true); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-50 text-right w-full group text-slate-800">
                                        <Settings className="w-4 h-4 text-[#1e3a8a]" />
                                        <span className="text-xs font-bold">إعدادات أدوات التقويم</span>
                                    </button>
                                    <button onClick={() => { handleClearGrades(); setShowMenuDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50 transition-colors border-t border-slate-50 text-right w-full group text-rose-600">
                                        <Trash2 className="w-4 h-4 text-rose-600" />
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
                        <Wand2 className="w-3.5 h-3.5" /> رصد {tool.name}
                    </button>
                )) : (
                    <span className="text-[10px] text-blue-200 font-bold px-2 py-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> قم بإضافة أدوات من القائمة</span>
                )}
            </div>
        </div>

        {/* ================= Content List ================= */}
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
                    <div className="grid grid-cols-1 gap-3">
                        {filteredStudents.map((student) => {
                            const semGrades = getSemesterGrades(student, currentSemester);
                            const totalScore = semGrades.reduce((sum, g) => sum + (Number(g.score) || 0), 0);
                            return (
                                <div key={student.id} onClick={() => setShowAddGrade({ student })} className={`${styles.card} p-4 flex items-center justify-between cursor-pointer active:scale-[0.99]`}>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center font-bold text-slate-400 overflow-hidden shadow-inner border border-gray-200 group-hover:border-indigo-200 transition-colors">
                                            {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover"/> : student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors">{student.name}</h3>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                {tools.slice(0, 3).map(tool => {
                                                    const grade = semGrades.find(g => g.category.trim() === tool.name.trim());
                                                    return (<span key={tool.id} className="text-[9px] px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-bold">{tool.name}: <span className="text-indigo-600">{grade ? grade.score : '-'}</span></span>)
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-inner group-hover:bg-white transition-colors relative z-10 min-w-[60px]">
                                        <span className={`block text-xl font-black ${getSymbolColor(totalScore).split(' ')[0]}`}>{totalScore}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{getGradeSymbol(totalScore)}</span>
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

        {/* --- Grading Settings Modal (New Feature) --- */}
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

        {/* ... Other Modals (Add Grade, Tools, Bulk Fill) are kept same ... */}
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
                    <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-500 shadow-sm border border-indigo-100"><Wand2 className="w-7 h-7" /></div>
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
