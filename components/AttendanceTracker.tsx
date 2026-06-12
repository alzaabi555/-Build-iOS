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
  Send,
  CheckCircle2,
  Clock3
} from 'lucide-react';
import { Browser } from '@capacitor/browser';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { StudentRow } from './StudentRow';
import { useApp } from '../context/AppContext';
import { Drawer as DrawerSheet } from './ui/Drawer';
import PageLayout from '../components/PageLayout';

const ADMIN_APP_URL =
  'https://script.google.com/macros/s/AKfycbwZHhZ-RPWUpBGIlw0qTFPUmOPmq9WpcvW4WLklcjb_A9U3MW0luIXYPnHznI29ThpbMA/exec';

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
  const { t, dir, language, teacherInfo } = useApp();

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

  const [isSyncingAdmin, setIsSyncingAdmin] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);

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

  const performNotification = async (method: 'whatsapp' | 'sms') => {
    if (!notificationTarget || !notificationTarget.student.parentPhone) {
      alert(t('noPhoneRegistered'));
      return;
    }

    const { student, type } = notificationTarget;

    let cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 5) {
      alert(t('invalidPhone'));
      return;
    }

    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
    if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
    else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) {
      cleanPhone = '968' + cleanPhone.substring(1);
    }

    let statusText = '';

    if (type === 'absent') statusText = t('statusAbsent');
    else if (type === 'late') statusText = t('statusLate');
    else if (type === 'truant') statusText = t('statusTruant');

    const dateText = new Date().toLocaleDateString(
      language === 'ar' ? 'ar-EG' : 'en-US'
    );

    const msg = encodeURIComponent(
      `${t('whatsappMsgPart1')} ${student.name} ${t(
        'whatsappMsgPart2'
      )}${statusText}${t('whatsappMsgPart3')}${dateText}${t(
        'whatsappMsgPart4'
      )}`
    );

    if (method === 'whatsapp') {
      if ((window as any).electron) {
        (window as any).electron.openExternal(
          `whatsapp://send?phone=${cleanPhone}&text=${msg}`
        );
      } else {
        const universalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;

        try {
          if (Capacitor.isNativePlatform()) {
            await Browser.open({ url: universalUrl });
          } else {
            window.open(universalUrl, '_blank');
          }
        } catch {
          window.open(universalUrl, '_blank');
        }
      }
    } else {
      window.location.href = `sms:${cleanPhone}?body=${msg}`;
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

        let abs = 0;
        let late = 0;
        let truant = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(
            2,
            '0'
          )}-${String(d).padStart(2, '0')}`;

          const record = s.attendance.find(a => a.date === dateStr);

          let symbol = '';

          if (record) {
            if (record.status === 'present') symbol = '✓';
            else if (record.status === 'absent') {
              symbol = language === 'ar' ? 'غ' : 'A';
              abs++;
            } else if (record.status === 'late') {
              symbol = language === 'ar' ? 'ت' : 'L';
              late++;
            } else if (record.status === 'truant') {
              symbol = language === 'ar' ? 'س' : 'T';
              truant++;
            }
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

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        `${t('excelMonthPrefix')}${month + 1}`
      );

      const fileName = `Attendance_${month + 1}.xlsx`;

      if (Capacitor.isNativePlatform()) {
        const wbout = XLSX.write(wb, {
          bookType: 'xlsx',
          type: 'base64'
        });

        const result = await Filesystem.writeFile({
          path: fileName,
          data: wbout,
          directory: Directory.Cache
        });

        await Share.share({
          title: t('attendanceRecord'),
          url: result.uri
        });
      } else {
        XLSX.writeFile(wb, fileName);
      }
    } catch {
      alert(t('exportError'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const initiateAdminSync = () => {
    const adminSchoolCode = localStorage.getItem('rased_admin_school_code');

    if (!adminSchoolCode || adminSchoolCode.trim().length < 2) {
      alert('الرجاء إدخال كود المدرسة في شاشة الإعدادات للاتصال بالإدارة.');
      return;
    }

    setShowPeriodSelector(true);
  };

  const executeAdminSync = async (periodNumber: string) => {
    setShowPeriodSelector(false);
    setIsSyncingAdmin(true);
    setSyncSuccess(false);

    const adminSchoolCode =
      localStorage.getItem('rased_admin_school_code') || '';
    const teacherName = teacherInfo?.name || 'معلم غير محدد';
    const todayCA = new Date().toLocaleDateString('en-CA');

    const absentStudentsNames: string[] = [];
    const lateStudentsNames: string[] = [];
    const truantStudentsNames: string[] = [];

    students.forEach(s => {
      const todayRecord = s.attendance?.find(
        a =>
          a.date === todayCA ||
          new Date(a.date).toDateString() === new Date().toDateString()
      );

      if (todayRecord) {
        const st = String(todayRecord.status).toLowerCase().trim();

        if (st === 'absent' || st === 'غائب') absentStudentsNames.push(s.name);
        else if (st === 'late' || st === 'متأخر') lateStudentsNames.push(s.name);
        else if (st === 'truant' || st === 'escaped' || st === 'متسرب') {
          truantStudentsNames.push(s.name);
        }
      }
    });

    if (
      absentStudentsNames.length === 0 &&
      lateStudentsNames.length === 0 &&
      truantStudentsNames.length === 0
    ) {
      absentStudentsNames.push('الكل حاضر (لا يوجد غياب)');
    }

    const adminPayload = {
      schoolCode: adminSchoolCode.trim(),
      teacherName,
      className: classFilter !== 'all' ? classFilter : classes[0] || 'كل الفصول',
      period: periodNumber,
      absentStudents: absentStudentsNames,
      lateStudents: lateStudentsNames,
      truantStudents: truantStudentsNames,
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(ADMIN_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(adminPayload)
      });

      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch {
      alert('تأكد من الاتصال بالإنترنت لإرسال التقرير.');
    } finally {
      setIsSyncingAdmin(false);
    }
  };

  return (
    <PageLayout
      title={t('attendanceTitle')}
      icon={
        <div className="relative group hidden sm:block w-32 md:w-48 transition-all duration-300 focus-within:w-64">
          <Search
            className={`absolute ${
              dir === 'rtl' ? 'right-3' : 'left-3'
            } top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary`}
          />

          <input
            type="text"
            data-voice-field="بحث الحضور"
            aria-label="بحث الحضور"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t('searchStudentPlaceholder')}
            className={`w-full border rounded-xl py-2 ${
              dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'
            } text-xs font-bold outline-none transition-all bg-bgCard border-borderColor text-textPrimary placeholder:text-textSecondary focus:bg-bgSoft focus:border-primary/40`}
          />
        </div>
      }
      rightActions={
        <div className="flex items-center gap-2 relative">
          <div className="sm:hidden relative w-24">
            <Search
              className={`absolute ${
                dir === 'rtl' ? 'right-2' : 'left-2'
              } top-1/2 -translate-y-1/2 w-3 h-3 text-textSecondary`}
            />

            <input
              type="text"
              data-voice-field="بحث الحضور"
              aria-label="بحث الحضور"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('searchStudentPlaceholder')}
              className={`w-full border rounded-xl py-2 ${
                dir === 'rtl' ? 'pr-7 pl-2' : 'pl-7 pr-2'
              } text-[10px] font-bold outline-none transition-all bg-bgCard border-borderColor text-textPrimary placeholder:text-textSecondary focus:bg-bgSoft focus:border-primary/40`}
            />
          </div>

          <button
            data-voice-command="إرسال تقرير الحضور للإدارة رفع الغياب للإدارة إرسال غياب اليوم للإدارة"
            aria-label="إرسال تقرير الحضور للإدارة"
            onClick={initiateAdminSync}
            disabled={isSyncingAdmin}
            className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center active:scale-95 transition-all shadow-sm ${
              syncSuccess
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/15'
            }`}
            title="إرسال تقرير اليوم للإدارة"
          >
            {isSyncingAdmin ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : syncSuccess ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>

          {showPeriodSelector && (
            <div
              className={`absolute top-12 ${
                dir === 'rtl' ? 'left-0' : 'right-0'
              } w-48 bg-bgCard border border-borderColor shadow-xl rounded-xl p-3 z-50 animate-in fade-in zoom-in duration-200`}
            >
              <p className="text-xs font-bold text-center mb-3 text-textPrimary">
                هذا الغياب لأي حصة؟
              </p>

              <div className="flex flex-col gap-2">
                <button
                  data-voice-command="الحصة الأولى حصة أولى الأولى"
                  aria-label="الحصة الأولى"
                  onClick={() => executeAdminSync('الحصة الأولى')}
                  className="py-2 px-3 bg-primary/10 text-primary hover:bg-primary/15 rounded-lg text-xs font-bold transition-colors"
                >
                  الحصة الأولى
                </button>

                <button
                  data-voice-command="الحصة الخامسة حصة خامسة الخامسة"
                  aria-label="الحصة الخامسة"
                  onClick={() => executeAdminSync('الحصة الخامسة')}
                  className="py-2 px-3 bg-primary/10 text-primary hover:bg-primary/15 rounded-lg text-xs font-bold transition-colors"
                >
                  الحصة الخامسة
                </button>

                <button
                  data-voice-command="إلغاء اختيار الحصة إلغاء إرسال التقرير"
                  aria-label="إلغاء اختيار الحصة"
                  onClick={() => setShowPeriodSelector(false)}
                  className="py-2 px-3 mt-1 bg-bgSoft text-textSecondary hover:text-danger rounded-lg text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <button
            data-voice-command="تصدير الحضور تصدير سجل الحضور مشاركة سجل الحضور"
            aria-label="تصدير سجل الحضور"
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
        <div className="space-y-2 w-full mt-1">
          <div
            className="flex items-center justify-between gap-1 p-1.5 rounded-2xl border shadow-inner bg-bgSoft border-borderColor"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1 text-textSecondary hover:bg-bgCard rounded-lg transition-colors"
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
                    onClick={() =>
                      setSelectedDate(date.toLocaleDateString('en-CA'))
                    }
                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl flex-1 transition-all ${
                      isSelected
                        ? 'bg-primary border border-primary text-white shadow-md scale-105'
                        : 'text-textSecondary hover:bg-bgCard'
                    }`}
                  >
                    <span
                      className={`text-[8px] font-bold mb-0.5 ${
                        isSelected ? 'text-white/80' : 'text-textSecondary'
                      }`}
                    >
                      {date.toLocaleDateString(
                        language === 'ar' ? 'ar-EG' : 'en-US',
                        { weekday: 'short' }
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
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1 text-textSecondary hover:bg-bgCard rounded-lg transition-colors"
            >
              <ChevronLeft
                className={`w-4 h-4 ${
                  dir === 'rtl' ? 'rotate-0' : 'rotate-180'
                }`}
              />
            </button>
          </div>

          <div className="w-full overflow-x-auto no-scrollbar pb-1">
            <div className="inline-flex items-center p-1 rounded-full border transition-all bg-bgCard border-borderColor shadow-sm">
              <button
                onClick={() => {
                  setSelectedGrade('all');
                  setClassFilter('all');
                }}
                className={`relative px-5 py-2 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-300 ${
                  selectedGrade === 'all' && classFilter === 'all'
                    ? 'bg-bgCard text-primary shadow-sm'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-bgCard/50'
                }`}
              >
                {t('all')}
              </button>

              {availableGrades.map(g => (
                <React.Fragment key={`grade-${g}`}>
                  <div className="w-[1px] h-4 mx-1 rounded-full shrink-0 bg-borderColor" />

                  <button
                    onClick={() => {
                      setSelectedGrade(g);
                      setClassFilter('all');
                    }}
                    className={`relative px-5 py-2 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-300 ${
                      selectedGrade === g && classFilter === 'all'
                        ? 'bg-bgCard text-primary shadow-sm'
                        : 'text-textSecondary hover:text-textPrimary hover:bg-bgCard/50'
                    }`}
                  >
                    {t('gradePrefix')} {g}
                  </button>
                </React.Fragment>
              ))}

              {visibleClasses.map(c => (
                <React.Fragment key={`class-${c}`}>
                  <div className="w-[1px] h-4 mx-1 rounded-full shrink-0 bg-borderColor" />

                  <button
                    onClick={() => setClassFilter(c)}
                    className={`relative px-5 py-2 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-300 ${
                      classFilter === c
                        ? 'bg-bgCard text-primary shadow-sm'
                        : 'text-textSecondary hover:text-textPrimary hover:bg-bgCard/50'
                    }`}
                  >
                    {c}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <div className="animate-in fade-in duration-500 pt-2 space-y-4">
        <div className="flex justify-between items-center gap-2 text-center">
          <button
            data-voice-command="حضور الجميع تسجيل حضور الجميع تحضير الجميع"
            aria-label="تسجيل حضور الجميع"
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
            aria-label="تسجيل غياب الجميع"
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
                        : 'لم يسجل بعد';

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
                      ariaLabel: `تسجيل حضور ${student.name}`,
                      title: `تسجيل حضور ${student.name}`,
                      onClick: () => toggleAttendance(student.id, 'present')
                    },
                    {
                      key: 'absent',
                      label: t('absent'),
                      icon: X,
                      tone: status === 'absent' ? 'danger' : 'neutral',
                      showOnMobile: true,
                      voiceCommand: `سجل غياب ${student.name} غياب ${student.name} ${student.name} غائب`,
                      ariaLabel: `تسجيل غياب ${student.name}`,
                      title: `تسجيل غياب ${student.name}`,
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
                      ariaLabel: `تسجيل تأخر ${student.name}`,
                      title: `تسجيل تأخر ${student.name}`,
                      onClick: () => toggleAttendance(student.id, 'late')
                    },
                    {
                      key: 'truant',
                      label: t('truant'),
                      icon: DoorOpen,
                      tone: status === 'truant' ? 'info' : 'neutral',
                      showOnMobile: false,
                      voiceCommand: `سجل هروب ${student.name} سجل تسرب ${student.name} خروج ${student.name}`,
                      ariaLabel: `تسجيل هروب أو تسرب ${student.name}`,
                      title: `تسجيل هروب أو تسرب ${student.name}`,
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
                aria-label="إرسال تنبيه واتساب"
                title="إرسال واتساب"
                onClick={() => performNotification('whatsapp')}
                className="w-full py-4 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg bg-[#25D366] hover:bg-[#1fa851]"
              >
                <MessageCircle className="w-5 h-5" />
                {t('sendWhatsapp')}
              </button>

              <button
                data-voice-command="إرسال رسالة نصية إرسال SMS"
                aria-label="إرسال رسالة نصية"
                title="إرسال رسالة نصية"
                onClick={() => performNotification('sms')}
                className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 border bg-transparent text-textPrimary border-borderColor hover:bg-bgSoft"
              >
                {t('sendSms')}
              </button>

              <button
                data-voice-command="إلغاء الإشعار إغلاق الإشعار"
                aria-label="إلغاء الإشعار"
                title="إلغاء"
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
