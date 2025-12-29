
import React, { useState } from 'react';
import { Student, ScheduleDay, PeriodTime } from '../types';
import { PieChart, Pie, Cell } from 'recharts';
import { Award, AlertCircle, Sun, Moon, Coffee, Calendar, Edit2, X, Clock, ArrowRight, FileSpreadsheet, Loader2, Settings, ChevronLeft, CalendarCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import Modal from './Modal';

// Keeping same interface and constants
interface DashboardProps {
  students: Student[];
  teacherInfo: { name: string; school: string; subject: string; governorate: string };
  onUpdateTeacherInfo: (info: { name: string; school: string; subject: string; governorate: string }) => void;
  schedule: ScheduleDay[];
  onUpdateSchedule: (newSchedule: ScheduleDay[]) => void;
  onSelectStudent: (s: Student) => void;
  onNavigate: (tab: string) => void;
  onOpenSettings: () => void;
  periodTimes: PeriodTime[];
  setPeriodTimes: React.Dispatch<React.SetStateAction<PeriodTime[]>>;
}

const OMAN_GOVERNORATES = ["مسقط", "ظفار", "مسندم", "البريمي", "الداخلية", "شمال الباطنة", "جنوب الباطنة", "جنوب الشرقية", "شمال الشرقية", "الظاهرة", "الوسطى"];

const Dashboard: React.FC<DashboardProps> = ({ students = [], teacherInfo, onUpdateTeacherInfo, schedule, onUpdateSchedule, onSelectStudent, onNavigate, onOpenSettings, periodTimes, setPeriodTimes }) => {
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [isImportingSchedule, setIsImportingSchedule] = useState(false);
  
  const [editName, setEditName] = useState(teacherInfo.name);
  const [editSchool, setEditSchool] = useState(teacherInfo.school);
  const [editSubject, setEditSubject] = useState(teacherInfo.subject);
  const [editGovernorate, setEditGovernorate] = useState(teacherInfo.governorate);

  const hour = new Date().getHours();
  const getGreetingData = () => {
    if (hour < 12) return { text: "صباح الخير", icon: Sun, color: "text-yellow-500 dark:text-yellow-300" };
    if (hour < 17) return { text: "طاب يومك", icon: Coffee, color: "text-orange-500 dark:text-orange-300" };
    return { text: "مساء الخير", icon: Moon, color: "text-indigo-500 dark:text-indigo-300" };
  };

  const greeting = getGreetingData();
  const GreetingIcon = greeting.icon;
  
  const today = new Date().toLocaleDateString('en-CA');
  
  const attendanceToday = students.reduce((acc, s) => {
    if (!s.attendance) return acc;
    const record = s.attendance.find(a => a.date === today);
    if (record?.status === 'present') acc.present++;
    else if (record?.status === 'absent') acc.absent++;
    return acc;
  }, { present: 0, absent: 0 });

  const behaviorStats = students.reduce((acc, s) => {
    (s.behaviors || []).forEach(b => {
      if (b.type === 'positive') acc.positive++;
      else acc.negative++; 
    });
    return acc;
  }, { positive: 0, negative: 0 });

  const COLORS = ['#10b981', '#f43f5e'];
  const hasAttendanceData = attendanceToday.present > 0 || attendanceToday.absent > 0;
  
  const pieData = hasAttendanceData 
    ? [
        { name: 'حاضر', value: attendanceToday.present },
        { name: 'غائب', value: attendanceToday.absent },
      ]
    : [{ name: 'لا توجد بيانات', value: 1 }];

  const daysMap = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayIndex = new Date().getDay();
  const todayName = daysMap[todayIndex];
  const todaySchedule = schedule.find(s => s.dayName === todayName);

  // Logic functions preserved...
  const handlePeriodChange = (dayIdx: number, periodIdx: number, val: string) => {
    const updated = [...schedule];
    updated[dayIdx].periods[periodIdx] = val;
    onUpdateSchedule(updated);
  };

  const handleTimeChange = (periodIndex: number, field: 'startTime' | 'endTime', value: string) => {
      const updated = [...periodTimes];
      updated[periodIndex] = { ...updated[periodIndex], [field]: value };
      setPeriodTimes(updated);
  };

  const handleSaveInfo = () => {
      onUpdateTeacherInfo({ name: editName, school: editSchool, subject: editSubject, governorate: editGovernorate });
      setIsEditingInfo(false);
  };

  const openInfoEditor = () => {
      setEditName(teacherInfo.name);
      setEditSchool(teacherInfo.school);
      setEditSubject(teacherInfo.subject);
      setEditGovernorate(teacherInfo.governorate);
      setIsEditingInfo(true);
  };

  const handleImportSchedule = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingSchedule(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      const newSchedule = [...schedule];
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
      rawData.forEach(row => {
          const firstCell = String(row[0] || '').trim();
          const dayIndex = days.findIndex(d => firstCell.includes(d));
          if (dayIndex !== -1) {
              const periods = row.slice(1, 9).map(cell => String(cell || ''));
              newSchedule[dayIndex].periods = periods;
          }
      });
      onUpdateSchedule(newSchedule);
      alert('تم استيراد الجدول بنجاح');
    } catch (error) {
        console.error(error);
        alert('فشل استيراد الجدول. تأكد من صيغة الملف.');
    } finally {
        setIsImportingSchedule(false);
        if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      
      {/* 1. Holographic Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 opacity-50"></div>
        <div className="relative z-10 px-6 py-5 flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <GreetingIcon className={`${greeting.color} w-4 h-4 drop-shadow-sm`} strokeWidth={2.5} />
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 dark:text-white/60">{greeting.text}</span>
            </div>
            <div className="flex items-center gap-3">
               <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">أ. {teacherInfo?.name || 'المعلم'}</h2>
               <button onClick={openInfoEditor} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 flex items-center justify-center border border-transparent dark:border-white/10 transition-all">
                   <Edit2 className="w-3 h-3 text-slate-600 dark:text-white" strokeWidth={2.5} />
               </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] text-slate-500 dark:text-white/50 font-bold">{teacherInfo?.school || 'المدرسة'}</span>
               {teacherInfo?.subject && <span className="text-[10px] text-slate-400 dark:text-white/40">• {teacherInfo.subject}</span>}
            </div>
          </div>
          
          <button onClick={onOpenSettings} className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-2xl flex items-center justify-center hover:bg-slate-300 dark:hover:bg-white/20 backdrop-blur-md border border-transparent dark:border-white/10 active:scale-95 transition-all shadow-sm">
              <Settings className="w-5 h-5 text-slate-700 dark:text-white" strokeWidth={2} />
          </button>
        </div>
      </motion.div>

      {/* 2. Glass Action Button */}
      <motion.button 
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate('attendance')} 
        className="w-full bg-gradient-to-r from-indigo-600/90 to-blue-600/90 backdrop-blur-md rounded-[2rem] p-1 shadow-lg shadow-indigo-500/30 dark:shadow-[0_0_30px_rgba(79,70,229,0.3)] border border-transparent dark:border-white/20"
      >
            <div className="bg-transparent rounded-[1.8rem] px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white shadow-inner">
                        <CalendarCheck className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-sm text-white">تسجيل الحضور اليومي</span>
                </div>
                <div className="bg-white/20 px-4 py-1.5 rounded-xl text-[10px] font-black text-white shadow-sm flex items-center gap-1">
                    ابدأ <ChevronLeft className="w-3 h-3 inline" />
                </div>
            </div>
      </motion.button>

      {/* 3. HUD Schedule */}
      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-[2rem] p-4 shadow-lg border border-gray-200 dark:border-white/10 relative overflow-hidden">
         <div className="flex justify-between items-center mb-3">
           <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm">
             <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
             جدول {todayName}
           </h3>
           <div className="flex gap-2">
               <button onClick={() => setShowTimeSettings(true)} className="p-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-200 rounded-xl hover:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-500/20"><Clock className="w-3.5 h-3.5" strokeWidth={2.5}/></button>
               <button onClick={() => setIsEditingSchedule(true)} className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-200 rounded-xl hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 border border-indigo-500/20"><Edit2 className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
           </div>
         </div>

         {todaySchedule ? (
           <div className="grid grid-cols-4 gap-2">
                {todaySchedule.periods.slice(0, 8).map((p, idx) => {
                   const time = periodTimes[idx];
                   const isActive = p && p !== '';
                   return (
                       <div key={idx} className={`flex flex-col items-center justify-between p-2 rounded-2xl border transition-all h-[80px] ${isActive ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/30 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-gray-100 dark:border-white/5'}`}>
                          <span className="text-[9px] font-black text-slate-400 dark:text-white/30 w-full text-right">#{idx + 1}</span>
                          <span className={`text-[10px] font-black text-center leading-tight line-clamp-2 w-full break-words ${isActive ? 'text-indigo-700 dark:text-indigo-100' : 'text-slate-300 dark:text-white/20'}`}>
                              {p || '-'}
                          </span>
                          {time && time.startTime ? (<div className="mt-1 text-[8px] font-bold text-slate-500 dark:text-white/60 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">{time.startTime}</div>) : <div className="h-3"></div>}
                       </div>
                   );
                })}
           </div>
        ) : <div className="text-center py-6 text-xs text-slate-400 dark:text-white/30 font-bold bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">لا توجد حصص اليوم</div>}
      </div>

      {/* 4. Stats Grid (Floating Holograms) */}
      <div className="grid grid-cols-2 gap-3 pb-16 md:pb-0">
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-[2rem] p-3 shadow-lg border border-gray-200 dark:border-white/10 flex flex-col justify-center items-center relative overflow-hidden h-[110px]">
              <div className="absolute top-3 right-3 text-[10px] font-black text-slate-400 dark:text-white/40">الحضور</div>
              <div className="h-14 w-14 relative my-1 drop-shadow-sm">
                  <PieChart width={56} height={56}>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={18} outerRadius={28} paddingAngle={5} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={hasAttendanceData ? COLORS[index % COLORS.length] : 'rgba(200,200,200,0.2)'} />)}
                    </Pie>
                  </PieChart>
              </div>
              <div className="flex gap-3 text-[9px] font-black">
                  <span className="text-emerald-500 dark:text-emerald-400 drop-shadow-sm">{attendanceToday.present} حاضر</span>
                  <span className="text-rose-500 dark:text-rose-400 drop-shadow-sm">{attendanceToday.absent} غائب</span>
              </div>
          </div>

          <div className="flex flex-col gap-2 h-[110px]">
              <div className="flex-1 bg-emerald-500/10 rounded-[1.5rem] px-4 border border-emerald-500/20 flex items-center justify-between backdrop-blur-sm">
                  <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"><Award className="w-4 h-4" /></div><span className="text-[10px] font-black text-emerald-700 dark:text-emerald-200">إيجابي</span></div>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 drop-shadow-sm">{behaviorStats.positive}</span>
              </div>
              <div className="flex-1 bg-rose-500/10 rounded-[1.5rem] px-4 border border-rose-500/20 flex items-center justify-between backdrop-blur-sm">
                  <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-500/30"><AlertCircle className="w-4 h-4" /></div><span className="text-[10px] font-black text-rose-700 dark:text-rose-200">سلبي</span></div>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400 drop-shadow-sm">{behaviorStats.negative}</span>
              </div>
          </div>
      </div>

      {/* --- MODALS (Glass Style) --- */}
      
      {/* Edit Info Modal */}
      <Modal isOpen={isEditingInfo} onClose={() => setIsEditingInfo(false)}>
          <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">تعديل البيانات</h3>
              <button onClick={() => setIsEditingInfo(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20"><X className="w-5 h-5 text-slate-500 dark:text-white/70"/></button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" placeholder="اسم المعلم" />
              <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" placeholder="المادة" />
              <input type="text" value={editSchool} onChange={e => setEditSchool(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500" placeholder="المدرسة" />
              <select value={editGovernorate} onChange={e => setEditGovernorate(e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500">
                    <option value="" className="text-black">اختر المحافظة...</option>
                    {OMAN_GOVERNORATES.map(gov => <option key={gov} value={gov} className="text-black">{gov}</option>)}
              </select>
              <button onClick={handleSaveInfo} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-4 text-sm font-black shadow-lg dark:shadow-[0_0_20px_rgba(79,70,229,0.4)] mt-2 active:scale-95 transition-all">حفظ التغييرات</button>
          </div>
      </Modal>

      {/* Edit Schedule Modal */}
      <Modal isOpen={isEditingSchedule} onClose={() => setIsEditingSchedule(false)}>
          <div className="flex justify-between items-center shrink-0 mb-4">
             <h3 className="font-black text-lg text-slate-900 dark:text-white">تعديل الجدول</h3>
             <button onClick={() => setIsEditingSchedule(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20"><X className="w-5 h-5 text-slate-500 dark:text-white/70" /></button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar shrink-0">
            {schedule.map((day, idx) => (
              <button key={idx} onClick={() => setActiveDayIndex(idx)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap transition-all border ${activeDayIndex === idx ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/50 border-transparent hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                {day.dayName}
              </button>
            ))}
          </div>

          <div className="space-y-2 pb-2 pr-1">
             {schedule[activeDayIndex].periods.map((period, pIdx) => (
                <div key={pIdx} className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                   <span className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center font-black text-xs text-slate-500 dark:text-white/50">{pIdx + 1}</span>
                   <input type="text" value={period} onChange={(e) => handlePeriodChange(activeDayIndex, pIdx, e.target.value)} placeholder={`مادة / فصل`} className="flex-1 bg-transparent text-xs font-bold outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20" />
                </div>
             ))}
          </div>
          
          <div className="flex gap-2 shrink-0 mt-4">
              <label className="flex-1 py-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-500/20 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all hover:bg-emerald-500/20">
                  {isImportingSchedule ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4"/>}
                  استيراد
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportSchedule} />
              </label>
              <button onClick={() => setIsEditingSchedule(false)} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all">حفظ الجدول</button>
          </div>
      </Modal>

      {/* Edit Time Settings Modal */}
      <Modal isOpen={showTimeSettings} onClose={() => setShowTimeSettings(false)}>
           <div className="flex justify-between items-center mb-4 shrink-0">
               <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2"><Clock className="w-6 h-6 text-indigo-500"/> التوقيت</h3>
               <button onClick={() => setShowTimeSettings(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20"><X className="w-5 h-5 text-slate-500 dark:text-white/70" /></button>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-2">
               {periodTimes.map((period, index) => (
                   <div key={index} className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                       <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center font-black text-xs text-slate-500 dark:text-white/50">{period.periodNumber}</div>
                       <div className="flex items-center gap-2 flex-1">
                           <input type="time" value={period.startTime} onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)} className="flex-1 bg-white dark:bg-black/30 text-slate-900 dark:text-white rounded-lg border border-gray-200 dark:border-white/10 text-[10px] font-bold px-1 py-2 text-center outline-none" />
                           <ArrowRight className="w-3 h-3 text-slate-400 dark:text-white/30"/>
                           <input type="time" value={period.endTime} onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)} className="flex-1 bg-white dark:bg-black/30 text-slate-900 dark:text-white rounded-lg border border-gray-200 dark:border-white/10 text-[10px] font-bold px-1 py-2 text-center outline-none" />
                       </div>
                   </div>
               ))}
           </div>
           <button onClick={() => setShowTimeSettings(false)} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all shrink-0 mt-2">حفظ التوقيت</button>
      </Modal>
    </div>
  );
};

export default Dashboard;
