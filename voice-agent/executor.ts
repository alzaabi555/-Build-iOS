import type { Dispatch, SetStateAction } from 'react';
import { Student } from '../types';
import { VoiceTask, FeedbackType } from './types';
import { VoiceAgentMemory } from './memory';
import { scanAndClick, writeToField } from './domIndexer';

interface ExecutorContext {
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
  return new Date(date).toLocaleDateString('en-CA');
};

export const executeTask = (task: VoiceTask, context: ExecutorContext): boolean => {
  const {
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

    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;

        const filteredAttendance = (student.attendance || []).filter(
          (record) => normalizeDateKey(record.date) !== today
        );

        return {
          ...student,
          attendance: [
            ...filteredAttendance,
            {
              date: today,
              status
            }
          ]
        };
      })
    );
  };

  switch (task.type) {
    case 'feedback': {
      displayFeedback(task.payload.message, task.payload.feedbackType);

      if (task.payload.speak) {
        speak(task.payload.speak);
      }

      return true;
    }

    case 'undo': {
      return false;
    }

    case 'ask_student_name': {
      memory.setPendingCreateStudent(task.payload.grade);
      displayFeedback('ما اسم الطالب؟', 'info');
      speak('ما اسم الطالب؟');
      return true;
    }

    case 'create_student': {
      const cleanName = task.payload.name.trim();

      if (!cleanName) {
        displayFeedback('لم أتعرف على اسم الطالب', 'error');
        speak('لم أتعرف على اسم الطالب');
        return false;
      }

      saveSnapshot();

      const newStudent: Student = {
        id: createId(),
        name: cleanName,
        grade: task.payload.grade,
        classes: [task.payload.grade],
        attendance: [],
        behaviors: [],
        grades: []
      };

      setStudents((prev) => [...prev, newStudent]);
      memory.rememberStudent(newStudent.id, newStudent.name);

      displayFeedback(`تم إنشاء الطالب: ${cleanName}`, 'success');
      speak(`تم إنشاء ${cleanName.split(' ')[0]}`);
      return true;
    }

    case 'add_points': {
      saveSnapshot();

      setStudents((prev) =>
        prev.map((student) =>
          student.id === task.payload.studentId
            ? {
                ...student,
                behaviors: [
                  ...(student.behaviors || []),
                  {
                    id: createId(),
                    date: new Date().toISOString(),
                    type: 'positive',
                    description: 'إضافة ذكية صوتياً',
                    points: task.payload.amount,
                    semester: currentSemester
                  }
                ]
              }
            : student
        )
      );

      memory.rememberStudent(task.payload.studentId, task.payload.studentName);
      displayFeedback(
        `تمت إضافة ${task.payload.amount} نقاط لـ ${task.payload.studentName}`,
        'success'
      );
      speak(`تمت إضافة ${task.payload.amount}`);
      return true;
    }

    case 'deduct_points': {
      saveSnapshot();

      setStudents((prev) =>
        prev.map((student) =>
          student.id === task.payload.studentId
            ? {
                ...student,
                behaviors: [
                  ...(student.behaviors || []),
                  {
                    id: createId(),
                    date: new Date().toISOString(),
                    type: 'negative',
                    description: 'خصم ذكي صوتياً',
                    points: -Math.abs(task.payload.amount),
                    semester: currentSemester
                  }
                ]
              }
            : student
        )
      );

      memory.rememberStudent(task.payload.studentId, task.payload.studentName);
      displayFeedback(
        `تم خصم ${task.payload.amount} من ${task.payload.studentName}`,
        'success'
      );
      speak('تم الخصم');
      return true;
    }

    case 'mark_absent': {
      saveSnapshot();

      updateAttendanceForToday(task.payload.studentId, 'absent');

      memory.rememberStudent(task.payload.studentId, task.payload.studentName);
      displayFeedback(`تم تسجيل غياب: ${task.payload.studentName}`, 'success');
      speak('تم تسجيل الغياب');
      return true;
    }

    case 'mark_present': {
      saveSnapshot();

      updateAttendanceForToday(task.payload.studentId, 'present');

      memory.rememberStudent(task.payload.studentId, task.payload.studentName);
      displayFeedback(`تم تسجيل حضور: ${task.payload.studentName}`, 'success');
      speak('تم تسجيل الحضور');
      return true;
    }

    case 'mark_late': {
      saveSnapshot();

      updateAttendanceForToday(task.payload.studentId, 'late');

      memory.rememberStudent(task.payload.studentId, task.payload.studentName);
      displayFeedback(`تم تسجيل تأخر: ${task.payload.studentName}`, 'success');
      speak('تم تسجيل التأخر');
      return true;
    }

    case 'mark_truant': {
      saveSnapshot();

      updateAttendanceForToday(task.payload.studentId, 'truant');

      memory.rememberStudent(task.payload.studentId, task.payload.studentName);
      displayFeedback(`تم تسجيل هروب/تسرب: ${task.payload.studentName}`, 'success');
      speak('تم تسجيل الحالة');
      return true;
    }

    case 'navigate': {
      if (!onNavigate) {
        displayFeedback('لا توجد دالة تنقل متاحة', 'error');
        return false;
      }

      onNavigate(task.payload.route);
      memory.setContext(task.payload.route);
      displayFeedback('جاري الانتقال...', 'success');
      return true;
    }

    case 'write_field': {
      const success =
        writeToField(task.payload.fieldKeyword, task.payload.value) ||
        writeToField('بحث', task.payload.value) ||
        writeToField('بحث الحضور', task.payload.value) ||
        writeToField('search', task.payload.value) ||
        writeToField('اسم', task.payload.value);

      if (success) {
        displayFeedback(`تمت كتابة: ${task.payload.value}`, 'success');
        return true;
      }

      displayFeedback('لم أجد حقل كتابة مناسب', 'error');
      return false;
    }

    case 'dom_click': {
      const success = scanAndClick(task.payload.command);

      if (success) {
        displayFeedback('تم تنفيذ الإجراء', 'success');
        return true;
      }

      displayFeedback('لم أجد زرًا مناسبًا لهذا الأمر', 'error');
      return false;
    }

    case 'unknown':
    default: {
      displayFeedback(`عفواً، لم أفهم: "${task.payload.text}"`, 'error');
      return false;
    }
  }
};
