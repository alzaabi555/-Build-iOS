import React, { useState, useRef } from 'react';
import { Student, ScheduleDay, PeriodTime } from '../types';
import { Users, Calendar, Clock, Settings, Bell, BellOff, User, BookOpen, Timer, Save, X, Upload } from 'lucide-react';
import Modal from './Modal';
import * as XLSX from 'xlsx';

interface DashboardProps {
    students: Student[];
    teacherInfo: any;
    onUpdateTeacherInfo: (info: any) => void;
    schedule: ScheduleDay[];
    onUpdateSchedule: (schedule: ScheduleDay[]) => void;
    onSelectStudent: (s: Student) => void;
    onNavigate: (tab: string) => void;
    onOpenSettings: () => void;
    periodTimes: PeriodTime[];
    setPeriodTimes: (times: PeriodTime[]) => void;
    notificationsEnabled: boolean;
    onToggleNotifications: () => void;
    currentSemester: '1' | '2';
    onSemesterChange: (sem: '1' | '2') => void;
}

const getImg = (path: string) => `/${path}`;

const Dashboard: React.FC<DashboardProps> = ({ 
    students, teacherInfo, onUpdateTeacherInfo, schedule, onUpdateSchedule, periodTimes, setPeriodTimes,
    currentSemester, onSemesterChange,
    onOpenSettings, notificationsEnabled, onToggleNotifications
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'profile' | 'schedule' | 'timing'>('schedule');
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);

    const fileInputScheduleRef = useRef<HTMLInputElement>(null);
    const fileInputTimingRef = useRef<HTMLInputElement>(null);

    const getDisplayImage = (avatar: string | undefined, gender: string | undefined) => {
        if (avatar && (avatar.startsWith('data:image') || avatar.length > 50)) {
            return avatar; 
        }
        return getImg(gender === 'female' ? 'teacher-female.png' : 'teacher-male.png');
    };

    const today = new Date().toLocaleDateString('ar-OM', { weekday: 'long' });
    const todaySchedule = schedule.find(s => s.dayName === today);
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

    const handleSubjectChange = (dayIndex: number, periodIndex: number, val: string) => {
        const newSchedule = [...schedule];
        // Ensure the day exists
        if (!newSchedule[dayIndex]) {
            newSchedule[dayIndex] = { dayName: days[dayIndex], periods: Array(8).fill('') };
        }
        const newPeriods = [...newSchedule[dayIndex].periods];
        newPeriods[periodIndex] = val;
        newSchedule[dayIndex] = { ...newSchedule[dayIndex], periods: newPeriods };
        onUpdateSchedule(newSchedule);
    };

    const handleTimeChange = (index: number, field: 'startTime' | 'endTime', val: string) => {
        const newTimes = [...periodTimes];
        newTimes[index] = { ...newTimes[index], [field]: val };
        setPeriodTimes(newTimes);
    };

    const formatExcelTime = (val: any): string => {
        if (!val) return '';
        if (typeof val === 'number') {
            const totalMinutes = Math.round(val * 24 * 60);
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        const str = String(val).trim();
        const match = str.match(/(\d{1,2}):(\d{2})/);
        if (match) {
             let h = parseInt(match[1]);
             const m = match[2];
             return `${String(h).padStart(2, '0')}:${m}`;
        }
        return '';
    };

    const handleImportSchedule = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            const dayMap: {[key:string]: string} = {
                'الأحد': 'الأحد', 'sun': 'الأحد',
                'الاثنين': 'الاثنين', 'الإثنين': 'الاثنين', 'mon': 'الاثنين',
                'الثلاثاء': 'الثلاثاء', 'tue': 'الثلاثاء',
                'الأربعاء': 'الأربعاء', 'wed': 'الأربعاء',
                'الخميس': 'الخميس', 'thu': 'الخميس'
            };

            const newSchedule = [...schedule];
            let found = false;

            jsonData.forEach((row) => {
                if (row.length > 0 && typeof row[0] === 'string') {
                    const cell0 = row[0].trim().toLowerCase();
                    let matchedDay = '';
                    for(const key in dayMap) {
                        if(cell0.includes(key)) {
                            matchedDay = dayMap[key];
                            break;
                        }
                    }
                    
                    if (matchedDay) {
                        const dayIndex = newSchedule.findIndex(s => s.dayName === matchedDay);
                        if (dayIndex !== -1) {
                            const periods = newSchedule[dayIndex].periods.map((p, idx) => {
                                // Skip first column (Day name)
                                return row[idx + 1] ? String(row[idx + 1]).trim() : p;
                            });
                            newSchedule[dayIndex] = { ...newSchedule[dayIndex], periods };
                            found = true;
                        }
                    }
                }
            });

            if(found) {
                onUpdateSchedule(newSchedule);
                alert('تم تحديث الجدول من الملف بنجاح');
            } else {
                alert('لم يتم العثور على أيام في الملف. تأكد من وجود عمود للأيام (الأحد، الاثنين...)');
            }
        } catch (err) {
            console.error(err);
            alert('خطأ في قراءة الملف');
        }
        if (e.target) e.target.value = '';
    };

    const handleImportTiming = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            const newTimes = [...periodTimes];
            let found = false;
            
            jsonData.forEach(row => {
                if (row.length >= 3) {
                     const firstCell = String(row[0]).trim();
                     const match = firstCell.match(/(\d+)/);
                     if (match) {
                         const pNum = parseInt(match[1]);
                         if (pNum >= 1 && pNum <= 8) {
                             const startTime = formatExcelTime(row[1]);
                             const endTime = formatExcelTime(row[2]);
                             
                             if (startTime && endTime) {
                                 newTimes[pNum - 1] = { periodNumber: pNum, startTime, endTime };
                                 found = true;
                             }
                         }
                     }
                }
            });
            
            if (found) {
                setPeriodTimes(newTimes);
                alert('تم تحديث التوقيت من الملف بنجاح');
            } else {
                alert('لم يتم العثور على بيانات توقيت صالحة.\nالصيغة المطلوبة: رقم الحصة | البداية | النهاية');
            }
        } catch (err) {
            console.error(err);
            alert('خطأ في قراءة الملف');
        }
        if (e.target) e.target.value = '';
    }

    return (
        <div className="space-y-6 pb-20">
            <header className="flex items-center justify-between">
                 <div>
                     <h1 className="text-2xl font-black text-slate-800">لوحة التحكم</h1>
                     <p className="text-slate-500 text-sm font-bold">ملخص اليوم الدراسي</p>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => onSemesterChange(currentSemester === '1' ? '2' : '1')} className="px-4 py-2 bg-white rounded-xl text-xs font-black shadow-sm border border-slate-200">
                         الفصل {currentSemester}
                     </button>
                 </div>
            </header>

            {/* Teacher Profile Summary */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center overflow-hidden border-2 border-indigo-100">
                    <img 
                        src={getDisplayImage(teacherInfo.avatar, teacherInfo.gender)} 
                        alt="Teacher" 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-800">{teacherInfo.name || 'مرحباً بك'}</h2>
                    <p className="text-slate-500 text-xs font-bold">{teacherInfo.school}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-200">
                    <Users className="w-8 h-8 mb-4 opacity-80" />
                    <h3 className="text-3xl font-black">{students.length}</h3>
                    <p className="text-indigo-200 text-xs font-bold">إجمالي الطلاب</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <Calendar className="w-8 h-8 mb-4 text-emerald-500" />
                    <h3 className="text-xl font-black text-slate-800">{today}</h3>
                    <p className="text-slate-400 text-xs font-bold">اليوم</p>
                </div>
            </div>

            {/* Schedule */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        جدول اليوم
                    </h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onToggleNotifications} 
                            className={`p-2 rounded-xl transition-colors ${notificationsEnabled ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}
                        >
                            {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                        </button>
                        <button 
                            onClick={() => setIsSettingsOpen(true)} 
                            className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                            <Settings size={18} />
                        </button>
                    </div>
                </div>
                <div className="space-y-3">
                    {todaySchedule && todaySchedule.periods.some(p => p) ? (
                        todaySchedule.periods.map((subject, idx) => {
                            if(!subject) return null;
                            const time = periodTimes[idx];
                            return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                            {idx + 1}
                                        </div>
                                        <span className="font-bold text-slate-700">{subject}</span>
                                    </div>
                                    {time && <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">{time.startTime} - {time.endTime}</span>}
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-center text-slate-400 text-sm font-bold py-4">لا يوجد حصص مسجلة لهذا اليوم</p>
                    )}
                </div>
            </div>

            {/* Unified Settings Modal */}
            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} className="max-w-md w-full rounded-[2rem] max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                    <h3 className="font-black text-lg text-slate-800">الإعدادات السريعة</h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100"><X size={18} className="text-slate-500" /></button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                    <button onClick={() => setSettingsTab('schedule')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${settingsTab === 'schedule' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>
                        <BookOpen size={14} /> المواد
                    </button>
                    <button onClick={() => setSettingsTab('timing')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${settingsTab === 'timing' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>
                        <Timer size={14} /> التوقيت
                    </button>
                    <button onClick={() => setSettingsTab('profile')} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${settingsTab === 'profile' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>
                        <User size={14} /> الملف
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[60vh] custom-scrollbar p-1">
                    
                    {/* 1. Schedule Settings */}
                    {settingsTab === 'schedule' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-xl">
                                <span className="text-xs font-bold text-indigo-700">تعبئة الجدول من Excel</span>
                                <button onClick={() => fileInputScheduleRef.current?.click()} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:bg-indigo-700">
                                    <Upload size={12} /> استيراد
                                </button>
                                <input type="file" ref={fileInputScheduleRef} onChange={handleImportSchedule} accept=".xlsx,.xls" className="hidden" />
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {days.map((day, idx) => (
                                    <button 
                                        key={day} 
                                        onClick={() => setSelectedDayIndex(idx)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${selectedDayIndex === idx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {Array(8).fill(0).map((_, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{idx + 1}</div>
                                        <input 
                                            type="text" 
                                            placeholder={`الحصة ${idx + 1}`}
                                            value={schedule[selectedDayIndex]?.periods[idx] || ''}
                                            onChange={(e) => handleSubjectChange(selectedDayIndex, idx, e.target.value)}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-800"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. Timing Settings */}
                    {settingsTab === 'timing' && (
                        <div className="space-y-3 animate-in fade-in">
                            <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-xl mb-2">
                                <span className="text-xs font-bold text-indigo-700">تعبئة التوقيت من Excel</span>
                                <button onClick={() => fileInputTimingRef.current?.click()} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:bg-indigo-700">
                                    <Upload size={12} /> استيراد
                                </button>
                                <input type="file" ref={fileInputTimingRef} onChange={handleImportTiming} accept=".xlsx,.xls" className="hidden" />
                            </div>

                            <div className="flex justify-between px-2 mb-2">
                                <span className="text-[10px] font-bold text-slate-400">الحصة</span>
                                <span className="text-[10px] font-bold text-slate-400 mr-8">بداية</span>
                                <span className="text-[10px] font-bold text-slate-400">نهاية</span>
                            </div>
                            {periodTimes.map((period, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">{idx + 1}</div>
                                    <input 
                                        type="time" 
                                        value={period.startTime} 
                                        onChange={(e) => handleTimeChange(idx, 'startTime', e.target.value)}
                                        className="flex-1 bg-transparent text-center font-mono font-bold text-xs outline-none text-slate-800"
                                    />
                                    <span className="text-slate-300">-</span>
                                    <input 
                                        type="time" 
                                        value={period.endTime} 
                                        onChange={(e) => handleTimeChange(idx, 'endTime', e.target.value)}
                                        className="flex-1 bg-transparent text-center font-mono font-bold text-xs outline-none text-slate-800"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 3. Profile Settings */}
                    {settingsTab === 'profile' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">الاسم</label>
                                <input 
                                    type="text" 
                                    value={teacherInfo.name} 
                                    onChange={(e) => onUpdateTeacherInfo({...teacherInfo, name: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">المدرسة</label>
                                <input 
                                    type="text" 
                                    value={teacherInfo.school} 
                                    onChange={(e) => onUpdateTeacherInfo({...teacherInfo, school: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">الجنس</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onUpdateTeacherInfo({...teacherInfo, gender: 'male'})}
                                        className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${teacherInfo.gender !== 'female' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        معلم 👨‍🏫
                                    </button>
                                    <button 
                                        onClick={() => onUpdateTeacherInfo({...teacherInfo, gender: 'female'})}
                                        className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${teacherInfo.gender === 'female' ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                        معلمة 👩‍🏫
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                    <button onClick={() => setIsSettingsOpen(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2">
                        <Save size={16} /> حفظ وإغلاق
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;