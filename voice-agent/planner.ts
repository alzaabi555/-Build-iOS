import { Student } from '../types';
import { VoiceAgentMemory } from './memory';
import { VoiceTask } from './types';
import { normalizeText } from './normalizer';
import { splitCompoundCommands } from './commandSplitter';
import { extractAmount } from './amountExtractor';
import { findBestStudent } from './studentMatcher';
import { getTargetRoute } from './routeMatcher';

interface PlannerContext {
  students: Student[];
  memory: VoiceAgentMemory;
}

const normalizeForIntent = (value: string) =>
  normalizeText(String(value || ''))
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
    .replace(/[۰-۹]/g, digit => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit).toString())
    .replace(/[^a-z0-9\u0600-\u06ff\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesAny = (text: string, phrases: string[]) =>
  phrases.some(phrase => text.includes(normalizeForIntent(phrase)));

const NAVIGATION_ROUTES: Array<{ route: string; phrases: string[] }> = [
  { route: 'dashboard', phrases: ['الرئيسية', 'لوحة القيادة', 'لوحة المعلومات', 'dashboard', 'home page', 'open home'] },
  { route: 'attendance', phrases: ['الحضور والغياب', 'سجل الغياب', 'افتح الحضور', 'attendance tracker', 'take attendance'] },
  { route: 'students', phrases: ['ادارة الطلاب', 'قائمة الطلاب', 'افتح الطلاب', 'student management', 'student list', 'open students'] },
  { route: 'groups', phrases: ['ادارة المجموعات', 'تقسيم الطلاب', 'افتح المجموعات', 'group management', 'student groups', 'open groups'] },
  { route: 'mailbox', phrases: ['المراسلات', 'رسائل اولياء الامور', 'البريد', 'الوارد', 'mailbox', 'parent messages', 'inbox'] },
  { route: 'grades', phrases: ['سجل الدرجات', 'التعليم والتقييم', 'افتح الدرجات', 'gradebook', 'learning and evaluation', 'open grades'] },
  { route: 'tasks', phrases: ['المهام والواجبات', 'افتح المهام', 'assignments', 'homework', 'open tasks'] },
  { route: 'library', phrases: ['المكتبة الرقمية', 'افتح المكتبة', 'digital library', 'resources', 'open library'] },
  { route: 'game_questions', phrases: ['بنك الاسئلة', 'اسئلة الالعاب', 'بنك أسئلة الألعاب', 'question bank', 'game questions'] },
  { route: 'game_results', phrases: ['نتائج الالعاب', 'لوحة نتائج الالعاب', 'game results', 'games results dashboard'] },
  { route: 'reports', phrases: ['مركز التقارير', 'التقارير والتحليل', 'التحليل الاحصائي', 'reports center', 'statistical analysis', 'analytics'] },
  { route: 'leaderboard', phrases: ['لوحة الفرسان', 'المتصدرين', 'leaderboard', 'top students', 'knights'] },
  { route: 'sync', phrases: ['مركز المزامنة', 'الادارة والمزامنة', 'النسخة السحابية', 'sync center', 'cloud sync', 'admin and sync'] },
  { route: 'guide', phrases: ['دليل الاستخدام', 'دليل التطبيق', 'افتح الدليل', 'user guide', 'app guide', 'open guide'] },
  { route: 'settings', phrases: ['الاعدادات', 'اعدادات التطبيق', 'افتح الاعدادات', 'settings', 'app settings'] },
  { route: 'about', phrases: ['عن التطبيق', 'حول التطبيق', 'حول راصد', 'about app', 'about rased'] },
  { route: 'senior_dashboard', phrases: ['لوحة المعلم الاول', 'ادارة القسم', 'القيادة', 'senior teacher dashboard', 'department management'] }
];

const extractProfessionalRoute = (text: string) =>
  NAVIGATION_ROUTES.find(item => includesAny(text, item.phrases))?.route || null;

const extractGrade = (commandText: string) => {
  const text = normalizeForIntent(commandText);
  const gradeMatch =
    text.match(/(?:في|الى|الي|لفصل|فصل|صف|class|grade)\s+([\u0600-\u06ffa-z0-9\s/]+)$/) ||
    text.match(/(?:الفصل|الصف|class|grade)\s+([\u0600-\u06ffa-z0-9\s/]+)/);
  return gradeMatch?.[1]?.trim() || (/[a-z]/.test(text) ? 'No class' : 'بدون فصل');
};

const extractStudentNameForCreation = (commandText: string) =>
  String(commandText || '')
    .replace(/(أنشئ|انشئ|اضف|أضف|طالب|طالبة|جديد|جديدة|create|add|new|student)/gi, ' ')
    .replace(/(باسم|اسمه|اسمها|اسم الطالب|اسم الطالبة|named|name is)/gi, ' ')
    .replace(/(?:في فصل|في الصف|في الفصل|in class|in grade).*$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const planSingleCommand = (originalCommand: string, context: PlannerContext): VoiceTask[] => {
  const text = normalizeForIntent(originalCommand);
  if (!text) return [];

  if (includesAny(text, ['تراجع', 'ارجع', 'الغ اخر عملية', 'الغي اخر عملية', 'عفوا', 'undo', 'undo last action'])) {
    return [{ type: 'undo' }];
  }

  if (includesAny(text, ['اكتب', 'ضع', 'ادخل', 'أدخل', 'ابحث عن', 'بحث عن', 'write', 'type', 'enter', 'search for'])) {
    let value = '';
    let fieldKeyword = includesAny(text, ['search', 'بحث']) ? 'بحث' : 'بحث';
    const writeMatch =
      originalCommand.match(/(?:اكتب|ضع|ادخل|أدخل|write|type|enter)\s+(.+?)\s+(?:في|داخل|بداخل|in|into)\s+(?:خانة|خانه|حقل|مربع|مربع النص|قسم|field|box)?\s*(.+)$/i) ||
      originalCommand.match(/(?:في|داخل|بداخل|in|into)\s+(?:خانة|خانه|حقل|مربع|مربع النص|قسم|field|box)?\s*(.+?)\s+(?:اكتب|ضع|ادخل|أدخل|write|type|enter)\s+(.+)$/i);
    if (writeMatch?.[1] && writeMatch?.[2]) {
      value = writeMatch[1].trim();
      fieldKeyword = writeMatch[2].trim();
    } else if (includesAny(text, ['ابحث عن', 'بحث عن', 'search for'])) {
      value = originalCommand.replace(/(ابحث عن|بحث عن|search for)/gi, '').trim();
      fieldKeyword = includesAny(text, ['حضور', 'attendance']) ? 'بحث الحضور' : 'بحث';
    } else {
      value = originalCommand.replace(/(اكتب|ضع|ادخل|أدخل|write|type|enter|في خانة|في خانه|في حقل|في مربع|داخل)/gi, '').trim();
    }
    if (!value) return [{ type: 'feedback', payload: { message: 'لم أتعرف على النص المطلوب كتابته', feedbackType: 'error' } }];
    return [{ type: 'write_field', payload: { fieldKeyword, value } }];
  }

  if (includesAny(text, ['طالب جديد', 'طالبة جديدة', 'اضف طالب', 'أضف طالب', 'انشاء طالب', 'انشئ طالب', 'أنشئ طالب', 'new student', 'add student', 'create student'])) {
    const grade = extractGrade(originalCommand);
    const possibleName = extractStudentNameForCreation(originalCommand);
    if (possibleName.length >= 3) return [{ type: 'create_student', payload: { name: possibleName, grade } }];
    return [{ type: 'ask_student_name', payload: { grade } }];
  }

  const matchedStudent = findBestStudent(originalCommand, context.students, context.memory);
  if (matchedStudent.ambiguous) {
    const names = matchedStudent.matches.slice(0, 3).map(student => student.name).join('، ');
    return [{ type: 'feedback', payload: { message: `وجدت أكثر من طالب: ${names}. يرجى ذكر الاسم الكامل`, feedbackType: 'error', speak: 'وجدت أكثر من طالب. يرجى ذكر الاسم الكامل' } }];
  }

  if (matchedStudent.student) {
    const student = matchedStudent.student;
    const shortName = student.name.split(/\s+/)[0];
    const amount = Math.max(1, Math.abs(extractAmount(text) || 1));
    const isAbsent = includesAny(text, ['غايب', 'غائب', 'غياب', 'غاب', 'مريض', 'سجل غياب', 'absent', 'mark absent']);
    const isPresent = includesAny(text, ['حاضر', 'حضر', 'موجود', 'سجل حضور', 'تحضير', 'present', 'mark present']);
    const isLate = includesAny(text, ['متاخر', 'متأخر', 'تاخير', 'تأخير', 'سجل تاخير', 'سجل تأخير', 'late', 'mark late']);
    const isTruant = includesAny(text, ['هروب', 'هارب', 'متسرب', 'تسرب', 'خرج من الحصة', 'truant', 'skipped class']);
    const isNegative = !isLate && !isTruant && includesAny(text, ['خصم', 'ناقص', 'ازعاج', 'مزعج', 'نايم', 'غلط', 'سيء', 'اسحب', 'deduct', 'subtract', 'negative point']);
    const isPositive = !isNegative && !isLate && !isTruant && includesAny(text, ['نجم', 'نقط', 'درجة', 'ممتاز', 'بطل', 'مشارك', 'شاطر', 'مبدع', 'زيد', 'اعط', 'ضيف', 'تعزيز', 'add point', 'award point', 'give point']);
    if (isAbsent) return [{ type: 'mark_absent', payload: { studentId: student.id, studentName: shortName } }];
    if (isPresent) return [{ type: 'mark_present', payload: { studentId: student.id, studentName: shortName } }];
    if (isLate) return [{ type: 'mark_late', payload: { studentId: student.id, studentName: shortName } }];
    if (isTruant) return [{ type: 'mark_truant', payload: { studentId: student.id, studentName: shortName } }];
    if (isNegative) return [{ type: 'deduct_points', payload: { studentId: student.id, studentName: shortName, amount } }];
    if (isPositive) return [{ type: 'add_points', payload: { studentId: student.id, studentName: shortName, amount } }];
  }

  const route = extractProfessionalRoute(text) || getTargetRoute(originalCommand);
  if (route) return [{ type: 'navigate', payload: { route } }];

  return [{ type: 'dom_click', payload: { command: originalCommand } }];
};

export const planCommand = (command: string, context: PlannerContext): VoiceTask[] => {
  const parts = splitCompoundCommands(command).filter(part => normalizeForIntent(part));
  const tasks = parts.flatMap(part => planSingleCommand(part, context));
  return tasks.length ? tasks : [{ type: 'unknown', payload: { text: command } }];
};
