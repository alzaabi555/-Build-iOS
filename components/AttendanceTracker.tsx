import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceStatus } from '../types';
import {
  MessageCircle,
  Loader2,
  Share2,
  DoorOpen,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  CheckCircle2,
  Clock3,
  History,
  CalendarDays
} from 'lucide-react';
import { AppLauncher } from '@capacitor/app-launcher';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { StudentRow } from './StudentRow';
import { useApp } from '../context/AppContext';
import { Drawer as DrawerSheet } from './ui/Drawer';
import PageLayout from '../components/PageLayout';

interface AttendanceTrackerProps {
  students: Student[];
  classes: string[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  students,
  classes,
  setStudents
}) => {
  const { t, dir, language } = useApp();

  const today = new Date();

  const [selectedDate, setSelectedDate] = useState(
    today.toLocaleDateString('en-CA')
  );

  const [selectedGrade, setSelectedGrade] = useState<string>(
    () => sessionStorage.getItem('rased_grade') || 'all'
  );

  const [classFilter, setClassFilter] = useState<string>(
    () => sessionStorage.getItem('rased_class') || 'all'
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const [notificationTarget, setNotificationTarget] = useState<{
    student: Student;
    type: 'absent' | 'late' | 'truant';
  } | null>(null);

  const [showAttendanceArchive, setShowAttendanceArchive] = useState(false);
  const [archiveMonth, setArchiveMonth] = useState(selectedDate.slice(0, 7));
  const [archiveSearch, setArchiveSearch] = useState('');

  const isRamadan = false;

  useEffect(() => {
    sessionStorage.setItem('rased_grade', selectedGrade);
    sessionStorage.setItem('rased_class', classFilter);
  }, [selectedGrade, classFilter]);

  const [weekOffset, setWeekOffset] = useState(0);

  const weekDates = useMemo(() => {
    const dates = [];
    const startOfWeek = new Date();

    startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);

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
    setStudents(prev =>
      prev.map(s => {
        if (s.id !== studentId) return s;

        const filtered = s.attendance.filter(a => a.date !== selectedDate);
        const currentStatus = s.attendance.find(
          a => a.date === selectedDate
        )?.status;

        const newStudent = {
          ...s,
          attendance:
            currentStatus === status
              ? filtered
              : [...filtered, { date: selectedDate, status }]
        };

        if (
          (status === 'absent' ||
            status === 'late' ||
            status === 'truant') &&
          currentStatus !== status
        ) {
          setTimeout(
            () => setNotificationTarget({ student: newStudent, type: status }),
            50
          );
        }

        return newStudent;
      })
    );
  };

  const markAll = (status: AttendanceStatus) => {
    const visibleIds = new Set(filteredStudents.map(s => s.id));

    setStudents(prev =>
      prev.map(s => {
        if (!visibleIds.has(s.id)) return s;

        const filtered = s.attendance.filter(a => a.date !== selectedDate);

        return {
          ...s,
          attendance: [...filtered, { date: selectedDate, status }]
        };
      })
    );
  };

  const availableGrades = useMemo(() => {
    const grades = new Set<string>();

    students.forEach(s => {
      if (s.grade) {
        grades.add(s.grade);
      } else if (s.classes?.[0]) {
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
      const matchesClass =
        classFilter === 'all' || s.classes.includes(classFilter);

      let matchesGrade = true;

      if (selectedGrade !== 'all') {
        matchesGrade =
          s.grade === selectedGrade ||
          (s.classes[0] && s.classes[0].startsWith(selectedGrade));
      }

      const matchesSearch = s.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      return matchesClass && matchesGrade && matchesSearch;
    });
  }, [students, classFilter, selectedGrade, searchTerm]);

  const stats = useMemo(() => {
    const present = filteredStudents.filter(s => getStatus(s) === 'present')
      .length;
    const absent = filteredStudents.filter(s => getStatus(s) === 'absent')
      .length;
    const late = filteredStudents.filter(s => getStatus(s) === 'late').length;
    const truant = filteredStudents.filter(s => getStatus(s) === 'truant')
      .length;

    return {
      present,
      absent,
      late,
      truant,
      total: filteredStudents.length
    };
  }, [filteredStudents, selectedDate]);

  const archiveStudents = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();
    return students.filter(student => {
      const matchesClass = classFilter === 'all' || student.classes.includes(classFilter);
      const matchesGrade = selectedGrade === 'all' || student.grade === selectedGrade ||
        (student.classes?.[0] && student.classes[0].startsWith(selectedGrade));
      const matchesSearch = !query || student.name.toLowerCase().includes(query);
      return matchesClass && matchesGrade && matchesSearch;
    });
  }, [students, classFilter, selectedGrade, archiveSearch]);

  const getMonthlyArchive = (student: Student) => {
    const records = (student.attendance || [])
      .filter(record => String(record.date || '').startsWith(archiveMonth))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return {
      records,
      present: records.filter(record => record.status === 'present').length,
      absent: records.filter(record => record.status === 'absent').length,
      late: records.filter(record => record.status === 'late').length,
      truant: records.filter(record => record.status === 'truant').length
    };
  };

  const normalizePhone = (value: string) => {
    let cleanPhone = String(value || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
    if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
    else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) {
      cleanPhone = '968' + cleanPhone.substring(1);
    }
    return cleanPhone;
  };

  const performNotification = async (method: 'whatsapp' | 'sms') => {
    if (!notificationTarget || !notificationTarget.student.parentPhone) {
      alert(t('noPhoneRegistered'));
      return;
    }
    const { student, type } = notificationTarget;
    const cleanPhone = normalizePhone(student.parentPhone);
    if (!cleanPhone || cleanPhone.length < 5) {
      alert(t('invalidPhone'));
      return;
    }
    let statusText = '';
    if (type === 'absent') statusText = t('statusAbsent');
    else if (type === 'late') statusText = t('statusLate');
    else if (type === 'truant') statusText = t('statusTruant');
    const dateText = new Date(selectedDate + 'T12:00:00').toLocaleDateString(
      language === 'ar' ? 'ar-OM' : 'en-US'
    );
    const message = `${t('whatsappMsgPart1')} ${student.name} ${t(
      'whatsappMsgPart2'
    )}${statusText}${t('whatsappMsgPart3')}${dateText}${t(
      'whatsappMsgPart4'
    )}`;
    const encodedMessage = encodeURIComponent(message);
    if (method === 'whatsapp') {
      const deepLink = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
      try {
        if ((window as any).electron?.openExternal) {
          await (window as any).electron.openExternal(deepLink);
        } else if (Capacitor.isNativePlatform()) {
          // افتح الرابط العميق مباشرة. قد يعيد canOpenUrl قيمة false على Android
          // رغم تثبيت واتساب بسبب قيود Package Visibility.
          const result = await AppLauncher.openUrl({ url: deepLink });
          if (result.completed === false) throw new Error('WHATSAPP_DEEP_LINK_NOT_COMPLETED');
        } else {
          window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        console.error('Failed to open WhatsApp deep link', error);
        alert(language === 'ar'
          ? 'تعذر فتح واتساب مباشرة. تأكد من تثبيت التطبيق ثم أعد المحاولة.'
          : 'Could not open WhatsApp directly. Make sure it is installed and try again.');
        return;
      }
    } else {
      window.location.href = `sms:${cleanPhone}?body=${encodedMessage}`;
    }
    setNotificationTarget(null);
  };

  const handleExportDailyExcel = async () => {
    if (filteredStudents.length === 0) {
      alert(t('noStudents'));
      return;
    }
    setIsExportingExcel(true);
    try {
      const [yearText, monthText] = selectedDate.split('-');
      const year = Number(yearText);
      const month = Number(monthText);
      const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(
        language === 'ar' ? 'ar-OM' : 'en-US',
        { month: 'long', year: 'numeric' }
      );
      const headers = [
        language === 'ar' ? 'التسلسل' : 'No.',
        language === 'ar' ? 'اسم الطالب' : 'Student Name',
        language === 'ar' ? 'الصف / الفصل' : 'Class',
        ...Array.from({ length: 30 }, (_, index) => String(index + 1)),
        language === 'ar' ? 'مجموع الغياب' : 'Total Absent',
        language === 'ar' ? 'مجموع التسرب' : 'Total Truant',
        language === 'ar' ? 'مجموع التأخر' : 'Total Late',
        language === 'ar' ? 'مجموع الحضور' : 'Total Present'
      ];
      const body = filteredStudents.map((student, index) => {
        let absent = 0;
        let truant = 0;
        let late = 0;
        let present = 0;
        const dayCells = Array.from({ length: 30 }, (_, dayIndex) => {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayIndex + 1).padStart(2, '0')}`;
          const record = (student.attendance || []).find(item => item.date === dateStr);
          if (!record) return '';
          if (record.status === 'present') { present++; return '✓'; }
          if (record.status === 'absent') { absent++; return language === 'ar' ? 'غ' : 'A'; }
          if (record.status === 'truant') { truant++; return language === 'ar' ? 'س' : 'T'; }
          if (record.status === 'late') { late++; return language === 'ar' ? 'ت' : 'L'; }
          return '';
        });
        return [
          index + 1,
          student.name,
          student.classes?.[0] || '',
          ...dayCells,
          absent,
          truant,
          late,
          present
        ];
      });
      const title = language === 'ar'
        ? `سجل الحضور والغياب الشهري - ${monthLabel}`
        : `Monthly Attendance Register - ${monthLabel}`;
      const filterDescription = classFilter !== 'all'
        ? classFilter
        : selectedGrade !== 'all'
          ? `${language === 'ar' ? 'الصف' : 'Grade'} ${selectedGrade}`
          : (language === 'ar' ? 'جميع الفصول' : 'All Classes');
      const worksheetData = [
        [title],
        [language === 'ar' ? `النطاق: ${filterDescription}` : `Scope: ${filterDescription}`],
        headers,
        ...body
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const lastColumn = headers.length - 1;
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } }
      ];
      ws['!cols'] = [
        { wch: 8 },
        { wch: 34 },
        { wch: 16 },
        ...Array.from({ length: 30 }, () => ({ wch: 4.5 })),
        { wch: 13 },
        { wch: 13 },
        { wch: 13 },
        { wch: 13 }
      ];
      ws['!rows'] = [{ hpt: 30 }, { hpt: 22 }, { hpt: 30 }];
      ws['!autofilter'] = { ref: `A3:${XLSX.utils.encode_col(lastColumn)}${body.length + 3}` };
      ws['!freeze'] = { xSplit: 3, ySplit: 3, topLeftCell: 'D4', activePane: 'bottomRight', state: 'frozen' } as any;
      ws['!sheetViews'] = [{ rightToLeft: language === 'ar' }] as any;
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: 'FF0F6B4D' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'FFD7E4DC' } },
          bottom: { style: 'thin', color: { rgb: 'FFD7E4DC' } },
          left: { style: 'thin', color: { rgb: 'FFD7E4DC' } },
          right: { style: 'thin', color: { rgb: 'FFD7E4DC' } }
        }
      };
      for (let column = 0; column <= lastColumn; column++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 2, c: column })];
        if (cell) cell.s = headerStyle;
      }
      if (ws.A1) ws.A1.s = {
        font: { bold: true, sz: 18, color: { rgb: 'FF0B4F3C' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
      if (ws.A2) ws.A2.s = {
        font: { bold: true, sz: 11, color: { rgb: 'FF7A5B12' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
      for (let row = 3; row < body.length + 3; row++) {
        for (let column = 0; column <= lastColumn; column++) {
          const cell = ws[XLSX.utils.encode_cell({ r: row, c: column })];
          if (!cell) continue;
          cell.s = {
            alignment: {
              horizontal: column === 1 ? (language === 'ar' ? 'right' : 'left') : 'center',
              vertical: 'center',
              wrapText: column === 1
            },
            fill: row % 2 === 0 ? { fgColor: { rgb: 'FFF5FAF7' } } : undefined,
            border: {
              bottom: { style: 'hair', color: { rgb: 'FFE3ECE7' } }
            }
          };
        }
      }
      wb.Workbook = wb.Workbook || {};
      wb.Workbook.Views = [{ RTL: language === 'ar' }];
      XLSX.utils.book_append_sheet(wb, ws, language === 'ar' ? `شهر ${month}` : `Month ${month}`);
      const fileName = `Rased_Attendance_${year}_${String(month).padStart(2, '0')}.xlsx`;
      if (Capacitor.isNativePlatform()) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64', cellStyles: true });
        const result = await Filesystem.writeFile({
          path: fileName,
          data: wbout,
          directory: Directory.Cache
        });
        await Share.share({ title: t('attendanceRecord'), url: result.uri });
      } else {
        XLSX.writeFile(wb, fileName, { cellStyles: true });
      }
    } catch (error) {
      console.error('Attendance export failed', error);
      alert(t('exportError'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <PageLayout
      title={t('attendanceTitle')}
     icon={
  <CheckCircle2 className="w-6 h-6 text-primary" />
}
      rightActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setArchiveMonth(selectedDate.slice(0, 7));
              setShowAttendanceArchive(true);
            }}
            className="w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center active:scale-95 transition-all bg-bgCard border-borderColor text-textPrimary hover:bg-bgSoft shadow-sm"
            title={language === 'ar' ? 'أرشيف الحضور والغياب' : 'Attendance archive'}
            aria-label={language === 'ar' ? 'أرشيف الحضور والغياب' : 'Attendance archive'}
          >
            <History className="w-5 h-5" />
          </button>
          <button
            data-voice-command="تصدير الحضور تصدير سجل الحضور مشاركة سجل الحضور"
            aria-label={t('exportRecord')}
            onClick={handleExportDailyExcel}
            disabled={isExportingExcel}
            className="w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center active:scale-95 transition-all bg-bgCard border-borderColor text-textPrimary hover:bg-bgSoft shadow-sm"
            title={t('exportRecord')}
          >
            {isExportingExcel ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
          </button>
        </div>
      }
      leftActions={
        <div
          className="space-y-3 w-full mt-1"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {/* البحث الواضح */}
          <div className="relative w-full">
            <div className="relative mt-4 z-10 w-full max-w-md mr-auto">
              <Search
                size={22}
                className={`absolute top-1/2 -translate-y-1/2 text-textSecondary ${
                  dir === 'rtl' ? 'right-4' : 'left-4'
                }`}
              />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t('searchStudentPlaceholder')}
                className={`w-full h-12 border rounded-2xl ${
                  dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'
                } text-sm font-bold outline-none transition-all bg-bgCard border-borderColor text-textPrimary placeholder:text-textSecondary focus:bg-bgSoft focus:border-primary/40 shadow-sm`}
              />
            </div>
          </div>

          {/* التقويم المدمج */}
          <div className="flex items-center justify-between gap-1 p-1.5 rounded-2xl border shadow-sm bg-bgCard border-borderColor">
            <button
              type="button"
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1.5 text-textSecondary hover:bg-bgSoft rounded-xl transition-colors active:scale-95"
              aria-label={t('previousWeek')}
            >
              <ChevronRight
                className={`w-4 h-4 ${
                  dir === 'rtl' ? 'rotate-0' : 'rotate-180'
                }`}
              />
            </button>

            <div className="flex flex-1 justify-between gap-1 text-center">
              {weekDates.map((date, idx) => {
                const isSelected =
                  date.toLocaleDateString('en-CA') === selectedDate;

                const isToday =
                  date.toLocaleDateString('en-CA') ===
                  today.toLocaleDateString('en-CA');

                return (
                  <button
                    key={idx}
                    type="button"
                    data-voice-command={`اختر تاريخ ${date.getDate()}`}
                    aria-label={`${t('dateLabel')} ${date.getDate()}`}
                    onClick={() =>
                      setSelectedDate(date.toLocaleDateString('en-CA'))
                    }
                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl flex-1 transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-primary border border-primary text-white shadow-md scale-105'
                        : 'text-textSecondary hover:bg-bgSoft'
                    }`}
                  >
                    <span
                      className={`text-[8px] font-bold mb-0.5 ${
                        isSelected ? 'text-white/80' : 'text-textSecondary'
                      }`}
                    >
                      {date.toLocaleDateString(
                        language === 'ar' ? 'ar-EG' : 'en-US',
                        {
                          weekday: 'short'
                        }
                      )}
                    </span>

                    <span className="text-xs font-black">
                      {date.getDate()}
                    </span>

                    {isToday && !isSelected && (
                      <div className="w-1 h-1 bg-primary rounded-full mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1.5 text-textSecondary hover:bg-bgSoft rounded-xl transition-colors active:scale-95"
              aria-label={t('nextWeek')}
            >
              <ChevronLeft
                className={`w-4 h-4 ${
                  dir === 'rtl' ? 'rotate-0' : 'rotate-180'
                }`}
              />
            </button>
          </div>

          {/* فلاتر الصف والفصل */}
          <div className="w-full flex flex-col md:flex-row gap-2 md:items-center">
            {/* الصفوف كأزرار قصيرة */}
            <div className="overflow-x-auto no-scrollbar flex-1">
              <div className="inline-flex items-center p-1 rounded-2xl border transition-all bg-bgCard border-borderColor shadow-sm">
                <button
                  type="button"
                  data-voice-command="عرض كل الطلاب في الحضور كل الحضور"
                  aria-label={t('all')}
                  onClick={() => {
                    setSelectedGrade('all');
                    setClassFilter('all');
                  }}
                  className={`px-5 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                    selectedGrade === 'all' && classFilter === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-textSecondary hover:text-textPrimary hover:bg-bgSoft'
                  }`}
                >
                  {t('all')}
                </button>

                {availableGrades.map(g => (
                  <React.Fragment key={`grade-${g}`}>
                    <div className="w-[1px] h-4 mx-1 rounded-full shrink-0 bg-borderColor" />

                    <button
                      type="button"
                      data-voice-command={`عرض الصف ${g} في الحضور`}
                      aria-label={`${t('gradePrefix')} ${g}`}
                      onClick={() => {
                        setSelectedGrade(g);
                        setClassFilter('all');
                      }}
                      className={`px-5 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                        selectedGrade === g && classFilter === 'all'
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-textSecondary hover:text-textPrimary hover:bg-bgSoft'
                      }`}
                    >
                      {t('gradePrefix')} {g}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* قائمة الفصول المنسدلة */}
            <div className="relative w-full md:w-60 shrink-0">
              <label className="sr-only">{t('selectClassPlaceholder')}</label>

              <select
                data-voice-field="فصل الحضور"
                aria-label={t('selectClassPlaceholder')}
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="w-full h-11 rounded-2xl border border-borderColor bg-bgCard px-4 text-sm font-black text-textPrimary outline-none shadow-sm transition-all focus:border-primary/40 focus:bg-bgSoft"
              >
                <option value="all">{t('allClasses')}</option>

                {visibleClasses.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      }
    >
      <div className="animate-in fade-in duration-500 pt-2 space-y-4">
        <div className="flex justify-between items-center gap-2 text-center">
          <button
            data-voice-command="حضور الجميع تسجيل حضور الجميع تحضير الجميع"
            aria-label={t('presentAll')}
            onClick={() => markAll('present')}
            className="flex-1 rounded-2xl p-2.5 border shadow-sm active:scale-95 transition-all bg-success/10 border-success/30 hover:bg-success/20"
          >
            <span className="block text-[10px] font-bold mb-1 text-success">
              {t('presentAll')}
            </span>
            <span className="block text-xl font-black text-success">
              {stats.present}
            </span>
          </button>

          <button
            data-voice-command="غياب الجميع تسجيل غياب الجميع"
            data-voice-danger="true"
            aria-label={t('absentAll')}
            onClick={() => markAll('absent')}
            className="flex-1 rounded-2xl p-2.5 border shadow-sm active:scale-95 transition-all bg-danger/10 border-danger/30 hover:bg-danger/20"
          >
            <span className="block text-[10px] font-bold mb-1 text-danger">
              {t('absentAll')}
            </span>
            <span className="block text-xl font-black text-danger">
              {stats.absent}
            </span>
          </button>

          <div className="flex-1 rounded-2xl p-2.5 border shadow-sm bg-warning/10 border-warning/30">
            <span className="block text-[10px] font-bold mb-1 text-warning">
              {t('lateAll')}
            </span>
            <span className="block text-xl font-black text-warning">
              {stats.late}
            </span>
          </div>
        </div>

        {filteredStudents.length > 0 ? (
          <div className="space-y-2.5 pb-6">
            {filteredStudents.map((student, index) => {
              const status = getStatus(student);

              const studentClass =
                student.classes && student.classes.length > 0
                  ? student.classes[0]
                  : t('unspecified');

              const statusText =
                status === 'present'
                  ? t('present')
                  : status === 'absent'
                  ? t('absent')
                  : status === 'late'
                  ? t('late')
                  : status === 'truant'
                  ? t('truant')
                  : t('attendanceNotRecorded');

              const statusTone =
                status === 'present'
                  ? 'success'
                  : status === 'absent'
                  ? 'danger'
                  : status === 'late'
                  ? 'warning'
                  : status === 'truant'
                  ? 'info'
                  : 'neutral';

              return (
                <StudentRow
                  key={student.id}
                  student={student}
                  dir={dir}
                  subtitle={studentClass}
                  statusText={statusText}
                  statusTone={statusTone as any}
                  indexLabel={index + 1}
                  className={
                    status === 'present'
                      ? 'border-success/30 bg-success/5'
                      : status === 'absent'
                      ? 'border-danger/30 bg-danger/5'
                      : status === 'late'
                      ? 'border-warning/30 bg-warning/5'
                      : status === 'truant'
                      ? 'border-info/30 bg-info/5'
                      : ''
                  }
                  actions={[
                    {
                      key: 'present',
                      label: t('present'),
                      icon: CheckCircle2,
                      tone: status === 'present' ? 'success' : 'neutral',
                      showOnMobile: true,
                      voiceCommand: `سجل حضور ${student.name} حضور ${student.name} تحضير ${student.name}`,
                      ariaLabel: `${t('present')} ${student.name}`,
                      title: `${t('present')} ${student.name}`,
                      onClick: () => toggleAttendance(student.id, 'present')
                    },
                    {
                      key: 'absent',
                      label: t('absent'),
                      icon: X,
                      tone: status === 'absent' ? 'danger' : 'neutral',
                      showOnMobile: true,
                      voiceCommand: `سجل غياب ${student.name} غياب ${student.name} ${student.name} غائب`,
                      ariaLabel: `${t('absent')} ${student.name}`,
                      title: `${t('absent')} ${student.name}`,
                      danger: true,
                      onClick: () => toggleAttendance(student.id, 'absent')
                    },
                    {
                      key: 'late',
                      label: t('late'),
                      icon: Clock3,
                      tone: status === 'late' ? 'warning' : 'neutral',
                      showOnMobile: true,
                      voiceCommand: `سجل تأخر ${student.name} تأخير ${student.name} ${student.name} متأخر`,
                      ariaLabel: `${t('late')} ${student.name}`,
                      title: `${t('late')} ${student.name}`,
                      onClick: () => toggleAttendance(student.id, 'late')
                    },
                    {
                      key: 'truant',
                      label: t('truant'),
                      icon: DoorOpen,
                      tone: status === 'truant' ? 'info' : 'neutral',
                      showOnMobile: false,
                      voiceCommand: `سجل هروب ${student.name} سجل تسرب ${student.name} خروج ${student.name}`,
                      ariaLabel: `${t('truant')} ${student.name}`,
                      title: `${t('truant')} ${student.name}`,
                      onClick: () => toggleAttendance(student.id, 'truant')
                    }
                  ]}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-70">
            <UserCircle2 className="w-16 h-16 mb-4 text-textSecondary/50" />
            <p className="text-sm font-bold text-textSecondary">
              {t('noStudents')}
            </p>
          </div>
        )}
      </div>

      <DrawerSheet
        isOpen={showAttendanceArchive}
        onClose={() => setShowAttendanceArchive(false)}
        isRamadan={isRamadan}
        dir={dir}
        mode="full"
      >
        <div className="flex flex-col h-full w-full bg-bgMain">
          <div className="shrink-0 p-4 border-b border-borderColor bg-bgCard">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <History size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-xl text-textPrimary">
                  {language === 'ar' ? 'أرشيف الحضور والغياب والتسرب' : 'Attendance Archive'}
                </h3>
                <p className="text-xs font-bold text-textSecondary mt-1">
                  {language === 'ar' ? 'ابحث عن الطالب واستعرض السجل الشهري المحفوظ.' : 'Search for a student and review monthly records.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2">
              <label className="flex items-center gap-2 h-12 rounded-xl border border-borderColor bg-bgSoft px-3">
                <CalendarDays size={18} className="text-primary shrink-0" />
                <input
                  type="month"
                  value={archiveMonth}
                  onChange={event => setArchiveMonth(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none text-sm font-black text-textPrimary"
                />
              </label>
              <label className="relative h-12">
                <Search size={18} className={`absolute top-1/2 -translate-y-1/2 text-textSecondary ${dir === 'rtl' ? 'right-4' : 'left-4'}`} />
                <input
                  value={archiveSearch}
                  onChange={event => setArchiveSearch(event.target.value)}
                  placeholder={language === 'ar' ? 'ابحث باسم الطالب' : 'Search student name'}
                  className={`w-full h-full rounded-xl border border-borderColor bg-bgSoft outline-none text-sm font-bold text-textPrimary ${dir === 'rtl' ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
                />
              </label>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {archiveStudents.map(student => {
              const archive = getMonthlyArchive(student);
              return (
                <div key={student.id} className="rounded-2xl border border-borderColor bg-bgCard p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-black text-sm text-textPrimary whitespace-normal break-words">{student.name}</h4>
                      <p className="text-[11px] font-bold text-textSecondary mt-1">{student.classes?.[0] || t('unspecified')}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center shrink-0">
                      <div className="rounded-xl bg-success/10 px-2 py-2"><b className="block text-success">{archive.present}</b><span className="text-[8px] text-textSecondary">{t('present')}</span></div>
                      <div className="rounded-xl bg-danger/10 px-2 py-2"><b className="block text-danger">{archive.absent}</b><span className="text-[8px] text-textSecondary">{t('absent')}</span></div>
                      <div className="rounded-xl bg-warning/10 px-2 py-2"><b className="block text-warning">{archive.late}</b><span className="text-[8px] text-textSecondary">{t('late')}</span></div>
                      <div className="rounded-xl bg-info/10 px-2 py-2"><b className="block text-info">{archive.truant}</b><span className="text-[8px] text-textSecondary">{t('truant')}</span></div>
                    </div>
                  </div>
                  {archive.records.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {archive.records.map(record => {
                        const day = Number(String(record.date).slice(-2));
                        const tone = record.status === 'present'
                          ? 'bg-success/10 text-success border-success/20'
                          : record.status === 'absent'
                            ? 'bg-danger/10 text-danger border-danger/20'
                            : record.status === 'late'
                              ? 'bg-warning/10 text-warning border-warning/20'
                              : 'bg-info/10 text-info border-info/20';
                        const label = record.status === 'present' ? t('present') : record.status === 'absent' ? t('absent') : record.status === 'late' ? t('late') : t('truant');
                        return <span key={`${student.id}-${record.date}`} className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black ${tone}`}>{day}: {label}</span>;
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl border border-dashed border-borderColor bg-bgSoft p-3 text-center text-xs font-bold text-textSecondary">
                      {language === 'ar' ? 'لا توجد سجلات محفوظة لهذا الشهر.' : 'No saved records for this month.'}
                    </p>
                  )}
                </div>
              );
            })}
            {archiveStudents.length === 0 && (
              <div className="py-16 text-center text-sm font-bold text-textSecondary">
                {language === 'ar' ? 'لا توجد نتائج مطابقة.' : 'No matching students.'}
              </div>
            )}
          </div>
        </div>
      </DrawerSheet>

      <DrawerSheet
        isOpen={!!notificationTarget}
        onClose={() => setNotificationTarget(null)}
        isRamadan={isRamadan}
        dir={dir}
      >
        {notificationTarget && (
          <div className="flex flex-col items-center text-center h-full justify-center pb-4">
            <div
              className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-inner shrink-0 ${
                notificationTarget.type === 'absent'
                  ? 'bg-danger/20 text-danger'
                  : notificationTarget.type === 'late'
                  ? 'bg-warning/20 text-warning'
                  : 'bg-info/20 text-info'
              }`}
            >
              <MessageCircle className="w-10 h-10" />
            </div>

            <h3 className="font-black text-xl mb-3 text-textPrimary">
              {t('parentNotification')}
            </h3>

            <div className="text-sm font-bold mb-8 leading-relaxed text-textSecondary">
              {t('sendAlertPrompt')}

              <div className="text-lg mt-2 font-black text-primary">
                {notificationTarget.student.name}
              </div>
            </div>

            <div className="space-y-3 w-full mt-auto shrink-0">
              <button
                data-voice-command="إرسال واتساب إرسال تنبيه واتساب"
                aria-label={t('sendWhatsapp')}
                title={t('sendWhatsapp')}
                onClick={() => performNotification('whatsapp')}
                className="w-full py-4 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg bg-[#25D366] hover:bg-[#1fa851]"
              >
                <MessageCircle className="w-5 h-5" />
                {t('sendWhatsapp')}
              </button>

              <button
                data-voice-command="إرسال رسالة نصية إرسال SMS"
                aria-label={t('sendSms')}
                title={t('sendSms')}
                onClick={() => performNotification('sms')}
                className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 border bg-transparent text-textPrimary border-borderColor hover:bg-bgSoft"
              >
                {t('sendSms')}
              </button>

              <button
                data-voice-command="إلغاء الإشعار إغلاق الإشعار"
                aria-label={t('cancelAction')}
                title={t('cancelAction')}
                onClick={() => setNotificationTarget(null)}
                className="w-full py-3 font-bold text-xs transition-colors text-textSecondary hover:text-danger"
              >
                {t('cancelAction')}
              </button>
            </div>
          </div>
        )}
      </DrawerSheet>
    </PageLayout>
  );
};

export default AttendanceTracker;
