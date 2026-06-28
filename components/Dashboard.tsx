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
import PageLayout from '../components/PageLayout'; // 💉 استدعاء الغلاف الشامل

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

// ================= الخطة الفصلية المرنة =================// ================= الخطة الفصلية المر
interface TermWeekPlan {
    id: string;
    name: string;
    start: string;
    end: string;
    unit: string;
    lesson: string;
    defaultTopic: string;
}

const getArabicWeekName = (index: number) => {
    const names = [
        'الأسبوع الأول',
        'الأسبوع الثاني',
        'الأسبوع الثالث',
        'الأسبوع الرابع',
        'الأسبوع الخامس',
        'الأسبوع السادس',
        'الأسبوع السابع',
        'الأسبوع الثامن',
        'الأسبوع التاسع',
        'الأسبوع العاشر',
        'الأسبوع 11',
        'الأسبوع 12',
        'الأسبوع 13',
        'الأسبوع 14',
        'الأسبوع 15',
        'الأسبوع 16',
        'الأسبوع 17',
        'الأسبوع 18'
    ];

    return names[index] || `الأسبوع ${index + 1}`;
};

const createEmptyTermWeeks = (count: number = 18): TermWeekPlan[] => {
    return Array.from({ length: count }).map((_, index) => ({
        id: `week_${Date.now()}_${index}`,
        name: getArabicWeekName(index),
        start: '',
        end: '',
        unit: '',
        lesson: '',
        defaultTopic: ''
    }));
};

const getCurrentWeekId = (weeks: TermWeekPlan[]) => {
    const now = new Date();

    for (const week of weeks) {
        if (!week.start || !week.end) continue;

        const weekStart = new Date(`${week.start}T00:00:00`);
        const weekEnd = new Date(`${week.end}T23:59:59`);

        if (now >= weekStart && now <= weekEnd) {
            return week.id;
        }
    }

    return null;
};

const parseExcelDateToISO = (value: any): string => {
    if (!value) return '';

    if (typeof value === 'number') {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(excelEpoch.getTime() + value * 86400000);
        return date.toISOString().split('T')[0];
    }

    const str = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }

    const dateMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];
        return `${year}-${month}-${day}`;
    }

    return '';
};

const safeText = (value: any) => {
    return String(value || '').trim();
};

// ================= انتهاء تعريف الخطة الفصلية المرنة =================


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
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null); 
    const ministryLogoInputRef = useRef<HTMLInputElement>(null); 
    const modalScheduleFileInputRef = useRef<HTMLInputElement>(null);
    const scheduleFileInputRef = useRef<HTMLInputElement>(null);

    // ================= حالات الخطة الفصلية المرنة =================

const termExcelInputRef = useRef<HTMLInputElement>(null);
const [showTermPlanModal, setShowTermPlanModal] = useState(false);

const [termPlan, setTermPlan] = useState<TermWeekPlan[]>(() => {
    try {
        const saved = localStorage.getItem('rased_term_plan');

        if (saved) {
            const parsed = JSON.parse(saved);

            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.error(e);
    }

    return createEmptyTermWeeks(18);
});

const [tempTermPlan, setTempTermPlan] = useState<TermWeekPlan[]>([]);

const currentWeekId = getCurrentWeekId(termPlan);
const currentWeekPlan = termPlan.find(w => w.id === currentWeekId);

const isTermPlanReady = Boolean(
    currentWeekPlan &&
    currentWeekPlan.unit?.trim() &&
    currentWeekPlan.lesson?.trim()
);

// ================= انتهاء حالات الخطة الفصلية المرنة =================

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

    // ================= تأثير الخطة الفصلية المرنة =================

useEffect(() => {
    if (showTermPlanModal) {
        setTempTermPlan(JSON.parse(JSON.stringify(termPlan)));
    }
}, [showTermPlanModal, termPlan]);

// ================= انتهاء تأثير الخطة الفصلية المرنة =================

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

    // ================= دوال الخطة الفصلية المرنة =================

const updateWeekData = (
    idx: number,
    field: keyof TermWeekPlan,
    value: string
) => {
    setTempTermPlan(prev => {
        const updated = [...prev];

        if (!updated[idx]) return prev;

        updated[idx] = {
            ...updated[idx],
            [field]: value
        };

        return updated;
    });
};
const validateTermPlan = (plan: TermWeekPlan[]) => {
    for (const week of plan) {
        if ((week.start && !week.end) || (!week.start && week.end)) {
            alert(`يرجى إكمال تاريخ البداية والنهاية في ${week.name}`);
            return false;
        }

        if (week.start && week.end) {
            const start = new Date(`${week.start}T00:00:00`);
            const end = new Date(`${week.end}T23:59:59`);

            if (end < start) {
                alert(`تاريخ النهاية يجب أن يكون بعد تاريخ البداية في ${week.name}`);
                return false;
            }
        }
    }

    return true;
};

const handleSaveTermPlan = () => {
    if (!validateTermPlan(tempTermPlan)) return;

    setTermPlan(tempTermPlan);
    localStorage.setItem('rased_term_plan', JSON.stringify(tempTermPlan));
    setShowTermPlanModal(false);

    alert(t('alertTermPlanSaved') || 'تم حفظ الخطة الفصلية بنجاح');
};

const handleAddTermWeek = () => {
    setTempTermPlan(prev => [
        ...prev,
        {
            id: `week_${Date.now()}`,
            name: getArabicWeekName(prev.length),
            start: '',
            end: '',
            unit: '',
            lesson: '',
            defaultTopic: ''
        }
    ]);
};

const handleDeleteTermWeek = (idx: number) => {
    const weekName = tempTermPlan[idx]?.name || 'هذا الأسبوع';

    if (!window.confirm(`هل تريد حذف ${weekName}؟`)) return;

    setTempTermPlan(prev => prev.filter((_, index) => index !== idx));
};

const handleResetTermPlan = () => {
    if (!window.confirm('سيتم مسح الخطة الحالية وإنشاء خطة فارغة من 18 أسبوعًا. هل تريد المتابعة؟')) {
        return;
    }

    setTempTermPlan(createEmptyTermWeeks(18));
};

const handleImportTermPlanExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const importedPlan: TermWeekPlan[] = [];

        jsonData.forEach((row, index) => {
            if (index === 0) return;
            if (!row || row.length === 0) return;

            const weekNumber = parseInt(String(row[0] || '').replace(/[^\d]/g, ''));
            const weekNameFromExcel = safeText(row[1]);
            const start = parseExcelDateToISO(row[2]);
            const end = parseExcelDateToISO(row[3]);
            const unit = safeText(row[4]);
            const lesson = safeText(row[5]);
            const defaultTopic = safeText(row[6]);

            if (!weekNumber && !weekNameFromExcel && !start && !end && !unit && !lesson && !defaultTopic) {
                return;
            }

            importedPlan.push({
                id: `imported_week_${Date.now()}_${index}`,
                name: weekNameFromExcel || (weekNumber ? getArabicWeekName(weekNumber - 1) : `الأسبوع ${index}`),
                start,
                end,
                unit,
                lesson,
                defaultTopic
            });
        });

        if (importedPlan.length === 0) {
            alert('لم يتم العثور على بيانات صالحة في ملف Excel');
            return;
        }

        if (!validateTermPlan(importedPlan)) return;

        setTempTermPlan(importedPlan);
        alert(t('alertTermPlanImported') || 'تم استيراد الخطة الفصلية بنجاح');
    } catch (error) {
        console.error(error);
        alert(t('alertExcelFormatError') || 'خطأ في تنسيق ملف Excel');
    } finally {
        if (e.target) e.target.value = '';
    }
};

// ================= انتهاء دوال الخطة الفصلية المرنة =================
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
    if (!teacherInfo) {
    return (
        <div className="flex items-center justify-center h-screen text-textPrimary">
            {t('dashboardLoading')}
        </div>
    );
}
// ================= Dashboard Smart Helpers =================

const minutesFromTime = (value?: string): number | null => {
    if (!value || !value.includes(':')) return null;
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
};

type PeriodStatus = 'active' | 'upcoming' | 'completed' | 'unknown';

const getPeriodStatus = (start?: string, end?: string): PeriodStatus => {
    if (!start || !end) return 'unknown';

    // إذا كنا نعرض جدول الأحد في عطلة نهاية الأسبوع، لا نحسبها مكتملة أو نشطة
    if (!isToday) return 'upcoming';

    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMinutes = minutesFromTime(start);
    const endMinutes = minutesFromTime(end);

    if (startMinutes === null || endMinutes === null) return 'unknown';

    if (nowMinutes >= startMinutes && nowMinutes < endMinutes) return 'active';
    if (nowMinutes < startMinutes) return 'upcoming';
    return 'completed';
};

const todayPeriods = todaySchedule.periods?.filter(Boolean) || [];
const todayPeriodsCount = todayPeriods.length;

const completedPeriodsCount = todaySchedule.periods?.filter((subject: string, idx: number) => {
    if (!subject) return false;
    const time = periodTimes[idx];
    return getPeriodStatus(time?.startTime, time?.endTime) === 'completed';
}).length || 0;

const dayProgress = todayPeriodsCount > 0
    ? Math.round((completedPeriodsCount / todayPeriodsCount) * 100)
    : 0;

const getSmartNextPeriod = () => {
    if (!todaySchedule.periods || todaySchedule.periods.length === 0) return null;

    // الأولوية للحصة الجارية
    for (let i = 0; i < todaySchedule.periods.length; i++) {
        const subject = todaySchedule.periods[i];
        if (!subject) continue;

        const time = periodTimes[i] || { startTime: '', endTime: '' };
        const status = getPeriodStatus(time.startTime, time.endTime);

        if (status === 'active') {
            return {
                index: i,
                subject,
                startTime: time.startTime,
                endTime: time.endTime,
                status
            };
        }
    }

    // ثم الحصة القادمة
    for (let i = 0; i < todaySchedule.periods.length; i++) {
        const subject = todaySchedule.periods[i];
        if (!subject) continue;

        const time = periodTimes[i] || { startTime: '', endTime: '' };
        const status = getPeriodStatus(time.startTime, time.endTime);

        if (status === 'upcoming') {
            return {
                index: i,
                subject,
                startTime: time.startTime,
                endTime: time.endTime,
                status
            };
        }
    }

    return null;
};

const smartNextPeriod = getSmartNextPeriod();

const isAssessmentReady = Boolean(
    currentAssessmentPlan &&
    currentAssessmentPlan.tasks &&
    currentAssessmentPlan.tasks.length > 0
);

const handleStartAttendance = (className?: string) => {
    if (className && setSelectedClass) setSelectedClass(className);
    onNavigate('attendance');
};

const statusMeta = {
    active: {
        label: t('now') || 'جارية الآن',
        className: 'bg-success text-white',
        cardClass: 'bg-primary border-primary shadow-lg scale-[1.01]',
        textClass: 'text-white',
        subTextClass: 'text-white/80'
    },
    upcoming: {
        label: 'قادمة',
        className: 'bg-info/10 text-info border border-info/20',
        cardClass: 'glass-card border-borderColor hover:shadow-md',
        textClass: 'text-textPrimary',
        subTextClass: 'text-textSecondary'
    },
    completed: {
        label: 'مكتملة',
        className: 'bg-success/10 text-success border border-success/20',
        cardClass: 'glass-card border-borderColor opacity-80',
        textClass: 'text-textPrimary',
        subTextClass: 'text-textSecondary'
    },
    unknown: {
        label: 'غير محددة',
        className: 'bg-bgSoft text-textSecondary border border-borderColor',
        cardClass: 'glass-card border-borderColor',
        textClass: 'text-textPrimary',
        subTextClass: 'text-textSecondary'
    }
};

const EmptyActionCard = ({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    color = 'primary'
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    color?: 'primary' | 'info' | 'warning' | 'success';
}) => (
    <div className="p-4 md:p-5 rounded-2xl border border-dashed border-borderColor bg-bgSoft text-center">
        <div className={`w-11 h-11 mx-auto mb-3 rounded-2xl flex items-center justify-center ${
            color === 'info' ? 'bg-info/10 text-info' :
            color === 'warning' ? 'bg-warning/10 text-warning' :
            color === 'success' ? 'bg-success/10 text-success' :
            'bg-primary/10 text-primary'
        }`}>
            {icon}
        </div>
        <h4 className="text-sm font-black text-textPrimary">{title}</h4>
        <p className="text-xs font-bold text-textSecondary mt-1 leading-relaxed">{description}</p>
        <button
            onClick={onAction}
            className={`mt-4 px-4 py-2 rounded-xl text-white text-xs font-black shadow-sm active:scale-95 transition-all ${
                color === 'info' ? 'bg-info hover:bg-info/80' :
                color === 'warning' ? 'bg-warning hover:bg-warning/80' :
                color === 'success' ? 'bg-success hover:bg-success/80' :
                'bg-primary hover:bg-primary/80'
            }`}
        >
            {actionLabel}
        </button>
    </div>
);
    return (
        <>
        {/* 💉 الغلاف الشامل PageLayout للداشبورد */}
        <PageLayout
            title={teacherInfo?.name || t('welcome')}
            subtitle={teacherInfo?.school || t('schoolFallback')}
            
            // 💉 أيقونة المعلم في الهيدر
            icon={
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-bgSoft border border-borderColor flex items-center justify-center overflow-hidden shadow-inner">
                    {getDisplayImage(teacherInfo?.avatar, teacherInfo?.gender) ? (
                        <img src={teacherInfo.avatar} className="w-full h-full object-cover" alt="Teacher" onError={(e) => e.currentTarget.style.display='none'} />
                    ) : <DefaultAvatarSVG gender={teacherInfo?.gender || 'male'} />}
                </div>
            }

            // 💉 بيانات المعلم الإضافية (تظهر بذكاء تحت العنوان وتختفي عند التمرير)
            leftActions={
                <div className="flex flex-wrap items-center gap-2 pb-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <span className={`text-[9px] md:text-[10px] px-2 py-1 rounded-md font-bold border bg-bgSoft border-borderColor text-textSecondary shrink-0`}>
                        {currentSemester === '1' ? t('semester1') : t('semester2')}
                    </span>
                    {teacherInfo?.subject && (
                        <span className="text-[9px] md:text-[10px] font-bold text-primary flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-1 rounded-md truncate">
                            <BookOpen size={12} className="shrink-0"/> <span className="truncate">{teacherInfo.subject}</span>
                        </span>
                    )}
                    {teacherInfo?.governorate && (
                        <span className="text-[9px] md:text-[10px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md truncate">
                            <MapPin size={12} className="shrink-0"/> <span className="truncate">{teacherInfo.governorate}</span>
                        </span>
                    )}
                    {teacherInfo?.academicYear && (
                        <span className="text-[9px] md:text-[10px] font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md shrink-0">
                            <Calendar size={12} /> {teacherInfo.academicYear}
                        </span>
                    )}
                </div>
            }

            // 💉 الأزرار العلوية (ثيم، إعدادات، إشعارات) تم تصغيرها لتناسب الهواتف
            rightActions={
                <div className="flex gap-1.5 md:gap-2 items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button 
                        onClick={() => {
                            const themes = ['light', 'dark', 'glass'];
                            const currentIndex = themes.indexOf(theme || 'light');
                            const nextTheme = themes[(currentIndex + 1) % themes.length];
                            setTheme(nextTheme as any);
                        }} 
                        className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center border transition-all bg-bgSoft border-borderColor text-primary hover:bg-primary hover:text-white shadow-sm"
                        title={t('themeSettings') || 'تغيير المظهر'}
                    >
                        <Palette size={16} />
                    </button>
                    <div className="relative z-[50]">
                        <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className={`w-8 h-8 md:w-10 md:h-10 bg-bgSoft hover:bg-bgCard border border-borderColor text-textSecondary hover:text-textPrimary rounded-xl flex items-center justify-center transition-all shadow-sm`}>
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

                    <button onClick={onToggleNotifications} className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center border transition-all shadow-sm ${notificationsEnabled ? 'bg-warning/10 border-warning/30 text-warning' : 'bg-bgSoft border-borderColor text-textSecondary hover:bg-bgCard hover:text-textPrimary'}`}>
                        {notificationsEnabled ? <Bell size={16} className="animate-pulse" /> : <BellOff size={16} />}
                    </button>
                    
                    {/* مخفي: لرفع الجدول */}
                    <input type="file" ref={scheduleFileInputRef} onChange={handleImportSchedule} accept=".xlsx,.xls" className="hidden" />
                </div>
            }
        >
            
     {/* ⬇️ محتوى الداشبورد الرئيسي - النسخة الاحترافية ⬇️ */}
<div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pt-2 pb-8 px-2 md:px-0">

    {/* رسالة السحابة */}
    {cloudMessage && (
        <div className="relative animate-in fade-in slide-in-from-top-4">
            <div className={`relative p-3 md:p-4 rounded-2xl border shadow-md overflow-hidden ${
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
                            <h3 className="font-black text-sm text-textPrimary">{cloudMessage.title}</h3>
                            <p className="text-xs font-bold mt-1 leading-relaxed text-textSecondary">{cloudMessage.body}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleCloseCloudMessage}
                        className="p-1.5 rounded-lg transition-colors shrink-0 text-textSecondary hover:bg-bgSoft hover:text-textPrimary"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    )}

    {/* بطاقات الملخص الذكي */}
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 md:gap-3">
        <div className="glass-card border border-borderColor rounded-2xl p-3 md:p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Clock size={19} />
                </div>
                <div className={dir === 'rtl' ? 'text-left' : 'text-right'}>
                    <div className="text-xl md:text-2xl font-black text-textPrimary">{todayPeriodsCount}</div>
                    <div className="text-[10px] md:text-xs font-bold text-textSecondary">حصص اليوم</div>
                </div>
            </div>
        </div>

        <div className="glass-card border border-borderColor rounded-2xl p-3 md:p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="w-10 h-10 rounded-2xl bg-info/10 text-info flex items-center justify-center">
                    <AlarmClock size={19} />
                </div>
                <div className={dir === 'rtl' ? 'text-left' : 'text-right'}>
                    <div className="text-base md:text-xl font-black text-textPrimary font-mono">
                        {smartNextPeriod?.startTime || '--:--'}
                    </div>
                    <div className="text-[10px] md:text-xs font-bold text-textSecondary">
                        {smartNextPeriod?.status === 'active' ? 'الحصة الحالية' : 'الحصة القادمة'}
                    </div>
                </div>
            </div>
        </div>

        <div className="glass-card border border-borderColor rounded-2xl p-3 md:p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="w-10 h-10 rounded-2xl bg-success/10 text-success flex items-center justify-center">
                    <User size={19} />
                </div>
                <div className={dir === 'rtl' ? 'text-left' : 'text-right'}>
                    <div className="text-xl md:text-2xl font-black text-textPrimary">{students?.length || 0}</div>
                    <div className="text-[10px] md:text-xs font-bold text-textSecondary">طالب</div>
                </div>
            </div>
        </div>

        <div className="glass-card border border-borderColor rounded-2xl p-3 md:p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    notificationsEnabled ? 'bg-warning/10 text-warning' : 'bg-bgSoft text-textSecondary'
                }`}>
                    {notificationsEnabled ? <Bell size={19} /> : <BellOff size={19} />}
                </div>
                <div className={dir === 'rtl' ? 'text-left' : 'text-right'}>
                    <div className="text-sm md:text-base font-black text-textPrimary">
                        {notificationsEnabled ? 'مفعلة' : 'متوقفة'}
                    </div>
                    <div className="text-[10px] md:text-xs font-bold text-textSecondary">الإشعارات</div>
                </div>
            </div>
        </div>
    </div>

    {/* تخطيط احترافي للكمبيوتر */}
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">

        {/* العمود الرئيسي */}
        <div className="xl:col-span-8 space-y-4 md:space-y-6">

            {/* بطاقة الحصة الحالية/القادمة */}
            <div className="rounded-3xl border border-borderColor glass-panel shadow-sm overflow-hidden">
                {smartNextPeriod ? (
                    <div className={`relative p-4 md:p-5 ${
                        smartNextPeriod.status === 'active'
                            ? 'bg-primary text-white'
                            : 'bg-primary/10'
                    }`}>
                        <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-1.5 ${
                            smartNextPeriod.status === 'active' ? 'bg-white/70' : 'bg-primary'
                        }`} />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                    smartNextPeriod.status === 'active'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-primary text-white'
                                }`}>
                                    <Clock size={22} />
                                </div>

                                <div>
                                    <div className={`text-[10px] font-black mb-1 ${
                                        smartNextPeriod.status === 'active'
                                            ? 'text-white/80'
                                            : 'text-primary'
                                    }`}>
                                        {smartNextPeriod.status === 'active' ? 'الحصة الجارية الآن' : 'الحصة القادمة'}
                                    </div>

                                    <h3 className={`text-lg md:text-xl font-black ${
                                        smartNextPeriod.status === 'active'
                                            ? 'text-white'
                                            : 'text-textPrimary'
                                    }`}>
                                        {smartNextPeriod.subject}
                                    </h3>

                                    <p className={`text-xs font-bold mt-1 ${
                                        smartNextPeriod.status === 'active'
                                            ? 'text-white/80'
                                            : 'text-textSecondary'
                                    }`}>
                                        الحصة {smartNextPeriod.index + 1} · {smartNextPeriod.startTime || '--:--'} - {smartNextPeriod.endTime || '--:--'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleStartAttendance(smartNextPeriod.subject)}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                                    smartNextPeriod.status === 'active'
                                        ? 'bg-white text-primary hover:bg-white/90'
                                        : 'bg-primary text-white hover:bg-primary/80'
                                }`}
                            >
                                <CheckCircle2 size={16} />
                                {smartNextPeriod.status === 'active' ? 'بدء تسجيل الحضور' : 'الاستعداد للحصة'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 md:p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center">
                                <CheckCircle2 size={22} />
                            </div>
                            <div>
                                <h3 className="font-black text-textPrimary text-sm md:text-base">
                                    لا توجد حصص قادمة
                                </h3>
                                <p className="text-xs text-textSecondary font-bold mt-1">
                                    لا توجد حصص متبقية في جدول اليوم.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* تقدم اليوم الدراسي */}
            <div className="rounded-3xl border border-borderColor glass-panel p-4 md:p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h3 className="text-sm md:text-base font-black text-textPrimary">تقدم اليوم الدراسي</h3>
                        <p className="text-xs font-bold text-textSecondary mt-1">
                            تم إنجاز {completedPeriodsCount} من {todayPeriodsCount} حصص
                        </p>
                    </div>
                    <span className="text-xl md:text-2xl font-black text-primary">{dayProgress}%</span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-bgSoft overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${dayProgress}%` }}
                    />
                </div>
            </div>

            {/* جدول اليوم */}
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-sm md:text-lg font-black flex items-center gap-2 text-textPrimary">
                        {t('todaySchedule')}
                        <span className="text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg bg-bgSoft text-textSecondary">
                            {t(weekDayKeys[dayIndex]) || todaySchedule.dayName}
                        </span>
                    </h2>

                    <button
                        onClick={() => setShowScheduleModal(true)}
                        className="p-2 rounded-xl shadow-sm border active:scale-95 transition-transform bg-bgSoft border-borderColor text-textSecondary hover:bg-bgCard hover:text-textPrimary"
                    >
                        <Clock size={16} className="md:w-5 md:h-5" />
                    </button>
                </div>

                {todayPeriodsCount > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
                        {todaySchedule.periods && todaySchedule.periods.map((subject: string, idx: number) => {
                            if (!subject) return null;

                            const time = periodTimes[idx] || { startTime: '00:00', endTime: '00:00' };
                            const displaySubject = teacherInfo?.subject && teacherInfo.subject.trim().length > 0
                                ? teacherInfo.subject
                                : subject;

                            const status = getPeriodStatus(time.startTime, time.endTime);
                            const meta = statusMeta[status];

                            return (
                                <div
                                    key={idx}
                                    className={`relative flex flex-col justify-between p-3 md:p-4 rounded-2xl border transition-all duration-300 gap-3 ${meta.cardClass}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 min-w-0">
                                            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                                                status === 'active'
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-bgSoft text-textSecondary'
                                            }`}>
                                                {getSubjectIcon(displaySubject) || getSubjectIcon(subject) || (idx + 1)}
                                            </div>

                                            <div className="min-w-0">
                                                <h4 className={`font-black text-sm truncate ${meta.textClass}`}>
                                                    {subject}
                                                </h4>
                                                <p className={`text-[11px] font-bold mt-1 ${meta.subTextClass}`}>
                                                    الحصة {idx + 1}
                                                </p>
                                            </div>
                                        </div>

                                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg shrink-0 ${meta.className}`}>
                                            {meta.label}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-bold ${meta.subTextClass}`}>الوقت</span>
                                            <span className={`text-xs md:text-sm font-black font-mono ${meta.textClass}`}>
                                                {time.startTime}-{time.endTime}
                                            </span>
                                        </div>

                                        {status === 'active' ? (
                                            <button
                                                onClick={() => handleStartAttendance(subject)}
                                                className="px-3 py-2 rounded-xl font-black text-[10px] shadow-md flex items-center gap-1 active:scale-95 bg-white text-primary"
                                            >
                                                <CheckCircle2 size={14} />
                                                حضور
                                            </button>
                                        ) : status === 'completed' ? (
                                            <button
                                                onClick={() => handleStartAttendance(subject)}
                                                className="px-3 py-2 rounded-xl font-black text-[10px] border border-success/20 bg-success/10 text-success active:scale-95"
                                            >
                                                مراجعة
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    if (setSelectedClass) setSelectedClass(subject);
                                                }}
                                                className="px-3 py-2 rounded-xl font-black text-[10px] border border-borderColor bg-bgSoft text-textSecondary active:scale-95"
                                            >
                                                تفاصيل
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyActionCard
                        icon={<Clock size={22} />}
                        title="لا توجد حصص في جدول اليوم"
                        description="قم بإضافة جدول الحصص أو استيراده من ملف Excel ليظهر هنا."
                        actionLabel="إعداد الجدول"
                        onAction={() => setShowScheduleModal(true)}
                        color="primary"
                    />
                )}
            </div>
        </div>

        {/* العمود الجانبي */}
        <div className="xl:col-span-4 space-y-4 md:space-y-6">

            {/* اختصارات سريعة */}
            <div className="rounded-3xl p-4 md:p-5 shadow-sm border glass-panel border-borderColor">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm md:text-base font-black text-textPrimary">اختصارات سريعة</h2>
                        <p className="text-[10px] md:text-xs font-bold text-textSecondary mt-1">
                            نفّذ أهم الإجراءات مباشرة
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <PlayCircle size={20} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleStartAttendance(smartNextPeriod?.subject)}
                        className="p-3 rounded-2xl bg-primary text-white text-xs font-black flex flex-col items-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                        <CheckCircle2 size={18} />
                        تسجيل حضور
                    </button>

                    <button
                        onClick={() => setShowScheduleModal(true)}
                        className="p-3 rounded-2xl bg-bgSoft text-textPrimary border border-borderColor text-xs font-black flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-bgCard"
                    >
                        <Clock size={18} />
                        تعديل الجدول
                    </button>

                    <button
                        onClick={() => setShowTermPlanModal(true)}
                        className="p-3 rounded-2xl bg-bgSoft text-textPrimary border border-borderColor text-xs font-black flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-bgCard"
                    >
                        <BookOpen size={18} />
                        الخطة الفصلية
                    </button>

                    <button
                        onClick={() => setShowPlanSettingsModal(true)}
                        className="p-3 rounded-2xl bg-bgSoft text-textPrimary border border-borderColor text-xs font-black flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-bgCard"
                    >
                        <CalendarDays size={18} />
                        التقويم
                    </button>
                </div>
            </div>
{/* 📖 الخطة الفصلية */}
<div className="relative z-10">
    <div className="rounded-3xl p-4 md:p-5 shadow-sm border glass-panel border-borderColor">
        <div className="flex justify-between items-center mb-3 md:mb-4">
            <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-xl bg-info/10 text-info">
                    <BookOpen size={16} className="md:w-5 md:h-5" />
                </div>

                <div>
                    <h2 className="text-sm md:text-base font-black text-textPrimary">
                        {t('termPlanTitle') || 'الخطة الفصلية'}
                    </h2>

                    {currentWeekPlan ? (
                        <p className="text-[10px] font-bold text-textSecondary mt-0.5">
                            {currentWeekPlan.name}
                        </p>
                    ) : (
                        <p className="text-[10px] font-bold text-textSecondary mt-0.5">
                            لا يوجد أسبوع مطابق لتاريخ اليوم
                        </p>
                    )}
                </div>
            </div>

            <button
                onClick={() => setShowTermPlanModal(true)}
                className="p-1.5 md:p-2 rounded-xl transition-colors bg-bgSoft text-textSecondary hover:bg-bgCard hover:text-textPrimary"
                title="تخصيص الخطة الفصلية"
            >
                <Settings size={16} className="md:w-5 md:h-5" />
            </button>
        </div>

        {currentWeekPlan ? (
            <div
                className={`p-3 md:p-4 rounded-2xl border transition-all ${
                    isTermPlanReady
                        ? 'bg-info/10 border-info/30'
                        : 'bg-warning/10 border-warning/30'
                }`}
            >
                <div className="flex justify-between items-center mb-3 gap-2">
                    <span
                        className={`text-[10px] md:text-xs font-black ${
                            isTermPlanReady ? 'text-info' : 'text-warning'
                        }`}
                    >
                        {currentWeekPlan.start || 'بدون تاريخ'} - {currentWeekPlan.end || 'بدون تاريخ'}
                    </span>

                    <span
                        className={`text-[8px] font-bold px-2 py-0.5 rounded-lg shadow-sm shrink-0 ${
                            isTermPlanReady ? 'bg-info text-white' : 'bg-warning text-white'
                        }`}
                    >
                        {isTermPlanReady ? 'جاهزة' : 'تحتاج إكمال'}
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs font-bold text-textPrimary">
                        <div
                            className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                isTermPlanReady ? 'bg-info' : 'bg-warning'
                            }`}
                        />
                        <span>
                            <span className={isTermPlanReady ? 'text-info' : 'text-warning'}>
                                الوحدة:
                            </span>{' '}
                            {currentWeekPlan.unit || 'لم تحدد'}
                        </span>
                    </div>

                    <div className="flex items-start gap-2 text-xs font-bold text-textPrimary">
                        <div
                            className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                isTermPlanReady ? 'bg-info' : 'bg-warning'
                            }`}
                        />
                        <span>
                            <span className={isTermPlanReady ? 'text-info' : 'text-warning'}>
                                الدرس:
                            </span>{' '}
                            {currentWeekPlan.lesson || currentWeekPlan.defaultTopic || 'لم يحدد'}
                        </span>
                    </div>
                </div>

                {!isTermPlanReady && (
                    <button
                        onClick={() => setShowTermPlanModal(true)}
                        className="mt-4 w-full py-2.5 rounded-xl bg-warning text-white text-xs font-black active:scale-95 transition-all"
                    >
                        إكمال بيانات الخطة
                    </button>
                )}
            </div>
        ) : (
            <div className="p-4 md:p-5 rounded-2xl border border-dashed border-borderColor bg-bgSoft text-center">
                <div className="w-11 h-11 mx-auto mb-3 rounded-2xl bg-info/10 text-info flex items-center justify-center">
                    <Calendar size={22} />
                </div>

                <h4 className="text-sm font-black text-textPrimary">
                    لا توجد خطة للأسبوع الحالي
                </h4>

                <p className="text-xs font-bold text-textSecondary mt-1 leading-relaxed">
                    أدخل تواريخ الأسابيع يدويًا أو استوردها من ملف Excel لتظهر الخطة حسب تاريخ اليوم.
                </p>

                <button
                    onClick={() => setShowTermPlanModal(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-info text-white text-xs font-black shadow-sm active:scale-95 transition-all"
                >
                    إعداد الخطة
                </button>
            </div>
        )}
    </div>
</div>

            {/* التقويم المستمر */}
            <div className="relative z-10">
                <div className="rounded-3xl p-4 md:p-5 shadow-sm border glass-panel border-borderColor">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="p-1.5 md:p-2 rounded-xl bg-warning/10 text-warning">
                                <CalendarDays size={16} className="md:w-5 md:h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm md:text-base font-black text-textPrimary">
                                    {t('continuousAssessmentPlan')}
                                </h2>
                                <p className="text-[10px] font-bold text-textSecondary mt-0.5">
                                    {currentAssessmentPlan ? `${t('monthPrefix')} ${currentAssessmentPlan.monthName}` : 'الشهر الحالي'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowPlanSettingsModal(true)}
                            className="p-1.5 md:p-2 rounded-xl transition-colors bg-bgSoft text-textSecondary hover:bg-bgCard hover:text-textPrimary"
                        >
                            <Settings size={16} className="md:w-5 md:h-5" />
                        </button>
                    </div>

                    {isAssessmentReady && currentAssessmentPlan ? (
                        <div className="p-3 md:p-4 rounded-2xl border transition-all bg-primary/10 border-primary/30">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] md:text-xs font-black text-primary">
                                    {t('monthPrefix')} {currentAssessmentPlan.monthName}
                                </span>
                                <span className="text-[8px] font-bold px-2 py-0.5 rounded-lg bg-primary text-white shadow-sm">
                                    {t('currentMonthLabel')}
                                </span>
                            </div>

                            <ul className="space-y-2">
                                {currentAssessmentPlan.tasks.map((task, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-2 text-[11px] md:text-xs font-bold text-textPrimary"
                                    >
                                        <CheckCircle2 size={13} className="text-primary mt-0.5 shrink-0" />
                                        <span>{task}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <EmptyActionCard
                            icon={<CalendarDays size={22} />}
                            title="لا توجد خطة تقويم لهذا الشهر"
                            description="أضف مهام التقويم المستمر لهذا الشهر حتى تظهر للمعلم مباشرة."
                            actionLabel="إنشاء خطة تقويم"
                            onAction={() => setShowPlanSettingsModal(true)}
                            color="warning"
                        />
                    )}
                </div>
            </div>
        </div>
    </div>
</div>
        </PageLayout>

        {/* ================= النوافذ (Drawers) - لم تُمس أبداً ================= */}

        {/* 🆕 نافذة إعدادات الخطة الفصلية المرنة */}
<DrawerSheet isOpen={showTermPlanModal} onClose={() => setShowTermPlanModal(false)} dir={dir}>
    <div className="flex flex-col h-full w-full">
        <div className="flex justify-between items-start gap-3 mb-4 pb-3 border-b border-borderColor">
            <div>
                <h3 className="font-black text-lg text-textPrimary">
                    {t('customizeTermPlan') || 'تخصيص الخطة الفصلية'}
                </h3>

                <p className="text-[11px] font-bold text-textSecondary mt-1 leading-relaxed">
                    يمكنك إدخال الأسابيع يدويًا أو استيرادها من ملف Excel.
                </p>
            </div>

            <div className="flex gap-2 shrink-0">
                <button
                    onClick={handleAddTermWeek}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-primary/10 text-primary hover:bg-primary/20"
                >
                    <Plus size={14} />
                    أسبوع
                </button>

                <button
                    onClick={() => termExcelInputRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-success/10 text-success hover:bg-success/20"
                >
                    <Download size={14} />
                    Excel
                </button>

                <input
                    type="file"
                    ref={termExcelInputRef}
                    onChange={handleImportTermPlanExcel}
                    className="hidden"
                    accept=".xlsx,.xls"
                />
            </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-[11px] font-bold text-textSecondary">
                عدد الأسابيع: {tempTermPlan.length}
            </div>

            <button
                onClick={handleResetTermPlan}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-danger/10 text-danger hover:bg-danger/20"
            >
                <RefreshCcw size={14} />
                إعادة تهيئة
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-3">
            {tempTermPlan.map((week, idx) => {
                const isCurrent = week.id === currentWeekId;

                return (
                    <div
                        key={week.id}
                        className={`p-4 rounded-2xl border transition-all ${
                            isCurrent
                                ? 'bg-info/10 border-info shadow-sm'
                                : 'bg-bgCard border-borderColor'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-3 gap-2">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-textSecondary mb-1">
                                    اسم الأسبوع
                                </label>

                                <input
                                    value={week.name}
                                    onChange={(e) => updateWeekData(idx, 'name', e.target.value)}
                                    placeholder="مثال: الأسبوع الأول"
                                    className="w-full p-2 rounded-lg text-xs font-black outline-none border transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-info"
                                />
                            </div>

                            <button
                                onClick={() => handleDeleteTermWeek(idx)}
                                className="mt-5 p-2 rounded-lg transition-colors bg-danger/10 text-danger hover:bg-danger/20 shrink-0"
                                title="حذف الأسبوع"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                                <label className="block text-[10px] font-bold text-textSecondary mb-1">
                                    بداية الأسبوع
                                </label>

                                <input
                                    type="date"
                                    value={week.start}
                                    onChange={(e) => updateWeekData(idx, 'start', e.target.value)}
                                    className="w-full p-2 rounded-lg text-xs font-bold outline-none border transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-info"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-textSecondary mb-1">
                                    نهاية الأسبوع
                                </label>

                                <input
                                    type="date"
                                    value={week.end}
                                    onChange={(e) => updateWeekData(idx, 'end', e.target.value)}
                                    className="w-full p-2 rounded-lg text-xs font-bold outline-none border transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-info"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <input
                                value={week.unit}
                                onChange={(e) => updateWeekData(idx, 'unit', e.target.value)}
                                placeholder="اسم الوحدة مثال: الوحدة الأولى"
                                className="w-full p-2 rounded-lg text-xs font-bold outline-none border transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-info"
                            />

                            <input
                                value={week.lesson}
                                onChange={(e) => updateWeekData(idx, 'lesson', e.target.value)}
                                placeholder="اسم الدرس مثال: الدرس الأول"
                                className="w-full p-2 rounded-lg text-xs font-bold outline-none border transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-info"
                            />

                            <input
                                value={week.defaultTopic}
                                onChange={(e) => updateWeekData(idx, 'defaultTopic', e.target.value)}
                                placeholder="موضوع افتراضي اختياري مثال: تهيئة ومراجعة"
                                className="w-full p-2 rounded-lg text-xs font-bold outline-none border transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-info"
                            />
                        </div>

                        {isCurrent && (
                            <div className="mt-3 text-[10px] font-bold text-info bg-info/10 border border-info/20 rounded-lg px-3 py-2">
                                هذا هو الأسبوع الحالي حسب التاريخ المدخل.
                            </div>
                        )}
                    </div>
                );
            })}

            {tempTermPlan.length === 0 && (
                <div className="p-6 rounded-2xl border border-dashed border-borderColor bg-bgSoft text-center">
                    <BookOpen size={28} className="mx-auto text-textSecondary mb-2" />

                    <h4 className="text-sm font-black text-textPrimary">
                        لا توجد أسابيع مضافة
                    </h4>

                    <p className="text-xs font-bold text-textSecondary mt-1">
                        أضف الأسابيع يدويًا أو استوردها من ملف Excel.
                    </p>

                    <button
                        onClick={handleAddTermWeek}
                        className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-black"
                    >
                        إضافة أسبوع
                    </button>
                </div>
            )}
        </div>

        <div className="pt-4 mt-auto border-t border-borderColor">
            <button
                onClick={handleSaveTermPlan}
                className="w-full py-3 text-white rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all bg-primary hover:bg-primary/80"
            >
                <Save size={16} />
                {t('saveChanges') || 'حفظ التغييرات'}
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

        </>
    );
};

export default Dashboard;
