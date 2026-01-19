import React, { useState, useMemo } from 'react';
import { Student, AttendanceStatus } from '../types';
import { Check, X, Clock, Calendar, MessageCircle, ChevronDown, Loader2, Share2, DoorOpen, UserCircle2, ArrowUpDown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
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

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ students, classes, setStudents }) => {
  const today = new Date().toLocaleDateString('en-CA'); 
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<{student: Student, type: 'absent' | 'late' | 'truant'} | null>(null);

  const formatDateDisplay = (dateString: string) => {
      const d = new Date(dateString);
      return d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  };

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

      if (status === 'truant' && currentStatus !== 'truant') {
          setTimeout(() => setNotificationTarget({ student: newStudent, type: 'truant' }), 50);
      }

      return newStudent;
    }));
  };

  const handleMarkAll = (status: AttendanceStatus | 'reset') => {
      if (classFilter === 'all' && students.length > 50) {
          if (!confirm(`سيتم تطبيق هذا الإجراء على جميع الطلاب (${students.length}). هل أنت متأكد؟`)) return;
      }
      
      setStudents(prev => prev.map(s => {
          const matchesClass = classFilter === 'all' || s.classes.includes(classFilter);
          let matchesGrade = true;
          if (selectedGrade !== 'all') {
              matchesGrade = s.grade === selectedGrade || (s.classes[0] && s.classes[0].startsWith(selectedGrade));
          }

          if (!matchesClass || !matchesGrade) return s;

          const filtered = s.attendance.filter(a => a.date !== selectedDate);
          if (status === 'reset') {
              return { ...s, attendance: filtered };
          }
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
      return matchesClass && matchesGrade;
    });
  }, [students, classFilter, selectedGrade]);

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
      if (type === 'absent') statusText = 'غائب'; else if (type === 'late') statusText = 'متأخر'; else if (type === 'truant') statusText = 'تسرب من الحصة (هروب)';
      const dateText = new Date().toLocaleDateString('ar-EG');
      const msg = encodeURIComponent(`السلام عليكم، نود إشعاركم بأن الطالب ${student.name} تم تسجيل حالة: *${statusText}* اليوم (${dateText}). نرجو المتابعة.`);
      if (method === 'whatsapp') {
          if (window.electron) { window.electron.openExternal(`whatsapp://send?phone=${cleanPhone}&text=${msg}`); } 
          else { const universalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`; try { if (Capacitor.isNativePlatform()) { await Browser.open({ url: universalUrl }); } else { window.open(universalUrl, '_blank'); } } catch (e) { window.open(universalUrl, '_blank'); } }
      } else { window.location.href = `sms:${cleanPhone}?body=${msg}`; }
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
          const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(data);
          const wscols = [{wch:5}, {wch:25}, {wch:10}]; for(let i=0; i<daysInMonth; i++) wscols.push({wch:3});
          ws['!cols'] = wscols; if(!ws['!views']) ws['!views'] = []; ws['!views'].push({ rightToLeft: true });
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
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 relative animate-in fade-in duration-500 font-sans">
        
        {/* ================= Fixed Header (Blue & Curved) ================= */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-6 transition-all duration-300">
            
            {/* Top Row: Title & Export */}
            <div className="flex justify-between items-center mb-6 mt-2">
                <h1 className="text-xl font-black tracking-wide">رصد الحضور</h1>
                <button onClick={handleExportDailyExcel} disabled={isExportingExcel} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all shadow-sm border border-white/10" title="تصدير سجل شهري">
                     {isExportingExcel ? <Loader2 className="w-5 h-5 animate-spin"/> : <Share2 className="w-5 h-5"/>}
                </button>
            </div>

            {/* Date Scroller (Glassmorphism) */}
            <div className="flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1.5 mb-4 shadow-sm mx-1">
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toLocaleDateString('en-CA')); }} className="p-3 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white"><ChevronDown className="w-5 h-5 rotate-90"/></button>
                <div className="flex items-center gap-2 font-bold text-sm text-white px-4 py-2">
                    <Calendar className="w-4 h-4 text-blue-200"/>
                    {formatDateDisplay(selectedDate)}
                </div>
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toLocaleDateString('en-CA')); }} className="p-3 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white"><ChevronDown className="w-5 h-5 -rotate-90"/></button>
            </div>

            {/* Filters */}
            <div className="space-y-2 mb-2 px-1">
                {availableGrades.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button onClick={() => { setSelectedGrade('all'); setClassFilter('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-full transition-all border ${selectedGrade === 'all' ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30 hover:bg-white/10'}`}>كل المراحل</button>
                        {availableGrades.map(g => (
                            <button key={g} onClick={() => { setSelectedGrade(g); setClassFilter('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-full transition-all border ${selectedGrade === g ? 'bg-white text-[#1e3a8a] border-white shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30 hover:bg-white/10'}`}>صف {g}</button>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {visibleClasses.map(c => (
                        <button key={c} onClick={() => setClassFilter(c)} className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-xl transition-all ${classFilter === c ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>{c}</button>
                    ))}
                </div>
            </div>
        </div>

        {/* ================= Main Scrollable Content ================= */}
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
            
            {/* Space for Fixed Header + Floating Stats */}
            <div className="w-full h-[270px] shrink-0"></div>

            {/* Floating Stats Strip (Now overlaps the header curve) */}
            <div className="px-4 -mt-8 mb-6 relative z-40">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-1">
                    <div className="grid grid-cols-5 divide-x divide-x-reverse divide-slate-100">
                        <button onClick={() => handleMarkAll('present')} className="py-3 flex flex-col items-center justify-center active:bg-gray-50 rounded-r-xl transition-colors group">
                            <span className="text-[10px] font-bold text-gray-400 mb-1 group-hover:text-emerald-500">حضور</span>
                            <span className="text-sm font-black text-emerald-600">{stats.present}</span>
                        </button>
                        <button onClick={() => handleMarkAll('absent')} className="py-3 flex flex-col items-center justify-center active:bg-gray-50 transition-colors group">
                            <span className="text-[10px] font-bold text-gray-400 mb-1 group-hover:text-rose-500">غياب</span>
                            <span className="text-sm font-black text-rose-600">{stats.absent}</span>
                        </button>
                        <button onClick={() => handleMarkAll('late')} className="py-3 flex flex-col items-center justify-center active:bg-gray-50 transition-colors group">
                            <span className="text-[10px] font-bold text-gray-400 mb-1 group-hover:text-amber-500">تأخر</span>
                            <span className="text-sm font-black text-amber-500">{stats.late}</span>
                        </button>
                        <button onClick={() => handleMarkAll('truant')} className="py-3 flex flex-col items-center justify-center active:bg-gray-50 transition-colors group">
                            <span className="text-[10px] font-bold text-gray-400 mb-1 group-hover:text-purple-500">تسرب</span>
                            <span className="text-sm font-black text-purple-600">{stats.truant}</span>
                        </button>
                        <button onClick={() => handleMarkAll('reset')} className="py-3 flex flex-col items-center justify-center active:bg-gray-50 rounded-l-xl transition-colors group">
                            <span className="text-[10px] font-bold text-gray-400 mb-1 group-hover:text-slate-600">باقي</span>
                            <span className="text-sm font-black text-slate-500">{stats.total - (stats.present + stats.absent + stats.late + stats.truant)}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Student List */}
            <div className="px-4 pb-24">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a]"></span>
                        قائمة الطلاب ({filteredStudents.length})
                    </h3>
                </div>

                {filteredStudents.length > 0 ? (
                    <div className="space-y-3">
                        {filteredStudents.map((student, index) => {
                            const status = getStatus(student);
                            return (
                                <div 
                                    key={student.id} 
                                    className={`
                                        group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden
                                        ${status 
                                            ? 'bg-white border-blue-200 shadow-md shadow-blue-500/10' 
                                            : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md shadow-sm'
                                        }
                                    `}
                                >
                                    {/* Status Indicator Bar */}
                                    <div className={`absolute top-0 right-0 w-1 h-full transition-colors ${
                                        status === 'present' ? 'bg-emerald-500' :
                                        status === 'absent' ? 'bg-rose-500' :
                                        status === 'late' ? 'bg-amber-500' :
                                        status === 'truant' ? 'bg-purple-500' : 'bg-transparent'
                                    }`}></div>

                                    {/* Info */}
                                    <div className="flex items-center gap-4 min-w-0 flex-1 relative z-10 pl-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-slate-50 text-slate-400 overflow-hidden border border-slate-100 shadow-sm`}>
                                            {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" /> : student.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className={`text-sm font-bold truncate ${status ? 'text-[#1e3a8a]' : 'text-slate-800'}`}>{student.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{student.classes[0]}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 relative z-10">
                                        <button onClick={() => toggleAttendance(student.id, 'present')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}>
                                            <Check className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        <button onClick={() => toggleAttendance(student.id, 'absent')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'absent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500'}`}>
                                            <X className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        <button onClick={() => toggleAttendance(student.id, 'late')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'late' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`}>
                                            <Clock className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        <button onClick={() => toggleAttendance(student.id, 'truant')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'truant' ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-slate-50 text-slate-400 hover:bg-purple-50 hover:text-purple-500'}`}>
                                            <DoorOpen className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                        {/* زر إشعار ولي الأمر يظهر فقط عند وجود حالة */}
                                        {status && status !== 'present' && (
                                            <button onClick={() => setNotificationTarget({ student, type: status as any })} className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center active:scale-95 hover:bg-blue-100 transition-colors ml-1 border border-blue-100">
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <UserCircle2 className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-xs font-bold text-gray-400">لا يوجد طلاب</p>
                    </div>
                )}
            </div>
        </div>

        {/* Notification Modal */}
        <Modal isOpen={!!notificationTarget} onClose={() => setNotificationTarget(null)} className="max-w-xs rounded-[2rem]">
            <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500 shadow-sm border border-blue-100">
                    <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="font-black text-lg mb-1 text-slate-800">إشعار ولي الأمر</h3>
                <p className="text-xs text-gray-500 mb-6 font-bold">{notificationTarget?.student.name} - {notificationTarget?.type === 'truant' ? 'تسرب من الحصة' : (notificationTarget?.type === 'absent' ? 'غياب' : 'تأخير')}</p>
                
                <div className="space-y-3">
                    <button onClick={() => performNotification('whatsapp')} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all active:scale-95">
                        <MessageCircle className="w-5 h-5" /> واتساب
                    </button>
                    <button onClick={() => performNotification('sms')} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 border border-slate-700">
                        رسالة نصية (SMS)
                    </button>
                    <button onClick={() => setNotificationTarget(null)} className="text-xs font-bold text-gray-400 mt-2 hover:text-gray-600">إلغاء</button>
                </div>
            </div>
        </Modal>

    </div>
  );
};

export default AttendanceTracker;
