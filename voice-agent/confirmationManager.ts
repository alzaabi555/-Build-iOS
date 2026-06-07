import { VoiceTask } from './types';
import { normalizeText } from './normalizer';

export const requiresConfirmation = (tasks: VoiceTask[]) => {
  return tasks.some((task) => {
    if (task.type === 'deduct_points' && task.payload.amount >= 5) {
      return true;
    }

    if (
      task.type === 'dom_click' &&
      /(حذف|امسح|ازاله|إزالة|مسح|صفر|تصفير)/.test(normalizeText(task.payload.command))
    ) {
      return true;
    }

    return false;
  });
};