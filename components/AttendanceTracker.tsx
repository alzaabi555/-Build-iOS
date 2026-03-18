import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceStatus } from '../types';
import { MessageCircle, Loader2, Share2, DoorOpen, UserCircle2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import * as XLSX from 'xlsx';
import Modal from './Modal';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { StudentAvatar } from './StudentAvatar';
import { useApp } from '../context/AppContext'; // 🌍 استيراد السياق للغات

interface AttendanceTrackerProps {
  students: Student[];
  classes: string[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ students, classes, setStudents }) => {
  // 🌍 استدعاء محرك الترجمة
  const { t, dir, language } = useApp();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toLocaleDateString('en-CA'));
  
  const [selectedGrade, setSelectedGrade] = useState<string>(() => sessionStorage.getItem('rased_grade') || 'all');
  const [classFilter, setClassFilter] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<{student: Student, type: 'absent' | 'late' | 'truant'} | null>(null);
  
  const [isRamadan] = useState(() => {
      try {
          const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' }).formatToParts(new Date());
          return parseInt(parts.find(p => p.type === 'month')?.value || '0') === 9;
      } catch(e) {
          return false;
      }
  });

  useEffect(() => {
      sessionStorage.setItem('rased_grade', selectedGrade);
      sessionStorage.setItem('rased_class', classFilter);
  }, [selectedGrade, classFilter]);

  const [weekOffset, setWeekOffset] = useState(0);
  
  const weekDates = useMemo(() => {
      const dates = [];
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - (today.getDay()) + (weekOffset * 7)); 
      
      for (let i = 0; i < 5; i++) { 
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
  }, [students]);

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
      if(!notificationTarget || !notificationTarget.student.parentPhone) { alert(t('noPhoneRegistered')); return; }
      const { student, type } = notificationTarget;
      let cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 5) return alert(t('invalidPhone'));
      if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
      if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
      else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) cleanPhone = '968' + cleanPhone.substring(1);
      
      let statusText = '';
      if (type === 'absent') statusText = t('statusAbsent'); 
      else if (type === 'late') statusText = t('statusLate'); 
      else if (type === 'truant') statusText = t('statusTruant');
      
      const dateText = new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
      const msg = encodeURIComponent(`${t('whatsappMsgPart1')} ${student.name} ${t('whatsappMsgPart2')}${statusText}${t('whatsappMsgPart3')}${dateText}${t('whatsappMsgPart4')}`);
      
      if (method === 'whatsapp') {
          if ((window as any).electron) { (window as any).electron.openExternal(`whatsapp://send?phone=${cleanPhone}&text=${msg}`); } 
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
      if (filteredStudents.length === 0) return alert(t('noStudents'));
      setIsExportingExcel(true);
      try {
          const targetDate = new Date(selectedDate);
          const year = targetDate.getFullYear();
          const month = targetDate.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const data = filteredStudents.map((s, idx) => {
              const row: any = { 
                [t('excelNo')]: idx + 1, 
                [t('excelStudentName')]: s.name, 
                [t('excelClass')]: s.classes[0] || '' 
              };
              let abs = 0, late = 0, truant = 0;
              for (let d = 1; d <= daysInMonth; d++) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const record = s.attendance.find(a => a.date === dateStr);
                  let symbol = '';
                  if (record) {
                      if (record.status === 'present') symbol = '✓';
                      else if (record.status === 'absent') { symbol = language === 'ar' ? 'غ' : 'A'; abs++; }
                      else if (record.status === 'late') { symbol = language === 'ar' ? 'ت' : 'L'; late++; }
                      else if (record.status === 'truant') { symbol = language === 'ar' ? 'س' : 'T'; truant++; }
                  }
                  row[`${d}`] = symbol;
              }
              row[t('excelTotalAbsent')] = abs; 
              row[t('excelTotalLate')] = late; 
              row[t('excelTotalTruant')] = truant;
              return row;
          });
          const wb = XLSX.utils.book_new(); 
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, `${t('excelMonthPrefix')}${month + 1}`);
          const fileName = `Attendance_${month + 1}.xlsx`;
          if (Capacitor.isNativePlatform()) {
              const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
              const result = await Filesystem.writeFile({ path: fileName, data: wbout, directory: Directory.Cache });
              await Share.share({ title: t('attendanceRecord'), url: result.uri });
          } else { XLSX.writeFile(wb, fileName); }
      } catch (error) { alert(t('exportError')); } finally { setIsExportingExcel(false); }
  };

  // 🌍 تطبيق اتجاه الصفحة بالكامل
  return (
    <div className={`flex flex-col h-full relative ${isRamadan ? 'text-white' : 'text-slate-800'} ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
        
        {/* ================= FIXED HEADER ================= */}
            <header 
                className={`pt-10 pb-6 px-4 md:pt-14 md:pb-8 md:px-6 md:pl-40 shadow-lg relative z-20 -mx-4 -mt-4 transition-all duration-500 ${isRamadan ? 'bg-white/5 border-b border-white/10 text-white' : 'bg-[#446A8D] text-white'}`}
                style={{ WebkitAppRegion: 'drag' } as any}
            >
                <div className="flex justify-between items-center gap-3 mb-5">
                    <h1 className="text-xl md:text-2xl font-black tracking-wide shrink-0">{t('attendanceTitle')}</h1>
                    
                    <div className="flex-1 relative group" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200`} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('searchStudentPlaceholder')} 
                            className={`w-full border rounded-xl py-2.5 ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs font-bold outline-none transition-all ${isRamadan ? 'bg-white/10 border-white/20 text-white placeholder:text-blue-200/70 focus:bg-white/20' : 'bg-white/20 border-white/30 text-white placeholder:text-blue-100 focus:bg-white/30'}`}
                        />
                    </div>

                    <button 
                        onClick={handleExportDailyExcel} 
                        disabled={isExportingExcel} 
                        className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${isRamadan ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}
                        style={{ WebkitAppRegion: 'no-drag' } as any}
                        title={t('exportRecord')}
                    >
                         {isExportingExcel ? <Loader2 className="w-5 h-5 animate-spin"/> : <Share2 className="w-5 h-5"/>}
                    </button>
                </div>

                <div className={`flex items-center justify-between gap-1 mb-4 p-2 rounded-2xl border shadow-inner ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-white/10 border-white/20'}`} style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1 text-white hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-0' : 'rotate-180'}`}/></button>
                    <div className="flex flex-1 justify-between gap-1 text-center">
                        {weekDates.map((date, idx) => {
                            const isSelected = date.toLocaleDateString('en-CA') === selectedDate;
                            const isToday = date.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA');
                            return (
                                <button 
                                    key={idx} 
                                    onClick={() => setSelectedDate(date.toLocaleDateString('en-CA'))}
                                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl flex-1 transition-all ${isSelected ? (isRamadan ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-md scale-105' : 'bg-white text-[#1e3a8a] shadow-md scale-105') : 'text-blue-100 hover:bg-white/5'}`}
                                >
                                    <span className={`text-[9px] font-bold mb-0.5 ${isSelected ? (isRamadan ? 'text-amber-200' : 'text-[#1e3a8a]/70') : 'text-blue-200'}`}>{date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' })}</span>
                                    <span className="text-sm font-black">{date.getDate()}</span>
                                    {isToday && !isSelected && <div className="w-1 h-1 bg-amber-400 rounded-full mt-1"></div>}
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 text-white hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-0' : 'rotate-180'}`}/></button>
                </div>

                <div className="space-y-2 mb-1 px-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible pb-2">
                        <button onClick={() => { setSelectedGrade('all'); setClassFilter('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-xl transition-all border ${selectedGrade === 'all' ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>{t('all')}</button>
                        {availableGrades.map(g => (
                            <button key={g} onClick={() => { setSelectedGrade(g); setClassFilter('all'); }} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-xl transition-all border ${selectedGrade === g ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>{t('gradePrefix')} {g}</button>
                        ))}
                        {visibleClasses.map(c => (
                            <button key={c} onClick={() => setClassFilter(c)} className={`px-4 py-1.5 text-[10px] font-bold whitespace-nowrap rounded-xl transition-all border ${classFilter === c ? (isRamadan ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md' : 'bg-white text-[#1e3a8a] shadow-md border-white') : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'}`}>{c}</button>
                        ))}
                    </div>
                </div>
            </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-2 pb-20 custom-scrollbar pt-2">
            <div className="w-full h-[80px] shrink-0 md:h-0"></div>

            <div className="-mt-4 relative z-10 px-2">
                <div className="mb-4">
                    <div className="flex justify-between items-center gap-2 text-center">
                        <button onClick={() => markAll('present')} className={`flex-1 rounded-2xl p-2.5 border shadow-sm active:scale-95 transition-all ${isRamadan ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-emerald-50 border-emerald-100'}`}>
                            <span className={`block text-[10px] font-bold mb-1 ${isRamadan ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('presentAll')}</span>
                            <span className={`block text-xl font-black ${isRamadan ? 'text-emerald-300' : 'text-emerald-700'}`}>{stats.present}</span>
                        </button>
                        <button onClick={() => markAll('absent')} className={`flex-1 rounded-2xl p-2.5 border shadow-sm active:scale-95 transition-all ${isRamadan ? 'bg-rose-500/10 border-rose-400/30' : 'bg-rose-50 border-rose-100'}`}>
                            <span className={`block text-[10px] font-bold mb-1 ${isRamadan ? 'text-rose-400' : 'text-rose-600'}`}>{t('absentAll')}</span>
                            <span className={`block text-xl font-black ${isRamadan ? 'text-rose-300' : 'text-rose-700'}`}>{stats.absent}</span>
                        </button>
                        <div className={`flex-1 rounded-2xl p-2.5 border shadow-sm ${isRamadan ? 'bg-amber-500/10 border-amber-400/30' : 'bg-amber-50 border-amber-100'}`}>
                            <span className={`block text-[10px] font-bold mb-1 ${isRamadan ? 'text-amber-400' : 'text-amber-600'}`}>{t('lateAll')}</span>
                            <span className={`block text-xl font-black ${isRamadan ? 'text-amber-300' : 'text-amber-700'}`}>{stats.late}</span>
                        </div>
                    </div>
                </div>

                {filteredStudents.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredStudents.map(student => {
                            const status = getStatus(student);
                            return (
                                <div key={student.id} className={`rounded-[1.5rem] border-2 flex flex-col items-center overflow-hidden transition-all duration-200 ${isRamadan ? 'bg-white/5 hover:bg-white/10' : 'bg-white'} ${
                                    status === 'present' ? (isRamadan ? 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'border-emerald-400') : 
                                    status === 'absent' ? (isRamadan ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : 'border-red-400') : 
                                    status === 'late' ? (isRamadan ? 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.15)]' : 'border-amber-400') :
                                    status === 'truant' ? (isRamadan ? 'border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.15)]' : 'border-purple-400') :
                                    (isRamadan ? 'border-white/10 shadow-sm' : 'border-transparent shadow-sm')
                                }`}>
                                    <div className="p-4 flex flex-col items-center w-full">
                                        <StudentAvatar gender={student.gender} className="w-16 h-16" />
                                        <h3 className={`font-bold text-sm text-center line-clamp-1 w-full mt-3 ${isRamadan ? 'text-white' : 'text-slate-900'}`}>{student.name}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 font-bold ${isRamadan ? 'bg-white/5 text-indigo-200 border border-white/10' : 'bg-slate-100 text-slate-400'}`}>{student.classes[0]}</span>
                                    </div>

                                    <div className={`flex w-full border-t divide-x ${dir === 'rtl' ? 'divide-x-reverse' : ''} ${isRamadan ? 'border-white/10 divide-white/10' : 'border-slate-100 divide-slate-100'}`}>
                                        
                                        <button onClick={() => toggleAttendance(student.id, 'present')} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${status === 'present' ? (isRamadan ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isRamadan ? 'text-slate-400 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50')}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${status === 'present' ? 'bg-emerald-500 text-white' : (isRamadan ? 'bg-white/10 text-white/40' : 'bg-slate-200 text-white')}`}>✓</div>
                                            <span className="text-[10px] font-bold">{t('present')}</span>
                                        </button>

                                        <button onClick={() => toggleAttendance(student.id, 'absent')} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${status === 'absent' ? (isRamadan ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600') : (isRamadan ? 'text-slate-400 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50')}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${status === 'absent' ? 'bg-red-500 text-white' : (isRamadan ? 'bg-white/10 text-white/40' : 'bg-slate-200 text-white')}`}>✕</div>
                                            <span className="text-[10px] font-bold">{t('absent')}</span>
                                        </button>

                                        <button onClick={() => toggleAttendance(student.id, 'late')} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${status === 'late' ? (isRamadan ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600') : (isRamadan ? 'text-slate-400 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50')}`}>
                                            <div className={`text-xs opacity-80 ${status === 'late' ? '' : 'grayscale'}`}>⏰</div>
                                            <span className="text-[10px] font-bold">{t('late')}</span>
                                        </button>

                                        <button onClick={() => toggleAttendance(student.id, 'truant')} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${status === 'truant' ? (isRamadan ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600') : (isRamadan ? 'text-slate-400 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50')}`}>
                                            <div className={`w-6 h-6 flex items-center justify-center`}>
                                                <DoorOpen className={`w-4 h-4 transition-colors ${status === 'truant' ? (isRamadan ? 'text-purple-400' : 'text-purple-600') : (isRamadan ? 'text-white/40' : 'text-slate-400')}`} />
                                            </div>
                                            <span className="text-[10px] font-bold">{t('truant')}</span>
                                        </button>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`flex flex-col items-center justify-center py-20 ${isRamadan ? 'opacity-70' : 'opacity-50'}`}>
                        <UserCircle2 className={`w-16 h-16 mb-4 ${isRamadan ? 'text-white/20' : 'text-gray-300'}`} />
                        <p className={`text-sm font-bold ${isRamadan ? 'text-indigo-200/50' : 'text-gray-400'}`}>{t('noStudents')}</p>
                    </div>
                )}
            </div>
        </div>

        {/* 🚀 نافذة إشعار ولي الأمر المصلحة */}
        <Modal 
            isOpen={!!notificationTarget} 
            onClose={() => setNotificationTarget(null)} 
            className={`max-w-xs rounded-[2.5rem] overflow-hidden ${isRamadan ? 'bg-transparent' : 'bg-white'}`}
        >
            {notificationTarget && (
                <div className={`text-center p-8 rounded-[2.5rem] border transition-all duration-500 ${
                    isRamadan 
                    ? 'bg-[#0f172a]/95 backdrop-blur-2xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]' 
                    : 'bg-white border-gray-100 shadow-2xl'
                }`}>
                    
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-inner ${
                        notificationTarget.type === 'absent' ? (isRamadan ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600') : 
                        notificationTarget.type === 'late' ? (isRamadan ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600') : 
                        (isRamadan ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600')
                    }`}>
                        <MessageCircle className="w-10 h-10" />
                    </div>

                    <h3 className={`font-black text-xl mb-3 ${isRamadan ? 'text-white' : 'text-[#1e293b]'}`}>
                        {t('parentNotification')}
                    </h3>
                    
                    <div className={`text-sm font-bold mb-8 leading-relaxed ${isRamadan ? 'text-indigo-200/80' : 'text-slate-500'}`}>
                        {t('sendAlertPrompt')}
                        <div className={`text-lg mt-2 font-black ${isRamadan ? 'text-amber-400' : 'text-[#4338ca]'}`}>
                            {notificationTarget.student.name}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={() => performNotification('whatsapp')} 
                            className={`w-full py-4 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${
                                isRamadan 
                                ? 'bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/30' 
                                : 'bg-[#25D366] hover:bg-[#1fa851]'
                            }`}
                        >
                            <MessageCircle className="w-5 h-5" />
                            {t('sendWhatsapp')}
                        </button>

                        <button 
                            onClick={() => performNotification('sms')} 
                            className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 border ${
                                isRamadan 
                                ? 'bg-white/5 text-white border-white/10 hover:bg-white/10' 
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                        >
                            {t('sendSms')}
                        </button>

                        <button 
                            onClick={() => setNotificationTarget(null)} 
                            className={`w-full py-3 font-bold text-xs transition-colors ${
                                isRamadan ? 'text-white/40 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'
                            }`}
                        >
                            {t('cancelAction')}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    </div>
  );
};

export default AttendanceTracker;
