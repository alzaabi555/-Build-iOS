import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceStatus } from '../types';
import { ChevronDown, Loader2, UserCircle2, ArrowRight, Smartphone, Mail, Calendar } from 'lucide-react'; 
import { Browser } from '@capacitor/browser';
import * as XLSX from 'xlsx';
import Modal from './Modal';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext';

// --- أيقونات 3D الجديدة (SVG Components) ---

const Icon3DPresent = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
      <filter id="shadowGreen" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="1" dy="2" result="offsetblur" />
        <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#gradGreen)" filter="url(#shadowGreen)" />
    <path d="M30 50 L45 65 L70 35" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="35" cy="35" r="5" fill="white" opacity="0.3" />
  </svg>
);

const Icon3DLate = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <filter id="shadowAmber" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="1" dy="2" result="offsetblur" />
        <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#gradAmber)" filter="url(#shadowAmber)" />
    <circle cx="50" cy="50" r="35" fill="#fff7ed" opacity="0.4" />
    <path d="M50 25 V50 L65 60" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" />
    <circle cx="50" cy="50" r="4" fill="white" />
    <circle cx="30" cy="30" r="6" fill="white" opacity="0.5" />
  </svg>
);

const Icon3DAbsent = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
      <filter id="shadowRed" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="1" dy="2" result="offsetblur" />
        <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#gradRed)" filter="url(#shadowRed)" />
    <path d="M35 35 L65 65 M65 35 L35 65" stroke="white" strokeWidth="8" strokeLinecap="round" />
    <circle cx="50" cy="25" r="5" fill="white" opacity="0.3" />
  </svg>
);

const Icon3DTruant = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradPurple" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <filter id="shadowPurple" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="1" dy="2" result="offsetblur" />
        <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect x="20" y="15" width="60" height="70" rx="4" fill="#ddd6fe" filter="url(#shadowPurple)" />
    <rect x="25" y="20" width="50" height="65" rx="2" fill="#5b21b6" />
    <path d="M25 20 L65 25 L65 80 L25 85 Z" fill="url(#gradPurple)" />
    <circle cx="55" cy="55" r="3" fill="white" />
    <path d="M50 20 L75 25 L75 80 L50 85" fill="black" opacity="0.1" />
  </svg>
);

const Icon3DExport = () => (
  <svg viewBox="0 0 100 100" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradExcel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="shadowExport" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
        <feOffset dx="1" dy="1" result="offsetblur" />
        <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect x="20" y="20" width="60" height="60" rx="8" fill="url(#gradExcel)" filter="url(#shadowExport)" />
    <path d="M35 35 H65 M35 50 H65 M35 65 H50" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    <path d="M60 60 L75 75 M75 75 L60 75 M75 75 L75 60" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ✅ New 3D WhatsApp/Message Icon
const Icon3DMessage = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradChat" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" /> {/* WhatsApp Light Green */}
        <stop offset="100%" stopColor="#16a34a" /> {/* WhatsApp Dark Green */}
      </linearGradient>
      <filter id="shadowChat" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="1" dy="2" result="offsetblur" />
        <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    {/* Bubble Body */}
    <path d="M50 15 C26 15 6 32 6 54 C6 63 9 71 14 78 L9 93 L26 88 C33 92 41 94 50 94 C74 94 94 76 94 54 C94 32 74 15 50 15" fill="url(#gradChat)" filter="url(#shadowChat)" />
    {/* Phone Handset Symbol */}
    <path d="M35 40 C35 40 37 38 39 38 C41 38 43 39 44 42 L46 47 C47 48 46 50 45 51 L43 53 C43 53 44 57 48 61 C52 65 56 66 56 66 L58 64 C59 63 61 63 62 63 L67 65 C69 66 69 68 69 70 C69 72 67 74 65 74 C62 74 58 73 53 69 C48 65 42 59 38 54 C35 49 34 44 34 42 C34 40 35 40 35 40" fill="white" />
    <circle cx="65" cy="35" r="5" fill="white" opacity="0.4" />
  </svg>
);

// -----------------------------------------------------------

interface AttendanceTrackerProps {
  students: Student[];
  classes: string[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ students, classes, setStudents }) => {
  const { teacherInfo, periodTimes } = useApp();
  const today = new Date().toLocaleDateString('en-CA'); 
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<{student: Student, type: 'absent' | 'late' | 'truant'} | null>(null);
  
  const [currentSessionInfo, setCurrentSessionInfo] = useState<{period: string, time: string}>({period: '', time: ''});

  useEffect(() => {
      const updateTime = () => {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const activePeriod = periodTimes.find(pt => {
              const [sh, sm] = pt.startTime.split(':').map(Number);
              const [eh, em] = pt.endTime.split(':').map(Number);
              const start = sh * 60 + sm;
              const end = eh * 60 + em;
              return currentMinutes >= start && currentMinutes <= end;
          });

          if (activePeriod) {
              setCurrentSessionInfo({
                  period: `الحصة ${activePeriod.periodNumber}`,
                  time: `${activePeriod.startTime} - ${activePeriod.endTime}`
              });
          } else {
              setCurrentSessionInfo({ period: 'خارج الدوام', time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}) });
          }
      };
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
  }, [periodTimes]);

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
        attendance: currentStatus === status ? filtered : [...filtered, { 
            date: selectedDate, 
            status,
            period: (status === 'truant' || status === 'absent') ? currentSessionInfo.period : undefined
        }]
      };
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
             if (s.grade === selectedGrade) matchesGrade = true;
             else if (s.classes[0]) {
                 if (s.classes[0].includes('/')) matchesGrade = s.classes[0].split('/')[0].trim() === selectedGrade;
                 else matchesGrade = s.classes[0].startsWith(selectedGrade);
             }
          }

          if (!matchesClass || !matchesGrade) return s;

          const filtered = s.attendance.filter(a => a.date !== selectedDate);
          if (status === 'reset') {
              return { ...s, attendance: filtered };
          }
          return {
              ...s,
              attendance: [...filtered, { 
                  date: selectedDate, 
                  status,
                  period: (status === 'truant' || status === 'absent') ? currentSessionInfo.period : undefined
              }]
          };
      }));
  };

  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      classes.forEach(c => {
          if (c.includes('/')) {
              grades.add(c.split('/')[0].trim());
          } else {
              const numMatch = c.match(/^(\d+)/);
              if (numMatch) grades.add(numMatch[1]);
              else grades.add(c.split(' ')[0]);
          }
      });
      students.forEach(s => { if (s.grade) grades.add(s.grade); });
      
      return Array.from(grades).sort((a, b) => {
          const numA = parseInt(a);
          const numB = parseInt(b);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
      });
  }, [students, classes]);

  const visibleClasses = useMemo(() => {
      if (selectedGrade === 'all') return classes;
      return classes.filter(c => {
          if (c.includes('/')) return c.split('/')[0].trim() === selectedGrade;
          return c.startsWith(selectedGrade);
      });
  }, [classes, selectedGrade]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = classFilter === 'all' || s.classes.includes(classFilter);
      let matchesGrade = true;
      if (selectedGrade !== 'all') {
          if (s.grade === selectedGrade) matchesGrade = true;
          else if (s.classes[0]) {
              if (s.classes[0].includes('/')) matchesGrade = s.classes[0].split('/')[0].trim() === selectedGrade;
              else matchesGrade = s.classes[0].startsWith(selectedGrade);
          } else matchesGrade = false;
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
      
      if (cleanPhone.length === 8) {
          cleanPhone = '968' + cleanPhone;
      } else if (cleanPhone.startsWith('00')) {
          cleanPhone = cleanPhone.substring(2);
      } else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) {
          cleanPhone = '968' + cleanPhone.substring(1);
      }

      if (cleanPhone.length < 8) {
          alert('رقم الهاتف يبدو غير صحيح');
          return;
      }

      let statusText = '';
      if (type === 'absent') statusText = 'غائب'; 
      else if (type === 'late') statusText = 'متأخر'; 
      else if (type === 'truant') statusText = 'تسرب من الحصة (هروب)';
      
      const dateText = new Date().toLocaleDateString('ar-EG');
      const msg = `السلام عليكم، نود إشعاركم بأن الطالب *${student.name}* تم تسجيل حالة: *${statusText}* اليوم (${dateText}) في حصة ${teacherInfo.subject}. نرجو المتابعة.`;
      
      const encodedMsg = encodeURIComponent(msg);

      if (method === 'whatsapp') {
          const universalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
          try { 
              if (Capacitor.isNativePlatform()) { 
                  await Browser.open({ url: universalUrl }); 
              } else { 
                  window.open(universalUrl, '_blank'); 
              } 
          } catch (e) { 
              window.open(universalUrl, '_blank'); 
          }
      } else { 
          window.location.href = `sms:${cleanPhone}?body=${encodedMsg}`; 
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
        
        {/* ================= HEADER ================= */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-6 pt-[env(safe-area-inset-top)] pb-8 transition-all duration-300">
            
            <div className="flex justify-center items-center mt-4 mb-2 relative">
                <h1 className="text-xl font-bold tracking-wide opacity-90">رصد الحضور</h1>
                <button onClick={handleExportDailyExcel} disabled={isExportingExcel} className="absolute left-0 w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all" title="تصدير سجل شهري">
                     {isExportingExcel ? <Loader2 className="w-5 h-5 animate-spin"/> : <Icon3DExport />}
                </button>
            </div>

            <div className="text-center space-y-2 mb-6">
                <h2 className="text-3xl font-black tracking-tight drop-shadow-md truncate px-4">
                    {teacherInfo.subject || 'المادة'}
                    {classFilter !== 'all' && <span className="text-2xl font-bold mx-2 block mt-1">{classFilter}</span>}
                </h2>
                <div className="flex justify-center items-center gap-3 text-blue-200 text-sm font-bold dir-ltr bg-white/10 w-fit mx-auto px-4 py-1 rounded-full">
                    <span>{currentSessionInfo.time}</span>
                    <span>•</span>
                    <span>{currentSessionInfo.period}</span>
                </div>
            </div>

            <div className="space-y-3">
                {/* Date Selection */}
                <div className="flex items-center justify-center gap-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-2 max-w-sm mx-auto">
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toLocaleDateString('en-CA')); }} className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white"><ArrowRight className="w-5 h-5"/></button>
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                        <Calendar className="w-4 h-4 text-blue-200"/>
                        {formatDateDisplay(selectedDate)}
                    </div>
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toLocaleDateString('en-CA')); }} className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white"><ArrowRight className="w-5 h-5 rotate-180"/></button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar justify-center pb-2">
                    <button onClick={() => { setClassFilter('all'); setSelectedGrade('all'); }} className={`px-5 py-2 text-xs font-bold whitespace-nowrap rounded-full transition-all border ${classFilter === 'all' ? 'bg-white text-[#1e3a8a] shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30'}`}>الكل</button>
                    {visibleClasses.map(c => (
                        <button key={c} onClick={() => setClassFilter(c)} className={`px-5 py-2 text-xs font-bold whitespace-nowrap rounded-full transition-all border ${classFilter === c ? 'bg-white text-[#1e3a8a] shadow-md' : 'bg-transparent text-blue-200 border-blue-200/30'}`}>{c}</button>
                    ))}
                </div>
            </div>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
            
            <div className="w-full h-[340px] shrink-0"></div>

            <div className="px-4 pb-24 -mt-4 relative z-10">
                
                {/* Stats */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-2 mb-6 flex justify-around">
                     <div className="text-center"><span className="block text-xs text-gray-400 font-bold mb-1">الطلاب</span><span className="text-lg font-black text-slate-800">{filteredStudents.length}</span></div>
                     <div className="w-px bg-gray-100"></div>
                     <div className="text-center cursor-pointer hover:bg-rose-50 rounded-lg p-1 transition-colors" onClick={() => handleMarkAll('absent')}><span className="block text-xs text-rose-400 font-bold mb-1">غياب</span><span className="text-lg font-black text-rose-600">{stats.absent}</span></div>
                     <div className="w-px bg-gray-100"></div>
                     <div className="text-center cursor-pointer hover:bg-emerald-50 rounded-lg p-1 transition-colors" onClick={() => handleMarkAll('present')}><span className="block text-xs text-emerald-400 font-bold mb-1">حضور</span><span className="text-lg font-black text-emerald-600">{stats.present}</span></div>
                </div>

                {filteredStudents.length > 0 ? (
                    <div className="space-y-4">
                        {filteredStudents.map((student) => {
                            const status = getStatus(student);
                            
                            let cardClasses = "bg-white border-slate-200";
                            if (status === 'present') cardClasses = "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300 shadow-emerald-100";
                            else if (status === 'absent') cardClasses = "bg-rose-50 border-rose-300 ring-1 ring-rose-300 shadow-rose-100";
                            else if (status === 'late') cardClasses = "bg-amber-50 border-amber-300 ring-1 ring-amber-300 shadow-amber-100";
                            else if (status === 'truant') cardClasses = "bg-purple-50 border-purple-300 ring-1 ring-purple-300 shadow-purple-100";

                            return (
                                <div key={student.id} className={`flex flex-col p-5 rounded-[1.5rem] border-2 transition-all duration-300 shadow-sm ${cardClasses}`}>
                                    
                                    {/* Student Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden border-2 border-white/50 shadow-sm shrink-0">
                                                {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover"/> : <span className="text-lg font-black text-slate-300">{student.name.charAt(0)}</span>}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-900 leading-tight">{student.name}</h3>
                                                <span className="text-[10px] font-bold text-slate-500 bg-white/50 px-2 py-0.5 rounded-lg mt-1 inline-block" dir="ltr">ID: {student.id.substring(0,6)}</span>
                                            </div>
                                        </div>
                                        
                                        {/* زر الواتساب يظهر هنا عند وجود حالة سلبية */}
                                        {(status && status !== 'present') && (
                                            <button onClick={() => setNotificationTarget({ student, type: status as any })} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 animate-in zoom-in">
                                                {/* تم استبدال MessageCircle بأيقونة 3D الجديدة */}
                                                <Icon3DMessage className="w-6 h-6" />
                                            </button>
                                        )}
                                    </div>

                                    {/* 3. أزرار كبيرة وملونة */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <button 
                                            onClick={() => toggleAttendance(student.id, 'present')}
                                            className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${status === 'present' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-100'}`}
                                        >
                                            <Icon3DPresent />
                                            <span className="text-[10px] font-bold mt-1">حضور</span>
                                        </button>

                                        <button 
                                            onClick={() => toggleAttendance(student.id, 'late')}
                                            className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${status === 'late' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-amber-50 hover:text-amber-500 border border-slate-100'}`}
                                        >
                                            <Icon3DLate />
                                            <span className="text-[10px] font-bold mt-1">تأخر</span>
                                        </button>

                                        <button 
                                            onClick={() => toggleAttendance(student.id, 'absent')}
                                            className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${status === 'absent' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 border border-slate-100'}`}
                                        >
                                            <Icon3DAbsent />
                                            <span className="text-[10px] font-bold mt-1">غياب</span>
                                        </button>

                                        <button 
                                            onClick={() => toggleAttendance(student.id, 'truant')}
                                            className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${status === 'truant' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-purple-50 hover:text-purple-500 border border-slate-100'}`}
                                        >
                                            <Icon3DTruant />
                                            <span className="text-[10px] font-bold mt-1">تسرب</span>
                                        </button>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <UserCircle2 className="w-20 h-20 text-gray-300 mb-4" />
                        <p className="text-sm font-bold text-gray-400">لا يوجد طلاب للعرض</p>
                    </div>
                )}
            </div>
        </div>

        {/* Notification Modal */}
        <Modal isOpen={!!notificationTarget} onClose={() => setNotificationTarget(null)} className="max-w-xs rounded-[2rem]">
            <div className="text-center p-2">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                     {/* تم استبدال الأيقونة هنا أيضاً */}
                    <Icon3DMessage className="w-10 h-10" />
                </div>
                <h3 className="font-black text-lg mb-1 text-slate-900">إشعار ولي الأمر</h3>
                <p className="text-xs text-gray-500 mb-6 font-bold leading-relaxed">
                    إرسال تنبيه بخصوص حالة الطالب <span className="text-slate-900">{notificationTarget?.student.name}</span>
                    <br/>
                    ({notificationTarget?.type === 'truant' ? 'تسرب' : notificationTarget?.type === 'absent' ? 'غياب' : 'تأخر'})
                </p>
                
                <div className="space-y-3">
                    <button onClick={() => performNotification('whatsapp')} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-green-200 active:scale-95 transition-transform">
                        <Smartphone className="w-5 h-5" /> عبر واتساب
                    </button>
                    <button onClick={() => performNotification('sms')} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform">
                        <Mail className="w-5 h-5" /> رسالة نصية (SMS)
                    </button>
                    <button onClick={() => setNotificationTarget(null)} className="text-xs font-bold text-gray-400 mt-2 hover:text-gray-600 py-2">إلغاء</button>
                </div>
            </div>
        </Modal>

    </div>
  );
};

export default AttendanceTracker;
