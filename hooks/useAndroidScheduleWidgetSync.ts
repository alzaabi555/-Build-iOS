import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { RasedScheduleWidget } from '../native/RasedScheduleWidget';

type ScheduleDay = {
  dayName: string;
  periods: string[];
};

type PeriodTime = {
  periodNumber: number;
  startTime: string;
  endTime: string;
};

type TeacherInfo = {
  subject?: string;
  school?: string;
  name?: string;
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
    const syncWidget = async () => {
      if (!Capacitor.isNativePlatform()) return;
      if (!Array.isArray(schedule) || !Array.isArray(periodTimes)) return;

      const payload = {
        schedule: schedule.map(day => ({
          dayName: day.dayName,
          periods: Array.isArray(day.periods) ? day.periods : []
        })),
        periodTimes: periodTimes.map(item => ({
          periodNumber: item.periodNumber,
          startTime: item.startTime || '',
          endTime: item.endTime || ''
        })),
        subject: teacherInfo?.subject || '',
        school: teacherInfo?.school || '',
        teacherName: teacherInfo?.name || '',
        updatedAt: new Date().toISOString()
      };

      try {
        await RasedScheduleWidget.updateScheduleWidget({
          payload: JSON.stringify(payload)
        });
      } catch (error) {
        console.warn('تعذر تحديث ويدجيت جدول الحصص', error);
      }
    };

    syncWidget();
  }, [schedule, periodTimes, teacherInfo?.subject, teacherInfo?.school, teacherInfo?.name]);
};
