import { registerPlugin } from '@capacitor/core';

export interface RasedScheduleWidgetPlugin {
  updateScheduleWidget(options: { payload: string }): Promise<{ success: boolean; widgets?: number }>;
}

export const RasedScheduleWidget = registerPlugin<RasedScheduleWidgetPlugin>('RasedScheduleWidget');
