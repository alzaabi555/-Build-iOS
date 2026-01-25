import React, { useState } from 'react';
import { Student } from '../types';
import { Award, AlertCircle, Trash2, Loader2, FileText, LayoutList, ArrowRight, Printer, Check, X, Clock, DoorOpen } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext';
import html2pdf from 'html2pdf.js';
import StudentDetailedHistoryModal from './StudentDetailedHistoryModal';

interface StudentReportProps {
  student: Student;
  onUpdateStudent?: (s: Student) => void;
  currentSemester?: '1' | '2';
  teacherInfo?: { name: string; school: string; subject: string; governorate: string; stamp?: string; ministryLogo?: string; academicYear?: string };
  onBack?: () => void;
}

const StudentReport: React.FC<StudentReportProps> = ({ student, onUpdateStudent, currentSemester, teacherInfo, onBack }) => {
  const { assessmentTools } = useApp();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
   
  // --- Data Calculations ---
  const behaviors = (student.behaviors || []).filter(b => !b.semester || b.semester === (currentSemester || '1'));
  const allGrades = student.grades || [];

  const totalPositivePoints = behaviors.filter(b => b.type === 'positive').reduce((acc, b) => acc + b.points, 0);
  const totalNegativePoints = behaviors.filter(b => b.type === 'negative').reduce((acc, b) => acc + Math.abs(b.points), 0);

  // Filter grades for current semester
  const currentSemesterGrades = allGrades.filter(g => !g.semester || g.semester === (currentSemester || '1'));

  // Logic for Grade Calculation
  const finalExamName = "الامتحان النهائي";
  const continuousTools = assessmentTools.filter(t => t.name.trim() !== finalExamName);
  const finalTool = assessmentTools.find(t => t.name.trim() === finalExamName);

  let continuousSum = 0;
  continuousTools.forEach(tool => {
      const g = currentSemesterGrades.find(r => r.category.trim() === tool.name.trim());
      if (g) continuousSum += (Number(g.score) || 0);
  });

  let finalScore = 0;
  if (finalTool) {
      const g = currentSemesterGrades.find(r => r.category.trim() === finalTool.name.trim());
      if (g) finalScore = (Number(g.score) || 0);
  }

  const totalScore = continuousSum + finalScore;

  // Attendance Records
  const absenceRecords = (student.attendance || []).filter(a => a.status === 'absent');
  const truantRecords = (student.attendance || []).filter(a => a.status === 'truant');

  // --- Handlers ---
  const handleDeleteBehavior = (behaviorId: string) => {
      if (confirm('هل أنت متأكد من حذف هذا السلوك؟')) {
          const updatedBehaviors = (student.behaviors || []).filter(b => b.id !== behaviorId);
          if (onUpdateStudent) {
              onUpdateStudent({ ...student, behaviors: updatedBehaviors });
          }
      }
  };

  const handlePrintReport = async () => {
      const element = document.getElementById('report-content');
      if (!element) return;

      setIsGeneratingPdf(true);
      
      const scrollContainer = document.getElementById('report-scroll-container');
      if(scrollContainer) scrollContainer.scrollTop = 0;

      const opt = {
          margin: [10, 10, 10, 10], 
          filename: `Report_${student.name}_${new Date().getTime()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
              scale: 2, 
              useCORS: true, 
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: 800 
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      try {
          const worker = html2pdf().set(opt).from(element).toPdf();
          
          if (Capacitor.isNativePlatform()) {
               const pdfBase64 = await worker.output('datauristring');
               const base64Data = pdfBase64.split(',')[1];
               const result = await Filesystem.writeFile({ 
                   path: opt.filename, 
                   data: base64Data, 
                   directory: Directory.Cache 
               });
               await Share.share({ title: `تقرير الطالب: ${student.name}`, url: result.uri });
          } else {
               worker.save();
          }
      } catch (err) { 
          console.error('PDF Error:', err); 
          alert('حدث خطأ أثناء الطباعة');
      } finally { 
          setIsGeneratingPdf(false); 
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        <StudentDetailedHistoryModal 
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            student={student}
            teacherInfo={teacherInfo}
        />

        {/* ================= HEADER (Blue & Curved) ================= */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-6 pt-[env(safe-area-inset-top)] pb-8 transition-all duration-300">
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack} 
                        className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all shadow-sm border border-white/10"
                    >
                        <ArrowRight className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-black">{student.name}</h2>
                        <p className="text-[10px] text-blue-200 font-bold opacity-80">{student.classes[0]} • الفصل {currentSemester === '1' ? 'الأول' : 'الثاني'}</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowHistoryModal(true)}
                        className="bg-white/20 text-white px-4 py-3 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2 hover:bg-white/30"
                    >
                        <LayoutList className="w-4 h-4" />
                        السجل التفصيلي
                    </button>

                    <button 
                        onClick={handlePrintReport} 
                        disabled={isGeneratingPdf}
                        className="bg-white text-[#1e3a8a] px-5 py-3 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2"
                    >
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        طباعة
                    </button>
                </div>
            </div>
        </div>

        {/* ================= SCROLLABLE CONTENT ================= */}
        <div id="report-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar">
            
            {/* Spacer for Header */}
            <div className="w-full h-[140px] shrink-0"></div>

            {/* The A4 Paper Preview */}
            <div className="px-4 pb-24">
                <div id="report-content" className="bg-white text-slate-900 p-8 md:p-12 rounded-[2rem] max-w-4xl mx-auto shadow-xl border border-slate-100 relative overflow-hidden" dir="rtl">
                    
                    {/* Formal Ministry Header */}
                    <div className="flex justify-between items-start mb-8 border-b-2 border-gray-100 pb-6">
                        <div className="text-center w-1/3">
                            <p className="font-bold text-sm mb-1 text-black">سلطنة عمان</p>
                            <p className="font-bold text-sm mb-1 text-black">وزارة التربية والتعليم</p>
                            <p className="font-bold text-sm mb-1 text-black">المديرية العامة لمحافظة {teacherInfo?.governorate || '....'}</p>
                            <p className="font-bold text-sm text-black">مدرسة {teacherInfo?.school || '................'}</p>
                        </div>
                        <div className="flex flex-col items-center justify-center w-1/3">
                             {teacherInfo?.ministryLogo ? (
                                 <img src={teacherInfo.ministryLogo} className="h-20 object-contain mix-blend-multiply" alt="Logo" />
                             ) : (
                                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border-2 border-slate-100">
                                     <FileText className="w-8 h-8 text-slate-300" />
                                 </div>
                             )}
                             <h1 className="text-xl font-black mt-4 underline decoration-[#1e3a8a] decoration-4 underline-offset-4 text-black">تقرير مستوى طالب</h1>
                        </div>
                        <div className="text-center w-1/3 flex flex-col items-end">
                            <div className="text-right">
                                 <p className="font-bold text-sm mb-1 text-black">العام الدراسي: {teacherInfo?.academicYear || '..../....'}</p>
                                 <p className="font-bold text-sm mb-1 text-black">الفصل الدراسي: {currentSemester === '1' ? 'الأول' : 'الثاني'}</p>
                                 <p className="font-bold text-sm text-black">التاريخ: {new Date().toLocaleDateString('en-GB')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Student Info Card */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8 flex items-center justify-between print:bg-slate-50">
                        <div>
                            <div className="flex items-center gap-8 mb-4">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">اسم الطالب</span>
                                    <h3 className="text-xl font-black text-black">{student.name}</h3>
                                </div>
                                <div className="w-px h-10 bg-slate-300"></div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">الصفوف</span>
                                    <h3 className="text-xl font-black text-black">{student.classes[0]}</h3>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-200">نقاط إيجابية: {totalPositivePoints}</div>
                                <div className="bg-rose-100 text-rose-800 px-3 py-1 rounded-lg text-xs font-bold border border-rose-200">نقاط سلبية: {totalNegativePoints}</div>
                            </div>
                        </div>
                        <div className="w-24 h-24 bg-white rounded-2xl border-2 border-slate-200 p-1 shadow-sm">
                             {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl text-3xl font-black text-slate-300">{student.name.charAt(0)}</div>}
                        </div>
                    </div>

                    {/* Grades Table */}
                    <div className="mb-10">
                        <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-black border-b-2 border-slate-100 pb-2">
                            <FileText className="w-5 h-5 text-[#1e3a8a]" />
                            التحصيل الدراسي
                        </h3>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-black">
                                    <th className="border border-slate-300 p-3 text-sm font-bold text-right">المادة</th>
                                    <th className="border border-slate-300 p-3 text-sm font-bold text-center">أداة التقويم</th>
                                    <th className="border border-slate-300 p-3 text-sm font-bold text-center">الدرجة</th>
                                </tr>
                            </thead>
                            <tbody className="text-black">
                                {assessmentTools.length > 0 ? (
                                    <>
                                        {continuousTools.map((tool) => {
                                            const grade = currentSemesterGrades.find(g => g.category.trim() === tool.name.trim());
                                            return (
                                                <tr key={tool.id}>
                                                    <td className="border border-slate-300 p-3 text-sm font-bold text-right">{teacherInfo?.subject || 'المادة'}</td>
                                                    <td className="border border-slate-300 p-3 text-sm text-center">{tool.name}</td>
                                                    <td className="border border-slate-300 p-3 text-sm text-center font-bold font-mono">{grade ? grade.score : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-blue-50 font-bold">
                                            <td colSpan={2} className="border border-slate-300 p-3 text-sm text-center text-blue-900 border-t-2 border-slate-400">مجموع الأعمال (60)</td>
                                            <td className="border border-slate-300 p-3 text-sm text-center font-mono text-blue-900 border-t-2 border-slate-400">{continuousSum}</td>
                                        </tr>
                                        {finalTool && (() => {
                                            const grade = currentSemesterGrades.find(g => g.category.trim() === finalTool.name.trim());
                                            return (
                                                <tr key={finalTool.id}>
                                                    <td className="border border-slate-300 p-3 text-sm font-bold text-right">{teacherInfo?.subject || 'المادة'}</td>
                                                    <td className="border border-slate-300 p-3 text-sm text-center bg-pink-50">{finalTool.name} (40)</td>
                                                    <td className="border border-slate-300 p-3 text-sm text-center font-bold font-mono">{grade ? grade.score : '-'}</td>
                                                </tr>
                                            );
                                        })()}
                                        <tr className="bg-slate-200 font-black">
                                            <td colSpan={2} className="border border-slate-300 p-3 text-base text-center border-t-2 border-black">المجموع الكلي (100)</td>
                                            <td className="border border-slate-300 p-3 text-lg text-center font-mono border-t-2 border-black">{totalScore}</td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">لا توجد أدوات تقويم معرفة</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Attendance Summary */}
                    <div className="mb-10">
                         <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-black border-b-2 border-slate-100 pb-2">
                            <LayoutList className="w-5 h-5 text-[#1e3a8a]" />
                            ملخص الحضور
                        </h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="p-4 rounded-xl border border-slate-200 text-center bg-rose-50">
                                <span className="text-xs font-bold text-slate-500 block mb-1">غياب</span>
                                <span className="text-2xl font-black text-rose-600">{absenceRecords.length}</span>
                            </div>
                            <div className="p-4 rounded-xl border border-slate-200 text-center bg-purple-50">
                                <span className="text-xs font-bold text-slate-500 block mb-1">تسرب</span>
                                <span className="text-2xl font-black text-purple-600">{truantRecords.length}</span>
                            </div>
                             <div className="p-4 rounded-xl border border-slate-200 text-center bg-emerald-50">
                                <span className="text-xs font-bold text-slate-500 block mb-1">حضور</span>
                                <span className="text-2xl font-black text-emerald-600">{student.attendance.filter(a => a.status === 'present').length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Behavior Log */}
                    <div className="mb-12">
                        <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-black border-b-2 border-slate-100 pb-2">
                            <Award className="w-5 h-5 text-[#1e3a8a]" />
                            سجل السلوك
                        </h3>
                         {behaviors.length > 0 ? (
                             <div className="space-y-2">
                                 {behaviors.map((b, idx) => (
                                     <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${b.type === 'positive' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                         <div className="flex items-center gap-3">
                                             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${b.type === 'positive' ? 'bg-emerald-200 text-emerald-700' : 'bg-rose-200 text-rose-700'}`}>
                                                 {b.type === 'positive' ? <Award className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                             </div>
                                             <div>
                                                 <p className="text-sm font-bold text-black">{b.description}</p>
                                                 <p className="text-[10px] text-slate-500">
                                                     {new Date(b.date).toLocaleDateString('en-GB')}
                                                     {b.period && <span className="mx-2 bg-white px-1 rounded border">الحصة {b.period}</span>}
                                                 </p>
                                             </div>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <span className={`text-sm font-black ${b.type === 'positive' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                 {b.type === 'positive' ? '+' : '-'}{Math.abs(b.points)}
                                             </span>
                                             {onUpdateStudent && (
                                                 <button onClick={() => handleDeleteBehavior(b.id)} className="p-1 text-slate-400 hover:text-rose-500 print:hidden">
                                                     <Trash2 className="w-4 h-4" />
                                                 </button>
                                             )}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <p className="text-center text-sm text-slate-500 py-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">لا توجد ملاحظات سلوكية مسجلة</p>
                         )}
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between items-end pt-8 border-t-2 border-gray-100 mt-auto">
                         <div className="text-center w-1/3">
                            <p className="font-bold text-sm mb-8 text-black">معلم المادة</p>
                            <p className="font-black text-lg text-black">{teacherInfo?.name || '....................'}</p>
                         </div>
                         
                         <div className="text-center w-1/3">
                             {teacherInfo?.stamp && (
                                 <img src={teacherInfo.stamp} className="w-32 opacity-80 mix-blend-multiply mx-auto" alt="Stamp" />
                             )}
                         </div>

                         <div className="text-center w-1/3">
                            <p className="font-bold text-sm mb-8 text-black">مدير المدرسة</p>
                            <p className="font-black text-lg text-black">....................</p>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StudentReport;
