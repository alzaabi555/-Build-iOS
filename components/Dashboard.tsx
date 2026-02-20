import React, { useState, useEffect, useRef } from 'react';
import { ScheduleDay, PeriodTime } from '../types';
import { 
  Bell, Clock, Settings, Edit3,
  School, Download, Loader2, 
  PlayCircle, AlarmClock, ChevronLeft, User, Check, Camera,
  X, Calendar, BellOff, Save, CalendarDays, CheckCircle2,
  AlertTriangle, Moon, Award, Heart, Plus, Trash2, RefreshCcw
} from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import alarmSound from '../assets/alarm.mp3';

// رسمة افتراضية
const DefaultAvatarSVG = ({ gender }: { gender: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full bg-indigo-50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="40" r="15" fill={gender === 'female' ? '#f472b6' : '#60a5fa'} opacity="0.8"/>
        <path d="M20 90 C20 70 35 60 50 60 C65 60 80 70 80 90" fill={gender === 'female' ? '#f472b6' : '#60a5fa'} opacity="0.6"/>
    </svg>
);

interface DashboardProps {
    students: any[];
    teacherInfo: { name: string; school: string; subject: string; governorate: string; avatar?: string; stamp?: string; ministryLogo?: string; academicYear?: string; gender?: 'male' | 'female' };
    onUpdateTeacherInfo: (info: any) => void;
    schedule: ScheduleDay[];
    onUpdateSchedule: (schedule: ScheduleDay[]) => void;
    onSelectStudent: (student: any) => void;
    onNavigate: (tab: string) => void;
    onOpenSettings: () => void;
    periodTimes: PeriodTime[];
    setPeriodTimes: React.Dispatch<React.SetStateAction<PeriodTime[]>>;
    notificationsEnabled: boolean;
    onToggleNotifications: () => void;
    currentSemester: '1' | '2';
    onSemesterChange: (sem: '1' | '2') => void;
}

const BELL_SOUND_URL = alarmSound;

interface AssessmentMonth {
    id: string;
    monthIndex: number;
    monthName: string;
    tasks: string[];
}

const Dashboard: React.FC<DashboardProps> = ({
    teacherInfo,
    onUpdateTeacherInfo,
    schedule,
    onUpdateSchedule,
    onNavigate,
    periodTimes,
    setPeriodTimes,
    notificationsEnabled,
    onToggleNotifications,
    currentSemester,
    onSemesterChange
}) => {
    if (!teacherInfo) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;

    const { classes, setSelectedClass } = useApp();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null); 
    const ministryLogoInputRef = useRef<HTMLInputElement>(null); 
    const modalScheduleFileInputRef = useRef<HTMLInputElement>(null);
    const scheduleFileInputRef = useRef<HTMLInputElement>(null);

    const [isImportingPeriods, setIsImportingPeriods] = useState(false);
    const [isImportingSchedule, setIsImportingSchedule] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState(teacherInfo?.name || '');
    const [editSchool, setEditSchool] = useState(teacherInfo?.school || '');
    const [editSubject, setEditSubject] = useState(teacherInfo?.subject || '');
    const [editGovernorate, setEditGovernorate] = useState(teacherInfo?.governorate || '');
    const [editAvatar, setEditAvatar] = useState(teacherInfo?.avatar);
    const [editStamp, setEditStamp] = useState(teacherInfo?.stamp);
    const [editMinistryLogo, setEditMinistryLogo] = useState(teacherInfo?.ministryLogo);
    const [editAcademicYear, setEditAcademicYear] = useState(teacherInfo?.academicYear || '');
    const [editGender, setEditGender] = useState<'male' | 'female'>(teacherInfo?.gender || 'male');
    const [editSemester, setEditSemester] = useState<'1' | '2'>(currentSemester || '1');

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleTab, setScheduleTab] = useState<'timing' | 'classes'>('timing');
    const [editingDayIndex, setEditingDayIndex] = useState(0); 
    const [tempPeriodTimes, setTempPeriodTimes] = useState<PeriodTime[]>([]);
    const [tempSchedule, setTempSchedule] = useState<ScheduleDay[]>([]);

    const [showAlertBar, setShowAlertBar] = useState(true);
    const [occasionGreeting, setOccasionGreeting] = useState<'ramadan' | 'eid' | 'teacher' | null>(null);
    const [cloudMessage, setCloudMessage] = useState<any>(null);

    // 🌙 المستشعر الرمضاني للداشبورد لتغيير البطاقات والنوافذ المنبثقة
    const [isRamadan, setIsRamadan] = useState(false);

    const [assessmentPlan, setAssessmentPlan] = useState<AssessmentMonth[]>(() => {
        try {
            const saved = localStorage.getItem('rased_assessment_plan');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error(e); }
        
        return [
            { id: 'm1', monthIndex: 2, monthName: 'مارس', tasks: ['العرض الشفوي (بدء)', 'التقرير (بدء)', 'السؤال القصير 1', 'الاختبار القصير 1'] },
            { id: 'm2', monthIndex: 3, monthName: 'أبريل', tasks: ['استكمال العرض الشفوي', 'استكمال التقرير', 'السؤال القصير 2'] },
            { id: 'm3', monthIndex: 4, monthName: 'مايو', tasks: ['تسليم العرض الشفوي', 'تسليم التقرير', 'الاختبار القصير 2'] }
        ];
    });

    const [showPlanSettingsModal, setShowPlanSettingsModal] = useState(false);
    const [tempPlan, setTempPlan] = useState<AssessmentMonth[]>([]);

    useEffect(() => {
        // تشغيل الرادار الهجري بأسلوب آمن
        try {
            const today = new Date();
            const hijriFormatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' });
            const parts = hijriFormatter.formatToParts(today);
            const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
            if (hMonth === 9) {
                setIsRamadan(true);
            }
        } catch(e) {
            console.error("Hijri Date parsing skipped.");
        }

        const checkAnnouncements = async () => {
            try {
                // 🔴 ضع الرابط الفعلي لملف الـ JSON الخاص بك هنا
                const CLOUD_JSON_URL = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/message.json";
                const response = await fetch(CLOUD_JSON_URL + "?t=" + new Date().getTime());
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.active && data.id) {
                        const cloudStorageKey = `rased_cloud_msg_${data.id}`;
                        const hasSeenCloud = localStorage.getItem(cloudStorageKey);
                        if (!hasSeenCloud) {
                            setCloudMessage(data);
                            return; 
                        }
                    }
                }
            } catch (error) {
                // صمت في حال عدم وجود إنترنت
            }

            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            const storageKey = `rased_greeting_${todayString}`;
            const hasSeen = localStorage.getItem(storageKey);

            if (hasSeen) return;

            if (today.getMonth() === 1 && today.getDate() === 24) {
                setOccasionGreeting('teacher');
                localStorage.setItem(storageKey, 'true');
                return;
            }

            try {
                const hijriFormatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { day: 'numeric', month: 'numeric' });
                const parts = hijriFormatter.formatToParts(today);
                const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
                const hDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');

                if (hMonth === 9 && hDay <= 3) {
                    setOccasionGreeting('ramadan');
                    localStorage.setItem(storageKey, 'true');
                    return;
                }
                if (hMonth === 10 && hDay <= 3) {
                    setOccasionGreeting('eid');
                    localStorage.setItem(storageKey, 'true');
                    return;
                }
            } catch (e) { /* صمت */ }
        };

        const timer = setTimeout(checkAnnouncements, 1500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if(showEditModal) {
            setEditName(teacherInfo.name || '');
            setEditSchool(teacherInfo.school || '');
            setEditSubject(teacherInfo.subject || '');
            setEditGovernorate(teacherInfo.governorate || '');
            setEditAvatar(teacherInfo.avatar);
            setEditStamp(teacherInfo.stamp);
            setEditMinistryLogo(teacherInfo.ministryLogo);
            setEditAcademicYear(teacherInfo.academicYear || '');
            setEditGender(teacherInfo.gender || 'male');
            setEditSemester(currentSemester);
        }
    }, [showEditModal, teacherInfo]); 

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (showScheduleModal) {
            setTempPeriodTimes(JSON.parse(JSON.stringify(periodTimes || [])));
            setTempSchedule(JSON.parse(JSON.stringify(schedule || [])));
        }
    }, [showScheduleModal, periodTimes, schedule]);

    useEffect(() => {
        if (showPlanSettingsModal) {
            setTempPlan(JSON.parse(JSON.stringify(assessmentPlan)));
        }
    }, [showPlanSettingsModal, assessmentPlan]);

    const getDisplayImage = (avatar: string | undefined, gender: string | undefined) => {
        if (avatar && avatar.length > 50) return avatar;
        return null;
    };

    const getSubjectIcon = (subjectName: string) => {
        if (!subjectName) return null;
        const name = subjectName.trim().toLowerCase();
        const cleanName = name.replace(/[^\u0600-\u06FFa-z0-9\s]/g, '');
        if (cleanName.match(/اسلام|قران|قرآن|دين|توحيد|فقه|تربية اسلامية|حديث|تفسير/)) return <span className="text-2xl">🕌</span>;
        if (cleanName.match(/عربي|لغتي|نحو|ادب|أدب|لغة عربية|بلاغة|عروض/)) return <span className="text-2xl">📜</span>;
        if (cleanName.match(/رياضيات|حساب|جبر|هندسة|رياضة|math/)) return <span className="text-2xl">📐</span>;
        if (cleanName.match(/علوم|فيزياء|كيمياء|احياء|أحياء|biology|science/)) return <span className="text-2xl">🧪</span>;
        if (cleanName.match(/انجليزي|انقليزي|english|لغة انجليزية/)) return <span className="text-2xl">🅰️</span>;
        if (cleanName.match(/حاسوب|تقنية|رقمية|برمجة|كمبيوتر|computer/)) return <span className="text-2xl">💻</span>;
        if (cleanName.match(/اجتماعيات|تاريخ|جغرافيا|جغرافية|وطنية|دراسات|social/)) return <span className="text-2xl">🌍</span>;
        if (cleanName.match(/رياضة|بدنية|تربية بدنية|sport/)) return <span className="text-2xl">⚽</span>;
        if (cleanName.match(/فن|فنون|رسم|تربية فنية|موسيقى|موسيقي/)) return <span className="text-2xl">🎨</span>;
        if (cleanName.match(/تفكير|ناقد|منطق/)) return <span className="text-2xl">🧠</span>;
        if (cleanName.match(/مهارات|حياتية|مهارة/)) return <span className="text-2xl">🤝</span>;
        return <span className="text-xl opacity-50">📚</span>;
    };

    const handleSaveInfo = () => {
        const updatedInfo = {
            name: editName.trim(),
            school: editSchool.trim(),
            subject: editSubject.trim(),
            governorate: editGovernorate.trim(),
            academicYear: editAcademicYear.trim(),
            avatar: editAvatar,
            stamp: editStamp,
            ministryLogo: editMinistryLogo,
            gender: editGender
        };
        onUpdateTeacherInfo(updatedInfo);
        onSemesterChange(editSemester);
        setShowEditModal(false);
        alert('✅ تم حفظ البيانات بنجاح');
    };

    const handleSaveScheduleSettings = () => {
        setPeriodTimes(tempPeriodTimes);
        onUpdateSchedule(tempSchedule);
        setShowScheduleModal(false);
    };

    const handleSavePlanSettings = () => {
        setAssessmentPlan(tempPlan);
        localStorage.setItem('rased_assessment_plan', JSON.stringify(tempPlan));
        setShowPlanSettingsModal(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | undefined) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                const MAX_SIZE = 400;
                let width = img.width;
                let height = img.height;
                if (width > height) { if (width > MAX_SIZE) { height = (height * MAX_SIZE) / width; width = MAX_SIZE; } } 
                else { if (height > MAX_SIZE) { width = (width * MAX_SIZE) / height; height = MAX_SIZE; } }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                const sizeInKB = (compressedBase64.length * 3) / 4 / 1024;
                if (sizeInKB > 1024) { alert('⚠️ الصورة كبيرة جداً.'); return; }
                setter(compressedBase64);
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const parseExcelTime = (value: any): string => {
        if (!value) return '';
        if (typeof value === 'number') {
            const totalSeconds = Math.round(value * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        const str = String(value).trim();
        const match = str.match(/(\d{1,2}):(\d{2})/);
        return match ? `${String(match[1]).padStart(2, '0')}:${match[2]}` : '';
    };

    const handleImportSchedule = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImportingSchedule(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            const newSchedule: ScheduleDay[] = [
                { dayName: 'الأحد', periods: Array(8).fill('') }, { dayName: 'الاثنين', periods: Array(8).fill('') },
                { dayName: 'الثلاثاء', periods: Array(8).fill('') }, { dayName: 'الأربعاء', periods: Array(8).fill('') },
                { dayName: 'الخميس', periods: Array(8).fill('') }
            ];
            jsonData.forEach(row => {
                if (row.length < 2) return;
                const firstCell = String(row[0]).trim();
                const dayIndex = newSchedule.findIndex(d => d.dayName === firstCell || firstCell.includes(d.dayName));
                if (dayIndex !== -1) {
                    for (let i = 1; i <= 8; i++) { if (row[i]) newSchedule[dayIndex].periods[i-1] = String(row[i]).trim(); }
                }
            });
            onUpdateSchedule(newSchedule);
            alert('تم استيراد الجدول بنجاح');
        } catch (error) { alert('حدث خطأ أثناء استيراد الجدول.'); } 
        finally { setIsImportingSchedule(false); if (e.target) e.target.value = ''; setShowSettingsDropdown(false); }
    };

    const handleImportPeriodTimes = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImportingPeriods(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            const newPeriodTimes = [...tempPeriodTimes];
            let updatesCount = 0;
            jsonData.forEach((row) => {
                if (row.length < 2) return;
                const firstCol = String(row[0] || '');
                const periodNumMatch = firstCol.match(/\d+/);
                if (periodNumMatch) {
                    const pIndex = parseInt(periodNumMatch[0]) - 1; 
                    if (pIndex >= 0 && pIndex < 8) {
                        const parsedStart = parseExcelTime(row[1]);
                        const parsedEnd = parseExcelTime(row[2]);
                        if (parsedStart && newPeriodTimes[pIndex]) newPeriodTimes[pIndex].startTime = parsedStart;
                        if (parsedEnd && newPeriodTimes[pIndex]) newPeriodTimes[pIndex].endTime = parsedEnd;
                        if(parsedStart || parsedEnd) updatesCount++;
                    }
                }
            });
            if (updatesCount > 0) { setTempPeriodTimes(newPeriodTimes); alert(`تم تحديث توقيت ${updatesCount} حصص`); }
        } catch (error) { alert('خطأ في الملف'); } finally { setIsImportingPeriods(false); if (e.target) e.target.value = ''; }
    };

    const checkActivePeriod = (start: string, end: string) => {
        if (!start || !end) return false;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        return currentMinutes >= (sh * 60 + sm) && currentMinutes < (eh * 60 + em);
    };

    const handleTestNotification = async () => {
        const audio = new Audio(BELL_SOUND_URL);
        audio.play().catch(() => {});
        if (Capacitor.isNativePlatform()) {
            await LocalNotifications.schedule({
                notifications: [{ id: 99999, title: '🔔 جرس', body: 'بداية الحصة', schedule: { at: new Date(Date.now() + 1000) }, sound: 'beep.wav' }]
            });
        }
    };

    const todayRaw = new Date().getDay();
    const dayIndex = (todayRaw === 5 || todayRaw === 6) ? 0 : todayRaw;
    const todaySchedule = schedule ? schedule[dayIndex] : { dayName: 'اليوم', periods: [] };
    const isToday = todayRaw === dayIndex;

    const currentMonthIndex = new Date().getMonth();
    const currentTasks = assessmentPlan.find(p => p.monthIndex === currentMonthIndex)?.tasks || [];

    const monthNames = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    return (
        <div className="space-y-6 pb-28 animate-in fade-in duration-500 relative min-h-screen">
            
            {/* 🌙 الهيدر */}
            <header className={`pt-10 pb-8 px-4 md:pt-16 md:pb-12 md:px-6 shadow-xl relative z-20 -mx-4 -mt-4 transition-all duration-500 ${isRamadan ? 'bg-white/5 backdrop-blur-3xl border-b border-white/10 text-white' : 'bg-[#446A8D] text-white'}`}>
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3 md:gap-5">
                        <div className="relative group">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-inner transition-transform hover:scale-105">
                                {getDisplayImage(teacherInfo?.avatar, teacherInfo?.gender) ? (
                                    <img src={teacherInfo.avatar} className="w-full h-full object-cover" alt="Teacher" onError={(e) => e.currentTarget.style.display='none'} />
                                ) : <DefaultAvatarSVG gender={teacherInfo?.gender || 'male'} />}
                            </div>
                            <button onClick={() => setShowEditModal(true)} className={`absolute -bottom-2 -right-2 p-1.5 md:p-2 rounded-full shadow-lg border-2 hover:scale-110 transition-transform ${isRamadan ? 'bg-indigo-900 text-white border-indigo-500' : 'bg-white text-[#446A8D] border-[#446A8D]'}`} title="تعديل البيانات">
                                <Edit3 size={12} className="md:w-3.5 md:h-3.5" strokeWidth={3} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-0.5 md:gap-1">
                            <h1 className="text-xl md:text-3xl font-black tracking-wide">{teacherInfo?.name || 'مرحباً بك'}</h1>
                            <div className="flex items-center gap-2 text-blue-100/90">
                                <p className="text-xs md:text-sm font-bold flex items-center gap-1">
                                    <School size={12} className="md:w-3.5 md:h-3.5" /> {teacherInfo?.school || 'المدرسة'}
                                </p>
                                <span className={`text-[9px] md:text-[10px] px-2 md:px-3 py-0.5 md:py-1 rounded-full font-bold border ${isRamadan ? 'bg-amber-500/20 border-amber-500/30 text-amber-200' : 'bg-white/20 border-white/10'}`}>
                                    {currentSemester === '1' ? 'الفصل الأول' : 'الفصل الثاني'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 md:gap-3">
                        <div className="relative">
                            <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className={`w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center transition-all ${showSettingsDropdown ? (isRamadan ? 'bg-amber-500/30 text-white' : 'bg-white text-[#446A8D]') : ''}`}>
                                <Settings size={20} className="md:w-6 md:h-6" />
                            </button>
                            {showSettingsDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowSettingsDropdown(false)}></div>
                                    <div className={`absolute left-0 top-full mt-3 w-60 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in zoom-in-95 origin-top-left ${isRamadan ? 'bg-[#1e1b4b]/95 backdrop-blur-xl border-indigo-500/30 text-indigo-100' : 'bg-white border-slate-100 text-slate-800'}`}>
                                        <button onClick={() => { setShowEditModal(true); setShowSettingsDropdown(false); }} className={`flex items-center gap-3 px-4 py-4 w-full text-right border-b transition-colors ${isRamadan ? 'hover:bg-white/5 border-white/5' : 'hover:bg-slate-50 border-slate-50'}`}>
                                            <div className={`p-2 rounded-lg ${isRamadan ? 'bg-white/10' : 'bg-indigo-50'}`}><User size={18} className={isRamadan ? 'text-indigo-300' : 'text-indigo-600'}/></div>
                                            <span className="text-sm font-bold">تعديل الهوية</span>
                                        </button>
                                        <button onClick={onToggleNotifications} className={`flex items-center gap-3 px-4 py-4 w-full text-right border-b transition-colors ${isRamadan ? 'hover:bg-white/5 border-white/5' : 'hover:bg-slate-50 border-slate-50'}`}>
                                            <div className={`p-2 rounded-lg ${notificationsEnabled ? (isRamadan ? 'bg-emerald-500/20' : 'bg-emerald-50') : (isRamadan ? 'bg-rose-500/20' : 'bg-rose-50')}`}>
                                                <AlarmClock size={18} className={notificationsEnabled ? (isRamadan ? 'text-emerald-400' : 'text-emerald-600') : (isRamadan ? 'text-rose-400' : 'text-rose-600')}/> 
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">التنبيهات</span>
                                                <span className={`text-[10px] font-bold ${notificationsEnabled ? (isRamadan ? 'text-emerald-400' : 'text-emerald-500') : 'text-slate-400'}`}>{notificationsEnabled ? 'مفعل' : 'معطل'}</span>
                                            </div>
                                        </button>
                                        <button onClick={handleTestNotification} className={`flex items-center gap-3 px-4 py-4 w-full text-right transition-colors ${isRamadan ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                            <div className={`p-2 rounded-lg ${isRamadan ? 'bg-amber-500/20' : 'bg-amber-50'}`}><PlayCircle size={18} className={isRamadan ? 'text-amber-400' : 'text-amber-600'}/></div>
                                            <span className="text-sm font-bold">تجربة الجرس</span>
                                        </button>
                                        <button onClick={() => scheduleFileInputRef.current?.click()} className={`flex items-center gap-3 px-4 py-4 w-full text-right border-t ${isRamadan ? 'hover:bg-white/10 border-white/5 bg-white/5' : 'hover:bg-slate-50 border-slate-50 bg-slate-50/50'}`}>
                                            <div className={`p-2 rounded-lg ${isRamadan ? 'bg-blue-500/20' : 'bg-blue-50'}`}><Download size={18} className={isRamadan ? 'text-blue-400' : 'text-blue-600'}/></div>
                                            <span className="text-sm font-bold">استيراد الجدول</span>
                                            {isImportingSchedule && <Loader2 size={16} className={`ml-auto animate-spin ${isRamadan ? 'text-blue-400' : 'text-blue-600'}`} />}
                                        </button>
                                        <input type="file" ref={scheduleFileInputRef} onChange={handleImportSchedule} accept=".xlsx,.xls" className="hidden" />
                                    </div>
                                </>
                            )}
                        </div>
                        <button onClick={onToggleNotifications} className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center backdrop-blur-md border transition-all ${notificationsEnabled ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-white/10 border-white/10 text-white/60 hover:bg-white/20'}`}>
                            {notificationsEnabled ? <Bell size={20} className="md:w-6 md:h-6 animate-pulse" /> : <BellOff size={20} className="md:w-6 md:h-6" />}
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-4 mt-6 relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-lg font-black flex items-center gap-2 ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
                        جدول اليوم <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isRamadan ? 'bg-white/10 text-indigo-200' : 'bg-slate-100 text-slate-400'}`}>{todaySchedule.dayName}</span>
                    </h2>
                    <button onClick={() => setShowScheduleModal(true)} className={`p-2.5 rounded-xl shadow-sm border active:scale-95 transition-transform ${isRamadan ? 'bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        <Clock size={20} />
                    </button>
                </div>

                <div className="space-y-3">
                    {todaySchedule.periods && todaySchedule.periods.map((subject: string, idx: number) => {
                        if (!subject) return null;
                        const time = periodTimes[idx] || { startTime: '00:00', endTime: '00:00' };
                        const isActive = isToday && checkActivePeriod(time.startTime, time.endTime);
                        const displaySubject = teacherInfo?.subject && teacherInfo.subject.trim().length > 0 ? teacherInfo.subject : subject;

                        // 🌙 تحديد ألوان البطاقات
                        const activeClass = isRamadan 
                            ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-900/50 scale-105 z-10' 
                            : 'bg-[#446A8D] text-white border-[#446A8D] shadow-xl shadow-blue-200 scale-105 z-10';
                            
                        const inactiveClass = isRamadan 
                            ? 'bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10' 
                            : 'bg-white border-slate-100 hover:shadow-md';

                        return (
                            <div key={idx} className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all ${isActive ? activeClass : inactiveClass}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : (isRamadan ? 'bg-white/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600')}`}>
                                        {getSubjectIcon(displaySubject) || getSubjectIcon(subject) || (idx + 1)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-black text-sm ${isActive ? 'text-white' : (isRamadan ? 'text-white' : 'text-slate-800')}`}>{subject}</h4>
                                            {isActive && <span className="text-[9px] bg-emerald-400 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">الآن</span>}
                                        </div>
                                        <span className={`text-[10px] font-bold ${isActive ? 'text-white/80' : (isRamadan ? 'text-indigo-200/60' : 'text-slate-400')}`}>
                                            الحصة {idx + 1} • {time.startTime} - {time.endTime}
                                        </span>
                                    </div>
                                </div>
                                {isActive ? (
                                    <button 
                                        onClick={() => {
                                            if (setSelectedClass) setSelectedClass(subject);
                                            onNavigate('attendance');
                                        }} 
                                        className={`px-3 py-2 rounded-lg font-bold text-xs shadow-lg flex items-center gap-1 active:scale-95 ${isRamadan ? 'bg-white text-amber-700' : 'bg-white text-[#446A8D]'}`}
                                    >
                                        تحضير <ChevronLeft size={14} />
                                    </button>
                                ) : (
                                    <div className={`w-1.5 h-1.5 rounded-full ${isRamadan ? 'bg-white/20' : 'bg-slate-200'}`}></div>
                                )}
                            </div>
                        );
                    })}
                    {(!todaySchedule.periods || todaySchedule.periods.every((p: string) => !p)) && (
                        <div className={`flex flex-col items-center justify-center py-10 rounded-3xl border border-dashed ${isRamadan ? 'bg-white/5 border-white/10 text-indigo-200/50' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                            <School size={40} className="mb-2" />
                            <p className="font-bold text-xs">لا توجد حصص اليوم</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 mt-6 relative z-10">
                <div className={`rounded-[1.5rem] p-5 shadow-sm border ${isRamadan ? 'bg-[#0f172a]/60 backdrop-blur-xl border-white/10' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isRamadan ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-500'}`}><CalendarDays size={18}/></div>
                            <h2 className={`text-base font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>خطة التقويم المستمر</h2>
                        </div>
                        <button onClick={() => setShowPlanSettingsModal(true)} className={`p-2 rounded-xl transition-colors ${isRamadan ? 'bg-white/5 text-indigo-200 hover:bg-white/10' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                            <Settings size={18} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {assessmentPlan.map((plan) => {
                            const isCurrent = currentMonthIndex === plan.monthIndex;
                            const isPast = currentMonthIndex > plan.monthIndex;
                            
                            // 🌙 تحديد ألوان الشهور حسب النمط
                            let monthBg = isRamadan ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100';
                            if(isCurrent) monthBg = isRamadan ? 'bg-indigo-500/20 border-indigo-400/50' : 'bg-indigo-50/50 border-indigo-200';
                            if(isPast) monthBg = isRamadan ? 'bg-white/5 border-transparent opacity-40' : 'bg-gray-50 border-gray-100 opacity-60';

                            return (
                                <div key={plan.id} className={`p-4 rounded-2xl border transition-all ${monthBg}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-xs font-black ${isCurrent ? (isRamadan ? 'text-indigo-300' : 'text-indigo-700') : (isRamadan ? 'text-indigo-100' : 'text-slate-600')}`}>شهر {plan.monthName}</span>
                                        {isCurrent && <span className={`text-[8px] font-bold px-2 py-0.5 rounded-lg animate-pulse ${isRamadan ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>الحالي</span>}
                                        {isPast && <CheckCircle2 className={`w-3.5 h-3.5 ${isRamadan ? 'text-emerald-400' : 'text-emerald-500'}`} />}
                                    </div>
                                    <ul className="space-y-1.5">
                                        {plan.tasks.map((task, idx) => (
                                            <li key={idx} className={`flex items-start gap-2 text-[10px] font-bold ${isRamadan ? 'text-indigo-200/70' : 'text-slate-500'}`}>
                                                <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${isCurrent ? (isRamadan ? 'bg-indigo-400' : 'bg-indigo-400') : (isRamadan ? 'bg-white/30' : 'bg-slate-300')}`}></div>
                                                <span className={isPast ? 'line-through' : ''}>{task}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ✅ تحديث التنبيه السفلي ليتوافق مع الزجاج الليلي */}
            {showAlertBar && currentTasks.length > 0 && (
                <div className={`fixed bottom-[80px] left-4 right-4 backdrop-blur-xl p-4 rounded-2xl shadow-2xl z-30 flex items-start gap-3 animate-in slide-in-from-bottom-10 duration-500 border ${isRamadan ? 'bg-[#0f172a]/95 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] text-white' : 'bg-indigo-900/95 border-indigo-800 text-white'}`}>
                    <div className={`p-2 rounded-xl shrink-0 animate-pulse ${isRamadan ? 'bg-amber-500/20' : 'bg-indigo-700'}`}>
                        <AlertTriangle size={20} className="text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-black text-sm mb-1 text-amber-300">تذكير بمهام شهر {assessmentPlan.find(p=>p.monthIndex === currentMonthIndex)?.monthName}</h4>
                        <p className={`text-[10px] leading-relaxed font-bold ${isRamadan ? 'text-indigo-200' : 'opacity-90'}`}>
                            عليك تنفيذ: {currentTasks.slice(0, 2).join('، ')} {currentTasks.length > 2 && '...'}
                        </p>
                    </div>
                    <button onClick={() => setShowAlertBar(false)} className={`p-1 rounded-full transition-colors ${isRamadan ? 'bg-white/5 hover:bg-white/10 text-white/50' : 'bg-white/10 hover:bg-white/20'}`}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ✅ تحديث الرسالة السحابية لرمضان */}
            {cloudMessage && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500 px-4">
                    <div className={`w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 border ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 text-white' : 'bg-white border-transparent text-slate-800'}`}>
                        <div className={`h-40 relative flex items-center justify-center ${cloudMessage.type === 'alert' ? (isRamadan ? 'bg-rose-900/50' : 'bg-rose-600') : (isRamadan ? 'bg-indigo-900/50' : 'bg-indigo-600')}`}>
                            <div className={`relative z-10 p-6 backdrop-blur-md rounded-full border shadow-lg animate-bounce ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-white/10 border-white/20'}`}>
                                {cloudMessage.type === 'alert' ? <AlertTriangle size={48} className={isRamadan ? 'text-rose-400' : 'text-white'} /> : <Bell size={48} className={isRamadan ? 'text-indigo-300' : 'text-white'} />}
                            </div>
                        </div>
                        <div className="p-8 text-center space-y-4">
                            <h2 className={`text-2xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{cloudMessage.title}</h2>
                            <p className={`text-sm font-bold leading-relaxed whitespace-pre-line ${isRamadan ? 'text-indigo-200/80' : 'text-slate-500'}`}>
                                {cloudMessage.body}
                            </p>
                            <button 
                                onClick={() => {
                                    localStorage.setItem(`rased_cloud_msg_${cloudMessage.id}`, 'true');
                                    setCloudMessage(null);
                                }} 
                                className={`w-full py-3.5 rounded-xl font-black text-white text-sm shadow-lg transition-transform active:scale-95 mt-4 ${cloudMessage.type === 'alert' ? (isRamadan ? 'bg-rose-600 hover:bg-rose-500' : 'bg-rose-600 hover:bg-rose-700') : (isRamadan ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700')}`}
                            >
                                حسناً، فهمت
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ تحديث رسالة المناسبات لرمضان */}
            {occasionGreeting && !cloudMessage && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500 px-4">
                    <div className={`w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 border ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 text-white' : 'bg-white border-transparent text-slate-800'}`}>
                        <div className={`h-40 relative flex items-center justify-center ${occasionGreeting === 'ramadan' ? (isRamadan ? 'bg-[#1e1b4b]/80' : 'bg-[#1e1b4b]') : occasionGreeting === 'eid' ? (isRamadan ? 'bg-[#701a75]/80' : 'bg-[#701a75]') : (isRamadan ? 'bg-[#1e3a8a]/80' : 'bg-[#1e3a8a]')}`}>
                            <div className={`relative z-10 p-6 backdrop-blur-md rounded-full border shadow-lg animate-bounce ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-white/10 border-white/20'}`}>
                                {occasionGreeting === 'ramadan' && <Moon size={48} className="text-amber-300 fill-amber-300" />}
                                {occasionGreeting === 'eid' && <Award size={48} className="text-pink-300" />}
                                {occasionGreeting === 'teacher' && <Heart size={48} className="text-blue-200" />}
                            </div>
                        </div>
                        <div className="p-8 text-center space-y-4">
                            <h2 className={`text-2xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
                                {occasionGreeting === 'ramadan' && 'مبارك عليكم الشهر الفضيل 🌙'}
                                {occasionGreeting === 'eid' && 'عيدكم مبارك 🎉'}
                                {occasionGreeting === 'teacher' && 'يوم معلم سعيد 👨‍🏫'}
                            </h2>
                            <p className={`text-sm font-bold leading-relaxed ${isRamadan ? 'text-indigo-200/80' : 'text-slate-500'}`}>
                                {occasionGreeting === 'ramadan' && 'نسأل الله أن يعيننا وإياكم على صيامه وقيامه، وأن يتقبل منا ومنكم صالح الأعمال.'}
                                {occasionGreeting === 'eid' && 'كل عام وأنتم بخير، أعاده الله علينا وعليكم باليمن والبركات.'}
                                {occasionGreeting === 'teacher' && 'شكراً لك يا صانع الأجيال، جهودك عظيمة وأثرك لا يُنسى. كل عام وأنت منارة للعلم.'}
                            </p>
                            <button onClick={() => setOccasionGreeting(null)} className={`w-full py-3.5 rounded-xl font-black text-white text-sm shadow-lg transition-transform active:scale-95 mt-4 ${occasionGreeting === 'ramadan' ? 'bg-amber-600 hover:bg-amber-500' : occasionGreeting === 'eid' ? 'bg-[#701a75] hover:bg-[#86198f]' : 'bg-[#1e3a8a] hover:bg-[#1e40af]'}`}>شكراً لكم ❤️</button>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={showPlanSettingsModal} onClose={() => setShowPlanSettingsModal(false)} className={`max-w-md rounded-[2rem] h-[80vh] ${isRamadan ? 'bg-transparent' : ''}`}>
                <div className={`flex flex-col h-full p-2 rounded-[2rem] border ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white border-transparent text-slate-800'}`}>
                    <div className={`flex justify-between items-center mb-4 pb-2 border-b ${isRamadan ? 'border-white/10' : 'border-slate-50'}`}>
                        <h3 className="font-black text-lg">تخصيص خطة التقويم</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    if(window.confirm('هل تريد استعادة الخطة الافتراضية؟')) {
                                        setTempPlan([
                                            { id: 'm1', monthIndex: 2, monthName: 'مارس', tasks: ['العرض الشفوي (بدء)', 'التقرير (بدء)', 'السؤال القصير 1', 'الاختبار القصير 1'] },
                                            { id: 'm2', monthIndex: 3, monthName: 'أبريل', tasks: ['استكمال العرض الشفوي', 'استكمال التقرير', 'السؤال القصير 2'] },
                                            { id: 'm3', monthIndex: 4, monthName: 'مايو', tasks: ['تسليم العرض الشفوي', 'تسليم التقرير', 'الاختبار القصير 2'] }
                                        ]);
                                    }
                                }}
                                className={`p-2 rounded-lg transition-colors ${isRamadan ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}
                                title="استعادة الافتراضي"
                            >
                                <RefreshCcw size={16} />
                            </button>
                            <button 
                                onClick={() => setTempPlan([...tempPlan, { id: `new_${Date.now()}`, monthIndex: new Date().getMonth(), monthName: 'شهر جديد', tasks: [] }])}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${isRamadan ? 'bg-indigo-500/30 text-indigo-300 hover:bg-indigo-500/50' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                            >
                                <Plus size={14}/> إضافة شهر
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 p-1">
                        {tempPlan.map((month, idx) => (
                            <div key={month.id} className={`rounded-xl p-3 border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex gap-2 mb-3">
                                    <select 
                                        value={month.monthIndex} 
                                        onChange={(e) => {
                                            const n = [...tempPlan];
                                            n[idx].monthIndex = parseInt(e.target.value);
                                            n[idx].monthName = monthNames[parseInt(e.target.value)];
                                            setTempPlan(n);
                                        }}
                                        className={`rounded-lg text-xs font-bold p-2 outline-none flex-1 border transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                    >
                                        {monthNames.map((m, i) => <option key={i} value={i} className={isRamadan ? 'bg-slate-900 text-white' : ''}>{m}</option>)}
                                    </select>
                                    <button 
                                        onClick={() => {
                                            if(window.confirm('حذف هذا الشهر؟')) {
                                                setTempPlan(tempPlan.filter((_, i) => i !== idx));
                                            }
                                        }}
                                        className={`p-2 rounded-lg transition-colors ${isRamadan ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-500'}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                
                                <div className="space-y-2">
                                    {month.tasks.map((task, tIdx) => (
                                        <div key={tIdx} className="flex gap-2">
                                            <input 
                                                value={task} 
                                                onChange={(e) => {
                                                    const n = [...tempPlan];
                                                    n[idx].tasks[tIdx] = e.target.value;
                                                    setTempPlan(n);
                                                }}
                                                className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 text-white focus:border-indigo-400' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'}`}
                                            />
                                            <button 
                                                onClick={() => {
                                                    const n = [...tempPlan];
                                                    n[idx].tasks = n[idx].tasks.filter((_, ti) => ti !== tIdx);
                                                    setTempPlan(n);
                                                }}
                                                className={`transition-colors ${isRamadan ? 'text-rose-400 hover:text-rose-300' : 'text-rose-400 hover:text-rose-600'}`}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => {
                                            const n = [...tempPlan];
                                            n[idx].tasks.push('مهمة جديدة');
                                            setTempPlan(n);
                                        }}
                                        className={`w-full py-2 border border-dashed rounded-lg text-xs font-bold transition-colors ${isRamadan ? 'bg-transparent border-white/20 text-slate-400 hover:bg-white/5 hover:text-white' : 'bg-white border-slate-300 text-slate-400 hover:bg-slate-50 hover:text-indigo-500'}`}
                                    >
                                        + إضافة مهمة
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={`pt-4 mt-auto border-t ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
                        <button onClick={handleSavePlanSettings} className={`w-full py-3 text-white rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${isRamadan ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-900 hover:bg-slate-800'}`}><Save size={16} /> حفظ التغييرات</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} className={`max-w-md rounded-[2rem] ${isRamadan ? 'bg-transparent' : ''}`}>
                <div className={`text-center p-4 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white border-transparent text-slate-800'}`}>
                    <h3 className="font-black text-lg mb-4">الهوية الرسمية</h3>
                    <div className="w-24 h-24 mx-auto mb-4 relative group">
                        {editAvatar ? (
                            <img src={editAvatar} className={`w-full h-full rounded-2xl object-cover border-4 shadow-md ${isRamadan ? 'border-white/10' : 'border-slate-50'}`} alt="Profile" onError={(e) => { e.currentTarget.style.display='none'; }}/>
                        ) : (
                            <div className={`w-full h-full rounded-2xl border-4 flex items-center justify-center ${isRamadan ? 'bg-indigo-900/50 border-white/10' : 'bg-indigo-50 border-slate-50'}`}><DefaultAvatarSVG gender={editGender}/></div>
                        )}
                        <button onClick={() => setEditAvatar(undefined)} className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white hover:bg-rose-600 transition-colors">
                            <X size={14}/>
                        </button>
                    </div>

                    <div className="space-y-3 text-right">
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="الاسم" className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-800'}`} />
                            <input value={editSchool} onChange={e => setEditSchool(e.target.value)} placeholder="المدرسة" className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-800'}`} />
                        </div>
                        <input value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="المادة (مثال: رياضيات)" className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-800'}`} />
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editGovernorate} onChange={e => setEditGovernorate(e.target.value)} placeholder="المحافظة" className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-800'}`} />
                            <input value={editAcademicYear} onChange={e => setEditAcademicYear(e.target.value)} placeholder="العام الدراسي" className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 focus:border-indigo-400 text-white' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-800'}`} />
                        </div>

                        <div className={`p-1 rounded-xl flex gap-1 ${isRamadan ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <button onClick={() => setEditSemester('1')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editSemester === '1' ? (isRamadan ? 'bg-indigo-600 text-white shadow' : 'bg-white shadow text-indigo-600') : (isRamadan ? 'text-slate-400' : 'text-slate-400')}`}>فصل 1</button>
                            <button onClick={() => setEditSemester('2')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editSemester === '2' ? (isRamadan ? 'bg-indigo-600 text-white shadow' : 'bg-white shadow text-indigo-600') : (isRamadan ? 'text-slate-400' : 'text-slate-400')}`}>فصل 2</button>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => fileInputRef.current?.click()} className={`flex-1 py-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border transition-colors ${isRamadan ? 'bg-indigo-900/30 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/50' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}><Camera size={16}/> صورتك</button>
                            <button onClick={() => stampInputRef.current?.click()} className={`flex-1 py-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border transition-colors ${isRamadan ? 'bg-blue-900/30 text-blue-300 border-blue-500/30 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}><Check size={16}/> الختم</button>
                            <button onClick={() => ministryLogoInputRef.current?.click()} className={`flex-1 py-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border transition-colors ${isRamadan ? 'bg-amber-900/30 text-amber-300 border-amber-500/30 hover:bg-amber-900/50' : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'}`}><School size={16}/> الشعار</button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, setEditAvatar)} className="hidden" accept="image/*"/>
                        <input type="file" ref={stampInputRef} onChange={(e) => handleFileUpload(e, setEditStamp)} className="hidden" accept="image/*"/>
                        <input type="file" ref={ministryLogoInputRef} onChange={(e) => handleFileUpload(e, setEditMinistryLogo)} className="hidden" accept="image/*"/>

                        <button onClick={handleSaveInfo} className={`w-full py-3 text-white rounded-xl font-bold text-xs mt-2 shadow-lg active:scale-95 transition-all ${isRamadan ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-900 hover:bg-slate-800'}`}>حفظ التغييرات</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} className={`max-w-md rounded-[2rem] h-[80vh] ${isRamadan ? 'bg-transparent' : ''}`}>
                <div className={`flex flex-col h-full p-2 rounded-[2rem] border transition-colors ${isRamadan ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white border-transparent text-slate-800'}`}>
                    <div className={`flex justify-between items-center mb-4 pb-2 border-b ${isRamadan ? 'border-white/10' : 'border-slate-50'}`}>
                        <h3 className="font-black text-lg">إدارة الجدول</h3>
                        <button onClick={() => modalScheduleFileInputRef.current?.click()} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${isRamadan ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                            <Download size={14}/> {isImportingPeriods ? '...' : 'استيراد Excel'}
                        </button>
                        <input type="file" ref={modalScheduleFileInputRef} onChange={handleImportPeriodTimes} accept=".xlsx,.xls" className="hidden" />
                    </div>

                    <div className={`flex p-1 rounded-xl mb-4 shrink-0 ${isRamadan ? 'bg-white/5' : 'bg-slate-100'}`}>
                        <button onClick={() => setScheduleTab('timing')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${scheduleTab === 'timing' ? (isRamadan ? 'bg-white/10 shadow text-white' : 'bg-white shadow text-slate-800') : (isRamadan ? 'text-slate-400' : 'text-slate-400')}`}>التوقيت</button>
                        <button onClick={() => setScheduleTab('classes')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${scheduleTab === 'classes' ? (isRamadan ? 'bg-white/10 shadow text-white' : 'bg-white shadow text-slate-800') : (isRamadan ? 'text-slate-400' : 'text-slate-400')}`}>الحصص</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                        {scheduleTab === 'timing' ? (
                            <div className="space-y-2">
                                {tempPeriodTimes.map((pt, idx) => (
                                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                                        <span className={`text-[10px] font-bold w-8 text-center ${isRamadan ? 'text-slate-400' : 'text-slate-400'}`}>{idx+1}</span>
                                        <input type="time" value={pt.startTime} onChange={(e) => {const n=[...tempPeriodTimes]; if(n[idx]) n[idx].startTime=e.target.value; setTempPeriodTimes(n)}} className={`flex-1 rounded-lg px-2 py-1 text-xs font-bold border text-center transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 text-white' : 'bg-white border-slate-200 text-slate-800'}`}/>
                                        <span className={isRamadan ? 'text-slate-500' : 'text-slate-300'}>-</span>
                                        <input type="time" value={pt.endTime} onChange={(e) => {const n=[...tempPeriodTimes]; if(n[idx]) n[idx].endTime=e.target.value; setTempPeriodTimes(n)}} className={`flex-1 rounded-lg px-2 py-1 text-xs font-bold border text-center transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 text-white' : 'bg-white border-slate-200 text-slate-800'}`}/>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {tempSchedule.map((day, idx) => (
                                        <button key={idx} onClick={() => setEditingDayIndex(idx)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${editingDayIndex === idx ? (isRamadan ? 'bg-indigo-600 text-white border-transparent' : 'bg-indigo-600 text-white border-indigo-600') : (isRamadan ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-white text-slate-500 border-slate-200')}`}>{day.dayName}</button>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    {tempSchedule[editingDayIndex]?.periods.map((cls: string, pIdx: number) => (
                                        <div key={pIdx} className={`flex items-center gap-3 p-2 rounded-xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                                            <span className={`text-[10px] font-bold w-8 text-center ${isRamadan ? 'text-slate-400' : 'text-slate-400'}`}>{pIdx + 1}</span>
                                            <input value={cls} onChange={(e) => {const n=[...tempSchedule]; if(n[editingDayIndex]?.periods) n[editingDayIndex].periods[pIdx]=e.target.value; setTempSchedule(n)}} placeholder="اسم المادة" className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors ${isRamadan ? 'bg-[#1e1b4b]/50 border-indigo-500/30 text-white focus:border-indigo-400 placeholder:text-slate-500' : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-800'}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`pt-4 mt-auto border-t ${isRamadan ? 'border-white/10' : 'border-slate-100'}`}>
                        <button onClick={handleSaveScheduleSettings} className={`w-full py-3 text-white rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${isRamadan ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-900 hover:bg-slate-800'}`}><Save size={16} /> حفظ التغييرات</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
