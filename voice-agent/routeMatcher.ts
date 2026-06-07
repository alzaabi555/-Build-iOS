import { normalizeText } from './normalizer';

export const getTargetRoute = (commandText: string): string | null => {
  const text = normalizeText(commandText);

  if (/(رئيسي|داشبورد|لوحه|شاشه رئيسي)/.test(text)) return 'dashboard';
  if (/(تقرير|تقارير|احصائيات|نتايج|نتائج)/.test(text)) return 'reports';
  if (/(درجات|درجه|رصد|سجل الدرجات)/.test(text)) return 'grades';
  if (/(حضور|غياب|سجل الغياب|تحضير)/.test(text)) return 'attendance';
  if (/(طلاب|طلبه|قائمه الطلاب|وارد)/.test(text)) return 'students';
  if (/(فرسان|شرف|اوائل|متصدرين)/.test(text)) return 'leaderboard';
  if (/(اعدادات|ضبط)/.test(text)) return 'settings';

  return null;
};