
import React, { useState, useEffect } from 'react';
import { Student, GradeRecord, AssessmentTool } from '../types';
import { Plus, Search, X, Trash2, Settings, Check, FileSpreadsheet, Loader2, Info, Edit2, Download, AlertTriangle, Eye, UploadCloud, Printer, PieChart, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from './Modal';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext'; // Import Context
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

const GradeBook: React.FC<GradeBookProps> = ({ students, classes, onUpdateStudent, setStudents, currentSemester, onSemesterChange, teacherInfo }) => {
  const { theme, isLowPower } = useTheme();
  const { assessmentTools: tools, setAssessmentTools: setTools } = useApp(); 
  
  const [selectedClass, setSelectedClass] = useState(classes[0] || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddGrade, setShowAddGrade] = useState<{ student: Student } | null>(null);
  const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Bulk Import State
  const [isImporting, setIsImporting] = useState(false);

  // Tools Manager State
  const [showToolsManager, setShowToolsManager] = useState(false);

  const [isAddingTool, setIsAddingTool] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  
  // --- New State for Editing Tools ---
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
      toolBtn: 'rounded-xl border shadow-sm',
  };

  useEffect(() => {
     if (showAddGrade && !editingGrade) {
         setSelectedToolId('');
         setScore('');
     }
  }, [showAddGrade, editingGrade]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || s.classes?.includes(selectedClass);
    return matchesSearch && matchesClass;
  });

  const getSemesterGrades = (student: Student, sem: '1' | '2') => {
      return (student.grades || []).filter(g => {
          if (!g.semester) return sem === '1';
          return g.semester === sem;
      });
  };

  // --- Calculate Stats (Sum Only) ---
  const calculateStudentSemesterStats = (student: Student, sem: '1' | '2') => {
      const grades = getSemesterGrades(student, sem);
      
      let totalScore = 0;

      grades.forEach(g => {
          totalScore += Number(g.score) || 0;
      });

      return { totalScore };
  };

  // --- Grade Symbol Logic ---
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

  // --- Handlers ---

  const handleDeleteGrade = (gradeId: string) => {
    if(!showAddGrade) return;
    if(confirm('هل أنت متأكد من حذف هذه الدرجة؟')) {
        const updatedGrades = showAddGrade.student.grades.filter(g => g.id !== gradeId);
        const updatedStudent = { ...showAddGrade.student, grades: updatedGrades };
        onUpdateStudent(updatedStudent);
        setShowAddGrade({ student: updatedStudent });
    }
  };

  // --- Delete All Grades ---
  const handleDeleteAllGrades = () => {
    if (selectedClass === 'all') {
        alert('يرجى تحديد صف معين أولاً لحذف درجاته.');
        return;
    }

    const confirmMsg = `تحذير هام: سيتم حذف جميع درجات طلاب الصف (${selectedClass}) للفصل الدراسي (${currentSemester}).\n\nهل أنت متأكد؟`;

    if (confirm(confirmMsg)) {
        const updatedStudents = students.map(s => {
            if (!s.classes.includes(selectedClass)) {
                return s;
            }
            return {
                ...s,
                grades: s.grades.filter(g => {
                    const gSem = g.semester || '1';
                    return gSem !== currentSemester;
                })
            };
        });
        setStudents(updatedStudents);
        setEditingGrade(null);
        setShowAddGrade(null);
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
        maxScore: 0, // Disabled
        date: new Date().toISOString(),
        semester: currentSemester
    };
    let updatedGrades;
    if (editingGrade) {
        updatedGrades = student.grades.map(g => g.id === editingGrade.id ? newGrade : g);
    } else {
        const otherGrades = student.grades.filter(
            g => !(g.category === categoryName && (g.semester === currentSemester || (!g.semester && currentSemester === '1')))
        );
        updatedGrades = [newGrade, ...otherGrades];
    }
    const updatedStudent = { ...student, grades: updatedGrades };
    onUpdateStudent(updatedStudent);
    setShowAddGrade({ student: updatedStudent });
    setScore('');
    if (editingGrade) {
        setEditingGrade(null);
        setSelectedToolId('');
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];

          if (jsonData.length === 0) throw new Error("الملف فارغ");

          const cleanStr = (str: string) => String(str).trim().replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase();

          const headers = Object.keys(jsonData[0]);
          const nameKeywords = ['الاسم', 'name', 'student', 'الطالب', 'full name', 'اسم'];
          
          let nameKeyOriginal = headers.find(h => nameKeywords.some(kw => cleanStr(h).includes(kw)));
          if (!nameKeyOriginal && headers.length > 0) nameKeyOriginal = headers[0];
          
          if (!nameKeyOriginal) throw new Error("لم يتم العثور على عمود الاسم.");

          const nonGradeKeywords = ['phone', 'رقم', 'صف', 'class', 'grade', 'موبايل', 'هاتف', 'ولي', 'parent', 'gender', 'sex', 'type', 'id', 'date', '#'];
          const gradeKeys = headers.filter(h => {
              const cleanH = cleanStr(h);
              return h !== nameKeyOriginal && !nonGradeKeywords.some(kw => cleanH.includes(kw));
          });

          const newTools: AssessmentTool[] = [];
          gradeKeys.forEach(key => {
              const exists = tools.some(t => t.name.trim().toLowerCase() === key.trim().toLowerCase()) || newTools.some(t => t.name.trim().toLowerCase() === key.trim().toLowerCase());
              if (!exists) {
                  newTools.push({
                      id: Math.random().toString(36).substr(2, 9),
                      name: key.trim(),
                      maxScore: 0
                  });
              }
          });

          if (newTools.length > 0) {
              setTools(prev => [...prev, ...newTools]);
          }

          let updatedStudents = [...students];
          let matchedCount = 0;

          jsonData.forEach(row => {
              const studentName = String(row[nameKeyOriginal!] || '').trim();
              if (!studentName) return;

              const studentIndex = updatedStudents.findIndex(s => s.name.trim().toLowerCase() === studentName.toLowerCase());
              
              if (studentIndex !== -1) {
                  matchedCount++;
                  const student = updatedStudents[studentIndex];
                  const newGrades: GradeRecord[] = [];

                  Object.keys(row).forEach(rawKey => {
                      if (gradeKeys.includes(rawKey)) {
                          const scoreVal = row[rawKey];
                          if (scoreVal !== undefined && scoreVal !== '' && !isNaN(Number(scoreVal))) {
                              const existingGradeIndex = student.grades.findIndex(g => g.category === rawKey.trim() && g.semester === currentSemester);
                              if (existingGradeIndex === -1) {
                                  newGrades.push({
                                      id: Math.random().toString(36).substr(2, 9),
                                      subject: teacherInfo?.subject || 'General',
                                      category: rawKey.trim(),
                                      score: Number(scoreVal),
                                      maxScore: 0,
                                      date: new Date().toISOString(),
                                      semester: currentSemester
                                  });
                              }
                          }
                      }
                  });
                  
                  if (newGrades.length > 0) {
                      updatedStudents[studentIndex] = {
                          ...student,
                          grades: [...student.grades, ...newGrades]
                      };
                  }
              }
          });

          setStudents(updatedStudents);
          alert(`تم استيراد الدرجات لـ ${matchedCount} طالب بنجاح.`);

      } catch (err: any) {
          console.error(err);
          alert(`فشل الاستيراد: ${err.message}`);
      } finally {
          setIsImporting(false);
          if (e.target) e.target.value = '';
      }
  };

  // --- Export Logic ---

  const prepareClassStats = () => {
      const uniqueTools = new Set<string>();
      
      const rows = filteredStudents.map(s => {
          const semStats = calculateStudentSemesterStats(s, currentSemester);
          const grades = getSemesterGrades(s, currentSemester);
          grades.forEach(g => uniqueTools.add(g.category));

          return {
              name: s.name,
              grades: grades,
              total: semStats.totalScore,
              symbol: getGradeSymbol(semStats.totalScore)
          };
      });

      return { rows, uniqueTools: Array.from(uniqueTools) };
  };

  const handleExportGradeBook = async () => {
      const { rows, uniqueTools } = prepareClassStats();
      
      const data = rows.map(r => {
          const rowObj: any = { 
              'الاسم': r.name, 
              'الفصل': selectedClass === 'all' ? 'متعدد' : selectedClass 
          };
          
          uniqueTools.forEach(toolName => {
              const g = r.grades.find(gr => gr.category === toolName);
              rowObj[toolName] = g ? g.score : '-';
          });

          rowObj['المجموع'] = r.total;
          rowObj['الرمز'] = r.symbol;
          
          return rowObj;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `سجل_فصل_${currentSemester}`);
      XLSX.writeFile(wb, `سجل_الدرجات_${selectedClass}_ف${currentSemester}.xlsx`);
  };

  const handlePrintClassReport = async () => {
      setIsGeneratingPdf(true);
      const { rows, uniqueTools } = prepareClassStats();
      
      const element = document.createElement('div');
      element.setAttribute('dir', 'rtl');
      element.style.fontFamily = 'Tajawal, sans-serif';
      element.style.padding = '20px';
      element.style.backgroundColor = '#ffffff'; // Force white background
      element.style.color = '#000000'; // Force black text

      const thStyle = "border: 1px solid #000000 !important; padding: 8px; background-color: #f3f4f6 !important; font-weight: bold; font-size: 12px; color: #000000 !important;";
      const tdStyle = "border: 1px solid #000000 !important; padding: 8px; font-size: 12px; text-align: center; color: #000000 !important;";

      const toolHeaders = uniqueTools.map(t => {
          return `<th style="${thStyle}">${t}</th>`;
      }).join('');

      const studentRows = rows.map((r, i) => {
          const toolCells = uniqueTools.map(t => {
              const g = r.grades.find(gr => gr.category === t);
              return `<td style="${tdStyle}">${g ? g.score : '-'}</td>`;
          }).join('');
          
          return `<tr>
              <td style="${tdStyle}">${i + 1}</td>
              <td style="${tdStyle}; text-align: right;">${r.name}</td>
              ${toolCells}
              <td style="${tdStyle}; font-weight: bold;">${r.total}</td>
              <td style="${tdStyle}; font-weight: bold;">${r.symbol}</td>
          </tr>`;
      }).join('');

      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; color: #000000 !important;">
            <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">تقرير الأداء الفصلي لمادة ${teacherInfo?.subject || '.....'}</h2>
            <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; border-bottom: 2px solid #000000; padding-bottom: 15px; color: #000000 !important;">
                <span>المحافظة: ${teacherInfo?.governorate || '.....'}</span>
                <span>المدرسة: ${teacherInfo?.school || '.....'}</span>
                <span>المعلم: ${teacherInfo?.name || '.....'}</span>
                <span>الفصل الدراسي: ${currentSemester}</span>
                <span>الصف: ${selectedClass === 'all' ? 'متعدد' : selectedClass}</span>
            </div>
        </div>

        <h3 style="margin-bottom: 10px; font-size: 16px; font-weight: bold; color: #000000 !important;">كشف الدرجات</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; color: #000000 !important;">
            <thead>
                <tr>
                    <th style="${thStyle}; width: 40px;">#</th>
                    <th style="${thStyle}; text-align: right;">اسم الطالب</th>
                    ${toolHeaders}
                    <th style="${thStyle}; background-color: #e5e7eb;">المجموع</th>
                    <th style="${thStyle}; background-color: #e5e7eb;">الرمز</th>
                </tr>
            </thead>
            <tbody>
                ${studentRows}
            </tbody>
        </table>`;

      exportPDF(element, `سجل_درجات_${selectedClass}.pdf`, setIsGeneratingPdf);
  };

  const handleAddTool = () => {
    if (newToolName) {
        setTools(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: newToolName.trim(), maxScore: 0 }]);
        setNewToolName('');
        setIsAddingTool(false);
    } else {
        alert("الرجاء إدخال اسم الأداة");
    }
  };

  const handleDeleteTool = (toolId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الأداة؟')) {
        setTools(prev => prev.filter(t => t.id !== toolId));
    }
  };

  const startEditingTool = (tool: AssessmentTool) => {
      setEditingToolId(tool.id);
      setEditToolName(tool.name);
  };

  const saveToolChanges = () => {
      if (!editingToolId || !editToolName) return;
      
      const originalTool = tools.find(t => t.id === editingToolId);
      const originalName = originalTool?.name;

      if (!originalName) return;

      const confirmMsg = `تنبيه: سيتم تعديل الأداة "${originalName}" إلى "${editToolName}".\nهل أنت متأكد؟`;

      if (confirm(confirmMsg)) {
          setTools(prev => prev.map(t => t.id === editingToolId ? { ...t, name: editToolName.trim() } : t));

          const updatedStudents = students.map(s => {
              const updatedGrades = s.grades.map(g => {
                  if (g.category.trim() === originalName.trim()) {
                      return { ...g, category: editToolName.trim() };
                  }
                  return g;
              });
              return { ...s, grades: updatedGrades };
          });

          setStudents(updatedStudents);
          setEditingToolId(null);
          setEditToolName('');
      }
  };

  // Re-declare exportPDF inside component or move to util
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

  return (
    <div className="space-y-4 pb-20 text-slate-900 dark:text-white">
      {/* Header */}
      <div className={`${styles.header} p-4 rounded-[2rem] sticky top-0 z-20 transition-all`}>
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                         <FileSpreadsheet className="w-6 h-6" />
                     </div>
                     <div>
                         <h2 className="text-xl font-black text-slate-900 dark:text-white">سجل الدرجات</h2>
                         <p className="text-xs font-bold text-slate-500 dark:text-white/50">الفصل الدراسي {currentSemester === '1' ? 'الأول' : 'الثاني'}</p>
                     </div>
                 </div>
                 
                 <div className="flex gap-2">
                     <button onClick={() => setShowToolsManager(true)} className={`p-3 bg-slate-100 dark:bg-white/10 rounded-2xl text-slate-600 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors border border-gray-200 dark:border-white/5`}>
                         <Settings className="w-5 h-5" />
                     </button>
                     <button onClick={() => onSemesterChange(currentSemester === '1' ? '2' : '1')} className={`px-4 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/30 flex items-center gap-2`}>
                         <RefreshCwIcon className="w-3 h-3" />
                         تحويل للفصل {currentSemester === '1' ? '2' : '1'}
                     </button>
                 </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                 <div className="relative flex-1 min-w-[200px]">
                     <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400 dark:text-white/40" />
                     <input 
                        type="text" 
                        placeholder="بحث عن طالب..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-black/20 rounded-xl py-2.5 pr-9 pl-4 text-xs font-bold outline-none border border-gray-200 dark:border-white/10 focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors text-slate-900 dark:text-white"
                     />
                 </div>
                 <div className="flex gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                     <button onClick={() => setSelectedClass('all')} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all border ${selectedClass === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-white/60 border-gray-200 dark:border-white/10'} rounded-xl`}>الكل</button>
                     {classes.map(c => <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 text-[10px] font-bold whitespace-nowrap transition-all border ${selectedClass === c ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-white/60 border-gray-200 dark:border-white/10'} rounded-xl`}>{c}</button>)}
                 </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                <button onClick={handlePrintClassReport} title="طباعة التقرير" className="p-3 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-500/20 active:scale-95 transition-all">
                    {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin"/> : <Printer className="w-5 h-5"/>}
                </button>
                <button onClick={handleExportGradeBook} title="تصدير Excel" className="p-3 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-500/20 active:scale-95 transition-all">
                    <FileSpreadsheet className="w-5 h-5"/>
                </button>
                <label title="استيراد درجات" className="p-3 bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-500/20 active:scale-95 transition-all cursor-pointer">
                    {isImporting ? <Loader2 className="w-5 h-5 animate-spin"/> : <UploadCloud className="w-5 h-5"/>}
                    <input type="file" accept=".xlsx, .xls" onChange={handleBulkImport} disabled={isImporting} className="hidden" />
                </label>
                <button onClick={handleDeleteAllGrades} title="حذف الدرجات" className="p-3 bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-500/20 active:scale-95 transition-all">
                    <Trash2 className="w-5 h-5"/>
                </button>
            </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
          {filteredStudents.map(student => {
              const stats = calculateStudentSemesterStats(student, currentSemester);
              return (
                  <div key={student.id} onClick={() => setShowAddGrade({ student })} className={`relative group p-4 rounded-3xl transition-all cursor-pointer hover:shadow-md ${styles.card}`}>
                      <div className="flex items-start justify-between mb-3 w-full">
                          <div className="flex items-start gap-3 w-full">
                              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-slate-600 dark:text-white border border-gray-200 dark:border-white/10 shrink-0">
                                  {student.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                  <h3 className="font-black text-xs text-slate-800 dark:text-white leading-5 mb-0.5 break-words line-clamp-2" title={student.name}>
                                      {student.name}
                                  </h3>
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-white/40 block">{student.classes[0]}</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex justify-between items-end">
                          <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-slate-400 dark:text-white/40 font-bold">المجموع</span>
                              <div className="flex items-center gap-2">
                                  <span className="text-lg font-black text-slate-800 dark:text-white">{stats.totalScore}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${getSymbolColor(stats.totalScore)}`}>
                                      {getGradeSymbol(stats.totalScore)}
                                  </span>
                              </div>
                          </div>
                          <button className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                              <Edit2 className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              );
          })}
      </div>

      {/* Add/Edit Grade Modal */}
      <Modal isOpen={!!showAddGrade} onClose={() => { setShowAddGrade(null); setEditingGrade(null); }}>
          {showAddGrade && (
              <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                      <div>
                          <h3 className="font-black text-lg text-slate-900 dark:text-white">{showAddGrade.student.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-white/50 font-bold">إدارة الدرجات - {currentSemester === '1' ? 'الفصل الأول' : 'الفصل الثاني'}</p>
                      </div>
                      {editingGrade && <button onClick={() => { setEditingGrade(null); setScore(''); setSelectedToolId(''); }} className="text-xs text-blue-500 font-bold underline">إلغاء التعديل</button>}
                  </div>

                  {/* Input Area */}
                  <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                          {tools.map(tool => (
                              <button 
                                key={tool.id} 
                                onClick={() => handleToolClick(tool)} 
                                className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all whitespace-nowrap ${selectedToolId === tool.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-white/60 border-gray-200 dark:border-white/10'}`}
                              >
                                  {tool.name}
                              </button>
                          ))}
                          <button onClick={() => setShowToolsManager(true)} className="px-3 py-2 rounded-xl text-[10px] font-black border border-dashed border-gray-300 dark:border-white/20 text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> أداة
                          </button>
                      </div>

                      <div className="flex gap-3">
                           <div className="flex-1">
                               <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 mb-1 block">الدرجة</label>
                               <input type="number" value={score} onChange={e => setScore(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-black outline-none focus:border-indigo-500 text-slate-900 dark:text-white" placeholder="0" />
                           </div>
                      </div>

                      <button onClick={handleSaveGrade} disabled={!score} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all">
                          {editingGrade ? 'تحديث الدرجة' : 'رصد الدرجة'}
                      </button>
                  </div>

                  {/* Grades List */}
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
                      {getSemesterGrades(showAddGrade.student, currentSemester).length > 0 ? getSemesterGrades(showAddGrade.student, currentSemester).map(g => (
                          <div key={g.id} className={`flex items-center justify-between p-3 rounded-xl border ${editingGrade?.id === g.id ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5'}`}>
                              <div>
                                  <span className="block text-[10px] font-black text-slate-800 dark:text-white">{g.category}</span>
                                  <span className="text-[9px] text-slate-400 dark:text-white/40 font-bold">{new Date(g.date).toLocaleDateString('ar-EG')}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="text-sm font-black text-slate-900 dark:text-white">{g.score}</span>
                                  <div className="flex gap-1">
                                      <button onClick={() => handleEditGrade(g)} className="p-1.5 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDeleteGrade(g.id)} className="p-1.5 bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                              </div>
                          </div>
                      )) : <p className="text-center text-[10px] text-slate-400 dark:text-white/30 py-4 font-bold">لا توجد درجات مرصودة لهذا الفصل</p>}
                  </div>
              </div>
          )}
      </Modal>

      {/* Tools Manager Modal */}
      <Modal isOpen={showToolsManager} onClose={() => { setShowToolsManager(false); setEditingToolId(null); }}>
          <h3 className="font-black text-lg mb-4 text-slate-900 dark:text-white">إدارة أدوات التقويم</h3>
          
          <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl mb-4 border border-gray-200 dark:border-white/10">
              <h4 className="font-bold text-xs text-slate-600 dark:text-white/70 mb-3">إضافة أداة جديدة</h4>
              <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="اسم الأداة (مثال: اختبار قصير 1)" value={newToolName} onChange={e => setNewToolName(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-900 dark:text-white" />
              </div>
              <button onClick={handleAddTool} className="w-full bg-emerald-600 text-white py-2 rounded-xl text-xs font-black hover:bg-emerald-700 transition-colors">إضافة للقائمة</button>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {tools.map(tool => (
                  <div key={tool.id} className="flex justify-between items-center p-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl">
                      {editingToolId === tool.id ? (
                          <div className="flex-1 flex gap-2 items-center">
                              <input type="text" value={editToolName} onChange={e => setEditToolName(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 rounded-lg px-2 py-1 text-xs font-bold" autoFocus />
                              <button onClick={saveToolChanges} className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg"><Save className="w-4 h-4"/></button>
                              <button onClick={() => setEditingToolId(null)} className="p-1.5 bg-gray-100 dark:bg-white/10 text-gray-500 rounded-lg"><X className="w-4 h-4"/></button>
                          </div>
                      ) : (
                          <>
                            <div>
                                <span className="block text-xs font-black text-slate-800 dark:text-white">{tool.name}</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => startEditingTool(tool)} className="p-2 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteTool(tool.id)} className="p-2 text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </>
                      )}
                  </div>
              ))}
              {tools.length === 0 && <p className="text-center text-xs text-slate-400 dark:text-white/30">لا توجد أدوات مضافة</p>}
          </div>
      </Modal>

    </div>
  );
};

const RefreshCwIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
);

export default GradeBook;
