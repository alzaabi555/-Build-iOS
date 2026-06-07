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

const extractGrade = (commandText: string) => {
  const text = normalizeText(commandText);

  const gradeMatch =
    text.match(/(?:في|الى|لفصل|فصل|صف)\s+([\u0600-\u06FFa-zA-Z0-9\s]+)$/) ||
    text.match(/(?:الفصل|الصف)\s+([\u0600-\u06FFa-zA-Z0-9\s]+)/);

  return gradeMatch?.[1]?.trim() || 'بدون فصل';
};

const extractStudentNameForCreation = (commandText: string) => {
  return commandText
    .replace(/(أنشئ|انشئ|اضف|أضف|طالب|طالبة|جديد|جديدة)/g, '')
    .replace(/(باسم|اسمه|اسمها|اسم الطالب|اسم الطالبة)/g, '')
    .replace(/في فصل.*$/g, '')
    .replace(/في الصف.*$/g, '')
    .replace(/في الفصل.*$/g, '')
    .trim();
};

const planSingleCommand = (
  originalCommand: string,
  context: PlannerContext
): VoiceTask[] => {
  const text = normalizeText(originalCommand);

  if (!text.trim()) return [];

  if (/(تراجع|ارجع|الغ اخر عمليه|الغي اخر عمليه|عفوا)/.test(text)) {
    return [{ type: 'undo' }];
  }

  if (/(اكتب|ضع|ادخل|أدخل|سجل|ابحث عن|بحث عن)/.test(text)) {
    let value = '';
    let fieldKeyword = 'بحث';

    const writeMatch =
      originalCommand.match(/(?:اكتب|ضع|ادخل|أدخل|سجل)\s+(.+?)\s+(?:في|داخل|بداخل)\s+(?:خانة|خانه|حقل|مربع|مربع النص|قسم)?\s*(.+)$/) ||
      originalCommand.match(/(?:في|داخل|بداخل)\s+(?:خانة|خانه|حقل|مربع|مربع النص|قسم)?\s*(.+?)\s+(?:اكتب|ضع|ادخل|أدخل|سجل)\s+(.+)$/);

    if (writeMatch) {
      if (writeMatch[1] && writeMatch[2]) {
        value = writeMatch[1].trim();
        fieldKeyword = writeMatch[2].trim();
      }
    } else if (/(ابحث عن|بحث عن)/.test(text)) {
      value = originalCommand
        .replace(/(ابحث عن|بحث عن|عن)/g, '')
        .trim();

      fieldKeyword = 'بحث';
    } else {
      value = originalCommand
        .replace(/(اكتب|ضع|ادخل|أدخل|سجل|في خانة|في خانه|في حقل|في مربع|داخل)/g, '')
        .trim();

      fieldKeyword = 'بحث';
    }

    return [
      {
        type: 'write_field',
        payload: {
          fieldKeyword,
          value
        }
      }
    ];
  }

  if (
    /(طالب جديد|طالبه جديده|اضف طالب|أضف طالب|انشاء طالب|انشئ طالب|أنشئ طالب)/.test(
      text
    )
  ) {
    const grade = extractGrade(originalCommand);
    const possibleName = extractStudentNameForCreation(originalCommand);

    if (possibleName && possibleName.length >= 3) {
      return [
        {
          type: 'create_student',
          payload: {
            name: possibleName,
            grade
          }
        }
      ];
    }

    return [
      {
        type: 'ask_student_name',
        payload: {
          grade
        }
      }
    ];
  }

  const matchedStudent = findBestStudent(originalCommand, context.students, context.memory);

  if (matchedStudent.ambiguous) {
    const names = matchedStudent.matches
      .slice(0, 3)
      .map((student) => student.name)
      .join('، ');

    return [
      {
        type: 'feedback',
        payload: {
          message: `وجدت أكثر من طالب: ${names}. يرجى ذكر الاسم الكامل`,
          feedbackType: 'error',
          speak: 'وجدت أكثر من طالب. يرجى ذكر الاسم الكامل'
        }
      }
    ];
  }

  if (matchedStudent.student) {
    const student = matchedStudent.student;
    const shortName = student.name.split(/\s+/)[0];
    const amount = extractAmount(text);

    const isAbsent = /(غايب|غائب|غياب|غاب|مريض|سجل غياب)/.test(text);

const isPresent = /(حاضر|حضر|موجود|سجل حضور|تحضير)/.test(text);

const isLate = /(متاخر|متأخر|تاخير|تأخير|سجل تاخير|سجل تأخير|تاخر|تأخر)/.test(text);

const isTruant = /(هروب|هارب|متسرب|تسرب|خروج|خرج من الحصه|خرج من الحصة)/.test(text);

const isNegative =
  !isLate &&
  !isTruant &&
  /(خصم|ناقص|ازعاج|مزعج|نايم|نام|خطا|غلط|سيء|نقص|اسحب)/.test(text);
        text
      );
    const isPositive =
      !isNegative &&
      /(نجم|نقط|درج|ممتاز|بطل|مشارك|صح|شاطر|كفو|عظيم|مبدع|زيد|اعط|ضيف)/.test(
        text
      );

    if (isAbsent) {
      return [
        {
          type: 'mark_absent',
          payload: {
            studentId: student.id,
            studentName: shortName
          }
        }
      ];
    }

    if (isPresent) {
      return [
        {
          type: 'mark_present',
          payload: {
            studentId: student.id,
            studentName: shortName
          }
        }
      ];
    }

    if (isNegative) {
      return [
        {
          type: 'deduct_points',
          payload: {
            studentId: student.id,
            studentName: shortName,
            amount
          }
        }
      ];
    }

    if (isPositive) {
      return [
        {
          type: 'add_points',
          payload: {
            studentId: student.id,
            studentName: shortName,
            amount
          }
        }
      ];
    }
  }

  const route = getTargetRoute(originalCommand);

  if (route) {
    return [
      {
        type: 'navigate',
        payload: {
          route
        }
      }
    ];
  }

  return [
    {
      type: 'dom_click',
      payload: {
        command: originalCommand
      }
    }
  ];
};

export const planCommand = (
  command: string,
  context: PlannerContext
): VoiceTask[] => {
  const parts = splitCompoundCommands(command);
  const tasks: VoiceTask[] = [];

  for (const part of parts) {
    tasks.push(...planSingleCommand(part, context));
  }

  return tasks.length
    ? tasks
    : [
        {
          type: 'unknown',
          payload: {
            text: command
          }
        }
      ];
};
