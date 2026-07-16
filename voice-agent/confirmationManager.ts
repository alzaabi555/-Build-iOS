import type { VoiceRiskLevel, VoiceTask } from './types';
import { normalizeText } from './normalizer';

const CONFIRM_PATTERNS = [
  /حذف|مسح|ازاله|تصفير|اعاده تهيئه|خصم|ارسال|نشر|رفع|مزامنه/,
  /delete|remove|clear|reset|deduct|send|publish|upload|sync/
];

const BLOCK_PATTERNS = [
  /حذف (?:كل|جميع)|مسح (?:كل|جميع) البيانات|اعاده ضبط المصنع|استعاده النسخه|استرجاع النسخه|فك القفل/,
  /delete all|wipe data|factory reset|restore backup|unlock app/
];

const matchesAny = (value: string, patterns: RegExp[]) =>
  patterns.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });

export const getTaskRiskLevel = (task: VoiceTask): VoiceRiskLevel => {
  if (task.meta?.risk) return task.meta.risk;

  if (task.type === 'create_student') return 'confirm';
  if (task.type === 'deduct_points') return 'confirm';

  if (task.type === 'dom_click') {
    const command = normalizeText(task.payload.command);
    if (matchesAny(command, BLOCK_PATTERNS)) return 'blocked';
    if (matchesAny(command, CONFIRM_PATTERNS)) return 'confirm';
  }

  return 'safe';
};

export const getTasksRiskLevel = (tasks: VoiceTask[]): VoiceRiskLevel => {
  const levels = tasks.map(getTaskRiskLevel);
  if (levels.includes('blocked')) return 'blocked';
  if (levels.includes('confirm')) return 'confirm';
  return 'safe';
};

/** Preserves the existing public API used by VoiceAssistant. */
export const requiresConfirmation = (tasks: VoiceTask[]) =>
  getTasksRiskLevel(tasks) !== 'safe';

export const isBlockedVoiceTask = (task: VoiceTask) =>
  getTaskRiskLevel(task) === 'blocked';

export const getBlockedTasks = (tasks: VoiceTask[]) =>
  tasks.filter(isBlockedVoiceTask);
