import React, { useEffect, useState } from 'react';
import { Student } from '../types';
import { Trash2, Loader2, FileText, ArrowRight, Printer } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext';
import html2pdf from 'html2pdf.js';

interface StudentReportProps {
  student: Student;
  onUpdateStudent?: (s: Student) => void;
  currentSemester?: '1' | '2';
  teacherInfo?: {
    name: string;
    school: string;
    subject: string;
    governorate: string;
    stamp?: string;
    ministryLogo?: string;
    academicYear?: string;
  };
  onBack?: () => void;
}

type ReportPeriod = '1' | '2' | 'annual';

const StudentReport: React.FC<StudentReportProps> = ({
  student,
  onUpdateStudent,
  currentSemester,
  teacherInfo,
  onBack
}) => {
  const { assessmentTools, gradeSettings, t, dir, language } = useApp();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>(
    currentSemester === '2' ? '2' : '1'
  );

  useEffect(() => {
    setReportPeriod(currentSemester === '2' ? '2' : '1');
  }, [currentSemester]);

  const selectedSemester: '1' | '2' = reportPeriod === '2' ? '2' : '1';
  const isAnnualReport = reportPeriod === 'annual';
  const allGrades = student.grades || [];

  const behaviors = (student.behaviors || []).filter((behavior: any) => {
    if (isAnnualReport) return true;
    return (behavior.semester || '1') === selectedSemester;
  });

  const posBehaviors = behaviors.filter((behavior: any) => behavior.type === 'positive');
  const negBehaviors = behaviors.filter((behavior: any) => behavior.type === 'negative');

  const totalPositivePoints = posBehaviors.reduce(
    (acc: number, behavior: any) => acc + (Number(behavior.points) || 0),
    0
  );
  const totalNegativePoints = negBehaviors.reduce(
    (acc: number, behavior: any) => acc + Math.abs(Number(behavior.points) || 0),
    0
  );

  const displayPosBehaviors = posBehaviors.filter(
    (behavior: any) => behavior.description !== 'هدوء وانضباط'
  );

  const currentSemesterGrades = allGrades.filter(
    (grade: any) => (grade.semester || '1') === selectedSemester
  );

  let finalTool = assessmentTools.find((tool: any) => tool.isFinal === true);

  if (!finalTool && gradeSettings?.finalExamName) {
    finalTool = assessmentTools.find(
      (tool: any) =>
        String(tool.name || '').trim() ===
        String(gradeSettings.finalExamName || '').trim()
    );
  }

  const finalToolName = finalTool
    ? finalTool.name
    : gradeSettings?.finalExamName ||
      t('finalExamNameDefault') ||
      'الامتحان النهائي';

  const continuousTools = assessmentTools.filter(
    (tool: any) =>
      tool.id !== finalTool?.id &&
      String(tool.name || '').trim() !== String(finalToolName || '').trim()
  );

  let continuousSum = 0;

  continuousTools.forEach((tool: any) => {
    const grade = currentSemesterGrades.find(
      (record: any) =>
        String(record.category || '').trim() === String(tool.name || '').trim()
    );
    if (grade) continuousSum += Number(grade.score) || 0;
  });

  let finalScore = 0;

  if (finalToolName) {
    const grade = currentSemesterGrades.find(
      (record: any) =>
        String(record.category || '').trim() === String(finalToolName).trim()
    );
    if (grade) finalScore = Number(grade.score) || 0;
  }

  const fallbackTotal = currentSemesterGrades.reduce(
    (total: number, grade: any) => total + (Number(grade.score) || 0),
    0
  );

  const totalScore =
    assessmentTools.length > 0 ? continuousSum + finalScore : fallbackTotal;

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
      (total: number, grade: any) => total + (Number(grade.score) || 0),
      0
    );
  };

  const sem1Total = calculateSemesterTotal(sem1Grades);
  const sem2Total = calculateSemesterTotal(sem2Grades);
  const hasSemesterOneData = sem1Grades.length > 0;
  const hasSemesterTwoData = sem2Grades.length > 0;
  const hasCompleteAnnualResult = hasSemesterOneData && hasSemesterTwoData;
  const finalAverage = hasCompleteAnnualResult
    ? (sem1Total + sem2Total) / 2
    : null;

  const getSymbol = (score: number) => {
    const totalPossible = gradeSettings?.totalScore || 100;
    const percent = (score / totalPossible) * 100;

    if (dir === 'rtl') {
      if (percent >= 90) return 'أ';
      if (percent >= 80) return 'ب';
      if (percent >= 65) return 'ج';
      if (percent >= 50) return 'د';
      return 'هـ';
    }

    if (percent >= 90) return 'A';
    if (percent >= 80) return 'B';
    if (percent >= 65) return 'C';
    if (percent >= 50) return 'D';
    return 'F';
  };

  const filteredAttendance = (student.attendance || []).filter(
    (attendance: any) => {
      if (isAnnualReport) return true;
      return (attendance.semester || '1') === selectedSemester;
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
      const updatedBehaviors = (student.behaviors || []).filter(
        (behavior: any) => behavior.id !== behaviorId
      );
      if (onUpdateStudent) {
        onUpdateStudent({ ...student, behaviors: updatedBehaviors });
      }
    }
  };

  const getReportPeriodFileName = () => {
    if (reportPeriod === 'annual') return 'Annual';
    return reportPeriod === '1' ? 'Semester_1' : 'Semester_2';
  };

  const handlePrintReport = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    setIsGeneratingPdf(true);
    window.scrollTo(0, 0);

    const safeStudentName = String(student.name || 'Student').replace(
      /[\\/:*?"<>|]/g,
      '-'
    );
    const fileName = `Report_${safeStudentName}_${getReportPeriodFileName()}.pdf`;

    const opt = {
      margin: 10,
      filename: fileName,
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
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });
        await Share.share({ title: fileName.replace('.pdf', ''), url: result.uri });
      } else {
        worker.save();
      }
    } catch (error) {
      console.error('PDF Error:', error);
      alert(t('errorPrinting'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const maxTotal = gradeSettings?.totalScore || 100;
  const maxFinal = gradeSettings?.finalExamScore || 40;
  const maxContinuous = maxTotal - maxFinal;

  const reportPeriodLabel =
    reportPeriod === 'annual'
      ? 'النتيجة النهائية للعام الدراسي'
      : reportPeriod === '1'
        ? 'تقرير الفصل الدراسي الأول'
        : 'تقرير الفصل الدراسي الثاني';

  return (
    <div
      className={`flex flex-col h-full space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 text-textPrimary ${
        dir === 'rtl' ? 'text-right' : 'text-left'
      }`}
      dir={dir}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 glass-heavy p-4 rounded-[2rem] print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-3 rounded-full glass-icon hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowRight
              className={`w-5 h-5 text-slate-600 ${
                dir === 'ltr' ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-textPrimary truncate">
              {student.name}
            </h2>
            <p className="text-xs font-bold text-gray-500">
              {student.classes?.[0] || '-'} • {reportPeriodLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <select
            value={reportPeriod}
            onChange={event =>
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
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            {t('printReportBtn')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        <div
          id="report-content"
          className={`bg-bgCard text-black p-8 rounded-none md:rounded-[2rem] max-w-4xl mx-auto shadow-sm border border-gray-200 relative overflow-hidden box-border ${
            dir === 'rtl' ? 'text-right' : 'text-left'
          }`}
          dir={dir}
        >
          <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-6">
            <div
              className={`w-1/3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              <p className="font-bold text-sm mb-1 text-black">
                {t('sultanateOfOman')}
              </p>
              <p className="font-bold text-sm mb-1 text-black">
                {t('ministryOfEducation')}
              </p>
              <p className="font-bold text-sm mb-1 text-black">
                {t('eduDirectoratePrefix')} {teacherInfo?.governorate || '.........'}
              </p>
              <p className="font-bold text-sm text-black">
                {t('schoolPrefix')} {teacherInfo?.school || '................'}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center w-1/3">
              {teacherInfo?.ministryLogo ? (
                <img
                  src={teacherInfo.ministryLogo}
                  className="h-20 object-contain"
                  alt="Ministry Logo"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border border-black">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
              )}
              <h1 className="text-xl font-black mt-4 underline decoration-black decoration-2 underline-offset-4 text-black text-center">
                {t('studentLevelReport')}
              </h1>
            </div>

            <div className="text-center w-1/3 flex flex-col items-end">
              <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                <p className="font-bold text-sm mb-1 text-black">
                  {t('academicYearPrefix')}{' '}
                  {teacherInfo?.academicYear ||
                    `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`}
                </p>
                <p className="font-bold text-sm mb-1 text-black">
                  {reportPeriod === 'annual'
                    ? 'النتيجة النهائية للعام الدراسي'
                    : `${t('semesterPrefix')} ${
                        reportPeriod === '1'
                          ? t('firstSemesterWord')
                          : t('secondSemesterWord')
                      }`}
                </p>
                <p className="font-bold text-sm text-black">
                  {t('reportDatePrefix')}{' '}
                  {new Date().toLocaleDateString(
                    language === 'ar' ? 'ar-EG' : 'en-US'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border-2 border-black mb-8 flex items-center justify-between text-black">
            <div>
              <div className="flex items-center gap-6 mb-4">
                <div>
                  <span className="text-xs font-bold text-black block mb-1">
                    {t('studentNameLabel')}
                  </span>
                  <h3 className="text-xl font-black text-black">{student.name}</h3>
                </div>
                <div className="w-px h-10 bg-black" />
                <div>
                  <span className="text-xs font-bold text-black block mb-1">
                    {t('classLabelShort')}
                  </span>
                  <h3 className="text-xl font-black text-black">
                    {student.classes?.[0] || '-'}
                  </h3>
                </div>
                <div className="w-px h-10 bg-black" />
                <div>
                  <span className="text-xs font-bold text-black block mb-1">
                    {t('parentPhoneLabel')}
                  </span>
                  <h3
                    className="text-lg font-black text-black font-mono"
                    dir="ltr"
                  >
                    {student.parentPhone || '-'}
                  </h3>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-emerald-100 border border-black text-emerald-900 px-3 py-1 rounded-lg text-xs font-bold">
                  {t('positivePointsLabel')} {totalPositivePoints}
                </div>
                <div className="bg-rose-100 border border-black text-rose-900 px-3 py-1 rounded-lg text-xs font-bold">
                  {t('negativePointsLabel')} {totalNegativePoints}
                </div>
              </div>
            </div>

            <div className="w-24 h-24 bg-bgCard rounded-2xl border-2 border-black p-1 shadow-sm shrink-0">
              {student.avatar ? (
                <img
                  src={student.avatar}
                  className="w-full h-full object-cover rounded-xl"
                  alt={student.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl text-3xl font-black text-black">
                  {student.name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-black text-lg mb-3 border-b-2 border-black inline-block text-black">
              {t('academicAchievementTitle')}
            </h3>
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100">
                  <th
                    className={`border border-black p-3 text-sm font-bold ${
                      dir === 'rtl' ? 'text-right' : 'text-left'
                    } text-black`}
                  >
                    {t('subjectCol')}
                  </th>
                  <th className="border border-black p-3 text-sm font-bold text-center text-black">
                    {t('assessmentToolCol')}
                  </th>
                  <th className="border border-black p-3 text-sm font-bold text-center text-black">
                    {t('scoreCol')}
                  </th>
                </tr>
              </thead>

              <tbody>
                {isAnnualReport ? (
                  <>
                    <tr>
                      <td
                        className={`border border-black p-3 text-sm font-bold ${
                          dir === 'rtl' ? 'text-right' : 'text-left'
                        } text-black`}
                      >
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
                      <td
                        className={`border border-black p-3 text-sm font-bold ${
                          dir === 'rtl' ? 'text-right' : 'text-left'
                        } text-black`}
                      >
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
                    {continuousTools.map((tool: any) => {
                      const grade = currentSemesterGrades.find(
                        (record: any) =>
                          String(record.category || '').trim() ===
                          String(tool.name || '').trim()
                      );

                      return (
                        <tr key={tool.id}>
                          <td
                            className={`border border-black p-3 text-sm font-bold ${
                              dir === 'rtl' ? 'text-right' : 'text-left'
                            } text-black`}
                          >
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
                        className="border border-black p-3 text-sm text-center text-black border-t-2 border-black"
                      >
                        {t('totalParentheses')} ({maxContinuous})
                      </td>
                      <td className="border border-black p-3 text-sm text-center font-mono text-black border-t-2 border-black">
                        {continuousSum}
                      </td>
                    </tr>

                    {finalToolName && (
                      <tr key="final">
                        <td
                          className={`border border-black p-3 text-sm font-bold ${
                            dir === 'rtl' ? 'text-right' : 'text-left'
                          } text-black`}
                        >
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
                  currentSemesterGrades.map((grade: any, index: number) => (
                    <tr key={grade.id || index}>
                      <td className="border border-black p-3 text-sm font-bold text-black">
                        {grade.subject || teacherInfo?.subject || t('subjectCol')}
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

              {!isAnnualReport && (
                <tfoot>
                  <tr className="bg-slate-100">
                    <td
                      colSpan={2}
                      className={`border border-black p-3 text-sm font-black ${
                        dir === 'rtl' ? 'text-right' : 'text-left'
                      } border-t-2 border-black text-black`}
                    >
                      {t('grandTotalParentheses')} ({maxTotal})
                    </td>
                    <td className="border border-black p-3 text-sm font-black text-center font-mono text-lg border-t-2 border-black text-black">
                      {totalScore}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {isAnnualReport && (
            <div className="flex border-2 border-black rounded-xl overflow-hidden mb-8 bg-amber-50">
              <div
                className={`bg-amber-200 p-4 ${
                  dir === 'rtl' ? 'border-l-2' : 'border-r-2'
                } border-black flex items-center justify-center font-black text-black text-center`}
              >
                النتيجة النهائية
                <br />
                للعام الدراسي
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 items-center p-4">
                <div className="text-center">
                  <p className="text-xs font-bold mb-1">مجموع الفصل 1</p>
                  <p className="font-black text-lg">
                    {hasSemesterOneData ? sem1Total : 'غير متوفر'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold mb-1">مجموع الفصل 2</p>
                  <p className="font-black text-lg">
                    {hasSemesterTwoData ? sem2Total : 'غير متوفر'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold mb-1">المعدل النهائي</p>
                  <p className="font-black text-xl text-blue-800">
                    {finalAverage !== null
                      ? finalAverage.toFixed(2)
                      : 'غير مكتمل'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold mb-1">التقدير العام</p>
                  <p className="font-black text-2xl text-emerald-700">
                    {finalAverage !== null ? getSymbol(finalAverage) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="font-black text-lg mb-3 border-b-2 border-black inline-block text-black">
              {t('attendanceSummaryTitle')}
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-slate-50 border-2 border-black text-center text-black">
                <span className="text-xs font-bold text-black block mb-1">
                  {t('absenceDaysCount')}
                </span>
                <span className="text-2xl font-black text-rose-600">
                  {absenceRecords.length}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border-2 border-black text-center text-black">
                <span className="text-xs font-bold text-black block mb-1">
                  {t('truancyCount')}
                </span>
                <span className="text-2xl font-black text-purple-600">
                  {truantRecords.length}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border-2 border-black text-center text-black">
                <span className="text-xs font-bold text-black block mb-1">
                  {t('presenceCount')}
                </span>
                <span className="text-2xl font-black text-emerald-600">
                  {presentRecords.length}
                </span>
              </div>
            </div>

            {(absenceRecords.length > 0 || truantRecords.length > 0) && (
              <table className="w-full border-collapse border border-black mt-2">
                <thead>
                  <tr className="bg-slate-100">
                    <th
                      className={`border border-black p-2 text-xs font-bold ${
                        dir === 'rtl' ? 'text-right' : 'text-left'
                      } w-1/3 text-black`}
                    >
                      {t('dateCol')}
                    </th>
                    <th className="border border-black p-2 text-xs font-bold text-center text-black">
                      {t('statusCol')}
                    </th>
                    <th className="border border-black p-2 text-xs font-bold text-center text-black">
                      {t('notesCol')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...absenceRecords, ...truantRecords]
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((record: any, index: number) => (
                      <tr key={record.id || `${record.date}-${index}`}>
                        <td className="border border-black p-2 text-xs font-mono text-black">
                          {new Date(record.date).toLocaleDateString(
                            language === 'ar' ? 'en-GB' : 'en-US'
                          )}
                        </td>
                        <td
                          className={`border border-black p-2 text-xs font-bold text-center ${
                            record.status === 'absent'
                              ? 'text-rose-600'
                              : 'text-purple-600'
                          }`}
                        >
                          {record.status === 'absent'
                            ? t('absentStatus')
                            : t('truantStatus')}
                        </td>
                        <td className="border border-black p-2 text-xs text-center text-black">
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mb-12">
            <h3 className="font-black text-lg mb-3 border-b-2 border-black inline-block text-black">
              {t('behaviorRecordTitle')}
            </h3>
            <div className="flex gap-4 items-start">
              <div className="flex-1 border-2 border-black rounded-xl overflow-hidden min-h-[150px]">
                <div className="bg-green-100 p-2 text-center font-bold border-b-2 border-black text-green-900 text-sm">
                  {t('notablePositiveBehaviorsTitle')} ({displayPosBehaviors.length})
                </div>
                <div className="p-2 space-y-2">
                  {displayPosBehaviors.length > 0 ? (
                    displayPosBehaviors.map((behavior: any, index: number) => (
                      <div
                        key={behavior.id || index}
                        className="flex justify-between items-center border-b border-black/50 pb-1 last:border-0 text-sm"
                      >
                        <span className="font-bold text-black">
                          {behavior.description}
                        </span>
                        <div className="text-[10px] font-bold text-black flex items-center gap-2">
                          <div
                            className={`flex flex-col ${
                              dir === 'rtl'
                                ? 'items-end text-left'
                                : 'items-start text-right'
                            }`}
                          >
                            <span>
                              {new Date(behavior.date).toLocaleDateString(
                                language === 'ar' ? 'en-GB' : 'en-US'
                              )}
                            </span>
                            {behavior.session && (
                              <span>
                                {t('sessionPrefix')} {behavior.session}
                              </span>
                            )}
                          </div>
                          {onUpdateStudent && (
                            <button
                              onClick={() => handleDeleteBehavior(behavior.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 print:hidden"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-gray-500 py-4">
                      {t('noBehaviors')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 border-2 border-black rounded-xl overflow-hidden min-h-[150px]">
                <div className="bg-red-100 p-2 text-center font-bold border-b-2 border-black text-red-900 text-sm">
                  {t('negativeBehaviorsTitle')} ({negBehaviors.length})
                </div>
                <div className="p-2 space-y-2">
                  {negBehaviors.length > 0 ? (
                    negBehaviors.map((behavior: any, index: number) => (
                      <div
                        key={behavior.id || index}
                        className="flex justify-between items-center border-b border-black/50 pb-1 last:border-0 text-sm"
                      >
                        <span className="font-bold text-black">
                          {behavior.description}
                        </span>
                        <div className="text-[10px] font-bold text-black flex items-center gap-2">
                          <div
                            className={`flex flex-col ${
                              dir === 'rtl'
                                ? 'items-end text-left'
                                : 'items-start text-right'
                            }`}
                          >
                            <span>
                              {new Date(behavior.date).toLocaleDateString(
                                language === 'ar' ? 'en-GB' : 'en-US'
                              )}
                            </span>
                            {behavior.session && (
                              <span>
                                {t('sessionPrefix')} {behavior.session}
                              </span>
                            )}
                          </div>
                          {onUpdateStudent && (
                            <button
                              onClick={() => handleDeleteBehavior(behavior.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 print:hidden"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-gray-500 py-4">
                      {t('noBehaviors')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-8 border-t-2 border-black relative">
            <div className="text-center w-1/3">
              <p className="font-bold text-sm mb-8 text-black">
                {t('subjectTeacherLabel')}
              </p>
              <p className="font-black text-lg text-black">
                {teacherInfo?.name || '....................'}
              </p>
            </div>

            {teacherInfo?.stamp && (
              <div className="absolute left-1/2 bottom-2 transform -translate-x-1/2 w-32 opacity-80 mix-blend-multiply">
                <img
                  src={teacherInfo.stamp}
                  className="w-full object-contain"
                  alt="Stamp"
                />
              </div>
            )}

            <div className="text-center w-1/3">
              <p className="font-bold text-sm mb-8 text-black">
                {t('schoolPrincipalLabel')}
              </p>
              <p className="font-black text-lg text-black">....................</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReport;
