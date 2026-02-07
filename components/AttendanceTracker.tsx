import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, AttendanceStatus } from '../types';
import { Check, X, Clock, Calendar, MessageCircle, ChevronDown, Loader2, Share2, DoorOpen, UserCircle2, Filter, ChevronLeft, ChevronRight, CalendarCheck, Search } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import * as XLSX from 'xlsx';
import Modal from './Modal';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface AttendanceTrackerProps {
  students: Student[];
  classes: string[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

// ============================================================================
// ✅ قسم الأفاتار (نفس منطق تطبيق الخريطة: الرابط يبدأ من / الذي يمثل public)
// ============================================================================

// 1. مكون أفاتار الطالب (الفتى)
const OmaniBoyAvatarSVG = () => (
  <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 relative flex items-center justify-center border border-slate-100">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-slate-200 opacity-50"></div>
      
      <img 
        // نبدأ بالمسار المطلق لأنه القياسي في الويب
        src="/assets/boy-avatar.png"  
        alt="طالب" 
        className="w-full h-full object-cover transform scale-110 translate-y-1"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          // إذا فشل المسار المطلق (يحدث غالباً في تطبيقات الموبايل)، نجرب المسار النسبي
          if (!target.getAttribute('data-tried-fix')) {
             target.setAttribute('data-tried-fix', 'true');
             target.src = "assets/boy-avatar.png"; // إزالة الشرطة المائلة الأولى
          } else {
             // إذا فشل الخياران، نظهر لوناً احتياطياً بدلاً من أيقونة الصورة المكسورة
             target.style.display = 'none';
             target.parentElement!.style.backgroundColor = '#cbd5e1';
          }
        }}
      />
  </div>
);

// 2. مكون أفاتار الطالبة (الفتاة)
const OmaniGirlAvatarSVG = () => (
  <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 relative flex items-center justify-center border border-slate-100">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 to-purple-50 opacity-50"></div>
      
      <img 
        src="/assets/girl-avatar.png" 
        alt="طالبة" 
        className="w-full h-full object-cover transform scale-110 translate-y-1"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.getAttribute('data-tried-fix')) {
             target.setAttribute('data-tried-fix', 'true');
             target.src = "assets/girl-avatar.png"; // إزالة الشرطة المائلة الأولى
          } else {
             target.style.display = 'none';
             target.parentElement!.style.backgroundColor = '#e2e8f0';
          }
        }}
      />
  </div>
);

// دالة تحديد الأفاتار المناسب
const getStudentAvatar = (student: Student) => {
    if (student.avatar) return <img src={student.avatar} className="w-full h-full object-cover" alt={student.name} />;
    return student.gender === 'female' ? <OmaniGirlAvatarSVG /> : <OmaniBoyAvatarSVG />;
};

// ============================================================================

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ students, classes, setStudents }) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toLocaleDateString('en-CA'));
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<{student: Student, type: 'absent' | 'late' | 'truant'} | null>(null);
  
  // شريط التواريخ (Week View)
  const [weekOffset, setWeekOffset] = useState(0);
  
  const weekDates = useMemo(() => {
      const dates = [];
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - (today.getDay()) + (weekOffset * 7)); // Start from Sunday
      
      for (let i = 0; i < 5; i++) { // Sunday to Thursday
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          dates.push(d);
      }
      return dates;
  }, [weekOffset]);

  const getStatus = (student: Student) => {
    return student.attendance.find(a => a.date === selectedDate)?.status;
  };

  const toggleAttendance = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const filtered = s.attendance.filter(a => a.date !== selectedDate);
      const currentStatus = s.attendance.find(a => a.date === selectedDate)?.status;
      
      const newStudent = {
        ...s,
        attendance: currentStatus === status ? filtered : [...filtered, { date: selectedDate, status }]
      };

      // منطق التبليغ
      if ((status === 'absent' || status === 'late' || status === 'truant') && currentStatus !== status) {
          setTimeout(() => setNotificationTarget({ student: newStudent, type: status }), 50);
      }

      return newStudent;
    }));
  };

  const markAll = (status: AttendanceStatus) => {
      const visibleIds = new Set(filteredStudents.map(s => s.id));
      setStudents(prev => prev.map(s => {
          if (!visibleIds.has(s.id)) return s;
          const filtered = s.attendance.filter(a => a.date !== selectedDate);
          return {
              ...s,
              attendance: [...filtered, { date: selectedDate, status }]
          };
      }));
  };

  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      students.forEach(s => {
          if (s.grade) grades.add(s.grade);
          else if (s.classes[0]) {
              const match = s.classes[0].match(/^(\d+)/);
              if (match) grades.add(match[1]);
          }
      });
      return Array.from(grades).sort();
  }, [students, classes]);

  const visibleClasses = useMemo(() => {
      if (selectedGrade === 'all') return classes;
      return classes.filter(c => c.startsWith(selectedGrade));
  }, [classes, selectedGrade]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = classFilter === 'all' || s.classes.includes(classFilter);
      let matchesGrade = true;
      if (selectedGrade !== 'all') {
          matchesGrade = s.grade === selectedGrade || (s.classes[0] && s.classes[0].startsWith(selectedGrade));
      }
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClass && matchesGrade && matchesSearch;
    });
  }, [students, classFilter, selectedGrade, searchTerm]);

  const stats = useMemo(() => {
      const present = filteredStudents.filter(s => getStatus(s) === 'present').length;
      const absent = filteredStudents.filter(s => getStatus(s) === 'absent').length;
      const late = filteredStudents.filter(s => getStatus(s) === 'late').length;
      const truant = filteredStudents.filter(s => getStatus(s) === 'truant').length;
      return { present, absent, late, truant, total: filteredStudents.length };
  }, [filteredStudents, selectedDate]);

  const performNotification = async (method: 'whatsapp' | 'sms') => {
      if(!notificationTarget || !notificationTarget.student.parentPhone) { alert('لا يوجد رقم هاتف مسجل'); return; }
      const { student, type } = notificationTarget;
      let cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 5) return alert('رقم الهاتف غير صحيح');
      if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
      if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
      else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) cleanPhone = '968' + cleanPhone.substring(1);
      
      let statusText = '';
      if (type === 'absent') statusText = 'غائب'; 
      else if (type === 'late') statusText = 'متأخر'; 
      else if (type === 'truant') statusText = 'تسرب من الحصة (هروب)';
      
      const dateText = new Date().toLocaleDateString('ar-EG');
      const msg = encodeURIComponent(`السلام عليكم، نود إشعاركم بأن الطالب ${student.name} تم تسجيل حالة: *${statusText}* اليوم (${dateText}). نرجو المتابعة.`);
      
      if (method === 'whatsapp') {
          if (window.electron) { window.electron.openExternal(`whatsapp://send?phone=${cleanPhone}&text=${msg}`); } 
          else { 
              const universalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`; 
              try { 
                  if (Capacitor.isNativePlatform()) { await Browser.open({ url: universalUrl }); } 
                  else { window.open(universalUrl, '_blank'); } 
              } catch (e) { window.open(universalUrl, '_blank'); } 
          }
      } else { 
          window.location.href = `sms:${cleanPhone}?body=${msg}`; 
      }
      setNotificationTarget(null);
  };

  const handleExportDailyExcel = async () => {
      if (filteredStudents.length === 0) return alert('لا يوجد طلاب');
      setIsExportingExcel(true);
      try {
          const targetDate = new Date(selectedDate);
          const year = targetDate.getFullYear();
          const month = targetDate.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const data = filteredStudents.map((s, idx) => {
              const row: any = { 'م': idx + 1, 'اسم الطالب': s.name, 'الفصل': s.classes[0] || '' };
              let abs = 0, late = 0, truant = 0;
              for (let d = 1; d <= daysInMonth; d++) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const record = s.attendance.find(a => a.date === dateStr);
                  let symbol = '';
                  if (record) {
                      if (record.status === 'present') symbol = '✓';
                      else if (record.status === 'absent') { symbol = 'غ'; abs++; }
                      else if (record.status === 'late') { symbol = 'ت'; late++; }
                      else if (record.status === 'truant') { symbol = 'س'; truant++; }
                  }
                  row[`${d}`] = symbol;
              }
              row['مجموع الغياب'] = abs; row['مجموع التأخير'] = late; row['مجموع التسرب'] = truant;
              return row;
          });
          const wb = XLSX.utils.book_new(); 
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, `شهر_${month + 1}`);
          const fileName = `Attendance_${month + 1}_${year}.xlsx`;
          if (Capacitor.isNativePlatform()) {
              const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
              const result = await Filesystem.writeFile({ path: fileName, data: wbout, directory: Directory.Cache });
              await Share.share({ title: 'سجل الحضور الشهري', url: result.uri });
          } else { XLSX.writeFile(wb, fileName); }
      } catch (error) { console.error(error); alert('خطأ في التصدير'); } finally { setIsExportingExcel(false); }
  };

  return (
    <div className="flex flex-col h-full text-slate-800 relative animate-in fade-in duration-500">
        
        {/* ================= FIXED HEADER ================= */}
        <div className="fixed md:sticky top-0 z-40 md:z-30 bg-[#1e3a8a] text-white shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300 rounded-b-[2.5rem] md:rounded-none md:shadow-md w-full md:w-auto left-0 right-0 md:left-auto md:right-auto">
            
            <div className="flex justify-between items-center mb-6 mt-2 gap-3">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
                        <CalendarCheck className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-black tracking-wide">سجل الغياب</h1>
                </div>

                <div className="flex-1 mx-2 relative group">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200 group-focus-within:text-white transition-colors" />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="بحث عن طالب..." 
                        className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold text-white placeholder:text-blue-200/70 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                    />
                </div>

                <button onClick={handleExportDailyExcel} disabled={isExportingExcel} className="w-10 h-10 shrink-0 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all shadow-sm">
                     {isExportingExcel ? <Loader2 className="w-5 h-5 animate-spin"/> : <Share2 className="w-5 h-5"/>}
                </button>
            </div>

            <div className="flex items-center justify-between gap-1 mb-4 bg-white/10 p-2 rounded-2xl border border-white/10 shadow-inner">
                <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1 text-white hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 rtl:rotate-180"/></button>
                <div className="flex flex-1 justify-between gap-1 text-center">
                    {weekDates.map((date, idx) => {
                        const isSelected = date.toLocaleDateString('en-CA') === selectedDate;
                        const isToday = date.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA');
                        return (
                            <button 
                                key={idx} 
                                onClick={() => setSelectedDate(date.toLocaleDateString('en-CA'))}
                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl flex-1 transition-all ${isSelected ? 'bg-white text-[#1e3a8a] shadow-md scale-105' : 'text-blue-100 hover:bg-white/5'}`}
                            >
                                <span className={`text-[9px] font-bold mb-0.5 ${isSelected ? 'text-[#1e3a8a]/70' : 'text-blue-200'}`}>{date.toLocaleDateString('ar-EG', { weekday: 'short' })}</span>
                                <span className="text-sm font-black">{date.getDate()}</span>
                                {isToday && !isSelected && <div className="w-1 h-1 bg-amber-400 rounded-full mt-1 shadow-[0_0_5px_rgba(251,191,36,0.8)]"></div>}
                            </button>
                        );
                    })}
                </div>
                <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 text-white hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 rtl:rotate-180"/></button>
            </div>

            <div className="space-y-2 mb-1 px-1">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {availableGrades.length > 0 && (
                        <>
                            <button onClick={() => { setSelectedGrade('all'); setClassFilter('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-xl transition-all border ${selectedGrade === 'all' ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>الكل</button>
                            {availableGrades.map(g => (
                                <button key={g} onClick={() => { setSelectedGrade(g); setClassFilter('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-xl transition-all border ${selectedGrade === g ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>صف {g}</button>
                            ))}
                        </>
                    )}
                    {visibleClasses.map(c => (
                        <button key={c} onClick={() => setClassFilter(c)} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-xl transition-all border ${classFilter === c ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>{c}</button>
                    ))}
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-2 pb-20 custom-scrollbar pt-2">
            
            <div className="w-full h-[280px] shrink-0 md:h-0"></div>

            <div className="-mt-4 relative z-10 px-2">
                {/* Stats Section */}
                <div className="mb-4">
                    <div className="flex justify-between items-center gap-2 text-center">
                        <button onClick={() => markAll('present')} className="flex-1 bg-emerald-50 rounded-2xl p-2.5 border border-emerald-100 shadow-sm active:scale-95 transition-all group">
                            <span className="block text-[10px] text-emerald-600 font-bold mb-1 group-hover:underline">حضور (الكل)</span>
                            <span className="block text-xl font-black text-emerald-700">{stats.present}</span>
                        </button>
                        <button onClick={() => markAll('absent')} className="flex-1 bg-rose-50 rounded-2xl p-2.5 border border-rose-100 shadow-sm active:scale-95 transition-all group">
                            <span className="block text-[10px] text-rose-600 font-bold mb-1 group-hover:underline">غياب (الكل)</span>
                            <span className="block text-xl font-black text-rose-700">{stats.absent}</span>
                        </button>
                        <div className="flex-1 bg-amber-50 rounded-2xl p-2.5 border border-amber-100 shadow-sm">
                            <span className="block text-[10px] text-amber-600 font-bold mb-1">تأخير</span>
                            <span className="block text-xl font-black text-amber-700">{stats.late}</span>
                        </div>
                    </div>
                </div>

                {/* Cards Grid */}
                {filteredStudents.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredStudents.map(student => {
                            const status = getStatus(student);
                            return (
                                <div key={student.id} className={`bg-white rounded-[1.5rem] border-2 flex flex-col items-center overflow-hidden transition-all duration-200 ${
                                    status === 'present' ? 'border-emerald-400 shadow-md' : 
                                    status === 'absent' ? 'border-red-400 shadow-md' : 
                                    status === 'late' ? 'border-amber-400 shadow-md' :
                                    status === 'truant' ? 'border-purple-400 shadow-md' :
                                    'border-transparent shadow-sm'
                                }`}>
                                    {/* Upper Part: Image & Name */}
                                    <div className="p-4 flex flex-col items-center w-full">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 border-4 border-white shadow-sm mb-3 overflow-hidden">
                                             {/* ✅ استخدام الدالة الصحيحة */}
                                             {getStudentAvatar(student)}
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-sm text-center line-clamp-1 w-full">{student.name}</h3>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1 font-bold">{student.classes[0]}</span>
                                    </div>

                                    {/* Bottom Part: Action Buttons */}
                                    <div className="flex w-full border-t border-slate-100 divide-x divide-x-reverse divide-slate-100">
                                        <button 
                                            onClick={() => toggleAttendance(student.id, 'absent')}
                                            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 hover:bg-red-50 active:bg-red-100 transition-colors ${status === 'absent' ? 'bg-red-50 text-red-600' : 'text-slate-400'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-slate-200 text-white'}`}>✕</div>
                                            <span className="text-[10px] font-bold">غياب</span>
                                        </button>

                                        <button 
                                            onClick={() => toggleAttendance(student.id, 'truant')}
                                            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 hover:bg-purple-50 active:bg-purple-100 transition-colors ${status === 'truant' ? 'bg-purple-50 text-purple-600' : 'text-slate-400'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${status === 'truant' ? 'bg-purple-500 text-white' : 'bg-slate-200 text-white'}`}>
                                                <DoorOpen className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-bold">تسرب</span>
                                        </button>

                                        <button 
                                            onClick={() => toggleAttendance(student.id, 'late')}
                                            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 hover:bg-amber-50 active:bg-amber-100 transition-colors ${status === 'late' ? 'bg-amber-50 text-amber-600' : 'text-slate-400'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${status === 'late' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-white'}`}>⏰</div>
                                            <span className="text-[10px] font-bold">تأخر</span>
                                        </button>

                                        <button 
                                            onClick={() => toggleAttendance(student.id, 'present')}
                                            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 hover:bg-emerald-50 active:bg-emerald-100 transition-colors ${status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${status === 'present' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-white'}`}>✓</div>
                                            <span className="text-[10px] font-bold">حضور</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <UserCircle2 className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-sm font-bold text-gray-400">لا يوجد طلاب</p>
                    </div>
                )}
            </div>
        </div>

        {/* Notification Modal */}
        <Modal isOpen={!!notificationTarget} onClose={() => setNotificationTarget(null)} className="max-w-xs rounded-[2rem]">
            {notificationTarget && (
                <div className="text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${notificationTarget.type === 'absent' ? 'bg-rose-100 text-rose-600' : notificationTarget.type === 'late' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>
                        <MessageCircle className="w-8 h-8" />
                    </div>
                    <h3 className="font-black text-lg text-slate-800 mb-2">إشعار ولي الأمر</h3>
                    <p className="text-xs text-gray-500 font-bold mb-6">
                        هل تود إرسال رسالة لولي أمر الطالب <span className="text-indigo-600">{notificationTarget.student.name}</span> بخصوص {notificationTarget.type === 'absent' ? 'الغياب' : notificationTarget.type === 'late' ? 'التأخير' : 'التسرب'}؟
                    </p>
                    <div className="space-y-2">
                        <button onClick={() => performNotification('whatsapp')} className="w-full py-3 bg-[#25D366] text-white rounded-xl font-black text-xs shadow-lg shadow-green-200 flex items-center justify-center gap-2">
                            إرسال عبر واتساب
                        </button>
                        <button onClick={() => performNotification('sms')} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200">
                            إرسال SMS
                        </button>
                        <button onClick={() => setNotificationTarget(null)} className="w-full py-2 text-slate-400 font-bold text-xs">
                            إلغاء
                        </button>
                    </div>
                </div>
            )}
        </Modal>

    </div>
  );
};

export default AttendanceTracker;
