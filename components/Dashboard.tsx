
import React, { useState, useEffect } from 'react';
import { Student, ScheduleDay, PeriodTime } from '../types';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Users, Award, AlertCircle, Sun, Moon, Coffee, Sparkles, School, Calendar, Edit2, X, Clock, ArrowRight, FileSpreadsheet, Loader2, BookOpen, Settings, ChevronLeft, CalendarCheck, BellRing } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from './Modal';

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
    if (hour < 12) return { text: "صباح الخير", icon: Sun, color: "text-amber-200" };
    if (hour < 17) return { text: "طاب يومك", icon: Coffee, color: "text-orange-200" };
    return { text: "مساء الخير", icon: Moon, color: "text-indigo-200" };
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

  // Restored Import Logic for Schedule
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
    <div className="space-y-2 pb-24 md:pb-8">
      
      {/* 1. Compact Welcome Banner */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#4f46e5] text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 opacity-100"></div>
        <div className="relative z-10 px-5 py-4 flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <GreetingIcon className={`${greeting.color} w-3.5 h-3.5`} strokeWidth={2.5} />
              <span className="text-[9px] font-bold tracking-wider uppercase opacity-80">{greeting.text}</span>
            </div>
            <div className="flex items-center gap-2">
               <h2 className="text-lg font-black tracking-tight">أ. {teacherInfo?.name || 'المعلم'}</h2>
               <button onClick={openInfoEditor} className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/10">
                   <Edit2 className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
               </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[9px] opacity-70 font-bold">{teacherInfo?.school || 'المدرسة'}</span>
               {teacherInfo?.subject && <span className="text-[9px] opacity-60">• {teacherInfo.subject}</span>}
            </div>
          </div>
          
          <button onClick={onOpenSettings} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 backdrop-blur-md border border-white/10 active:scale-95">
              <Settings className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 2. Slim Action Button */}
      <button onClick={() => onNavigate('attendance')} className="w-full bg-white rounded-2xl p-1 shadow-sm border border-indigo-100 active:scale-[0.98] transition-all">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
                        <CalendarCheck className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-xs text-slate-800">تسجيل الحضور اليومي</span>
                </div>
                <div className="bg-white px-3 py-1 rounded-lg text-[9px] font-black text-indigo-600 shadow-sm">
                    ابدأ الآن <ChevronLeft className="w-2.5 h-2.5 inline" />
                </div>
            </div>
      </button>

      {/* 3. Grid Schedule (2 Rows x 4 Columns) */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] p-3 shadow-sm border border-white/50 relative">
         <div className="flex justify-between items-center mb-2">
           <h3 className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
             <Calendar className="w-3.5 h-3.5 text-indigo-500" strokeWidth={2.5} />
             جدول {todayName}
           </h3>
           <div className="flex gap-1">
               <button onClick={() => setShowTimeSettings(true)} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 border border-amber-100"><Clock className="w-3 h-3" strokeWidth={2.5}/></button>
               <button onClick={() => setIsEditingSchedule(true)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 border border-indigo-100"><Edit2 className="w-3 h-3" strokeWidth={2.5} /></button>
           </div>
         </div>

         {todaySchedule ? (
           <div className="grid grid-cols-4 gap-1.5">
                {todaySchedule.periods.slice(0, 8).map((p, idx) => {
                   const time = periodTimes[idx];
                   const isActive = p && p !== '';
                   return (
                       <div key={idx} className={`flex flex-col items-center justify-between p-1.5 rounded-xl border transition-all h-[75px] ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                          <span className="text-[8px] font-black text-slate-300 w-full text-right">#{idx + 1}</span>
                          <span className={`text-[9px] font-black text-center leading-tight line-clamp-2 w-full break-words ${isActive ? 'text-indigo-900' : 'text-slate-300'}`}>
                              {p || '-'}
                          </span>
                          {time && time.startTime ? (<div className="mt-0.5 text-[7px] font-bold text-slate-400 bg-white/60 px-1 py-0.5 rounded-full">{time.startTime}</div>) : <div className="h-3"></div>}
                       </div>
                   );
                })}
           </div>
        ) : <div className="text-center py-4 text-xs text-gray-400 font-bold bg-gray-50 rounded-xl border border-dashed border-gray-200">لا توجد حصص اليوم</div>}
      </div>

      {/* 4. Compact Stats Grid */}
      <div className="grid grid-cols-2 gap-2 pb-16 md:pb-0">
          <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] p-2 shadow-sm border border-white/50 flex flex-col justify-center items-center relative overflow-hidden h-[100px]">
              <div className="absolute top-2 right-2 text-[9px] font-black text-slate-400">الحضور</div>
              <div className="h-12 w-12 relative my-1">
                  <PieChart width={48} height={48}>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={15} outerRadius={24} paddingAngle={5} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={hasAttendanceData ? COLORS[index % COLORS.length] : '#f1f5f9'} />)}
                    </Pie>
                  </PieChart>
              </div>
              <div className="flex gap-2 text-[8px] font-black">
                  <span className="text-emerald-500">{attendanceToday.present} حاضر</span>
                  <span className="text-rose-500">{attendanceToday.absent} غائب</span>
              </div>
          </div>

          <div className="flex flex-col gap-1.5 h-[100px]">
              <div className="flex-1 bg-emerald-50 rounded-2xl p-2 px-3 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-emerald-500"><Award className="w-3.5 h-3.5" /></div><span className="text-[9px] font-black text-emerald-800">إيجابي</span></div>
                  <span className="text-lg font-black text-emerald-600">{behaviorStats.positive}</span>
              </div>
              <div className="flex-1 bg-rose-50 rounded-2xl p-2 px-3 border border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-rose-500"><AlertCircle className="w-3.5 h-3.5" /></div><span className="text-[9px] font-black text-rose-800">سلبي</span></div>
                  <span className="text-lg font-black text-rose-600">{behaviorStats.negative}</span>
              </div>
          </div>
      </div>

      {/* --- MODALS (Compact) --- */}
      
      {/* Edit Info Modal */}
      <Modal isOpen={isEditingInfo} onClose={() => setIsEditingInfo(false)}>
          <div className="flex justify-between items-center mb-2 shrink-0">
              <h3 className="font-black text-lg text-gray-900">تعديل البيانات</h3>
              <button onClick={() => setIsEditingInfo(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500"/></button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500" placeholder="اسم المعلم" />
              <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500" placeholder="المادة" />
              <input type="text" value={editSchool} onChange={e => setEditSchool(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500" placeholder="المدرسة" />
              <select value={editGovernorate} onChange={e => setEditGovernorate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500">
                    <option value="">اختر المحافظة...</option>
                    {OMAN_GOVERNORATES.map(gov => <option key={gov} value={gov}>{gov}</option>)}
              </select>
              <button onClick={handleSaveInfo} className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-black shadow-lg shadow-indigo-200 mt-2 active:scale-95 transition-all">حفظ</button>
          </div>
      </Modal>

      {/* Edit Schedule Modal */}
      <Modal isOpen={isEditingSchedule} onClose={() => setIsEditingSchedule(false)}>
          <div className="flex justify-between items-center shrink-0">
             <h3 className="font-black text-lg text-gray-900">تعديل الجدول</h3>
             <button onClick={() => setIsEditingSchedule(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500" /></button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
            {schedule.map((day, idx) => (
              <button key={idx} onClick={() => setActiveDayIndex(idx)} className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all border ${activeDayIndex === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'}`}>
                {day.dayName}
              </button>
            ))}
          </div>

          <div className="space-y-2 pb-2 pr-1">
             {schedule[activeDayIndex].periods.map((period, pIdx) => (
                <div key={pIdx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                   <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-xs text-gray-400 shadow-sm border border-gray-100">{pIdx + 1}</span>
                   <input type="text" value={period} onChange={(e) => handlePeriodChange(activeDayIndex, pIdx, e.target.value)} placeholder={`مادة / فصل`} className="flex-1 bg-transparent text-xs font-bold outline-none text-gray-800" />
                </div>
             ))}
          </div>
          
          <div className="flex gap-2 shrink-0">
              <label className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all">
                  {isImportingSchedule ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4"/>}
                  استيراد
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportSchedule} />
              </label>
              <button onClick={() => setIsEditingSchedule(false)} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl active:scale-95 transition-all">حفظ الجدول</button>
          </div>
      </Modal>

      {/* Edit Time Settings Modal */}
      <Modal isOpen={showTimeSettings} onClose={() => setShowTimeSettings(false)}>
           <div className="flex justify-between items-center mb-2 shrink-0">
               <h3 className="font-black text-lg text-gray-900 flex items-center gap-2"><Clock className="w-6 h-6 text-indigo-600"/> التوقيت</h3>
               <button onClick={() => setShowTimeSettings(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500" /></button>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-2">
               {periodTimes.map((period, index) => (
                   <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                       <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-xs text-gray-500 shadow-sm">{period.periodNumber}</div>
                       <div className="flex items-center gap-1 flex-1">
                           <input type="time" value={period.startTime} onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)} className="flex-1 bg-white rounded-lg border border-gray-200 text-[10px] font-bold px-1 py-2 text-center outline-none" />
                           <ArrowRight className="w-3 h-3 text-gray-300"/>
                           <input type="time" value={period.endTime} onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)} className="flex-1 bg-white rounded-lg border border-gray-200 text-[10px] font-bold px-1 py-2 text-center outline-none" />
                       </div>
                   </div>
               ))}
           </div>
           <button onClick={() => setShowTimeSettings(false)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl active:scale-95 transition-all shrink-0">حفظ التوقيت</button>
      </Modal>
    </div>
  );
};

export default Dashboard;
