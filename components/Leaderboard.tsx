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

// 🌟 استدعاء المكون الجديد للشهادة
import CertificateTemplate from './CertificateTemplate';

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

    // إعداد نوع المدرسة
    const [schoolType, setSchoolType] = useState<'boys' | 'girls' | 'mixed'>(() => {
        return (localStorage.getItem('rased_school_type') as any) || 'mixed';
    });

    useEffect(() => {
        localStorage.setItem('rased_school_type', schoolType);
    }, [schoolType]);

    // دالة العنوان
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

   // المستشعر الرمضاني
  const [isRamadan] = useState(() => {
      try {
          const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' }).formatToParts(new Date());
          return parseInt(parts.find(p => p.type === 'month')?.value || '0') === 9;
      } catch(e) {
          return false;
      }
  });

    const getShortName = (fullName: string) => {
        if (!fullName) return '';
        const nameParts = fullName.trim().split(' ');
        if (nameParts.length === 1) return nameParts[0];
        return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
    };
    
    // 📢 خوارزمية الشريط الإخباري الذكي (لا تتأثر بشريط البحث)
    const tickerText = useMemo(() => {
        let baseStudents = students;
        if (selectedClass !== 'all') {
            baseStudents = students.filter(s => s.classes?.includes(selectedClass));
        }

        // حساب صافي النقاط للشهر الحالي
        const studentsWithPoints = baseStudents.map(student => {
            const monthlyPoints = (student.behaviors || [])
                .filter(b => {
                    const d = new Date(b.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === today.getFullYear();
                })
                .reduce((acc, b) => acc + b.points, 0);
            return { ...student, monthlyPoints };
        }).filter(s => s.monthlyPoints > 0)
          .sort((a, b) => b.monthlyPoints - a.monthlyPoints);

        if (studentsWithPoints.length === 0) return "المنافسة جارية... لا توجد نقاط مسجلة هذا الشهر بعد!";

        if (selectedClass === 'all') {
            // بطل كل فصل
            const classTopMap = new Map<string, typeof studentsWithPoints[0]>();
            studentsWithPoints.forEach(s => {
                const sClass = s.classes[0];
                if (sClass && !classTopMap.has(sClass)) {
                    classTopMap.set(sClass, s);
                }
            });

            return Array.from(classTopMap.values())
                .map(s => `👑 بطل (${s.classes[0]}): ${getShortName(s.name)} [${s.monthlyPoints} نقطة]`)
                .join(' 🌟 | 🌟 ');
        } else {
            // أول 3 في الفصل المحدد
            const top3 = studentsWithPoints.slice(0, 3);
            const medals = ['🥇 المركز الأول', '🥈 المركز الثاني', '🥉 المركز الثالث'];
            return top3
                .map((s, idx) => `${medals[idx]}: ${getShortName(s.name)} [${s.monthlyPoints} نقطة]`)
                .join(' ✨ | ✨ ');
        }
    }, [students, selectedClass, currentMonth]);

    const rankedStudents = useMemo(() => {
        let filtered = students;
        if (selectedClass !== 'all') filtered = students.filter(s => s.classes?.includes(selectedClass));
        if (searchTerm.trim()) filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const withPoints = filtered.map(student => {
            const monthlyPoints = (student.behaviors || [])
                .filter(b => {
                    const d = new Date(b.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === today.getFullYear();
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

    // خصم النقاط
    const handleDeductPoint = (student: Student) => {
        if (!onUpdateStudent) return;
        if (confirm(`هل تريد خصم نقطة واحدة من الطالب/ة ${student.name}؟ (تصحيح)`)) {
            const correctionBehavior = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString(),
                type: 'negative' as const, 
                description: 'تصحيح نقاط (خصم)',
                points: -3, 
                semester: currentSemester
            };
            onUpdateStudent({ ...student, behaviors: [correctionBehavior, ...(student.behaviors || [])] });
        }
    };

    // 🖨️ طباعة الشهادة عالية الدقة
    const handleDownloadPDF = async () => {
        if (!certificateRef.current || !certificateStudent) return;
        setIsGeneratingPdf(true);
        const opt = {
            margin: 0, filename: `Rased_Award_${certificateStudent.name}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 3, useCORS: true },
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

    return (
        <div className={`flex flex-col h-full space-y-6 pb-24 md:pb-8 overflow-hidden relative ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
            
            <header 
                className={`fixed md:sticky top-0 z-40 shadow-lg px-4 md:pl-40 pt-8 pb-4 transition-all duration-500 w-full ${isRamadan ? 'bg-white/5 border-b border-white/10 text-white' : 'bg-[#446A8D] text-white'}`}
                style={{ WebkitAppRegion: 'drag' } as any}
            >
                <div className="flex flex-col items-center text-center relative">
                    <div className="absolute left-0 top-0 flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <select 
                            value={schoolType} 
                            onChange={(e) => setSchoolType(e.target.value as any)}
                            className={`border rounded-lg text-[10px] p-1 outline-none font-bold cursor-pointer transition-colors ${isRamadan ? 'bg-transparent border-indigo-500/30 text-indigo-100' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                        >
                            <option value="mixed" className={isRamadan ? 'bg-slate-900 text-white' : 'text-slate-800'}>مدرسة مختلطة</option>
                            <option value="boys" className={isRamadan ? 'bg-slate-900 text-white' : 'text-slate-800'}>مدرسة ذكور</option>
                            <option value="girls" className={isRamadan ? 'bg-slate-900 text-white' : 'text-slate-800'}>مدرسة إناث</option>
                        </select>
                    </div>

                    <div className="bg-white/10 p-3 rounded-2xl border border-white/20 mb-3 shadow-inner">
                        <Crown className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wide mb-1">{getPageTitle()}</h1>

                    {/* 📢 الشريط الإخباري الذكي (News Ticker) */}
                    <div className={`w-full max-w-2xl mt-3 mb-2 flex items-center rounded-xl border overflow-hidden shadow-sm ${isRamadan ? 'bg-[#1e1b4b]/80 border-indigo-500/30' : 'bg-white/20 border-white/30 backdrop-blur-md'}`} style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <div className={`px-4 py-2 flex items-center gap-1 font-black text-[11px] shrink-0 z-10 ${isRamadan ? 'bg-amber-600 text-white' : 'bg-amber-400 text-[#1e3a8a]'}`}>
                            <Sparkles size={14} className="animate-pulse" />
                            أخبار الفرسان
                        </div>
                        <div className="flex-1 overflow-hidden relative flex items-center">
                            {/* @ts-ignore */}
                            <marquee direction="right" scrollamount="4" className={`font-bold text-xs pt-1 tracking-wide ${isRamadan ? 'text-amber-300' : 'text-white'}`}>
                                {tickerText}
                            </marquee>
                        </div>
                    </div>
                    
                    <div className="relative w-full max-w-sm my-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full border rounded-xl py-2 pr-10 text-xs font-bold outline-none transition-all ${isRamadan ? 'bg-white/10 border-white/20 text-white placeholder:text-blue-200/50 focus:bg-white/20' : 'bg-white/20 border-white/30 text-white placeholder:text-blue-100 focus:bg-white/30'}`} />
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible pb-2 w-full justify-start" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <button onClick={() => setSelectedClass('all')} className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-xl text-xs font-black border transition-all ${selectedClass === 'all' ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a]') : 'bg-white/10 text-blue-100'}`}>الكل</button>
                        {classes.map(c => (
                            <button key={c} onClick={() => setSelectedClass(c)} className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-xl text-xs font-black border transition-all ${selectedClass === c ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a]') : 'bg-white/10 text-blue-100'}`}>{c}</button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pt-64 md:pt-2 relative z-10">
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
                                <div className={`px-3 py-2 rounded-xl text-center border shadow-sm w-28 md:w-36 transition-colors ${isRamadan ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200'}`}>
                                    <h3 className={`font-black text-xs md:text-sm truncate ${isRamadan ? 'text-white' : 'text-slate-800'}`} title={s.name}>{getShortName(s.name)}</h3>
                                    <span className="text-amber-500 font-bold text-xs" dir="ltr">{s.monthlyPoints}</span>
                                </div>
                                <div className="flex gap-1 mt-2">
                                    <button onClick={() => setCertificateStudent(s)} className={`text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 shadow-md transition-colors ${isRamadan ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10' : 'bg-slate-700 text-white hover:bg-slate-800'}`}>
                                        <Award size={12} /> شهادة
                                    </button>
                                    <button onClick={() => handleDeductPoint(s)} className={`text-[10px] px-2 py-1 rounded-lg shadow-sm transition-colors ${isRamadan ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-rose-100 text-rose-500 hover:bg-rose-200'}`} title="خصم نقطة">
                                        <MinusCircle size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-8 pb-20">
                    {restOfStudents.map((s, index) => (
                        <div key={s.id} className={`rounded-2xl p-3 shadow-sm border flex flex-col items-center relative active:scale-95 transition-all duration-300 ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                            <div className={`absolute top-1 right-1 font-bold w-5 h-5 rounded flex items-center justify-center text-[9px] ${isRamadan ? 'bg-white/10 text-indigo-200' : 'bg-indigo-50 text-indigo-600'}`}>{index + 4}</div>
                            <div className={`w-12 h-12 rounded-full border-2 shadow-md overflow-hidden mb-2 cursor-pointer ${isRamadan ? 'border-white/20' : 'border-white'}`} onClick={() => handleAddPoints(s)}>
                                <StudentAvatar gender={s.gender} className="w-full h-full" />
                            </div>
                            <h3 className={`font-black text-[11px] truncate w-full text-center ${isRamadan ? 'text-white' : 'text-slate-800'}`} title={s.name}>{getShortName(s.name)}</h3>
                            <span className={`font-bold text-[10px] mt-0.5 ${isRamadan ? 'text-amber-400' : 'text-amber-600'}`} dir="ltr">{s.monthlyPoints}</span>
                            
                            <div className="flex gap-1 w-full mt-2">
                                <button onClick={() => setCertificateStudent(s)} className={`flex-1 py-1 text-[10px] font-bold rounded-md border transition-colors ${isRamadan ? 'bg-white/10 text-indigo-200 border-white/10 hover:bg-white/20' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}>شهادة</button>
                                <button onClick={() => handleDeductPoint(s)} className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-colors ${isRamadan ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30' : 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100'}`}><MinusCircle size={12} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Modal isOpen={!!certificateStudent} onClose={() => !isGeneratingPdf && setCertificateStudent(null)} className="max-w-[1200px] w-[95vw] p-0 overflow-hidden bg-white rounded-2xl">
                {certificateStudent && (
                    <div className="flex flex-col bg-white">
                        <div className="flex justify-between items-center p-4 bg-slate-50 border-b">
                            <h3 className="font-black text-slate-800">معاينة وإصدار الشهادة</h3>
                            <button onClick={() => setCertificateStudent(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-200 p-4 md:p-8 flex justify-center items-center custom-scrollbar">
                            <div ref={certificateRef} className="shrink-0">
                                <CertificateTemplate 
                                    studentName={certificateStudent.name}
                                    grade={certificateStudent.classes[0]}
                                    teacherName={teacherInfo?.name || '..........'}
                                    schoolName={teacherInfo?.school}
                                    subject={teacherInfo?.subject}
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t flex gap-3 bg-white">
                            <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="flex-1 py-4 bg-[#1e3a8a] text-white rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-[#152c6b]">
                                {isGeneratingPdf ? <Loader2 size={24} className="animate-spin" /> : <><Download size={24} /> حفظ الشهادة واستخراجها للطباعة (PDF)</>}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Leaderboard;
