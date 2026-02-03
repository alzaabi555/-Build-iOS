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

    // إعدادات الطباعة لفرض الوضع الأفقي (Landscape)
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `سجل_${student.name}`,
        pageStyle: `
            @page {
                size: landscape;
                margin: 10mm;
            }
            @media print {
                body { -webkit-print-color-adjust: exact; }
                .print-hidden { display: none !important; }
            }
        `
    });

    if (!isOpen) return null;

    // دمج وترتيب السجلات (حضور وسلوك)
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
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-center p-2 md:p-4 animate-in fade-in duration-200 font-sans" dir="rtl">
            {/* جعلنا النافذة أعرض (w-full) لتناسب الجداول */}
            <div className="bg-white w-full h-full md:h-auto md:max-h-[95vh] rounded-xl md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                    <h2 className="font-black text-lg flex items-center gap-2">
                        <FileText className="text-emerald-400"/>
                        سجل الطالب التفصيلي
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 shadow-lg active:scale-95 transition-all">
                            <Printer size={16}/> طباعة (أفقي)
                        </button>
                        <button onClick={onClose} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors">
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="overflow-y-auto custom-scrollbar flex-1 bg-slate-100 p-4 md:p-8">
                    <div ref={printRef} className="bg-white p-8 rounded-none md:rounded-2xl shadow-sm border border-slate-200 min-h-full print:shadow-none print:border-none print:p-0 print:w-full">
                        
                        {/* Report Header for Print */}
                        <div className="border-b-2 border-black pb-6 mb-6 text-center hidden print:block">
                            <div className="flex justify-between items-start">
                                <div className="text-right">
                                    <p className="font-bold text-sm">سلطنة عمان</p>
                                    <p className="font-bold text-sm">وزارة التربية والتعليم</p>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-black mb-1">سجل متابعة السلوك والغياب</h1>
                                    <p className="text-sm font-bold text-gray-600">(تقرير تفصيلي)</p>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm">تاريخ الطباعة</p>
                                    <p className="font-mono text-sm">{new Date().toLocaleDateString('ar-EG')}</p>
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="text-right">
                                    <span className="block text-xs text-gray-500 font-bold">الطالب</span>
                                    <span className="text-lg font-black text-black">{student.name}</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-xs text-gray-500 font-bold">الصف</span>
                                    <span className="text-lg font-black text-black">{student.classes[0]}</span>
                                </div>
                                <div className="text-left">
                                    <span className="block text-xs text-gray-500 font-bold">المادة / المعلم</span>
                                    <span className="text-sm font-bold text-black">{teacherInfo?.subject} - {teacherInfo?.name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-4 gap-4 mb-6 print:mb-4">
                            <StatBox label="غياب" value={(student.attendance || []).filter(a => a.status === 'absent').length} color="rose" />
                            <StatBox label="تسرب (هروب)" value={(student.attendance || []).filter(a => a.status === 'truant').length} color="purple" />
                            <StatBox label="سلوك إيجابي" value={(student.behaviors || []).filter(b => b.type === 'positive').length} color="emerald" />
                            <StatBox label="سلوك سلبي" value={(student.behaviors || []).filter(b => b.type === 'negative').length} color="orange" />
                        </div>

                        {/* Detailed Table */}
                        <table className="w-full text-sm border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-slate-800 text-white text-right print:bg-gray-200 print:text-black">
                                    <th className="p-3 border border-slate-300 w-32">التاريخ</th>
                                    <th className="p-3 border border-slate-300 w-24 text-center">الحصة</th>
                                    <th className="p-3 border border-slate-300 w-32">النوع</th>
                                    <th className="p-3 border border-slate-300">التفاصيل / الملاحظة</th>
                                    <th className="p-3 border border-slate-300 w-32 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allRecords.length > 0 ? (
                                    allRecords.map((record: any, index) => (
                                        <tr key={index} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                            <td className="p-3 border border-slate-300 font-bold text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400 print:hidden"/>
                                                    {record.date}
                                                </div>
                                            </td>
                                            <td className="p-3 border border-slate-300 text-center font-bold text-slate-900 bg-slate-50 print:bg-white">
                                                {record.period ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock size={12} className="text-indigo-500 print:hidden"/> {record.period}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3 border border-slate-300">
                                                {record.recordType === 'attendance' ? (
                                                    <Badge type={record.status} />
                                                ) : (
                                                    <Badge type={record.type} />
                                                )}
                                            </td>
                                            <td className="p-3 border border-slate-300 font-medium text-slate-800">
                                                {record.recordType === 'attendance' ? (
                                                     <span className="text-slate-500 text-xs italic">سجل الحضور اليومي</span>
                                                ) : (
                                                    <span className="font-bold">{record.description || record.behavior}</span>
                                                )}
                                            </td>
                                            <td className="p-3 border border-slate-300 text-center">
                                                {getIcon(record)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                                            سجل الطالب نظيف ولا توجد ملاحظات
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Footer for Print */}
                        <div className="mt-8 pt-4 border-t-2 border-black justify-between px-12 hidden print:flex">
                            <div className="text-center">
                                <p className="font-bold text-black mb-6">توقيع المعلم</p>
                                <div className="h-8"></div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-black mb-6">اعتماد إدارة المدرسة</p>
                                <div className="h-8"></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

// Helpers (Updated for print visibility)
const StatBox = ({ label, value, color }: any) => {
    // باستخدام ألوان قوية للطباعة
    const styles: any = {
        rose: 'border-rose-500 text-rose-700 bg-rose-50',
        purple: 'border-purple-500 text-purple-700 bg-purple-50',
        emerald: 'border-emerald-500 text-emerald-700 bg-emerald-50',
        orange: 'border-orange-500 text-orange-700 bg-orange-50'
    };
    return (
        <div className={`p-2 rounded-lg border-2 flex flex-col items-center justify-center ${styles[color]}`}>
            <span className="text-xl font-black">{value}</span>
            <span className="text-xs font-bold">{label}</span>
        </div>
    );
};

const Badge = ({ type }: { type: string }) => {
    const map: any = {
        absent: 'غياب', truant: 'تسرب', late: 'تأخر', 
        positive: 'إيجابي', negative: 'سلبي', present: 'حضور'
    };
    return <span className="font-bold text-xs">{map[type] || type}</span>;
};

const getIcon = (record: any) => {
    // إخفاء الأيقونات في الطباعة لأنها قد لا تظهر واستبدالها بنص
    return (
        <>
            <span className="print:hidden">
                {record.type === 'positive' ? <CheckCircle2 className="text-emerald-500 mx-auto"/> :
                 record.type === 'negative' ? <AlertTriangle className="text-orange-500 mx-auto"/> :
                 record.status === 'absent' ? <XCircle className="text-rose-500 mx-auto"/> :
                 record.status === 'truant' ? <AlertTriangle className="text-purple-500 mx-auto"/> : null}
            </span>
            <span className="hidden print:inline font-bold">
                 {record.type === 'positive' ? '✅' :
                 record.type === 'negative' ? '❌' :
                 record.status === 'absent' ? 'غ' :
                 record.status === 'truant' ? 'س' : '-'}
            </span>
        </>
    );
};

export default StudentDetailedHistoryModal;
