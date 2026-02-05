import React, { useState, useEffect, useRef } from 'react';
import { ScheduleDay, PeriodTime } from '../types';
import { 
  Bell, Clock, Settings, 
  School, Download, Loader2, 
  PlayCircle, AlarmClock, ChevronLeft, User, Check, Camera
} from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// --- صورة افتراضية برمجية (SVG) ---
// هذا الرسم يتم إنشاؤه بالكود ولا يحتاج لملفات صور، مما يمنع الشاشة البيضاء
const DefaultTeacherAvatar = ({ gender }: { gender: string }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full bg-indigo-50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="40" r="15" fill={gender === 'female' ? '#f472b6' : '#60a5fa'} opacity="0.8"/>
        <path d="M20 90 C20 70 35 60 50 60 C65 60 80 70 80 90" fill={gender === 'female' ? '#f472b6' : '#60a5fa'} opacity="0.6"/>
        <circle cx="50" cy="50" r="48" stroke="#e2e8f0" strokeWidth="2" fill="none"/>
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
} ) => {
    // حماية ضد البيانات المفقودة
    if (!teacherInfo) {
        return <div className="flex items-center justify-center h-screen text-slate-500 font-bold">جاري تحميل البيانات...</div>;
    }

    const { classes } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null); 
    const ministryLogoInputRef = useRef<HTMLInputElement>(null); 
    const modalScheduleFileInputRef = useRef<HTMLInputElement>(null);

    const [isImportingPeriods, setIsImportingPeriods] = useState(false);
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
    const [editSemester, setEditSemester] = useState<'1' | '2'>(currentSemester || '1');

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleTab, setScheduleTab] = useState<'timing' | 'classes'>('timing');
    const [editingDayIndex, setEditingDayIndex] = useState(0); 
    const [tempPeriodTimes, setTempPeriodTimes] = useState<PeriodTime[]>([]);
    const [tempSchedule, setTempSchedule] = useState<ScheduleDay[]>([]);

    useEffect(() => {
        if (showEditModal && teacherInfo) {
            setEditName(teacherInfo.name || '');
            setEditSchool(teacherInfo.school || '');
            setEditSubject(teacherInfo.subject || '');
            setEditGovernorate(teacherInfo.governorate || '');
            setEditAvatar(teacherInfo.avatar);
            setEditStamp(teacherInfo.stamp);
            setEditMinistryLogo(teacherInfo.ministryLogo);
            setEditAcademicYear(teacherInfo.academicYear || '');
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

    // دالة لاستخراج الأيقونة المناسبة للمادة
    const getSubjectIcon = (subjectName: string) => {
        const teacherSubject = teacherInfo?.subject || '';
        const matchIcon = (text: string) => {
            if (!text) return null;
            const name = text.trim().toLowerCase();
            if (name.match(/اسلام|إسلام|قرآن|تلاوة|توحيد|فقه|حديث|عقيدة/)) return <span className="text-2xl filter drop-shadow-sm">🕌</span>;
            if (name.match(/عربي|لغتي|نحو|أدب|قراءة|مطالعة/)) return <span className="text-2xl filter drop-shadow-sm">📜</span>;
            if (name.match(/رياضيات|جبر|هندسة|حساب|math/)) return <span className="text-2xl filter drop-shadow-sm">📐</span>;
            if (name.match(/علوم|كيمياء|فيزياء|أحياء|science|phy|chem/)) return <span className="text-2xl filter drop-shadow-sm">🧪</span>;
            if (name.match(/انجليزي|إنجليزي|english|eng/)) return <span className="text-2xl filter drop-shadow-sm">🅰️</span>;
            if (name.match(/حاسوب|تقنية|كمبيوتر|رقمية|it|computer|tech/)) return <span className="text-2xl filter drop-shadow-sm">💻</span>;
            if (name.match(/دراسات|اجتماعيات|تاريخ|جغرافيا|وطنية|مواطنة/)) return <span className="text-2xl filter drop-shadow-sm">🌍</span>;
            if (name.match(/رياضة|بدنية|sport|gym|pe/)) return <span className="text-2xl filter drop-shadow-sm">⚽</span>;
            if (name.match(/فنون|رسم|تشكيلية|art|draw/)) return <span className="text-2xl filter drop-shadow-sm">🎨</span>;
            if (name.match(/موسيقى|music/)) return <span className="text-2xl filter drop-shadow-sm">🎵</span>;
            if (name.match(/حياتية|مهنية|أسرية|بحث|توجيه/)) return <span className="text-2xl filter drop-shadow-sm">🌱</span>;
            return null;
        };
        const specificIcon = matchIcon(subjectName);
        if (specificIcon) return specificIcon;
        const defaultIcon = matchIcon(teacherSubject);
        if (defaultIcon) return defaultIcon;
        return <span className="text-2xl filter drop-shadow-sm opacity-50">📚</span>;
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
            gender: teacherInfo.gender // الحفاظ على الجنس الحالي
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
        if(newSchedule[dayIdx] && newSchedule[dayIdx].periods) {
            newSchedule[dayIdx].periods[periodIdx] = value;
            setTempSchedule(newSchedule);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setEditAvatar(reader.result as string); reader.readAsDataURL(file); } };
    const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setEditStamp(reader.result as string); reader.readAsDataURL(file); } };
    const handleMinistryLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setEditMinistryLogo(reader.result as string); reader.readAsDataURL(file); } };

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
                alert(`تم تحديث توقيت ${updatesCount} حصص بنجاح ✅`);
            } else {
                alert('لم يتم العثور على بيانات توقيت صالحة. تأكد من أن العمود الأول يحتوي على رقم الحصة.');
            }

        } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء قراءة الملف.');
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
                    notifications: [{ id: 99999, title: '🔔 تجربة الجرس', body: 'صوت جرس الحصة', schedule: { at: new Date(Date.now() + 1000) }, sound: 'beep.wav' }]
                });
            }
        } catch (e) { console.error('Test notification failed', e); }
    };

    const today = new Date();
    const dayIndex = today.getDay();
    const todaySchedule = schedule ? (schedule[dayIndex] || { dayName: 'اليوم', periods: [] }) : { dayName: 'اليوم', periods: [] };
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    const isToday = todaySchedule.dayName === days[dayIndex];

    return (
        <div className="space-y-6 pb-20 text-slate-900 animate-in fade-in duration-500">
            
            <header className="bg-[#1e3a8a] text-white pt-8 pb-10 px-6 rounded-b-[2.5rem] shadow-lg relative z-20 -mx-4 -mt-4 mb-2">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/20">
                            {/* استبدلنا BrandLogo بأيقونة School العادية لضمان العمل */}
                            <School className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black leading-tight tracking-wide">راصد</h1>
                            <p className="text-[10px] text-blue-200 font-bold opacity-80">لوحة تحكم المعلم</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className={`p-2.5 rounded-xl transition-all border ${showSettingsDropdown ? 'bg-white text-[#1e3a8a] border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                                <Settings className={`w-6 h-6 ${showSettingsDropdown ? 'animate-spin-slow' : ''}`} />
                            </button>
                            {showSettingsDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowSettingsDropdown(false)}></div>
                                    <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-blue-50 overflow-hidden z-50 animate-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-left">
                                        <div className="flex flex-col py-1.5">
                                            <button onClick={() => { setShowEditModal(true); setShowSettingsDropdown(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right group border-b border-slate-50">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0"><Settings className="w-4 h-4 text-indigo-600" /></div>
                                                <div className="flex flex-col items-start"><span className="text-xs font-bold text-slate-800">هوية المعلم</span><span className="text-[9px] text-slate-400">البيانات والصور</span></div>
                                            </button>
                                            
                                            <button onClick={onToggleNotifications} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right group">
                                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0"><AlarmClock className="w-4 h-4 text-red-500" /></div>
                                                <div className="flex flex-col items-start"><span className="text-xs font-bold text-slate-800">منبه الحصص</span><span className="text-[9px] text-slate-400">تنبيه تلقائي</span></div>
                                                <span className={`mr-auto text-[9px] font-bold px-2 py-0.5 rounded-md ${notificationsEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{notificationsEnabled ? 'ON' : 'OFF'}</span>
                                            </button>
                                            <button onClick={handleTestNotification} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-right group border-t border-slate-50 bg-slate-50/50">
                                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0"><PlayCircle className="w-4 h-4 text-slate-500" /></div><span className="text-xs font-bold text-slate-600">تجربة صوت الجرس</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <button onClick={onToggleNotifications} className={`p-2.5 rounded-full hover:bg-white/10 transition-colors relative group backdrop-blur-md border border-white/10 ${notificationsEnabled ? 'bg-white/20' : ''}`}>
                            <Bell className={`w-6 h-6 ${notificationsEnabled ? 'fill-white' : 'text-white'}`} />
                            {notificationsEnabled && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#1e3a8a]"></span>}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-5 mb-2 relative">
                    <div className="w-20 h-20 rounded-[1.2rem] bg-white text-[#1e3a8a] flex items-center justify-center shadow-lg border-2 border-blue-200 overflow-hidden shrink-0 relative group">
                        {/* عرض الأفاتار: إذا كان موجوداً نعرضه، وإلا نعرض الرسم البرمجي */}
                        {teacherInfo.avatar ? (
                            <img 
                                src={teacherInfo.avatar} 
                                className="w-full h-full object-cover" 
                                alt="Avatar" 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                            />
                        ) : (
                            <DefaultTeacherAvatar gender={teacherInfo.gender || 'male'} />
                        )}
                        {/* هذا السطر احتياطي في حالة اختفاء الصورة بعد الخطأ */}
                        {teacherInfo.avatar && <div className="absolute inset-0 -z-10"><DefaultTeacherAvatar gender={teacherInfo.gender || 'male'} /></div>}
                    </div>
                    
                    <div className="flex flex-col flex-1 gap-1">
                        <div className="flex items-start justify-between w-full">
                            <div>
                                <h2 className="text-2xl font-bold leading-tight">{teacherInfo.name || 'مرحباً يا معلم'}</h2>
                                <p className="text-xs text-blue-200 font-medium opacity-90 mt-1 flex items-center gap-1">
                                    <School className="w-3 h-3"/> {teacherInfo.school || 'المدرسة'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                             <span className="text-[10px] bg-blue-500/30 px-2 py-0.5 rounded-lg border border-blue-400/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                {currentSemester === '1' ? 'الفصل الأول' : 'الفصل الثاني'}
                             </span>
                        </div>
                    </div>
                </div>
            </header>
            <div className="px-1">
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="text-right">
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 justify-end">
                            جدول {todaySchedule.dayName}
                            <Clock className="w-5 h-5 text-amber-500" />
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold">اليوم الدراسي الحالي</p>
                    </div>
                    <button 
                        onClick={() => setShowScheduleModal(true)} 
                        className="bg-white hover:bg-slate-50 text-slate-600 p-2.5 rounded-xl transition-all border border-slate-200 active:scale-95 shadow-sm"
                        title="إعدادات الجدول والتوقيت"
                    >
                        <Clock className="w-5 h-5" />
                    </button>
                </div>
                
                <section className="space-y-3 pb-4">
                    {todaySchedule.periods && todaySchedule.periods.map((cls, idx) => {
                        if (!cls) return null;
                        const pt = periodTimes[idx] || { startTime: '00:00', endTime: '00:00' };
                        const isActive = isToday && checkActivePeriod(pt.startTime, pt.endTime);
                        return (
                            <div key={idx} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition-all relative overflow-hidden ${isActive ? 'ring-2 ring-emerald-400 shadow-xl scale-[1.02]' : ''}`}>
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
                                        <p className="text-xs text-slate-500 font-bold mt-0.5">الحصة {idx + 1} {teacherInfo?.school ? ` • ${teacherInfo.school}` : ''}</p>
                                    </div>
                                </div>
                                {isActive ? (
                                    <button onClick={() => onNavigate('attendance')} className="bg-[#1e3a8a] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1">تحضير <ChevronLeft className="w-3 h-3"/></button>
                                ) : (
                                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 min-w-[70px] text-center">
                                        <span className="text-xs font-black text-slate-600 block">{pt.startTime}</span>
                                        <span className="text-[9px] font-bold text-slate-400 block">{pt.endTime}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {(!todaySchedule.periods || todaySchedule.periods.every(p => !p)) && (
                        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200"><p className="text-sm font-bold text-gray-400">لا توجد حصص لهذا اليوم</p></div>
                    )}
                </section>
            </div>

            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} className="max-w-md rounded-[2rem]">
                <div className="text-center">
                    <h3 className="font-black text-xl mb-4 text-slate-800">تعديل هوية المعلم</h3>
                    <div className="w-24 h-24 mx-auto mb-4 relative group">
                        {editAvatar ? (
                            <img 
                                src={editAvatar} 
                                className="w-full h-full rounded-[1.5rem] object-cover border-4 border-slate-100 shadow-md"
                                alt="Profile"
                            />
                        ) : (
                            <div className="w-full h-full rounded-[1.5rem] border-4 border-slate-100 shadow-md overflow-hidden">
                                <DefaultTeacherAvatar gender={editGender} />
                            </div>
                        )}
                        <button onClick={() => setEditAvatar(undefined)} className="absolute -bottom-2 -right-2 bg-red-500 text-white p-1.5 rounded-full text-[10px] shadow-md border-2 border-white hover:bg-red-600 active:scale-90 transition-transform z-20" title="حذف الصورة">
                            <span className="font-bold px-1">×</span>
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="الاسم" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                            <input value={editSchool} onChange={e => setEditSchool(e.target.value)} placeholder="المدرسة" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                        </div>
                        <input value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="المادة" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                        <div className="grid grid-cols-2 gap-3">
                            <input value={editGovernorate} onChange={e => setEditGovernorate(e.target.value)} placeholder="المحافظة" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                            <input value={editAcademicYear} onChange={e => setEditAcademicYear(e.target.value)} placeholder="العام الدراسي" className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none text-slate-800 focus:border-indigo-500 transition-colors" />
                        </div>

                        <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 flex">
                            <button onClick={() => setEditSemester('1')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editSemester === '1' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>فصل 1</button>
                            <button onClick={() => setEditSemester('2')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${editSemester === '2' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>فصل 2</button>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-100 mt-2">
                             <div className="flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 flex items-center justify-center gap-2 border border-indigo-100 transition-colors">
                                    <Camera className="w-4 h-4"/> صورتك
                                </button>
                                <button onClick={() => stampInputRef.current?.click()} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 flex items-center justify-center gap-2 border border-blue-100 transition-colors">
                                    <Check className="w-4 h-4"/> الختم
                                </button>
                                <button onClick={() => ministryLogoInputRef.current?.click()} className="flex-1 py-3 bg-amber-50 text-amber-600 rounded-xl font-bold text-xs hover:bg-amber-100 flex items-center justify-center gap-2 border border-amber-100 transition-colors">
                                    <School className="w-4 h-4"/> الشعار
                                </button>
                             </div>
                             <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*"/>
                             <input type="file" ref={stampInputRef} onChange={handleStampUpload} className="hidden" accept="image/*"/>
                             <input type="file" ref={ministryLogoInputRef} onChange={handleMinistryLogoUpload} className="hidden" accept="image/*"/>
                        </div>

                        <button onClick={handleSaveInfo} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-95">حفظ التغييرات</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} className="max-w-4xl rounded-[2rem]">
                <div className="flex flex-col h-[80vh]">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h3 className="font-black text-xl text-slate-800">إعدادات الجدول والتوقيت</h3>
                        
                        <div className="flex gap-2">
                            <button onClick={() => modalScheduleFileInputRef.current?.click()} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors border border-indigo-100">
                                <Download className="w-4 h-4" />
                                <span>{isImportingPeriods ? 'جاري...' : 'استيراد'}</span>
                            </button>
                            <input type="file" ref={modalScheduleFileInputRef} onChange={handleImportPeriodTimes} accept=".xlsx, .xls" className="hidden" />
                            
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button onClick={() => setScheduleTab('timing')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${scheduleTab === 'timing' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>التوقيت</button>
                                <button onClick={() => setScheduleTab('classes')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${scheduleTab === 'classes' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>الحصص</button>
                            </div>
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
