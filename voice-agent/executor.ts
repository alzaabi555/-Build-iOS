import type { Dispatch, SetStateAction } from 'react';
import { Student } from '../types';
import { VoiceTask, FeedbackType } from './types';
import { VoiceAgentMemory } from './memory';
import { scanAndClick, writeToField } from './domIndexer';

interface ExecutorContext {
  students: Student[];
  setStudents: Dispatch<SetStateAction<Student[]>>;
  currentSemester: string;
  onNavigate?: (tab: string) => void;
  saveSnapshot: () => void;
  createId: () => string;
  memory: VoiceAgentMemory;
  displayFeedback: (message: string, type: FeedbackType) => void;
  speak: (message: string) => void;
}

const todayKey = () => new Date().toLocaleDateString('en-CA');

const normalizeDateKey = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? String(date || '') : parsed.toLocaleDateString('en-CA');
};

const normalizeIdentity = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');

const isEnglishUi = () => {
  if (typeof document !== 'undefined' && document.documentElement.lang?.toLowerCase().startsWith('en')) return true;
  if (typeof localStorage !== 'undefined') return localStorage.getItem('teacher_appLanguage') === 'en';
  return false;
};

const text = (ar: string, en: string) => (isEnglishUi() ? en : ar);

const ROUTE_LABELS: Record<string, [string, string]> = {
  dashboard: ['الصفحة الرئيسية', 'Dashboard'],
  students: ['صفحة الطلاب', 'Students'],
  attendance: ['صفحة الحضور', 'Attendance'],
  groups: ['إدارة المجموعات', 'Groups'],
  mailbox: ['مركز المراسلات', 'Mailbox'],
  grades: ['سجل الدرجات', 'Gradebook'],
  tasks: ['صفحة المهام', 'Tasks'],
  library: ['المكتبة', 'Library'],
  game_questions: ['بنك أسئلة الألعاب', 'Game question bank'],
  game_results: ['نتائج الألعاب', 'Game results'],
  reports: ['مركز التقارير', 'Reports'],
  leaderboard: ['لوحة الفرسان', 'Leaderboard'],
  sync: ['مركز المزامنة', 'Sync center'],
  guide: ['دليل الاستخدام', 'User guide'],
  settings: ['الإعدادات', 'Settings'],
  about: ['حول التطبيق', 'About'],
  senior_dashboard: ['لوحة المعلم الأول', 'Senior teacher dashboard']
};

const hasStudent = (students: Student[], studentId: string) =>
  students.some(student => student.id === studentId);

export const executeTask = (task: VoiceTask, context: ExecutorContext): boolean => {
  const {
    students,
    setStudents,
    currentSemester,
    onNavigate,
    saveSnapshot,
    createId,
    memory,
    displayFeedback,
    speak
  } = context;

  const updateAttendanceForToday = (
    studentId: string,
    status: 'present' | 'absent' | 'late' | 'truant'
  ) => {
    const today = todayKey();
    let updated = false;

    setStudents(previousStudents =>
      previousStudents.map(student => {
        if (student.id !== studentId) return student;
        updated = true;
        const filteredAttendance = (Array.isArray(student.attendance) ? student.attendance : [])
          .filter(record => normalizeDateKey(record.date) !== today);
        return {
          ...student,
          attendance: [...filteredAttendance, { date: today, status }]
        };
      })
    );

    return updated;
  };

  switch (task.type) {
    case 'feedback':
      displayFeedback(task.payload.message, task.payload.feedbackType);
      if (task.payload.speak) speak(task.payload.speak);
      return true;

    case 'undo':
      return false;

    case 'ask_student_name':
      memory.setPendingCreateStudent(task.payload.grade);
      displayFeedback(text('ما اسم الطالب؟', 'What is the student name?'), 'info');
      speak(text('ما اسم الطالب؟', 'What is the student name?'));
      return true;

    case 'create_student': {
      const cleanName = String(task.payload.name || '').trim().replace(/\s+/g, ' ');
      const cleanGrade = String(task.payload.grade || '').trim() || text('بدون فصل', 'No class');

      if (!cleanName) {
        displayFeedback(text('لم أتعرف على اسم الطالب', 'Student name was not recognized'), 'error');
        return false;
      }

      const duplicate = students.find(student =>
        normalizeIdentity(student.name) === normalizeIdentity(cleanName) &&
        normalizeIdentity(String(student.classes?.[0] || student.grade || '')) === normalizeIdentity(cleanGrade)
      );

      if (duplicate) {
        displayFeedback(
          text(
            `الطالب ${duplicate.name || cleanName} موجود مسبقًا في الفصل نفسه`,
            `${duplicate.name || cleanName} already exists in the same class`
          ),
          'error'
        );
        return false;
      }

      saveSnapshot();
      const newStudent: Student = {
        id: createId(),
        name: cleanName,
        grade: cleanGrade,
        classes: [cleanGrade],
        attendance: [],
        behaviors: [],
        grades: []
      };
      setStudents(previousStudents => [...previousStudents, newStudent]);
      memory.rememberStudent(newStudent.id, newStudent.name);

      displayFeedback(text(`تم إنشاء الطالب: ${cleanName}`, `Student created: ${cleanName}`), 'success');
      speak(text(`تم إنشاء ${cleanName.split(' ')[0]}`, `${cleanName.split(' ')[0]} was created`));
      return true;
    }

    case 'add_points':
    case 'deduct_points': {
      const amount = Math.max(1, Math.abs(Number(task.payload.amount) || 1));
      const isDeduction = task.type === 'deduct_points';

      if (!hasStudent(students, task.payload.studentId)) {
        displayFeedback(text('لم يتم العثور على الطالب', 'Student was not found'), 'error');
        return false;
      }

      saveSnapshot();
      setStudents(previousStudents =>
        previousStudents.map(student =>
          student.id === task.payload.studentId
            ? {
                ...student,
                behaviors: [
                  ...(Array.isArray(student.behaviors) ? student.behaviors : []),
                  {
                    id: createId(),
                    date: new Date().toISOString(),
                    type: isDeduction ? 'negative' : 'positive',
                    description: isDeduction
                      ? text('خصم ذكي صوتيًا', 'Voice smart deduction')
                      : text('إضافة ذكية صوتيًا', 'Voice smart award'),
                    points: isDeduction ? -amount : amount,
                    semester: currentSemester as '1' | '2'
                  }
                ]
              }
            : student
        )
      );

      memory.rememberStudent(task.payload.studentId, task.payload.studentName);
      displayFeedback(
        isDeduction
          ? text(`تم خصم ${amount} من ${task.payload.studentName}`, `${amount} points deducted from ${task.payload.studentName}`)
          : text(`تمت إضافة ${amount} نقاط لـ ${task.payload.studentName}`, `${amount} points added to ${task.payload.studentName}`),
        'success'
      );
      return true;
    }

    case 'mark_absent':
    case 'mark_present':
    case 'mark_late':
    case 'mark_truant': {
      const statusMap = {
        mark_absent: ['absent', 'تم تسجيل غياب', 'Marked absent'],
        mark_present: ['present', 'تم تسجيل حضور', 'Marked present'],
        mark_late: ['late', 'تم تسجيل تأخر', 'Marked late'],
        mark_truant: ['truant', 'تم تسجيل هروب/تسرب', 'Marked truant']
      } as const;
      const [status, ar, en] = statusMap[task.type];
      if (!hasStudent(students, task.payload.studentId)) {
        displayFeedback(text('لم يتم العثور على الطالب', 'Student was not found'), 'error');
        return false;
      }

      saveSnapshot();
      updateAttendanceForToday(task.payload.studentId, status);
      memory.rememberStudent(task.payload.studentId, task.payload.studentName);
      displayFeedback(`${text(ar, en)}: ${task.payload.studentName}`, 'success');
      speak(text(ar, en));
      return true;
    }

    case 'navigate': {
      if (!onNavigate) {
        displayFeedback(text('لا توجد دالة تنقل متاحة', 'Navigation is unavailable'), 'error');
        return false;
      }
      onNavigate(task.payload.route);
      memory.setContext(task.payload.route);
      const label = ROUTE_LABELS[task.payload.route];
      displayFeedback(
        label
          ? text(`تم فتح ${label[0]}`, `${label[1]} opened`)
          : text('جاري الانتقال...', 'Opening...'),
        'success'
      );
      return true;
    }

    case 'write_field': {
      const success =
        writeToField(task.payload.fieldKeyword, task.payload.value) ||
        writeToField('بحث', task.payload.value) ||
        writeToField('بحث الحضور', task.payload.value) ||
        writeToField('search', task.payload.value) ||
        writeToField('name', task.payload.value) ||
        writeToField('اسم', task.payload.value);

      displayFeedback(
        success
          ? text(`تمت كتابة: ${task.payload.value}`, `Entered: ${task.payload.value}`)
          : text('لم أجد حقل كتابة مناسب', 'No suitable input field was found'),
        success ? 'success' : 'error'
      );
      return success;
    }

    case 'dom_click': {
      const command = String(task.payload.command || '');
      const dangerous = /(حذف الكل|إعاده ضبط المصنع|اعاده ضبط المصنع|استعاده النسخه|استرجاع النسخه|delete all|factory reset|restore backup)/i.test(command);
      if (dangerous) {
        displayFeedback(
          text('لن أنفذ هذا الإجراء الحساس صوتيًا. افتح الصفحة وأكّد الإجراء يدويًا.', 'This sensitive action will not be executed by voice. Open the page and confirm it manually.'),
          'error'
        );
        return false;
      }

      const success = scanAndClick(command);
      displayFeedback(
        success
          ? text('تم تنفيذ الإجراء', 'Action completed')
          : text('لم أجد زرًا مناسبًا لهذا الأمر', 'No matching button was found'),
        success ? 'success' : 'error'
      );
      return success;
    }

    case 'unknown':
    default:
      displayFeedback(
        text(`عفوًا، لم أفهم: "${task.payload.text}"`, `Sorry, I did not understand: "${task.payload.text}"`),
        'error'
      );
      return false;
  }
};
