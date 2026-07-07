import { registerPlugin } from '@capacitor/core';

export type RasedScheduleWidgetData = {
  todayName: string;

  currentTitle: string;
  currentClass: string;
  currentSubject?: string;
  currentTime: string;

  nextTitle: string;
  nextClass: string;
  nextSubject?: string;
  nextTime: string;

  school?: string;
  teacherName?: string;
  updatedAt: string;
};

export interface RasedScheduleWidgetPlugin {
  update(options: { data: string }): Promise<{
    success: boolean;
    updatedWidgets?: number;
  }>;
}

export const RasedScheduleWidget =
  registerPlugin<RasedScheduleWidgetPlugin>('RasedScheduleWidget');
