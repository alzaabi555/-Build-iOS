import React, { useRef } from 'react';
import { X, Printer, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Student } from '../types';

interface StudentDetailedHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    teacherInfo?: any;
}

const StudentDetailedHistoryModal: React.FC<StudentDetailedHistoryModalProps> = ({ 
    isOpen, onClose, student, teacherInfo 
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    // إعدادات الطباعة (عمودي Portrait)
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `سجل_متابعة_${student.name}`,
        pageStyle: `
            @page {
                size: portrait;
                margin: 10mm;
            }
            @media print {
                body { -webkit-print-color-adjust: exact; }
                .print-hidden { display: none !important; }
                .print-content { box-shadow: none !important; border: none !important; }
            }
        `
    });

    if (!isOpen) return null;

    const allRecords = [
        ...(student.attendance || []).map(a => ({ ...a, recordType: 'attendance', sortDate: new Date(a.date) })),
        ...(student.behaviors || []).map(b => ({ ...b, recordType: 'behavior', sortDate: new Date(b.date) }))
    ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

    return (
        // ✅ z-[99999] + pt-20 (للهاتف لتفادي النوتش الكبير)
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start md:justify-center pt-20 md:pt-4 pb-4 px-4 animate-in fade-in duration-200 font-sans" dir="rtl">
            
            {/* زر إغلاق سريع في الخلفية للهاتف */}
            <div className="absolute top-8 right-6 md:hidden z-[100000]">
                <button onClick={onClose} className="bg-white/20 p-2 rounded-full text-white backdrop-blur-md border border-white/10">
                    <X size={24}/>
                </button>
            </div>

            {/* الحاوية الرئيسية */}
            <div className="bg-white w-full h-[85vh] md:h-auto md:max-h-[90vh] md:max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden relative z-[100001]">
                
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="font-black text-lg flex items-center gap-2">
                        <FileText className="text-emerald-400"/>
                        سجل الطالب التفصيلي
                    </h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={handlePrint} 
                            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 shadow-lg active:scale-95 transition-all pointer-events-auto"
                        >
                            <Printer size={16}/> طباعة
                        </button>
                        <button onClick={onClose} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors hidden md:block">
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto custom-scrollbar flex-1 bg-slate-100 p-4">
                    <div ref={printRef} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-full print-content print:p-0 print:w-full">
                        
                        {/* Report Header (Print Only) */}
                        <div className="border-b-2 border-black pb-4 mb-6 text-center hidden print:block">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-right">
                                    <p className="font-bold text-xs">سلطنة عمان</p>
                                    <p className="font-bold text-xs">وزارة التربية والتعليم</p>
                                </div>
                                <div><h1 className="text-xl font-black text-black">سجل متابعة يومي</h1></div>
                                <div className="text-left"><p className="font-mono text-xs">{new Date().toLocaleDateString('ar-EG')}</p></div>
                            </div>
                            <div className="flex justify-between bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                                <div className="text-right w-1/3"><span className="block text-[10px] text-gray-500">الطالب</span><span className="font-black">{student.name}</span></div>
                                <div className="text-center w-1/3"><span className="block text-[10px] text-gray-500">الصف</span><span className="font-black">{student.classes[0]}</span></div>
                                <div className="text-left w-1/3"><span className="block text-[10px] text-gray-500">المادة</span><span className="font-black">{teacherInfo?.subject}</span></div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-2 mb-4 print:mb-4">
                            <StatBox label="غياب" value={(student.attendance || []).filter(a => a.status === 'absent').length} color="rose" />
                            <StatBox label="تسرب" value={(student.attendance || []).filter(a => a.status === 'truant').length} color="purple" />
                            <StatBox label="إيجابي" value={(student.behaviors || []).filter(b => b.type === 'positive').length} color="emerald" />
                            <StatBox label="سلبي" value={(student.behaviors || []).filter(b => b.type === 'negative').length} color="orange" />
                        </div>

                        {/* Table */}
                        <table className="w-full text-xs md:text-sm border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-slate-800 text-white text-right print:bg-gray-200 print:text-black">
                                    <th className="p-2 border border-slate-300 w-24">التاريخ</th>
                                    <th className="p-2 border border-slate-300 w-12 text-center">الحصة</th>
                                    <th className="p-2 border border-slate-300 w-20">النوع</th>
                                    <th className="p-2 border border-slate-300">التفاصيل</th>
                                    <th className="p-2 border border-slate-300 w-16 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allRecords.length > 0 ? (
                                    allRecords.map((record: any, index) => (
                                        <tr key={index} className="border-b hover:bg-slate-50">
                                            <td className="p-2 border font-bold text-slate-700 whitespace-nowrap">{record.date}</td>
                                            <td className="p-2 border text-center font-bold">{record.period || '-'}</td>
                                            <td className="p-2 border">
                                                {record.recordType === 'attendance' ? 
                                                    <span className={`font-bold ${record.status === 'absent' ? 'text-rose-600' : 'text-slate-600'}`}>{record.status === 'absent' ? 'غياب' : record.status === 'truant' ? 'تسرب' : record.status === 'late' ? 'تأخر' : 'حضور'}</span> 
                                                    : <span className={`font-bold ${record.type === 'positive' ? 'text-emerald-600' : 'text-orange-600'}`}>{record.type === 'positive' ? 'إيجابي' : 'سلبي'}</span>
                                                }
                                            </td>
                                            <td className="p-2 border text-slate-800">{record.recordType === 'attendance' ? 'سجل الحضور' : record.description}</td>
                                            <td className="p-2 border text-center">
                                                <span className="print:hidden">
                                                    {record.type === 'positive' ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto"/> :
                                                     record.type === 'negative' ? <AlertTriangle size={16} className="text-orange-500 mx-auto"/> :
                                                     record.status === 'absent' ? <XCircle size={16} className="text-rose-500 mx-auto"/> :
                                                     record.status === 'truant' ? <AlertTriangle size={16} className="text-purple-500 mx-auto"/> : 
                                                     <CheckCircle2 size={16} className="text-slate-300 mx-auto"/>}
                                                </span>
                                                <span className="hidden print:inline font-bold">
                                                     {record.type === 'positive' ? '✓' : record.type === 'negative' ? 'X' : record.status === 'absent' ? 'غ' : record.status === 'truant' ? 'س' : '•'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-bold">سجل الطالب نظيف</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, color }: any) => {
    const styles: any = { rose: 'bg-rose-50 text-rose-700 border-rose-200', purple: 'bg-purple-50 text-purple-700 border-purple-200', emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200', orange: 'bg-orange-50 text-orange-700 border-orange-200' };
    return (<div className={`p-2 rounded-lg border flex flex-col items-center justify-center ${styles[color]}`}><span className="text-lg font-black">{value}</span><span className="text-[10px] font-bold">{label}</span></div>);
};

export default StudentDetailedHistoryModal;