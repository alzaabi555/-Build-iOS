
import React, { useState, useMemo, useRef } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Sparkles, Star, Search, Award, Download, X, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StudentAvatar } from './StudentAvatar';
import Modal from './Modal';
import positiveSound from '../assets/positive.mp3';

// ✅ تحديث المكتبات لتطابق التقارير
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';

interface LeaderboardProps {
    students: Student[];
    classes: string[];
    onUpdateStudent?: (student: Student) => void;
    // ✅ التأكد من استقبال كافة حقول الهوية بشكل صحيح
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
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    
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

    // ✅ دالة حفظ الشهادة كملف PDF (نفس منطق التقارير)
    const handleDownloadPDF = async () => {
        if (!certificateRef.current || !certificateStudent) return;
        
        setIsGeneratingPdf(true);

        const element = certificateRef.current;
        // اسم الملف
        const fileName = `Certificate_${certificateStudent.name.replace(/\s+/g, '_')}.pdf`;

        // إعدادات html2pdf
        const opt = {
            margin: 0, 
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        try {
            const worker = html2pdf().set(opt).from(element).toPdf();

            if (Capacitor.isNativePlatform()) {
                // ✅ للموبايل: تحويل لـ Base64 ثم حفظ ومشاركة
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
                // ✅ للويب/الويندوز: تحميل مباشر
                worker.save();
            }

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('❌ حدث خطأ أثناء حفظ الملف');
        } finally {
            setIsGeneratingPdf(false); 
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 pb-24 md:pb-8 animate-in fade-in duration-500 overflow-hidden">
            
            {/* Header (نفس التصميم السابق) */}
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
                                <button onClick={() => setCertificateStudent(topThree[1])} className="text-[10px] bg-[#446A8D] text-white px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-slate-700 transition-colors shadow-sm">
                                    <Award size={12} /> شهادة
                                </button>
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
                                <button onClick={() => setCertificateStudent(topThree[0])} className="text-[10px] bg-amber-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-amber-600 transition-colors shadow-md -translate-y-2">
                                    <Award size={14} /> شهادة تميز
                                </button>
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
                                <button onClick={() => setCertificateStudent(topThree[2])} className="text-[10px] bg-[#446A8D] text-white px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-slate-700 transition-colors shadow-sm">
                                    <Award size={12} /> شهادة
                                </button>
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
                                        {/* زر شهادة مصغر للبقية */}
                                        <button onClick={() => setCertificateStudent(student)} className="w-full py-1 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-lg hover:bg-[#446A8D] hover:text-white transition-colors">
                                            شهادة
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ نافذة الشهادة (Modal) */}
            <Modal isOpen={!!certificateStudent} onClose={() => { if(!isGeneratingPdf) setCertificateStudent(null); }} className="max-w-2xl rounded-xl p-0 overflow-hidden">
                {certificateStudent && (
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100">
                            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-500" /> معاينة الشهادة
                            </h3>
                            <button onClick={() => setCertificateStudent(null)} disabled={isGeneratingPdf} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors disabled:opacity-50">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto bg-slate-100 flex justify-center">
                            {/* عنصر الشهادة الذي سيتم تحويله لـ PDF */}
                            <div ref={certificateRef} className="bg-white w-full max-w-lg aspect-[1.414/1] relative shadow-2xl p-8 text-center text-slate-900 certificate-container" style={{ backgroundImage: 'radial-gradient(circle at center, #fff 0%, #fdfdfd 100%)' }}>
                                {/* إطار زخرفي */}
                                <div className="absolute inset-2 border-4 border-double border-[#446A8D] pointer-events-none"></div>
                                <div className="absolute inset-4 border border-[#cba35c] pointer-events-none opacity-50"></div>

                                {/* الترويسة */}
                                <div className="flex justify-between items-start mb-8 relative z-10 px-4">
                                    <div className="text-right text-[10px] font-bold leading-relaxed text-slate-600">
                                        <p>سلطنة عمان</p>
                                        <p>وزارة التعليم</p>
                                        <p>{teacherInfo?.governorate || 'المديرية العامة...'}</p>
                                        <p>{teacherInfo?.school || 'المدرسة...'}</p>
                                    </div>
                                    <div className="w-20 h-20 opacity-90 -mt-2">
                                        {/* ✅ شعار الوزارة (مع Fallback) */}
                                        {teacherInfo?.ministryLogo ? (
                                            <img src={teacherInfo.ministryLogo} alt="الشعار" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
                                                <Crown className="w-8 h-8 text-amber-500 opacity-50" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-left text-[10px] font-bold leading-relaxed text-slate-600">
                                        <p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                                        <p>العام الدراسي: {new Date().getFullYear()}</p>
                                    </div>
                                </div>

                                {/* العنوان */}
                                <div className="mb-8 relative z-10">
                                    <h1 className="text-4xl font-black text-[#446A8D] mb-2" style={{ fontFamily: 'Times New Roman, serif' }}>شهادة تميز</h1>
                                    <div className="h-1 w-24 bg-amber-400 mx-auto rounded-full"></div>
                                </div>

                                {/* نص الشهادة */}
                                <div className="mb-12 relative z-10 px-8">
                                    <p className="text-base font-bold leading-loose text-slate-700 mb-4">
                                        تُمنح للطالب / <span className="text-[#446A8D] text-xl border-b-2 border-dashed border-slate-300 px-4">{certificateStudent.name}</span>
                                    </p>
                                    <p className="text-sm font-bold text-slate-600 mb-4">
                                        المقيد بالصف: <span className="text-slate-900">{certificateStudent.classes[0]}</span>
                                    </p>
                                    <p className="text-sm font-medium leading-loose text-slate-600">
                                        لحصوله على أعلى نقاط في تطبيق <span className="font-black text-[#446A8D]">راصد</span> خلال شهر <span className="font-bold text-amber-600">{monthName}</span>،
                                        وتقديراً لتفوقه وتميزه الدراسي والسلوكي.
                                    </p>
                                    <p className="text-sm font-bold text-slate-600 mt-4">
                                        متمنين له مزيداً من التقدم والنجاح.
                                    </p>
                                </div>

                                {/* التوقيعات (مع التبديل والختم) */}
                                <div className="flex justify-between items-end px-8 mt-auto relative z-10">
                                    {/* ✅ اليمين: المعلم */}
                                    <div className="text-center w-1/3">
                                        <p className="text-xs font-bold text-slate-500 mb-2">المعلم/ة</p>
                                        <p className="text-sm font-black text-[#446A8D]">{teacherInfo?.name || '....................'}</p>
                                    </div>

                                    {/* ✅ الوسط: ختم المدرسة */}
                                    <div className="text-center w-1/3 flex justify-center">
                                        <div className="w-20 h-20 opacity-80 rotate-[-10deg]">
                                            {teacherInfo?.stamp ? (
                                                <img src={teacherInfo.stamp} alt="الختم" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                            ) : (
                                                <div className="w-16 h-16 mb-2 mx-auto opacity-10">
                                                    <Award className="w-full h-full text-[#446A8D]" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ✅ اليسار: مدير المدرسة */}
                                    <div className="text-center w-1/3">
                                        <p className="text-xs font-bold text-slate-500 mb-2">مدير/ة المدرسة</p>
                                        <p className="text-sm font-black text-[#446A8D]">....................</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* زر الحفظ */}
                        <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
                            <button 
                                onClick={handleDownloadPDF} 
                                disabled={isGeneratingPdf}
                                className="flex-1 py-3 bg-[#446A8D] text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isGeneratingPdf ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" /> جاري إنشاء الشهادة...
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} /> حفظ / مشاركة PDF
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
