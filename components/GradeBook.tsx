import React, { useState } from 'react';
import { Student, GradeRecord, AssessmentTool } from '../types';
import { Download, Trash2, Edit2, Plus, Save, X, Settings, Eraser, FileSpreadsheet, Check, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext';
import Modal from './Modal';

interface GradeBookProps {
    students: Student[];
    classes: string[];
    onUpdateStudent: (student: Student) => void;
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    currentSemester: '1' | '2';
    onSemesterChange: (sem: '1' | '2') => void;
    teacherInfo: any;
}

const GradeBook: React.FC<GradeBookProps> = ({ 
    students, classes, onUpdateStudent, setStudents, currentSemester, onSemesterChange, teacherInfo 
}) => {
    const { assessmentTools, setAssessmentTools, gradeSettings, setGradeSettings } = useApp();

    const [selectedClass, setSelectedClass] = useState(classes[0] || 'all');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    
    // Student Grade Modal State
    const [showAddGrade, setShowAddGrade] = useState<{student: Student} | null>(null);
    const [score, setScore] = useState('');
    const [selectedToolId, setSelectedToolId] = useState('');
    const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);

    // Bulk Fill State
    const [bulkFillTool, setBulkFillTool] = useState<AssessmentTool | null>(null);
    const [bulkScore, setBulkScore] = useState('');
    
    // Tools Management State
    const [newToolName, setNewToolName] = useState('');
    const [newToolMax, setNewToolMax] = useState('');

    const [isExporting, setIsExporting] = useState(false);

    const filteredStudents = students.filter(s => selectedClass === 'all' || s.classes.includes(selectedClass));

    // --- Calculation Functions ---
    const getGradeSymbol = (score: number) => {
        const percentage = (score / gradeSettings.totalScore) * 100;
        if (percentage >= 90) return 'أ';
        if (percentage >= 80) return 'ب';
        if (percentage >= 65) return 'ج';
        if (percentage >= 50) return 'د';
        return 'هـ';
    };

    const getSymbolColor = (score: number) => {
        const percentage = (score / gradeSettings.totalScore) * 100;
        if (percentage >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (percentage >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (percentage >= 65) return 'text-amber-600 bg-amber-50 border-amber-200';
        if (percentage >= 50) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-rose-600 bg-rose-50 border-rose-200';
    };

    const getSemesterGrades = (student: Student, semester: '1'|'2') => {
        return (student.grades || []).filter(g => (g.semester || '1') === semester);
    };

    // --- Logic: Manual Entry ---
    const handleSaveGrade = () => {
        if (!showAddGrade || score === '') return;
        
        const student = showAddGrade.student;
        let categoryName = 'درجة عامة';
        let maxScore = 0;
        
        if (selectedToolId) {
            const tool = assessmentTools.find(t => t.id === selectedToolId);
            if (tool) {
                categoryName = tool.name;
                maxScore = tool.maxScore;
            }
        } else if (editingGrade) {
            categoryName = editingGrade.category;
            // Try to find max score from tools
            const tool = assessmentTools.find(t => t.name.trim() === categoryName.trim());
            if (tool) maxScore = tool.maxScore;
        }

        const newGrade: GradeRecord = {
            id: editingGrade ? editingGrade.id : Math.random().toString(36).substr(2, 9),
            subject: teacherInfo?.subject || 'المادة',
            category: categoryName.trim(),
            score: Number(score),
            maxScore: maxScore,
            date: new Date().toISOString(),
            semester: currentSemester
        };

        let updatedGrades;
        if (editingGrade) {
            updatedGrades = (student.grades || []).map(g => g.id === editingGrade.id ? newGrade : g);
        } else {
            const filtered = (student.grades || []).filter(g => !(g.category.trim() === categoryName.trim() && (g.semester || '1') === currentSemester));
            updatedGrades = [newGrade, ...filtered];
        }

        const updatedStudent = { ...student, grades: updatedGrades };
        onUpdateStudent(updatedStudent);
        
        setShowAddGrade({ student: updatedStudent });
        setScore('');
        setEditingGrade(null);
        setSelectedToolId('');
    };

    const handleDeleteGrade = (gradeId: string) => {
        if (!showAddGrade) return;
        if (confirm('حذف الدرجة؟')) {
            const updatedGrades = showAddGrade.student.grades.filter(g => g.id !== gradeId);
            const updatedStudent = { ...showAddGrade.student, grades: updatedGrades };
            onUpdateStudent(updatedStudent);
            setShowAddGrade({ student: updatedStudent });
        }
    };

    const handleEditGrade = (grade: GradeRecord) => {
        setEditingGrade(grade);
        setScore(grade.score.toString());
        const tool = assessmentTools.find(t => t.name.trim() === grade.category.trim());
        setSelectedToolId(tool ? tool.id : '');
    };

    // --- Logic: Bulk Fill ---
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

        setStudents(currentStudents => {
            return currentStudents.map(student => {
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
                    category: toolName,
                    score: numericScore,
                    maxScore: bulkFillTool.maxScore || 0,
                    date: new Date().toISOString(),
                    semester: safeSemester
                };

                return { ...student, grades: [newGrade, ...keptGrades] };
            });
        });

        setShowBulkModal(false);
        setBulkFillTool(null);
        setBulkScore('');
        alert('تم الرصد الجماعي بنجاح! ✅');
    };

    // --- Logic: Clear Grades ---
    const handleClearGrades = () => {
        const targetClassText = selectedClass === 'all' ? 'جميع الطلاب' : `طلاب فصل ${selectedClass}`;
        
        if (confirm(`هل أنت متأكد من حذف جميع الدرجات المسجلة لـ ${targetClassText} في الفصل الدراسي ${currentSemester}؟\n⚠️ لا يمكن التراجع عن هذا الإجراء.`)) {
            setStudents(prev => prev.map(s => {
                const sClasses = s.classes || [];
                const matches = selectedClass === 'all' || sClasses.includes(selectedClass);
                
                if (matches) {
                    const keptGrades = (s.grades || []).filter(g => {
                        const gSem = g.semester || '1';
                        return gSem !== currentSemester;
                    });
                    return { ...s, grades: keptGrades };
                }
                return s;
            }));
            alert('تم حذف درجات الفصل المحدد بنجاح');
        }
    };

    // --- Logic: Export Excel ---
    const handleExportExcel = async () => {
        if (filteredStudents.length === 0) { alert('لا يوجد طلاب'); return; }
        setIsExporting(true);
        
        try {
            const finalExamName = gradeSettings.finalExamName.trim();
            const finalWeight = gradeSettings.finalExamScore; // Using finalExamScore as Weight
            const continuousWeight = gradeSettings.totalScore - finalWeight;

            const continuousTools = assessmentTools.filter(t => t.name.trim() !== finalExamName);
            
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
            } else {
                XLSX.writeFile(wb, fileName);
            }
        } catch (error) {
            console.error(error);
            alert('خطأ في التصدير');
        } finally {
            setIsExporting(false);
        }
    };

    // --- Tools Management ---
    const addTool = () => {
        if(newToolName && newToolMax) {
            setAssessmentTools([...assessmentTools, { id: Math.random().toString(36).substr(2,9), name: newToolName, maxScore: Number(newToolMax) }]);
            setNewToolName(''); setNewToolMax('');
        }
    };

    const deleteTool = (id: string) => {
        if(confirm('حذف الأداة؟')) setAssessmentTools(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">سجل الدرجات</h1>
                        <p className="text-xs font-bold text-slate-400">الفصل الدراسي {currentSemester === '1' ? 'الأول' : 'الثاني'}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onSemesterChange(currentSemester === '1' ? '2' : '1')} className="px-3 py-2 bg-white rounded-xl text-xs font-black shadow-sm border border-slate-200">
                            فصل {currentSemester}
                        </button>
                        <button onClick={() => setShowSettingsModal(true)} className="p-2 bg-white text-slate-600 rounded-xl shadow-sm border border-slate-200">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
                
                {/* Actions Toolbar */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    <button onClick={() => setShowBulkModal(true)} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all whitespace-nowrap">
                        <FileSpreadsheet size={16} /> رصد جماعي
                    </button>
                    <button onClick={handleExportExcel} disabled={isExporting} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 active:scale-95 transition-all whitespace-nowrap">
                        {isExporting ? 'جاري...' : <><Download size={16} /> تصدير Excel</>}
                    </button>
                    <button onClick={handleClearGrades} className="px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-100 active:scale-95 transition-all whitespace-nowrap">
                        <Eraser size={16} /> تصفير الفصل
                    </button>
                </div>

                {/* Classes Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    <button onClick={() => setSelectedClass('all')} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>الكل</button>
                    {classes.map(c => (
                        <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === c ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>{c}</button>
                    ))}
                </div>
            </div>

            {/* Students List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                    const semGrades = getSemesterGrades(student, currentSemester);
                    const totalScore = semGrades.reduce((a, b) => a + (Number(b.score)||0), 0);
                    const symbolColor = getSymbolColor(totalScore);
                    
                    return (
                        <div key={student.id} onClick={() => { setShowAddGrade({student}); setScore(''); setEditingGrade(null); setSelectedToolId(''); }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-all hover:shadow-md group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-50 border-2 border-white shadow-sm overflow-hidden shrink-0">
                                    <img 
                                        src={student.avatar || (student.gender === 'female' ? '/student-girl.png' : '/student-boy.jpg')} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement!.innerText = student.gender === 'female' ? '👩‍🎓' : '👨‍🎓';
                                            e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center', 'text-2xl');
                                        }}
                                    />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{student.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold">{student.classes[0]}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2 ${symbolColor}`}>
                                    {totalScore}
                                </div>
                                <span className="text-[9px] text-slate-400 font-bold mt-1">{getGradeSymbol(totalScore)}</span>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full text-center py-10">
                        <p className="text-slate-400 font-bold text-sm">لا يوجد طلاب في هذا الفصل</p>
                    </div>
                )}
            </div>

            {/* Modal: Add/Edit Grades */}
            <Modal isOpen={!!showAddGrade} onClose={() => setShowAddGrade(null)} className="max-w-md h-[80vh]">
                {showAddGrade && (
                    <div className="flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-6 shrink-0">
                            <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                                <img src={showAddGrade.student.avatar || (showAddGrade.student.gender === 'female' ? '/student-girl.png' : '/student-boy.jpg')} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-slate-800">{showAddGrade.student.name}</h3>
                                <p className="text-xs font-bold text-slate-500">رصد درجات الفصل {currentSemester === '1' ? 'الأول' : 'الثاني'}</p>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 shrink-0">
                            <div className="flex gap-2 mb-2">
                                <select 
                                    value={selectedToolId} 
                                    onChange={(e) => setSelectedToolId(e.target.value)} 
                                    className="flex-[2] p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-800"
                                    disabled={!!editingGrade}
                                >
                                    <option value="">اختر أداة التقويم...</option>
                                    {assessmentTools.map(tool => (
                                        <option key={tool.id} value={tool.id}>{tool.name} (Max: {tool.maxScore})</option>
                                    ))}
                                </select>
                                <input 
                                    type="number" 
                                    placeholder="الدرجة" 
                                    value={score} 
                                    onChange={(e) => setScore(e.target.value)} 
                                    className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-center text-slate-800"
                                />
                            </div>
                            <button onClick={handleSaveGrade} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Save size={16} /> {editingGrade ? 'حفظ التعديل' : 'رصد الدرجة'}
                            </button>
                            {editingGrade && (
                                <button onClick={() => { setEditingGrade(null); setScore(''); setSelectedToolId(''); }} className="w-full mt-2 py-2 text-slate-500 text-xs font-bold">إلغاء التعديل</button>
                            )}
                        </div>

                        {/* Grades List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            {getSemesterGrades(showAddGrade.student, currentSemester).length > 0 ? (
                                getSemesterGrades(showAddGrade.student, currentSemester).map((grade, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">{grade.score}</div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{grade.category}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(grade.date).toLocaleDateString('en-GB')}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditGrade(grade)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
                                            <button onClick={() => handleDeleteGrade(grade.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-400 text-xs font-bold py-10">لا توجد درجات مرصودة لهذا الطالب</p>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal: Bulk Fill */}
            <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} className="max-w-sm">
                <h3 className="font-black text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="text-indigo-600" size={20} />
                    رصد جماعي
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-bold leading-relaxed">
                    سيتم رصد الدرجة المدخلة لجميع الطلاب الظاهرين في القائمة الحالية ({filteredStudents.length} طالب) لهذه الأداة.
                </p>
                <div className="space-y-3">
                    <select 
                        value={bulkFillTool?.id || ''} 
                        onChange={(e) => setBulkFillTool(assessmentTools.find(t => t.id === e.target.value) || null)} 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    >
                        <option value="">اختر الأداة...</option>
                        {assessmentTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input 
                        type="number" 
                        placeholder="الدرجة الموحدة" 
                        value={bulkScore} 
                        onChange={(e) => setBulkScore(e.target.value)} 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center outline-none"
                    />
                    <button onClick={handleBulkFill} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg mt-2">تطبيق الرصد</button>
                </div>
            </Modal>

            {/* Modal: Settings */}
            <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} className="max-w-md h-[80vh]">
                <h3 className="font-black text-lg text-slate-800 mb-4 sticky top-0 bg-white z-10 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Settings className="text-slate-600" size={20} /> إعدادات الدرجات
                </h3>
                
                <div className="space-y-6">
                    {/* Grade Weight Settings */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <h4 className="font-bold text-xs text-slate-500">توزيع الدرجات</h4>
                        <div className="flex gap-2 items-center">
                            <label className="text-[10px] font-bold w-20">المجموع الكلي</label>
                            <input type="number" value={gradeSettings.totalScore} onChange={(e) => setGradeSettings({...gradeSettings, totalScore: Number(e.target.value)})} className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-center text-xs font-bold" />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="text-[10px] font-bold w-20">درجة النهائي</label>
                            <input type="number" value={gradeSettings.finalExamScore} onChange={(e) => setGradeSettings({...gradeSettings, finalExamScore: Number(e.target.value)})} className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-center text-xs font-bold" />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label className="text-[10px] font-bold w-20">اسم النهائي</label>
                            <input type="text" value={gradeSettings.finalExamName} onChange={(e) => setGradeSettings({...gradeSettings, finalExamName: e.target.value})} className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-center text-xs font-bold" />
                        </div>
                    </div>

                    {/* Tools Management */}
                    <div>
                        <h4 className="font-bold text-xs text-slate-500 mb-2">أدوات التقويم المستمر</h4>
                        <div className="flex gap-2 mb-3">
                            <input type="text" placeholder="اسم الأداة (مثال: مشروع)" value={newToolName} onChange={e => setNewToolName(e.target.value)} className="flex-[2] p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                            <input type="number" placeholder="Max" value={newToolMax} onChange={e => setNewToolMax(e.target.value)} className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center outline-none" />
                            <button onClick={addTool} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={16}/></button>
                        </div>
                        
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {assessmentTools.map(tool => (
                                <div key={tool.id} className="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg">
                                    <span className="text-xs font-bold text-slate-700">{tool.name} <span className="text-slate-400">({tool.maxScore})</span></span>
                                    <button onClick={() => { if(confirm('حذف الأداة؟')) setAssessmentTools(prev => prev.filter(t => t.id !== tool.id)) }} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            {assessmentTools.length === 0 && <p className="text-center text-[10px] text-slate-400">لا توجد أدوات مضافة</p>}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default GradeBook;