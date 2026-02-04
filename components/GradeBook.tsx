
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, GradeRecord, AssessmentTool } from '../types';
import { Plus, X, Trash2, Settings, Check, Loader2, Edit2, FileSpreadsheet, FileUp, Wand2, BarChart3, SlidersHorizontal, FileDown, PieChart } from 'lucide-react';
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

const GradeBook: React.FC<GradeBookProps> = ({ 
    students = [], 
    classes = [], 
    onUpdateStudent, 
    setStudents, 
    currentSemester, 
    onSemesterChange, 
    teacherInfo 
}) => {
  const { assessmentTools, setAssessmentTools, gradeSettings, setGradeSettings } = useApp();
  const tools = useMemo(() => Array.isArray(assessmentTools) ? assessmentTools : [], [assessmentTools]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Menu State
  const [showMenu, setShowMenu] = useState(false);

  // Tools Logic
  const [showToolsManager, setShowToolsManager] = useState(false);
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editToolName, setEditToolName] = useState('');
  
  // Distribution Logic
  const [showDistModal, setShowDistModal] = useState(false);
  const [distTotal, setDistTotal] = useState(gradeSettings.totalScore || 100);
  const [distFinalScore, setDistFinalScore] = useState(gradeSettings.finalExamScore || 40);
  const [distFinalName, setDistFinalName] = useState(gradeSettings.finalExamName || 'الامتحان النهائي');

  // Bulk Fill
  const [bulkFillTool, setBulkFillTool] = useState<AssessmentTool | null>(null);
  const [bulkScore, setBulkScore] = useState('');

  // Active Tool Selection for Quick Grading
  const [activeToolId, setActiveToolId] = useState<string>('');

  useEffect(() => {
      // Set first tool as active by default if available
      if (tools.length > 0 && !activeToolId) {
          setActiveToolId(tools[0].id);
      }
  }, [tools]);

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

  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(s => {
      if (!s || typeof s !== 'object') return false;
      const matchesClass = selectedClass === 'all' || (s.classes && s.classes.includes(selectedClass));
      let matchesGrade = true;
      if (selectedGrade !== 'all') {
          matchesGrade = s.grade === selectedGrade || (s.classes[0] && s.classes[0].startsWith(selectedGrade));
      }
      return matchesClass && matchesGrade;
    });
  }, [students, selectedClass, selectedGrade]);

  // --- Grade Handling ---
  const handleGradeChange = (studentId: string, value: string) => {
      if (!activeToolId) return alert('الرجاء اختيار أداة تقويم من الأعلى أولاً');
      
      const activeTool = tools.find(t => t.id === activeToolId);
      if (!activeTool) return;

      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const numValue = value === '' ? null : Number(value);
      if (numValue !== null && isNaN(numValue)) return; // Reject non-numbers

      // Update student grades
      let updatedGrades = [...(student.grades || [])];
      
      // Remove existing grade for this tool/semester
      updatedGrades = updatedGrades.filter(g => !(g.category.trim() === activeTool.name.trim() && (g.semester || '1') === currentSemester));

      if (numValue !== null) {
          updatedGrades.push({
              id: Math.random().toString(36).substr(2, 9),
              subject: teacherInfo?.subject || 'المادة',
              category: activeTool.name,
              score: numValue,
              maxScore: 0, // Could link to tool maxScore
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
      
      const grade = (student.grades || []).find(g => g.category.trim() === activeTool.name.trim() && (g.semester || '1') === currentSemester);
      return grade ? grade.score.toString() : '';
  };

  const cleanText = (text: string) => String(text || '').trim();
  const normalizeText = (text: string) => String(text || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ـ]/g, ''); 

  // --- Tool Management Handlers ---
  const handleAddTool = () => { 
      if (newToolName.trim()) { 
          const finalName = cleanText(newToolName);
          if (tools.some(t => t.name === finalName)) { alert('هذه الأداة موجودة بالفعل'); return; }
          const newTool = { id: Math.random().toString(36).substr(2, 9), name: finalName, maxScore: 0 }; 
          setAssessmentTools([...tools, newTool]); 
          setNewToolName(''); 
          setIsAddingTool(false); 
          setActiveToolId(newTool.id); // Switch to new tool
      } 
  };

  const handleDeleteTool = (id: string) => { if (confirm('هل أنت متأكد من حذف هذه الأداة؟')) { setAssessmentTools(tools.filter(t => t.id !== id)); if(activeToolId === id) setActiveToolId(''); } };
  const startEditingTool = (tool: AssessmentTool) => { setEditingToolId(tool.id); setEditToolName(tool.name); };
  const saveEditedTool = () => { if (editingToolId && editToolName.trim()) { setAssessmentTools(tools.map(t => t.id === editingToolId ? { ...t, name: cleanText(editToolName) } : t )); setEditingToolId(null); setEditToolName(''); } };
  const cancelEditingTool = () => { setEditingToolId(null); setEditToolName(''); };

  // --- Distribution Settings Handler ---
  const handleSaveDistribution = () => {
      // 1. Update Context Settings
      setGradeSettings({
          totalScore: distTotal,
          finalExamScore: distFinalScore,
          finalExamName: distFinalName
      });

      // 2. Manage the Final Exam Tool
      let newTools = [...tools];
      // Try to find existing final tool by isFinal flag OR by name
      let finalToolIndex = newTools.findIndex(t => t.isFinal === true);
      
      if (finalToolIndex === -1) {
          // Fallback: search by current name
          finalToolIndex = newTools.findIndex(t => t.name.trim() === distFinalName.trim());
      }

      if (finalToolIndex !== -1) {
          // Update existing
          newTools[finalToolIndex] = {
              ...newTools[finalToolIndex],
              name: distFinalName,
              maxScore: distFinalScore,
              isFinal: true
          };
      } else {
          // Create new
          newTools.push({
              id: Math.random().toString(36).substr(2, 9),
              name: distFinalName,
              maxScore: distFinalScore,
              isFinal: true
          });
      }

      setAssessmentTools(newTools);
      setShowDistModal(false);
      alert('تم اعتماد توزيع الدرجات وتحديث أدوات التقويم ✅');
  };

  // --- Bulk & File Handlers ---
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
          const existingGrades = student.grades || [];
          const keptGrades = existingGrades.filter(g => {
              const gSem = g.semester || '1';
              const gName = (g.category || '').trim();
              return !(gSem === safeSemester && gName === toolName);
          });
          const newGrade: GradeRecord = {
              id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              subject: teacherInfo?.subject || 'المادة',
              category: toolName,
              score: numericScore,
              maxScore: bulkFillTool.maxScore || 0,
              date: new Date().toISOString(),
              semester: safeSemester
          };
          return { ...student, grades: [newGrade, ...keptGrades] };
      }));
      setBulkFillTool(null);
      setBulkScore('');
      alert('تم الرصد الجماعي بنجاح! ✅');
  };

  const handleClearGrades = () => {
      const targetClassText = selectedClass === 'all' ? 'جميع الطلاب' : `طلاب فصل ${selectedClass}`;
      if (confirm(`هل أنت متأكد من حذف جميع الدرجات المسجلة لـ ${targetClassText} في الفصل الدراسي ${currentSemester}؟`)) {
          setStudents(prev => prev.map(s => {
              const matches = selectedClass === 'all' || (s.classes || []).includes(selectedClass);
              if (matches) {
                  return { ...s, grades: (s.grades || []).filter(g => (g.semester || '1') !== currentSemester) };
              }
              return s;
          }));
          alert('تم حذف درجات الفصل المحدد بنجاح');
      }
  };

  // --- Real Import Logic (RESTORED & FIXED) ---
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (tools.length === 0) {
          alert('يرجى إضافة أدوات تقويم أولاً لتتمكن من استيراد الدرجات إليها');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      setIsImporting(true);
      try {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

          if (jsonData.length === 0) throw new Error('الملف فارغ');

          const headers = Object.keys(jsonData[0]);
          const nameKeywords = ['الاسم', 'اسم الطالب', 'name', 'student', 'الطالب'];
          
          let nameKey = headers.find(h => nameKeywords.some(k => normalizeText(h) === normalizeText(k)));
          if (!nameKey) {
             nameKey = headers.find(h => nameKeywords.some(k => h.includes(k)));
          }

          if (!nameKey) throw new Error('لم يتم العثور على عمود الاسم');

          // Map headers to tools objects
          const toolMapping: { [header: string]: AssessmentTool } = {};
          
          tools.forEach(tool => {
              const tName = normalizeText(tool.name);
              // Try to find header that matches tool name
              const header = headers.find(h => {
                  const hName = normalizeText(h);
                  return hName === tName || hName.includes(tName);
              });
              
              if (header) {
                  toolMapping[header] = tool;
              }
          });

          if (Object.keys(toolMapping).length === 0) {
              throw new Error('لم يتم العثور على أي أعمدة تطابق أدوات التقويم الموجودة');
          }

          // Build update map for faster processing
          const updatesMap = new Map<string, { tool: AssessmentTool, score: number }[]>();

          jsonData.forEach(row => {
              const rawName = row[nameKey!];
              if (!rawName) return;
              const normalizedName = normalizeText(String(rawName));
              
              const studentUpdates: { tool: AssessmentTool, score: number }[] = [];
              
              Object.entries(toolMapping).forEach(([header, tool]) => {
                  const val = row[header];
                  if (val !== undefined && val !== "" && val !== null) {
                      const numVal = parseFloat(String(val));
                      if (!isNaN(numVal)) {
                          studentUpdates.push({ tool, score: numVal });
                      }
                  }
              });
              
              if (studentUpdates.length > 0) {
                  updatesMap.set(normalizedName, studentUpdates);
              }
          });

          setStudents(prevStudents => {
              const newStudents = prevStudents.map(student => {
                  const sName = normalizeText(student.name);
                  const updates = updatesMap.get(sName);
                  
                  if (updates) {
                      let newGrades = [...(student.grades || [])];
                      
                      updates.forEach(({ tool, score }) => {
                          // Update or Add grade
                          newGrades = newGrades.filter(g => !(g.category === tool.name && (g.semester || '1') === currentSemester));
                          newGrades.push({
                              id: Math.random().toString(36).substr(2, 9),
                              subject: teacherInfo?.subject || 'المادة',
                              category: tool.name,
                              score: score,
                              maxScore: tool.maxScore || 0,
                              date: new Date().toISOString(),
                              semester: currentSemester
                          });
                      });
                      
                      return { ...student, grades: newGrades };
                  }
                  return student;
              });
              return newStudents;
          });

          // Calculate counts for alert
          const estimatedCount = students.filter(s => updatesMap.has(normalizeText(s.name))).length;
          alert(`تم استيراد الدرجات بنجاح لـ ${estimatedCount} طالب ✅`);

      } catch (error: any) {
          console.error(error);
          alert('خطأ في الاستيراد: ' + error.message);
      } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleExportExcel = async () => {
      // (Simplified logic for now)
      alert('سيتم تفعيل التصدير قريباً');
  };

  return (
    <div className="flex flex-col h-full text-slate-800">
        
        {/* 2️⃣ New Royal Blue Header (Updated with Dropdown) */}
        <header className="bg-[#1e3a8a] text-white pt-8 pb-6 px-6 rounded-b-[2.5rem] shadow-lg relative z-30 -mx-4 -mt-4 mb-4">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wide">سجل الدرجات</h1>
                    
                    {/* زر الإعدادات المباشر بجانب العنوان */}
                    <button onClick={() => setShowToolsManager(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-95 border border-white/10" title="إدارة الأدوات">
                        <Settings className="w-4 h-4 text-white" />
                    </button>
                </div>
                
                <div className="relative">
                    <button 
                        onClick={() => setShowMenu(!showMenu)} 
                        className={`bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 active:scale-95 transition-all ${showMenu ? 'bg-white text-[#1e3a8a]' : 'text-white'}`}
                    >
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

                                    {/* Added Grade Distribution Button */}
                                    <button onClick={() => { setShowDistModal(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right group border-b border-slate-50">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                            <PieChart className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-xs font-bold text-slate-800">إعدادات توزيع الدرجات</span>
                                            <span className="text-[9px] text-slate-400">تحديد الدرجة النهائية</span>
                                        </div>
                                    </button>

                                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <FileUp className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">استيراد درجات</span>
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />

                                    <button onClick={handleExportExcel} disabled={isExporting} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                             <FileDown className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">تصدير التقرير</span>
                                    </button>

                                    <div className="my-1 border-t border-slate-100"></div>

                                    <button onClick={handleClearGrades} className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors w-full text-right group">
                                         <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                         </div>
                                        <span className="text-xs font-bold text-red-600">تصفير الدرجات</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Hierarchical Filters */}
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
                
                {/* Assessment Tools Quick Bar (Selection) */}
                <div className="overflow-x-auto no-scrollbar flex gap-2 pt-1 pb-1">
                    {tools.length > 0 ? tools.map(tool => (
                        <button 
                            key={tool.id}
                            onClick={() => setActiveToolId(tool.id)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap border flex items-center gap-1.5 active:scale-95 shadow-sm transition-all ${activeToolId === tool.id ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'} ${tool.isFinal ? 'border-amber-400/50' : ''}`}
                        >
                            {activeToolId === tool.id && <Check className="w-3 h-3" />}
                            {tool.isFinal && <span className="text-amber-400 ml-1">★</span>}
                            {tool.name}
                        </button>
                    )) : (
                        <span className="text-[10px] text-blue-200 font-bold px-2 py-2">قم بإضافة أدوات تقويم للبدء</span>
                    )}
                    {activeToolId && (
                        <button onClick={() => { setBulkFillTool(tools.find(t => t.id === activeToolId) || null); setBulkScore(''); }} className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-[10px] font-bold border border-indigo-400 shadow-sm ml-auto flex items-center gap-1">
                            <Wand2 className="w-3 h-3" /> رصد جماعي
                        </button>
                    )}
                </div>
            </div>
        </header>

        {/* Content - Vertical Grid Cards */}
        <div className="flex-1 overflow-y-auto px-2 pb-20 custom-scrollbar pt-2">
            {filteredStudents.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                    {filteredStudents.map((student) => {
                        const currentGrade = getStudentGradeForActiveTool(student);
                        
                        // Style based on grade presence/value
                        const gradeColorClass = !currentGrade 
                            ? 'border-slate-200 bg-white text-slate-800' 
                            : parseInt(currentGrade) >= 9 // High Score
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                : parseInt(currentGrade) >= 5 
                                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                                    : 'border-red-400 bg-red-50 text-red-700';

                        return (
                            <div 
                                key={student.id} 
                                className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 flex flex-col items-center hover:shadow-md transition-all duration-200 relative"
                            >
                                {/* 1. Student Avatar */}
                                <div className="w-16 h-16 rounded-full bg-slate-50 border-4 border-white shadow-sm mb-3 overflow-hidden">
                                    {/* استخدام المسار النسبي الصحيح */}
                                    <img 
                                        src={student.avatar || (student.gender === 'female' ? 'assets/student_girl.png' : 'assets/student_boy.png')} 
                                        className="w-full h-full object-cover"
                                        alt={student.name}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement!.innerText = student.gender === 'female' ? '👩‍🎓' : '👨‍🎓';
                                            e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center', 'text-2xl');
                                        }}
                                    />
                                </div>

                                {/* 2. Name */}
                                <h3 className="font-bold text-slate-800 text-xs text-center line-clamp-1 mb-3 w-full">
                                    {student.name}
                                </h3>

                                {/* 3. Input Field */}
                                <div className="w-full relative mt-auto">
                                    <input 
                                        type="tel" 
                                        maxLength={3}
                                        value={currentGrade}
                                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                        placeholder="-"
                                        className={`w-full h-12 rounded-2xl text-center font-black text-xl outline-none border-2 transition-all shadow-inner focus:ring-4 focus:ring-opacity-20 focus:ring-blue-400 ${gradeColorClass}`}
                                        disabled={!activeToolId}
                                    />
                                    
                                    {/* Helper Text */}
                                    <span className="absolute -bottom-5 left-0 right-0 text-center text-[9px] font-bold text-slate-400">
                                        {!activeToolId ? 'اختر أداة' : (currentGrade ? 'تم الرصد' : 'أدخل الدرجة')}
                                    </span>
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

        {/* ... Modals ... */}
        
        {/* Distribution Settings Modal */}
        <Modal isOpen={showDistModal} onClose={() => setShowDistModal(false)} className="max-w-md rounded-[2rem]">
            <div className="text-center">
                <h3 className="font-black text-xl mb-6 text-slate-800">إعدادات توزيع الدرجات</h3>
                <p className="text-sm font-bold text-gray-500 mb-6 px-4">قم بضبط الأوزان النسبية للدرجات حسب المرحلة الدراسية التي تدرسها.</p>
                
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                        <label className="block text-right text-xs font-black text-slate-700 mb-2">1. الدرجة الكلية للمادة</label>
                        <input type="number" value={distTotal} onChange={e => setDistTotal(Number(e.target.value))} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-center font-black text-lg outline-none focus:border-indigo-500 text-slate-800" />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                        <label className="block text-right text-xs font-black text-slate-700 mb-2">2. درجة الامتحان النهائي (أو المشروع)</label>
                        <input type="number" value={distFinalScore} onChange={e => setDistFinalScore(Number(e.target.value))} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-center font-black text-lg outline-none focus:border-indigo-500 text-slate-800" />
                        <p className="text-[10px] text-gray-400 mt-2 font-bold text-right">* ضع 0 إذا كانت المادة تقويم مستمر 100%</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                        <label className="block text-right text-xs font-black text-slate-700 mb-2">3. مسمى الامتحان النهائي</label>
                        <input type="text" value={distFinalName} onChange={e => setDistFinalName(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-center font-bold text-sm outline-none focus:border-indigo-500 text-slate-800" placeholder="مثال: الامتحان النهائي" />
                    </div>

                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-center flex-1">
                            <span className="block text-xs font-bold text-blue-600 mb-1">التقويم المستمر</span>
                            <span className="text-xl font-black text-slate-800">{distTotal - distFinalScore}</span>
                        </div>
                        <div className="text-xl font-black text-slate-300">+</div>
                        <div className="text-center flex-1">
                            <span className="block text-xs font-bold text-blue-600 mb-1">النهائي</span>
                            <span className="text-xl font-black text-slate-800">{distFinalScore}</span>
                        </div>
                        <div className="text-xl font-black text-slate-300">=</div>
                        <div className="text-center flex-1">
                            <span className="block text-xs font-bold text-blue-600 mb-1">{distTotal}</span>
                        </div>
                    </div>

                    <button onClick={handleSaveDistribution} className="w-full py-4 bg-[#1e3a8a] text-white rounded-xl font-black text-sm shadow-lg hover:bg-[#172554] active:scale-95 transition-all">
                        حفظ واعتماد التوزيع
                    </button>
                </div>
            </div>
        </Modal>

        {/* Tools Manager Modal */}
        <Modal isOpen={showToolsManager} onClose={() => { setShowToolsManager(false); setIsAddingTool(false); }} className="max-w-sm rounded-[2rem]">
            <div className="text-center text-slate-900">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-lg">أدوات التقويم</h3>
                    <button onClick={() => { setShowToolsManager(false); setIsAddingTool(false); }} className="p-2 glass-icon rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500"/></button>
                </div>
                {!isAddingTool ? (
                    <>
                        <button onClick={() => setIsAddingTool(true)} className="w-full py-3.5 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95">
                            <Plus className="w-4 h-4"/> إضافة أداة جديدة
                        </button>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {tools.length > 0 ? tools.map(tool => (
                                <div key={tool.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-colors">
                                    {editingToolId === tool.id ? (
                                        <div className="flex gap-2 w-full">
                                            <input autoFocus value={editToolName} onChange={e => setEditToolName(e.target.value)} className="flex-1 glass-input bg-gray-50 rounded-lg px-3 text-xs font-bold text-slate-800 border-slate-200" />
                                            <button onClick={saveEditedTool} className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600"><Check className="w-3.5 h-3.5"/></button>
                                            <button onClick={cancelEditingTool} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X className="w-3.5 h-3.5"/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                {tool.isFinal && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">نهائي</span>}
                                                <span className="text-xs font-bold text-slate-700 px-2">{tool.name}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditingTool(tool)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                                                {!tool.isFinal && <button onClick={() => handleDeleteTool(tool.id)} className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>}
                                            </div>
                                        </>
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
                    <p className="text-[10px] text-gray-500 mb-4 px-2 font-medium">سيتم رصد هذه الدرجة لجميع الطلاب الظاهرين في القائمة الحالية.</p>
                    <input type="number" autoFocus placeholder="الدرجة" className="w-full glass-input bg-gray-50 rounded-xl p-3 text-center text-lg font-black outline-none border border-slate-200 focus:border-indigo-500 mb-4 text-slate-800 shadow-inner" value={bulkScore} onChange={(e) => setBulkScore(e.target.value)} />
                    <button onClick={handleBulkFill} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">تطبيق الرصد</button>
                </div>
            )}
        </Modal>

    </div>
  );
};

export default GradeBook;
