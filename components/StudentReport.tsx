
import React from 'react';
import { Student } from '../types';
import { Printer, Award, AlertTriangle, Download, ClipboardList } from 'lucide-react';
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
    window.print();
  };

  const handleExportCSV = () => {
    const BOM = "\uFEFF";
    let csvContent = BOM;
    csvContent += "التقرير الشامل للطالب: " + student.name + "\n";
    csvContent += "الصف: " + student.grade + ", الفصول: " + student.classes.join(' - ') + "\n\n";

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
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_الطالب_${student.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportBehaviorLog = () => {
    const BOM = "\uFEFF";
    let csvContent = BOM + "التاريخ,النوع,الوصف\n";
    
    const sortedBehaviors = [...student.behaviors].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sortedBehaviors.forEach(b => {
      const date = new Date(b.date).toLocaleDateString('ar-EG');
      const type = b.type === 'positive' ? 'إيجابي' : 'سلبي';
      const escapedDesc = b.description.replace(/"/g, '""');
      csvContent += `${date},${type},"${escapedDesc}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `سجل_سلوكيات_${student.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col gap-3 no-print">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">تقرير الأداء</h2>
            <div className="flex gap-2">
                <button 
                    onClick={handleExportBehaviorLog}
                    className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 transition-colors active:scale-95"
                    title="تصدير سجل السلوكيات"
                >
                    <ClipboardList className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleExportCSV}
                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 transition-colors active:scale-95"
                    title="تصدير التقرير الشامل"
                >
                    <Download className="w-5 h-5" />
                </button>
                <button 
                    onClick={handlePrint}
                    className="p-2.5 bg-gray-900 text-white rounded-xl transition-colors active:scale-95"
                    title="طباعة"
                >
                    <Printer className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      {/* Report Header */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
        {student.avatar ? (
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-blue-100 border-2 border-white shrink-0">
            <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-100 shrink-0">
            {student.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
          <p className="text-gray-500 font-medium">الصف {student.grade}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {student.classes.map(c => (
              <span key={c} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 text-center shadow-sm">
          <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1 tracking-wider">الحضور</p>
          <p className="text-2xl font-bold text-emerald-700">{attendanceCount.present}</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-gray-100 text-center shadow-sm">
          <p className="text-[10px] text-red-600 uppercase font-bold mb-1 tracking-wider">الغياب</p>
          <p className="text-2xl font-bold text-red-700">{attendanceCount.absent}</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-gray-100 text-center shadow-sm">
          <p className="text-[10px] text-amber-600 uppercase font-bold mb-1 tracking-wider">التأخر</p>
          <p className="text-2xl font-bold text-amber-700">{attendanceCount.late}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <h3 className="font-bold mb-6 text-gray-800">تحليل السلوك</h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={behaviorData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                {behaviorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Behaviors List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-gray-800">سجل الأحداث</h3>
            <span className="text-xs text-gray-400 font-medium">الإجمالي: {student.behaviors.length}</span>
        </div>
        
        {student.behaviors.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
              <p className="text-gray-400 text-sm">لا توجد سجلات حالياً</p>
          </div>
        ) : (
          student.behaviors.map(b => (
            <div key={b.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-50 flex items-start gap-4 transition-transform active:scale-[0.98]">
              <div className={`p-3 rounded-2xl ${b.type === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {b.type === 'positive' ? <Award className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold ${b.type === 'positive' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {b.type === 'positive' ? 'إيجابي' : 'سلبي'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">{new Date(b.date).toLocaleDateString('ar-EG')}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed font-medium">{b.description}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print-only Footer */}
      <div className="hidden print:block mt-20 pt-10 border-t-2 border-gray-100">
        <div className="flex justify-between text-gray-800">
            <div className="text-center">
                <p className="font-bold mb-16">توقيع المعلم</p>
                <div className="w-40 h-px bg-gray-400 mx-auto"></div>
            </div>
            <div className="text-center">
                <p className="font-bold mb-16">توقيع ولي الأمر</p>
                <div className="w-40 h-px bg-gray-400 mx-auto"></div>
            </div>
            <div className="text-center">
                <p className="font-bold mb-16">إدارة المدرسة</p>
                <div className="w-32 h-32 border-4 border-double border-gray-300 rounded-full mx-auto flex items-center justify-center text-gray-300 text-[10px] font-bold">الختم الرسمي</div>
            </div>
        </div>
        <div className="mt-12 text-center">
            <p className="text-sm font-bold text-gray-900 mb-1">نظام مدرستي المتكامل</p>
            <p className="text-[10px] text-gray-400">تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentReport;
