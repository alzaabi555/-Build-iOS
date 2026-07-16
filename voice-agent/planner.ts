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

type RouteDefinition = {
  route: string;
  phrases: string[];
};

const ARABIC_NUMBER_WORDS: Record<string, number> = {
  صفر: 0,
  واحد: 1,
  واحدة: 1,
  اول: 1,
  الاول: 1,
  الأولى: 1,
  اثنان: 2,
  اثنين: 2,
  اثنتان: 2,
  اثنتين: 2,
  ثاني: 2,
  الثاني: 2,
  الثانية: 2,
  ثلاثة: 3,
  ثلاث: 3,
  ثالث: 3,
  الثالث: 3,
  الثالثة: 3,
  اربعة: 4,
  أربع: 4,
  رابع: 4,
  الرابع: 4,
  الرابعة: 4,
  خمسة: 5,
  خمس: 5,
  خامس: 5,
  الخامس: 5,
  الخامسة: 5,
  ستة: 6,
  ست: 6,
  سادس: 6,
  السادس: 6,
  السادسة: 6,
  سبعة: 7,
  سبع: 7,
  سابع: 7,
  السابع: 7,
  السابعة: 7,
  ثمانية: 8,
  ثمان: 8,
  ثامن: 8,
  الثامن: 8,
  الثامنة: 8,
  تسعة: 9,
  تسع: 9,
  تاسع: 9,
  التاسع: 9,
  التاسعة: 9,
  عشرة: 10,
  عشر: 10,
  عاشر: 10,
  العاشر: 10,
  العاشرة: 10
};

const ENGLISH_NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  first: 1,
  two: 2,
  second: 2,
  three: 3,
  third: 3,
  four: 4,
  fourth: 4,
  five: 5,
  fifth: 5,
  six: 6,
  sixth: 6,
  seven: 7,
  seventh: 7,
  eight: 8,
  eighth: 8,
  nine: 9,
  ninth: 9,
  ten: 10,
  tenth: 10
};

const FILLER_PHRASES = [
  'من فضلك',
  'لو سمحت',
  'ممكن',
  'اريد ان',
  'أريد أن',
  'يا راصد',
  'راصد',
  'please',
  'could you',
  'can you',
  'i want to',
  'rased'
];

const normalizeForIntent = (value: string) => {
  let normalized = normalizeText(String(value || ''))
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
    .replace(/[۰-۹]/g, digit => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit).toString())
    .replace(/[^a-z0-9\u0600-\u06ff\s/.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  FILLER_PHRASES.forEach(phrase => {
    normalized = normalized.replace(
      new RegExp(`(^|\\s)${normalizeText(phrase).replace(/[أإآ]/g, 'ا')}($|\\s)`, 'gi'),
      ' '
    );
  });

  return normalized.replace(/\s+/g, ' ').trim();
};

const textContainsPhrase = (text: string, phrase: string) => {
  const normalizedText = ` ${normalizeForIntent(text)} `;
  const normalizedPhrase = normalizeForIntent(phrase);
  if (!normalizedPhrase) return false;
  return normalizedText.includes(` ${normalizedPhrase} `) || normalizeForIntent(text).includes(normalizedPhrase);
};

const includesAny = (text: string, phrases: string[]) =>
  phrases.some(phrase => textContainsPhrase(text, phrase));

const NAVIGATION_ROUTES: RouteDefinition[] = [
  { route: 'game_results', phrases: ['نتائج الالعاب', 'لوحه نتائج الالعاب', 'الطلاب غير المشاركين', 'game results', 'non participating students'] },
  { route: 'game_questions', phrases: ['بنك الاسئله', 'اسئله الالعاب', 'انشاء اسئله لعبه', 'question bank', 'game questions'] },
  { route: 'attendance', phrases: ['الحضور والغياب', 'سجل الغياب', 'افتح الحضور', 'ابدأ الحضور', 'attendance tracker', 'take attendance'] },
  { route: 'students', phrases: ['اداره الطلاب', 'قائمه الطلاب', 'افتح الطلاب', 'student management', 'student list', 'open students'] },
  { route: 'groups', phrases: ['اداره المجموعات', 'تقسيم الطلاب', 'الطلاب غير الموزعين', 'group management', 'student groups', 'open groups'] },
  { route: 'mailbox', phrases: ['مركز المراسلات', 'رسائل اولياء الامور', 'الرسائل المرسله', 'البريد', 'الوارد', 'mailbox', 'parent messages', 'inbox', 'sent messages'] },
  { route: 'grades', phrases: ['سجل الدرجات', 'التعليم والتقييم', 'ادوات التقويم', 'افتح الدرجات', 'gradebook', 'assessment tools', 'open grades'] },
  { route: 'tasks', phrases: ['المهام والواجبات', 'افتح المهام', 'assignments', 'homework', 'open tasks'] },
  { route: 'library', phrases: ['المكتبه الرقميه', 'افتح المكتبه', 'digital library', 'resources', 'open library'] },
  { route: 'reports', phrases: ['مركز التقارير', 'التقارير والتحليل', 'التحليل الاحصائي', 'الشهادات', 'تقرير طالب', 'reports center', 'statistical analysis', 'certificates', 'student report'] },
  { route: 'leaderboard', phrases: ['لوحه الفرسان', 'المتصدرين', 'leaderboard', 'top students', 'knights'] },
  { route: 'sync', phrases: ['مركز المزامنه', 'النسخه السحابيه', 'النسخه الاحتياطيه', 'sync center', 'cloud sync', 'backup center'] },
  { route: 'guide', phrases: ['دليل الاستخدام', 'دليل التطبيق', 'افتح الدليل', 'user guide', 'app guide', 'open guide'] },
  { route: 'settings', phrases: ['الاعدادات', 'اعدادات التطبيق', 'افتح الاعدادات', 'settings', 'app settings'] },
  { route: 'about', phrases: ['عن التطبيق', 'حول التطبيق', 'حول راصد', 'about app', 'about rased'] },
  { route: 'senior_dashboard', phrases: ['لوحه المعلم الاول', 'اداره القسم', 'القياده', 'senior teacher dashboard', 'department management'] },
  { route: 'dashboard', phrases: ['الرئيسيه', 'لوحه القياده', 'لوحه المعلومات', 'الخطه الفصليه', 'خطه التقويم المستمر', 'dashboard', 'home page', 'term plan', 'continuous assessment plan'] }
];

const extractProfessionalRoute = (text: string) =>
  NAVIGATION_ROUTES.find(item => includesAny(text, item.phrases))?.route || null;

const numberWordToDigit = (value: string) => {
  const normalized = normalizeForIntent(value);
  const tokens = normalized.split(/\s+/);
  for (const token of tokens) {
    if (/^\d+$/.test(token)) return Number(token);
    if (Object.prototype.hasOwnProperty.call(ARABIC_NUMBER_WORDS, token)) return ARABIC_NUMBER_WORDS[token];
    if (Object.prototype.hasOwnProperty.call(ENGLISH_NUMBER_WORDS, token)) return ENGLISH_NUMBER_WORDS[token];
  }
  return null;
};

const normalizeClassExpression = (value: string) => {
  const normalized = normalizeForIntent(value)
    .replace(/^(الفصل|الصف|فصل|صف|class|grade)\s+/, '')
    .trim();

  const slashMatch = normalized.match(/(\d{1,2})\s*[/\\-]\s*(\d{1,2})/);
  if (slashMatch) return `${slashMatch[1]}/${slashMatch[2]}`;

  const digitMatches = normalized.match(/\d{1,2}/g);
  if (digitMatches?.length && digitMatches.length >= 2) return `${digitMatches[0]}/${digitMatches[1]}`;
  if (digitMatches?.length === 1) return digitMatches[0];

  const tokens = normalized.split(/\s+/);
  const numbers = tokens
    .map(token => numberWordToDigit(token))
    .filter((item): item is number => item !== null);

  if (numbers.length >= 2) return `${numbers[0]}/${numbers[1]}`;
  if (numbers.length === 1) return String(numbers[0]);
  return value.trim();
};

const extractGrade = (commandText: string) => {
  const text = normalizeForIntent(commandText);
  const match = text.match(/(?:في|الى|الي|لفصل|فصل|صف|class|grade)\s+([\u0600-\u06ffa-z0-9\s/.-]+)$/);
  if (!match?.[1]) return /[a-z]/.test(text) ? 'No class' : 'بدون فصل';
  return normalizeClassExpression(match[1]);
};

const extractStudentNameForCreation = (commandText: string) =>
  String(commandText || '')
    .replace(/(أنشئ|انشئ|اضف|أضف|طالب|طالبة|جديد|جديدة|create|add|new|student)/gi, ' ')
    .replace(/(باسم|اسمه|اسمها|اسم الطالب|اسم الطالبة|named|name is)/gi, ' ')
    .replace(/(?:في فصل|في الصف|في الفصل|in class|in grade).*$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractWriteInstruction = (originalCommand: string) => {
  const writeMatch =
    originalCommand.match(/(?:اكتب|ضع|ادخل|أدخل|write|type|enter)\s+(.+?)\s+(?:في|داخل|بداخل|in|into)\s+(?:خانة|خانه|حقل|مربع|مربع النص|قسم|field|box)?\s*(.+)$/i) ||
    originalCommand.match(/(?:في|داخل|بداخل|in|into)\s+(?:خانة|خانه|حقل|مربع|مربع النص|قسم|field|box)?\s*(.+?)\s+(?:اكتب|ضع|ادخل|أدخل|write|type|enter)\s+(.+)$/i);

  if (writeMatch?.[1] && writeMatch?.[2]) {
    return { value: writeMatch[1].trim(), fieldKeyword: writeMatch[2].trim() };
  }

  const searchMatch = originalCommand.match(/(?:ابحث عن|بحث عن|search for)\s+(.+)$/i);
  if (searchMatch?.[1]) return { value: searchMatch[1].trim(), fieldKeyword: 'بحث' };

  const value = originalCommand
    .replace(/(اكتب|ضع|ادخل|أدخل|write|type|enter|في خانة|في خانه|في حقل|في مربع|داخل)/gi, '')
    .trim();
  return { value, fieldKeyword: 'بحث' };
};

const planSingleCommand = (originalCommand: string, context: PlannerContext): VoiceTask[] => {
  const text = normalizeForIntent(originalCommand);
  if (!text) return [];

  if (includesAny(text, ['تراجع', 'ارجع', 'الغ اخر عمليه', 'الغي اخر عمليه', 'undo', 'undo last action'])) {
    return [{ type: 'undo' }];
  }

  if (includesAny(text, ['اكتب', 'ضع', 'ادخل', 'أدخل', 'ابحث عن', 'بحث عن', 'write', 'type', 'enter', 'search for'])) {
    const instruction = extractWriteInstruction(originalCommand);
    if (!instruction.value) {
      return [{ type: 'feedback', payload: { message: 'لم أتعرف على النص المطلوب كتابته', feedbackType: 'error' } }];
    }
    return [{ type: 'write_field', payload: instruction }];
  }

  if (includesAny(text, ['طالب جديد', 'طالبه جديده', 'اضف طالب', 'أضف طالب', 'انشاء طالب', 'انشئ طالب', 'أنشئ طالب', 'new student', 'add student', 'create student'])) {
    const grade = extractGrade(originalCommand);
    const possibleName = extractStudentNameForCreation(originalCommand);
    if (possibleName.length >= 3) return [{ type: 'create_student', payload: { name: possibleName, grade } }];
    return [{ type: 'ask_student_name', payload: { grade } }];
  }

  const matchedStudent = findBestStudent(originalCommand, context.students, context.memory);
  if (matchedStudent.ambiguous) {
    const names = matchedStudent.matches
      .slice(0, 3)
      .map(student => `${student.name}${student.classes?.[0] ? ` (${student.classes[0]})` : ''}`)
      .join('، ');
    return [{
      type: 'feedback',
      payload: {
        message: `وجدت أكثر من طالب: ${names}. يرجى ذكر الاسم الكامل أو الفصل`,
        feedbackType: 'error',
        speak: 'وجدت أكثر من طالب. يرجى ذكر الاسم الكامل أو الفصل'
      }
    }];
  }

  if (matchedStudent.student) {
    const student = matchedStudent.student;
    const shortName = student.name.split(/\s+/)[0];
    const spokenAmount = numberWordToDigit(text);
    const amount = Math.max(1, Math.abs(spokenAmount ?? extractAmount(text) ?? 1));

    const isAbsent = includesAny(text, ['غايب', 'غائب', 'غياب', 'غاب', 'مريض', 'سجل غياب', 'absent', 'mark absent']);
    const isPresent = includesAny(text, ['حاضر', 'حضر', 'موجود', 'سجل حضور', 'تحضير', 'present', 'mark present']);
    const isLate = includesAny(text, ['متاخر', 'متأخر', 'تاخير', 'تأخير', 'سجل تاخير', 'سجل تأخير', 'late', 'mark late']);
    const isTruant = includesAny(text, ['هروب', 'هارب', 'متسرب', 'تسرب', 'خرج من الحصه', 'truant', 'skipped class']);
    const isNegative = !isLate && !isTruant && includesAny(text, ['خصم', 'ناقص', 'ازعاج', 'مزعج', 'نايم', 'غلط', 'سيء', 'اسحب', 'deduct', 'subtract', 'negative point']);
    const isPositive = !isNegative && !isLate && !isTruant && includesAny(text, ['نجم', 'نقط', 'درجه', 'ممتاز', 'بطل', 'مشارك', 'شاطر', 'مبدع', 'زيد', 'اعط', 'ضيف', 'تعزيز', 'add point', 'award point', 'give point']);

    if (isAbsent) return [{ type: 'mark_absent', payload: { studentId: student.id, studentName: shortName } }];
    if (isPresent) return [{ type: 'mark_present', payload: { studentId: student.id, studentName: shortName } }];
    if (isLate) return [{ type: 'mark_late', payload: { studentId: student.id, studentName: shortName } }];
    if (isTruant) return [{ type: 'mark_truant', payload: { studentId: student.id, studentName: shortName } }];
    if (isNegative) return [{ type: 'deduct_points', payload: { studentId: student.id, studentName: shortName, amount } }];
    if (isPositive) return [{ type: 'add_points', payload: { studentId: student.id, studentName: shortName, amount } }];
  }

  const route = extractProfessionalRoute(text) || getTargetRoute(originalCommand);
  if (route) return [{ type: 'navigate', payload: { route } }];

  if (includesAny(text, ['اضغط', 'اختر', 'شغل', 'ابدأ', 'افتح', 'اظهر', 'اعرض', 'click', 'select', 'start', 'show', 'open'])) {
    return [{ type: 'dom_click', payload: { command: originalCommand } }];
  }

  return [{ type: 'unknown', payload: { text: originalCommand } }];
};

export const planCommand = (command: string, context: PlannerContext): VoiceTask[] => {
  const parts = splitCompoundCommands(command)
    .map(part => part.trim())
    .filter(part => normalizeForIntent(part));

  const tasks = parts.flatMap(part => planSingleCommand(part, context));
  return tasks.length ? tasks : [{ type: 'unknown', payload: { text: command } }];
};
