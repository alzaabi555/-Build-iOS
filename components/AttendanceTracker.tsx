import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceStatus } from '../types';
import { MessageCircle, Loader2, Share2, DoorOpen, UserCircle2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { StudentAvatar } from './StudentAvatar';
import { useApp } from '../context/AppContext'; 
import { Drawer as DrawerSheet } from './ui/Drawer';

interface AttendanceTrackerProps {
  students: Student[];
  classes: string[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ students, classes, setStudents }) => {
  const { t, dir, language } = useApp();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toLocaleDateString('en-CA'));
  const [selectedGrade, setSelectedGrade] = useState<string>(() => sessionStorage.getItem('rased_grade') || 'all');
  const [classFilter, setClassFilter] = useState<string>(() => sessionStorage.getItem('rased_class') || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<{student: Student, type: 'absent' | 'late' | 'truant'} | null>(null);
  
  const isRamadan = true;

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

  return (
   <div className={`flex flex-col h-full space-y-6 pb-24 md:pb-8 overflow-hidden relative text-textPrimary ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
            
<header 
    className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent text-textPrimary`}
    style={{ WebkitAppRegion: 'drag' } as any}
>
                <div className="flex justify-between items-center gap-3 mb-5">
                    <h1 className="text-xl md:text-2xl font-black tracking-wide shrink-0">{t('attendanceTitle')}</h1>
                    
                    <div className="flex-1 relative group" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary`} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('searchStudentPlaceholder')} 
                            className={`w-full border rounded-xl py-2.5 ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs font-bold outline-none transition-all bg-bgCard border-borderColor text-textPrimary placeholder:text-textSecondary focus:bg-bgSoft`}
                        />
                    </div>

                    <button 
                        onClick={handleExportDailyExcel} 
                        disabled={isExportingExcel} 
                        className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center active:scale-95 transition-all bg-bgSoft border-borderColor text-textPrimary hover:bg-bgCard`}
                        style={{ WebkitAppRegion: 'no-drag' } as any}
                        title={t('exportRecord')}
                    >
                         {isExportingExcel ? <Loader2 className="w-5 h-5 animate-spin"/> : <Share2 className="w-5 h-5"/>}
                    </button>
                </div>

                {/* 💉 الأيام والتاريخ */}
                <div className={`flex items-center justify-between gap-1 mb-4 p-2 rounded-2xl border shadow-inner bg-bgSoft border-borderColor`} style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1 text-textSecondary hover:bg-bgCard rounded-lg transition-colors"><ChevronRight className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-0' : 'rotate-180'}`}/></button>
                    <div className="flex flex-1 justify-between gap-1 text-center">
                        {weekDates.map((date, idx) => {
                            const isSelected = date.toLocaleDateString('en-CA') === selectedDate;
                            const isToday = date.toLocaleDateString('en-CA') === today.toLocaleDateString('en-CA');
                            return (
                                <button 
                                    key={idx} 
                                    onClick={() => setSelectedDate(date.toLocaleDateString('en-CA'))}
                                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl flex-1 transition-all ${isSelected ? 'bg-primary border border-primary text-white shadow-md scale-105' : 'text-textSecondary hover:bg-bgCard'}`}
                                >
                                    <span className={`text-[9px] font-bold mb-0.5 ${isSelected ? 'text-white/80' : 'text-textSecondary'}`}>{date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' })}</span>
                                    <span className="text-sm font-black">{date.getDate()}</span>
                                    {isToday && !isSelected && <div className="w-1 h-1 bg-primary rounded-full mt-1"></div>}
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 text-textSecondary hover:bg-bgCard rounded-lg transition-colors"><ChevronLeft className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-0' : 'rotate-180'}`}/></button>
                </div>

                {/* 💉 الفصول الدراسية */}
                <div className="mb-2 w-full overflow-x-auto no-scrollbar pb-2 mt-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <div className={`inline-flex items-center p-1.5 rounded-full border backdrop-blur-md transition-all bg-bgSoft border-borderColor`}>
                        
                        <button 
                            onClick={() => { setSelectedGrade('all'); setClassFilter('all'); }} 
                            className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedGrade === 'all' && classFilter === 'all' ? 'bg-bgCard text-primary shadow-sm' : 'text-textSecondary hover:text-textPrimary hover:bg-bgCard/50'}`}
                        >
                            {t('all')}
                        </button>

                        {availableGrades.map(g => (
                            <React.Fragment key={`grade-${g}`}>
                                <div className={`w-[1px] h-5 mx-1.5 rounded-full shrink-0 bg-borderColor`} />
                                <button 
                                    onClick={() => { setSelectedGrade(g); setClassFilter('all'); }} 
                                    className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${selectedGrade === g && classFilter === 'all' ? 'bg-bgCard text-primary shadow-sm' : 'text-textSecondary hover:text-textPrimary hover:bg-bgCard/50'}`}
                                >
                                    {t('gradePrefix')} {g}
                                </button>
                            </React.Fragment>
                        ))}

                        {visibleClasses.map(c => (
                            <React.Fragment key={`class-${c}`}>
                                <div className={`w-[1px] h-5 mx-1.5 rounded-full shrink-0 bg-borderColor`} />
                                <button 
                                    onClick={() => setClassFilter(c)} 
                                    className={`relative px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${classFilter === c ? 'bg-bgCard text-primary shadow-sm' : 'text-textSecondary hover:text-textPrimary hover:bg-bgCard/50'}`}
                                >
                                    {c}
                                </button>
                            </React.Fragment>
                        ))}

                    </div>
                </div>
            </header>

        {/* 💉 المحتوى والأزرار السريعة */}
        <div className="flex-1 overflow-y-auto px-2 pb-20 custom-scrollbar pt-2">
            <div className="relative z-10 px-2">
                <div className="mb-4">
                    <div className="flex justify-between items-center gap-2 text-center">
                        <button onClick={() => markAll('present')} className={`flex-1 rounded-2xl p-2.5 border shadow-sm active:scale-95 transition-all bg-success/10 border-success/30 hover:bg-success/20`}>
                            <span className={`block text-[10px] font-bold mb-1 text-success`}>{t('presentAll')}</span>
                            <span className={`block text-xl font-black text-success`}>{stats.present}</span>
                        </button>
                        <button onClick={() => markAll('absent')} className={`flex-1 rounded-2xl p-2.5 border shadow-sm active:scale-95 transition-all bg-danger/10 border-danger/30 hover:bg-danger/20`}>
                            <span className={`block text-[10px] font-bold mb-1 text-danger`}>{t('absentAll')}</span>
                            <span className={`block text-xl font-black text-danger`}>{stats.absent}</span>
                        </button>
                        <div className={`flex-1 rounded-2xl p-2.5 border shadow-sm bg-warning/10 border-warning/30`}>
                            <span className={`block text-[10px] font-bold mb-1 text-warning`}>{t('lateAll')}</span>
                            <span className={`block text-xl font-black text-warning`}>{stats.late}</span>
                        </div>
                    </div>
                </div>

                {filteredStudents.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredStudents.map(student => {
                            const status = getStatus(student);
                            
                            // ألوان الحدود والخلفية الديناميكية بناءً على حالة الحضور
                            let cardStyle = 'border-borderColor';
                            if (status === 'present') cardStyle = 'border-success/50 shadow-[0_0_10px_rgba(34,197,94,0.15)] bg-success/5';
                            else if (status === 'absent') cardStyle = 'border-danger/50 shadow-[0_0_10px_rgba(239,68,68,0.15)] bg-danger/5';
                            else if (status === 'late') cardStyle = 'border-warning/50 shadow-[0_0_10px_rgba(245,158,11,0.15)] bg-warning/5';
                            else if (status === 'truant') cardStyle = 'border-info/50 shadow-[0_0_10px_rgba(6,182,212,0.15)] bg-info/5';

                            return (
                                /* 💉 كروت الطلاب */
                                <div key={student.id} className={`glass-panel rounded-[1.5rem] border flex flex-col items-center overflow-hidden transition-all duration-300 hover:-translate-y-1 ${cardStyle}`}>
                                    <div className="p-4 flex flex-col items-center w-full">
                                        <StudentAvatar gender={student.gender} className="w-16 h-16" />
                                        <h3 className={`font-bold text-sm text-center line-clamp-1 w-full mt-3 text-textPrimary`}>{student.name}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 font-bold bg-bgSoft text-textSecondary`}>{student.classes[0]}</span>
                                    </div>

                                    {/* 💉 أزرار تحضير الطالب */}
                                    <div className={`flex w-full border-t divide-x ${dir === 'rtl' ? 'divide-x-reverse' : ''} border-borderColor divide-borderColor`}>
                                        
                                        <button onClick={() => toggleAttendance(student.id, 'present')} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${status === 'present' ? 'bg-success/20 text-success' : 'text-textSecondary hover:bg-bgSoft hover:text-success'}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${status === 'present' ? 'bg-success text-white' : 'bg-bgSoft text-textSecondary'}`}>✓</div>
                                            <span className="text-[10px] font-bold">{t('present')}</span>
                                        </button>

                                        <button onClick={() => toggleAttendance(student.id, 'absent')} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${status === 'absent' ? 'bg-danger/20 text-danger' : 'text-textSecondary hover:bg-bgSoft hover:text-danger'}`}>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${status === 'absent' ? 'bg-danger text-white' : 'bg-bgSoft text-textSecondary'}`}>✕</div>
                                            <span className="text-[10px] font-bold">{t('absent')}</span>
                                        </button>

                                        <button onClick={() => toggleAttendance(student.id, 'late')} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${status === 'late' ? 'bg-warning/20 text-warning' : 'text-textSecondary hover:bg-bgSoft hover:text-warning'}`}>
                                            <div className={`text-xs opacity-80 ${status === 'late' ? '' : 'grayscale'}`}>⏰</div>
                                            <span className="text-[10px] font-bold">{t('late')}</span>
                                        </button>

                                        <button onClick={() => toggleAttendance(student.id, 'truant')} className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${status === 'truant' ? 'bg-info/20 text-info' : 'text-textSecondary hover:bg-bgSoft hover:text-info'}`}>
                                            <div className={`w-6 h-6 flex items-center justify-center`}>
                                                <DoorOpen className={`w-4 h-4 transition-colors ${status === 'truant' ? 'text-info' : 'text-textSecondary'}`} />
                                            </div>
                                            <span className="text-[10px] font-bold">{t('truant')}</span>
                                        </button>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`flex flex-col items-center justify-center py-20 opacity-70`}>
                        <UserCircle2 className={`w-16 h-16 mb-4 text-textSecondary/50`} />
                        <p className={`text-sm font-bold text-textSecondary`}>{t('noStudents')}</p>
                    </div>
                )}
            </div>
        </div>

        {/* 🚀 نافذة إشعار ولي الأمر (DrawerSheet) */}
        <DrawerSheet 
            isOpen={!!notificationTarget} 
            onClose={() => setNotificationTarget(null)} 
            isRamadan={isRamadan} 
            dir={dir}
        >
            {notificationTarget && (
                <div className="flex flex-col items-center text-center h-full justify-center pb-4">
                    
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-inner shrink-0 ${
                        notificationTarget.type === 'absent' ? 'bg-danger/20 text-danger' : 
                        notificationTarget.type === 'late' ? 'bg-warning/20 text-warning' : 
                        'bg-info/20 text-info'
                    }`}>
                        <MessageCircle className="w-10 h-10" />
                    </div>

                    <h3 className={`font-black text-xl mb-3 text-textPrimary`}>
                        {t('parentNotification')}
                    </h3>
                    
                    <div className={`text-sm font-bold mb-8 leading-relaxed text-textSecondary`}>
                        {t('sendAlertPrompt')}
                        <div className={`text-lg mt-2 font-black text-primary`}>
                            {notificationTarget.student.name}
                        </div>
                    </div>

                    <div className="space-y-3 w-full mt-auto shrink-0">
                        <button 
                            onClick={() => performNotification('whatsapp')} 
                            className={`w-full py-4 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg bg-[#25D366] hover:bg-[#1fa851]`}
                        >
                            <MessageCircle className="w-5 h-5" />
                            {t('sendWhatsapp')}
                        </button>

                        <button 
                            onClick={() => performNotification('sms')} 
                            className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 border bg-transparent text-textPrimary border-borderColor hover:bg-bgSoft`}
                        >
                            {t('sendSms')}
                        </button>

                        <button 
                            onClick={() => setNotificationTarget(null)} 
                            className={`w-full py-3 font-bold text-xs transition-colors text-textSecondary hover:text-danger`}
                        >
                            {t('cancelAction')}
                        </button>
                    </div>
                </div>
            )}
        </DrawerSheet>
    </div>
  );
};

export default AttendanceTracker;