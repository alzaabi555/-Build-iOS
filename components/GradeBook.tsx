
import React, { useState } from 'react';
import { Student, GradeRecord } from '../types';
import { GraduationCap, Plus, Search, CheckCircle2, FileUp, Loader2, X, Download, Edit3, Trash2, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

interface GradeBookProps {
  students: Student[];
  classes: string[];
  onUpdateStudent: (s: Student) => void;
}

const GradeBook: React.FC<GradeBookProps> = ({ students, classes, onUpdateStudent }) => {
  const [selectedClass, setSelectedClass] = useState(classes[0] || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddGrade, setShowAddGrade] = useState<{ student: Student; existingGrade?: GradeRecord } | null>(null);
  const [selectedStudentIdForGrades, setSelectedStudentIdForGrades] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // Grade Form State
  const [subject] = useState('الدراسات الاجتماعية');
  const [category, setCategory] = useState('العرض الشفوي');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('10');

  const categories = [
    { name: 'العرض الشفوي', max: 10 },
    { name: 'السؤال القصير الاول', max: 5 },
    { name: 'السؤال القصير الثاني', max: 5 },
    { name: 'الاختبار القصير الاول', max: 15 },
    { name: 'الاختبار القصير الثاني', max: 15 },
    { name: 'التقرير', max: 10 },
    { name: 'الاختبار النهائي', max: 40 }
  ];

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.includes(searchTerm);
    const matchesClass = selectedClass === 'all' || s.classes?.includes(selectedClass);
    return matchesSearch && matchesClass;
  });

  const activeStudentInModal = students.find(s => s.id === selectedStudentIdForGrades);

  const openGradeModal = (student: Student, existingGrade?: GradeRecord) => {
    if (existingGrade) {
        setCategory(existingGrade.category);
        setScore(existingGrade.score.toString());
        setMaxScore(existingGrade.maxScore.toString());
    } else {
        const defaultCat = categories.find(c => c.name === category) || categories[0];
        setCategory(defaultCat.name);
        setScore('');
        setMaxScore(defaultCat.max.toString());
    }
    setShowAddGrade({ student, existingGrade });
  };

  const handleSaveGrade = () => {
    if (!showAddGrade || score === '' || !maxScore) {
        alert('الرجاء إدخال الدرجة أولاً');
        return;
    }

    const student = showAddGrade.student;
    const existingGrade = showAddGrade.existingGrade;

    let updatedGrades: GradeRecord[];
    if (existingGrade) {
        updatedGrades = (student.grades || []).map(g => 
            g.id === existingGrade.id 
            ? { ...g, category, score: Number(score), maxScore: Number(maxScore) }
            : g
        );
    } else {
        const newGrade: GradeRecord = {
          id: Math.random().toString(36).substr(2, 9),
          subject,
          category,
          score: Number(score),
          maxScore: Number(maxScore),
          date: new Date().toISOString()
        };
        updatedGrades = [...(student.grades || []), newGrade];
    }

    onUpdateStudent({
      ...student,
      grades: updatedGrades
    });

    setShowAddGrade(null);
    setScore('');
  };

  const handleDeleteGrade = (student: Student, gradeId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدرجة؟')) return;
    onUpdateStudent({
        ...student,
        grades: (student.grades || []).filter(g => g.id !== gradeId)
    });
  };

  const handleExcelGradeImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      jsonData.forEach(row => {
        const studentName = row['الاسم'] || row['اسم الطالب'];
        const student = students.find(s => s.name === studentName);

        if (student) {
          const newGrades: GradeRecord[] = [];
          categories.forEach(cat => {
            if (row[cat.name] !== undefined) {
              newGrades.push({
                id: Math.random().toString(36).substr(2, 9),
                subject: 'الدراسات الاجتماعية',
                category: cat.name,
                score: Number(row[cat.name]),
                maxScore: cat.max,
                date: new Date().toISOString()
              });
            }
          });

          if (newGrades.length > 0) {
            onUpdateStudent({
              ...student,
              grades: [...(student.grades || []), ...newGrades]
            });
          }
        }
      });
      alert('تم استيراد الدرجات بنجاح');
    } catch (error) {
      alert('خطأ في قراءة ملف الدرجات');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const calculateTotal = (student: Student) => {
    if (!student.grades || student.grades.length === 0) return 0;
    const socGrades = student.grades.filter(g => g.subject === 'الدراسات الاجتماعية');
    if (socGrades.length === 0) return 0;
    
    const latestGradesByCat: Record<string, number> = {};
    const maxScoresByCat: Record<string, number> = {};
    
    socGrades.forEach(g => {
        latestGradesByCat[g.category] = g.score;
        maxScoresByCat[g.category] = g.maxScore;
    });

    const earned = Object.values(latestGradesByCat).reduce((a, b) => a + b, 0);
    const total = Object.values(maxScoresByCat).reduce((a, b) => a + b, 0);
    
    return total > 0 ? Math.round((earned / total) * 100) : 0;
  };

  const getScorePresets = () => {
    const max = Number(maxScore);
    if (max <= 5) return [1, 2, 3, 4, 5];
    if (max <= 10) return [2, 4, 6, 8, 10];
    if (max <= 15) return [5, 10, 15];
    if (max <= 40) return [10, 20, 30, 40];
    return [max];
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
                    <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-gray-900">سجل الدراسات الاجتماعية</h2>
                    <p className="text-[9px] text-gray-400 font-bold">إدارة التقويم المستمر والنهائي</p>
                </div>
            </div>
            <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-gray-50 border-none rounded-xl px-4 py-2 text-[10px] font-black outline-none text-blue-600"
            >
                <option value="all">كل الفصول</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
         </div>

         <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 cursor-pointer active:scale-95 transition-all">
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleExcelGradeImport} disabled={isImporting} />
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                <span className="text-[10px] font-black">استيراد درجات (إكسل)</span>
            </label>
         </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-3.5 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="ابحث عن طالب لرصد درجته..." 
          className="w-full bg-white border border-gray-100 rounded-2xl py-3.5 pr-11 pl-4 text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Student List */}
      <div className="space-y-2.5">
        {filteredStudents.map(student => (
          <div 
            key={student.id} 
            onClick={() => setSelectedStudentIdForGrades(student.id)}
            className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-50 flex items-center justify-between active:bg-blue-50/50 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
               <div className="w-11 h-11 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex flex-col items-center justify-center border border-blue-100">
                  <span className="text-[10px] font-black text-blue-600">{calculateTotal(student)}%</span>
               </div>
               <div>
                  <h4 className="text-xs font-black text-gray-900">{student.name}</h4>
                  <p className="text-[9px] text-gray-400 font-bold">
                    {(student.grades?.filter(g => g.subject === 'الدراسات الاجتماعية').length || 0)} أدوات مرصودة
                  </p>
               </div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); openGradeModal(student); }}
                className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 active:scale-90 transition-transform"
            >
                <Plus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Student Grades View / Edit Modal */}
      {selectedStudentIdForGrades && activeStudentInModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-end justify-center" onClick={() => setSelectedStudentIdForGrades(null)}>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h3 className="font-black text-gray-900 text-base">سجل درجات الطالب</h3>
                    <p className="text-[10px] text-blue-600 font-bold">{activeStudentInModal.name}</p>
                </div>
                <button onClick={() => setSelectedStudentIdForGrades(null)} className="p-2 bg-gray-100 rounded-full active:scale-90"><X className="w-4 h-4"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-6">
                {activeStudentInModal.grades?.filter(g => g.subject === 'الدراسات الاجتماعية').slice().reverse().map(g => (
                    <div key={g.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                        <div>
                            <p className="text-xs font-black text-gray-800">{g.category}</p>
                            <p className="text-[9px] text-gray-400 font-bold">{new Date(g.date).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-left bg-white px-3 py-1.5 rounded-xl border border-gray-100 min-w-[60px] text-center shadow-sm">
                                <span className="text-xs font-black text-blue-600">{g.score}</span>
                                <span className="text-[10px] text-gray-300 font-black mx-1">/</span>
                                <span className="text-[10px] font-black text-gray-500">{g.maxScore}</span>
                            </div>
                            <button onClick={() => openGradeModal(activeStudentInModal, g)} className="p-2 bg-blue-50 text-blue-600 rounded-xl active:scale-90 border border-blue-100"><Edit3 className="w-3.5 h-3.5"/></button>
                            <button onClick={() => handleDeleteGrade(activeStudentInModal, g.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl active:scale-90 border border-rose-100"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                    </div>
                ))}
                {(!activeStudentInModal.grades || activeStudentInModal.grades.filter(g => g.subject === 'الدراسات الاجتماعية').length === 0) && (
                    <div className="py-10 text-center text-gray-400 text-xs font-bold">لا توجد درجات مرصودة حالياً لهذا الطالب</div>
                )}
            </div>
            
            <button 
                onClick={() => openGradeModal(activeStudentInModal)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 active:scale-95 flex items-center justify-center gap-2 mb-safe shrink-0"
            >
                <Plus className="w-4 h-4" /> إضافة درجة جديدة
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Grade Modal - Optimized for iPhone */}
      {showAddGrade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setShowAddGrade(null)}>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
             {/* Header with Save Button moved to Top Right */}
             <div className="flex justify-between items-center p-6 border-b border-gray-50 shrink-0">
                <button onClick={() => setShowAddGrade(null)} className="p-2.5 bg-gray-50 text-gray-400 rounded-2xl active:scale-90 transition-all">
                    <X className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <h3 className="font-black text-gray-900 text-base">{showAddGrade.existingGrade ? 'تعديل الدرجة' : 'رصد درجة'}</h3>
                    <p className="text-[10px] text-blue-600 font-bold truncate max-w-[150px]">{showAddGrade.student.name}</p>
                </div>
                <button 
                    onClick={handleSaveGrade}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-black text-[11px] shadow-lg shadow-blue-100 active:scale-90 transition-all"
                >
                    <Check className="w-4 h-4" /> حفظ
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-10">
                {/* Category Selection */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">اختر أداة التقويم</label>
                    <div className="grid grid-cols-2 gap-2">
                        {categories.map(cat => (
                            <button 
                                key={cat.name}
                                onClick={() => {
                                    setCategory(cat.name);
                                    setMaxScore(cat.max.toString());
                                }}
                                className={`p-4 rounded-2xl text-[10px] font-black transition-all border text-right flex flex-col gap-1 ${category === cat.name ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' : 'bg-gray-50 text-gray-500 border-transparent active:bg-gray-100'}`}
                            >
                                <span>{cat.name}</span>
                                <span className={`text-[9px] ${category === cat.name ? 'text-blue-200' : 'text-gray-400'}`}>الدرجة الكلية: {cat.max}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Score Input Area */}
                <div className="space-y-4">
                    <div className="bg-gray-50 rounded-[2rem] p-6 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 text-center space-y-2">
                                <label className="text-[10px] font-black text-gray-400">الدرجة المستحقة</label>
                                <input 
                                    type="number" 
                                    value={score} 
                                    onChange={e => setScore(e.target.value)} 
                                    placeholder="0" 
                                    autoFocus
                                    className="w-full bg-white border-2 border-blue-100 rounded-2xl py-5 text-center font-black text-blue-600 text-3xl focus:border-blue-500 outline-none shadow-sm" 
                                />
                            </div>
                            <div className="w-px h-16 bg-gray-200" />
                            <div className="flex-1 text-center space-y-2 opacity-50">
                                <label className="text-[10px] font-black text-gray-400">من إجمالي</label>
                                <div className="py-5 font-black text-gray-500 text-3xl">{maxScore}</div>
                            </div>
                        </div>

                        {/* Presets - Floating bubbles */}
                        <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                            {getScorePresets().map(preset => (
                                <button 
                                    key={preset}
                                    onClick={() => setScore(preset.toString())}
                                    className={`w-12 h-12 rounded-2xl text-xs font-black border transition-all flex items-center justify-center ${score === preset.toString() ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-110' : 'bg-white text-blue-600 border-blue-50 active:bg-blue-50'}`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                        تأكد من اختيار الدرجة الصحيحة قبل الضغط على حفظ. سيتم تحديث سجل الطالب ومجموعه الكلي تلقائياً.
                    </p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBook;
