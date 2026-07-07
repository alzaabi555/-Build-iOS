import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
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

  /**
   * نفس منطق Dashboard:
   * الأحد = 0
   * الإثنين = 1
   * الثلاثاء = 2
   * الأربعاء = 3
   * الخميس = 4
   * الجمعة/السبت يعرض الأحد كجدول قادم.
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
  const startMin*tes = minutesFromTime(startTime);
* const endMinutes = minutesFromTim*(endTime);

  if (startMinutes ===*null || endMinutes === null) retur* 'unknown';

  if (nowMinutes >= s*artMinutes && nowMinutes < endMinu*es) return 'active';
  if (nowMinu*es < startMinutes) return 'upcomin*';

  return 'completed';
};

cons* getWidgetScheduleData = (
  sched*le: ScheduleDay[],
  periodTimes: *eriodTime[],
  teacherInfo: Teache*Info
) => {
  const { dayIndex, is*oday } = getDayIndexForRasedSchedu*e();

  const todaySchedule =
    *rray.isArray(schedule) && schedule*length > dayIndex
      ? schedule*dayIndex]
      : null;

  const t*dayName = todaySchedule?.dayName |* 'جدول اليوم';
  const subjectName*= teacherInfo?.subject || 'المادة'*

  const periods = Array.isArray(*odaySchedule?.periods)
    ? today*chedule!.periods
    : [];

  cons* validPeriods: WidgetPeriod[] = pe*iods
    .map((className, index) =* {
      const cleanClassName = St*ing(className || '').trim();

    * if (!cleanClassName) return null;*
      const time = periodTimes[index] || {
        startTime: '',
  *     endTime: ''
      };

      c*nst startTime = String(time.startT*me || '').trim();
      const endT*me = String(time.endTime || '').tr*m();

      return {
        index*
        className: cleanClassName*
        subject: subjectName,
   *    startTime,
        endTime,
  *     status: getPeriodStatus(start*ime, endTime, isToday)
      } as *idgetPeriod;
    })
    .filter((i*em): item is WidgetPeriod => Boole*n(item));

  const currentPeriod =*    validPeriods.find(period => pe*iod.status === 'active') || null;
*  const nextPeriod =
    validPeri*ds.find(period => period.status ==* 'upcoming') || null;

  const for*atTimeRange = (period: WidgetPerio* | null) => {
    if (!period) ret*rn '';
    if (!period.startTime &* !period.endTime) return '';
    r*turn `${period.startTime || '--:--*} - ${period.endTime || '--:--'}`;*  };

  const now = new Date();

 *return {
    todayName,

    curre*tTitle: currentPeriod ? 'الحصة الآ*' : 'لا توجد حصة حاليًا',
    curr*ntClass: currentPeriod?.className *| '',
    currentSubject: currentP*riod?.subject || subjectName,
    *urrentTime: formatTimeRange(curren*Period),

    nextTitle: nextPerio* ? 'القادمة' : 'لا توجد حصة قادمة'*
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
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!Array.isArray(schedule) || !Array.isArray(periodTimes)) return;

    let isMounted = true;

    const syncWidget = async () => {
      if (!isMounted) return;

      const widgetData = getWidgetScheduleData(
        schedule,
        periodTimes,
        teacherInfo
      );

      try {
        const result = await RasedScheduleWidget.update({
          data: JSON.stringify(widgetData)
        });

        console.log('Rased widget updated', result);
        console.log('Rased widget sync payload', widgetData);
      } catch (error) {
        console.warn('تعذر تحديث ويدجيت جدول الحصص', error);
      }
    };

    syncWidget();

    /**
     * تحديث الويدجيت كل دقيقة أثناء فتح التطبيق،
     * حتى تتغير الحصة الحالية/القادمة تلقائيًا عند تغير الوقت.
     */
    const interval = window.setInterval(syncWidget, 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [
    schedule,
    periodTimes,
    teacherInfo?.subject,
    teacherInfo?.school,
    teacherInfo?.name
  ]);
};
