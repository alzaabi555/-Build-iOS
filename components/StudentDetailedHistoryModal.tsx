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

    // ✅ إعدادات الطباعة: تم إجبارها على الوضع العمودي (Portrait)
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `سجل_متابعة_${student.name}`,
        pageStyle: `
            @page {
                size: portrait; /* 👈 هنا التعديل: عمودي */
                margin: 10mm;
            }
            @media print {
                body { -webkit-print-color-adjust: exact; }
                .print-hidden { display: none !important; }
                /* إزالة الظلال والحواف عند الطباعة لتكون نظيفة */
                .print-content { box-shadow: none !important; border: none !important; }
            }
        `
    });

    if (!isOpen) return null;

    const allRecords = [
        ...(student.attendance || []).map(a => ({ 
            ...a, 
            recordType: 'attendance', 
            sortDate: new Date(a.date) 
        })),
        ...(student.behaviors || []).map(b => ({ 
            ...b, 
            recordType: 'behavior', 
            sortDate: new Date(b.date) 
        }))
    ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

    return (
        // ✅ z-[2000] لضمان أن النافذة فوق كل شيء (بما في ذلك القوائم الجانبية)
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200 font-sans" dir="rtl">
            
            <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl rounded-xl md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="font-black text-lg flex items-center gap-2">
                        <FileText className="text-emerald-400"/>
                        سجل الطالب التفصيلي
                    </h2>
                    <div className="flex gap-2">
                        {/* زر الطباعة يعمل الآن لأنه في طبقة عليا */}
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 shadow-lg active:scale-95 transition-all">
                            <Printer size={16}/> طباعة
                        </button>
                        <button onClick={onClose} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors">
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                {/* Printable Content Wrapper */}
                <div className="overflow-y-auto custom-scrollbar flex-1 bg-slate-100 p-4 md:p-6">
                    {/* هذا هو الجزء الذي سيتم طباعته */}
                    <div ref={printRef} className="bg-white p-8 rounded-none md:rounded-2xl shadow-sm border border-slate-200 min-h-full print-content print:p-0 print:w-full">
                        
                        {/* Report Header for Print */}
                        <div className="border-b-2 border-black pb-4 mb-6 text-center hidden print:block">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-right">
                                    <p className="font-bold text-xs">سلطنة عمان</p>
                                    <p className="font-bold text-xs">وزارة التربية والتعليم</p>
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-black">سجل متابعة يومي</h1>
                                </div>
                                <div className="text-left">
                                    <p className="font-mono text-xs">{new Date().toLocaleDateString('ar-EG')}</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                                <div className="text-right w-1/3">
                                    <span className="block text-[10px] text-gray-500 font-bold">الطالب</span>
                                    <span className="font-black text-black">{student.name}</span>
                                </div>
                                <div className="text-center w-1/3">
                                    <span className="block text-[10px] text-gray-500 font-bold">الصف</span>
                                    <span className="font-black text-black">{student.classes[0]}</span>
                                </div>
                                <div className="text-left w-1/3">
                                    <span className="block text-[10px] text-gray-500 font-bold">المادة</span>
                                    <span className="font-black text-black">{teacherInfo?.subject}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-4 gap-3 mb-6 print:mb-4">
                            <StatBox label="غياب" value={(student.attendance || []).filter(a => a.status === 'absent').length} color="rose" />
                            <StatBox label="تسرب" value={(student.attendance || []).filter(a => a.status === 'truant').length} color="purple" />
                            <StatBox label="إيجابي" value={(student.behaviors || []).filter(b => b.type === 'positive').length} color="emerald" />
                            <StatBox label="سلبي" value={(student.behaviors || []).filter(b => b.type === 'negative').length} color="orange" />
                        </div>

                        {/* Detailed Table */}
                        <table className="w-full text-xs md:text-sm border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-slate-800 text-white text-right print:bg-gray-200 print:text-black">
                                    <th className="p-2 border border-slate-300 w-24">التاريخ</th>
                                    <th className="p-2 border border-slate-300 w-16 text-center">الحصة</th>
                                    <th className="p-2 border border-slate-300 w-24">النوع</th>
                                    <th className="p-2 border border-slate-300">التفاصيل</th>
                                    <th className="p-2 border border-slate-300 w-20 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allRecords.length > 0 ? (
                                    allRecords.map((record: any, index) => (
                                        <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                                            <td className="p-2 border border-slate-300 font-bold text-slate-700 whitespace-nowrap">
                                                {record.date}
                                            </td>
                                            <td className="p-2 border border-slate-300 text-center font-bold">
                                                {record.period || '-'}
                                            </td>
                                            <td className="p-2 border border-slate-300">
                                                {record.recordType === 'attendance' ? (
                                                    <span className={`font-bold ${record.status === 'absent' ? 'text-rose-600' : 'text-slate-600'}`}>
                                                        {record.status === 'absent' ? 'غياب' : record.status === 'truant' ? 'تسرب' : record.status === 'late' ? 'تأخر' : 'حضور'}
                                                    </span>
                                                ) : (
                                                    <span className={`font-bold ${record.type === 'positive' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                        {record.type === 'positive' ? 'سلوك إيجابي' : 'سلوك سلبي'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 border border-slate-300 font-medium text-slate-800">
                                                {record.recordType === 'attendance' ? 'سجل الحضور' : record.description}
                                            </td>
                                            <td className="p-2 border border-slate-300 text-center">
                                                {/* أيقونات للشاشة ورموز نصية للطباعة */}
                                                <span className="print:hidden">
                                                    {record.type === 'positive' ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto"/> :
                                                     record.type === 'negative' ? <AlertTriangle size={16} className="text-orange-500 mx-auto"/> :
                                                     record.status === 'absent' ? <XCircle size={16} className="text-rose-500 mx-auto"/> :
                                                     record.status === 'truant' ? <AlertTriangle size={16} className="text-purple-500 mx-auto"/> : 
                                                     <CheckCircle2 size={16} className="text-slate-300 mx-auto"/>}
                                                </span>
                                                <span className="hidden print:inline font-black text-lg">
                                                     {record.type === 'positive' ? '✓' :
                                                     record.type === 'negative' ? '!' :
                                                     record.status === 'absent' ? 'x' :
                                                     record.status === 'truant' ? 'س' : '•'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">
                                            سجل الطالب نظيف
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Footer for Print */}
                        <div className="mt-8 pt-4 border-t-2 border-black justify-between px-8 hidden print:flex">
                            <div className="text-center">
                                <p className="font-bold text-black text-xs mb-4">توقيع المعلم</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-black text-xs mb-4">يعتمد، مدير المدرسة</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

// Helpers
const StatBox = ({ label, value, color }: any) => {
    const styles: any = {
        rose: 'border-rose-500 text-rose-700 bg-rose-50',
        purple: 'border-purple-500 text-purple-700 bg-purple-50',
        emerald: 'border-emerald-500 text-emerald-700 bg-emerald-50',
        orange: 'border-orange-500 text-orange-700 bg-orange-50'
    };
    return (
        <div className={`p-2 rounded-lg border flex flex-col items-center justify-center ${styles[color]}`}>
            <span className="text-lg font-black">{value}</span>
            <span className="text-[10px] font-bold">{label}</span>
        </div>
    );
};

export default StudentDetailedHistoryModal;
