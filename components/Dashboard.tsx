import React, { useState, useEffect, useRef } from 'react';
import { ScheduleDay, PeriodTime } from '../types';
import { 
    Bell, Clock, Settings, Edit3,
    School, Download, Loader2, 
    PlayCircle, AlarmClock, ChevronLeft, User, Check, Camera,
    X, Calendar, BellOff, Save, CalendarDays, CheckCircle2,
    AlertTriangle, Palette, Award, Heart, Plus, Trash2, RefreshCcw,
    BookOpen, MapPin
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme/ThemeProvider'; 
import * as XLSX from 'xlsx';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import alarmSound from '../assets/alarm.mp3';
import { Drawer as DrawerSheet } from './ui/Drawer';

const DefaultAvatarSVG = ({ gender }: { gender: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full bg-bgSoft" xmlns="http://www.w3.org/2000/svg">
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

// 🆕 1. إضافة واجهات وبيانات الخطة الفصلية (18 أسبوع فقط)
interface TermWeekPlan {
    id: string;
    name: string;
    start: string;
    end: string;
    unit: string;
    lesson: string;
    defaultTopic: string;
}

const TERM_WEEKS_DATA: TermWeekPlan[] = [
    { id: "721187", name: "الأسبوع الأول", start: "2026-01-25", end: "2026-01-29", unit: "", lesson: "", defaultTopic: "تهيئة ومراجعة" },
    { id: "721217", name: "الأسبوع الثاني", start: "2026-02-01", end: "2026-02-05", unit: "", lesson: "", defaultTopic: "الدرس الأول" },
    { id: "721252", name: "الأسبوع الثالث", start: "2026-02-08", end: "2026-02-12", unit: "", lesson: "", defaultTopic: "الدرس الثاني" },
    { id: "721292", name: "الأسبوع الرابع", start: "2026-02-15", end: "2026-02-19", unit: "", lesson: "", defaultTopic: "الدرس الثالث" },
    { id: "721332", name: "الأسبوع الخامس", start: "2026-02-22", end: "2026-02-26", unit: "", lesson: "", defaultTopic: "الدرس الرابع" },
    { id: "721379", name: "الأسبوع السادس", start: "2026-03-01", end: "2026-03-05", unit: "", lesson: "", defaultTopic: "مراجعة الوحدة الأولى" },
    { id: "721428", name: "الأسبوع السابع", start: "2026-03-08", end: "2026-03-12", unit: "", lesson: "", defaultTopic: "الوحدة الثانية: الدرس الأول" },
    { id: "721480", name: "الأسبوع الثامن", start: "2026-03-15", end: "2026-03-19", unit: "", lesson: "", defaultTopic: "الوحدة الثانية: الدرس الثاني" },
    { id: "721531", name: "الأسبوع التاسع", start: "2026-03-22", end: "2026-03-26", unit: "", lesson: "", defaultTopic: "الوحدة الثانية: الدرس الثالث" },
    { id: "721584", name: "الأسبوع العاشر", start: "2026-03-29", end: "2026-04-02", unit: "", lesson: "", defaultTopic: "امتحانات منتصف الفصل" },
    { id: "721637", name: "الأسبوع 11", start: "2026-04-05", end: "2026-04-09", unit: "", lesson: "", defaultTopic: "الوحدة الثالثة: الدرس الأول" },
    { id: "721688", name: "الأسبوع 12", start: "2026-04-12", end: "2026-04-16", unit: "", lesson: "", defaultTopic: "الوحدة الثالثة: الدرس الثاني" },
    { id: "721735", name: "الأسبوع 13", start: "2026-04-19", end: "2026-04-23", unit: "", lesson: "", defaultTopic: "الوحدة الثالثة: الدرس الثالث" },
    { id: "721785", name: "الأسبوع 14", start: "2026-04-26", end: "2026-04-30", unit: "", lesson: "", defaultTopic: "مراجعة الوحدة الثالثة" },
    { id: "721837", name: "الأسبوع 15", start: "2026-05-03", end: "2026-05-07", unit: "", lesson: "", defaultTopic: "الوحدة الرابعة: الدرس الأول" },
    { id: "721883", name: "الأسبوع 16", start: "2026-05-10", end: "2026-05-14", unit: "", lesson: "", defaultTopic: "الوحدة الرابعة: الدرس الثاني" },
    { id: "721934", name: "الأسبوع 17", start: "2026-05-17", end: "2026-05-21", unit: "", lesson: "", defaultTopic: "الوحدة الرابعة: الدرس الثالث" },
    { id: "721984", name: "الأسبوع 18", start: "2026-05-24", end: "2026-05-28", unit: "", lesson: "", defaultTopic: "المراجعة النهائية" }
];

const getCurrentWeekId = () => {
    const now = new Date();
    for (let i = 0; i < TERM_WEEKS_DATA.length; i++) {
        const weekStart = new Date(TERM_WEEKS_DATA[i].start);
        const nextWeekStart = i < TERM_WEEKS_DATA.length - 1 ? new Date(TERM_WEEKS_DATA[i+1].start) : new Date(TERM_WEEKS_DATA[i].end + 'T23:59:59');
        if (now >= weekStart && now < nextWeekStart) {
            return TERM_WEEKS_DATA[i].id;
        }
    }
    return null;
};
// 🆕 انتهاء بيانات الخطة الفصلية

const Dashboard: React.FC<DashboardProps> = ({
    students, 
    teacherInfo,
    onUpdateTeacherInfo,
    schedule,
    onUpdateSchedule,
    onSelectStudent,
    onNavigate,
    onOpenSettings,
    periodTimes,
    setPeriodTimes,
    notificationsEnabled,
    onToggleNotifications,
    currentSemester,
    onSemesterChange
}) => {
    const { classes, setSelectedClass, t, dir } = useApp();
    const { theme, setTheme } = useTheme();

    if (!teacherInfo) return <div className="flex items-center justify-center h-screen text-textPrimary">{t('dashboardLoading')}</div>;
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null); 
    const ministryLogoInputRef = useRef<HTMLInputElement>(null); 
    const modalScheduleFileInputRef = useRef<HTMLInputElement>(null);
    const scheduleFileInputRef = useRef<HTMLInputElement>(null);

    // 🆕 2. مراجع وحالات الخطة الفصلية
    const termExcelInputRef = useRef<HTMLInputElement>(null);
    const [showTermPlanModal, setShowTermPlanModal] = useState(false);
    const [termPlan, setTermPlan] = useState<TermWeekPlan[]>(() => {
        try {
            const saved = localStorage.getItem('rased_term_plan');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error(e); }
        return TERM_WEEKS_DATA;
    });
    const [tempTermPlan, setTempTermPlan] = useState<TermWeekPlan[]>([]);
    const currentWeekId = getCurrentWeekId();
    const currentWeekPlan = termPlan.find(w => w.id === currentWeekId);
    // 🆕 انتهاء حالات الخطة الفصلية

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

    const weekDayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'] as const;

    const [assessmentPlan, setAssessmentPlan] = useState<AssessmentMonth[]>(() => {
        try {
            const saved = localStorage.getItem('rased_assessment_plan');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error(e); }
        
        return [
            { id: 'm1', monthIndex: 2, monthName: t('mar'), tasks: [t('oralStart'), t('reportStart'), t('shortQ1'), t('shortQuiz1')] },
            { id: 'm2', monthIndex: 3, monthName: t('apr'), tasks: [t('oralCont'), t('reportCont'), t('shortQ2')] },
            { id: 'm3', monthIndex: 4, monthName: t('may'), tasks: [t('oralSubmit'), t('reportSubmit'), t('shortQuiz2')] }
        ];
    });

    const [showPlanSettingsModal, setShowPlanSettingsModal] = useState(false);
    const [tempPlan, setTempPlan] = useState<AssessmentMonth[]>([]);

    useEffect(() => {
        const checkAnnouncements = async () => {
            try {
                const CLOUD_JSON_URL = "https://raw.githubusercontent.com/alzaabi555/desktop-build/refs/heads/main/message.json";
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
            } catch (error) {}

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
            } catch (e) {}
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
    }, [showEditModal, teacherInfo, currentSemester]); 

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (showScheduleModal) {
            setTempPeriodTimes(JSON.parse(JSON.stringify(periodTimes || [])));
            const currentSchedule = schedule && schedule.length ? schedule : [
                { dayName: t('sunday'), periods: Array(8).fill('') },
                { dayName: t('monday'), periods: Array(8).fill('') },
                { dayName: t('tuesday'), periods: Array(8).fill('') },
                { dayName: t('wednesday'), periods: Array(8).fill('') },
                { dayName: t('thursday'), periods: Array(8).fill('') },
            ];
            setTempSchedule(JSON.parse(JSON.stringify(currentSchedule)));
        }
    }, [showScheduleModal, periodTimes, schedule, t]);

    useEffect(() => {
        if (showPlanSettingsModal) {
            setTempPlan(JSON.parse(JSON.stringify(assessmentPlan)));
        }
    }, [showPlanSettingsModal, assessmentPlan]);

    // 🆕 3. تأثير الخطة الفصلية
    useEffect(() => {
        if (showTermPlanModal) {
            setTempTermPlan(JSON.parse(JSON.stringify(termPlan)));
        }
    }, [showTermPlanModal, termPlan]);

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
        alert(t('alertProfileSaved'));
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

    // 🆕 4. دوال الخطة الفصلية
    const handleSaveTermPlan = () => {
        setTermPlan(tempTermPlan);
        localStorage.setItem('rased_term_plan', JSON.stringify(tempTermPlan));
        setShowTermPlanModal(false);
        // تم دمج الترجمة هنا 💉
        alert(t('alertTermPlanSaved') || 'تم حفظ الخطة بنجاح');
    };

    const handleImportTermPlanExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            const updatedPlan = [...tempTermPlan];
            jsonData.forEach((row, index) => {
                if (index === 0 || row.length < 2) return;
                const weekNum = parseInt(row[0]);
                if (weekNum >= 1 && weekNum <= 18) {
                    updatedPlan[weekNum - 1].unit = String(row[1] || "");
                    updatedPlan[weekNum - 1].lesson = String(row[2] || "");
                }
            });
            setTempTermPlan(updatedPlan);
            // تم دمج الترجمة هنا 💉
            alert(t('alertTermPlanImported') || '✅ تم استيراد الخطة الفصلية بنجاح');
        } catch (error) {
            // تم دمج الترجمة هنا 💉
            alert(t('alertExcelFormatError') || '❌ خطأ في تنسيق ملف الإكسل');
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const updateWeekData = (idx: number, field: 'unit' | 'lesson', value: string) => {
        const newPlan = [...tempTermPlan];
        newPlan[idx][field] = value;
        setTempTermPlan(newPlan);
    };
    // 🆕 انتهاء دوال الخطة الفصلية

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
                const compressedBase64 = canvas.toDataURL('image/png');
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
                { dayName: t('sunday'), periods: Array(8).fill('') }, { dayName: t('monday'), periods: Array(8).fill('') },
                { dayName: t('tuesday'), periods: Array(8).fill('') }, { dayName: t('wednesday'), periods: Array(8).fill('') },
                { dayName: t('thursday'), periods: Array(8).fill('') }
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
            alert(t('alertScheduleImported'));
        } catch (error) { alert(t('alertScheduleImportError')); } 
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
            
            let newPeriodTimes = tempPeriodTimes.map(pt => ({ ...pt }));
            if (newPeriodTimes.length === 0) {
                newPeriodTimes = Array(8).fill(null).map(() => ({ startTime: '', endTime: '' }));
            }

            let updatesCount = 0;
            jsonData.forEach((row) => {
                if (row.length < 2) return;
                const firstCol = String(row[0] || '').trim();
                let pIndex = -1;
                const periodNumMatch = firstCol.match(/\d+/);
                
                if (periodNumMatch) {
                    pIndex = parseInt(periodNumMatch[0]) - 1;
                } else {
                    const words = ['اول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس', 'سابع', 'ثامن'];
                    const cleanStr = firstCol.replace(/أ/g, 'ا').replace(/ة/g, '').replace(/ي/g, 'ي').toLowerCase();
                    const foundWordIndex = words.findIndex(w => cleanStr.includes(w));
                    if (foundWordIndex !== -1) pIndex = foundWordIndex;
                }

                if (pIndex >= 0 && pIndex < 8) {
                    if (!newPeriodTimes[pIndex]) newPeriodTimes[pIndex] = { startTime: '', endTime: '' };
                    const parsedStart = parseExcelTime(row[1]);
                    const parsedEnd = parseExcelTime(row[2]);
                    if (parsedStart) newPeriodTimes[pIndex].startTime = parsedStart;
                    if (parsedEnd) newPeriodTimes[pIndex].endTime = parsedEnd;
                    if(parsedStart || parsedEnd) updatesCount++;
                }
            });

            if (updatesCount > 0) { 
                setTempPeriodTimes(newPeriodTimes); 
                alert(`${t('alertPeriodsImported_part1')} ${updatesCount} ${t('alertPeriodsImported_part2')}`); 
            } else {
                alert(t('alertNoValidTimes'));
            }
        } catch (error) { 
            alert(t('alertExcelReadError')); 
        } finally { 
            setIsImportingPeriods(false); 
            if (e.target) e.target.value = ''; 
        }
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
                notifications: [{ id: 99999, title: '🔔', body: t('testBell'), schedule: { at: new Date(Date.now() + 1000) }, sound: 'beep.wav' }]
            });
        }
    };

    const handleCloseCloudMessage = () => {
        if (cloudMessage && cloudMessage.id) {
            localStorage.setItem(`rased_cloud_msg_${cloudMessage.id}`, 'true');
        }
        setCloudMessage(null);
    };

    const todayRaw = new Date().getDay();
    const dayIndex = (todayRaw === 5 || todayRaw === 6) ? 0 : todayRaw;
    const todaySchedule = schedule && schedule.length > dayIndex ? schedule[dayIndex] : { dayName: t('todaySchedule'), periods: [] };
    const isToday = todayRaw === dayIndex;

    const currentMonthIndex = new Date().getMonth();
    const currentAssessmentPlan = assessmentPlan.find(p => p.monthIndex === currentMonthIndex);

    const monthNames = [t('jan'), t('feb'), t('mar'), t('apr'), t('may'), t('jun'), t('jul'), t('aug'), t('sep'), t('oct'), t('nov'), t('dec')];

    return (
        <div className="space-y-6 pb-28 animate-in fade-in duration-500 relative min-h-screen text-textPrimary" dir={dir}>
           <header 
            className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent`}
            style={{ WebkitAppRegion: 'drag' } as any}
        >
                <div className="flex justify-between items-start mb-2 pt-2">
                    {/* 👤 معلومات المعلم والمدرسة */}
                    <div className="flex items-start gap-3 md:gap-5 flex-1 min-w-0 pr-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <div className="relative group shrink-0">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-bgSoft border border-borderColor flex items-center justify-center overflow-hidden shadow-inner transition-transform hover:scale-105">
                                {getDisplayImage(teacherInfo?.avatar, teacherInfo?.gender) ? (
                                    <img src={teacherInfo.avatar} className="w-full h-full object-cover" alt="Teacher" onError={(e) => e.currentTarget.style.display='none'} />
                                ) : <DefaultAvatarSVG gender={teacherInfo?.gender || 'male'} />}
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-1 md:gap-1.5 flex-1 min-w-0">
                            <h1 className="text-xl md:text-2xl font-black tracking-wide text-textPrimary truncate" title={teacherInfo?.name || t('welcome')}>
                                {teacherInfo?.name || t('welcome')}
                            </h1>
                            
                            <div className="flex flex-wrap items-center gap-2 text-textSecondary">
                                <p className="text-xs font-bold flex items-center gap-1 truncate" title={teacherInfo?.school || t('schoolFallback')}>
                                    <School size={12} className="shrink-0" /> <span className="truncate">{teacherInfo?.school || t('schoolFallback')}</span>
                                </p>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border bg-bgSoft border-borderColor text-textSecondary shrink-0`}>
                                    {currentSemester === '1' ? t('semester1') : t('semester2')}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-0.5">
                                {teacherInfo?.subject && (
                                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md truncate">
                                        <BookOpen size={10} className="shrink-0"/> <span className="truncate">{teacherInfo.subject}</span>
                                    </span>
                                )}
                                {teacherInfo?.governorate && (
                                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md truncate">
                                        <MapPin size={10} className="shrink-0"/> <span className="truncate">{teacherInfo.governorate}</span>
                                    </span>
                                )}
                                {teacherInfo?.academicYear && (
                                    <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
                                        <Calendar size={10} /> {teacherInfo.academicYear}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* 🎛️ الأزرار العلوية */}
                    <div className="flex flex-col gap-2 shrink-0 items-end" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const themes = ['light', 'dark', 'glass'];
                                    const currentIndex = themes.indexOf(theme || 'light');
                                    const nextTheme = themes[(currentIndex + 1) % themes.length];
                                    setTheme(nextTheme as any);
                                }} 
                                className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center border transition-all bg-bgSoft border-borderColor text-primary hover:bg-primary hover:text-white shadow-sm"
                                title={t('themeSettings') || 'تغيير المظهر'}
                            >
                                <Palette size={16} />
                            </button>

                            <div className="relative z-[50]">
                                <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className={`w-9 h-9 md:w-10 md:h-10 bg-bgSoft hover:bg-bgCard border border-borderColor text-textSecondary hover:text-textPrimary rounded-xl flex items-center justify-center transition-all shadow-sm`}>
                                    <User size={16} />
                                </button>
                                {showSettingsDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowSettingsDropdown(false)}></div>
                                        <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-full mt-2 w-56 rounded-2xl shadow-xl border border-borderColor z-50 overflow-hidden animate-in zoom-in-95 origin-top-left bg-bgCard text-textPrimary`}>
                                            <button onClick={() => { setShowEditModal(true); setShowSettingsDropdown(false); }} className={`flex items-center gap-3 px-4 py-3 w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} border-b border-borderColor transition-colors hover:bg-bgSoft`}>
                                                <div className={`p-1.5 rounded-lg bg-primary/10`}><Edit3 size={16} className="text-primary"/></div>
                                                <span className="text-xs font-bold text-textPrimary">{t('editIdentity')}</span>
                                            </button>

                                            <button onClick={() => { scheduleFileInputRef.current?.click(); }} className={`flex items-center gap-3 px-4 py-3 w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} border-b border-borderColor transition-colors hover:bg-bgSoft`}>
                                                <div className={`p-1.5 rounded-lg bg-success/10`}><Download size={16} className="text-success"/></div>
                                                <span className="text-xs font-bold text-textPrimary">{isImportingSchedule ? '...' : (t('importSchedule') || 'استيراد الجدول')}</span>
                                            </button>

                                            <button onClick={handleTestNotification} className={`flex items-center gap-3 px-4 py-3 w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} transition-colors hover:bg-bgSoft`}>
                                                <div className={`p-1.5 rounded-lg bg-warning/10`}><PlayCircle size={16} className="text-warning"/></div>
                                                <span className="text-xs font-bold text-textPrimary">{t('testBell')}</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <button onClick={onToggleNotifications} className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center border transition-all shadow-sm ${notificationsEnabled ? 'bg-warning/10 border-warning/30 text-warning' : 'bg-bgSoft border-borderColor text-textSecondary hover:bg-bgCard hover:text-textPrimary'}`}>
                            {notificationsEnabled ? <Bell size={16} className="animate-pulse" /> : <BellOff size={16} />}
                        </button>
                    </div>

                    <input type="file" ref={scheduleFileInputRef} onChange={handleImportSchedule} accept=".xlsx,.xls" className="hidden" />
                </div>
            </header>

            {cloudMessage && (
                <div className="px-4 mt-4 relative z-10 animate-in fade-in slide-in-from-top-4">
                    <div className={`relative p-4 rounded-2xl border shadow-md overflow-hidden ${
                        cloudMessage.type === 'warning' ? 'bg-danger/10 border-danger/30' :
                        cloudMessage.type === 'success' ? 'bg-success/10 border-success/30' :
                        'bg-info/10 border-info/30'
                    }`}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-xl mt-0.5 ${
                                    cloudMessage.type === 'warning' ? 'bg-danger/20 text-danger' :
                                    cloudMessage.type === 'success' ? 'bg-success/20 text-success' :
                                    'bg-info/20 text-info'
                                }`}>
                                    <Bell size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className={`font-black text-sm text-textPrimary`}>{cloudMessage.title}</h3>
                                    <p className={`text-xs font-bold mt-1 leading-relaxed text-textSecondary`}>{cloudMessage.body}</p>
                                </div>
                            </div>
                            <button onClick={handleCloseCloudMessage} className={`p-1.5 rounded-lg transition-colors shrink-0 text-textSecondary hover:bg-bgSoft hover:text-textPrimary`}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-4 mt-6 relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-lg font-black flex items-center gap-2 text-textPrimary`}>
                        {t('todaySchedule')} <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-bgSoft text-textSecondary`}>{t(weekDayKeys[dayIndex]) || todaySchedule.dayName}</span>
                    </h2>
                    <button onClick={() => setShowScheduleModal(true)} className={`p-2.5 rounded-xl shadow-sm border active:scale-95 transition-transform bg-bgSoft border-borderColor text-textSecondary hover:bg-bgCard hover:text-textPrimary`}>
                        <Clock size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {todaySchedule.periods && todaySchedule.periods.map((subject: string, idx: number) => {
                        if (!subject) return null;
                        const time = periodTimes[idx] || { startTime: '00:00', endTime: '00:00' };
                        const isActive = isToday && checkActivePeriod(time.startTime, time.endTime);
                        const displaySubject = teacherInfo?.subject && teacherInfo.subject.trim().length > 0 ? teacherInfo.subject : subject;

                        const activeClass = 'bg-primary border-primary shadow-lg scale-[1.02] z-10';
                        const inactiveClass = 'glass-card border-borderColor hover:shadow-md';

                        return (
                            <div key={idx} className={`relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-300 gap-3 ${isActive ? activeClass : inactiveClass}`}>
                                <div className="flex items-start gap-2">
                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-sm md:text-lg shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-bgSoft text-textSecondary'}`}>
                                        {getSubjectIcon(displaySubject) || getSubjectIcon(subject) || (idx + 1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col items-start gap-0.5">
                                            <h4 className={`font-black text-xs md:text-sm truncate w-full ${isActive ? 'text-white' : 'text-textPrimary'}`}>{subject}</h4>
                                            {isActive && <span className="text-[8px] md:text-[9px] bg-success text-white px-1.5 py-0.5 rounded-md font-bold animate-pulse shadow-sm shrink-0 leading-none">{t('now')}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex flex-col">
                                        <span className={`text-[8px] font-bold ${isActive ? 'text-white/70' : 'text-textSecondary/70'}`}>{t('period')} {idx + 1}</span>
                                        <span className={`text-[10px] font-bold font-mono ${isActive ? 'text-white/90' : 'text-textSecondary'}`}>
                                            {time.startTime}-{time.endTime}
                                        </span>
                                    </div>
                                    
                                    {isActive ? (
                                        <button 
                                            onClick={() => {
                                                if (setSelectedClass) setSelectedClass(subject);
                                                onNavigate('attendance');
                                            }} 
                                            className={`p-1.5 md:px-2 md:py-1.5 rounded-lg font-bold text-[10px] shadow-md flex items-center gap-1 active:scale-95 bg-white text-primary`}
                                            title={t('takeAttendance')}
                                        >
                                            <span className="hidden md:inline">{t('takeAttendance')}</span>
                                            <CheckCircle2 size={14} className="md:w-3 md:h-3" />
                                        </button>
                                    ) : (
                                        <div className={`w-1.5 h-1.5 rounded-full bg-borderColor mb-1`}></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 🆕 5. واجهة عرض الخطة الفصلية (تظهر قبل التقييم المستمر) - تم دمج الترجمة والتاريخ 💉 */}
            <div className="px-4 mt-6 relative z-10">
                <div className={`rounded-[1.5rem] p-5 shadow-sm border glass-panel border-borderColor`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-info/10 text-info`}><BookOpen size={18}/></div>
                            <h2 className={`text-base font-black text-textPrimary`}>{t('termPlanTitle') || 'الخطة الفصلية'}</h2>
                        </div>
                        <button onClick={() => setShowTermPlanModal(true)} className={`p-2 rounded-xl transition-colors bg-bgSoft text-textSecondary hover:bg-bgCard hover:text-textPrimary`}>
                            <Settings size={18} />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                        {currentWeekPlan ? (
                            <div className={`p-4 rounded-2xl border transition-all bg-info/10 border-info/30`}>
                                <div className="flex justify-between items-center mb-2">
                                    {/* 💉 التعديل هنا: إضافة التاريخ بجانب رقم الأسبوع */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-xs font-black text-info`}>{currentWeekPlan.name}</span>
                                        <span className={`text-[9px] font-bold text-info/70 bg-info/5 px-1.5 py-0.5 rounded-md`}>
                                            ({currentWeekPlan.start} - {currentWeekPlan.end})
                                        </span>
                                    </div>
                                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-lg animate-pulse bg-info text-white shadow-sm shrink-0`}>
                                        {t('currentWeekBadge') || 'الأسبوع الحالي'}
                                    </span>
                                </div>
                                <div className="space-y-1.5 mt-2">
                                    <div className="flex items-start gap-2 text-[11px] font-bold text-textPrimary">
                                        <div className="w-1 h-1 rounded-full mt-1.5 shrink-0 bg-info"></div>
                                        <span><span className="text-info/80">{t('unitLabel') || 'الوحدة:'}</span> {currentWeekPlan.unit || t('notSpecified') || 'لم تحدد'}</span>
                                    </div>
                                    <div className="flex items-start gap-2 text-[11px] font-bold text-textPrimary">
                                        <div className="w-1 h-1 rounded-full mt-1.5 shrink-0 bg-info"></div>
                                        <span><span className="text-info/80">{t('lessonLabel') || 'الدرس:'}</span> {currentWeekPlan.lesson || currentWeekPlan.defaultTopic}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl border border-dashed border-borderColor text-center text-textSecondary text-xs font-bold bg-bgSoft">
                                {t('noPlanForCurrentWeek') || 'لا توجد خطة للأسبوع الحالي'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* خطة التقويم المستمر الأصلية */}
            <div className="px-4 mt-6 relative z-10">
                <div className={`rounded-[1.5rem] p-5 shadow-sm border glass-panel border-borderColor`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-warning/10 text-warning`}><CalendarDays size={18}/></div>
                            <h2 className={`text-base font-black text-textPrimary`}>{t('continuousAssessmentPlan')}</h2>
                        </div>
                        <button onClick={() => setShowPlanSettingsModal(true)} className={`p-2 rounded-xl transition-colors bg-bgSoft text-textSecondary hover:bg-bgCard hover:text-textPrimary`}>
                            <Settings size={18} />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                        {currentAssessmentPlan ? (
                            <div key={currentAssessmentPlan.id} className={`p-4 rounded-2xl border transition-all bg-primary/10 border-primary/30`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-xs font-black text-primary`}>{t('monthPrefix')} {currentAssessmentPlan.monthName}</span>
                                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-lg animate-pulse bg-primary text-white shadow-sm`}>{t('currentMonthLabel')}</span>
                                </div>
                                <ul className="space-y-1.5">
                                    {currentAssessmentPlan.tasks.map((task, idx) => (
                                        <li key={idx} className={`flex items-start gap-2 text-[10px] font-bold text-textPrimary`}>
                                            <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 bg-primary`}></div>
                                            <span>{task}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl border border-dashed border-borderColor text-center text-textSecondary text-xs font-bold bg-bgSoft">
                                لا توجد خطة تقويم لهذا الشهر
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* 🆕 6. نافذة إعدادات الخطة الفصلية (DrawerSheet) - تم دمج الترجمة 💉 */}
            <DrawerSheet isOpen={showTermPlanModal} onClose={() => setShowTermPlanModal(false)} dir={dir}>
                <div className="flex flex-col h-full w-full">
                    <div className={`flex justify-between items-center mb-4 pb-2 border-b border-borderColor`}>
                        <h3 className="font-black text-lg text-textPrimary">{t('customizeTermPlan') || 'تخصيص الخطة الفصلية'}</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => termExcelInputRef.current?.click()}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-success/10 text-success hover:bg-success/20`}
                            >
                                <Download size={14} /> {t('importExcelTermPlan') || 'استيراد إكسل'}
                            </button>
                            <input type="file" ref={termExcelInputRef} onChange={handleImportTermPlanExcel} className="hidden" accept=".xlsx,.xls" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-3">
                        {tempTermPlan.map((week, idx) => {
                            const isCurrent = week.id === currentWeekId;
                            return (
                                <div key={week.id} className={`p-4 rounded-xl border transition-all ${isCurrent ? 'bg-info/10 border-info shadow-sm' : 'bg-bgCard border-borderColor'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-[11px] font-black ${isCurrent ? 'text-info' : 'text-textPrimary'}`}>{week.name}</span>
                                        <span className={`text-[9px] font-bold ${isCurrent ? 'text-info/80' : 'text-textSecondary'}`}>{week.start} - {week.end}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <input 
                                            value={week.unit}
                                            onChange={(e) => updateWeekData(idx, 'unit', e.target.value)}
                                            placeholder={t('unitNamePlaceholder') || 'اسم الوحدة (مثال: الوحدة الأولى)'}
                                            className={`w-full p-2 rounded-lg text-xs font-bold outline-none border transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-info`}
                                        />
                                        <input 
                                            value={week.lesson}
                                            onChange={(e) => updateWeekData(idx, 'lesson', e.target.value)}
                                            placeholder={`${t('lessonNamePlaceholderPrefix') || 'اسم الدرس (الافتراضي: '} ${week.defaultTopic})`}
                                            className={`w-full p-2 rounded-lg text-xs font-bold outline-none border transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-info`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={`pt-4 mt-auto border-t border-borderColor`}>
                        <button onClick={handleSaveTermPlan} className={`w-full py-3 text-white rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all bg-primary hover:bg-primary/80`}>
                            <Save size={16} /> {t('saveChanges')}
                        </button>
                    </div>
                </div>
            </DrawerSheet>

            {/* المودالز الأصلية لم تُمس إطلاقاً 👇 */}
            <DrawerSheet isOpen={showPlanSettingsModal} onClose={() => setShowPlanSettingsModal(false)} dir={dir}>
                <div className="flex flex-col h-full w-full">
                    <div className={`flex justify-between items-center mb-4 pb-2 border-b border-borderColor`}>
                        <h3 className="font-black text-lg text-textPrimary">{t('customizeAssessmentPlan')}</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    if(window.confirm(t('confirmRestoreDefaultPlan'))) {
                                        setTempPlan([
                                            { id: 'm1', monthIndex: 2, monthName: t('mar'), tasks: [t('oralStart'), t('reportStart'), t('shortQ1'), t('shortQuiz1')] },
                                            { id: 'm2', monthIndex: 3, monthName: t('apr'), tasks: [t('oralCont'), t('reportCont'), t('shortQ2')] },
                                            { id: 'm3', monthIndex: 4, monthName: t('may'), tasks: [t('oralSubmit'), t('reportSubmit'), t('shortQuiz2')] }
                                        ]);
                                    }
                                }}
                                className={`p-2 rounded-lg transition-colors bg-bgSoft text-textSecondary hover:bg-bgCard hover:text-textPrimary`}
                                title={t('restoreDefault')}
                            >
                                <RefreshCcw size={16} />
                            </button>
                            <button 
                                onClick={() => setTempPlan([...tempPlan, { id: `new_${Date.now()}`, monthIndex: new Date().getMonth(), monthName: t('newMonth'), tasks: [] }])}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-primary/10 text-primary hover:bg-primary/20`}
                            >
                                <Plus size={14}/> {t('addMonth')}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 p-1">
                        {tempPlan.map((month, idx) => (
                            <div key={month.id} className={`rounded-xl p-3 border bg-bgCard border-borderColor`}>
                                <div className="flex gap-2 mb-3">
                                    <select 
                                        value={month.monthIndex} 
                                        onChange={(e) => {
                                            const n = [...tempPlan];
                                            n[idx].monthIndex = parseInt(e.target.value);
                                            n[idx].monthName = monthNames[parseInt(e.target.value)];
                                            setTempPlan(n);
                                        }}
                                        className={`rounded-lg text-xs font-bold p-2 outline-none flex-1 border transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-primary`}
                                    >
                                        {monthNames.map((m, i) => <option key={i} value={i} className="bg-bgCard text-textPrimary">{m}</option>)}
                                    </select>
                                    <button 
                                        onClick={() => {
                                            if(window.confirm(t('confirmDeleteMonth'))) {
                                                setTempPlan(tempPlan.filter((_, i) => i !== idx));
                                            }
                                        }}
                                        className={`p-2 rounded-lg transition-colors bg-danger/10 text-danger hover:bg-danger/20`}
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
                                                className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-primary`}
                                            />
                                            <button 
                                                onClick={() => {
                                                    const n = [...tempPlan];
                                                    n[idx].tasks = n[idx].tasks.filter((_, ti) => ti !== tIdx);
                                                    setTempPlan(n);
                                                }}
                                                className={`transition-colors text-danger hover:text-danger/80`}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => {
                                            const n = [...tempPlan];
                                            n[idx].tasks.push(t('newTask'));
                                            setTempPlan(n);
                                        }}
                                        className={`w-full py-2 border border-dashed rounded-lg text-xs font-bold transition-colors bg-transparent border-borderColor text-textSecondary hover:bg-bgSoft hover:text-textPrimary`}
                                    >
                                        {t('addTask')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={`pt-4 mt-auto border-t border-borderColor`}>
                        <button onClick={handleSavePlanSettings} className={`w-full py-3 text-white rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all bg-primary hover:bg-primary/80`}><Save size={16} /> {t('saveChanges')}</button>
                    </div>
                </div>
            </DrawerSheet>

            <DrawerSheet isOpen={showEditModal} onClose={() => setShowEditModal(false)} dir={dir}>
                <div className="flex flex-col h-full w-full text-center">
                    <h3 className="font-black text-lg mb-4 text-textPrimary">{t('officialIdentity')}</h3>
                    <div className="w-24 h-24 mx-auto mb-4 relative group shrink-0">
                        {editAvatar ? (
                            <img src={editAvatar} className={`w-full h-full rounded-2xl object-cover border-4 shadow-md border-bgCard`} alt="Profile" onError={(e) => { e.currentTarget.style.display='none'; }}/>
                        ) : (
                            <div className={`w-full h-full rounded-2xl border-4 flex items-center justify-center bg-bgSoft border-bgCard`}><DefaultAvatarSVG gender={editGender}/></div>
                        )}
                        <button onClick={() => setEditAvatar(undefined)} className={`absolute -bottom-2 ${dir === 'rtl' ? '-right-2' : '-left-2'} bg-danger text-white p-1.5 rounded-full shadow-lg border-2 border-bgCard hover:bg-danger/80 transition-colors`}>
                            <X size={14}/>
                        </button>
                    </div>

                    <div className={`space-y-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder={t('namePlaceholder')} className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} />
                            <input value={editSchool} onChange={e => setEditSchool(e.target.value)} placeholder={t('schoolPlaceholder')} className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} />
                        </div>
                        <input value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder={t('subjectExample')} className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} />
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editGovernorate} onChange={e => setEditGovernorate(e.target.value)} placeholder={t('governoratePlaceholder')} className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} />
                            <input value={editAcademicYear} onChange={e => setEditAcademicYear(e.target.value)} placeholder={t('academicYearPlaceholder')} className={`p-3 border rounded-xl text-xs font-bold w-full outline-none transition-colors bg-bgCard border-borderColor focus:border-primary text-textPrimary`} />
                        </div>

                        <div className={`p-1 rounded-xl flex gap-1 bg-bgSoft`}>
                            <button onClick={() => setEditSemester('1')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editSemester === '1' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:text-textPrimary'}`}>{t('sem1')}</button>
                            <button onClick={() => setEditSemester('2')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editSemester === '2' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:text-textPrimary'}`}>{t('sem2')}</button>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => fileInputRef.current?.click()} className={`flex-1 py-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border transition-colors bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard hover:text-textPrimary`}><Camera size={16}/> {t('yourPhoto')}</button>
                            <button onClick={() => stampInputRef.current?.click()} className={`flex-1 py-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border transition-colors bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard hover:text-textPrimary`}><Check size={16}/> {t('stamp')}</button>
                            <button onClick={() => ministryLogoInputRef.current?.click()} className={`flex-1 py-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border transition-colors bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard hover:text-textPrimary`}><School size={16}/> {t('logo')}</button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, setEditAvatar)} className="hidden" accept="image/*"/>
                        <input type="file" ref={stampInputRef} onChange={(e) => handleFileUpload(e, setEditStamp)} className="hidden" accept="image/*"/>
                        <input type="file" ref={ministryLogoInputRef} onChange={(e) => handleFileUpload(e, setEditMinistryLogo)} className="hidden" accept="image/*"/>
                    </div>

                    <div className="pt-4 mt-auto">
                        <button onClick={handleSaveInfo} className={`w-full py-3 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all bg-primary hover:bg-primary/80`}>{t('saveChanges')}</button>
                    </div>
                </div>
            </DrawerSheet>

            <DrawerSheet isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} dir={dir}>
                <div className="flex flex-col h-full w-full">
                    
                    <div className={`flex justify-between items-center mb-4 pb-2 border-b shrink-0 border-borderColor`}>
                        <h3 className="font-black text-lg text-textPrimary">{t('manageSchedule')}</h3>
                        <button 
                            onClick={() => modalScheduleFileInputRef.current?.click()} 
                            style={{ WebkitAppRegion: 'no-drag' } as any}
                            className={`cursor-pointer relative z-50 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-success/10 text-success hover:bg-success/20`}
                        >
                            <Download size={14}/> {isImportingPeriods ? '...' : t('importExcel')}
                        </button>
                        <input type="file" ref={modalScheduleFileInputRef} onChange={handleImportPeriodTimes} accept=".xlsx,.xls" className="hidden" />
                    </div>

                    <div className={`flex p-1 rounded-xl mb-4 shrink-0 bg-bgSoft`}>
                        <button onClick={() => setScheduleTab('timing')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${scheduleTab === 'timing' ? 'bg-bgCard shadow text-textPrimary' : 'text-textSecondary hover:text-textPrimary'}`}>{t('timing')}</button>
                        <button onClick={() => setScheduleTab('classes')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${scheduleTab === 'classes' ? 'bg-bgCard shadow text-textPrimary' : 'text-textSecondary hover:text-textPrimary'}`}>{t('classesTab')}</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                      {scheduleTab === 'timing' ? (
                            <div className="space-y-2">
                                {tempPeriodTimes.map((pt, idx) => (
                                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border bg-bgCard border-borderColor`}>
                                        <span className={`text-[10px] font-bold w-8 text-center text-textSecondary`}>{idx+1}</span>
                                        <input type="time" value={pt.startTime} onChange={(e) => {const n=[...tempPeriodTimes]; if(n[idx]) n[idx].startTime=e.target.value; setTempPeriodTimes(n)}} className={`flex-1 rounded-lg px-2 py-1 text-xs font-bold border text-center transition-colors bg-bgSoft border-borderColor text-textPrimary`}/>
                                        <span className={'text-textSecondary'}>-</span>
                                        <input type="time" value={pt.endTime} onChange={(e) => {const n=[...tempPeriodTimes]; if(n[idx]) n[idx].endTime=e.target.value; setTempPeriodTimes(n)}} className={`flex-1 rounded-lg px-2 py-1 text-xs font-bold border text-center transition-colors bg-bgSoft border-borderColor text-textPrimary`}/>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {tempSchedule.map((day, idx) => (
                                        <button key={idx} onClick={() => setEditingDayIndex(idx)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${editingDayIndex === idx ? 'bg-primary text-white border-primary shadow-sm' : 'bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard hover:text-textPrimary'}`}>
                                            {t(weekDayKeys[idx]) || day.dayName}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    {tempSchedule[editingDayIndex]?.periods.map((cls: string, pIdx: number) => (
                                        <div key={pIdx} className={`flex items-center gap-3 p-2 rounded-xl border bg-bgCard border-borderColor`}>
                                            <span className={`text-[10px] font-bold w-8 text-center text-textSecondary`}>{pIdx + 1}</span>
                                            <input value={cls} onChange={(e) => {const n=[...tempSchedule]; if(n[editingDayIndex]?.periods) n[editingDayIndex].periods[pIdx]=e.target.value; setTempSchedule(n)}} placeholder={t('subjectNamePlaceholder')} className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold outline-none transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-primary placeholder:text-textSecondary`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`pt-4 mt-auto border-t shrink-0 border-borderColor`}>
                        <button onClick={handleSaveScheduleSettings} className={`w-full py-3 text-white rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all bg-primary hover:bg-primary/80`}><Save size={16} /> {t('saveChanges')}</button>
                    </div>
                </div>
            </DrawerSheet>
        </div>
    );
};

export default Dashboard;
