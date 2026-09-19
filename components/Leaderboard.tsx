import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student } from '../types';
import { Trophy, Crown, Sparkles, Search, Award, Download, X, Loader2, MinusCircle, History, Settings, Upload, Trash2, RotateCcw, Save, FileImage, FileText } from 'lucide-react'; 
import { useApp } from '../context/AppContext';
import { StudentAvatar } from './StudentAvatar';
import { StudentRow } from './StudentRow';
import { Drawer as DrawerSheet } from './ui/Drawer';
import PageLayout from '../components/PageLayout'; 
import positiveSound from '../assets/positive.mp3';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';

import CertificateTemplate from './CertificateTemplate';
import { CertificateFieldKey, CertificateSettings as CertificateSettingsType, DEFAULT_CERTIFICATE_SETTINGS, loadCertificateSettings, saveCertificateSettings } from '../services/certificateSettings';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
// @ts-ignore - Vite converts the worker file to a valid asset URL
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
    
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [isCertificateSettingsOpen, setIsCertificateSettingsOpen] = useState(false);
    const [certificateSettings, setCertificateSettingsState] = useState<CertificateSettingsType>(() => loadCertificateSettings());
    const [tempCertificateSettings, setTempCertificateSettings] = useState<CertificateSettingsType>(() => loadCertificateSettings());
    const [isProcessingCertificateTemplate, setIsProcessingCertificateTemplate] = useState(false);
    const [certificateSettingsError, setCertificateSettingsError] = useState('');
    const certificateImageInputRef = useRef<HTMLInputElement>(null);
    const certificatePdfInputRef = useRef<HTMLInputElement>(null);

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
              .sort((a, b) => (b.monthlyPoints - a.monthlyPoints) || String(a.name || '').localeCompare(String(b.name || ''), language === 'ar' ? 'ar' : 'en', { sensitivity: 'base' }));

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
    }, [safeStudents, selectedClass, currentMonth, t, language]);

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
            return withPoints.sort((a, b) => (b.monthlyPoints - a.monthlyPoints) || String(a.name || '').localeCompare(String(b.name || ''), language === 'ar' ? 'ar' : 'en', { sensitivity: 'base' }));
        } catch (error) {
            console.error("Ranking Error safely caught:", error);
            return [];
        }
    }, [safeStudents, selectedClass, searchTerm, currentMonth, language]);

    const topThree = rankedStudents.slice(0, 3);
    const restOfStudents = rankedStudents.slice(3);

    const archiveData = useMemo(() => {
        try {
            const dataMap = new Map<string, Map<string, Map<string, Student & { points: number }>>>();

            safeStudents.forEach(student => {
                const sClass = (student.classes && student.classes.length > 0) ? student.classes[0] : 'بدون فصل';

                (student.behaviors || []).forEach(b => {
                    if (!b || !b.date) return;
                    const d = new Date(b.date);
                    if (isNaN(d.getTime())) return;

                    if (d.getMonth() === currentMonth && d.getFullYear() === today.getFullYear()) return;

                    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;

                    if (!dataMap.has(monthKey)) {
                        dataMap.set(monthKey, new Map());
                    }
                    const monthClasses = dataMap.get(monthKey)!;

                    if (!monthClasses.has(sClass)) {
                        monthClasses.set(sClass, new Map());
                    }
                    const classStudents = monthClasses.get(sClass)!;

                    if (!classStudents.has(student.id)) {
                        classStudents.set(student.id, { ...student, points: 0 });
                    }

                    const sRecord = classStudents.get(student.id)!;
                    sRecord.points += Number(b.points || 0);
                });
            });

            const result: { year: number, month: number, monthName: string, classGroups: { className: string, top3: any[] }[] }[] = [];
            
            dataMap.forEach((monthClasses, monthKey) => {
                const [yearStr, monthStr] = monthKey.split('-');
                const year = parseInt(yearStr);
                const month = parseInt(monthStr);
                
                const classGroups: { className: string, top3: any[] }[] = [];

                monthClasses.forEach((studentMap, className) => {
                    const sorted = Array.from(studentMap.values())
                        .filter(s => s.points > 0)
                        .sort((a, b) => b.points - a.points)
                        .slice(0, 3); 

                    if (sorted.length > 0) {
                        classGroups.push({ className, top3: sorted });
                    }
                });

                classGroups.sort((a, b) => a.className.localeCompare(b.className));

                if (classGroups.length > 0) {
                    result.push({
                        year,
                        month,
                        monthName: t(monthKeys[month]) || '',
                        classGroups
                    });
                }
            });

            return result.sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });
        } catch (error) {
            console.error("Archive Error:", error);
            return [];
        }
    }, [safeStudents, currentMonth, t]);

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

    const openCertificateSettings = () => {
        setTempCertificateSettings(certificateSettings);
        setCertificateSettingsError('');
        setIsCertificateSettingsOpen(true);
    };
    const updateCertificateField = (key: CertificateFieldKey, patch: Partial<CertificateSettingsType['fields'][CertificateFieldKey]>) => {
        setTempCertificateSettings(previous => ({
            ...previous,
            fields: { ...previous.fields, [key]: { ...previous.fields[key], ...patch } }
        }));
    };
    const readCertificateImage = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    const handleCertificateTemplateUpload = async (file?: File) => {
        if (!file) return;
        const lowerName = String(file.name || '').toLowerCase();
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
        if (!isImage && !isPdf) {
            setCertificateSettingsError('نوع الملف غير مدعوم. استخدم PNG أو JPG أو WebP أو PDF.');
            return;
        }
        if (file.size > 12 * 1024 * 1024) {
            setCertificateSettingsError('حجم القالب كبير. الحد الأعلى المسموح به 12 ميجابايت.');
            return;
        }
        setIsProcessingCertificateTemplate(true);
        setCertificateSettingsError('');
        try {
            let templateDataUrl = '';
            if (isPdf) {
                const pdfData = new Uint8Array(await file.arrayBuffer());
                if (pdfData.length < 5 || String.fromCharCode(...Array.from(pdfData.slice(0, 5))) !== '%PDF-') {
                    throw new Error('INVALID_PDF_HEADER');
                }
                const loadingTask = pdfjsLib.getDocument({ data: pdfData, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
                const pdfDocument = await loadingTask.promise;
                if (!pdfDocument || pdfDocument.numPages < 1) throw new Error('PDF_HAS_NO_PAGES');
                const page = await pdfDocument.getPage(1);
                const originalViewport = page.getViewport({ scale: 1 });
                const targetWidth = 1800;
                const renderScale = Math.max(1, Math.min(targetWidth / originalViewport.width, 3));
                const viewport = page.getViewport({ scale: renderScale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { alpha: false });
                if (!context) throw new Error('CANVAS_CONTEXT_UNAVAILABLE');
                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, canvas.width, canvas.height);
                await page.render({ canvasContext: context, viewport, background: '#FFFFFF' }).promise;
                templateDataUrl = canvas.toDataURL('image/jpeg', 0.94);
                page.cleanup();
                await pdfDocument.destroy();
            } else {
                templateDataUrl = await readCertificateImage(file);
            }
            if (!templateDataUrl.startsWith('data:image/')) throw new Error('INVALID_TEMPLATE_RESULT');
            setTempCertificateSettings(previous => ({ ...previous, mode: 'image', templateDataUrl, templateFileName: file.name }));
        } catch (error: any) {
            console.error('Certificate template import failed:', error);
            const message = String(error?.message || error || '');
            if (message.includes('PasswordException')) setCertificateSettingsError('ملف PDF محمي بكلمة مرور ولا يمكن استخدامه قالبًا.');
            else if (message.includes('INVALID_PDF_HEADER') || message.includes('InvalidPDFException')) setCertificateSettingsError('ملف PDF غير صالح أو تالف.');
            else if (message.includes('PDF_HAS_NO_PAGES')) setCertificateSettingsError('ملف PDF لا يحتوي صفحات.');
            else setCertificateSettingsError('تعذر قراءة قالب الشهادة. جرّب ملفًا آخر أو صورة عالية الدقة.');
        } finally {
            setIsProcessingCertificateTemplate(false);
        }
    };
    const handleSaveCertificateSettings = () => {
        try {
            saveCertificateSettings(tempCertificateSettings);
            setCertificateSettingsState(tempCertificateSettings);
            setIsCertificateSettingsOpen(false);
        } catch (error) {
            console.error(error);
            setCertificateSettingsError('تعذر حفظ إعدادات الشهادة على الجهاز.');
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

    const certificateFieldLabels: Record<CertificateFieldKey, string> = {
        title: 'عنوان الشهادة', awardTitle: 'مسمى التكريم', studentName: 'اسم الطالب', bodyText: 'نص التكريم',
        grade: 'الفصل', points: 'النقاط', subject: 'المادة', monthName: 'الشهر', teacherName: 'اسم المعلم',
        schoolName: 'اسم المدرسة', issueDate: 'تاريخ الإصدار'
    };

    return (
        <PageLayout
            title={getPageTitle()}
            icon={<Crown className="w-6 h-6 text-warning" />}
            
            rightActions={
                <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button
                        type="button"
                        aria-label="إعدادات شهادة التميز"
                        title="إعدادات شهادة التميز"
                        onClick={openCertificateSettings}
                        className="flex items-center gap-1 border rounded-lg text-[10px] px-2 py-1 outline-none font-bold cursor-pointer transition-colors border-borderColor text-textSecondary hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    >
                        <Settings size={14} />
                        <span className="hidden sm:inline">إعدادات الشهادة</span>
                    </button>
                    <button
                        data-voice-command="فتح أرشيف الفرسان أرشيف الفرسان"
                        aria-label="فتح أرشيف الفرسان"
                        title="فتح أرشيف الفرسان"
                        onClick={() => setIsArchiveOpen(true)}
                        className="flex items-center gap-1 border rounded-lg text-[10px] px-2 py-1 outline-none font-bold cursor-pointer transition-colors border-borderColor text-textSecondary hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    >
                        <History size={14} />
                        <span className="hidden sm:inline">{t('archive') || 'الأرشيف'}</span>
                    </button>

                    <select 
                        value={schoolType} 
                        onChange={(e) => setSchoolType(e.target.value as any)}
                        className="border rounded-lg text-[10px] p-2 outline-none font-bold cursor-pointer transition-colors bg-bgSoft border-borderColor text-textPrimary hover:bg-bgCard"
                    >
                        <option value="mixed" className="bg-bgCard text-textPrimary">{t('mixedSchool')}</option>
                        <option value="boys" className="bg-bgCard text-textPrimary">{t('boysSchool')}</option>
                        <option value="girls" className="bg-bgCard text-textPrimary">{t('girlsSchool')}</option>
                    </select>
                </div>
            }

            leftActions={
                <div className="space-y-2 w-full mt-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <div className="w-full flex items-center rounded-xl border overflow-hidden shadow-sm bg-bgSoft border-borderColor backdrop-blur-md">
                        <div className="px-4 py-2 flex items-center gap-1 font-black text-[11px] shrink-0 z-10 bg-warning text-white">
                            <Sparkles size={14} className="animate-pulse" />
                            {t('newsTickerTitle')}
                        </div>
                        <div className="flex-1 overflow-hidden relative flex items-center">
                            {/* @ts-ignore */}
                            <marquee direction={dir === 'rtl' ? 'right' : 'left'} scrollamount="4" className="font-bold text-xs pt-1 tracking-wide text-warning">
                                {String(tickerText)}
                            </marquee>
                        </div>
                    </div>

<div className="flex flex-col md:flex-row gap-2">
                        <div className="relative flex-1">
  <Search
    className={`absolute ${
      dir === 'rtl' ? 'right-3' : 'left-3'
    } top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary`}
  />

  <input
    type="text"
    placeholder={t('searchPlaceholder')}
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className={`w-full border rounded-xl py-2 ${
      dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'
    } text-xs font-bold outline-none transition-all bg-bgCard border-borderColor text-textPrimary placeholder:text-textSecondary focus:bg-bgSoft`}
  />
</div>

                       <div className="relative w-full md:w-60 shrink-0">
                            <select
                                data-voice-field="فصل الفرسان"
                                aria-label="اختيار فصل الفرسان"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full h-10 rounded-xl border border-borderColor bg-bgCard px-4 text-xs font-black text-textPrimary outline-none shadow-sm transition-all focus:border-primary/40 focus:bg-bgSoft"
                            >
                                <option value="all">كل الفصول</option>
                                {safeClasses.map(c => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            }
        >
            <div className="animate-in fade-in duration-500 pt-4">
                
                {topThree.length > 0 && (
                    <div className="flex justify-center items-end gap-2 md:gap-6 py-4 mb-6">
                        {[topThree[1], topThree[0], topThree[2]].map((s, i) => {
                            if (!s) return null;

                            return (
                                <div key={s.id} className={`flex flex-col items-center ${i === 1 ? 'z-10 -mb-4' : 'opacity-90'}`}>
                                    <div
                                        className="relative cursor-pointer"
                                        role="button"
                                        tabIndex={0}
                                        data-voice-command={`إضافة نقاط ${s.name} أضف نقاط ${s.name} عزز ${s.name} تكريم ${s.name}`}
                                        aria-label={`إضافة نقاط ${s.name}`}
                                        title={`إضافة نقاط ${s.name}`}
                                        onClick={() => handleAddPoints(s)}
                                    >
                                        {i === 1 && (
                                            <Crown className="w-10 h-10 text-warning fill-warning absolute -top-8 left-1/2 -translate-x-1/2 animate-pulse" />
                                        )}

                                        <div className={`rounded-full border-4 shadow-xl overflow-hidden mb-2 bg-bgCard transform transition-transform ${i === 1 ? 'w-24 h-24 md:w-32 md:h-32 border-warning scale-110' : 'w-20 h-20 md:w-24 md:h-24 border-borderColor'}`}>
                                            <StudentAvatar gender={s.gender} className="w-full h-full" />
                                        </div>
                                    </div>

                                    <div className="glass-panel px-3 py-2 rounded-xl text-center border border-borderColor shadow-sm w-28 md:w-36 transition-colors">
                                        <h3 className="font-black text-xs md:text-sm truncate text-textPrimary" title={s.name}>
                                            {getShortName(s.name)}
                                        </h3>
                                        <span className="text-warning font-bold text-xs" dir="ltr">
                                            {s.monthlyPoints}
                                        </span>
                                    </div>

                                    <div className="flex gap-1 mt-2 w-full justify-center">
                                        <button
                                            data-voice-command={`إصدار شهادة ${s.name} فتح شهادة ${s.name} شهادة ${s.name}`}
                                            aria-label={`إصدار شهادة ${s.name}`}
                                            title={`إصدار شهادة ${s.name}`}
                                            onClick={() => setCertificateStudent(s)}
                                            className="text-[10px] px-2 py-1 rounded-lg flex items-center justify-center gap-1 shadow-md transition-colors bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                                        >
                                            <Award size={12} />
                                            {t('certificateBtn')}
                                        </button>

                                        <button
                                            data-voice-command={`خصم نقاط ${s.name} تصحيح نقاط ${s.name} حذف نقاط ${s.name}`}
                                            data-voice-danger="true"
                                            aria-label={`خصم نقاط ${s.name}`}
                                            title={`خصم نقاط ${s.name}`}
                                            onClick={() => handleDeductPoint(s)}
                                            className="text-[10px] px-2 py-1 rounded-lg shadow-sm transition-colors flex items-center justify-center bg-danger/10 text-danger hover:bg-danger/20"
                                        >
                                            <MinusCircle size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="space-y-2.5 pb-8">
                    {restOfStudents.map((s, index) => {
                        if (!s) return null;

                        const sClasses = Array.isArray(s.classes) ? s.classes : [];
                        const studentClass = sClasses[0] || t('unspecified');

                        return (
                            <StudentRow
                                key={s.id}
                                student={s}
                                dir={dir}
                                subtitle={studentClass}
                                indexLabel={index + 4}
                                badge={`${s.monthlyPoints} ${t('pointsWord')}`}
                                badgeTone="warning"
                                statusText={`الترتيب ${index + 4}`}
                                statusTone="primary"
                                actions={[
                                    {
                                        key: 'add-points',
                                        label: 'تعزيز',
                                        icon: Sparkles,
                                        tone: 'success',
                                        showOnMobile: true,
                                        voiceCommand: `إضافة نقاط ${s.name} أضف نقاط ${s.name} عزز ${s.name} تكريم ${s.name}`,
                                        ariaLabel: `إضافة نقاط ${s.name}`,
                                        title: `إضافة نقاط ${s.name}`,
                                        onClick: () => handleAddPoints(s)
                                    },
                                    {
                                        key: 'certificate',
                                        label: t('certificateBtn'),
                                        icon: Award,
                                        tone: 'primary',
                                        showOnMobile: true,
                                        voiceCommand: `إصدار شهادة ${s.name} فتح شهادة ${s.name} شهادة ${s.name}`,
                                        ariaLabel: `إصدار شهادة ${s.name}`,
                                        title: `إصدار شهادة ${s.name}`,
                                        onClick: () => setCertificateStudent(s)
                                    },
                                    {
                                        key: 'deduct',
                                        label: 'خصم',
                                        icon: MinusCircle,
                                        tone: 'danger',
                                        showOnMobile: false,
                                        danger: true,
                                        voiceCommand: `خصم نقاط ${s.name} تصحيح نقاط ${s.name} حذف نقاط ${s.name}`,
                                        ariaLabel: `خصم نقاط ${s.name}`,
                                        title: `خصم نقاط ${s.name}`,
                                        onClick: () => handleDeductPoint(s)
                                    }
                                ]}
                            />
                        );
                    })}
                </div>
            </div>

            <DrawerSheet isOpen={!!certificateStudent} onClose={() => !isGeneratingPdf && setCertificateStudent(null)} dir={dir} mode="full">
                {certificateStudent && (
                    <div className="flex flex-col h-full bg-bgCard">
                        <div className="flex justify-between items-center p-4 bg-bgCard border-b border-borderColor shrink-0">
                            <h3 className="font-black text-textPrimary">{t('previewAndIssueCert')}</h3>
                            <button
                                data-voice-command="إغلاق الشهادة إلغاء الشهادة"
                                aria-label="إغلاق الشهادة"
                                title="إغلاق الشهادة"
                                onClick={() => setCertificateStudent(null)}
                                className="p-2 text-textSecondary hover:text-danger transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto bg-bgSoft p-4 md:p-8 flex justify-center items-center custom-scrollbar">
                            <div ref={certificateRef} className="shrink-0" dir="rtl"> 
                                <CertificateTemplate 
                                    studentName={certificateStudent.name || ''}
                                    grade={Array.isArray(certificateStudent.classes) ? certificateStudent.classes[0] : ''}
                                    teacherName={teacherInfo?.name || t('defaultTeacherNameLine')}
                                    schoolName={teacherInfo?.school}
                                    subject={teacherInfo?.subject}
                                    monthName={monthName}
                                    points={(rankedStudents.find(student => student.id === certificateStudent.id) as any)?.monthlyPoints || 0}
                                    ministryLogo={teacherInfo?.ministryLogo}
                                    stamp={teacherInfo?.stamp}
                                    issueDate={new Intl.DateTimeFormat(language === 'ar' ? 'ar-OM' : 'en-US').format(new Date())}
                                    settings={certificateSettings}
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-borderColor flex gap-3 bg-bgCard shrink-0">
                            <button
                                data-voice-command="حفظ الشهادة تصدير الشهادة تنزيل الشهادة حفظ PDF"
                                aria-label="حفظ وتصدير الشهادة"
                                title="حفظ وتصدير الشهادة"
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPdf}
                                className="flex-1 py-4 bg-primary text-white rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-primary/80"
                            >                              
                                {isGeneratingPdf ? <Loader2 size={24} className="animate-spin" /> : <><Download size={24} /> {t('saveAndExportPdf')}</>}
                            </button>
                        </div>
                    </div>
                )}
            </DrawerSheet>

            <DrawerSheet isOpen={isCertificateSettingsOpen} onClose={() => !isProcessingCertificateTemplate && setIsCertificateSettingsOpen(false)} dir={dir} mode="full">
                <div className="flex flex-col h-full bg-bgCard">
                    <div className="flex justify-between items-center p-4 border-b border-borderColor shrink-0">
                        <div><h3 className="font-black text-lg text-textPrimary">إعدادات شهادة التميز</h3><p className="text-xs text-textSecondary mt-1">ارفع قالبًا زخرفيًا ثم اضبط النصوص ومواضعها قبل الطباعة.</p></div>
                        <button onClick={() => setIsCertificateSettingsOpen(false)} className="p-2 rounded-xl bg-bgSoft text-textSecondary hover:text-danger"><X size={20}/></button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 grid xl:grid-cols-[430px_1fr] gap-5">
                        <div className="space-y-4">
                            <section className="p-4 rounded-2xl border border-borderColor bg-bgSoft">
                                <h4 className="font-black text-textPrimary mb-3">القالب الزخرفي</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => certificateImageInputRef.current?.click()} className="py-3 rounded-xl bg-primary text-white font-black flex gap-2 items-center justify-center"><FileImage size={18}/> رفع صورة</button>
                                    <button type="button" onClick={() => certificatePdfInputRef.current?.click()} className="py-3 rounded-xl bg-indigo-600 text-white font-black flex gap-2 items-center justify-center"><FileText size={18}/> رفع PDF</button>
                                </div>
                                <input ref={certificateImageInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; handleCertificateTemplateUpload(file); event.currentTarget.value=''; }}/>
                                <input ref={certificatePdfInputRef} hidden type="file" accept="application/pdf" onChange={event => { const file = event.target.files?.[0]; handleCertificateTemplateUpload(file); event.currentTarget.value=''; }}/>
                                {isProcessingCertificateTemplate && <div className="mt-3 flex gap-2 items-center text-primary font-bold text-sm"><Loader2 className="animate-spin" size={18}/> جارٍ تجهيز القالب...</div>}
                                {tempCertificateSettings.templateFileName && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-borderColor bg-bgCard p-3"><span className="truncate text-xs font-bold text-textSecondary">{tempCertificateSettings.templateFileName}</span><button onClick={() => setTempCertificateSettings(previous => ({...previous,mode:'builtin',templateDataUrl:undefined,templateFileName:undefined}))} className="p-2 rounded-lg bg-danger/10 text-danger"><Trash2 size={16}/></button></div>}
                                <button type="button" onClick={() => setTempCertificateSettings(DEFAULT_CERTIFICATE_SETTINGS)} className="mt-3 w-full py-2.5 rounded-xl border border-borderColor bg-bgCard text-textPrimary font-bold flex gap-2 justify-center"><RotateCcw size={17}/> العودة للإعدادات الافتراضية</button>
                            </section>
                            <section className="p-4 rounded-2xl border border-borderColor space-y-3">
                                <label className="text-xs font-black text-textSecondary">عنوان الشهادة</label><input value={tempCertificateSettings.title} onChange={e=>setTempCertificateSettings(v=>({...v,title:e.target.value}))} className="w-full p-3 rounded-xl bg-bgSoft border border-borderColor text-textPrimary"/>
                                <label className="text-xs font-black text-textSecondary block">مسمى التكريم</label><input value={tempCertificateSettings.awardTitle} onChange={e=>setTempCertificateSettings(v=>({...v,awardTitle:e.target.value}))} className="w-full p-3 rounded-xl bg-bgSoft border border-borderColor text-textPrimary"/>
                                <label className="text-xs font-black text-textSecondary block">نص التكريم</label><textarea rows={4} value={tempCertificateSettings.bodyText} onChange={e=>setTempCertificateSettings(v=>({...v,bodyText:e.target.value}))} className="w-full p-3 rounded-xl bg-bgSoft border border-borderColor text-textPrimary resize-none"/>
                            </section>
                            {Object.entries(tempCertificateSettings.fields).map(([fieldKey, fieldStyle]) => {
                                const key = fieldKey as CertificateFieldKey; const style = fieldStyle as any;
                                return <section key={key} className="p-3 rounded-2xl border border-borderColor bg-bgCard">
                                    <div className="flex justify-between items-center"><b className="text-sm text-textPrimary">{certificateFieldLabels[key]}</b><label className="text-xs flex gap-2 items-center text-textSecondary"><input type="checkbox" checked={style.visible} onChange={e=>updateCertificateField(key,{visible:e.target.checked})}/> إظهار</label></div>
                                    <div className="grid grid-cols-2 gap-3 mt-3 text-[11px] font-bold text-textSecondary">
                                        <label>أفقي: {style.x}%<input type="range" min="0" max="100" value={style.x} onChange={e=>updateCertificateField(key,{x:+e.target.value})} className="w-full"/></label>
                                        <label>رأسي: {style.y}%<input type="range" min="0" max="100" value={style.y} onChange={e=>updateCertificateField(key,{y:+e.target.value})} className="w-full"/></label>
                                        <label>حجم الخط<input type="number" min="8" max="80" value={style.fontSize} onChange={e=>updateCertificateField(key,{fontSize:+e.target.value})} className="mt-1 w-full p-2 rounded-lg bg-bgSoft border border-borderColor text-textPrimary"/></label>
                                        <label>اللون<input type="color" value={style.color} onChange={e=>updateCertificateField(key,{color:e.target.value})} className="mt-1 w-full h-9 rounded-lg"/></label>
                                    </div>
                                </section>;
                            })}
                            {certificateSettingsError && <p className="text-danger text-sm font-bold">{certificateSettingsError}</p>}
                            <button onClick={handleSaveCertificateSettings} className="w-full py-4 rounded-xl bg-success text-white font-black flex gap-2 items-center justify-center shadow-lg"><Save size={20}/> حفظ إعدادات الشهادة</button>
                        </div>
                        <div className="rounded-2xl bg-slate-200 p-4 overflow-auto min-h-[600px] flex justify-center items-start">
                            <div className="origin-top shrink-0" style={{transform:'scale(0.78)',width:1123,height:794}}>
                                <CertificateTemplate studentName="الطالب النموذجي" grade="الصف الثامن" teacherName={teacherInfo?.name || 'معلم المادة'} schoolName={teacherInfo?.school || 'اسم المدرسة'} subject={teacherInfo?.subject || 'المادة'} monthName={monthName} points={120} ministryLogo={teacherInfo?.ministryLogo} stamp={teacherInfo?.stamp} settings={tempCertificateSettings}/>
                            </div>
                        </div>
                    </div>
                </div>
            </DrawerSheet>
                        <DrawerSheet isOpen={isArchiveOpen} onClose={() => setIsArchiveOpen(false)} dir={dir} mode="right">
                <div className="flex flex-col h-full bg-bgCard">
                    <div className="flex justify-between items-center p-4 bg-bgCard border-b border-borderColor shrink-0">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            <h3 className="font-black text-textPrimary">{t('archive') || 'أرشيف الفرسان (الشهور السابقة)'}</h3>
                        </div>
                        <button
                            data-voice-command="إغلاق أرشيف الفرسان إغلاق الأرشيف"
                            aria-label="إغلاق أرشيف الفرسان"
                            title="إغلاق أرشيف الفرسان"
                            onClick={() => setIsArchiveOpen(false)}
                            className="p-2 text-textSecondary hover:text-danger transition-colors rounded-lg bg-bgSoft hover:bg-danger/10"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {archiveData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-textSecondary opacity-50">
                                <History size={48} className="mb-2" />
                                <p className="font-bold text-sm">لا يوجد أرشيف لشهور سابقة بعد</p>
                            </div>
                        ) : (
                            archiveData.map((monthData, idx) => (
                                <div key={idx} className="border border-borderColor bg-bgSoft rounded-2xl p-4 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10" />
                                    
                                    <h4 className="font-black text-lg text-primary mb-4 flex items-center gap-2 border-b border-borderColor/50 pb-2">
                                        <Trophy size={18} className="text-warning" />
                                        فرسان شهر {monthData.monthName} {monthData.year}
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        {monthData.classGroups.map((cg, cIdx) => (
                                            <div key={cIdx} className="bg-bgCard/50 p-3 rounded-xl border border-borderColor/50">
                                                <h5 className="font-bold text-sm mb-2 text-primary border-b border-borderColor/30 pb-1">
                                                   فصل: {cg.className}
                                                </h5>
                                                <div className="space-y-2">
                                                    {cg.top3.map((student, rank) => {
                                                        const medals = ['🥇', '🥈', '🥉'];
                                                        const colors = ['bg-warning/20 border-warning', 'bg-slate-300/30 border-slate-400', 'bg-amber-600/20 border-amber-600/50'];
                                                        
                                                        return (
                                                            <div key={student.id} className={`flex items-center gap-3 p-2 rounded-xl border ${colors[rank]} bg-bgCard shadow-sm`}>
                                                                <div className="text-2xl w-8 text-center">{medals[rank]}</div>
                                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-borderColor bg-bgSoft shrink-0">
                                                                    <StudentAvatar gender={student.gender} className="w-full h-full" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-bold text-sm truncate text-textPrimary">{student.name}</p>
                                                                </div>
                                                                <div className="font-black text-warning bg-warning/10 px-3 py-1 rounded-lg border border-warning/20">
                                                                    {student.points} <span className="text-[10px]">نقطة</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DrawerSheet>
            
        </PageLayout>
    );
};

export default Leaderboard;
