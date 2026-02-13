import React, { useState, useEffect, useRef } from 'react';
import { ScheduleDay, PeriodTime } from '../types';
import { 
  Bell, Clock, Settings, Edit3,
  School, Download, Loader2, 
  PlayCircle, AlarmClock, ChevronLeft, User, Check, Camera,
  X, Calendar, BellOff, Save, CalendarDays, CheckCircle2,
  AlertTriangle
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

    const { classes } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null); 
    const ministryLogoInputRef = useRef<HTMLInputElement>(null); 
    const modalScheduleFileInputRef = useRef<HTMLInputElement>(null);
    const scheduleFileInputRef = useRef<HTMLInputElement>(null);

    const [isImportingPeriods, setIsImportingPeriods] = useState(false);
    const [isImportingSchedule, setIsImportingSchedule] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

    // State for Teacher Info Modal
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

    // حالة شريط التنبيه (لإمكانية إغلاقه)
    const [showAlertBar, setShowAlertBar] = useState(true);

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

    const getDisplayImage = (avatar: string | undefined, gender: string | undefined) => {
        if (avatar && avatar.length > 50) return avatar;
        return null;
    };

    // ✅ دالة أيقونات المواد
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

    // ✅ دالة حفظ البيانات
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

    // --- خطة التقويم المستمر ---
    const assessmentPlan = [
        { monthIndex: 2, monthName: 'مارس', tasks: ['العرض الشفوي (بدء)', 'التقرير (بدء)', 'السؤال القصير 1', 'الاختبار القصير 1'] },
        { monthIndex: 3, monthName: 'أبريل', tasks: ['استكمال العرض الشفوي', 'استكمال التقرير', 'السؤال القصير 2'] },
        { monthIndex: 4, monthName: 'مايو', tasks: ['تسليم العرض الشفوي', 'تسليم التقرير', 'الاختبار القصير 2'] }
    ];
    const currentMonthIndex = new Date().getMonth();
    const currentTasks = assessmentPlan.find(p => p.monthIndex === currentMonthIndex)?.tasks || [];

    return (
        <div className="space-y-6 pb-28 animate-in fade-in duration-500 relative min-h-screen">
            
            {/* 1️⃣ الهيدر الكبير */}
            <header className="bg-[#446A8D] text-white pt-10 pb-8 px-4 md:pt-16 md:pb-12 md:px-6 shadow-xl relative z-20 -mx-4 -mt-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3 md:gap-5">
                        <div className="relative group">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-inner transition-transform hover:scale-105">
                                {getDisplayImage(teacherInfo.avatar, teacherInfo.gender) ? (
                                    <img src={teacherInfo.avatar} className="w-full h-full object-cover" alt="Teacher" onError={(e) => e.currentTarget.style.display='none'} />
                                ) : <DefaultAvatarSVG gender={teacherInfo.gender || 'male'} />}
                            </div>
                            <button onClick={() => setShowEditModal(true)} className="absolute -bottom-2 -right-2 bg-white text-[#446A8D] p-1.5 md:p-2 rounded-full shadow-lg border-2 border-[#446A8D] hover:scale-110 transition-transform" title="تعديل البيانات">
                                <Edit3 size={12} className="md:w-3.5 md:h-3.5" strokeWidth={3} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-0.5 md:gap-1">
                            <h1 className="text-xl md:text-3xl font-black tracking-wide">{teacherInfo.name || 'مرحباً بك'}</h1>
                            <div className="flex items-center gap-2 text-blue-100/90">
                                <p className="text-xs md:text-sm font-bold flex items-center gap-1">
                                    <School size={12} className="md:w-3.5 md:h-3.5" /> {teacherInfo.school || 'المدرسة'}
                                </p>
                                <span className="text-[9px] md:text-[10px] bg-white/20 px-2 md:px-3 py-0.5 md:py-1 rounded-full font-bold border border-white/10">
                                    {currentSemester === '1' ? 'الفصل الأول' : 'الفصل الثاني'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 md:gap-3">
                        <div className="relative">
                            <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className={`w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center transition-all ${showSettingsDropdown ? 'bg-white text-[#446A8D]' : ''}`}>
                                <Settings size={20} className="md:w-6 md:h-6" />
                            </button>
                            {showSettingsDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowSettingsDropdown(false)}></div>
                                    <div className="absolute left-0 top-full mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden text-slate-800 animate-in zoom-in-95 origin-top-left">
                                        <button onClick={() => { setShowEditModal(true); setShowSettingsDropdown(false); }} className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 w-full text-right border-b border-slate-50 transition-colors">
                                            <div className="p-2 bg-indigo-50 rounded-lg"><User size={18} className="text-indigo-600"/></div>
                                            <span className="text-sm font-bold text-slate-700">تعديل الهوية</span>
                                        </button>
                                        <button onClick={onToggleNotifications} className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 w-full text-right border-b border-slate-50 transition-colors">
                                            <div className={`p-2 rounded-lg ${notificationsEnabled ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                                <AlarmClock size={18} className={notificationsEnabled ? 'text-emerald-600' : 'text-rose-600'}/> 
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">التنبيهات</span>
                                                <span className={`text-[10px] font-bold ${notificationsEnabled ? 'text-emerald-500' : 'text-slate-400'}`}>{notificationsEnabled ? 'مفعل' : 'معطل'}</span>
                                            </div>
                                        </button>
                                        <button onClick={handleTestNotification} className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 w-full text-right transition-colors">
                                            <div className="p-2 bg-amber-50 rounded-lg"><PlayCircle size={18} className="text-amber-600"/></div>
                                            <span className="text-sm font-bold text-slate-700">تجربة الجرس</span>
                                        </button>
                                        <button onClick={() => scheduleFileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 w-full text-right border-t border-slate-50 bg-slate-50/50">
                                            <div className="p-2 bg-blue-50 rounded-lg"><Download size={18} className="text-blue-600"/></div>
                                            <span className="text-sm font-bold text-slate-700">استيراد الجدول</span>
                                            {isImportingSchedule && <Loader2 size={16} className="ml-auto animate-spin text-blue-600" />}
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

            {/* 2️⃣ الجدول (في مكانه كما طلبت) */}
            <div className="px-4 mt-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        جدول اليوم <span className="text-xs text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-lg">{todaySchedule.dayName}</span>
                    </h2>
                    <button onClick={() => setShowScheduleModal(true)} className="bg-white text-slate-600 p-2.5 rounded-xl shadow-sm border border-slate-200 active:scale-95 transition-transform hover:bg-slate-50">
                        <Clock size={20} />
                    </button>
                </div>

                <div className="space-y-3">
                    {todaySchedule.periods && todaySchedule.periods.map((subject: string, idx: number) => {
                        if (!subject) return null;
                        const time = periodTimes[idx] || { startTime: '00:00', endTime: '00:00' };
                        const isActive = isToday && checkActivePeriod(time.startTime, time.endTime);
                        const displaySubject = teacherInfo.subject && teacherInfo.subject.trim().length > 0 ? teacherInfo.subject : subject;

                        return (
                            <div key={idx} className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all ${isActive ? 'bg-[#446A8D] text-white border-[#446A8D] shadow-xl shadow-blue-200 scale-105 z-10' : 'bg-white border-slate-100 text-slate-600 hover:shadow-md'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                        {getSubjectIcon(displaySubject) || getSubjectIcon(subject) || (idx + 1)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-black text-sm ${isActive ? 'text-white' : 'text-slate-800'}`}>{subject}</h4>
                                            {isActive && <span className="text-[9px] bg-emerald-400 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">الآن</span>}
                                        </div>
                                        <span className={`text-[10px] font-bold ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                                            الحصة {idx + 1} • {time.startTime} - {time.endTime}
                                        </span>
                                    </div>
                                </div>
                                {isActive ? (
                                    <button onClick={() => onNavigate('attendance')} className="bg-white text-[#446A8D] px-3 py-2 rounded-lg font-bold text-xs shadow-lg flex items-center gap-1 active:scale-95">
                                        تحضير <ChevronLeft size={14} />
                                    </button>
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                                )}
                            </div>
                        );
                    })}
                    {(!todaySchedule.periods || todaySchedule.periods.every((p: string) => !p)) && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 opacity-60 bg-white rounded-3xl border border-dashed border-slate-200">
                            <School size={40} className="mb-2" />
                            <p className="font-bold text-xs">لا توجد حصص اليوم</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3️⃣ خطة التقويم المستمر (تأتي بعد الجدول) */}
            <div className="px-4 mt-6">
                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-50 text-amber-500 rounded-xl"><CalendarDays size={18}/></div>
                        <h2 className="text-base font-black text-slate-800">خطة التقويم المستمر</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {assessmentPlan.map((plan) => {
                            const isCurrent = currentMonthIndex === plan.monthIndex;
                            const isPast = currentMonthIndex > plan.monthIndex;
                            return (
                                <div key={plan.monthIndex} className={`p-4 rounded-2xl border transition-all ${isCurrent ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : isPast ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-slate-100'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-xs font-black ${isCurrent ? 'text-indigo-700' : 'text-slate-600'}`}>شهر {plan.monthName}</span>
                                        {isCurrent && <span className="bg-indigo-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-lg animate-pulse">الحالي</span>}
                                        {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                    </div>
                                    <ul className="space-y-1.5">
                                        {plan.tasks.map((task, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-[10px] font-bold text-slate-500">
                                                <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${isCurrent ? 'bg-indigo-400' : 'bg-slate-300'}`}></div>
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

            {/* 4️⃣ شريط التنبيه السفلي (الجديد كلياً) */}
            {showAlertBar && currentTasks.length > 0 && (
                <div className="fixed bottom-[80px] left-4 right-4 bg-indigo-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl z-30 flex items-start gap-3 animate-in slide-in-from-bottom-10 duration-500 border border-indigo-800">
                    <div className="p-2 bg-indigo-700 rounded-xl shrink-0 animate-pulse">
                        <AlertTriangle size={20} className="text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-black text-sm mb-1 text-amber-300">تذكير بمهام شهر {assessmentPlan.find(p=>p.monthIndex === currentMonthIndex)?.monthName}</h4>
                        <p className="text-[10px] opacity-90 leading-relaxed font-bold">
                            عليك تنفيذ: {currentTasks.slice(0, 2).join('، ')} {currentTasks.length > 2 && '...'}
                        </p>
                    </div>
                    <button onClick={() => setShowAlertBar(false)} className="p-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Modal: Edit Identity (كما هو) */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} className="max-w-md rounded-[2rem]">
                <div className="text-center">
                    <h3 className="font-black text-lg mb-4 text-slate-800">الهوية الرسمية</h3>
                    <div className="w-24 h-24 mx-auto mb-4 relative group">
                        {editAvatar ? (
                            <img src={editAvatar} className="w-full h-full rounded-2xl object-cover border-4 border-slate-50 shadow-md" alt="Profile" onError={(e) => { e.currentTarget.style.display='none'; }}/>
                        ) : (
                            <div className="w-full h-full rounded-2xl border-4 border-slate-50 bg-indigo-50 flex items-center justify-center"><DefaultAvatarSVG gender={editGender}/></div>
                        )}
                        <button onClick={() => setEditAvatar(undefined)} className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white hover:bg-rose-600 transition-colors">
                            <X size={14}/>
                        </button>
                    </div>

                    <div className="space-y-3 text-right">
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="الاسم" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-full outline-none focus:border-indigo-500" />
                            <input value={editSchool} onChange={e => setEditSchool(e.target.value)} placeholder="المدرسة" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-full outline-none focus:border-indigo-500" />
                        </div>
                        <input value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="المادة (مثال: رياضيات)" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-full outline-none focus:border-indigo-500" />
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editGovernorate} onChange={e => setEditGovernorate(e.target.value)} placeholder="المحافظة" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-full outline-none focus:border-indigo-500" />
                            <input value={editAcademicYear} onChange={e => setEditAcademicYear(e.target.value)} placeholder="العام الدراسي" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-full outline-none focus:border-indigo-500" />
                        </div>

                        <div className="bg-slate-50 p-1 rounded-xl flex gap-1">
                            <button onClick={() => setEditSemester('1')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editSemester === '1' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>فصل 1</button>
                            <button onClick={() => setEditSemester('2')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editSemester === '2' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>فصل 2</button>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border border-indigo-100 hover:bg-indigo-100"><Camera size={16}/> صورتك</button>
                            <button onClick={() => stampInputRef.current?.click()} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border border-blue-100 hover:bg-blue-100"><Check size={16}/> الختم</button>
                            <button onClick={() => ministryLogoInputRef.current?.click()} className="flex-1 py-3 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 border border-amber-100 hover:bg-amber-100"><School size={16}/> الشعار</button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, setEditAvatar)} className="hidden" accept="image/*"/>
                        <input type="file" ref={stampInputRef} onChange={(e) => handleFileUpload(e, setEditStamp)} className="hidden" accept="image/*"/>
                        <input type="file" ref={ministryLogoInputRef} onChange={(e) => handleFileUpload(e, setEditMinistryLogo)} className="hidden" accept="image/*"/>

                        <button onClick={handleSaveInfo} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs mt-2 shadow-lg">حفظ التغييرات</button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Schedule & Timing (كما هو) */}
            <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} className="max-w-md rounded-[2rem] h-[80vh]">
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                        <h3 className="font-black text-lg text-slate-800">إدارة الجدول</h3>
                        <button onClick={() => modalScheduleFileInputRef.current?.click()} className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors">
                            <Download size={14}/> {isImportingPeriods ? '...' : 'استيراد Excel'}
                        </button>
                        <input type="file" ref={modalScheduleFileInputRef} onChange={handleImportPeriodTimes} accept=".xlsx,.xls" className="hidden" />
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl mb-4 shrink-0">
                        <button onClick={() => setScheduleTab('timing')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${scheduleTab === 'timing' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>التوقيت</button>
                        <button onClick={() => setScheduleTab('classes')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${scheduleTab === 'classes' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>الحصص</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                        {scheduleTab === 'timing' ? (
                            <div className="space-y-2">
                                {tempPeriodTimes.map((pt, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                        <span className="text-[10px] font-bold w-8 text-slate-400 text-center">{idx+1}</span>
                                        <input type="time" value={pt.startTime} onChange={(e) => {const n=[...tempPeriodTimes]; if(n[idx]) n[idx].startTime=e.target.value; setTempPeriodTimes(n)}} className="flex-1 bg-white rounded-lg px-2 py-1 text-xs font-bold border border-slate-200 text-center"/>
                                        <span className="text-slate-300">-</span>
                                        <input type="time" value={pt.endTime} onChange={(e) => {const n=[...tempPeriodTimes]; if(n[idx]) n[idx].endTime=e.target.value; setTempPeriodTimes(n)}} className="flex-1 bg-white rounded-lg px-2 py-1 text-xs font-bold border border-slate-200 text-center"/>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {tempSchedule.map((day, idx) => (
                                        <button key={idx} onClick={() => setEditingDayIndex(idx)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${editingDayIndex === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>{day.dayName}</button>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    {tempSchedule[editingDayIndex]?.periods.map((cls: string, pIdx: number) => (
                                        <div key={pIdx} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-bold text-slate-400 w-8 text-center">{pIdx + 1}</span>
                                            <input value={cls} onChange={(e) => {const n=[...tempSchedule]; if(n[editingDayIndex]?.periods) n[editingDayIndex].periods[pIdx]=e.target.value; setTempSchedule(n)}} placeholder="اسم المادة" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 text-slate-800" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 mt-auto border-t border-slate-100">
                        <button onClick={handleSaveScheduleSettings} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2"><Save size={16} /> حفظ التغييرات</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
