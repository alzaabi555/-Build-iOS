import React, { useState } from 'react';
import { Student } from '../types';
import { Award, AlertCircle, Trash2, Loader2, FileText, LayoutList, ArrowRight, Printer } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext';
import html2pdf from 'html2pdf.js';

interface StudentReportProps {
  student: Student;
  onUpdateStudent?: (s: Student) => void;
  currentSemester?: '1' | '2';
  teacherInfo?: { name: string; school: string; subject: string; governorate: string; stamp?: string; ministryLogo?: string; academicYear?: string };
  onBack?: () => void;
}

const StudentReport: React.FC<StudentReportProps> = ({ student, onUpdateStudent, currentSemester, teacherInfo, onBack }) => {
  const { assessmentTools, gradeSettings } = useApp();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const behaviors = (student.behaviors || []).filter(b => !b.semester || b.semester === (currentSemester || '1'));
  const allGrades = student.grades || [];

  // فصل السلوكيات لتوزيعها في العمودين
  const posBehaviors = behaviors.filter(b => b.type === 'positive');
  const negBehaviors = behaviors.filter(b => b.type === 'negative');

  const totalPositivePoints = posBehaviors.reduce((acc, b) => acc + b.points, 0);
  const totalNegativePoints = negBehaviors.reduce((acc, b) => acc + Math.abs(b.points), 0);

  // Filter grades for current semester
  const currentSemesterGrades = allGrades.filter(g => !g.semester || g.semester === (currentSemester || '1'));

  // --- Logic for Ordered Grade Rows (Improved with GradeSettings) ---
  
  // Find the final exam tool
  // Priority: 1. Tool with isFinal=true, 2. Tool matching configured final name, 3. Fallback to default name
  let finalTool = assessmentTools.find(t => t.isFinal === true);
  
  if (!finalTool && gradeSettings?.finalExamName) {
      finalTool = assessmentTools.find(t => t.name.trim() === gradeSettings.finalExamName.trim());
  }
  
  // Identify Final Tool Name for display
  const finalToolName = finalTool ? finalTool.name : (gradeSettings?.finalExamName || "الامتحان النهائي");

  // Filter out the final tool from continuous tools
  const continuousTools = assessmentTools.filter(t => 
      t.id !== finalTool?.id && t.name.trim() !== finalToolName.trim()
  );

  let continuousSum = 0;
  
  // Calculate continuous sum based on tools
  continuousTools.forEach(tool => {
      const g = currentSemesterGrades.find(r => r.category.trim() === tool.name.trim());
      if (g) continuousSum += (Number(g.score) || 0);
  });

  // Calculate final score
  let finalScore = 0;
  if (finalToolName) {
      const g = currentSemesterGrades.find(r => r.category.trim() === finalToolName.trim());
      if (g) finalScore = (Number(g.score) || 0);
  }

  // Fallback total calculation if no tools defined
  const fallbackTotal = currentSemesterGrades.reduce((a, b) => a + (Number(b.score) || 0), 0);
  const totalScore = assessmentTools.length > 0 ? (continuousSum + finalScore) : fallbackTotal;

  // Filter Absence and Truant records
  const absenceRecords = (student.attendance || []).filter(a => a.status === 'absent');
  const truantRecords = (student.attendance || []).filter(a => a.status === 'truant');

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
      window.scrollTo(0, 0); // ضمان البدء من الأعلى

      const opt = {
          margin: 10,
          filename: `Report_${student.name}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
              scale: 2, 
              useCORS: true, 
              logging: false,
              windowWidth: 800
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      try {
          const worker = html2pdf().set(opt).from(element).toPdf();
          
          if (Capacitor.isNativePlatform()) {
               const pdfBase64 = await worker.output('datauristring');
               const base64Data = pdfBase64.split(',')[1];
               const result = await Filesystem.writeFile({ 
                   path: `Report_${student.name}.pdf`, 
                   data: base64Data, 
                   directory: Directory.Cache 
               });
               await Share.share({ title: `Report_${student.name}`, url: result.uri });
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

  // Determine Max Scores for Display
  const maxTotal = gradeSettings?.totalScore || 100;
  const maxFinal = gradeSettings?.finalExamScore || 40;
  const maxContinuous = maxTotal - maxFinal;

  return (
    <div className="flex flex-col h-full space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-900">
        
        {/* Header Action Bar */}
        <div className="flex items-center justify-between glass-heavy p-4 rounded-[2rem] print:hidden">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-3 rounded-full glass-icon hover:bg-gray-100 transition-colors">
                    <ArrowRight className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h2 className="text-lg font-black text-slate-900">{student.name}</h2>
                    <p className="text-xs font-bold text-gray-500">{student.classes[0]} • تقرير الفصل {currentSemester}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handlePrintReport} 
                    disabled={isGeneratingPdf}
                    className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2"
                >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    طباعة التقرير
                </button>
            </div>
        </div>

        {/* Report Preview (Screen) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
            <div id="report-content" className="bg-white text-black p-8 rounded-none md:rounded-[2rem] max-w-4xl mx-auto shadow-sm border border-gray-200 relative overflow-hidden box-border" dir="rtl">
                
                {/* Formal Header */}
                <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-6">
                    <div className="text-center w-1/3">
                        <p className="font-bold text-sm mb-1 text-black">سلطنة عمان</p>
                        <p className="font-bold text-sm mb-1 text-black">وزارة التعليم</p>
                        <p className="font-bold text-sm mb-1 text-black">المديرية العامة لتعليم لمحافظة {teacherInfo?.governorate || '.........'}</p>
                        <p className="font-bold text-sm text-black">مدرسة {teacherInfo?.school || '................'}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center w-1/3">
                         {teacherInfo?.ministryLogo ? (
                             <img src={teacherInfo.ministryLogo} className="h-20 object-contain" alt="Ministry Logo" />
                         ) : (
                             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border border-black">
                                 <FileText className="w-10 h-10 text-slate-300" />
                             </div>
                         )}
                         <h1 className="text-xl font-black mt-4 underline decoration-black decoration-2 underline-offset-4 text-black">تقرير مستوى طالب</h1>
                    </div>
                    <div className="text-center w-1/3 flex flex-col items-end">
                        <div className="text-right">
                             <p className="font-bold text-sm mb-1 text-black">العام الدراسي: {teacherInfo?.academicYear || `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`}</p>
                             <p className="font-bold text-sm mb-1 text-black">الفصل الدراسي: {currentSemester === '1' ? 'الأول' : 'الثاني'}</p>
                             <p className="font-bold text-sm text-black">تاريخ التقرير: {new Date().toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>
                </div>

                {/* Student Info Card */}
                <div className="bg-slate-50 rounded-2xl p-6 border-2 border-black mb-8 flex items-center justify-between text-black">
                    <div>
                        <div className="flex items-center gap-6 mb-4">
                            <div>
                                <span className="text-xs font-bold text-black block mb-1">اسم الطالب</span>
                                <h3 className="text-xl font-black text-black">{student.name}</h3>
                            </div>
                            <div className="w-px h-10 bg-black"></div>
                            <div>
                                <span className="text-xs font-bold text-black block mb-1">الصف</span>
                                <h3 className="text-xl font-black text-black">{student.classes[0]}</h3>
                            </div>
                            <div className="w-px h-10 bg-black"></div>
                            <div>
                                <span className="text-xs font-bold text-black block mb-1">رقم ولي الأمر</span>
                                <h3 className="text-lg font-black text-black font-mono" dir="ltr">{student.parentPhone || '-'}</h3>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-emerald-100 border border-black text-emerald-900 px-3 py-1 rounded-lg text-xs font-bold">نقاط إيجابية: {totalPositivePoints}</div>
                            <div className="bg-rose-100 border border-black text-rose-900 px-3 py-1 rounded-lg text-xs font-bold">نقاط سلبية: {totalNegativePoints}</div>
                        </div>
                    </div>
                    <div className="w-24 h-24 bg-white rounded-2xl border-2 border-black p-1 shadow-sm">
                         {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl text-3xl font-black text-black">{student.name.charAt(0)}</div>}
                    </div>
                </div>

                {/* Grades Section */}
                <div className="mb-8">
                    <h3 className="font-black text-lg mb-3 border-b-2 border-black inline-block text-black">
                        التحصيل الدراسي
                    </h3>
                    <table className="w-full border-collapse border border-black">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-black p-3 text-sm font-bold text-right text-black">المادة</th>
                                <th className="border border-black p-3 text-sm font-bold text-center text-black">أداة التقويم</th>
                                <th className="border border-black p-3 text-sm font-bold text-center text-black">الدرجة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assessmentTools.length > 0 ? (
                                <>
                                    {/* 1. Continuous Tools Rows */}
                                    {continuousTools.map((tool) => {
                                        const grade = currentSemesterGrades.find(g => g.category.trim() === tool.name.trim());
                                        return (
                                            <tr key={tool.id}>
                                                <td className="border border-black p-3 text-sm font-bold text-right text-black">{teacherInfo?.subject || 'المادة'}</td>
                                                <td className="border border-black p-3 text-sm text-center bg-[#ffedd5] text-black">{tool.name}</td>
                                                <td className="border border-black p-3 text-sm text-center font-bold font-mono text-black">{grade ? grade.score : '-'}</td>
                                            </tr>
                                        );
                                    })}
                                    
                                    {/* 2. Continuous Sum Row */}
                                    <tr className="bg-blue-50 font-bold">
                                        <td colSpan={2} className="border border-black p-3 text-sm text-center text-black border-t-2 border-black">المجموع ({maxContinuous})</td>
                                        <td className="border border-black p-3 text-sm text-center font-mono text-black border-t-2 border-black">{continuousSum}</td>
                                    </tr>

                                    {/* 3. Final Exam Row */}
                                    {finalToolName && (
                                        <tr key="final">
                                            <td className="border border-black p-3 text-sm font-bold text-right text-black">{teacherInfo?.subject || 'المادة'}</td>
                                            <td className="border border-black p-3 text-sm text-center bg-[#fce7f3] text-black">{finalToolName} ({maxFinal})</td>
                                            <td className="border border-black p-3 text-sm text-center font-bold font-mono text-black">{finalScore || '-'}</td>
                                        </tr>
                                    )}
                                </>
                            ) : (
                                /* Fallback if no tools defined */
                                currentSemesterGrades.length > 0 ? currentSemesterGrades.map((g, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-black p-3 text-sm font-bold text-black">{g.subject}</td>
                                        <td className="border border-black p-3 text-sm text-center text-black">{g.category}</td>
                                        <td className="border border-black p-3 text-sm text-center font-bold font-mono text-black">{g.score}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="border border-black p-4 text-center text-sm text-black">لا توجد درجات مرصودة لهذا الفصل</td>
                                    </tr>
                                )
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-100">
                                <td colSpan={2} className="border border-black p-3 text-sm font-black text-right border-t-2 border-black text-black">المجموع الكلي ({maxTotal})</td>
                                <td className="border border-black p-3 text-sm font-black text-center font-mono text-lg border-t-2 border-black text-black">
                                    {totalScore}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Attendance Summary and Details */}
                <div className="mb-8">
                     <h3 className="font-black text-lg mb-3 border-b-2 border-black inline-block text-black">
                        ملخص الحضور والغياب
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-4 rounded-xl bg-slate-50 border-2 border-black text-center text-black">
                            <span className="text-xs font-bold text-black block mb-1">أيام الغياب</span>
                            <span className="text-2xl font-black text-rose-600">{absenceRecords.length}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border-2 border-black text-center text-black">
                            <span className="text-xs font-bold text-black block mb-1">الهروب (التسرب)</span>
                            <span className="text-2xl font-black text-purple-600">{truantRecords.length}</span>
                        </div>
                         <div className="p-4 rounded-xl bg-slate-50 border-2 border-black text-center text-black">
                            <span className="text-xs font-bold text-black block mb-1">الحضور</span>
                            <span className="text-2xl font-black text-emerald-600">{student.attendance.filter(a => a.status === 'present').length}</span>
                        </div>
                    </div>

                    {/* Detailed Absence/Truancy Table */}
                    {(absenceRecords.length > 0 || truantRecords.length > 0) && (
                        <table className="w-full border-collapse border border-black mt-2">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border border-black p-2 text-xs font-bold text-right w-1/3 text-black">التاريخ</th>
                                    <th className="border border-black p-2 text-xs font-bold text-center text-black">الحالة</th>
                                    <th className="border border-black p-2 text-xs font-bold text-center text-black">الملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...absenceRecords, ...truantRecords]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((rec, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-black p-2 text-xs font-mono text-black">{new Date(rec.date).toLocaleDateString('en-GB')}</td>
                                        <td className={`border border-black p-2 text-xs font-bold text-center ${rec.status === 'absent' ? 'text-rose-600' : 'text-purple-600'}`}>
                                            {rec.status === 'absent' ? 'غياب' : 'تسرب'}
                                        </td>
                                        <td className="border border-black p-2 text-xs text-center text-black">-</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ✅ سجل السلوك والمواظبة (التصميم العمودي الجديد المقسم) */}
                <div className="mb-12">
                    <h3 className="font-black text-lg mb-3 border-b-2 border-black inline-block text-black">سجل السلوك والمواظبة</h3>
                    <div className="flex gap-4 items-start">
                        
                        {/* العمود الأيمن: السلوكيات الإيجابية */}
                        <div className="flex-1 border-2 border-black rounded-xl overflow-hidden min-h-[150px]">
                            <div className="bg-green-100 p-2 text-center font-bold border-b-2 border-black text-green-900 text-sm">
                                سلوكيات إيجابية ({posBehaviors.length})
                            </div>
                            <div className="p-2 space-y-2">
                                {posBehaviors.length > 0 ? posBehaviors.map((b: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-black/50 pb-1 last:border-0 text-sm">
                                        <span className="font-bold text-black">{b.description}</span>
                                        <div className="text-left text-[10px] font-bold text-black flex items-center gap-2">
                                            <div className="flex flex-col items-end">
                                                <span>{new Date(b.date).toLocaleDateString('en-GB')}</span>
                                                {b.session && <span>حصة: {b.session}</span>}
                                            </div>
                                            {/* الزر يظهر في الشاشة فقط ويختفي عند الطباعة */}
                                            {onUpdateStudent && (
                                                <button onClick={() => handleDeleteBehavior(b.id)} className="p-1 text-slate-400 hover:text-rose-500 print:hidden">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )) : <div className="text-center text-xs text-gray-500 py-4">- لا يوجد -</div>}
                            </div>
                        </div>

                        {/* العمود الأيسر: السلوكيات السلبية */}
                        <div className="flex-1 border-2 border-black rounded-xl overflow-hidden min-h-[150px]">
                            <div className="bg-red-100 p-2 text-center font-bold border-b-2 border-black text-red-900 text-sm">
                                سلوكيات سلبية ({negBehaviors.length})
                            </div>
                            <div className="p-2 space-y-2">
                                {negBehaviors.length > 0 ? negBehaviors.map((b: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-black/50 pb-1 last:border-0 text-sm">
                                        <span className="font-bold text-black">{b.description}</span>
                                        <div className="text-left text-[10px] font-bold text-black flex items-center gap-2">
                                            <div className="flex flex-col items-end">
                                                <span>{new Date(b.date).toLocaleDateString('en-GB')}</span>
                                                {b.session && <span>حصة: {b.session}</span>}
                                            </div>
                                            {/* الزر يظهر في الشاشة فقط ويختفي عند الطباعة */}
                                            {onUpdateStudent && (
                                                <button onClick={() => handleDeleteBehavior(b.id)} className="p-1 text-slate-400 hover:text-rose-500 print:hidden">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )) : <div className="text-center text-xs text-gray-500 py-4">- لا يوجد -</div>}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end pt-8 border-t-2 border-black relative">
                     <div className="text-center w-1/3">
                        <p className="font-bold text-sm mb-8 text-black">معلم المادة</p>
                        <p className="font-black text-lg text-black">{teacherInfo?.name || '....................'}</p>
                     </div>
                     
                     {/* School Stamp */}
                     {teacherInfo?.stamp && (
                         <div className="absolute left-1/2 bottom-2 transform -translate-x-1/2 w-32 opacity-80 mix-blend-multiply">
                             <img src={teacherInfo.stamp} className="w-full object-contain" alt="Stamp" />
                         </div>
                     )}

                     <div className="text-center w-1/3">
                        <p className="font-bold text-sm mb-8 text-black">مدير المدرسة</p>
                        <p className="font-black text-lg text-black">....................</p>
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StudentReport;
