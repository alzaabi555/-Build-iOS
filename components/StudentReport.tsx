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
   
  // ... (نفس منطق الحسابات السابق - لم يتغير) ...
  const behaviors = (student.behaviors || []).filter(b => !b.semester || b.semester === (currentSemester || '1'));
  const sortedBehaviors = [...behaviors].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const allGrades = student.grades || [];
  const totalPositivePoints = behaviors.filter(b => b.type === 'positive').reduce((acc, b) => acc + b.points, 0);
  const totalNegativePoints = behaviors.filter(b => b.type === 'negative').reduce((acc, b) => acc + Math.abs(b.points), 0);
  const currentSemesterGrades = allGrades.filter(g => !g.semester || g.semester === (currentSemester || '1'));
  const finalExamName = "الامتحان النهائي";
  const continuousTools = assessmentTools.filter(t => t.name.trim() !== finalExamName);
  const finalTool = assessmentTools.find(t => t.name.trim() === finalExamName);
  let continuousSum = 0;
  continuousTools.forEach(tool => { const g = currentSemesterGrades.find(r => r.category.trim() === tool.name.trim()); if (g) continuousSum += (Number(g.score) || 0); });
  let finalScore = 0;
  if (finalTool) { const g = currentSemesterGrades.find(r => r.category.trim() === finalTool.name.trim()); if (g) finalScore = (Number(g.score) || 0); }
  const totalScore = continuousSum + finalScore;
  const absenceRecords = (student.attendance || []).filter(a => a.status === 'absent');
  const truantRecords = (student.attendance || []).filter(a => a.status === 'truant');

  const handleDeleteBehavior = (behaviorId: string) => { if (confirm('هل أنت متأكد من حذف هذا السلوك؟')) { const updatedBehaviors = (student.behaviors || []).filter(b => b.id !== behaviorId); if (onUpdateStudent) { onUpdateStudent({ ...student, behaviors: updatedBehaviors }); } } };

  const handlePrintReport = async () => {
      const element = document.getElementById('report-content');
      if (!element) return;
      setIsGeneratingPdf(true);
      const scrollContainer = document.getElementById('report-scroll-container');
      if(scrollContainer) scrollContainer.scrollTop = 0;
      const opt = { margin: [5, 5, 5, 5], filename: `Report_${student.name}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 800 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } };
      try { const worker = html2pdf().set(opt).from(element).toPdf(); if (Capacitor.isNativePlatform()) { const pdfBase64 = await worker.output('datauristring'); const result = await Filesystem.writeFile({ path: opt.filename, data: pdfBase64.split(',')[1], directory: Directory.Cache }); await Share.share({ title: `تقرير الطالب: ${student.name}`, url: result.uri }); } else { worker.save(); } } catch (err) { console.error(err); alert('حدث خطأ أثناء الطباعة'); } finally { setIsGeneratingPdf(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        {/* استدعاء النافذة التفصيلية */}
        <StudentDetailedHistoryModal 
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            student={student}
            teacherInfo={teacherInfo}
        />

        {/* HEADER */}
        {/* ✅ Sticky بدلاً من Fixed لحل مشكلة الانزياح في الويندوز، و without left-0 */}
        <div className="fixed md:sticky top-0 z-40 md:z-30 bg-[#1e3a8a] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300 rounded-b-[2.5rem] md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all shadow-sm border border-white/10"><ArrowRight className="w-6 h-6" /></button>
                    <div><h2 className="text-xl font-black">{student.name}</h2><p className="text-[10px] text-blue-200 font-bold opacity-80">{student.classes[0]} • الفصل {currentSemester === '1' ? 'الأول' : 'الثاني'}</p></div>
                </div>
                <div className="flex gap-2">
                    {/* ✅ الزر هنا يعمل الآن لأنه يفتح Modal بـ z-index عالي */}
                    <button onClick={() => setShowHistoryModal(true)} className="bg-white/20 text-white px-4 py-3 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2 hover:bg-white/30"><LayoutList className="w-4 h-4" /> السجل التفصيلي</button>
                    <button onClick={handlePrintReport} disabled={isGeneratingPdf} className="bg-white text-[#1e3a8a] px-5 py-3 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2">{isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} طباعة</button>
                </div>
            </div>
        </div>

        {/* CONTENT */}
        <div id="report-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar">
            {/* ✅ تم حذف الفراغ الوهمي لأننا نستخدم Sticky */}
            <div className="px-4 pt-6 pb-24">
                <div id="report-content" className="bg-white text-slate-900 p-8 md:p-12 rounded-[2rem] max-w-4xl mx-auto shadow-xl border border-slate-100 relative overflow-hidden" dir="rtl">
                    {/* ... (باقي محتوى التقرير كما هو - Grade Table, Attendance, etc.) ... */}
                    <div className="flex justify-between items-start mb-8 border-b-2 border-gray-100 pb-6"><div className="text-center w-1/3 text-xs font-bold text-black"><p>سلطنة عمان</p><p>وزارة التربية والتعليم</p><p>مدرسة {teacherInfo?.school}</p></div><div className="flex flex-col items-center justify-center w-1/3">{teacherInfo?.ministryLogo ? <img src={teacherInfo.ministryLogo} className="h-20 object-contain mix-blend-multiply" alt="Logo" /> : <FileText className="w-16 h-16 text-slate-200" />}<h1 className="text-xl font-black mt-2 text-black underline">تقرير الطالب العام</h1></div><div className="text-center w-1/3 text-xs font-bold text-black"><p>العام: {teacherInfo?.academicYear}</p><p>الفصل: {currentSemester === '1' ? 'الأول' : 'الثاني'}</p><p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p></div></div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8 flex items-center justify-between print:bg-slate-50"><div><div className="flex items-center gap-8 mb-4"><div><span className="text-[10px] font-bold text-slate-500 block mb-1">الاسم</span><h3 className="text-xl font-black text-black">{student.name}</h3></div><div className="w-px h-10 bg-slate-300"></div><div><span className="text-[10px] font-bold text-slate-500 block mb-1">الصف</span><h3 className="text-xl font-black text-black">{student.classes[0]}</h3></div></div><div className="flex gap-4"><div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-200">إيجابي: {totalPositivePoints}</div><div className="bg-rose-100 text-rose-800 px-3 py-1 rounded-lg text-xs font-bold border border-rose-200">سلبي: {totalNegativePoints}</div></div></div><div className="w-24 h-24 bg-white rounded-2xl border-2 border-slate-200 p-1 shadow-sm overflow-hidden">{student.avatar ? <img src={student.avatar} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full flex items-center justify-center bg-slate-100 text-3xl font-black text-slate-300">{student.name.charAt(0)}</div>}</div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8"><div><h3 className="font-black text-lg mb-4 flex items-center gap-2 text-black border-b-2 border-slate-100 pb-2"><FileText className="w-5 h-5 text-[#1e3a8a]" /> التحصيل الدراسي</h3><table className="w-full border-collapse text-xs"><thead><tr className="bg-slate-100 text-black"><th className="border p-2">الأداة</th><th className="border p-2">الدرجة</th></tr></thead><tbody>{assessmentTools.length > 0 ? (<>{continuousTools.map(tool => {const grade = currentSemesterGrades.find(g => g.category.trim() === tool.name.trim()); return <tr key={tool.id}><td className="border p-2">{tool.name}</td><td className="border p-2 font-bold text-center">{grade ? grade.score : '-'}</td></tr>})}{finalTool && (() => {const grade = currentSemesterGrades.find(g => g.category.trim() === finalTool.name.trim()); return <tr><td className="border p-2 bg-pink-50">{finalTool.name}</td><td className="border p-2 font-bold text-center">{grade ? grade.score : '-'}</td></tr>})()}<tr className="bg-slate-200 font-black"><td className="border p-2">المجموع</td><td className="border p-2 text-center">{totalScore}</td></tr></>) : <tr><td colSpan={2} className="p-2 text-center">لا توجد درجات</td></tr>}</tbody></table></div><div><h3 className="font-black text-lg mb-4 flex items-center gap-2 text-black border-b-2 border-slate-100 pb-2"><LayoutList className="w-5 h-5 text-[#1e3a8a]" /> الحضور والغياب</h3><div className="flex gap-2 text-center mb-4"><div className="flex-1 p-2 bg-rose-50 border border-rose-100 rounded-lg"><span className="block text-xs font-bold text-rose-500">غياب</span><span className="text-xl font-black text-rose-700">{absenceRecords.length}</span></div><div className="flex-1 p-2 bg-purple-50 border border-purple-100 rounded-lg"><span className="block text-xs font-bold text-purple-500">تسرب</span><span className="text-xl font-black text-purple-700">{truantRecords.length}</span></div></div><div className="border rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar">{[...absenceRecords, ...truantRecords].length > 0 ? ([...absenceRecords, ...truantRecords].map((rec, i) => (<div key={i} className="flex justify-between text-xs p-1 border-b last:border-0"><span>{rec.date}</span><span className={`font-bold ${rec.status==='absent'?'text-rose-600':'text-purple-600'}`}>{rec.status==='absent'?'غياب يوم':'تسرب'} {rec.period && `(حصة ${rec.period})`}</span></div>))) : <p className="text-center text-xs text-gray-400">سجل الحضور نظيف</p>}</div></div></div>
                    <div className="mb-8"><h3 className="font-black text-lg mb-4 flex items-center gap-2 text-black border-b-2 border-slate-100 pb-2"><Award className="w-5 h-5 text-[#1e3a8a]" /> سجل السلوك والملاحظات</h3>{sortedBehaviors.length > 0 ? (<div className="space-y-2">{sortedBehaviors.map((b, idx) => (<div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${b.type === 'positive' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${b.type === 'positive' ? 'bg-emerald-200 text-emerald-700' : 'bg-rose-200 text-rose-700'}`}>{b.type === 'positive' ? <Award className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}</div><div><p className="text-sm font-bold text-black">{b.description}</p><div className="flex items-center gap-2 mt-1"><p className="text-[10px] text-slate-500 font-mono">{new Date(b.date).toLocaleDateString('en-GB')}</p>{b.period && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white border rounded text-slate-600">حصة {b.period}</span>}</div></div></div><div className="flex items-center gap-2"><span className={`text-sm font-black ${b.type === 'positive' ? 'text-emerald-700' : 'text-rose-700'}`}>{b.type === 'positive' ? '+' : '-'}{Math.abs(b.points)}</span>{onUpdateStudent && (<button onClick={() => handleDeleteBehavior(b.id)} className="p-1 text-slate-400 hover:text-rose-500 print:hidden"><Trash2 className="w-4 h-4" /></button>)}</div></div>))}</div>) : (<p className="text-center text-sm text-slate-500 py-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">لا توجد ملاحظات سلوكية مسجلة</p>)}</div>
                    <div className="flex justify-between items-end pt-8 border-t-2 border-gray-100 mt-auto"><div className="text-center w-1/3"><p className="font-bold text-sm mb-8 text-black">معلم المادة</p><p className="font-black text-lg text-black">{teacherInfo?.name}</p></div><div className="text-center w-1/3">{teacherInfo?.stamp && <img src={teacherInfo.stamp} className="w-32 opacity-80 mix-blend-multiply mx-auto" alt="Stamp" />}</div><div className="text-center w-1/3"><p className="font-bold text-sm mb-8 text-black">مدير المدرسة</p><p className="font-black text-lg text-black">....................</p></div></div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StudentReport;