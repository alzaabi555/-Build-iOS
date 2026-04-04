import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Sparkles, Star, Search, Award, Download, X, Loader2, MinusCircle, Medal } from 'lucide-react'; 
import { useApp } from '../context/AppContext';
import { StudentAvatar } from './StudentAvatar';
import { Drawer as DrawerSheet } from './ui/Drawer'; // 👈 هنا استدعينا النافذة المنزلقة الحديثة
import positiveSound from '../assets/positive.mp3';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';

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
    const { currentSemester, t, dir, language } = useApp();
    
    const today = new Date();
    const currentMonth = today.getMonth(); 
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthName = t(monthKeys[currentMonth]) || '';

    const [schoolType, setSchoolType] = useState<'boys' | 'girls' | 'mixed'>(() => {
        return (localStorage.getItem('rased_school_type') as any) || 'mixed';
    });

    useEffect(() => {
        localStorage.setItem('rased_school_type', schoolType);
    }, [schoolType]);

    const getPageTitle = () => {
        if (language === 'en') return `${t('knightsOfMonth_mixed')} ${monthName}`;
        if (schoolType === 'boys') return `${t('knightsOfMonth_boys')} ${monthName}`;
        if (schoolType === 'girls') return `${t('knightsOfMonth_girls')} ${monthName}`;
        return `${t('knightsOfMonth_mixed')} ${monthName}`;
    };

    const [selectedClass, setSelectedClass] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        sessionStorage.setItem('rased_class', selectedClass);
    }, [selectedClass]);

    const [certificateStudent, setCertificateStudent] = useState<Student | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const certificateRef = useRef<HTMLDivElement>(null);

    const safeStudents = Array.isArray(students) ? students : [];
    const safeClasses = Array.isArray(classes) ? classes : [];
    
    const getShortName = (fullName: string) => {
        if (!fullName || typeof fullName !== 'string') return ''; 
        const nameParts = fullName.trim().split(' ');
        if (nameParts.length === 1) return nameParts[0];
        return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
    };
    
    const tickerText = useMemo(() => {
        try {
            let baseStudents = safeStudents;
            if (selectedClass !== 'all') {
                baseStudents = safeStudents.filter(s => {
                    const sClasses = Array.isArray(s.classes) ? s.classes : [];
                    return sClasses.includes(selectedClass);
                });
            }

            const studentsWithPoints = baseStudents.map(student => {
                const monthlyPoints = (student.behaviors || [])
                    .filter(b => {
                        if (!b || !b.date) return false; 
                        const d = new Date(b.date);
                        if (isNaN(d.getTime())) return false; 
                        return d.getMonth() === currentMonth && d.getFullYear() === today.getFullYear();
                    })
                    .reduce((acc, b) => acc + Number(b?.points || 0), 0);
                return { ...student, monthlyPoints };
            }).filter(s => s.monthlyPoints > 0)
              .sort((a, b) => b.monthlyPoints - a.monthlyPoints);

            if (studentsWithPoints.length === 0) return t('noPointsYet') || 'لا توجد نقاط بعد';

            if (selectedClass === 'all') {
                const classTopMap = new Map<string, typeof studentsWithPoints[0]>();
                studentsWithPoints.forEach(s => {
                    const sClasses = Array.isArray(s.classes) ? s.classes : [];
                    const sClass = sClasses[0];
                    if (sClass && !classTopMap.has(sClass)) {
                        classTopMap.set(sClass, s);
                    }
                });

                return Array.from(classTopMap.values())
                    .map(s => {
                        const sClasses = Array.isArray(s.classes) ? s.classes : [];
                        return `👑 ${t('championOf')} (${sClasses[0] || ''}): ${getShortName(s.name)} [${s.monthlyPoints} ${t('pointsWord')}]`;
                    })
                    .join(' 🌟 | 🌟 ');
            } else {
                const top3 = studentsWithPoints.slice(0, 3);
                const medals = [`🥇 ${t('firstPlace')}`, `🥈 ${t('secondPlace')}`, `🥉 ${t('thirdPlace')}`];
                return top3
                    .map((s, idx) => `${medals[idx] || ''}: ${getShortName(s.name)} [${s.monthlyPoints} ${t('pointsWord')}]`)
                    .join(' ✨ | ✨ ');
            }
        } catch (error) {
            console.error("Ticker Error safely caught:", error);
            return t('noPointsYet') || "جاري تحديث البيانات...";
        }
    }, [safeStudents, selectedClass, currentMonth, t]);

    const rankedStudents = useMemo(() => {
        try {
            let filtered = safeStudents;
            if (selectedClass !== 'all') {
                filtered = safeStudents.filter(s => {
                    const sClasses = Array.isArray(s.classes) ? s.classes : [];
                    return sClasses.includes(selectedClass);
                });
            }
            
            if (searchTerm.trim()) {
                filtered = filtered.filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
            }
            
            const withPoints = filtered.map(student => {
                const monthlyPoints = (student.behaviors || [])
                    .filter(b => {
                        if (!b || !b.date) return false;
                        const d = new Date(b.date);
                        if (isNaN(d.getTime())) return false;
                        return d.getMonth() === currentMonth && d.getFullYear() === today.getFullYear();
                    })
                    .reduce((acc, b) => acc + Number(b?.points || 0), 0);
                return { ...student, monthlyPoints };
            });
            return withPoints.sort((a, b) => b.monthlyPoints - a.monthlyPoints);
        } catch (error) {
            console.error("Ranking Error safely caught:", error);
            return [];
        }
    }, [safeStudents, selectedClass, searchTerm, currentMonth]);

    const topThree = rankedStudents.slice(0, 3);
    const restOfStudents = rankedStudents.slice(3);

    const handleAddPoints = (student: Student) => {
        if (!onUpdateStudent) return;
        new Audio(positiveSound).play().catch(() => {});
        const isBoy = student.gender !== 'female';
        const desc = isBoy ? t('pointsActionDesc_boys') : t('pointsActionDesc_girls');
        const newBehavior = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            type: 'positive' as const,
            description: desc,
            points: 3,
            semester: currentSemester
        };
        onUpdateStudent({ ...student, behaviors: [newBehavior, ...(student.behaviors || [])] });
    };

    const handleDeductPoint = (student: Student) => {
        if (!onUpdateStudent) return;
        if (confirm(`${t('deductConfirm1')} ${student.name}${t('deductConfirm2')}`)) {
            const correctionBehavior = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString(),
                type: 'negative' as const, 
                description: t('pointsCorrectionDesc'),
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
                await Share.share({ title: t('certificateBtn'), url: result.uri });
            } else { worker.save(); }
        } catch (e) { alert(t('errorSavingPdf')); } finally { setIsGeneratingPdf(false); }
    };

    return (
        <div className={`flex flex-col h-full space-y-6 pb-24 md:pb-8 overflow-hidden relative text-textPrimary ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
            
            <header 
                className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent text-textPrimary`}
                style={{ WebkitAppRegion: 'drag' } as any}
            >
                <div className="flex flex-col items-center text-center relative">
                    <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-0 flex gap-2`} style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <select 
                            value={schoolType} 
                            onChange={(e) => setSchoolType(e.target.value as any)}
                            className={`border rounded-lg text-[10px] p-1 outline-none font-bold cursor-pointer transition-colors bg-bgSoft border-borderColor text-textPrimary hover:bg-bgCard`}
                        >
                            <option value="mixed" className="bg-bgCard text-textPrimary">{t('mixedSchool')}</option>
                            <option value="boys" className="bg-bgCard text-textPrimary">{t('boysSchool')}</option>
                            <option value="girls" className="bg-bgCard text-textPrimary">{t('girlsSchool')}</option>
                        </select>
                    </div>

                    <div className={`p-3 rounded-2xl border mb-3 shadow-inner bg-bgSoft border-borderColor`}>
                        <Crown className="w-8 h-8 text-warning fill-warning animate-bounce" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wide mb-1 text-textPrimary">{getPageTitle()}</h1>

                    <div className={`w-full max-w-2xl mt-3 mb-2 flex items-center rounded-xl border overflow-hidden shadow-sm bg-bgSoft border-borderColor backdrop-blur-md`} style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <div className={`px-4 py-2 flex items-center gap-1 font-black text-[11px] shrink-0 z-10 bg-warning text-white`}>
                            <Sparkles size={14} className="animate-pulse" />
                            {t('newsTickerTitle')}
                        </div>
                        <div className="flex-1 overflow-hidden relative flex items-center">
                            {/* @ts-ignore */}
                            <marquee direction={dir === 'rtl' ? 'right' : 'left'} scrollamount="4" className={`font-bold text-xs pt-1 tracking-wide text-warning`}>
                                {String(tickerText)}
                            </marquee>
                        </div>
                    </div>
                    
                    <div className="relative w-full max-w-sm my-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary`} />
                        <input type="text" placeholder={t('searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full border rounded-xl py-2 ${dir === 'rtl' ? 'pr-10' : 'pl-10'} text-xs font-bold outline-none transition-all bg-bgCard border-borderColor text-textPrimary placeholder:text-textSecondary focus:bg-bgSoft`} />
                    </div>

                    <div className="w-full overflow-x-auto no-scrollbar pb-2 mt-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <div className={`inline-flex items-center p-1.5 rounded-full border transition-all bg-bgSoft border-borderColor backdrop-blur-md`}>
                            <button 
                                onClick={() => setSelectedClass('all')} 
                                className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedClass === 'all' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
                            >
                                {t('all')}
                            </button>

                             {safeClasses.map(c => (
                                <React.Fragment key={c}>
                                    <div className={`w-[1px] h-5 mx-1.5 rounded-full shrink-0 bg-borderColor`} />
                                    <button 
                                        onClick={() => setSelectedClass(c)} 
                                        className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedClass === c ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
                                    >
                                        {c}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div> 
            </header>

            <div className="flex-1 overflow-y-auto px-2 pt-2 pb-28 custom-scrollbar relative z-10">
                {topThree.length > 0 && (
                    <div className="flex justify-center items-end gap-2 md:gap-6 py-4">
                        {[topThree[1], topThree[0], topThree[2]].map((s, i) => {
                            if (!s) return null; 
                            return (
                            <div key={s.id} className={`flex flex-col items-center ${i === 1 ? 'z-10 -mb-4' : 'opacity-90'}`}>
                                <div className="relative cursor-pointer" onClick={() => handleAddPoints(s)}>
                                    {i === 1 && <Crown className="w-10 h-10 text-warning fill-warning absolute -top-8 left-1/2 -translate-x-1/2 animate-pulse" />}
                                    <div className={`rounded-full border-4 shadow-xl overflow-hidden mb-2 bg-bgCard transform transition-transform ${i === 1 ? 'w-24 h-24 md:w-32 md:h-32 border-warning scale-110' : 'w-20 h-20 md:w-24 md:h-24 border-borderColor'}`}>
                                        <StudentAvatar gender={s.gender} className="w-full h-full" />
                                    </div>
                                </div>
                                
                                <div className={`glass-panel px-3 py-2 rounded-xl text-center border border-borderColor shadow-sm w-28 md:w-36 transition-colors`}>
                                    <h3 className={`font-black text-xs md:text-sm truncate text-textPrimary`} title={s.name}>{getShortName(s.name)}</h3>
                                    <span className="text-warning font-bold text-xs" dir="ltr">{s.monthlyPoints}</span>
                                </div>
                                <div className="flex gap-1 mt-2 w-full justify-center">
                                    <button onClick={() => setCertificateStudent(s)} className={`text-[10px] px-2 py-1 rounded-lg flex items-center justify-center gap-1 shadow-md transition-colors bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20`}>
                                        <Award size={12} /> {t('certificateBtn')}
                                    </button>
                                    <button onClick={() => handleDeductPoint(s)} className={`text-[10px] px-2 py-1 rounded-lg shadow-sm transition-colors flex items-center justify-center bg-danger/10 text-danger hover:bg-danger/20`} title={t('deductBtnTitle')}>
                                        <MinusCircle size={12} />
                                    </button>
                                </div>
                            </div>
                        )})}
                    </div>
                )}

                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-8 pb-20">
                    {restOfStudents.map((s, index) => {
                        if (!s) return null;
                        return (
                        <div key={s.id} className={`glass-panel rounded-2xl p-3 shadow-sm border border-borderColor flex flex-col items-center relative active:scale-95 transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}>
                            <div className={`absolute top-1 ${dir === 'rtl' ? 'right-1' : 'left-1'} font-bold w-5 h-5 rounded flex items-center justify-center text-[9px] bg-bgSoft text-textSecondary`}>{index + 4}</div>
                            <div className={`w-12 h-12 rounded-full border-2 shadow-md overflow-hidden mb-2 cursor-pointer border-borderColor`} onClick={() => handleAddPoints(s)}>
                                <StudentAvatar gender={s.gender} className="w-full h-full" />
                            </div>
                            <h3 className={`font-black text-[11px] truncate w-full text-center text-textPrimary`} title={s.name}>{getShortName(s.name)}</h3>
                            <span className={`font-bold text-[10px] mt-0.5 text-warning`} dir="ltr">{s.monthlyPoints}</span>
                            
                            <div className="flex gap-1 w-full mt-2">
                                <button onClick={() => setCertificateStudent(s)} className={`flex-1 py-1 text-[10px] font-bold rounded-md border transition-colors bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard`}>{t('certificateBtn')}</button>
                                <button onClick={() => handleDeductPoint(s)} className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-colors bg-danger/10 text-danger border-danger/30 hover:bg-danger/20`}><MinusCircle size={12} /></button>
                            </div>
                        </div>
                    )})}
                </div>
            </div>

            {/* 👈 هنا قمنا باستبدال Modal القديم بالنافذة المنزلقة الحديثة والآمنة */}
            <DrawerSheet isOpen={!!certificateStudent} onClose={() => !isGeneratingPdf && setCertificateStudent(null)} dir={dir} mode="full">
                {certificateStudent && (
                    <div className="flex flex-col h-full bg-bgCard">
                        <div className="flex justify-between items-center p-4 bg-bgCard border-b border-borderColor shrink-0">
                            <h3 className="font-black text-textPrimary">{t('previewAndIssueCert')}</h3>
                            <button onClick={() => setCertificateStudent(null)} className="p-2 text-textSecondary hover:text-danger transition-colors"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-auto bg-bgSoft p-4 md:p-8 flex justify-center items-center custom-scrollbar">
                            <div ref={certificateRef} className="shrink-0" dir="rtl"> 
                                <CertificateTemplate 
                                    studentName={certificateStudent.name || ''}
                                    grade={Array.isArray(certificateStudent.classes) ? certificateStudent.classes[0] : ''}
                                    teacherName={teacherInfo?.name || t('defaultTeacherNameLine')}
                                    schoolName={teacherInfo?.school}
                                    subject={teacherInfo?.subject}
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-borderColor flex gap-3 bg-bgCard shrink-0">
                            <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="flex-1 py-4 bg-primary text-white rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-primary/80">
                                {isGeneratingPdf ? <Loader2 size={24} className="animate-spin" /> : <><Download size={24} /> {t('saveAndExportPdf')}</>}
                            </button>
                        </div>
                    </div>
                )}
            </DrawerSheet>
        </div>
    );
};

export default Leaderboard;