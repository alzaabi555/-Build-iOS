import React, { useEffect, useState } from 'react';
import { Student } from '../types';
import { Award, AlertCircle, Trash2, Loader2, FileText, LayoutList, ArrowRight, Printer } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext';
import html2pdf from 'html2pdf.js';

interface StudentReportProps {
  type ReportPeriod = '1' | '2' | 'annual';
  student: Student;
  onUpdateStudent?: (s: Student) => void;
  currentSemester?: '1' | '2';
  teacherInfo?: { name: string; school: string; subject: string; governorate: string; stamp?: string; ministryLogo?: string; academicYear?: string };
  onBack?: () => void;
}

const StudentReport: React.FC<StudentReportProps> = ({ student, onUpdateStudent, currentSemester, teacherInfo, onBack }) => {
  // 🌍 استدعاء محرك الترجمة والاتجاه
  const { assessmentTools, gradeSettings, t, dir, language } = useApp();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>(
  currentSemester === '2' ? '2' : '1'
);

useEffect(() => {
  setReportPeriod(currentSemester === '2' ? '2' : '1');
}, [currentSemester]);

const selectedSemester: '1' | '2' =
  reportPeriod === '2' ? '2' : '1';

const isAnnualReport = reportPeriod === 'annual';
 const allGrades = student.grades || [];

const behaviors = (student.behaviors || []).filter((behavior: any) => {
  if (isAnnualReport) return true;

  const behaviorSemester = behavior.semester || '1';
  return behaviorSemester === selectedSemester;
});

  const posBehaviors = behaviors.filter(b => b.type === 'positive');
  const negBehaviors = behaviors.filter(b => b.type === 'negative');

  const totalPositivePoints = posBehaviors.reduce((acc, b) => acc + b.points, 0);
  const totalNegativePoints = negBehaviors.reduce((acc, b) => acc + Math.abs(b.points), 0);

  // ✅ الفلتر البصري يبقى كما هو باللغة العربية لارتباطه المباشر بالبيانات المخزنة
  const displayPosBehaviors = posBehaviors.filter(b => b.description !== 'هدوء وانضباط');

  const currentSemesterGrades = allGrades.filter((grade: any) => {
  const gradeSemester = grade.semester || '1';
  return gradeSemester === selectedSemester;
});
  
  let finalTool = assessmentTools.find(t => t.isFinal === true);
  
  if (!finalTool && gradeSettings?.finalExamName) {
      finalTool = assessmentTools.find(t => t.name.trim() === gradeSettings.finalExamName.trim());
  }
  
  const finalToolName = finalTool ? finalTool.name : (gradeSettings?.finalExamName || t('finalExamNameDefault') || "الامتحان النهائي");

  const continuousTools = assessmentTools.filter(t => 
      t.id !== finalTool?.id && t.name.trim() !== finalToolName.trim()
  );

  let continuousSum = 0;
  
  continuousTools.forEach(tool => {
      const g = currentSemesterGrades.find(r => r.category.trim() === tool.name.trim());
      if (g) continuousSum += (Number(g.score) || 0);
  });

  let finalScore = 0;
  if (finalToolName) {
      const g = currentSemesterGrades.find(r => r.category.trim() === finalToolName.trim());
      if (g) finalScore = (Number(g.score) || 0);
  }

  const fallbackTotal = currentSemesterGrades.reduce((a, b) => a + (Number(b.score) || 0), 0);
  const totalScore = assessmentTools.length > 0 ? (continuousSum + finalScore) : fallbackTotal;

  // =========================================================================
  // 💉 الجراحة الدقيقة: حساب النتيجة النهائية للعام (ف1 + ف2)
  // =========================================================================
 const sem1Grades = allGrades.filter(
  (grade: any) => (grade.semester || '1') === '1'
);

const sem2Grades = allGrades.filter(
  (grade: any) => (grade.semester || '1') === '2'
);

const calculateSemesterTotal = (semesterGrades: any[]) => {
  if (assessmentTools.length > 0) {
    return assessmentTools.reduce((total: number, tool: any) => {
      const grade = semesterGrades.find(
        (record: any) =>
          String(record.category || '').trim() ===
          String(tool.name || '').trim()
      );

      return total + (grade ? Number(grade.score) || 0 : 0);
    }, 0);
  }

  return semesterGrades.reduce(
    (total: number, grade: any) =>
      total + (Number(grade.score) || 0),
    0
  );
};

const sem1Total = calculateSemesterTotal(sem1Grades);
const sem2Total = calculateSemesterTotal(sem2Grades);

const hasSemesterOneData = sem1Grades.length > 0;
const hasSemesterTwoData = sem2Grades.length > 0;
const hasCompleteAnnualResult =
  hasSemesterOneData && hasSemesterTwoData;

const finalAverage = hasCompleteAnnualResult
  ? (sem1Total + sem2Total) / 2
  : null;

  const getSymbol = (sc: number) => {
      const totalPossible = gradeSettings?.totalScore || 100;
      const percent = (sc / totalPossible) * 100;
      if (dir === 'rtl') {
          if (percent >= 90) return 'أ';
          if (percent >= 80) return 'ب';
          if (percent >= 65) return 'ج';
          if (percent >= 50) return 'د';
          return 'هـ';
      } else {
          if (percent >= 90) return 'A';
          if (percent >= 80) return 'B';
          if (percent >= 65) return 'C';
          if (percent >= 50) return 'D';
          return 'F';
      }
  };
  // =========================================================================

 const filteredAttendance = (student.attendance || []).filter(
  (attendance: any) => {
    if (isAnnualReport) return true;

    const attendanceSemester = attendance.semester || '1';
    return attendanceSemester === selectedSemester;
  }
);

const absenceRecords = filteredAttendance.filter(
  (attendance: any) => attendance.status === 'absent'
);

const truantRecords = filteredAttendance.filter(
  (attendance: any) => attendance.status === 'truant'
);

const presentRecords = filteredAttendance.filter(
  (attendance: any) => attendance.status === 'present'
);
  const handleDeleteBehavior = (behaviorId: string) => {
      if (confirm(t('confirmDeleteBehavior'))) {
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
      window.scrollTo(0, 0); 

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
          alert(t('errorPrinting'));
      } finally { 
          setIsGeneratingPdf(false); 
      }
  };

  const maxTotal = gradeSettings?.totalScore || 100;
  const maxFinal = gradeSettings?.finalExamScore || 40;
  const maxContinuous = maxTotal - maxFinal;

  // 🌍 تطبيق الاتجاه العام على الصفحة
  return (
    <div className={`flex flex-col h-full space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 text-textPrimary ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
        
        {/* Header Action Bar */}
        <div className="flex items-center justify-between glass-heavy p-4 rounded-[2rem] print:hidden">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-3 rounded-full glass-icon hover:bg-gray-100 transition-colors">
                    <ArrowRight className={`w-5 h-5 text-slate-600 ${dir === 'ltr' ? 'rotate-180' : ''}`} />
                </button>
                <div>
                    <h2 className="text-lg font-black text-textPrimary">{student.name}</h2>
                    <p className="text-xs font-bold text-gray-500">
  {student.classes[0]} •{' '}
  {reportPeriod === 'annual'
    ? 'النتيجة النهائية للعام الدراسي'
    : reportPeriod === '1'
      ? 'تقرير الفصل الدراسي الأول'
      : 'تقرير الفصل الدراسي الثاني'}
</p>
                </div>
            </div>
           <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
    <select
        value={reportPeriod}
        onChange={(event) =>
          setReportPeriod(event.target.value as ReportPeriod)
        }
        className="bg-bgCard border border-borderColor text-textPrimary px-3 py-2.5 rounded-xl font-black text-xs outline-none focus:border-primary min-w-[210px]"
        title="اختيار فترة التقرير"
    >
        <option value="1">الفصل الدراسي الأول فقط</option>
        <option value="2">الفصل الدراسي الثاني فقط</option>
        <option value="annual">النتيجة النهائية للعام الدراسي</option>
    </select>

    <button 
        onClick={handlePrintReport}
                    disabled={isGeneratingPdf}
                    className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2"
                >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    {t('printReportBtn')}
                </button>
            </div>
        </div>

        {/* Report Preview (Screen) - 🌍 ربط dir بالمحتوى المطبوع ليعكس اللغات */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
            <div id="report-content" className={`bg-bgCard text-black p-8 rounded-none md:rounded-[2rem] max-w-4xl mx-auto shadow-sm border border-gray-200 relative overflow-hidden box-border ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
                
                {/* Formal Header */}
                <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-6">
                    <div className={`w-1/3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                        <p className="font-bold text-sm mb-1 text-black">{t('sultanateOfOman')}</p>
                        <p className="font-bold text-sm mb-1 text-black">{t('ministryOfEducation')}</p>
                        <p className="font-bold text-sm mb-1 text-black">{t('eduDirectoratePrefix')} {teacherInfo?.governorate || '.........'}</p>
                        <p className="font-bold text-sm text-black">{t('schoolPrefix')} {teacherInfo?.school || '................'}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center w-1/3">
                         {teacherInfo?.ministryLogo ? (
                             <img src={teacherInfo.ministryLogo} className="h-20 object-contain" alt="Ministry Logo" />
                         ) : (
                             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border border-black">
                                 <FileText className="w-10 h-10 text-slate-300" />
                             </div>
                         )}
                         <h1 className="text-xl font-black mt-4 underline decoration-black decoration-2 underline-offset-4 text-black">{t('studentLevelReport')}</h1>
                    </div>
                    <div className="text-center w-1/3 flex flex-col items-end">
                        <div className={`${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                             <p className="font-bold text-sm mb-1 text-black">{t('academicYearPrefix')} {teacherInfo?.academicYear || `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`}</p>
                            <p className="font-bold text-sm mb-1 text-black">
  {reportPeriod === 'annual'
    ? 'النتيجة النهائية للعام الدراسي'
    : `${t('semesterPrefix')} ${
        reportPeriod === '1'
          ? t('firstSemesterWord')
          : t('secondSemesterWord')
      }`}
</p>
                             <p className="font-bold text-sm text-black">{t('reportDatePrefix')} {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                        </div>
                    </div>
                </div>

                {/* Student Info Card */}
                <div className="bg-slate-50 rounded-2xl p-6 border-2 border-black mb-8 flex items-center justify-between text-black">
                    <div>
                        <div className="flex items-center gap-6 mb-4">
                            <div>
                                <span className="text-xs font-bold text-black block mb-1">{t('studentNameLabel')}</span>
                                <h3 className="text-xl font-black text-black">{student.name}</h3>
                            </div>
                            <div className="w-px h-10 bg-black"></div>
                            <div>
                                <span className="text-xs font-bold text-black block mb-1">{t('classLabelShort')}</span>
                                <h3 className="text-xl font-black text-black">{student.classes[0]}</h3>
                            </div>
                            <div className="w-px h-10 bg-black"></div>
                            <div>
                                <span className="text-xs font-bold text-black block mb-1">{t('parentPhoneLabel')}</span>
                                <h3 className="text-lg font-black text-black font-mono" dir="ltr">{student.parentPhone || '-'}</h3>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-emerald-100 border border-black text-emerald-900 px-3 py-1 rounded-lg text-xs font-bold">{t('positivePointsLabel')} {totalPositivePoints}</div>
                            <div className="bg-rose-100 border border-black text-rose-900 px-3 py-1 rounded-lg text-xs font-bold">{t('negativePointsLabel')} {totalNegativePoints}</div>
                        </div>
                    </div>
                    <div className="w-24 h-24 bg-bgCard rounded-2xl border-2 border-black p-1 shadow-sm">
                         {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl text-3xl font-black text-black">{student.name.charAt(0)}</div>}
                    </div>
                </div>

                {/* Grades Section */}
                <div className="mb-8">
                    <h3 className="font-black text-lg mb-3 border-b-2 border-black inline-block text-black">
                        {t('academicAchievementTitle')}
                    </h3>
                    <table className="w-full border-collapse border border-black">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className={`border border-black p-3 text-sm font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'} text-black`}>{t('subjectCol')}</th>
                                <th className="border border-black p-3 text-sm font-bold text-center text-black">{t('assessmentToolCol')}</th>
                                <th className="border border-black p-3 text-sm font-bold text-center text-black">{t('scoreCol')}</th>
                            </tr>
                        </thead>
                        <tbody>
  {isAnnualReport ? (
    <>
      <tr>
        <td className={`border border-black p-3 text-sm font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'} text-black`}>
          {teacherInfo?.subject || t('subjectCol')}
        </td>
        <td className="border border-black p-3 text-sm text-center bg-blue-50 text-black">
          مجموع الفصل الدراسي الأول
        </td>
        <td className="border border-black p-3 text-sm text-center font-bold font-mono text-black">
          {hasSemesterOneData ? sem1Total : 'غير متوفر'}
        </td>
      </tr>

      <tr>
        <td className={`border border-black p-3 text-sm font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'} text-black`}>
          {teacherInfo?.subject || t('subjectCol')}
        </td>
        <td className="border border-black p-3 text-sm text-center bg-emerald-50 text-black">
          مجموع الفصل الدراسي الثاني
        </td>
        <td className="border border-black p-3 text-sm text-center font-bold font-mono text-black">
          {hasSemesterTwoData ? sem2Total : 'غير متوفر'}
        </td>
      </tr>

      <tr className="bg-amber-50">
        <td
          colSpan={2}
          className="border border-black p-3 text-sm font-black text-center text-black"
        >
          المعدل النهائي للعام الدراسي
        </td>
        <td className="border border-black p-3 text-lg font-black text-center font-mono text-blue-800">
          {finalAverage !== null
            ? finalAverage.toFixed(2)
            : 'غير مكتمل'}
        </td>
      </tr>
    </>
  ) : assessmentTools.length > 0 ? (
    <>
      {continuousTools.map(tool => {
        const grade = currentSemesterGrades.find(
          grade =>
            String(grade.category || '').trim() ===
            String(tool.name || '').trim()
        );

        return (
          <tr key={tool.id}>
            <td className={`border border-black p-3 text-sm font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'} text-black`}>
              {teacherInfo?.subject || t('subjectCol')}
            </td>
            <td className="border border-black p-3 text-sm text-center bg-[#ffedd5] text-black">
              {tool.name}
            </td>
            <td className="border border-black p-3 text-sm text-center font-bold font-mono text-black">
              {grade ? grade.score : '-'}
            </td>
          </tr>
        );
      })}

      <tr className="bg-blue-50 font-bold">
        <td
          colSpan={2}
          className="border border-black p-3 text-sm text-center text-black border-t-2"
        >
          {t('totalParentheses')} ({maxContinuous})
        </td>
        <td className="border border-black p-3 text-sm text-center font-mono text-black border-t-2">
          {continuousSum}
        </td>
      </tr>

      {finalToolName && (
        <tr key="final">
          <td className={`border border-black p-3 text-sm font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'} text-black`}>
            {teacherInfo?.subject || t('subjectCol')}
          </td>
          <td className="border border-black p-3 text-sm text-center bg-[#fce7f3] text-black">
            {finalToolName} ({maxFinal})
          </td>
          <td className="border border-black p-3 text-sm text-center font-bold font-mono text-black">
            {finalScore || '-'}
          </td>
        </tr>
      )}
    </>
  ) : currentSemesterGrades.length > 0 ? (
    currentSemesterGrades.map((grade, index) => (
      <tr key={index}>
        <td className="border border-black p-3 text-sm font-bold text-black">
          {grade.subject}
        </td>
        <td className="border border-black p-3 text-sm text-center text-black">
          {grade.category}
        </td>
        <td className="border border-black p-3 text-sm text-center font-bold font-mono text-black">
          {grade.score}
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td
        colSpan={3}
        className="border border-black p-4 text-center text-sm text-black"
      >
        {t('noGradesForSemester')}
      </td>
    </tr>
  )}
</tbody>

                                {[...absenceRecords, ...truantRecords]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((rec, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-black p-2 text-xs font-mono text-black">{new Date(rec.date).toLocaleDateString(language === 'ar' ? 'en-GB' : 'en-US')}</td>
                                        <td className={`border border-black p-2 text-xs font-bold text-center ${rec.status === 'absent' ? 'text-rose-600' : 'text-purple-600'}`}>
                                            {rec.status === 'absent' ? t('absentStatus') : t('truantStatus')}
                                        </td>
                                        <td className="border border-black p-2 text-xs text-center text-black">-</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* سجل السلوك والمواظبة */}
                <div className="mb-12">
                    <h3 className="font-black text-lg mb-3 border-b-2 border-black inline-block text-black">{t('behaviorRecordTitle')}</h3>
                    <div className="flex gap-4 items-start">
                        
                        {/* العمود الأول: السلوكيات الإيجابية */}
                        <div className="flex-1 border-2 border-black rounded-xl overflow-hidden min-h-[150px]">
                            <div className="bg-green-100 p-2 text-center font-bold border-b-2 border-black text-green-900 text-sm">
                                {t('notablePositiveBehaviorsTitle')} ({displayPosBehaviors.length})
                            </div>
                            <div className="p-2 space-y-2">
                                {displayPosBehaviors.length > 0 ? displayPosBehaviors.map((b: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-black/50 pb-1 last:border-0 text-sm">
                                        <span className="font-bold text-black">{b.description}</span>
                                        <div className="text-[10px] font-bold text-black flex items-center gap-2">
                                            <div className={`flex flex-col ${dir === 'rtl' ? 'items-end text-left' : 'items-start text-right'}`}>
                                                <span>{new Date(b.date).toLocaleDateString(language === 'ar' ? 'en-GB' : 'en-US')}</span>
                                                {b.session && <span>{t('sessionPrefix')} {b.session}</span>}
                                            </div>
                                            {onUpdateStudent && (
                                                <button onClick={() => handleDeleteBehavior(b.id)} className="p-1 text-slate-400 hover:text-rose-500 print:hidden">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )) : <div className="text-center text-xs text-gray-500 py-4">{t('noBehaviors')}</div>}
                            </div>
                        </div>

                        {/* العمود الثاني: السلوكيات السلبية */}
                        <div className="flex-1 border-2 border-black rounded-xl overflow-hidden min-h-[150px]">
                            <div className="bg-red-100 p-2 text-center font-bold border-b-2 border-black text-red-900 text-sm">
                                {t('negativeBehaviorsTitle')} ({negBehaviors.length})
                            </div>
                            <div className="p-2 space-y-2">
                                {negBehaviors.length > 0 ? negBehaviors.map((b: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-black/50 pb-1 last:border-0 text-sm">
                                        <span className="font-bold text-black">{b.description}</span>
                                        <div className="text-[10px] font-bold text-black flex items-center gap-2">
                                            <div className={`flex flex-col ${dir === 'rtl' ? 'items-end text-left' : 'items-start text-right'}`}>
                                                <span>{new Date(b.date).toLocaleDateString(language === 'ar' ? 'en-GB' : 'en-US')}</span>
                                                {b.session && <span>{t('sessionPrefix')} {b.session}</span>}
                                            </div>
                                            {onUpdateStudent && (
                                                <button onClick={() => handleDeleteBehavior(b.id)} className="p-1 text-slate-400 hover:text-rose-500 print:hidden">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )) : <div className="text-center text-xs text-gray-500 py-4">{t('noBehaviors')}</div>}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end pt-8 border-t-2 border-black relative">
                     <div className={`text-center w-1/3`}>
                        <p className="font-bold text-sm mb-8 text-black">{t('subjectTeacherLabel')}</p>
                        <p className="font-black text-lg text-black">{teacherInfo?.name || '....................'}</p>
                     </div>
                     
                     {/* School Stamp */}
                     {teacherInfo?.stamp && (
                         <div className="absolute left-1/2 bottom-2 transform -translate-x-1/2 w-32 opacity-80 mix-blend-multiply">
                             <img src={teacherInfo.stamp} className="w-full object-contain" alt="Stamp" />
                         </div>
                     )}

                     <div className={`text-center w-1/3`}>
                        <p className="font-bold text-sm mb-8 text-black">{t('schoolPrincipalLabel')}</p>
                        <p className="font-black text-lg text-black">....................</p>
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StudentReport;
