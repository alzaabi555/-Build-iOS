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

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `تقرير_متابعة_${student.name}`,
    });

    if (!isOpen) return null;

    // دمج وترتيب السجلات
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
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200 font-sans" dir="rtl">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h2 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        <FileText className="text-indigo-600"/>
                        سجل المتابعة اليومي (بالحصص)
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg active:scale-95 transition-all">
                            <Printer size={16}/> طباعة
                        </button>
                        <button onClick={onClose} className="p-2 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-colors">
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 p-6">
                    <div ref={printRef} className="bg-white p-10 rounded-none md:rounded-2xl shadow-sm border border-slate-200 min-h-full print:shadow-none print:border-none print:p-4">
                        
                        {/* Report Header for Print */}
                        <div className="border-b-2 border-slate-800 pb-6 mb-8 text-center hidden print:block">
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-right text-xs font-bold"><p>سلطنة عمان</p><p>وزارة التربية والتعليم</p></div>
                                <div><h1 className="text-2xl font-black text-slate-900">تقرير متابعة سلوك وحضور</h1></div>
                                <div className="text-left text-xs font-bold"><p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p></div>
                            </div>
                            <div className="flex justify-between items-end text-sm font-bold text-slate-600 mt-4 px-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-right">
                                    <p>المادة: {teacherInfo?.subject}</p>
                                    <p>المعلم: {teacherInfo?.name}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl text-black font-black mb-1">{student.name}</p>
                                    <p className="text-xs text-slate-400">ID: {student.id}</p>
                                </div>
                                <div className="text-left">
                                    <p>الصف: {student.classes[0]}</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            <StatBox label="غياب" value={(student.attendance || []).filter(a => a.status === 'absent').length} color="rose" />
                            <StatBox label="تسرب (هروب)" value={(student.attendance || []).filter(a => a.status === 'truant').length} color="purple" />
                            <StatBox label="سلوك إيجابي" value={(student.behaviors || []).filter(b => b.type === 'positive').length} color="emerald" />
                            <StatBox label="سلوك سلبي" value={(student.behaviors || []).filter(b => b.type === 'negative').length} color="orange" />
                        </div>

                        {/* Detailed Table */}
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-white text-right">
                                    <th className="p-3 rounded-tr-lg w-32">التاريخ</th>
                                    <th className="p-3 w-24 text-center">الحصة</th>
                                    <th className="p-3 w-32">النوع</th>
                                    <th className="p-3">التفاصيل / الملاحظة</th>
                                    <th className="p-3 rounded-tl-lg w-24 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allRecords.length > 0 ? (
                                    allRecords.map((record: any, index) => (
                                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors print:border-slate-300">
                                            <td className="p-3 font-bold text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400"/>
                                                    {record.date}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center font-bold text-slate-800 bg-slate-50 border-x border-slate-100">
                                                {record.period ? (
                                                    <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                                                        <Clock size={10} className="text-indigo-500"/> {record.period}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3">
                                                {record.recordType === 'attendance' ? (
                                                    <Badge type={record.status} />
                                                ) : (
                                                    <Badge type={record.type} />
                                                )}
                                            </td>
                                            <td className="p-3 font-medium text-slate-700">
                                                {record.recordType === 'attendance' ? (
                                                     <span className="text-slate-400 text-xs">سجل الحضور اليومي</span>
                                                ) : (
                                                    <span className="font-bold">{record.description || record.behavior}</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {getIcon(record)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                            سجل الطالب نظيف ولا توجد ملاحظات
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Footer for Print */}
                        <div className="mt-12 pt-8 border-t-2 border-slate-200 justify-between px-12 hidden print:flex">
                            <div className="text-center">
                                <p className="font-bold text-slate-600 mb-4">توقيع المعلم</p>
                                <div className="h-10"></div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-slate-600 mb-4">اعتماد إدارة المدرسة</p>
                                <div className="h-10"></div>
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
    const colors: any = {
        rose: 'bg-rose-50 text-rose-700 border-rose-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return (
        <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${colors[color]}`}>
            <span className="text-2xl font-black">{value}</span>
            <span className="text-[10px] md:text-xs font-bold opacity-80">{label}</span>
        </div>
    );
};

const Badge = ({ type }: { type: string }) => {
    const styles: any = {
        absent: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'غياب' },
        truant: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'تسرب' },
        late: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'تأخر' },
        positive: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'إيجابي' },
        negative: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'سلبي' },
        present: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'حضور' },
    };
    const s = styles[type] || { bg: 'bg-slate-100', text: 'text-slate-600', label: type };
    return <span className={`${s.bg} ${s.text} px-2 py-1 rounded-md text-xs font-bold`}>{s.label}</span>;
};

const getIcon = (record: any) => {
    if (record.type === 'positive') return <CheckCircle2 size={20} className="text-emerald-500 mx-auto"/>;
    if (record.type === 'negative') return <AlertTriangle size={20} className="text-orange-500 mx-auto"/>;
    if (record.status === 'absent') return <XCircle size={20} className="text-rose-500 mx-auto"/>;
    if (record.status === 'truant') return <AlertTriangle size={20} className="text-purple-500 mx-auto"/>;
    return <CheckCircle2 size={20} className="text-slate-300 mx-auto"/>;
};

export default StudentDetailedHistoryModal;
