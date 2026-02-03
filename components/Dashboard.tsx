import React, { useState, useEffect, useRef } from 'react';
import { ScheduleDay, PeriodTime } from '../types';
import { 
  Bell, Clock, Edit3, Settings, 
  School, Download, Loader2, 
  PlayCircle, AlarmClock, ChevronLeft, User, Check, Camera
} from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import BrandLogo from './BrandLogo';

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

const BELL_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

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
    const { classes } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null); 
    const ministryLogoInputRef = useRef<HTMLInputElement>(null); 
    const scheduleFileInputRef = useRef<HTMLInputElement>(null);

    const [isImportingSchedule, setIsImportingSchedule] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // State for Menu
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

    // State for Teacher Info Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState(teacherInfo.name);
    const [editSchool, setEditSchool] = useState(teacherInfo.school);
    const [editSubject, setEditSubject] = useState(teacherInfo.subject);
    const [editGovernorate, setEditGovernorate] = useState(teacherInfo.governorate);
    const [editAvatar, setEditAvatar] = useState(teacherInfo.avatar || '');
    const [editStamp, setEditStamp] = useState(teacherInfo.stamp || '');
    const [editMinistryLogo, setEditMinistryLogo] = useState(teacherInfo.ministryLogo || '');
    const [editAcademicYear, setEditAcademicYear] = useState(teacherInfo.academicYear || '');
    const [editGender, setEditGender] = useState<'male' | 'female'>(teacherInfo.gender || 'male');
    const [editSemester, setEditSemester] = useState<'1' | '2'>(currentSemester);

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleTab, setScheduleTab] = useState<'timing' | 'classes'>('timing');
    const [editingDayIndex, setEditingDayIndex] = useState(0); 
    const [tempPeriodTimes, setTempPeriodTimes] = useState<PeriodTime[]>([]);
    const [tempSchedule, setTempSchedule] = useState<ScheduleDay[]>([]);

    useEffect(() => {
        setEditName(teacherInfo.name);
        setEditSchool(teacherInfo.school);
        setEditSubject(teacherInfo.subject);
        setEditGovernorate(teacherInfo.governorate);
        setEditAvatar(teacherInfo.avatar || '');
        setEditStamp(teacherInfo.stamp || '');
        setEditMinistryLogo(teacherInfo.ministryLogo || '');
        setEditAcademicYear(teacherInfo.academicYear || '');
        setEditGender(teacherInfo.gender || 'male');
        setEditSemester(currentSemester);
    }, [teacherInfo, currentSemester]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (showScheduleModal) {
            setTempPeriodTimes(JSON.parse(JSON.stringify(periodTimes)));
            setTempSchedule(JSON.parse(JSON.stringify(schedule)));
        }
    }, [showScheduleModal, periodTimes, schedule]);

    // 🎨 دالة الأيقونات
    const getSubjectIcon = (subjectName: string) => {
        if (!subjectName) return <span className="text-2xl filter drop-shadow-sm">📚</span>; 
        const name = subjectName.trim().toLowerCase();
        if (name.includes('اسلام') || name.includes('إسلام') || name.includes('قرآن') || name.includes('تلاوة')) return <span className="text-2xl filter drop-shadow-sm">🕌</span>;
        if (name.includes('عربي') || name.includes('لغتي') || name.includes('نحو')) return <span className="text-2xl filter drop-shadow-sm">📜</span>;
        if (name.includes('رياضيات') || name.includes('جبر') || name.includes('هندسة') || name.includes('math')) return <span className="text-2xl filter drop-shadow-sm">📐</span>;
        if (name.includes('علوم') || name.includes('كيمياء') || name.includes('فيزياء') || name.includes('science')) return <span className="text-2xl filter drop-shadow-sm">🧪</span>;
        if (name.includes('انجليزي') || name.includes('إنجليزي') || name.includes('english')) return <span className="text-2xl filter drop-shadow-sm">🅰️</span>;
        if (name.includes('حاسوب') || name.includes('تقنية') || name.includes('it') || name.includes('computer')) return <span className="text-2xl filter drop-shadow-sm">💻</span>;
        if (name.includes('دراسات') || name.includes('اجتماعيات') || name.includes('تاريخ') || name.includes('جغرافيا')) return <span className="text-2xl filter drop-shadow-sm">🌍</span>;
        if (name.includes('رياضة') || name.includes('بدنية') || name.includes('sport')) return <span className="text-2xl filter drop-shadow-sm">⚽</span>;
        if (name.includes('فنون') || name.includes('رسم') || name.includes('art')) return <span className="text-2xl filter drop-shadow-sm">🎨</span>;
        if (name.includes('موسيقى') || name.includes('music')) return <span className="text-2xl filter drop-shadow-sm">🎵</span>;
        if (name.includes('حياتية') || name.includes('مهنية')) return <span className="text-2xl filter drop-shadow-sm">🌱</span>;
        return <span className="text-2xl filter drop-shadow-sm">📚</span>;
    };

    const handleSaveInfo = () => {
        onUpdateTeacherInfo({
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
        newTimes[index] = { ...newTimes[index], [field]: value };
        setTempPeriodTimes(newTimes);
    };

    const updateTempClass = (dayIdx: number, periodIdx: number, value: string) => {
        const newSchedule = [...tempSchedule];
        newSchedule[dayIdx].periods[periodIdx] = value;
        setTempSchedule(newSchedule);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setEditAvatar(reader.result as string); reader.readAsDataURL(file); } };
    const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setEditStamp(reader.result as string); reader.readAsDataURL(file); } };
    const handleMinistryLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setEditMinistryLogo(reader.result as string); reader.readAsDataURL(file); } };

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
                        if (row[i]) {
                            newSchedule[dayIndex].periods[i-1] = String(row[i]).trim();
                        }
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
            setShowSettingsDropdown(false);
            if (e.target) e.target.value = '';
        }
    };

    const checkActivePeriod = (start: string, end: string) => {
        if (!start || !end) return false;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    };

    const handleTestNotification = async () => {
        try {
            const audio = new Audio(BELL_SOUND_URL);
            audio.volume = 1.0;
            await audio.play().catch(e => console.warn('Audio blocked', e));

            if (Capacitor.isNativePlatform()) {
                await LocalNotifications.schedule({
                    notifications: [{
                        id: 99999,
                        title: '🔔 تجربة الجرس',
                        body: 'هذا مثال على صوت جرس الحصة',
                        schedule: { at: new Date(Date.now() + 1000) },
                        sound: 'beep.wav'
                    }]
                });
            }
        } catch (e) {
            console.error('Test notification failed', e);
        }
    };

    // ✅ دالة جلب الصورة (مصححة لتعمل مع assets في الجذر)
    const getTeacherImage = () => {
        // إذا كان هناك صورة شخصية مرفوعة (Base64) استخدمها
        if (teacherInfo.avatar && teacherInfo.avatar.length > 50) return teacherInfo.avatar;
        
        // وإلا استخدم الصور من مجلد assets في الجذر
        // ملاحظة: './assets/...' تعني أن المجلد بجانب ملف index.html الناتج بعد البناء
        return teacherInfo.gender === 'female' ? './assets/teacher_woman.png' : './assets/teacher_man.png';
    };

    // ✅ دالة معاينة الصورة داخل المودال
    const getPreviewImage = () => {
        if (editAvatar && editAvatar.length > 50) return editAvatar;
        return editGender === 'female' ? './assets/teacher_woman.png' : './assets/teacher_man.png';
    };

    const today = new Date();
    const dayIndex = today.getDay();
    const todaySchedule = schedule[dayIndex] || { dayName: 'اليوم', periods: [] };
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    const isToday = todaySchedule.dayName === days[dayIndex];

    return (
        <div className="space-y-6 pb-20 text-slate-900 animate-in fade-in duration-500">
            
            {/* 1. Header Profile */}
            <header className="bg-[#1e3a8a] text-white pt-8 pb-10 px-6 rounded-b-[2.5rem] shadow-lg relative z-20 -mx-4 -mt-4 mb-2">
                <div className="flex items-center justify-between mb-8">
                    {/* Right: Logo & Welcome */}
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/20">
                            <BrandLogo className="w-6 h-6" showText={false} variant="light" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black leading-tight tracking-wide">راصد</h1>
                            <p className="text-[10px] text-blue-200 font-bold opacity-80">لوحة تحكم المعلم</p>
                        </div>
                    </div>

                    {/* Left: Menu & Notification */}
                    <div className="flex items-center gap-2">
                        
                        {/* Dropdown Menu */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} 
                                className={`p-2.5 rounded-xl transition-all border ${showSettingsDropdown ? 'bg-white text-[#1e3a8a] border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                            >
                                <Settings className={`w-6 h-6 ${showSettingsDropdown ? 'animate-spin-slow' : ''}`} />
                            </button>

                            {showSettingsDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowSettingsDropdown(false)}></div>
                                    
                                    <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-blue-50 overflow-hidden z-50 animate-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-left">
                                        <div className="flex flex-col py-1.5">
                                            {/* Import Schedule */}
                                            <button onClick={() => scheduleFileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right group border-b border-slate-50">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                                    <Download className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="text-xs font-bold text-slate-800">استيراد الجدول</span>
                                                    <span className="text-[9px] text-slate-400">ملف Excel</span>
                                                </div>
                                                {isImportingSchedule && <Loader2 className="w-3 h-3 animate-spin mr-auto text-blue-600"/>}
                                            </button>
                                            <input type="file" ref={scheduleFileInputRef} onChange={handleImportSchedule} accept=".xlsx, .xls" className="hidden" />

                                            {/* Schedule Times */}
                                            <button onClick={() => { setShowScheduleModal(true); setShowSettingsDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right group border-b border-slate-50">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                    <Clock className="w-4 h-4 text-slate-600" />
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="text-xs font-bold text-slate-800">توقيت الحصص</span>
                                                    <span className="text-[9px] text-slate-400">بداية ونهاية الحصة</span>
                                                </div>
                                            </button>

                                            {/* Notification Toggle */}
                                            <button onClick={() => { onToggleNotifications(); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right group">
                                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                                    <AlarmClock className="w-4 h-4 text-red-500" />
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="text-xs font-bold text-slate-800">منبه الحصص</span>
                                                    <span className="text-[9px] text-slate-400">تنبيه تلقائي</span>
                                                </div>
                                                <span className={`mr-auto text-[9px] font-bold px-2 py-0.5 rounded-md ${notificationsEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                    {notificationsEnabled ? 'ON' : 'OFF'}
                                                </span>
                                            </button>
                                            
                                            {/* Test Bell */}
                                            <button onClick={handleTestNotification} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right group border-t border-slate-50 bg-slate-50/50">
                                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                                    <PlayCircle className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">تجربة صوت الجرس</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Separate Bell Status Icon */}
                        <button onClick={onToggleNotifications} className={`p-2.5 rounded-full hover:bg-white/10 transition-colors relative group backdrop-blur-md border border-white/10 ${notificationsEnabled ? 'bg-white/20' : ''}`}>
                            <Bell className={`w-6 h-6 ${notificationsEnabled ? 'fill-white' : 'text-white'}`} />
                            {notificationsEnabled && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#1e3a8a]"></span>}
                        </button>
                    </div>
                </div>

                {/* Teacher Info Section */}
                <div className="flex items-center gap-5 mb-2 relative group cursor-pointer" onClick={() => setShowEditModal(true)}>
                    <div className="w-16 h-16 rounded-2xl bg-white text-[#1e3a8a] flex items-center justify-center shadow-lg border-2 border-blue-200 overflow-hidden shrink-0 relative">
                        {/* ✅ استخدام الدالة المصححة للصور */}
                        <img 
                            src={getTeacherImage()} 
                            className="w-full h-full object-cover" 
                            alt="Avatar" 
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        <div className="w-full h-full hidden items-center justify-center text-2xl font-black text-indigo-600 bg-indigo-50">
                            {teacherInfo.name ? teacherInfo.name.charAt(0) : 'T'}
                        </div>
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Edit3 className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-bold mb-1 leading-tight">{teacherInfo.name || 'مرحباً يا معلم'}</h2>
                        <div className="flex flex-col gap-0.5 text-blue-100 text-xs font-medium opacity-90">
                             <span className="flex items-center gap-1"><School className="w-3 h-3"/> {teacherInfo.school || 'المدرسة'}</span>
                             <span className="flex items-center gap-1 text-[10px] opacity-70">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                {currentSemester === '1' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'}
                             </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Schedule Section */}
            <div className="px-1">
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="text-right">
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 justify-end">
                            جدول {todaySchedule.dayName}
                            <Clock className="w-5 h-5 text-amber-500" />
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold">اليوم الدراسي الحالي</p>
                    </div>
                </div>
                
                {/* List View Schedule with Smart Icons */}
                <section className="space-y-3 pb-4">
                    {todaySchedule.periods && todaySchedule.periods.map((cls, idx) => {
                        if (!cls) return null;

                        const pt = periodTimes[idx] || { startTime: '00:00', endTime: '00:00' };
                        const isActive = isToday && checkActivePeriod(pt.startTime, pt.endTime);

                        return (
                            <div 
                                key={idx} 
                                className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition-all relative overflow-hidden ${isActive ? 'ring-2 ring-emerald-400 shadow-xl scale-[1.02]' : ''}`}
                            >
                                {isActive && <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>}

                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${isActive ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
                                        {getSubjectIcon(cls)}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-lg font-black text-slate-900 line-clamp-1">{cls}</h4>
                                            {isActive && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold animate-pulse">الآن</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 font-bold mt-0.5">
                                            الحصة {idx + 1} 
                                            {teacherInfo?.school ? ` • ${teacherInfo.school}` : ''}
                                        </p>
                                    </div>
                                </div>

                                {isActive ? (
                                    <button onClick={() => onNavigate('attendance')} className="bg-[#1e3a8a] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1">
                                        تحضير <ChevronLeft className="w-3 h-3"/>
                                    </button>
                                ) : (
                                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 min-w-[70px] text-center">
                                        <span className="text-xs font-black text-slate-600 block">{pt.startTime}</span>
                                        <span className="text-[9px] font-bold text-slate-400 block">{pt.endTime}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {todaySchedule.periods.every(p => !p) && (
                        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                            <p className="text-sm font-bold text-gray-400">لا توجد حصص لهذا اليوم</p>
                        </div>
                    )}
                </section>
            </div>

            {/* Modals - Edit Profile */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} className="max-w-md rounded-[2rem]">
                <div className="text-center">
                    <h3 className="font-black text-xl mb-4 text-slate-800">تعديل البيانات</h3>
                    
                    {/* ✅ معاينة الصورة داخل المودال */}
                    <div className="w-24 h-24 mx-auto mb-4 relative group">
                        <img 
                            src={getPreviewImage()}
                            className="w-full h-full rounded-[1.5rem] object-cover border-4 border-slate-100 shadow-md"
                            alt="Profile"
                        />
                        <button onClick={() => setEditAvatar('')} className="absolute -bottom-2 -right-2 bg-red-500 text-white p-1.5 rounded-full text-[10px] shadow-md border-2 border-white hover:bg-red-600 active:scale-90 transition-transform" title="حذف الصورة والعودة للافتراضي">
                            <span className="font-bold px-1">×</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="الاسم" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800" />
                            <input value={editSchool} onChange={e => setEditSchool(e.target.value)} placeholder="المدرسة" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800" />
                        </div>
                        <input value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="المادة" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800" />
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editGovernorate} onChange={e => setEditGovernorate(e.target.value)} placeholder="المحافظة" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800" />
                            <input value={editAcademicYear} onChange={e => setEditAcademicYear(e.target.value)} placeholder="العام الدراسي" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800" />
                        </div>

                        {/* الفصل الدراسي والجنس */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 flex">
                                <button onClick={() => setEditSemester('1')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editSemester === '1' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>فصل 1</button>
                                <button onClick={() => setEditSemester('2')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editSemester === '2' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>فصل 2</button>
                            </div>
                            <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 flex">
                                <button onClick={() => { setEditGender('male'); setEditAvatar(''); }} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editGender === 'male' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>معلم 👨‍🏫</button>
                                <button onClick={() => { setEditGender('female'); setEditAvatar(''); }} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editGender === 'female' ? 'bg-white shadow text-pink-600' : 'text-gray-400'}`}>معلمة 👩‍🏫</button>
                            </div>
                        </div>

                        {/* الصور والشعارات */}
                        <div className="space-y-2 pt-2 border-t border-gray-100 mt-2">
                             <div className="flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 flex items-center justify-center gap-2 border border-indigo-100">
                                    <User className="w-4 h-4"/> صورتك
                                </button>
                                <button onClick={() => stampInputRef.current?.click()} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 flex items-center justify-center gap-2 border border-blue-100">
                                    <Check className="w-4 h-4"/> الختم
                                </button>
                                <button onClick={() => ministryLogoInputRef.current?.click()} className="flex-1 py-3 bg-amber-50 text-amber-600 rounded-xl font-bold text-xs hover:bg-amber-100 flex items-center justify-center gap-2 border border-amber-100">
                                    <School className="w-4 h-4"/> الشعار
                                </button>
                             </div>
                             <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*"/>
                             <input type="file" ref={stampInputRef} onChange={handleStampUpload} className="hidden" accept="image/*"/>
                             <input type="file" ref={ministryLogoInputRef} onChange={handleMinistryLogoUpload} className="hidden" accept="image/*"/>
                        </div>

                        <button onClick={handleSaveInfo} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm shadow-lg hover:bg-slate-800 transition-all">حفظ التغييرات</button>
                    </div>
                </div>
            </Modal>

            {/* Modal - Schedule Settings */}
            <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} className="max-w-4xl rounded-[2rem]">
                <div className="flex flex-col h-[80vh]">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h3 className="font-black text-xl text-slate-800">إعدادات الجدول والتوقيت</h3>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                             <button onClick={() => setScheduleTab('timing')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${scheduleTab === 'timing' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>التوقيت</button>
                             <button onClick={() => setScheduleTab('classes')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${scheduleTab === 'classes' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>الحصص</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {scheduleTab === 'timing' ? (
                            <div className="space-y-3">
                                {tempPeriodTimes.map((pt, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-black text-slate-500 border border-gray-200">{pt.periodNumber}</div>
                                        <div className="flex-1 flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-gray-400 block mb-1">بداية الحصة</label>
                                                <input type="time" value={pt.startTime} onChange={(e) => updateTempTime(idx, 'startTime', e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 text-slate-800" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-gray-400 block mb-1">نهاية الحصة</label>
                                                <input type="time" value={pt.endTime} onChange={(e) => updateTempTime(idx, 'endTime', e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 text-slate-800" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {tempSchedule.map((day, idx) => (
                                        <button key={idx} onClick={() => setEditingDayIndex(idx)} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${editingDayIndex === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'}`}>
                                            {day.dayName}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {tempSchedule[editingDayIndex]?.periods.map((cls, pIdx) => (
                                        <div key={pIdx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                            <span className="text-xs font-black text-gray-400 w-16">حصة {pIdx + 1}</span>
                                            <input 
                                                value={cls} 
                                                onChange={(e) => updateTempClass(editingDayIndex, pIdx, e.target.value)} 
                                                placeholder="اسم الفصل / المادة" 
                                                className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500 text-slate-800" 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4 shrink-0">
                        <button onClick={handleSaveScheduleSettings} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm shadow-lg hover:bg-slate-800 transition-all">حفظ الجدول والتوقيت</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
