import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Sparkles, Star, Search, Award, Download, X, Loader2, MinusCircle, Medal } from 'lucide-react'; 
import { useApp } from '../context/AppContext';
import { StudentAvatar } from './StudentAvatar';
import Modal from './Modal';
import positiveSound from '../assets/positive.mp3';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';

interface LeaderboardProps {
    students: Student[];
    classes: string[];
    onUpdateStudent?: (student: Student) => void;
    teacherInfo?: { 
        name: string; 
        school: string; 
        subject: string; 
        governorate: string; 
        ministryLogo?: string; 
        stamp?: string;
    }; 
}

const Leaderboard: React.FC<LeaderboardProps> = ({ students, classes, onUpdateStudent, teacherInfo }) => {
    const { currentSemester } = useApp();
    
    // إعداد التواريخ واسم الشهر
    const today = new Date();
    const currentMonth = today.getMonth(); 
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const monthName = months[currentMonth];

    // ✅ إعداد نوع المدرسة (ذكور / إناث / مختلطة)
    const [schoolType, setSchoolType] = useState<'boys' | 'girls' | 'mixed'>(() => {
        return (localStorage.getItem('rased_school_type') as any) || 'mixed';
    });

    useEffect(() => {
        localStorage.setItem('rased_school_type', schoolType);
    }, [schoolType]);

    // ✅ دالة العنوان (تم التعديل لإضافة اسم الشهر)
    const getPageTitle = () => {
        if (schoolType === 'boys') return `فرسان شهر ${monthName}`;
        if (schoolType === 'girls') return `فارسات شهر ${monthName}`;
        return `فرسان وفارسات شهر ${monthName}`;
    };

    const [selectedClass, setSelectedClass] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        sessionStorage.setItem('rased_class', selectedClass);
    }, [selectedClass]);

    const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const certificateRef = useRef<HTMLDivElement>(null);
    
    const rankedStudents = useMemo(() => {
        let filtered = students;
        if (selectedClass !== 'all') filtered = students.filter(s => s.classes?.includes(selectedClass));
        if (searchTerm.trim()) filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const withPoints = filtered.map(student => {
            const monthlyPoints = (student.behaviors || [])
                .filter(b => {
                    const d = new Date(b.date);
                    return b.type === 'positive' && d.getMonth() === currentMonth && d.getFullYear() === today.getFullYear();
                })
                .reduce((acc, b) => acc + b.points, 0);
            return { ...student, monthlyPoints };
        });
        return withPoints.sort((a, b) => b.monthlyPoints - a.monthlyPoints);
    }, [students, selectedClass, searchTerm, currentMonth]);

    const topThree = rankedStudents.slice(0, 3);
    const restOfStudents = rankedStudents.slice(3);

    // إضافة نقاط
    const handleAddPoints = (student: Student) => {
        if (!onUpdateStudent) return;
        new Audio(positiveSound).play().catch(() => {});
        const isBoy = student.gender !== 'female';
        const newBehavior = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: 'positive' as const,
            description: `تميز في قائمة ال${isBoy ? 'فرسان' : 'فارسات'}`,
            points: 3,
            semester: currentSemester
        };
        onUpdateStudent({ ...student, behaviors: [newBehavior, ...(student.behaviors || [])] });
    };

    // ✅ دالة خصم النقاط (تمت استعادتها)
    const handleDeductPoint = (student: Student) => {
        if (!onUpdateStudent) return;
        if (confirm(`هل تريد خصم نقطة واحدة من الطالب/ة ${student.name}؟ (تصحيح)`)) {
            const correctionBehavior = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString(),
                type: 'positive' as const, 
                description: 'تصحيح نقاط (خصم)',
                points: -3, 
                semester: currentSemester
            };
            onUpdateStudent({ ...student, behaviors: [correctionBehavior, ...(student.behaviors || [])] });
        }
    };

    const handleDownloadPDF = async () => {
        if (!certificateRef.current || !certificateStudent) return;
        setIsGeneratingPdf(true);
        const opt = {
            margin: 0, filename: `Rased_Award_${certificateStudent.name}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        try {
            const worker = html2pdf().set(opt).from(certificateRef.current).toPdf();
            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = await worker.output('datauristring');
                const result = await Filesystem.writeFile({
                    path: `Award_${Date.now()}.pdf`, data: pdfBase64.split(',')[1], directory: Directory.Cache
                });
                await Share.share({ title: 'شهادة تميز', url: result.uri });
            } else { worker.save(); }
        } catch (e) { alert('خطأ في الحفظ'); } finally { setIsGeneratingPdf(false); }
    };

    const isFemale = certificateStudent?.gender === 'female';

    // ✅ دالة جديدة لاستخراج الاسم الأول واللقب
    const getShortName = (fullName: string) => {
        if (!fullName) return '';
        const nameParts = fullName.trim().split(' ');
        if (nameParts.length === 1) return nameParts[0];
        // نأخذ الاسم الأول + الاسم الأخير
        return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
    };

    return (
        <div className="flex flex-col h-full space-y-6 pb-24 md:pb-8 overflow-hidden">
            <header className="fixed md:sticky top-0 z-40 bg-[#446A8D] text-white shadow-lg px-4 pt-8 pb-6 transition-all w-full">
                <div className="flex flex-col items-center text-center relative">
                    {/* زر إعدادات نوع المدرسة */}
                    <div className="absolute left-0 top-0 flex gap-2">
                        <select 
                            value={schoolType} 
                            onChange={(e) => setSchoolType(e.target.value as any)}
                            className="bg-white/10 border border-white/20 rounded-lg text-[10px] p-1 outline-none font-bold cursor-pointer hover:bg-white/20"
                        >
                            <option value="mixed" className="text-slate-800">مدرسة مختلطة</option>
                            <option value="boys" className="text-slate-800">مدرسة ذكور</option>
                            <option value="girls" className="text-slate-800">مدرسة إناث</option>
                        </select>
                    </div>

                    <div className="bg-white/10 p-3 rounded-2xl border border-white/20 mb-3 shadow-inner">
                        <Crown className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce" />
                    </div>
                    {/* ✅ العنوان الآن يتضمن اسم الشهر */}
                    <h1 className="text-2xl font-black tracking-wide mb-1">{getPageTitle()}</h1>
                    
                    <div className="relative w-full max-w-sm my-4">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl py-2 pr-10 text-xs font-bold text-white outline-none" />
                    </div>

                    {/* ✅ التعديل هنا: استخدام mx-auto لتوسيط الحاوية مع الحفاظ على overflow للأزرار */}
                    <div className="w-full overflow-x-auto no-scrollbar pb-2 flex justify-start md:justify-center">
                        <div className="flex gap-2 mx-auto">
                            <button onClick={() => setSelectedClass('all')} className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-xl text-xs font-black border ${selectedClass === 'all' ? 'bg-white text-[#1e3a8a]' : 'bg-white/10 text-blue-100'}`}>الكل</button>
                            {classes.map(c => (
                                <button key={c} onClick={() => setSelectedClass(c)} className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-xl text-xs font-black border ${selectedClass === c ? 'bg-white text-[#1e3a8a]' : 'bg-white/10 text-blue-100'}`}>{c}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pt-64 md:pt-2">
                {/* منصة التتويج */}
                {topThree.length > 0 && (
                    <div className="flex justify-center items-end gap-2 md:gap-6 py-4">
                        {[topThree[1], topThree[0], topThree[2]].map((s, i) => s && (
                            <div key={s.id} className={`flex flex-col items-center ${i === 1 ? 'z-10 -mb-4' : 'opacity-90'}`}>
                                <div className="relative cursor-pointer" onClick={() => handleAddPoints(s)}>
                                    {i === 1 && <Crown className="w-10 h-10 text-amber-400 fill-amber-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-pulse" />}
                                    <div className={`rounded-full border-4 shadow-xl overflow-hidden mb-2 bg-white transform transition-transform ${i === 1 ? 'w-24 h-24 md:w-32 md:h-32 border-amber-400 scale-110' : 'w-20 h-20 md:w-24 md:h-24 border-slate-300'}`}>
                                        <StudentAvatar gender={s.gender} className="w-full h-full" />
                                    </div>
                                </div>
                                {/* ✅ تعديل خط منصة التتويج والاسم المزدوج */}
                                <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl text-center border shadow-sm w-28 md:w-36">
                                    <h3 className="font-black text-xs md:text-sm text-slate-800 truncate" title={s.name}>{getShortName(s.name)}</h3>
                                    <span className="text-amber-600 font-bold text-xs">{s.monthlyPoints} نقطة</span>
                                </div>
                                {/* ✅ أزرار الشهادة والخصم */}
                                <div className="flex gap-1 mt-2">
                                    <button onClick={() => setCertificateStudent(s)} className="text-[10px] bg-slate-700 text-white px-2 py-1 rounded-lg flex items-center gap-1 shadow-md hover:bg-slate-800">
                                        <Award size={12} /> شهادة
                                    </button>
                                    <button onClick={() => handleDeductPoint(s)} className="text-[10px] bg-rose-100 text-rose-500 px-2 py-1 rounded-lg shadow-sm hover:bg-rose-200" title="خصم نقطة">
                                        <MinusCircle size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* باقي الطلاب */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-8 pb-20">
                    {restOfStudents.map((s, index) => (
                        <div key={s.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col items-center relative active:scale-95 transition-all">
                            <div className="absolute top-1 right-1 bg-indigo-50 text-indigo-600 font-bold w-5 h-5 rounded flex items-center justify-center text-[9px]">{index + 4}</div>
                            <div className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden mb-2 cursor-pointer" onClick={() => handleAddPoints(s)}>
                                <StudentAvatar gender={s.gender} className="w-full h-full" />
                            </div>
                            {/* ✅ تعديل خط القائمة العادية والاسم المزدوج */}
                            <h3 className="font-black text-slate-800 text-[11px] truncate w-full text-center" title={s.name}>{getShortName(s.name)}</h3>
                            <span className="text-amber-600 font-bold text-[10px] mt-0.5">{s.monthlyPoints} نقطة</span>
                            
                            <div className="flex gap-1 w-full mt-2">
                                <button onClick={() => setCertificateStudent(s)} className="flex-1 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-md border border-slate-100">شهادة</button>
                                {/* ✅ زر الخصم لباقي القائمة */}
                                <button onClick={() => handleDeductPoint(s)} className="px-2 py-1 bg-rose-50 text-rose-500 text-[10px] font-bold rounded-md border border-rose-100"><MinusCircle size={12} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* الشهادة */}
            <Modal isOpen={!!certificateStudent} onClose={() => !isGeneratingPdf && setCertificateStudent(null)} className="max-w-4xl w-[95vw] p-0 overflow-hidden">
                {certificateStudent && (
                    <div className="flex flex-col bg-white">
                        <div className="flex justify-between items-center p-4 bg-slate-50 border-b">
                            <h3 className="font-black text-slate-800">وسام التميز لعام {new Date().getFullYear()}</h3>
                            <button onClick={() => setCertificateStudent(null)} className="p-2 text-slate-400"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-700 p-4 flex justify-center">
                            <div ref={certificateRef} className="bg-white shadow-2xl text-center text-slate-900 relative flex flex-col overflow-hidden" 
                                 style={{ width: '297mm', height: '210mm', padding: '20mm', backgroundColor: '#fdfbf7' }}>
                                
                                <div className="absolute inset-[10mm] border-[6px] border-[#1a365d] z-10 pointer-events-none"></div>
                                <div className="absolute inset-[12mm] border-[1px] border-[#d4af37] z-10 pointer-events-none"></div>

                                <div className="relative z-20 flex flex-col h-full justify-between py-10 px-16">
                                    <div className="flex justify-between items-start">
                                        <div className="text-right text-sm font-bold text-[#1a365d]">
                                            <p>سلطنة عمان</p>
                                            <p>وزارة التعليم</p>
                                            <p>{teacherInfo?.governorate || 'المديرية العامة للتعليم'}</p>
                                            <p>{teacherInfo?.school || 'المدرسة'}</p>
                                        </div>
                                        <div className="w-24 h-24">
                                            {teacherInfo?.ministryLogo ? <img src={teacherInfo.ministryLogo} className="w-full h-full object-contain" /> : <Trophy className="w-16 h-16 text-[#d4af37] mx-auto" />}
                                        </div>
                                        <div className="text-left text-sm font-bold text-[#1a365d]">
                                            <p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                                            <p>المادة: {teacherInfo?.subject || '........'}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h1 className="text-6xl font-black text-[#1a365d] mb-4">شهادة تميز</h1>
                                        <p className="text-2xl font-bold text-slate-700">
                                            يُسعدنا بكل فخر واعتزاز أن نُتوِّج {isFemale ? 'الفارسة' : 'الفارس'}
                                        </p>
                                        <div className="my-6">
                                            <span className="text-[#1a365d] text-5xl font-black border-b-4 border-[#d4af37] px-10 pb-2 inline-block">
                                                {certificateStudent.name}
                                            </span>
                                        </div>
                                        <p className="text-xl font-bold text-slate-700 leading-relaxed max-w-3xl mx-auto">
                                            المقيد{isFemale ? 'ة' : ''} بالصف {certificateStudent.classes[0]}، تقديراً {isFemale ? 'لجهودها العظيمة واعتلائها صدارة فارسات' : 'لجهوده العظيمة واعتلائه صدارة فرسان'} شهر {monthName}، متمنين {isFemale ? 'لها' : 'له'} دوام التألق والنجاح.
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="text-center w-1/3">
                                            <p className="font-bold text-[#1a365d] mb-6">معلم/ة المادة</p>
                                            <p className="font-black text-lg">{teacherInfo?.name || '............'}</p>
                                        </div>
                                        <div className="w-32 h-32 flex items-center justify-center">
                                            {teacherInfo?.stamp && <img src={teacherInfo.stamp} className="w-full h-full object-contain opacity-80" />}
                                        </div>
                                        <div className="text-center w-1/3">
                                            <p className="font-bold text-[#1a365d] mb-6">مدير/ة المدرسة</p>
                                            <p className="font-black text-lg">....................</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t flex gap-3">
                            <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="flex-1 py-4 bg-[#d4af37] text-[#1a365d] rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                                {isGeneratingPdf ? <Loader2 size={24} className="animate-spin" /> : <><Download size={24} /> حفظ الشهادة للطباعة</>}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Leaderboard;
