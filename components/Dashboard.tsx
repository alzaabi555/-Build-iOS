import React, { useState, useEffect, useRef } from 'react';
import { ScheduleDay, PeriodTime } from '../types';
import { 
  Bell, Clock, Settings, Edit3,
  School, Download, Loader2, 
  PlayCircle, AlarmClock, ChevronLeft, User, Check, Camera,
  X, Calendar, BellOff, Save
} from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import alarmSound from '../assets/alarm.mp3';

// 1. رسمة برمجية افتراضية (SVG) لتجنب الشاشة البيضاء نهائياً
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
    // حماية ضد البيانات المفقودة
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
    
    // استخدام Optional Chaining لتجنب الأخطاء
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
    }, [teacherInfo, currentSemester, showEditModal]);

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

    // دالة استيراد الصور الآمنة
    const getImg = (path: string) => {
        if (!path) return '';
        return path.startsWith('/') ? path : `/${path}`;
    };

    const getDisplayImage = (avatar: string | undefined, gender: string | undefined) => {
        if (avatar && avatar.length > 50) return avatar;
        return null;
    };

    // ✅ دالة الأيقونات (تم إصلاح منطق الاستدعاء في الأسفل)
    const getSubjectIcon = (subjectName: string) => {
        if (!subjectName) return null;
        const name = subjectName.trim().toLowerCase();
        if (name.match(/اسلام|قرآن|دين/)) return <span className="text-2xl">🕌</span>;
        if (name.match(/عربي|لغتي/)) return <span className="text-2xl">📜</span>;
        if (name.match(/رياضيات|حساب/)) return <span className="text-2xl">📐</span>;
        if (name.match(/علوم|فيزياء|كيمياء/)) return <span className="text-2xl">🧪</span>;
        if (name.match(/انجليزي|english/)) return <span className="text-2xl">🅰️</span>;
        if (name.match(/حاسوب|تقنية/)) return <span className="text-2xl">💻</span>;
        if (name.match(/اجتماعيات|تاريخ| دراسات اجتماعية|/)) return <span className="text-2xl">🌍</span>;
        if (name.match(/رياضة|بدنية/)) return <span className="text-2xl">⚽</span>;
        if (name.match(/فنون|رسم/)) return <span className="text-2xl">🎨</span>;
        return <span className="text-xl opacity-50">📚</span>;
    };

    const handleSaveInfo = () => {
        onUpdateTeacherInfo({
            ...teacherInfo,
            name: editName,
            school: editSchool,
            subject: editSubject,
            governorate: editGovernorate,
            avatar: editAvatar,
            stamp: editStamp,
            ministryLogo: editMinistryLogo,
            academicYear: editAcademicYear,
            gender: editGender
        });
        onSemesterChange(editSemester);
        setShowEditModal(false);
    };

    const handleSaveScheduleSettings = () => {
        setPeriodTimes(tempPeriodTimes);
        onUpdateSchedule(tempSchedule);
        setShowScheduleModal(false);
    };

    const updateTempTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
        const newTimes = [...tempPeriodTimes];
        if(newTimes[index]) {
            newTimes[index] = { ...newTimes[index], [field]: value };
            setTempPeriodTimes(newTimes);
        }
    };

    const updateTempClass = (dayIdx: number, periodIdx: number, value: string) => {
        const newSchedule = [...tempSchedule];
        if(newSchedule[dayIdx]?.periods) {
            newSchedule[dayIdx].periods[periodIdx] = value;
            setTempSchedule(newSchedule);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setter(reader.result as string);
            reader.readAsDataURL(file);
        }
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
                { dayName: 'الأحد', periods: Array(8).fill('') },
                { dayName: 'الاثنين', periods: Array(8).fill('') },
                { dayName: 'الثلاثاء', periods: Array(8).fill('') },
                { dayName: 'الأربعاء', periods: Array(8).fill('') },
                { dayName: 'الخميس', periods: Array(8).fill('') }
            ];
            jsonData.forEach(row => {
                if (row.length < 2) return;
                const firstCell = String(row[0]).trim();
                const dayIndex = newSchedule.findIndex(d => d.dayName === firstCell || firstCell.includes(d.dayName));
                if (dayIndex !== -1) {
                    for (let i = 1; i <= 8; i++) {
                        if (row[i]) newSchedule[dayIndex].periods[i-1] = String(row[i]).trim();
                    }
                }
            });
            onUpdateSchedule(newSchedule);
            alert('تم استيراد الجدول بنجاح');
        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء استيراد الجدول.');
        } finally {
            setIsImportingSchedule(false);
            if (e.target) e.target.value = '';
            setShowSettingsDropdown(false);
        }
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
                        const startVal = row[1];
                        const endVal = row[2];
                        const parsedStart = parseExcelTime(startVal);
                        const parsedEnd = parseExcelTime(endVal);

                        if (parsedStart && newPeriodTimes[pIndex]) newPeriodTimes[pIndex].startTime = parsedStart;
                        if (parsedEnd && newPeriodTimes[pIndex]) newPeriodTimes[pIndex].endTime = parsedEnd;
                        if(parsedStart || parsedEnd) updatesCount++;
                    }
                }
            });

            if (updatesCount > 0) {
                setTempPeriodTimes(newPeriodTimes);
                alert(`تم تحديث توقيت ${updatesCount} حصص`);
            }
        } catch (error) {
            console.error(error);
            alert('خطأ في الملف');
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
                notifications: [{ id: 99999, title: '🔔 جرس', body: 'بداية الحصة', schedule: { at: new Date(Date.now() + 1000) }, sound: 'beep.wav' }]
            });
        }
    };

    const todayRaw = new Date().getDay();
    const dayIndex = (todayRaw === 5 || todayRaw === 6) ? 0 : todayRaw;
    const todaySchedule = schedule ? schedule[dayIndex] : { dayName: 'اليوم', periods: [] };
    const isToday = todayRaw === dayIndex;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            
            {/* 🟦 Header */}
            <header className="bg-[#446A8D] text-white pt-8 pb-8 px-6  shadow-xl relative z-20 -mx-4 -mt-4 mb-2">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        {/* صورة المعلم وزر التعديل */}
                        <div className="relative group">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-inner">
                                {getDisplayImage(teacherInfo.avatar, teacherInfo.gender) ? (
                                    <img src={teacherInfo.avatar} className="w-full h-full object-cover" alt="Teacher" onError={(e) => e.currentTarget.style.display='none'} />
                                ) : <DefaultAvatarSVG gender={teacherInfo.gender || 'male'} />}
                            </div>
                            <button 
                                onClick={() => setShowEditModal(true)} 
                                className="absolute -bottom-2 -right-2 bg-white text-[#1e3a8a] p-1.5 rounded-full shadow-lg border-2 border-[#1e3a8a] hover:scale-110 transition-transform"
                                title="تعديل البيانات"
                            >
                                <Edit3 size={12} strokeWidth={3} />
                            </button>
                        </div>

                        <div>
                            <h1 className="text-xl font-black tracking-wide">{teacherInfo.name || 'مرحباً بك'}</h1>
                            <p className="text-blue-200 text-xs font-bold opacity-90 flex items-center gap-1">
                                <School size={12} /> {teacherInfo.school || 'المدرسة'}
                            </p>
                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-lg mt-1 inline-block border border-white/10">
                                {currentSemester === '1' ? 'الفصل الأول' : 'الفصل الثاني'}
                            </span>
                        </div>
                    </div>
                    
                    {/* أزرار الهيدر */}
                    <div className="flex gap-2">
                        <div className="relative">
                            <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className={`w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center transition-all ${showSettingsDropdown ? 'bg-white text-[#1e3a8a]' : ''}`}>
                                <Settings size={20} />
                            </button>
                            {showSettingsDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowSettingsDropdown(false)}></div>
                                    <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden text-slate-800 animate-in zoom-in-95">
                                        <button onClick={() => { setShowEditModal(true); setShowSettingsDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-right border-b border-slate-50">
                                            <User size={16} className="text-indigo-600"/> <span className="text-xs font-bold">الهوية</span>
                                        </button>
                                        <button onClick={onToggleNotifications} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-right border-b border-slate-50">
                                            <AlarmClock size={16} className="text-rose-600"/> 
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">التنبيهات</span>
                                                <span className="text-[9px] text-slate-400">{notificationsEnabled ? 'مفعل' : 'معطل'}</span>
                                            </div>
                                        </button>
                                        <button onClick={handleTestNotification} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-right">
                                            <PlayCircle size={16} className="text-emerald-600"/> <span className="text-xs font-bold">تجربة الجرس</span>
                                        </button>
                                        <button onClick={() => scheduleFileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-right border-t border-slate-50">
                                            <Download size={16} className="text-emerald-600"/> 
                                            <span className="text-xs font-bold">استيراد جدول الحصص</span>
                                            {isImportingSchedule && <Loader2 size={14} className="ml-auto animate-spin" />}
                                        </button>
                                        <input type="file" ref={scheduleFileInputRef} onChange={handleImportSchedule} accept=".xlsx,.xls" className="hidden" />
                                    </div>
                                </>
                            )}
                        </div>
                        <button onClick={onToggleNotifications} className={`w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border transition-all ${notificationsEnabled ? 'bg-amber-400/20 border-amber-400/50 text-amber-300' : 'bg-white/10 border-white/10 text-white/60'}`}>
                            {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* الجدول اليومي */}
            <div className="px-4">
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

                        return (
                            <div key={idx} className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all ${isActive ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xl shadow-blue-200 scale-105 z-10' : 'bg-white border-slate-100 text-slate-600 hover:shadow-md'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                        {/* ✅ هنا الإصلاح: عرض الأيقونة إذا وجدت، وإلا عرض رقم الحصة */}
                                        {getSubjectIcon(subject) || (idx + 1)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-black text-sm ${isActive ? 'text-white' : 'text-slate-800'}`}>{subject}</h4>
                                            {isActive && <span className="text-[9px] bg-emerald-400 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">الآن</span>}
                                        </div>
                                        <span className={`text-[10px] font-bold ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>{time.startTime} - {time.endTime}</span>
                                    </div>
                                </div>
                                {isActive ? (
                                    <button onClick={() => onNavigate('attendance')} className="bg-white text-[#1e3a8a] px-3 py-2 rounded-lg font-bold text-xs shadow-lg flex items-center gap-1 active:scale-95">
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

            {/* Modal: Edit Identity */}
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

            {/* Modal: Schedule & Timing */}
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

