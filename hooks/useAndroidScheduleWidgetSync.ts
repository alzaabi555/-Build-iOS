import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { RasedScheduleWidget } from '../services/RasedScheduleWidget';

type ScheduleDay = {
  dayName: string;
  periods: string[];
};

type PeriodTime = {
  periodNumber?: number;
  startTime: string;
  endTime: string;
};

type TeacherInfo = {
  subject?: string;
  school?: string;
  name?: string;
};

type WidgetPeriod = {
  index: number;
  className: string;
  subject: string;
  startTime: string;
  endTime: string;
  status: 'active' | 'upcoming' | 'completed' | 'unknown';
};

const minutesFromTime = (value?: string): number | null => {
  if (!value || !value.includes(':')) return null;

  const [hours, minutes] = value.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
};

const getDayIndexForRasedSchedule = () => {
  const todayRaw = new Date().getDay();

  /*
    نفس منطق Dashboard:
    الأحد = 0
    الإثنين = 1
    الثلاثاء = 2
    الأربعاء = 3
    الخميس = 4

    الجمعة والسبت يعرضان جدول الأحد كجدول قادم.
  */
  const dayIndex = todayRaw === 5 || todayRaw === 6 ? 0 : todayRaw;
  const isToday = todayRaw === dayIndex;

  return { dayIndex, isToday };
};

const getPeriodStatus = (
  startTime: string,
  endTime: string,
  isToday: boolean
): WidgetPeriod['status'] => {
  if (!startTime || !endTime) return 'unknown';

  if (!isToday) return 'upcoming';

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const startMinutes = minutesFromTime(startTime);
  const endMinutes = minutesFromTime(endTime);

  if (startMinutes === null || endMinutes === null) return 'unknown';

  if (nowMinutes >= startMinutes && nowMinutes < endMinutes) return 'active';
  if (nowMinutes < startMinutes) return 'upcoming';

  return 'completed';
};

const formatTimeRange = (period: WidgetPeriod | null) => {
  if (!period) return '';
  if (!period.startTime && !period.endTime) return '';

  return `${period.startTime || '--:--'} - ${period.endTime || '--:--'}`;
};

const buildWidgetPayload = (
  schedule: ScheduleDay[],
  periodTimes: PeriodTime[],
  teacherInfo: TeacherInfo
) => {
  const { dayIndex, isToday } = getDayIndexForRasedSchedule();

  const todaySchedule =
    Array.isArray(schedule) && schedule.length > dayIndex
      ? schedule[dayIndex]
      : null;

  const todayName = todaySchedule?.dayName || 'جدول اليوم';
  const subjectName = teacherInfo?.subject || 'المادة';

  const periods = Array.isArray(todaySchedule?.periods)
    ? todaySchedule!.periods
    : [];

  const validPeriods: WidgetPeriod[] = periods
    .map((className, index) => {
      const cleanClassName = String(className || '').trim();

      if (!cleanClassName) return null;

      const time = periodTimes[index] || {
        startTime: '',
        endTime: ''
      };

      const startTime = String(time.startTime || '').trim();
      const endTime = String(time.endTime || '').trim();

      return {
        index,
        className: cleanClassName,
        subject: subjectName,
        startTime,
        endTime,
        status: getPeriodStatus(startTime, endTime, isToday)
      } as WidgetPeriod;
    })
    .filter((item): item is WidgetPeriod => Boolean(item));

  const currentPeriod =
    validPeriods.find(period => period.status === 'active') || null;

  const nextPeriod =
    validPeriods.find(period => period.status === 'upcoming') || null;

  const now = new Date();

  return {
    todayName,

   currentTitle: currentPeriod ? `الحصة الآن • ${currentPeriod.index + 1}` : 'لا توجد حصة حاليًا',
    currentClass: currentPeriod?.className || '',
    currentSubject: currentPeriod?.subject || subjectName,
    currentTime: formatTimeRange(currentPeriod),

    nextTitle: nextPeriod ? `القادمة • ${nextPeriod.index + 1}` : 'لا توجد حصة قادمة',
    nextClass: nextPeriod?.className || '',
    nextSubject: nextPeriod?.subject || subjectName,
    nextTime: formatTimeRange(nextPeriod),

    school: teacherInfo?.school || '',
    teacherName: teacherInfo?.name || '',

    updatedAt: now.toLocaleTimeString('ar-OM', {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
};

export const useAndroidScheduleWidgetSync = ({
  schedule,
  periodTimes,
  teacherInfo
}: {
  schedule: ScheduleDay[];
  periodTimes: PeriodTime[];
  teacherInfo: TeacherInfo;
}) => {
  const lastPayloadRef = useRef('');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!Array.isArray(schedule)) return;
    if (!Array.isArray(periodTimes)) return;

    let isMounted = true;
    let intervalId: number | undefined;
    const timeoutIds: number[] = [];

    const syncWidget = async (force = false) => {
      if (!isMounted) return;

      const widgetData = buildWidgetPayload(schedule, periodTimes, teacherInfo);
      const payload = JSON.stringify(widgetData);

      /*
        لا نكرر الإرسال إذا لم تتغير البيانات،
        إلا إذا كان الإرسال إجباريًا عند فتح التطبيق أو الرجوع من الخلفية.
      */
      if (!force && lastPayloadRef.current === payload) return;

      try {
        const result = await RasedScheduleWidget.update({
          data: payload
        });

        lastPayloadRef.current = payload;

        console.log('Rased widget updated', result);
        console.log('Rased widget sync payload', widgetData);
      } catch (error) {
        console.warn('تعذر تحديث ويدجيت جدول الحصص', error);
      }
    };

    /*
      إرسال فوري عند تحميل البيانات.
    */
    syncWidget(true);

    /*
      إرسال مؤجل لضمان جاهزية Capacitor والـ Native Plugin بعد فتح التطبيق.
    */
    timeoutIds.push(window.setTimeout(() => syncWidget(true), 1200));
    timeoutIds.push(window.setTimeout(() => syncWidget(true), 3500));

    /*
      تحديث كل دقيقة أثناء فتح التطبيق لتغيير الحصة الحالية والقادمة حسب الوقت.
    */
    intervalId = window.setInterval(() => syncWidget(false), 60 * 1000);

    /*
      عند رجوع التطبيق من الخلفية.
    */
    const appStatePromise = CapacitorApp.addListener('appStateChange', state => {
      if (state.isActive) {
        syncWidget(true);
      }
    });

    /*
      عند رجوع الصفحة للظهور.
    */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWidget(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;

      if (intervalId) {
        window.clearInterval(intervalId);
      }

      timeoutIds.forEach(id => window.clearTimeout(id));

      document.removeEventListener('visibilitychange', handleVisibilityChange);

      appStatePromise
        .then(listener => {
          listener.remove();
        })
        .catch(() => {});
    };
  }, [
    schedule,
    periodTimes,
    teacherInfo?.subject,
    teacherInfo?.school,
    teacherInfo?.name
  ]);
};
