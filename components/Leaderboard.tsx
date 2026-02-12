import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Sparkles, Star, Search, Award, Download, X, Loader2, MinusCircle, Medal } from 'lucide-react'; 
import { useApp } from '../context/AppContext';
import { StudentAvatar } from './StudentAvatar';
import Modal from './Modal';
import positiveSound from '../assets/positive.mp3';

// ✅ تحديث المكتبات لتطابق طريقة الموبايل الصحيحة
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
    
    // ✅ استدعاء القيم المحفوظة في ذاكرة الجلسة
    const [selectedClass, setSelectedClass] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // ✅ حفظ القيم فور تغيرها لتتذكرها الصفحات الأخرى
    useEffect(() => {
        sessionStorage.setItem('rased_class', selectedClass);
    }, [selectedClass]);

    // حالات الشهادة والتحميل
    const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const certificateRef = useRef<HTMLDivElement>(null);
    
    const today = new Date();
    const currentMonth = today.getMonth(); 
    const currentYear = today.getFullYear();
    
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const monthName = months[currentMonth];

    const rankedStudents = useMemo(() => {
        let filtered = students;
        
        if (selectedClass !== 'all') {
            filtered = students.filter(s => s.classes && s.classes.includes(selectedClass));
        }

        if (searchTerm.trim()) {
            filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        const withPoints = filtered.map(student => {
            const monthlyPoints = (student.behaviors || [])
                .filter(b => {
                    try {
                        const d = new Date(b.date);
                        return b.type === 'positive' && 
                               d.getMonth() === currentMonth && 
                               d.getFullYear() === currentYear;
                    } catch (e) {
                        return false;
                    }
                })
                .reduce((acc, b) => acc + b.points, 0);
            
            return { ...student, monthlyPoints };
        });

        return withPoints.sort((a, b) => b.monthlyPoints - a.monthlyPoints);
    }, [students, selectedClass, searchTerm, currentMonth, currentYear]);

    const topThree = rankedStudents.slice(0, 3);
    const restOfStudents = rankedStudents.slice(3);

    const handleAddPoints = (student: Student) => {
        if (!onUpdateStudent) return;
        
        const audio = new Audio(positiveSound);
        audio.volume = 0.5;
        audio.play().catch(() => {});

        const newBehavior = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: 'positive' as const,
            description: 'تميز في الفرسان (تشجيع)',
            points: 3,
            semester: currentSemester
        };
        onUpdateStudent({ ...student, behaviors: [newBehavior, ...(student.behaviors || [])] });
        alert(`تم إضافة 3 نقاط للطالب ${student.name} 🌟`);
    };

    const handleDeductPoint = (student: Student) => {
        if (!onUpdateStudent) return;
        
        if(confirm(`هل تريد خصم نقطة واحدة من الطالب ${student.name}؟ (تصحيح خطأ)`)) {
            const correctionBehavior = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString(),
                type: 'positive' as const, 
                description: 'تصحيح نقاط (خصم)',
                points: -1, 
                semester: currentSemester
            };
            onUpdateStudent({ ...student, behaviors: [correctionBehavior, ...(student.behaviors || [])] });
        }
    };

    const handleDownloadPDF = async () => {
        if (!certificateRef.current || !certificateStudent) return;
        
        setIsGeneratingPdf(true);

        const element = certificateRef.current;
        const fileName = `Certificate_${certificateStudent.name.replace(/\s+/g, '_')}.pdf`;

        // إعدادات تصدير PDF للحفاظ على صفحة واحدة
        const opt = {
            margin: 0, 
            filename: fileName,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
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

                await Share.share({
                    title: 'شهادة تميز',
                    url: result.uri,
                    dialogTitle: 'مشاركة الشهادة'
                });
            } else {
                worker.save();
            }

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('❌ حدث خطأ أثناء إنشاء ملف الشهادة.');
        } finally {
            setIsGeneratingPdf(false); 
        }
    };

    const isFemale = certificateStudent?.gender === 'female';

    return (
        <div className="flex flex-col h-full space-y-6 pb-24 md:pb-8 overflow-hidden">
            
            {/* Header */}
            <header className="fixed md:sticky top-0 z-40 md:z-30 bg-[#446A8D] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300  md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 mb-3 shadow-inner">
                        <Crown className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wide mb-1">فرسان شهر {monthName}</h1>
                    <p className="text-xs text-blue-200 font-bold opacity-80 mb-4">التنافس على أشدّه! من سيعتلي القمة؟</p>
                    
                    <div className="relative w-full max-w-sm mb-4">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <input 
                            type="text" 
                            placeholder="بحث عن طالب..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold text-white placeholder:text-blue-300/70 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar px-2 w-full justify-center">
                        <button 
                            onClick={() => setSelectedClass('all')} 
                            className={`px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === 'all' ? 'bg-white text-[#1e3a8a] shadow-lg border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}
                        >
                            الكل
                        </button>
                        {classes.map(c => (
                            <button 
                                key={c}
                                onClick={() => setSelectedClass(c)} 
                                className={`px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === c ? 'bg-white text-[#1e3a8a] shadow-lg border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-20 custom-scrollbar pt-64 md:pt-2">
                
                {/* Podium (Top 3) */}
                {topThree.length > 0 ? (
                    <div className="flex justify-center items-end gap-2 md:gap-6 py-2 min-h-[260px]">
                        {/* 2nd Place */}
                        {topThree[1] && (
                            <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100">
                                <div className="relative group cursor-pointer" onClick={() => handleAddPoints(topThree[1])}>
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-300 shadow-xl overflow-hidden mb-2 relative bg-white transform hover:scale-105 active:scale-95 transition-transform">
                                        <StudentAvatar gender={topThree[1].gender} className="w-full h-full" />
                                        <div className="absolute -bottom-1 -right-1 bg-slate-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-sm">2</div>
                                    </div>
                                </div>
                                <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-2xl text-center border border-slate-200 w-24 md:w-32 shadow-sm mb-1">
                                    <h3 className="font-black text-xs md:text-sm text-slate-800 truncate mb-1">{topThree[1].name.split(' ')[0]}</h3>
                                    <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg">{topThree[1].monthlyPoints} pts</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setCertificateStudent(topThree[1])} className="text-[10px] bg-[#446A8D] text-white px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-slate-700 transition-colors shadow-sm">
                                        <Award size={12} /> شهادة
                                    </button>
                                    <button onClick={() => handleDeductPoint(topThree[1])} className="text-[10px] bg-rose-100 text-rose-600 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-rose-200 transition-colors shadow-sm" title="خصم نقطة">
                                        <MinusCircle size={12} />
                                    </button>
                                </div>
                                <div className="h-20 w-16 bg-gradient-to-t from-slate-200 to-slate-50/0 rounded-t-lg mt-1 mx-auto opacity-50"></div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {topThree[0] && (
                            <div className="flex flex-col items-center z-10 -mb-4 animate-in slide-in-from-bottom-12 duration-700">
                                <div className="relative cursor-pointer" onClick={() => handleAddPoints(topThree[0])}>
                                    <Crown className="w-10 h-10 text-amber-400 fill-amber-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-pulse drop-shadow-md" />
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden mb-2 relative bg-white ring-4 ring-amber-100 transform hover:scale-105 active:scale-95 transition-transform">
                                        <StudentAvatar gender={topThree[0].gender} className="w-full h-full" />
                                        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-lg">1</div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-b from-amber-50 to-white px-4 py-3 rounded-2xl text-center border border-amber-200 w-28 md:w-40 shadow-lg transform -translate-y-2 mb-1">
                                    <h3 className="font-black text-sm md:text-base text-slate-900 truncate mb-1">{topThree[0].name.split(' ')[0]}</h3>
                                    <div className="flex items-center justify-center gap-1">
                                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                        <span className="text-amber-600 font-black text-xs">{topThree[0].monthlyPoints} pts</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 -translate-y-2">
                                    <button onClick={() => setCertificateStudent(topThree[0])} className="text-[10px] bg-amber-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-amber-600 transition-colors shadow-md">
                                        <Award size={14} /> شهادة تميز
                                    </button>
                                    <button onClick={() => handleDeductPoint(topThree[0])} className="text-[10px] bg-rose-100 text-rose-600 px-2 py-1.5 rounded-lg flex items-center gap-1 hover:bg-rose-200 transition-colors shadow-md" title="خصم نقطة">
                                        <MinusCircle size={14} />
                                    </button>
                                </div>
                                <div className="h-28 w-20 bg-gradient-to-t from-amber-100 to-amber-50/0 rounded-t-lg mt-1 mx-auto opacity-60"></div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {topThree[2] && (
                            <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-700 delay-200">
                                <div className="relative cursor-pointer" onClick={() => handleAddPoints(topThree[2])}>
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-orange-300 shadow-xl overflow-hidden mb-2 relative bg-white transform hover:scale-105 active:scale-95 transition-transform">
                                        <StudentAvatar gender={topThree[2].gender} className="w-full h-full" />
                                        <div className="absolute -bottom-1 -right-1 bg-orange-300 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm text-sm">3</div>
                                    </div>
                                </div>
                                <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-2xl text-center border border-orange-200 w-24 md:w-32 shadow-sm mb-1">
                                    <h3 className="font-black text-xs md:text-sm text-slate-800 truncate mb-1">{topThree[2].name.split(' ')[0]}</h3>
                                    <span className="text-orange-600/70 font-bold text-[10px] bg-orange-50 px-2 py-0.5 rounded-lg">{topThree[2].monthlyPoints} pts</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setCertificateStudent(topThree[2])} className="text-[10px] bg-[#446A8D] text-white px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-slate-700 transition-colors shadow-sm">
                                        <Award size={12} /> شهادة
                                    </button>
                                    <button onClick={() => handleDeductPoint(topThree[2])} className="text-[10px] bg-rose-100 text-rose-600 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-rose-200 transition-colors shadow-sm" title="خصم نقطة">
                                        <MinusCircle size={12} />
                                    </button>
                                </div>
                                <div className="h-14 w-16 bg-gradient-to-t from-orange-100 to-orange-50/0 rounded-t-lg mt-1 mx-auto opacity-50"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Trophy className="w-20 h-20 text-slate-300 mb-4" />
                        <p className="font-bold text-slate-400">لا يوجد نقاط مسجلة لهذا الشهر</p>
                    </div>
                )}

                {restOfStudents.length > 0 && (
                    <div className="mt-4">
                        <h3 className="font-black text-slate-700 mb-4 text-sm flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            باقي الفرسان
                        </h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-8">
                            {restOfStudents.map((student, index) => (
                                <div 
                                    key={student.id}
                                    className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden active:scale-95 transition-all hover:shadow-md hover:border-indigo-200"
                                >
                                    <div className="absolute top-2 right-2 bg-indigo-50 text-indigo-600 font-bold w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shadow-sm border border-indigo-100">
                                        {index + 4}
                                    </div>
                                    <div className="w-12 h-12 rounded-full border-2 border-white shadow-md bg-slate-50 overflow-hidden mb-2 mt-1 cursor-pointer" onClick={() => handleAddPoints(student)}>
                                        <StudentAvatar gender={student.gender} className="w-full h-full" />
                                    </div>
                                    <div className="w-full">
                                        <h3 className="font-black text-slate-800 text-xs truncate w-full mb-1">{student.name.split(' ')[0]} {student.name.split(' ')[1]?.charAt(0)}</h3>
                                        <div className="flex items-center justify-center gap-1 bg-slate-50 rounded-lg py-1 px-2 mx-auto w-fit mb-2">
                                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                            <p className="text-[10px] font-bold text-slate-600">
                                                {student.monthlyPoints}
                                            </p>
                                        </div>
                                        <div className="flex gap-1 justify-center">
                                            <button onClick={() => setCertificateStudent(student)} className="flex-1 py-1 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-lg hover:bg-[#446A8D] hover:text-white transition-colors">
                                                شهادة
                                            </button>
                                            <button onClick={() => handleDeductPoint(student)} className="px-2 py-1 bg-rose-50 text-rose-500 text-[9px] font-bold rounded-lg hover:bg-rose-100 transition-colors" title="خصم">
                                                <MinusCircle size={10} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ نافذة الشهادة الفخمة (تصميم الصفحة الواحدة المحكم) */}
            <Modal isOpen={!!certificateStudent} onClose={() => { if(!isGeneratingPdf) setCertificateStudent(null); }} className="max-w-4xl w-[95vw] rounded-xl p-0 overflow-hidden">
                {certificateStudent && (
                    <div className="flex flex-col h-full bg-white max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100 shrink-0">
                            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-500" /> معاينة شهادة التميز
                            </h3>
                            <button onClick={() => setCertificateStudent(null)} disabled={isGeneratingPdf} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors disabled:opacity-50">
                                <X size={20} />
                            </button>
                        </div>

                        {/* منطقة العرض للشهادة (Scrollable) */}
                        <div className="flex-1 overflow-auto bg-slate-800 flex justify-center p-4 md:p-8">
                            
                            {/* ✅ الحاوية الرئيسية للشهادة: الارتفاع محدد بـ 210mm لمنع الانقسام */}
                            <div ref={certificateRef} className="bg-white shadow-2xl text-center text-slate-900 mx-auto relative flex flex-col box-border overflow-hidden" 
                                 style={{ width: '297mm', height: '210mm', backgroundColor: '#fdfbf7', backgroundImage: 'radial-gradient(circle at center, #ffffff 0%, #fdfbf7 100%)' }}>
                                
                                {/* ✅ الإطارات الملكية (Borders) */}
                                <div className="absolute z-20 pointer-events-none" style={{ top: '12mm', bottom: '12mm', left: '12mm', right: '12mm', border: '5px solid #1a365d' }}></div>
                                <div className="absolute z-20 pointer-events-none" style={{ top: '14mm', bottom: '14mm', left: '14mm', right: '14mm', border: '1px solid #d4af37' }}></div>

                                {/* ✅ الزخارف الزاوية (Corner Accents) */}
                                <div className="absolute w-10 h-10 border-t-4 border-r-4 border-[#d4af37] z-30" style={{ top: '10mm', right: '10mm' }}></div>
                                <div className="absolute w-10 h-10 border-t-4 border-l-4 border-[#d4af37] z-30" style={{ top: '10mm', left: '10mm' }}></div>
                                <div className="absolute w-10 h-10 border-b-4 border-r-4 border-[#d4af37] z-30" style={{ bottom: '10mm', right: '10mm' }}></div>
                                <div className="absolute w-10 h-10 border-b-4 border-l-4 border-[#d4af37] z-30" style={{ bottom: '10mm', left: '10mm' }}></div>

                                {/* ✅ العلامة المائية الشفافة في الخلفية */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                    <Trophy className="w-[350px] h-[350px] text-[#d4af37] opacity-[0.04]" />
                                </div>

                                {/* ✅ المحتوى الداخلي للشهادة (تقليل الهوامش لتناسب الصفحة الواحدة) */}
                                <div className="relative z-10 flex flex-col h-full justify-between" style={{ padding: '20mm 25mm' }}>
                                    
                                    {/* الترويسة العلوية */}
                                    <div className="flex justify-between items-start">
                                        {/* اليمين: الوزارة */}
                                        <div className="text-right text-sm font-bold leading-relaxed text-[#1a365d]">
                                            <p>سلطنة عمان</p>
                                            <p>وزارة التربية والتعليم</p>
                                            <p>{teacherInfo?.governorate || 'المديرية العامة...'}</p>
                                            <p>{teacherInfo?.school || 'المدرسة...'}</p>
                                        </div>
                                        
                                        {/* الوسط: شعار الوزارة أو التاج */}
                                        <div className="w-24 h-24 opacity-90">
                                            {teacherInfo?.ministryLogo ? (
                                                <img src={teacherInfo.ministryLogo} alt="الشعار" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                            ) : (
                                                <div className="w-full h-full bg-white rounded-full flex items-center justify-center border-2 border-[#d4af37] shadow-sm">
                                                    <Crown className="w-12 h-12 text-[#d4af37]" />
                                                </div>
                                            )}
                                        </div>

                                        {/* اليسار: التاريخ */}
                                        <div className="text-left text-sm font-bold leading-relaxed text-[#1a365d]">
                                            <p>التاريخ: <span dir="ltr">{new Date().toLocaleDateString('ar-EG')}</span></p>
                                            <p>العام الدراسي: {new Date().getFullYear()}</p>
                                        </div>
                                    </div>

                                    {/* العنوان الرئيسي */}
                                    <div className="text-center flex flex-col items-center -mt-4">
                                        <h1 className="text-5xl font-black text-[#1a365d] mb-2" style={{ fontFamily: 'Times New Roman, serif' }}>
                                            شهادة شكر وتقدير
                                        </h1>
                                        <div className="flex items-center gap-3 w-1/3">
                                            <div className="h-px bg-[#d4af37] flex-1"></div>
                                            <Medal className="w-6 h-6 text-[#d4af37]" />
                                            <div className="h-px bg-[#d4af37] flex-1"></div>
                                        </div>
                                    </div>

                                    {/* ✅ نص الشهادة الفخم والذكي لغوياً (مع تصغير المسافات) */}
                                    <div className="flex flex-col justify-center px-8 text-center -mt-2">
                                        <p className="text-2xl font-bold leading-relaxed text-slate-800 mb-4">
                                            يُسعدنا بكل فخر واعتزاز أن نُتوِّج {isFemale ? 'الفارسة المتألقة' : 'الفارس المِقدام'}
                                        </p>
                                        <p className="mb-4">
                                            <span className="text-[#1a365d] text-4xl font-black border-b-2 border-[#d4af37] px-8 pb-2 mx-2 inline-block">
                                                {certificateStudent.name}
                                            </span>
                                        </p>
                                        <p className="text-xl font-bold text-slate-700 mb-4">
                                            {isFemale ? 'المقيدة' : 'المقيد'} بالصف: <span className="text-[#1a365d] font-black px-3">{certificateStudent.classes[0]}</span>
                                        </p>
                                        <p className="text-xl font-medium leading-relaxed text-slate-700 max-w-4xl mx-auto mb-4">
                                            بوسام التميز والصدارة، تقديراً {isFemale ? 'لجهودها العظيمة واعتلائها صدارة فارسات' : 'لجهوده العظيمة واعتلائه صدارة فرسان'} شهر <span className="font-black text-[#d4af37] text-2xl mx-1">{monthName}</span> في تطبيق راصد، {isFemale ? 'وانضباطها المثالي الذي أضاء' : 'وانضباطه المثالي الذي أضاء'} سماء الفصل.
                                        </p>
                                        <p className="text-xl font-bold text-[#1a365d]" style={{ fontFamily: 'Times New Roman, serif' }}>
                                            متمنين {isFemale ? 'لها دوام التألق والنجاح في مسيرتها' : 'له دوام التألق والنجاح في مسيرته'} العلمية.
                                        </p>
                                    </div>

                                    {/* التوقيعات والأختام في الأسفل */}
                                    <div className="flex justify-between items-end px-12 z-20">
                                        {/* اليمين: المعلم */}
                                        <div className="text-center w-1/3">
                                            <p className="text-lg font-bold text-[#1a365d] mb-4">معلم/ة المادة</p>
                                            <p className="text-xl font-black text-slate-800 border-b border-dashed border-slate-400 inline-block px-8 pb-1" style={{ fontFamily: 'Times New Roman, serif' }}>{teacherInfo?.name || '....................'}</p>
                                        </div>

                                        {/* الوسط: الختم */}
                                        <div className="text-center w-1/3 flex justify-center">
                                            <div className="w-24 h-24 opacity-80 rotate-[-10deg]">
                                                {teacherInfo?.stamp ? (
                                                    <img src={teacherInfo.stamp} alt="الختم" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                                ) : (
                                                    <div className="w-20 h-20 mb-1 mx-auto opacity-10 flex items-center justify-center">
                                                        <span className="border-2 border-slate-800 rounded-full w-16 h-16 flex items-center justify-center text-xs font-bold rotate-12">ختم المدرسة</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* اليسار: المدير */}
                                        <div className="text-center w-1/3">
                                            <p className="text-lg font-bold text-[#1a365d] mb-4">مدير/ة المدرسة</p>
                                            <p className="text-xl font-black text-slate-800 border-b border-dashed border-slate-400 inline-block px-8 pb-1" style={{ fontFamily: 'Times New Roman, serif' }}>....................</p>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* زر الحفظ للطباعة */}
                        <div className="p-4 border-t border-slate-100 flex gap-3 bg-white shrink-0">
                            <button 
                                onClick={handleDownloadPDF} 
                                disabled={isGeneratingPdf}
                                className="flex-1 py-4 bg-[#d4af37] text-[#1a365d] rounded-xl font-black text-lg shadow-lg hover:bg-[#cba35c] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isGeneratingPdf ? (
                                    <>
                                        <Loader2 size={24} className="animate-spin" /> جاري تجهيز الوسام المَلَكي للطباعة...
                                    </>
                                ) : (
                                    <>
                                        <Download size={24} /> حفظ / مشاركة الشهادة (A4 PDF)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default Leaderboard;