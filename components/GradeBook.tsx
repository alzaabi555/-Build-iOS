
import React, { useState, useEffect, useMemo } from 'react';
import { Student, GradeRecord, AssessmentTool } from '../types';
import { Plus, Search, X, Trash2, Settings, Check, Loader2, Edit2, Printer } from 'lucide-react';
import Modal from './Modal';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

declare var html2pdf: any;

interface GradeBookProps {
  students: Student[];
  classes: string[];
  onUpdateStudent: (s: Student) => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  currentSemester: '1' | '2';
  onSemesterChange: (sem: '1' | '2') => void;
  teacherInfo?: { name: string; school: string; subject: string; governorate: string };
}

const GradeBook: React.FC<GradeBookProps> = ({ 
    students = [], 
    classes = [], 
    onUpdateStudent, 
    setStudents, 
    currentSemester, 
    onSemesterChange, 
    teacherInfo 
}) => {
  const { theme, isLowPower } = useTheme();
  const contextData = useApp();
  
  // Safe Access to Context Data
  const assessmentTools = contextData?.assessmentTools || [];
  const setAssessmentTools = contextData?.setAssessmentTools || (() => {});
  
  const tools = useMemo(() => Array.isArray(assessmentTools) ? assessmentTools : [], [assessmentTools]);

  const [selectedClass, setSelectedClass] = useState(() => {
      if (Array.isArray(classes) && classes.length > 0) return classes[0];
      return 'all';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddGrade, setShowAddGrade] = useState<{ student: Student } | null>(null);
  const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [showToolsManager, setShowToolsManager] = useState(false);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editToolName, setEditToolName] = useState('');

  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [score, setScore] = useState('');

  const styles = {
      card: isLowPower 
        ? 'bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl'
        : 'bg-white dark:bg-white/5 p-3 rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 backdrop-blur-md',
      pill: 'rounded-xl',
      header: isLowPower
        ? 'bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-gray-800'
        : 'bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm backdrop-blur-xl',
  };

  useEffect(() => {
     if (showAddGrade && !editingGrade) {
         setSelectedToolId('');
         setScore('');
     }
  }, [showAddGrade, editingGrade]);

  // --- Strict Filtering & Safety Checks ---
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(s => {
      // Critical check to prevent crash on bad data
      if (!s || typeof s !== 'object') return false;
      
      const name = String(s.name || '').toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      
      const studentClasses = Array.isArray(s.classes) ? s.classes : [];
      const matchesClass = selectedClass === 'all' || studentClasses.includes(selectedClass);
      
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  const getSemesterGrades = (student: Student, sem: '1' | '2') => {
      if (!student || !Array.isArray(student.grades)) return [];
      return student.grades.filter(g => {
          if (!g.semester) return sem === '1'; // Default to sem 1 if undefined
          return g.semester === sem;
      });
  };

  const calculateStudentSemesterStats = (student: Student, sem: '1' | '2') => {
      const grades = getSemesterGrades(student, sem);
      let totalScore = 0;
      grades.forEach(g => {
          totalScore += Number(g.score) || 0;
      });
      return { totalScore };
  };

  const getGradeSymbol = (score: number) => {
      if (score >= 90) return 'أ';
      if (score >= 80) return 'ب';
      if (score >= 65) return 'ج';
      if (score >= 50) return 'د';
      return 'هـ';
  };

  const getSymbolColor = (score: number) => {
      if (score >= 90) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
      if (score >= 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
      if (score >= 65) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
      if (score >= 50) return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
      return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
  };

  const handleAddTool = () => {
      if (newToolName.trim()) {
          const newTool: AssessmentTool = {
              id: Math.random().toString(36).substr(2, 9),
              name: newToolName.trim(),
              maxScore: 0
          };
          setAssessmentTools([...tools, newTool]);
          setNewToolName('');
          setIsAddingTool(false);
      }
  };

  const handleDeleteTool = (id: string) => {
      if (confirm('هل أنت متأكد من حذف هذه الأداة؟ لن يتم حذف الدرجات المرصودة سابقاً.')) {
          setAssessmentTools(tools.filter(t => t.id !== id));
      }
  };

  const startEditingTool = (tool: AssessmentTool) => {
      setEditingToolId(tool.id);
      setEditToolName(tool.name);
  };

  const saveEditedTool = () => {
      if (editingToolId && editToolName.trim()) {
          const updatedTools = tools.map(t => 
              t.id === editingToolId ? { ...t, name: editToolName.trim() } : t
          );
          setAssessmentTools(updatedTools);
          setEditingToolId(null);
          setEditToolName('');
      }
  };

  const cancelEditingTool = () => {
      setEditingToolId(null);
      setEditToolName('');
  };

  const handleDeleteGrade = (gradeId: string) => {
    if(!showAddGrade) return;
    if(confirm('هل أنت متأكد من حذف هذه الدرجة؟')) {
        const updatedGrades = showAddGrade.student.grades.filter(g => g.id !== gradeId);
        const updatedStudent = { ...showAddGrade.student, grades: updatedGrades };
        onUpdateStudent(updatedStudent);
        setShowAddGrade({ student: updatedStudent });
    }
  };

  const handleDeleteAllGrades = () => {
    if (selectedClass === 'all') {
        alert('يرجى تحديد صف معين أولاً لحذف درجاته.');
        return;
    }

    if (confirm(`تحذير هام: سيتم حذف جميع درجات طلاب الصف (${selectedClass}) للفصل الدراسي (${currentSemester}).\n\nهل أنت متأكد؟`)) {
        const updatedStudents = students.map(s => {
            if (!s.classes || !s.classes.includes(selectedClass)) return s;
            return {
                ...s,
                grades: (s.grades || []).filter(g => {
                    const gSem = g.semester || '1';
                    return gSem !== currentSemester;
                })
            };
        });
        setStudents(updatedStudents);
    }
  };

  const handleEditGrade = (grade: GradeRecord) => {
      setEditingGrade(grade);
      setScore(grade.score.toString());
      const tool = tools.find(t => t.name.trim() === grade.category.trim());
      setSelectedToolId(tool ? tool.id : '');
  };

  const handleToolClick = (tool: AssessmentTool) => {
      setSelectedToolId(tool.id);
  };

  const handleSaveGrade = () => {
    if (!showAddGrade || score === '') return;
    
    const student = showAddGrade.student;
    let categoryName = 'درجة عامة';
    
    if (selectedToolId) {
        const tool = tools.find(t => t.id === selectedToolId);
        if (tool) categoryName = tool.name;
    } else if (editingGrade) {
        categoryName = editingGrade.category;
    }
    
    const newGrade: GradeRecord = {
        id: editingGrade ? editingGrade.id : Math.random().toString(36).substr(2, 9),
        subject: teacherInfo?.subject || 'المادة',
        category: categoryName,
        score: Number(score),
        maxScore: 0,
        date: new Date().toISOString(),
        semester: currentSemester
    };
    let updatedGrades;
    if (editingGrade) {
        updatedGrades = (student.grades || []).map(g => g.id === editingGrade.id ? newGrade : g);
    } else {
        const otherGrades = (student.grades || []).filter(
            g => !(g.category === categoryName && (g.semester === currentSemester || (!g.semester && currentSemester === '1')))
        );
        updatedGrades = [newGrade, ...otherGrades];
    }
    const updatedStudent = { ...student, grades: updatedGrades };
    onUpdateStudent(updatedStudent);
    setShowAddGrade({ student: updatedStudent });
    setScore('');
    setEditingGrade(null);
  };

  // --- PDF Export Logic ---
  const getBase64Image = async (url: string): Promise<string> => {
      try {
          const response = await fetch(url);
          if (!response.ok) return "";
          const blob = await response.blob();
          return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const result = reader.result as string;
                  if (result && result.startsWith('data:')) resolve(result);
                  else resolve("");
              };
              reader.onerror = () => resolve("");
              reader.readAsDataURL(blob);
          });
      } catch (error) { return ""; }
  };

  const exportPDF = async (element: HTMLElement, filename: string, setLoader: (val: boolean) => void) => {
    setLoader(true);
    const opt = {
        margin: 5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    if (typeof html2pdf !== 'undefined') {
        try {
            const worker = html2pdf().set(opt).from(element).toPdf();
            if (Capacitor.isNativePlatform()) {
                 const pdfBase64 = await worker.output('datauristring');
                 const base64Data = pdfBase64.split(',')[1];
                 const result = await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Cache });
                 await Share.share({ title: filename, url: result.uri, dialogTitle: 'مشاركة/حفظ' });
            } else {
                 const pdfBlob = await worker.output('blob');
                 const url = URL.createObjectURL(pdfBlob);
                 const link = document.createElement('a');
                 link.href = url; link.download = filename; link.target = "_blank";
                 document.body.appendChild(link); link.click();
                 setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 2000);
            }
        } catch (err) { console.error('PDF Error:', err); } finally { setLoader(false); }
    } else { alert('مكتبة PDF غير جاهزة'); setLoader(false); }
  };

  const handlePrintGradeReport = async () => {
      if (filteredStudents.length === 0) return alert('لا يوجد طلاب');
      setIsGeneratingPdf(true);
      
      const teacherName = localStorage.getItem('teacherName') || '................';
      const schoolName = localStorage.getItem('schoolName') || '................';
      const subjectName = localStorage.getItem('subjectName') || '................';
      let emblemSrc = await getBase64Image('oman_logo.png') || await getBase64Image('icon.png');

      const rows = filteredStudents.map((s, i) => {
          const semGrades = getSemesterGrades(s, currentSemester);
          const stats = calculateStudentSemesterStats(s, currentSemester);
          const sName = s.name || '';
          
          const toolCells = tools.map(tool => {
              const grade = semGrades.find(g => g.category === tool.name);
              return `<td style="border:1px solid #000; padding:5px; text-align:center;">${grade ? grade.score : '-'}</td>`;
          }).join('');

          return `
            <tr>
                <td style="border:1px solid #000; padding:5px; text-align:center;">${i + 1}</td>
                <td style="border:1px solid #000; padding:5px; text-align:right;">${sName}</td>
                ${toolCells}
                <td style="border:1px solid #000; padding:5px; text-align:center; font-weight:bold;">${stats.totalScore}</td>
                <td style="border:1px solid #000; padding:5px; text-align:center;">${getGradeSymbol(stats.totalScore)}</td>
            </tr>
          `;
      }).join('');

      const toolHeaders = tools.map(t => `<th style="border:1px solid #000; padding:5px; background:#f3f4f6;">${t.name}</th>`).join('');

      const element = document.createElement('div');
      element.setAttribute('dir', 'rtl');
      element.style.fontFamily = 'Tajawal, sans-serif';
      element.style.padding = '20px';
      element.style.color = '#000';
      element.style.background = '#fff';

      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            ${emblemSrc ? `<img src="${emblemSrc}" style="height: 60px; margin-bottom: 10px;" />` : ''}
            <h2 style="margin:0; font-size:20px; font-weight:bold;">سجل درجات الطلاب - الفصل الدراسي ${currentSemester}</h2>
            <div style="display:flex; justify-content:space-between; margin-top:15px; border-bottom:2px solid #000; padding-bottom:10px; font-weight:bold; font-size:12px;">
                <span>المدرسة: ${schoolName}</span>
                <span>المعلم: ${teacherName}</span>
                <span>المادة: ${subjectName}</span>
                <span>الصف: ${selectedClass === 'all' ? 'جميع الفصول' : selectedClass}</span>
            </div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10px;">
            <thead>
                <tr>
                    <th style="border:1px solid #000; padding:5px; background:#f3f4f6; width:30px;">#</th>
                    <th style="border:1px solid #000; padding:5px; background:#f3f4f6; width:20%;">الاسم</th>
                    ${toolHeaders}
                    <th style="border:1px solid #000; padding:5px; background:#f3f4f6; width:50px;">المجموع</th>
                    <th style="border:1px solid #000; padding:5px; background:#f3f4f6; width:40px;">التقدير</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
      `;

      exportPDF(element, `سجل_الدرجات_${selectedClass}.pdf`, setIsGeneratingPdf);
  };

  return (
    <div className="space-y-4 pb-20 text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className={`p-4 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 ${styles.header}`}>
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex bg-gray-100 dark:bg-white/10 rounded-xl p-1 shrink-0">
                    <button onClick={() => onSemesterChange('1')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${currentSemester === '1' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-white/50'}`}>فصل 1</button>
                    <button onClick={() => onSemesterChange('2')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${currentSemester === '2' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-white/50'}`}>فصل 2</button>
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">سجل الدرجات</h2>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-white/50">{filteredStudents.length} طالب • {tools.length} أدوات تقويم</p>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1">
                 <button onClick={() => setShowToolsManager(true)} className={`px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-[10px] font-black flex items-center gap-1 transition-all ${styles.pill}`}>
                     <Settings className="w-3.5 h-3.5" /> أدوات
                 </button>
                 <button onClick={handlePrintGradeReport} disabled={isGeneratingPdf} className={`px-3 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-[10px] font-black flex items-center gap-1 transition-all ${styles.pill}`}>
                     {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} طباعة
                 </button>
                 {classes.length > 0 && (
                     <>
                        <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
                        <button onClick={() => setSelectedClass('all')} className={`px-3 py-2 text-[10px] font-black whitespace-nowrap transition-all ${selectedClass === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-white dark:bg-white/5 text-slate-500 dark:text-white/60'} ${styles.pill}`}>الكل</button>
                        {classes.map(c => (
                            <button key={c} onClick={() => setSelectedClass(c)} className={`px-3 py-2 text-[10px] font-black whitespace-nowrap transition-all ${selectedClass === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-white/5 text-slate-500 dark:text-white/60'} ${styles.pill}`}>{c}</button>
                        ))}
                     </>
                 )}
            </div>
        </div>

        {/* Search */}
        <div className="relative">
             <input type="text" placeholder="بحث عن طالب..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 pr-10 pl-4 text-xs font-bold outline-none focus:border-indigo-500/50" />
             <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
        </div>

        {/* Data Table */}
        <div className={`${styles.card} overflow-hidden`}>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[600px]">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-white/5">
                            <th className="p-3 text-right text-[10px] font-black text-slate-400 dark:text-white/40 w-10">#</th>
                            <th className="p-3 text-right text-[10px] font-black text-slate-400 dark:text-white/40 min-w-[150px]">الطالب</th>
                            {tools.map(t => (
                                <th key={t.id} className="p-3 text-center text-[10px] font-black text-indigo-500 dark:text-indigo-400 whitespace-nowrap">{t.name}</th>
                            ))}
                            <th className="p-3 text-center text-[10px] font-black text-slate-400 dark:text-white/40 w-20">المجموع</th>
                            <th className="p-3 text-center text-[10px] font-black text-slate-400 dark:text-white/40 w-16">التقدير</th>
                            <th className="p-3 text-center text-[10px] font-black text-slate-400 dark:text-white/40 w-16">رصد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
                            const semGrades = getSemesterGrades(student, currentSemester);
                            const stats = calculateStudentSemesterStats(student, currentSemester);
                            const displayName = student.name || 'غير معروف';
                            const initial = displayName.charAt(0) || '?';
                            
                            return (
                                <tr key={student.id || idx} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-3 text-[10px] font-bold text-slate-400 dark:text-white/30">{idx + 1}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-white">{initial}</div>
                                            <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[120px]">{displayName}</span>
                                        </div>
                                    </td>
                                    
                                    {tools.map(tool => {
                                        const grade = semGrades.find(g => g.category === tool.name);
                                        return (
                                            <td key={tool.id} className="p-3 text-center">
                                                {grade ? (
                                                    <span className="inline-block px-2 py-0.5 rounded-md bg-white dark:bg-black/20 border border-gray-100 dark:border-white/10 text-xs font-black shadow-sm">{grade.score}</span>
                                                ) : <span className="text-slate-200 dark:text-white/10 text-[10px]">-</span>}
                                            </td>
                                        );
                                    })}

                                    <td className="p-3 text-center"><span className="text-xs font-black text-slate-800 dark:text-white">{stats.totalScore}</span></td>
                                    <td className="p-3 text-center">
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${getSymbolColor(stats.totalScore)}`}>
                                            {getGradeSymbol(stats.totalScore)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => setShowAddGrade({ student })} className="w-7 h-7 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-lg flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-500/20 active:scale-95 transition-all">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={5 + tools.length} className="p-8 text-center text-xs text-slate-400 dark:text-white/30 font-bold">لا يوجد طلاب مطابقين</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Tools Manager Modal */}
        <Modal isOpen={showToolsManager} onClose={() => setShowToolsManager(false)} className="rounded-[28px] max-w-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-slate-900 dark:text-white">إدارة أدوات التقويم</h3>
                <button onClick={() => setShowToolsManager(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20"><X className="w-4 h-4 text-slate-500"/></button>
            </div>
            
            <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-2xl mb-4 border border-gray-100 dark:border-white/5 max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                {tools.length > 0 ? tools.map(tool => (
                    <div key={tool.id} className="bg-white dark:bg-white/5 p-3 rounded-xl flex items-center justify-between border border-gray-100 dark:border-white/5 group">
                        {editingToolId === tool.id ? (
                            <div className="flex items-center gap-2 w-full">
                                <input autoFocus type="text" value={editToolName} onChange={e => setEditToolName(e.target.value)} className="flex-1 bg-slate-50 dark:bg-black/20 border-none rounded-lg px-2 py-1 text-xs font-bold outline-none" />
                                <button onClick={saveEditedTool} className="p-1.5 bg-emerald-500 text-white rounded-lg"><Check className="w-3 h-3"/></button>
                                <button onClick={cancelEditingTool} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X className="w-3 h-3"/></button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-white">{tool.name}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditingTool(tool)} className="p-1.5 text-blue-500 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-100"><Edit2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleDeleteTool(tool.id)} className="p-1.5 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-lg hover:bg-rose-100"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            </>
                        )}
                    </div>
                )) : <p className="text-center text-[10px] text-slate-400 py-4">أضف أدوات تقويم مثل: اختبار قصير، واجب..</p>}
            </div>

            {/* Add New Tool */}
            {!isAddingTool ? (
                <button onClick={() => setIsAddingTool(true)} className="w-full py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100 dark:border-indigo-500/20">
                    <Plus className="w-4 h-4" /> إضافة أداة جديدة
                </button>
            ) : (
                <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <input autoFocus type="text" placeholder="اسم الأداة (مثال: اختبار 1)" value={newToolName} onChange={e => setNewToolName(e.target.value)} className="flex-1 bg-slate-50 dark:bg-black/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-3 text-xs font-bold outline-none text-slate-900 dark:text-white" />
                    <button onClick={handleAddTool} className="bg-indigo-600 text-white px-4 rounded-xl"><Check className="w-4 h-4"/></button>
                    <button onClick={() => setIsAddingTool(false)} className="bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/50 px-4 rounded-xl"><X className="w-4 h-4"/></button>
                </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <button onClick={handleDeleteAllGrades} className="w-full py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all border border-rose-100 dark:border-rose-500/20">
                    <Trash2 className="w-4 h-4" /> تصفير درجات الفصل ({currentSemester})
                </button>
            </div>
        </Modal>

        {/* Grade Input Modal */}
        <Modal isOpen={!!showAddGrade} onClose={() => { setShowAddGrade(null); setEditingGrade(null); setScore(''); }} className="rounded-[28px] max-w-sm">
            {showAddGrade && (
                <>
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-black text-slate-700 dark:text-white shadow-inner">
                            {(showAddGrade.student.name || '?').charAt(0)}
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{showAddGrade.student.name || 'طالب غير معروف'}</h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-white/50">{editingGrade ? 'تعديل درجة' : 'رصد درجة جديدة'}</p>
                    </div>

                    <div className="space-y-4">
                        {/* Tool Selector */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 block">اختر الأداة</label>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                {tools.length > 0 ? tools.map(tool => (
                                    <button 
                                        key={tool.id} 
                                        onClick={() => handleToolClick(tool)}
                                        className={`p-2 rounded-xl text-[10px] font-black transition-all border ${selectedToolId === tool.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white/60 border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/10'}`}
                                    >
                                        {tool.name}
                                    </button>
                                )) : <p className="col-span-2 text-center text-[10px] text-red-400 bg-red-50 p-2 rounded-lg">يجب إضافة أدوات تقويم أولاً</p>}
                            </div>
                        </div>

                        {/* Score Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 block">الدرجة</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    autoFocus
                                    placeholder="0" 
                                    value={score} 
                                    onChange={e => setScore(e.target.value)} 
                                    className="w-full bg-slate-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 rounded-2xl py-4 text-center text-2xl font-black outline-none text-slate-900 dark:text-white placeholder:text-slate-300" 
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                             {editingGrade && (
                                 <button onClick={() => handleDeleteGrade(editingGrade.id)} className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
                                     <Trash2 className="w-5 h-5" />
                                 </button>
                             )}
                             <button 
                                onClick={handleSaveGrade} 
                                disabled={!score || (!selectedToolId && !editingGrade)}
                                className="flex-1 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none py-4"
                             >
                                 حفظ الدرجة
                             </button>
                        </div>

                        {/* Recent Grades List */}
                        <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-white/40 mb-2">سجل درجات الطالب (فصل {currentSemester})</h4>
                            <div className="flex flex-wrap gap-2">
                                {getSemesterGrades(showAddGrade.student, currentSemester).map(g => (
                                    <button 
                                        key={g.id} 
                                        onClick={() => handleEditGrade(g)}
                                        className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors group"
                                    >
                                        <span className="text-[9px] text-slate-400 dark:text-white/40 font-bold">{g.category}</span>
                                        <span className="text-xs font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-black/20 px-1.5 rounded">{g.score}</span>
                                    </button>
                                ))}
                                {getSemesterGrades(showAddGrade.student, currentSemester).length === 0 && <p className="text-[9px] text-slate-300">لا توجد درجات</p>}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </Modal>

    </div>
  );
};

export default GradeBook;
