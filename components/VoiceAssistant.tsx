import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, Bot } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';

interface VoiceAssistantProps {
  onNavigate?: (tab: string) => void;
}

const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

type FeedbackType = 'info' | 'success' | 'error' | null;

type VoiceTask =
  | {
      type: 'add_points';
      payload: {
        studentId: string;
        studentName: string;
        amount: number;
      };
    }
  | {
      type: 'deduct_points';
      payload: {
        studentId: string;
        studentName: string;
        amount: number;
      };
    }
  | {
      type: 'mark_absent';
      payload: {
        studentId: string;
        studentName: string;
      };
    }
  | {
      type: 'mark_present';
      payload: {
        studentId: string;
        studentName: string;
      };
    }
  | {
      type: 'navigate';
      payload: {
        route: string;
      };
    }
  | {
      type: 'write_field';
      payload: {
        fieldKeyword: string;
        value: string;
      };
    }
  | {
      type: 'create_student';
      payload: {
        name: string;
        grade: string;
      };
    }
  | {
      type: 'ask_student_name';
      payload: {
        grade: string;
      };
    }
  | {
      type: 'dom_click';
      payload: {
        command: string;
        requiresConfirmation?: boolean;
      };
    }
  | {
      type: 'undo';
    }
  | {
      type: 'unknown';
      payload: {
        text: string;
      };
    };

interface DomIndexItem {
  element: HTMLElement;
  tag: string;
  role: string;
  text: string;
  placeholder: string;
  ariaLabel: string;
  name: string;
  id: string;
  value: string;
  scoreText: string;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onNavigate }) => {
  const { dir, students, setStudents, currentSemester } = useApp();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: FeedbackType }>({
    message: '',
    type: null
  });

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const studentsRef = useRef(students);
  const navigateRef = useRef(onNavigate);

  const historyRef = useRef<Student[][]>([]);

  const lastProcessedRef = useRef({
    text: '',
    time: 0
  });

  const pendingConfirmationRef = useRef<{
    message: string;
    tasks: VoiceTask[];
  } | null>(null);

  const agentMemoryRef = useRef<{
    pendingIntent: 'create_student' | null;
    pendingGrade: string | null;
    lastCommand: string;
    lastStudentId: string | null;
    lastStudentName: string | null;
    currentContext: string;
  }>({
    pendingIntent: null,
    pendingGrade: null,
    lastCommand: '',
    lastStudentId: null,
    lastStudentName: null,
    currentContext: ''
  });

  const isElectron =
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('electron');

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    navigateRef.current = onNavigate;
  }, [onNavigate]);

  const speak = useCallback(
    (text: string) => {
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        !isElectron
      ) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        utterance.rate = 1.08;

        window.speechSynthesis.speak(utterance);
      }
    },
    [isElectron]
  );

  const displayFeedback = useCallback(
    (msg: string, type: FeedbackType) => {
      setFeedback({ message: msg, type });

      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }

      feedbackTimerRef.current = setTimeout(() => {
        if (shouldListenRef.current) {
          setFeedback({ message: 'الوكيل الذكي يستمع...', type: 'info' });
        } else {
          setFeedback({ message: '', type: null });
        }
      }, 4000);
    },
    []
  );

  const saveSnapshot = useCallback(() => {
    historyRef.current.push(JSON.parse(JSON.stringify(studentsRef.current)));

    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    }
  }, []);

  const undoLastAction = useCallback(() => {
    const previous = historyRef.current.pop();

    if (!previous) {
      displayFeedback('لا توجد عملية للتراجع', 'error');
      speak('لا يوجد شيء للتراجع عنه');
      return;
    }

    setStudents(previous);
    displayFeedback('تم التراجع بنجاح', 'success');
    speak('تم التراجع');
  }, [displayFeedback, setStudents, speak]);

  const createId = useCallback(() => {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, []);

  const normalizeWord = useCallback((word: string) => {
    return word
      .replace(/[\u064B-\u065F\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '')
      .toLowerCase()
      .trim()
      .replace(/^(ال|ل|ب|ك|ف)/, '');
  }, []);

  const normalizeText = useCallback(
    (text: string) => {
      return text
        .split(/\s+/)
        .map(normalizeWord)
        .filter(Boolean)
        .join(' ');
    },
    [normalizeWord]
  );

  const extractAmount = useCallback((text: string): number => {
    const normalized = normalizeText(text);
    const numericMatch = normalized.match(/\b([0-9]{1,2})\b/);

    if (numericMatch) {
      const value = Number(numericMatch[1]);
      if (!Number.isNaN(value) && value > 0) return value;
    }

    const amountPatterns: Array<[RegExp, number]> = [
      [/(نقطتين|درجتين|نجمتين|علامتين|اثنين|مرتين)/, 2],
      [/(ثلاث|ثلاثه)/, 3],
      [/(اربع|اربعه)/, 4],
      [/(خمس|خمسه)/, 5],
      [/(ست|سته)/, 6],
      [/(سبع|سبعه)/, 7],
      [/(ثمان|ثمانيه)/, 8],
      [/(تسع|تسعه)/, 9],
      [/(عشر|عشره)/, 10]
    ];

    for (const [pattern, amount] of amountPatterns) {
      if (pattern.test(normalized)) return amount;
    }

    return 1;
  }, [normalizeText]);

  const splitCompoundCommands = useCallback((command: string) => {
    return command
      .split(
        /\n+|\s+ثم\s+|\s+بعد ذلك\s+|\s+وبعدين\s+|(?<=\S)\s+و(?=(سجل|اضف|أضف|اعط|أعط|خصم|افتح|انتقل|ابحث|اكتب|غيب|غيّب|حضر|انشئ|أنشئ|اعمل))/
      )
      .map((part) => part.trim())
      .filter(Boolean);
  }, []);

  const rememberStudent = useCallback((student: Student) => {
    agentMemoryRef.current.lastStudentId = student.id;
    agentMemoryRef.current.lastStudentName = student.name;
  }, []);

  const findBestStudent = useCallback(
    (commandText: string) => {
      const text = normalizeText(commandText);
      const candidates = studentsRef.current
        .map((student) => {
          const nameWords = student.name
            .split(/\s+/)
            .map(normalizeWord)
            .filter((word) => word.length >= 2);

          let score = 0;

          for (const word of nameWords) {
            if (text.includes(word)) {
              score += word.length;
            }
          }

          const fullName = normalizeText(student.name);
          if (text.includes(fullName)) {
            score += 20;
          }

          return {
            student,
            score
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      if (candidates.length === 0) {
        const lastStudentId = agentMemoryRef.current.lastStudentId;
        const pronounRef =
          /(له|لها|عليه|عليها|منه|منها|هذا الطالب|هذه الطالبه|نفس الطالب)/.test(
            text
          );

        if (pronounRef && lastStudentId) {
          const lastStudent = studentsRef.current.find((s) => s.id === lastStudentId);
          if (lastStudent) {
            return {
              student: lastStudent,
              ambiguous: false,
              matches: [lastStudent]
            };
          }
        }

        return {
          student: undefined,
          ambiguous: false,
          matches: []
        };
      }

      const topScore = candidates[0].score;
      const topMatches = candidates.filter((item) => item.score === topScore);

      return {
        student: topMatches.length === 1 ? topMatches[0].student : undefined,
        ambiguous: topMatches.length > 1,
        matches: topMatches.map((item) => item.student)
      };
    },
    [normalizeText, normalizeWord]
  );

  const getTargetRoute = useCallback((commandText: string): string | null => {
    const text = normalizeText(commandText);

    if (/(رئيسي|داشبورد|لوحه|شاشه رئيسي)/.test(text)) return 'dashboard';
    if (/(تقرير|تقارير|احصائيات|نتايج|نتائج)/.test(text)) return 'reports';
    if (/(درجات|درجه|رصد|سجل الدرجات)/.test(text)) return 'grades';
    if (/(حضور|غياب|سجل الغياب|تحضير)/.test(text)) return 'attendance';
    if (/(طلاب|طلبه|قائمه الطلاب|وارد)/.test(text)) return 'students';
    if (/(فرسان|شرف|اوائل|متصدرين)/.test(text)) return 'leaderboard';
    if (/(اعدادات|ضبط)/.test(text)) return 'settings';

    return null;
  }, [normalizeText]);

  const extractGrade = useCallback(
    (commandText: string) => {
      const text = normalizeText(commandText);

      const gradeMatch =
        text.match(/(?:في|الى|لفصل|فصل|صف)\s+([\u0600-\u06FFa-zA-Z0-9\s]+)$/) ||
        text.match(/(?:الفصل|الصف)\s+([\u0600-\u06FFa-zA-Z0-9\s]+)/);

      return gradeMatch?.[1]?.trim() || 'بدون فصل';
    },
    [normalizeText]
  );

  const extractStudentNameForCreation = useCallback((commandText: string) => {
    const cleaned = commandText
      .replace(/(أنشئ|انشئ|اضف|أضف|طالب|طالبة|جديد|جديدة)/g, '')
      .replace(/(باسم|اسمه|اسمها|اسم الطالب|اسم الطالبة)/g, '')
      .replace(/في فصل.*$/g, '')
      .replace(/في الصف.*$/g, '')
      .replace(/في الفصل.*$/g, '')
      .trim();

    return cleaned;
  }, []);

  const buildDomIndex = useCallback((): DomIndexItem[] => {
    if (typeof document === 'undefined') return [];

    const selector = [
      'button',
      'a',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="dialog"]',
      'dialog'
    ].join(',');

    return Array.from(document.querySelectorAll(selector))
      .filter((element) => {
        const htmlElement = element as HTMLElement;
        const style = window.getComputedStyle(htmlElement);

        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          htmlElement.getAttribute('aria-hidden') !== 'true'
        );
      })
      .map((element) => {
        const htmlElement = element as HTMLElement;
        const inputElement = element as HTMLInputElement;

        const item: DomIndexItem = {
          element: htmlElement,
          tag: htmlElement.tagName.toLowerCase(),
          role: htmlElement.getAttribute('role') || '',
          text: normalizeText(htmlElement.textContent || ''),
          placeholder: normalizeText(inputElement.placeholder || ''),
          ariaLabel: normalizeText(htmlElement.getAttribute('aria-label') || ''),
          name: normalizeText(inputElement.name || ''),
          id: normalizeText(htmlElement.id || ''),
          value: normalizeText(inputElement.value || ''),
          scoreText: ''
        };

        item.scoreText = [
          item.text,
          item.placeholder,
          item.ariaLabel,
          item.name,
          item.id,
          item.value,
          item.role,
          item.tag
        ]
          .filter(Boolean)
          .join(' ');

        return item;
      });
  }, [normalizeText]);

  const findInputByMeaning = useCallback(
    (keyword: string): HTMLInputElement | HTMLTextAreaElement | undefined => {
      const normalizedKeyword = normalizeText(keyword);
      const domIndex = buildDomIndex();

      const candidates = domIndex
        .filter((item) => item.tag === 'input' || item.tag === 'textarea')
        .map((item) => {
          let score = 0;

          if (item.placeholder.includes(normalizedKeyword)) score += 6;
          if (item.ariaLabel.includes(normalizedKeyword)) score += 6;
          if (item.name.includes(normalizedKeyword)) score += 4;
          if (item.id.includes(normalizedKeyword)) score += 4;
          if (item.scoreText.includes(normalizedKeyword)) score += 2;

          return {
            element: item.element as HTMLInputElement | HTMLTextAreaElement,
            score
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      return candidates[0]?.element;
    },
    [buildDomIndex, normalizeText]
  );

  const writeToField = useCallback(
    (fieldKeyword: string, value: string) => {
      const input = findInputByMeaning(fieldKeyword);

      if (!input) return false;

      input.focus();

      const prototype =
        input instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;

      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      nativeSetter?.call(input, value);

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      return true;
    },
    [findInputByMeaning]
  );

  const scanAndClick = useCallback(
    (commandText: string): boolean => {
      const text = normalizeText(commandText);
      const domIndex = buildDomIndex();

      const candidates = domIndex
        .filter((item) =>
          ['button', 'a'].includes(item.tag) ||
          ['button', 'tab', 'menuitem'].includes(item.role)
        )
        .map((item) => {
          let score = 0;

          const tokens = text.split(/\s+/).filter((token) => token.length >= 2);

          for (const token of tokens) {
            if (item.scoreText.includes(token)) {
              score += token.length;
            }
          }

          if (item.text && text.includes(item.text)) score += 20;
          if (item.ariaLabel && text.includes(item.ariaLabel)) score += 15;

          return {
            ...item,
            score
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      const bestMatch = candidates[0];

      if (!bestMatch) return false;

      bestMatch.element.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.5)';

      setTimeout(() => {
        bestMatch.element.style.boxShadow = '';
      }, 300);

      bestMatch.element.click();
      return true;
    },
    [buildDomIndex, normalizeText]
  );

  const createStudentVoice = useCallback(
    (name: string, grade: string) => {
      const cleanName = name.trim();

      if (!cleanName) {
        displayFeedback('لم أتعرف على اسم الطالب', 'error');
        speak('لم أتعرف على اسم الطالب');
        return false;
      }

      saveSnapshot();

      const newStudent: Student = {
        id: createId(),
        name: cleanName,
        grade,
        classes: [grade],
        attendance: [],
        behaviors: [],
        grades: []
      };

      setStudents((prev) => [...prev, newStudent]);

      agentMemoryRef.current.lastStudentId = newStudent.id;
      agentMemoryRef.current.lastStudentName = newStudent.name;

      displayFeedback(`تم إنشاء الطالب: ${cleanName}`, 'success');
      speak(`تم إنشاء ${cleanName.split(' ')[0]}`);

      return true;
    },
    [createId, displayFeedback, saveSnapshot, setStudents, speak]
  );

  const executeTask = useCallback(
    (task: VoiceTask): boolean => {
      switch (task.type) {
        case 'undo': {
          undoLastAction();
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

          displayFeedback(
            `تم خصم ${task.payload.amount} من ${task.payload.studentName}`,
            'success'
          );
          speak(`تم الخصم`);
          return true;
        }

        case 'mark_absent': {
          saveSnapshot();

          setStudents((prev) =>
            prev.map((student) =>
              student.id === task.payload.studentId
                ? {
                    ...student,
                    attendance: [
                      ...(student.attendance || []),
                      {
                        date: new Date().toISOString(),
                        status: 'absent'
                      }
                    ]
                  }
                : student
            )
          );

          displayFeedback(`تم تسجيل غياب: ${task.payload.studentName}`, 'success');
          speak('تم تسجيل الغياب');
          return true;
        }

        case 'mark_present': {
          saveSnapshot();

          setStudents((prev) =>
            prev.map((student) =>
              student.id === task.payload.studentId
                ? {
                    ...student,
                    attendance: [
                      ...(student.attendance || []),
                      {
                        date: new Date().toISOString(),
                        status: 'present'
                      }
                    ]
                  }
                : student
            )
          );

          displayFeedback(`تم تسجيل حضور: ${task.payload.studentName}`, 'success');
          speak('تم تسجيل الحضور');
          return true;
        }

        case 'navigate': {
          if (!navigateRef.current) {
            displayFeedback('لا توجد دالة تنقل متاحة', 'error');
            return false;
          }

          navigateRef.current(task.payload.route);
          displayFeedback('جاري الانتقال...', 'success');
          return true;
        }

        case 'write_field': {
          const success =
            writeToField(task.payload.fieldKeyword, task.payload.value) ||
            writeToField('بحث', task.payload.value) ||
            writeToField('search', task.payload.value) ||
            writeToField('اسم', task.payload.value);

          if (success) {
            displayFeedback(`تمت كتابة: ${task.payload.value}`, 'success');
            return true;
          }

          displayFeedback('لم أجد حقل كتابة مناسب', 'error');
          return false;
        }

        case 'create_student': {
          return createStudentVoice(task.payload.name, task.payload.grade);
        }

        case 'ask_student_name': {
          agentMemoryRef.current.pendingIntent = 'create_student';
          agentMemoryRef.current.pendingGrade = task.payload.grade;

          displayFeedback('ما اسم الطالب؟', 'info');
          speak('ما اسم الطالب؟');
          return true;
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
    },
    [
      createId,
      createStudentVoice,
      currentSemester,
      displayFeedback,
      saveSnapshot,
      scanAndClick,
      setStudents,
      speak,
      undoLastAction,
      writeToField
    ]
  );

  const requiresConfirmation = useCallback((tasks: VoiceTask[]) => {
    return tasks.some((task) => {
      if (task.type === 'deduct_points' && task.payload.amount >= 5) return true;

      if (
        task.type === 'dom_click' &&
        /(حذف|امسح|ازاله|إزالة|مسح|صفر|تصفير)/.test(
          normalizeText(task.payload.command)
        )
      ) {
        return true;
      }

      return false;
    });
  }, [normalizeText]);

  const executePlannedTasks = useCallback(
    (tasks: VoiceTask[]) => {
      if (!tasks.length) return;

      if (requiresConfirmation(tasks)) {
        pendingConfirmationRef.current = {
          message: 'هذا إجراء حساس. هل تؤكد التنفيذ؟',
          tasks
        };

        displayFeedback('هذا إجراء حساس. قل: نعم للتأكيد أو لا للإلغاء', 'info');
        speak('هذا إجراء حساس. هل تؤكد التنفيذ؟');
        return;
      }

      for (const task of tasks) {
        executeTask(task);
      }
    },
    [displayFeedback, executeTask, requiresConfirmation, speak]
  );

  const planSingleCommand = useCallback(
    (originalCommand: string): VoiceTask[] => {
      const text = normalizeText(originalCommand);

      if (!text.trim()) return [];

      if (/(تراجع|ارجع|الغ اخر عمليه|الغي اخر عمليه|عفوا)/.test(text)) {
        return [{ type: 'undo' }];
      }

      if (/(اكتب|ابحث عن|بحث عن)/.test(text)) {
        const value = originalCommand
          .replace(/(اكتب|ابحث عن|بحث عن|في خانة|في خانه|في حقل|عن)/g, '')
          .trim();

        return [
          {
            type: 'write_field',
            payload: {
              fieldKeyword: 'بحث',
              value
            }
          }
        ];
      }

      if (/(طالب جديد|طالبه جديده|اضف طالب|أضف طالب|انشاء طالب|انشئ طالب|أنشئ طالب)/.test(text)) {
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

      const matchedStudent = findBestStudent(originalCommand);

      if (matchedStudent.ambiguous) {
        const names = matchedStudent.matches
          .slice(0, 3)
          .map((student) => student.name)
          .join('، ');

        displayFeedback(`وجدت أكثر من طالب: ${names}. يرجى ذكر الاسم الكامل`, 'error');
        speak('وجدت أكثر من طالب. يرجى ذكر الاسم الكامل');
        return [];
      }

      if (matchedStudent.student) {
        const student = matchedStudent.student;
        rememberStudent(student);

        const shortName = student.name.split(/\s+/)[0];
        const amount = extractAmount(text);

        const isAbsent = /(غايب|غائب|غياب|غاب|مريض|سجل غياب)/.test(text);
        const isPresent = /(حاضر|حضر|موجود|سجل حضور)/.test(text);
        const isNegative =
          /(خصم|ناقص|ازعاج|مزعج|نايم|نام|تاخير|متاخر|خطا|غلط|سيء|نقص|اسحب)/.test(
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
            command: originalCommand,
            requiresConfirmation: /(حذف|امسح|ازاله|إزالة|مسح|صفر|تصفير)/.test(text)
          }
        }
      ];
    },
    [
      displayFeedback,
      extractAmount,
      extractGrade,
      extractStudentNameForCreation,
      findBestStudent,
      getTargetRoute,
      normalizeText,
      rememberStudent,
      speak
    ]
  );

  const planCommand = useCallback(
    (command: string): VoiceTask[] => {
      const parts = splitCompoundCommands(command);
      const allTasks: VoiceTask[] = [];

      for (const part of parts) {
        const tasks = planSingleCommand(part);
        allTasks.push(...tasks);
      }

      return allTasks.length
        ? allTasks
        : [
            {
              type: 'unknown',
              payload: {
                text: command
              }
            }
          ];
    },
    [planSingleCommand, splitCompoundCommands]
  );

  const processCommand = useCallback(
    (command: string) => {
      const originalText = command.trim();

      if (!originalText) return;

      const normalized = normalizeText(originalText);
      const now = Date.now();

      if (
        normalized === lastProcessedRef.current.text &&
        now - lastProcessedRef.current.time < 2500
      ) {
        return;
      }

      lastProcessedRef.current = {
        text: normalized,
        time: now
      };

      agentMemoryRef.current.lastCommand = originalText;

      if (pendingConfirmationRef.current) {
        if (/(نعم|ايوا|ايوه|اكد|أكد|موافق|نفذ)/.test(normalized)) {
          const pending = pendingConfirmationRef.current;
          pendingConfirmationRef.current = null;

          for (const task of pending.tasks) {
            executeTask(task);
          }

          return;
        }

        if (/(لا|الغ|الغي|تراجع|وقف|إلغاء|الغاء)/.test(normalized)) {
          pendingConfirmationRef.current = null;
          displayFeedback('تم إلغاء الإجراء', 'info');
          speak('تم الإلغاء');
          return;
        }

        displayFeedback('قل نعم للتأكيد أو لا للإلغاء', 'info');
        return;
      }

      if (agentMemoryRef.current.pendingIntent === 'create_student') {
        const cleanName = originalText
          .replace(/^(اسمه|اسم الطالب|الطالب اسمه|اسمها|اسم الطالبة|الطالبة اسمها)\s*/g, '')
          .trim();

        createStudentVoice(
          cleanName,
          agentMemoryRef.current.pendingGrade || 'بدون فصل'
        );

        agentMemoryRef.current.pendingIntent = null;
        agentMemoryRef.current.pendingGrade = null;
        return;
      }

      const tasks = planCommand(originalText);
      executePlannedTasks(tasks);
    },
    [
      createStudentVoice,
      displayFeedback,
      executePlannedTasks,
      executeTask,
      normalizeText,
      planCommand,
      speak
    ]
  );

  useEffect(() => {
    if (!SpeechRecognitionCtor || isElectron) return;

    try {
      const recognition = new SpeechRecognitionCtor();

      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'ar-OM';

      recognition.onstart = () => {
        setIsListening(true);

        if (feedbackTimerRef.current) {
          clearTimeout(feedbackTimerRef.current);
        }

        setFeedback({
          message: 'الوكيل الذكي مستعد...',
          type: 'info'
        });
      };

      recognition.onresult = (event: any) => {
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript;
          }
        }

        finalText = finalText.trim();

        if (!finalText) return;

        setTranscript(finalText);
        processCommand(finalText);

        setTimeout(() => {
          setTranscript('');
        }, 2500);
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                recognition.start();
              } catch {
                // تجاهل خطأ إعادة التشغيل المتكرر
              }
            }
          }, 350);
        } else {
          setIsListening(false);
          displayFeedback('تم إيقاف الوكيل', null);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          shouldListenRef.current = false;
          setIsListening(false);
          displayFeedback('الرجاء السماح للتطبيق بالوصول للمايكروفون', 'error');
        }

        if (event.error === 'no-speech') {
          displayFeedback('لم أسمع أمراً واضحاً', 'info');
        }
      };

      recognitionRef.current = recognition;

      return () => {
        shouldListenRef.current = false;

        try {
          recognition.stop();
        } catch {
          // تجاهل خطأ الإيقاف
        }
      };
    } catch {
      displayFeedback('تعذر تشغيل التعرف الصوتي', 'error');
    }
  }, [displayFeedback, isElectron, processCommand]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    shouldListenRef.current = !shouldListenRef.current;

    if (shouldListenRef.current) {
      try {
        recognitionRef.current?.start();
      } catch {
        // قد يكون المحرك يعمل بالفعل
      }
    } else {
      try {
        recognitionRef.current?.stop();
      } catch {
        // تجاهل
      }
    }
  }, []);

  if (!SpeechRecognitionCtor || isElectron) return null;

  return (
    <div
      className={`fixed bottom-24 md:bottom-8 ${
        dir === 'rtl' ? 'left-6' : 'right-6'
      } z-[99999] flex flex-col items-${dir === 'rtl' ? 'start' : 'end'} pointer-events-none`}
      dir={dir}
    >
      {(isListening || transcript || feedback.message) && (
        <div className="mb-4 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl p-4 max-w-sm pointer-events-auto animate-in slide-in-from-bottom-2 fade-in shadow-indigo-500/10">
          <div className="flex items-center gap-2 mb-2">
            {isListening ? (
              <div className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[11px] font-bold animate-pulse tracking-wide">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                الوكيل الذكي نشط
              </div>
            ) : feedback.type === 'success' ? (
              <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                تم
              </div>
            ) : feedback.type === 'error' ? (
              <div className="flex items-center gap-1 text-rose-600 text-[11px] font-bold">
                <XCircle className="w-3.5 h-3.5" />
                تنبيه
              </div>
            ) : (
              <div className="flex items-center gap-1 text-slate-500 text-[11px] font-bold">
                <Bot className="w-3.5 h-3.5" />
                النظام
              </div>
            )}
          </div>

          <p className="text-sm font-bold text-slate-800 leading-relaxed min-h-[1.5rem]">
            {transcript || feedback.message}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={toggleListening}
        className={`pointer-events-auto flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 active:scale-90 ${
          isListening
            ? 'bg-indigo-600 text-white shadow-indigo-500/40 ring-4 ring-indigo-500/20'
            : 'bg-slate-800 text-white hover:bg-slate-700'
        }`}
        aria-label={isListening ? 'إيقاف الوكيل الصوتي' : 'تشغيل الوكيل الصوتي'}
      >
        {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
      </button>
    </div>
  );
};

export default VoiceAssistant;
