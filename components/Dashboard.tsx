import React, { useState } from 'react';
import { Student, ScheduleDay, PeriodTime } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Users, Award, AlertCircle, Sun, Moon, Coffee, Sparkles, School, Calendar, Edit2, X, Clock, ArrowRight, FileSpreadsheet, Loader2, BookOpen, Settings, ChevronLeft, CalendarCheck, BellRing } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  // ... (Import Logic remains the same)
  const handleImportSchedule = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImportingSchedule(true);
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        const targetDays = [ { key: 'أحد', full: 'الأحد' }, { key: 'اثنين', full: 'الاثنين' }, { key: 'ثلاثاء', full: 'الثلاثاء' }, { key: 'أربعاء', full: 'الأربعاء' }, { key: 'خميس', full: 'الخميس' } ];
        const newSchedule = [...schedule];
        let foundData = false;
        jsonData.forEach((row) => {
           const dayIndexInRow = row.findIndex(cell => { if (typeof cell !== 'string') return false; return targetDays.some(d => cell.includes(d.key)); });
           if (dayIndexInRow !== -1) {
               const cellText = String(row[dayIndexInRow]).trim();
               const matchedDayObj = targetDays.find(d => cellText.includes(d.key));
               if (matchedDayObj) {
                   const scheduleDayIndex = newSchedule.findIndex(s => s.dayName === matchedDayObj.full);
                   if (scheduleDayIndex !== -1) {
                       const newPeriods = [];
                       for (let i = 1; i <= 8; i++) { const val = row[dayIndexInRow + i]; newPeriods.push(val ? String(val).trim() : ''); }
                       newSchedule[scheduleDayIndex] = { ...newSchedule[scheduleDayIndex], periods: newPeriods };
                       foundData = true;
                   }
               }
           }
        });
        if (foundData) { onUpdateSchedule(newSchedule); alert('تم استيراد الجدول بنجاح!'); } 
        else { alert('لم يتم العثور على أيام الأسبوع.'); }
      } catch (error) { alert('خطأ في قراءة الملف'); } finally { setIsImportingSchedule(false); if (e.target) e.target.value = ''; }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-28 md:pb-8">
      
      {/* 1. Luxurious Welcome Banner (Glass & Mesh Gradient) */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#4f46e5] text-white shadow-2xl shadow-indigo-500/30 group">
        
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 opacity-100"></div>
        <div className="absolute top-[-50%] right-[-20%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-50%] left-[-20%] w-[400px] h-[400px] bg-indigo-900/30 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1 opacity-90">
              <GreetingIcon className={`${greeting.color} w-5 h-5 animate-pulse`} strokeWidth={2.5} />
              <span className="text-xs font-bold tracking-widest uppercase opacity-80">{greeting.text}</span>
            </div>
            
            <div className="flex items-center gap-3">
               <h2 className="text-4xl font-black tracking-tight drop-shadow-sm">أ. {teacherInfo?.name || 'المعلم'}</h2>
               <button onClick={openInfoEditor} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all border border-white/10 group/edit">
                   <Edit2 className="w-4 h-4 text-white group-hover/edit:scale-110 transition-transform" strokeWidth={2.5} />
               </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mt-4">
               <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10 shadow-sm">
                  <School className="w-4 h-4 text-indigo-200" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold">{teacherInfo?.school || 'اسم المدرسة'}</span>
               </div>
               {teacherInfo?.subject && (
                  <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10 shadow-sm">
                      <BookOpen className="w-4 h-4 text-fuchsia-200" strokeWidth={2.5} />
                      <span className="text-[11px] font-bold">{teacherInfo.subject}</span>
                  </div>
               )}
            </div>
          </div>
          
          <button 
              onClick={onOpenSettings} 
              className="md:hidden absolute top-6 left-6 w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all active:scale-95"
          >
              <Settings className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* 2. Primary Action Button (Floating & Glassy) */}
      <button onClick={() => onNavigate('attendance')} className="w-full relative overflow-hidden bg-white/70 backdrop-blur-xl p-1 rounded-[2.5rem] shadow-xl shadow-blue-500/10 border border-white/50 group transition-all hover:scale-[1.01] active:scale-[0.99]">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[2.2rem] p-5 flex items-center justify-between relative z-10 border border-white/60">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/40 text-white transform group-hover:rotate-6 transition-transform duration-500">
                        <CalendarCheck className="w-8 h-8" strokeWidth={2.5} />
                    </div>
                    <div className="text-right">
                        <h3 className="font-black text-xl text-slate-800 tracking-tight group-hover:text-indigo-700 transition-colors">تسجيل الحضور</h3>
                        <p className="text-slate-500 text-xs font-bold mt-1">ابدأ يومك الدراسي برصد الغياب بضغطة زر</p>
                    </div>
                </div>
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-[-5px] transition-all">
                    <ChevronLeft className="w-6 h-6" strokeWidth={3} />
                </div>
            </div>
      </button>

      {/* 3. Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Schedule Card (Span 2) */}
          <div className="md:col-span-2 bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40 border border-white/60 relative overflow-hidden flex flex-col">
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-black text-slate-800 flex items-center gap-3 text-base">
                 <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><Calendar className="w-5 h-5" strokeWidth={2.5} /></div>
                 الجدول المدرسي
               </h3>
               <div className="flex gap-2">
                   <button onClick={() => setShowTimeSettings(true)} className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100">
                       <Clock className="w-4 h-4" strokeWidth={2.5}/>
                       <span className="text-[10px] font-black">التوقيت</span>
                   </button>
                   <button onClick={() => setIsEditingSchedule(true)} className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">
                       <Edit2 className="w-4 h-4" strokeWidth={2.5} />
                   </button>
               </div>
             </div>

             {todaySchedule ? (
               <div className="space-y-4 flex-1">
                 <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black text-white bg-slate-800 px-4 py-1.5 rounded-full shadow-md">{todayName}</span>
                    <span className="text-[10px] font-bold text-slate-400">{new Date().toLocaleDateString('ar-EG')}</span>
                 </div>
                 
                 <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {todaySchedule.periods.slice(0, 8).map((p, idx) => {
                       const time = periodTimes[idx];
                       const isActive = p && p !== '';
                       return (
                           <div key={idx} className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all h-24 group ${isActive ? 'bg-indigo-50/80 border-indigo-200 hover:shadow-md' : 'bg-slate-50/50 border-slate-100'}`}>
                              <span className="absolute top-1 right-2 text-[9px] font-black text-slate-300">#{idx + 1}</span>
                              <span className={`text-[11px] font-black text-center leading-tight line-clamp-2 ${isActive ? 'text-indigo-800' : 'text-slate-300'}`}>{p || 'فراغ'}</span>
                              {time && time.startTime && (
                                  <div className="absolute bottom-2 text-[8px] font-black text-slate-500 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                                      {time.startTime}
                                  </div>
                              )}
                           </div>
                       );
                    })}
                 </div>
               </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400">لا توجد حصص مجدولة لهذا اليوم</p>
              </div>
            )}
          </div>

          {/* Stats Column */}
          <div className="space-y-4">
              
              {/* Attendance Widget */}
              <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40 border border-white/60 flex flex-col items-center justify-center relative min-h-[180px]">
                  <div className="absolute top-5 left-5 p-2 bg-emerald-100/50 rounded-2xl text-emerald-600"><Users className="w-5 h-5" strokeWidth={2.5}/></div>
                  <div className="h-32 w-32 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={hasAttendanceData ? COLORS[index % COLORS.length] : '#f1f5f9'} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-slate-800">{attendanceToday.present}</span>
                        <span className="text-[10px] font-bold text-slate-400">حاضر</span>
                    </div>
                  </div>
              </div>

              {/* Behavior Widgets */}
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-4 shadow-lg border border-white/60 flex flex-col items-center justify-center gap-2 group hover:bg-emerald-50/50 transition-colors">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                          <Award className="w-5 h-5" strokeWidth={2.5} />
                      </div>
                      <span className="text-3xl font-black text-slate-800">{behaviorStats.positive}</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-full">سلوك إيجابي</span>
                  </div>
                  <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-4 shadow-lg border border-white/60 flex flex-col items-center justify-center gap-2 group hover:bg-rose-50/50 transition-colors">
                      <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform">
                          <AlertCircle className="w-5 h-5" strokeWidth={2.5} />
                      </div>
                      <span className="text-3xl font-black text-slate-800">{behaviorStats.negative}</span>
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-100/50 px-2 py-0.5 rounded-full">سلوك سلبي</span>
                  </div>
              </div>
          </div>
      </div>

      {/* ... (Modals remain similar but with rounded-[2.5rem] and backdrop-blur-2xl for consistency) ... */}
      {/* Edit Info Modal */}
      {isEditingInfo && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setIsEditingInfo(false)}>
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 border border-white/50" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-lg text-gray-900">تعديل البيانات</h3>
                      <button onClick={() => setIsEditingInfo(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500"/></button>
                  </div>
                  <div className="space-y-4">
                      {/* Inputs with glass effect */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase">اسم المعلم</label>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase">المادة</label>
                          <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase">المدرسة</label>
                          <input type="text" value={editSchool} onChange={e => setEditSchool(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase">المحافظة</label>
                          <select value={editGovernorate} onChange={e => setEditGovernorate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 appearance-none">
                                <option value="">اختر المحافظة...</option>
                                {OMAN_GOVERNORATES.map(gov => <option key={gov} value={gov}>{gov}</option>)}
                          </select>
                      </div>
                      <button onClick={handleSaveInfo} className="w-full bg-indigo-600 text-white rounded-2xl py-4 text-sm font-black shadow-lg shadow-indigo-200 mt-2 hover:bg-indigo-700 active:scale-95 transition-all">حفظ التغييرات</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Schedule Modal */}
      {isEditingSchedule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center" onClick={() => setIsEditingSchedule(false)}>
           <div className="bg-white w-full max-w-md h-[85vh] sm:h-auto rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl flex flex-col border border-white/50" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-black text-lg text-gray-900">تعديل الجدول</h3>
                 <button onClick={() => setIsEditingSchedule(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="mb-6">
                  <label className="flex items-center justify-center gap-3 w-full p-4 bg-emerald-50 text-emerald-700 rounded-[2rem] border border-emerald-100 cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md">
                      {isImportingSchedule ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileSpreadsheet className="w-5 h-5"/>}
                      <span className="text-xs font-black">استيراد من Excel</span>
                      <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImportSchedule} disabled={isImportingSchedule} />
                  </label>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                {schedule.map((day, idx) => (
                  <button key={idx} onClick={() => setActiveDayIndex(idx)} className={`px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all border ${activeDayIndex === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'}`}>
                    {day.dayName}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pb-6 custom-scrollbar pr-1">
                 {schedule[activeDayIndex].periods.map((period, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 focus-within:border-indigo-300 focus-within:bg-white transition-colors">
                       <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-xs text-gray-400 shadow-sm border border-gray-100">{pIdx + 1}</span>
                       <input type="text" value={period} onChange={(e) => handlePeriodChange(activeDayIndex, pIdx, e.target.value)} placeholder={`مادة / فصل`} className="flex-1 bg-transparent text-sm font-bold outline-none text-gray-800 placeholder:text-gray-300 px-2" />
                    </div>
                 ))}
              </div>
              <button onClick={() => setIsEditingSchedule(false)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 mt-2 hover:bg-indigo-700 active:scale-95 transition-all">حفظ الجدول</button>
           </div>
        </div>
      )}

      {/* Edit Time Settings Modal */}
      {showTimeSettings && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center" onClick={() => setShowTimeSettings(false)}>
            <div className="bg-white w-full max-w-sm h-[80vh] sm:h-auto rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl flex flex-col border border-white/50" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                   <h3 className="font-black text-lg text-gray-900 flex items-center gap-2"><Clock className="w-6 h-6 text-indigo-600"/> التوقيت</h3>
                   <button onClick={() => setShowTimeSettings(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500" /></button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                   {periodTimes.map((period, index) => (
                       <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                           <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-sm text-gray-500 shadow-sm">{period.periodNumber}</div>
                           <div className="flex items-center gap-2 flex-1">
                               <input type="time" value={period.startTime} onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)} className="flex-1 bg-white rounded-xl border border-gray-200 text-xs font-bold px-1 py-3 text-center outline-none focus:border-indigo-300" />
                               <ArrowRight className="w-4 h-4 text-gray-300"/>
                               <input type="time" value={period.endTime} onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)} className="flex-1 bg-white rounded-xl border border-gray-200 text-xs font-bold px-1 py-3 text-center outline-none focus:border-indigo-300" />
                           </div>
                       </div>
                   ))}
               </div>
               <button onClick={() => setShowTimeSettings(false)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl mt-2 hover:bg-indigo-700 active:scale-95 transition-all">حفظ التوقيت</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default Dashboard;