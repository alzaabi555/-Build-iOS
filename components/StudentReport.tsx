
import React, { useRef } from 'react';
import { Student } from '../types';
import { Printer, Award, Download, GraduationCap, ArrowLeftRight, CheckCircle, TrendingUp, Calendar, Sigma, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StudentReportProps {
  student: Student;
}

const StudentReport: React.FC<StudentReportProps> = ({ student }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const attendanceCount = student.attendance.reduce((acc, curr) => {
    acc[curr.status]++;
    return acc;
  }, { present: 0, absent: 0, late: 0 });

  const socialGrades = (student.grades || []).filter(g => g.subject === 'الدراسات الاجتماعية');

  const subjectsSummary = socialGrades.reduce((acc: any, g) => {
    if (!acc[g.subject]) acc[g.subject] = { score: 0, max: 0 };
    acc[g.subject].score += g.score;
    acc[g.subject].max += g.maxScore;
    return acc;
  }, {});

  const gradeChartData = Object.keys(subjectsSummary).map(key => ({
    name: key,
    percent: Math.round((subjectsSummary[key].score / subjectsSummary[key].max) * 100)
  }));

  // حساب المجموع الكلي
  const totalScore = socialGrades.reduce((acc, g) => acc + g.score, 0);
  const totalMaxScore = socialGrades.reduce((acc, g) => acc + g.maxScore, 0);
  const totalPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  const handlePrint = () => {
    // التأكد من تحميل المحتوى قبل فتح نافذة الطباعة
    window.print();
  };

  const handleExportCSV = () => {
    try {
      const BOM = "\uFEFF";
      let csv = BOM + `تقرير الطالب: ${student.name}\n`;
      csv += `الفصل: ${student.classes?.join(' - ')}\n`;
      csv += `التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n\n`;
      
      csv += "سجل الدرجات (الدراسات الاجتماعية)\n";
      csv += "أداة التقويم,الدرجة,من,التاريخ\n";
      socialGrades.forEach(g => {
        csv += `${g.category},${g.score},${g.maxScore},${new Date(g.date).toLocaleDateString('ar-EG')}\n`;
      });

      csv += `\nالمجموع الكلي,${totalScore},${totalMaxScore},${totalPercentage}%\n`;
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `تقرير_${student.name}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('خطأ في التصدير');
    }
  };

  return (
    <div className="space-y-6 pb-20" ref={printRef} id="printable-report">
      {/* Header Info - Optimized for PDF */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between print:border-none print:shadow-none print:p-0 print:mb-8">
        <div className="flex items-center gap-5">
            <div className="print:block">
              {student.avatar ? (
                <img src={student.avatar} className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-50 shadow-sm print:w-20 print:h-20" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg print:w-20 print:h-20 print:shadow-none">
                  {student.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 print:text-2xl">{student.name}</h1>
              <p className="text-blue-600 text-[10px] font-black uppercase tracking-wide print:text-xs">
                {student.classes?.join(' / ') || 'عام'} • تقرير مادة الدراسات الاجتماعية
              </p>
            </div>
        </div>
        <div className="text-left text-[9px] font-bold text-gray-400 print:text-xs print:text-gray-600">
            {new Date().toLocaleDateString('ar-EG')}
        </div>
      </div>

      {/* Action Bar - Hidden in PDF */}
      <div className="grid grid-cols-2 gap-3 no-print">
          <button 
            onClick={handleExportCSV} 
            className="flex items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all text-blue-600 font-black text-[11px]"
          >
              <Download className="w-4 h-4" /> تصدير CSV
          </button>
          <button 
            onClick={handlePrint} 
            className="flex items-center justify-center gap-2 p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all text-white font-black text-[11px]"
          >
              <Printer className="w-4 h-4" /> حفظ بصيغة PDF
          </button>
      </div>

      {/* Grades Summary Chart - Hidden or Simplified in PDF depending on support */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden print:border-gray-200 print:shadow-none print:rounded-3xl">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-800 text-xs flex items-center gap-2 print:text-sm">
                <TrendingUp className="w-4 h-4 text-blue-500" /> ملخص التحصيل الدراسي
              </h3>
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full print:border print:border-emerald-200">الدراسات الاجتماعية</span>
          </div>
          {gradeChartData.length > 0 ? (
            <div className="h-40 w-full print:h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeChartData} layout="vertical" margin={{ left: -10, right: 30 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#6b7280' }} width={80} />
                  <Bar dataKey="percent" radius={[0, 10, 10, 0]} barSize={18}>
                    {gradeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.percent > 50 ? '#3b82f6' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-10">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <GraduationCap className="w-6 h-6 text-gray-200" />
                </div>
                <p className="text-gray-400 text-[10px] font-bold">لا توجد درجات مسجلة لهذه المادة</p>
            </div>
          )}
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-3 gap-3 print:gap-4">
        <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 text-center shadow-sm print:bg-white print:border-gray-200">
          <p className="text-[9px] text-emerald-600 font-black mb-1 print:text-gray-500">حاضر</p>
          <p className="text-xl font-black text-emerald-700 print:text-emerald-600">{attendanceCount.present}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100 text-center shadow-sm print:bg-white print:border-gray-200">
          <p className="text-[9px] text-rose-600 font-black mb-1 print:text-gray-500">غائب</p>
          <p className="text-xl font-black text-rose-700 print:text-rose-600">{attendanceCount.absent}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 text-center shadow-sm print:bg-white print:border-gray-200">
          <p className="text-[9px] text-amber-600 font-black mb-1 print:text-gray-500">متأخر</p>
          <p className="text-xl font-black text-amber-700 print:text-amber-600">{attendanceCount.late}</p>
        </div>
      </div>

      {/* Detailed Grades Table with Total - Optimized for Document/PDF */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm print:border-gray-200 print:shadow-none print:rounded-3xl">
        <div className="bg-gray-50/50 p-5 border-b border-gray-100 flex justify-between items-center print:bg-gray-50">
            <h3 className="font-black text-gray-800 text-[11px] flex items-center gap-2 print:text-sm">
                <FileText className="w-4 h-4 text-blue-500" /> تفاصيل السجل الأكاديمي
            </h3>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest print:text-gray-500">Detailed Report</span>
        </div>
        <div className="divide-y divide-gray-50 print:divide-gray-100">
          {socialGrades.slice().reverse().map(g => (
            <div key={g.id} className="p-5 flex items-center justify-between active:bg-gray-50 transition-colors print:py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center print:hidden">
                    <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                    <p className="text-xs font-black text-gray-900 print:text-sm">{g.category}</p>
                    <p className="text-[9px] text-gray-400 font-bold print:text-[10px]">{new Date(g.date).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>
              <div className="text-left bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 min-w-[70px] text-center print:bg-white print:border-gray-100">
                <span className="text-xs font-black text-blue-600 print:text-sm">{g.score}</span>
                <span className="text-[10px] text-gray-300 font-black mx-1">/</span>
                <span className="text-[10px] font-black text-gray-500 print:text-xs">{g.maxScore}</span>
              </div>
            </div>
          ))}
          
          {socialGrades.length > 0 ? (
            <div className="p-6 bg-blue-600/5 border-t border-blue-100 print:bg-gray-50 print:border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 print:shadow-none">
                            <Sigma className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-gray-900 print:text-sm">مجموع الدرجات الكلي</p>
                            <p className="text-[9px] text-blue-600 font-bold print:text-[10px]">إجمالي النقاط المحصلة في المادة</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="bg-white px-4 py-2 rounded-2xl border-2 border-blue-200 shadow-sm flex items-center gap-1.5 print:border-gray-300">
                            <span className="text-lg font-black text-blue-600">{totalScore}</span>
                            <span className="text-[10px] text-gray-300 font-black">/</span>
                            <span className="text-sm font-black text-gray-500">{totalMaxScore}</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 mt-1 bg-emerald-50 px-2 py-0.5 rounded-lg print:border print:border-emerald-100">
                            التحصيل: {totalPercentage}%
                        </span>
                    </div>
                </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[11px] text-gray-300 font-bold">سجل الدرجات فارغ حالياً</div>
          )}
        </div>
      </div>
      
      {/* Footer Signature (Visible in PDF/Print Only) */}
      <div className="hidden print:flex mt-20 pt-10 border-t-2 border-dashed border-gray-200 justify-between px-10">
          <div className="text-center">
              <p className="font-black text-[10px] mb-12 text-gray-400 uppercase tracking-widest">اعتماد معلم المادة</p>
              <div className="w-40 border-b border-gray-300 mx-auto"></div>
              <p className="mt-3 text-[11px] font-black text-gray-900">أ. محمد درويش الزعابي</p>
          </div>
          <div className="text-center">
              <p className="font-black text-[10px] mb-12 text-gray-400 uppercase tracking-widest">توقيع ولي الأمر</p>
              <div className="w-40 border-b border-gray-300 mx-auto"></div>
              <p className="mt-3 text-[11px] font-black text-gray-900">....................................</p>
          </div>
      </div>
    </div>
  );
};

export default StudentReport;
