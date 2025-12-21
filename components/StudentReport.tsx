import React from 'react';
import { Student } from '../types';
import { Printer, Award, AlertTriangle, Download, BarChart3, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StudentReportProps {
  student: Student;
}

const StudentReport: React.FC<StudentReportProps> = ({ student }) => {
  const attendanceCount = student.attendance.reduce((acc, curr) => {
    acc[curr.status]++;
    return acc;
  }, { present: 0, absent: 0, late: 0 });

  const behaviorData = [
    { name: 'إيجابي', value: student.behaviors.filter(b => b.type === 'positive').length, color: '#10b981' },
    { name: 'سلبي', value: student.behaviors.filter(b => b.type === 'negative').length, color: '#ef4444' },
  ];

  const handlePrint = () => {
    // Ensuring DOM is ready for print
    window.requestAnimationFrame(() => {
      window.print();
    });
  };

  const handleExportCSV = () => {
    try {
      const BOM = "\uFEFF"; // Byte Order Mark for Excel Arabic support
      let csvContent = BOM;
      csvContent += `تقرير الطالب: ${student.name}\n`;
      csvContent += `الصف: ${student.grade}\n`;
      csvContent += `الفصول: ${student.classes?.join(' - ') || 'غير محدد'}\n\n`;

      csvContent += "ملخص الحضور والغياب\n";
      csvContent += "حاضر,غائب,متأخر\n";
      csvContent += `${attendanceCount.present},${attendanceCount.absent},${attendanceCount.late}\n\n`;

      csvContent += "سجل السلوكيات\n";
      csvContent += "التاريخ,النوع,الوصف\n";
      student.behaviors.forEach(b => {
        const date = new Date(b.date).toLocaleDateString('ar-EG');
        const type = b.type === 'positive' ? 'إيجابي' : 'سلبي';
        csvContent += `${date},${type},"${b.description.replace(/"/g, '""')}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `تقرير_${student.name.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e);
      alert('حدث خطأ أثناء محاولة التصدير');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left duration-500 pb-20">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 no-print"></div>
        
        {student.avatar ? (
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border-2 border-white shrink-0 relative z-10">
            <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0 relative z-10">
            {student.name.charAt(0)}
          </div>
        )}
        <div className="relative z-10 min-w-0">
          <h1 className="text-lg font-black text-gray-900 truncate">{student.name}</h1>
          <p className="text-gray-400 text-[10px] font-black mt-0.5">
            {student.grade} • {student.classes?.join(' / ') || 'فصل غير محدد'}
          </p>
        </div>
      </div>

      {/* Action Bar - No Print */}
      <div className="grid grid-cols-3 gap-3 no-print">
          <button 
              onClick={handleExportCSV}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all text-blue-600"
          >
              <Download className="w-5 h-5 mb-2" />
              <span className="text-[9px] font-black">تصدير CSV</span>
          </button>
          <button 
              onClick={handlePrint}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all text-gray-900"
          >
              <Printer className="w-5 h-5 mb-2" />
              <span className="text-[9px] font-black">طباعة</span>
          </button>
          <div className="flex flex-col items-center justify-center p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 text-white">
              <Award className="w-5 h-5 mb-2" />
              <span className="text-[9px] font-black">الرتبة: ممتاز</span>
          </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 text-center">
          <p className="text-[8px] text-emerald-600 font-black mb-1">حضور</p>
          <p className="text-xl font-black text-emerald-700">{attendanceCount.present}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100 text-center">
          <p className="text-[8px] text-rose-600 font-black mb-1">غياب</p>
          <p className="text-xl font-black text-rose-700">{attendanceCount.absent}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 text-center">
          <p className="text-[8px] text-amber-600 font-black mb-1">تأخر</p>
          <p className="text-xl font-black text-amber-700">{attendanceCount.late}</p>
        </div>
      </div>

      {/* Behavior Analysis Chart */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
        <h3 className="font-black mb-5 text-gray-800 text-[11px] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            تحليل السلوكيات
        </h3>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={behaviorData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={35}>
                {behaviorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Behavior Timeline */}
      <div className="space-y-3">
        <h3 className="font-black text-gray-800 text-[11px] px-1 uppercase tracking-widest">آخر التحديثات السلوكية</h3>
        {student.behaviors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
              <p className="text-gray-400 text-[10px] font-bold">لا توجد سجلات سلوكية مسجلة</p>
          </div>
        ) : (
          student.behaviors.map(b => (
            <div key={b.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-start gap-3 active:scale-[0.98] transition-all">
              <div className={`p-2 rounded-xl shrink-0 ${b.type === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {b.type === 'positive' ? <Award className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center mb-0.5">
                  <span className={`text-[9px] font-black uppercase tracking-wider ${b.type === 'positive' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {b.type === 'positive' ? 'إيجابي' : 'سلبي'}
                  </span>
                  <span className="text-[8px] text-gray-400 font-medium">{new Date(b.date).toLocaleDateString('ar-EG')}</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed font-bold">{b.description}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print-Only Footer */}
      <div className="hidden print:block mt-20 pt-10 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-20">
            <div className="text-center">
                <div className="border-b border-gray-300 w-32 mx-auto mb-2"></div>
                <p className="font-black text-xs">توقيع المعلم المربي</p>
            </div>
            <div className="text-center">
                <div className="border-b border-gray-300 w-32 mx-auto mb-2"></div>
                <p className="font-black text-xs">توقيع ولي الأمر</p>
            </div>
        </div>
        <div className="mt-16 text-center">
            <p className="text-[9px] text-gray-400">صدر هذا التقرير آلياً من نظام مدرستي بتاريخ {new Date().toLocaleString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentReport;