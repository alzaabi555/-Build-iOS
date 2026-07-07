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
  const dayIndex = todayRaw ==* 5 || todayRaw === 6 ? 0 : todayRa*;
  const isToday = todayRaw === d*yIndex;

  return { dayIndex, isTo*ay };
};

const getPeriodStatus = *
  startTime: string,
  endTime: s*ring,
  isToday: boolean
): Widget*eriod['status'] => {
  if (!startT*me || !endTime) return 'unknown';
*  if (!isToday) return 'upcoming';*
  const now = new Date();
  const*nowMinutes = now.getHours() * 60 +*now.getMinutes();

  const startMi*utes = minutesFromTime(startTime);*  const endMinutes = minutesFromTi*e(endTime);

  if (startMinutes ==* null || endMinutes === null) retu*n 'unknown';

  if (nowMinutes >= *tartMinutes && nowMinutes < endMin*tes) return 'active';
  if (nowMin*tes < startMinutes) return 'upcomi*g';

  return 'completed';
};

con*t formatTimeRange = (period: Widge*Period | null) => {
  if (!period)*return '';
  if (!period.startTime*&& !period.endTime) return '';

  *eturn `${period.startTime || '--:-*'} - ${period.endTime || '--:--'}`*
};

const buildWidgetPayload = (
* schedule: ScheduleDay[],
  period*imes: PeriodTime[],
  teacherInfo:*TeacherInfo
) => {
  const { dayIn*ex, isToday } = getDayIndexForRase*Schedule();

  const todaySchedule*=
    Array.isArray(schedule) && s*hedule.length > dayIndex
      ? s*hedule[dayIndex]
      : null;

  *onst todayName = todaySchedule?.da*Name || 'جدول اليوم';
  const subj*ctName = teacherInfo?.subject || '*لمادة';

  const periods = Array.i*Array(todaySchedule?.periods)
    * todaySchedule!.periods
    : [];
*  const validPeriods: WidgetPeriod*] = periods
    .map((className, i*dex) => {
      const cleanClassNa*e = String(className || '').trim()*

      if (!cleanClassName) retur* null;

      const time = periodT*mes[index] || {
        startTime:*'',
        endTime: ''
      };

*     const startTime = String(time*startTime || '').trim();
      con*t endTime = String(time.endTime ||*'').trim();

      return {
      * index,
        className: cleanCl*ssName,
        subject: subjectNa*e,
        startTime,
        endT*me,
        status: getPeriodStatu*(startTime, endTime, isToday)
    * } as WidgetPeriod;
    })
    .fi*ter((item): item is WidgetPeriod =* Boolean(item));

  const currentP*riod =
    validPeriods.find(perio* => period.status === 'active') ||*null;

  const nextPeriod =
    va*idPeriods.find(period => period.st*tus === 'upcoming') || null;

  co*st now = new Date();

  return {
 *  todayName,

    currentTitle: cu*rentPeriod ? 'الحصة الآن' : 'لا تو*د حصة حاليًا',
    currentClass: c*rrentPeriod?.className || '',
    *urrentSubject: currentPeriod?.subj*ct || subjectName,
    currentTime* formatTimeRange(currentPeriod),

*   nextTitle: nextPeriod ? 'القادم*' : 'لا توجد حصة قادمة',
    nextC*ass: nextPeriod?.className || '',
*   nextSubject: nextPeriod?.subjec* || subjectName,
    nextTime: for*atTimeRange(nextPeriod),

    scho*l: teacherInfo?.school || '',
    *eacherName: teacherInfo?.name || '*,

    updatedAt: now.toLocaleTime*tring('ar-OM', {
      hour: '2-di*it',
      minute: '2-digit'
    }*
  };
};

export const useAndroidS*heduleWidgetSync = ({
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
        إلا إذا كان sync قادمًا من resume أو delayed sync.
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
      إرسال مؤجل لضمان أن Capacitor و Native Plugin أصبحا جاهزين بعد فتح التطبيق.
      هذا مهم جدًا للويدجيت.
    */
    timeoutIds.push(window.setTimeout(() => syncWidget(true), 1200));
    timeoutIds.push(window.setTimeout(() => syncWidget(true), 3500));

    /*
      تحديث كل دقيقة أثناء فتح التطبيق حتى تتغير الحصة الحالية والقادمة تلقائيًا.
    */
    intervalId = window.setInterval(() => syncWidget(false), 60 * 1000);

    /*
      عند رجوع التطبيق من الخلفية، نحدث الويدجيت مباشرة.
    */
    const appStatePromise = CapacitorApp.addListener('appStateChange', state => {
      if (state.isActive) {
        syncWidget(true);
      }
    });

    /*
      عند رجوع الصفحة للظهور، نحدث الويدجيت أيضًا.
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

      appStatePromise.then(listener => {
        listener.remove();
      }).catch(() => {});
    };
  }, [
    schedule,
    periodTimes,
    teacherInfo?.subject,
    teacherInfo?.school,
    teacherInfo?.name
  ]);
};
