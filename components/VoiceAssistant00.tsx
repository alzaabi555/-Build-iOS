import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, Bot, AlertCircle, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import { VoiceTask, FeedbackType } from '../voice-agent/types';
import { VoiceAgentMemory } from '../voice-agent/memory';
import { normalizeText } from '../voice-agent/normalizer';
import { planCommand } from '../voice-agent/planner';
import { executeTask } from '../voice-agent/executor';
import { requiresConfirmation } from '../voice-agent/confirmationManager';

interface VoiceAssistantProps {
  onNavigate?: (tab: string) => void;
}

type SupportedLanguage = 'ar' | 'en';
type NavigationTarget =
  | 'dashboard'
  | 'students'
  | 'attendance'
  | 'groups'
  | 'mailbox'
  | 'grades'
  | 'tasks'
  | 'library'
  | 'game_questions'
  | 'game_results'
  | 'reports'
  | 'leaderboard'
  | 'sync'
  | 'guide'
  | 'settings'
  | 'about'
  | 'senior_dashboard';

interface NavigationCommand {
  id: string;
  target: NavigationTarget;
  phrases: Record<SupportedLanguage, string[]>;
  feedback: Record<SupportedLanguage, string>;
}

const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

const MAX_RESTART_ATTEMPTS = 5;
const CONFIRMATION_TIMEOUT_MS = 10000;

const UI_COPY = {
  ar: {
    lessonModeActive: 'وضع الحصة نشط... الوكيل يستمع',
    cannotContinue: 'تعذر استمرار الاستماع. أعد تشغيل الوكيل.',
    noUndo: 'لا توجد عملية للتراجع',
    undoDone: 'تم التراجع بنجاح',
    sensitiveAction: 'هذا إجراء حساس. هل تؤكد التنفيذ؟',
    confirmPrompt: 'هذا إجراء حساس. قل: نعم للتأكيد أو لا للإلغاء',
    confirmationExpired: 'انتهت مهلة التأكيد وتم إلغاء الإجراء',
    analyzing: 'جاري تحليل الأمر...',
    cancelled: 'تم إلغاء الإجراء',
    sayYesNo: 'قل نعم للتأكيد أو لا للإلغاء',
    stopped: 'تم إيقاف الوكيل',
    reactivating: 'إعادة تنشيط الاستماع...',
    allowMicrophone: 'الرجاء السماح للتطبيق بالوصول للمايكروفون',
    noClearSpeech: 'لم أسمع أمرًا واضحًا... ما زلت أستمع',
    restarting: 'إعادة تشغيل الاستماع...',
    recognitionFailed: 'تعذر تشغيل التعرف الصوتي',
    unsupported: 'التعرف الصوتي غير مدعوم في هذا المتصفح',
    activeBadge: 'وضع الحصة نشط',
    successBadge: 'تم',
    alertBadge: 'تنبيه',
    systemBadge: 'النظام',
    noteBadge: 'ملاحظة',
    stopAria: 'إيقاف وضع الحصة الصوتي',
    startAria: 'تشغيل وضع الحصة الصوتي',
    helpTitle: 'يمكنك قول: افتح الطلاب، اذهب إلى الحضور، افتح المجموعات، افتح الدرجات، افتح التقارير، افتح المزامنة، أو تراجع.',
    commandNotRecognized: 'لم أفهم الأمر. جرّب قول: افتح الطلاب أو اذهب إلى الحضور.',
    alreadyListening: 'الوكيل الصوتي يستمع الآن.',
    languageChanged: 'تم تحديث لغة التعرف الصوتي.'
  },
  en: {
    lessonModeActive: 'Class mode is active... the assistant is listening',
    cannotContinue: 'Listening could not continue. Restart the assistant.',
    noUndo: 'There is no action to undo',
    undoDone: 'The last action was undone successfully',
    sensitiveAction: 'This is a sensitive action. Do you confirm?',
    confirmPrompt: 'This is a sensitive action. Say yes to confirm or no to cancel',
    confirmationExpired: 'Confirmation timed out and the action was cancelled',
    analyzing: 'Analyzing command...',
    cancelled: 'Action cancelled',
    sayYesNo: 'Say yes to confirm or no to cancel',
    stopped: 'Voice assistant stopped',
    reactivating: 'Reactivating listening...',
    allowMicrophone: 'Please allow the app to access the microphone',
    noClearSpeech: 'No clear command was heard... still listening',
    restarting: 'Restarting listening...',
    recognitionFailed: 'Speech recognition could not be started',
    unsupported: 'Speech recognition is not supported in this browser',
    activeBadge: 'Class mode active',
    successBadge: 'Done',
    alertBadge: 'Alert',
    systemBadge: 'System',
    noteBadge: 'Note',
    stopAria: 'Stop voice class mode',
    startAria: 'Start voice class mode',
    helpTitle: 'Try saying: open students, go to attendance, open groups, open grades, open reports, open sync, or undo.',
    commandNotRecognized: 'Command not recognized. Try saying: open students or go to attendance.',
    alreadyListening: 'The voice assistant is listening now.',
    languageChanged: 'Speech recognition language has been updated.'
  }
} as const;

const NAVIGATION_COMMANDS: NavigationCommand[] = [
  {
    id: 'dashboard', target: 'dashboard',
    phrases: { ar: ['الرئيسية', 'لوحة القيادة', 'لوحة المعلومات', 'الصفحة الرئيسية', 'افتح الرئيسية', 'اذهب للرئيسية'], en: ['dashboard', 'home', 'home page', 'open dashboard', 'go to dashboard'] },
    feedback: { ar: 'تم فتح الصفحة الرئيسية', en: 'Dashboard opened' }
  },
  {
    id: 'students', target: 'students',
    phrases: { ar: ['الطلاب', 'ادارة الطلاب', 'إدارة الطلاب', 'قائمة الطلاب', 'افتح الطلاب', 'اذهب للطلاب'], en: ['students', 'student management', 'student list', 'open students', 'go to students'] },
    feedback: { ar: 'تم فتح صفحة الطلاب', en: 'Students page opened' }
  },
  {
    id: 'attendance', target: 'attendance',
    phrases: { ar: ['الحضور', 'الغياب', 'الحضور والغياب', 'سجل الغياب', 'افتح الحضور', 'ابدأ الحضور', 'تسجيل الحضور'], en: ['attendance', 'absence', 'attendance tracker', 'open attendance', 'take attendance', 'start attendance'] },
    feedback: { ar: 'تم فتح صفحة الحضور والغياب', en: 'Attendance page opened' }
  },
  {
    id: 'groups', target: 'groups',
    phrases: { ar: ['المجموعات', 'ادارة المجموعات', 'إدارة المجموعات', 'تقسيم الطلاب', 'افتح المجموعات'], en: ['groups', 'group management', 'student groups', 'open groups'] },
    feedback: { ar: 'تم فتح إدارة المجموعات', en: 'Group management opened' }
  },
  {
    id: 'mailbox', target: 'mailbox',
    phrases: { ar: ['المراسلات', 'البريد', 'الرسائل', 'الوارد', 'افتح المراسلات', 'رسائل اولياء الامور', 'رسائل أولياء الأمور'], en: ['mailbox', 'messages', 'inbox', 'open mailbox', 'parent messages'] },
    feedback: { ar: 'تم فتح مركز المراسلات', en: 'Messaging center opened' }
  },
  {
    id: 'grades', target: 'grades',
    phrases: { ar: ['الدرجات', 'سجل الدرجات', 'التعليم والتقييم', 'التقييم', 'افتح الدرجات'], en: ['grades', 'gradebook', 'learning and evaluation', 'assessment', 'open grades'] },
    feedback: { ar: 'تم فتح سجل الدرجات', en: 'Gradebook opened' }
  },
  {
    id: 'tasks', target: 'tasks',
    phrases: { ar: ['المهام', 'الواجبات', 'المهام والواجبات', 'افتح المهام'], en: ['tasks', 'assignments', 'homework', 'open tasks'] },
    feedback: { ar: 'تم فتح صفحة المهام', en: 'Tasks page opened' }
  },
  {
    id: 'library', target: 'library',
    phrases: { ar: ['المكتبة', 'المكتبة الرقمية', 'المصادر', 'افتح المكتبة'], en: ['library', 'digital library', 'resources', 'open library'] },
    feedback: { ar: 'تم فتح المكتبة', en: 'Library opened' }
  },
  {
    id: 'game_questions', target: 'game_questions',
    phrases: { ar: ['بنك الاسئلة', 'بنك الأسئلة', 'اسئلة الالعاب', 'أسئلة الألعاب', 'انشاء اسئلة لعبة', 'إنشاء أسئلة لعبة'], en: ['question bank', 'game questions', 'educational game questions', 'open question bank'] },
    feedback: { ar: 'تم فتح بنك أسئلة الألعاب', en: 'Game question bank opened' }
  },
  {
    id: 'game_results', target: 'game_results',
    phrases: { ar: ['نتائج الالعاب', 'نتائج الألعاب', 'لوحة نتائج الالعاب', 'لوحة نتائج الألعاب', 'افتح نتائج الالعاب'], en: ['game results', 'games results', 'game results dashboard', 'open game results'] },
    feedback: { ar: 'تم فتح نتائج الألعاب', en: 'Game results opened' }
  },
  {
    id: 'reports', target: 'reports',
    phrases: { ar: ['التقارير', 'مركز التقارير', 'التقارير والتحليل', 'التحليل الاحصائي', 'التحليل الإحصائي', 'افتح التقارير'], en: ['reports', 'reports center', 'reports and analytics', 'statistical analysis', 'analytics', 'open reports'] },
    feedback: { ar: 'تم فتح مركز التقارير والتحليل', en: 'Reports and analytics opened' }
  },
  {
    id: 'leaderboard', target: 'leaderboard',
    phrases: { ar: ['الفرسان', 'لوحة الفرسان', 'المتصدرين', 'افتح الفرسان'], en: ['leaderboard', 'knights', 'top students', 'open leaderboard'] },
    feedback: { ar: 'تم فتح لوحة الفرسان', en: 'Leaderboard opened' }
  },
  {
    id: 'sync', target: 'sync',
    phrases: { ar: ['المزامنة', 'مركز المزامنة', 'النسخة السحابية', 'الادارة والمزامنة', 'الإدارة والمزامنة', 'افتح المزامنة'], en: ['sync', 'sync center', 'cloud sync', 'admin and sync', 'open sync'] },
    feedback: { ar: 'تم فتح مركز المزامنة', en: 'Sync center opened' }
  },
  {
    id: 'guide', target: 'guide',
    phrases: { ar: ['الدليل', 'دليل الاستخدام', 'دليل التطبيق', 'المساعدة', 'افتح الدليل'], en: ['guide', 'user guide', 'app guide', 'help', 'open guide'] },
    feedback: { ar: 'تم فتح دليل التطبيق', en: 'User guide opened' }
  },
  {
    id: 'settings', target: 'settings',
    phrases: { ar: ['الاعدادات', 'الإعدادات', 'افتح الاعدادات', 'إعدادات التطبيق'], en: ['settings', 'app settings', 'open settings'] },
    feedback: { ar: 'تم فتح الإعدادات', en: 'Settings opened' }
  },
  {
    id: 'about', target: 'about',
    phrases: { ar: ['عن التطبيق', 'حول التطبيق', 'حول راصد', 'افتح عن التطبيق'], en: ['about', 'about app', 'about rased', 'open about'] },
    feedback: { ar: 'تم فتح صفحة حول التطبيق', en: 'About page opened' }
  },
  {
    id: 'senior_dashboard', target: 'senior_dashboard',
    phrases: { ar: ['لوحة المعلم الاول', 'لوحة المعلم الأول', 'ادارة القسم', 'إدارة القسم', 'القيادة'], en: ['senior teacher dashboard', 'department management', 'leadership dashboard'] },
    feedback: { ar: 'تم فتح لوحة المعلم الأول', en: 'Senior teacher dashboard opened' }
  }
];

const normalizeForMatching = (value: string) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString())
    .replace(/[۰-۹]/g, digit => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit).toString())
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isPhraseMatch = (command: string, phrase: string) => {
  const normalizedCommand = normalizeForMatching(command);
  const normalizedPhrase = normalizeForMatching(phrase);
  if (!normalizedCommand || !normalizedPhrase) return false;
  return normalizedCommand === normalizedPhrase || normalizedCommand.includes(normalizedPhrase);
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onNavigate }) => {
  const { dir, language, students, setStudents, currentSemester } = useApp();
  const activeLanguage: SupportedLanguage = language === 'en' ? 'en' : 'ar';
  const copy = UI_COPY[activeLanguage];

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: FeedbackType }>({ message: '', type: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const manualStopRef = useRef(false);
  const isRecognitionStartingRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentsRef = useRef(students);
  const historyRef = useRef<Student[][]>([]);
  const memoryRef = useRef(new VoiceAgentMemory());
  const lastProcessedRef = useRef({ text: '', time: 0 });
  const pendingConfirmationRef = useRef<{ message: string; tasks: VoiceTask[] } | null>(null);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  const clearConfirmationTimer = useCallback(() => {
    if (confirmationTimerRef.current) {
      clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = null;
    }
  }, []);

  const displayFeedback = useCallback((message: string, type: FeedbackType) => {
    setFeedback({ message, type });
    setIsPanelVisible(Boolean(message));
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      if (shouldListenRef.current) {
        setFeedback({ message: UI_COPY[activeLanguage].lessonModeActive, type: 'info' });
        setIsPanelVisible(false);
      } else {
        setFeedback({ message: '', type: null });
        setIsPanelVisible(false);
      }
    }, 2200);
  }, [activeLanguage]);

  // الرد الصوتي متوقف عمدًا لتجنب تداخل صوت الجهاز مع الميكروفون أثناء الحصة.
  const speak = useCallback((_message: string) => undefined, []);

  const restartRecognition = useCallback((delay = 250) => {
    if (!shouldListenRef.current || !recognitionRef.current) return;
    if (restartAttemptsRef.current >= MAX_RESTART_ATTEMPTS) {
      shouldListenRef.current = false;
      manualStopRef.current = true;
      setIsListening(false);
      displayFeedback(UI_COPY[activeLanguage].cannotContinue, 'error');
      return;
    }
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      if (!shouldListenRef.current || !recognitionRef.current || isRecognitionStartingRef.current) return;
      try {
        isRecognitionStartingRef.current = true;
        restartAttemptsRef.current += 1;
        recognitionRef.current.start();
      } catch {
        // المحرك يعمل بالفعل أو لم ينهِ دورة الإيقاف بعد.
      } finally {
        setTimeout(() => {
          isRecognitionStartingRef.current = false;
        }, 500);
      }
    }, delay);
  }, [activeLanguage, displayFeedback]);

  const createId = useCallback(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, []);

  const saveSnapshot = useCallback(() => {
    historyRef.current.push(JSON.parse(JSON.stringify(studentsRef.current)));
    if (historyRef.current.length > 20) historyRef.current.shift();
  }, []);

  const undoLastAction = useCallback(() => {
    const previous = historyRef.current.pop();
    if (!previous) {
      displayFeedback(copy.noUndo, 'error');
      speak(copy.noUndo);
      return;
    }
    setStudents(previous);
    displayFeedback(copy.undoDone, 'success');
    speak(copy.undoDone);
  }, [copy.noUndo, copy.undoDone, displayFeedback, setStudents, speak]);

  const runTasks = useCallback((tasks: VoiceTask[]) => {
    if (!tasks.length) return;
    if (requiresConfirmation(tasks)) {
      clearConfirmationTimer();
      pendingConfirmationRef.current = { message: copy.sensitiveAction, tasks };
      displayFeedback(copy.confirmPrompt, 'info');
      speak(copy.sensitiveAction);
      confirmationTimerRef.current = setTimeout(() => {
        if (!pendingConfirmationRef.current) return;
        pendingConfirmationRef.current = null;
        displayFeedback(copy.confirmationExpired, 'info');
      }, CONFIRMATION_TIMEOUT_MS);
      return;
    }
    for (const task of tasks) {
      if (task.type === 'undo') {
        undoLastAction();
        continue;
      }
      executeTask(task, {
        setStudents,
        currentSemester,
        onNavigate,
        saveSnapshot,
        createId,
        memory: memoryRef.current,
        displayFeedback,
        speak
      });
    }
  }, [clearConfirmationTimer, copy, createId, currentSemester, displayFeedback, onNavigate, saveSnapshot, setStudents, speak, undoLastAction]);

  const findNavigationCommand = useCallback((command: string) => {
    for (const item of NAVIGATION_COMMANDS) {
      const phrases = [...item.phrases[activeLanguage], ...item.phrases[activeLanguage === 'ar' ? 'en' : 'ar']];
      if (phrases.some(phrase => isPhraseMatch(command, phrase))) return item;
    }
    return null;
  }, [activeLanguage]);

  const processCommand = useCallback((command: string) => {
    const originalText = command.trim();
    if (!originalText) return;
    const normalized = normalizeText(originalText);
    const normalizedForMatching = normalizeForMatching(originalText);
    const now = Date.now();
    if (normalized === lastProcessedRef.current.text && now - lastProcessedRef.current.time < 1200) return;
    lastProcessedRef.current = { text: normalized, time: now };
    memoryRef.current.setLastCommand(originalText);
    setIsProcessing(true);
    setIsPanelVisible(true);
    setFeedback({ message: copy.analyzing, type: 'info' });

    try {
      if (pendingConfirmationRef.current) {
        const yesPattern = /^(نعم|ايوا|ايوه|اكد|أكد|موافق|نفذ|yes|confirm|proceed|do it)$/i;
        const noPattern = /^(لا|الغ|الغي|تراجع|وقف|إلغاء|الغاء|no|cancel|stop)$/i;
        if (yesPattern.test(normalizedForMatching)) {
          const pending = pendingConfirmationRef.current;
          pendingConfirmationRef.current = null;
          clearConfirmationTimer();
          runTasks(pending.tasks);
          return;
        }
        if (noPattern.test(normalizedForMatching)) {
          pendingConfirmationRef.current = null;
          clearConfirmationTimer();
          displayFeedback(copy.cancelled, 'info');
          speak(copy.cancelled);
          return;
        }
        displayFeedback(copy.sayYesNo, 'info');
        return;
      }

      if (['مساعدة', 'الاوامر', 'الأوامر', 'ماذا استطيع ان اقول', 'help', 'commands', 'what can i say'].some(phrase => isPhraseMatch(originalText, phrase))) {
        displayFeedback(copy.helpTitle, 'info');
        return;
      }

      if (['تراجع', 'الغ اخر عملية', 'إلغاء آخر عملية', 'undo', 'undo last action'].some(phrase => isPhraseMatch(originalText, phrase))) {
        undoLastAction();
        return;
      }

      const navigationCommand = findNavigationCommand(originalText);
      if (navigationCommand && onNavigate) {
        onNavigate(navigationCommand.target);
        displayFeedback(navigationCommand.feedback[activeLanguage], 'success');
        return;
      }

      const memory = memoryRef.current.snapshot;
      if (memory.pendingIntent === 'create_student') {
        const cleanName = originalText
          .replace(/^(اسمه|اسم الطالب|الطالب اسمه|اسمها|اسم الطالبة|الطالبة اسمها|his name is|her name is|student name is)\s*/i, '')
          .trim();
        const tasks: VoiceTask[] = [{
          type: 'create_student',
          payload: { name: cleanName, grade: memory.pendingGrade || (activeLanguage === 'ar' ? 'بدون فصل' : 'No class') }
        }];
        memoryRef.current.clearPendingIntent();
        runTasks(tasks);
        return;
      }

      const tasks = planCommand(originalText, { students: studentsRef.current, memory: memoryRef.current });
      if (!tasks.length) {
        displayFeedback(copy.commandNotRecognized, 'error');
        return;
      }
      runTasks(tasks);
    } finally {
      setIsProcessing(false);
    }
  }, [activeLanguage, clearConfirmationTimer, copy, displayFeedback, findNavigationCommand, onNavigate, runTasks, speak, undoLastAction]);

  useEffect(() => {
    if (!SpeechRecognitionCtor) return;
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      recognition.lang = activeLanguage === 'ar' ? 'ar-OM' : 'en-US';
      recognition.onstart = () => {
        isRecognitionStartingRef.current = false;
        restartAttemptsRef.current = 0;
        setIsListening(true);
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        setFeedback({ message: UI_COPY[activeLanguage].lessonModeActive, type: 'info' });
      };
      recognition.onresult = (event: any) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        }
        finalText = finalText.trim();
        if (!finalText) return;
        setTranscript(finalText);
        setIsPanelVisible(true);
        processCommand(finalText);
        setTimeout(() => setTranscript(''), 1400);
        restartRecognition(350);
      };
      recognition.onend = () => {
        setIsListening(false);
        if (manualStopRef.current) {
          manualStopRef.current = false;
          shouldListenRef.current = false;
          displayFeedback(UI_COPY[activeLanguage].stopped, null);
          return;
        }
        if (shouldListenRef.current) {
          setFeedback({ message: UI_COPY[activeLanguage].reactivating, type: 'info' });
          restartRecognition(250);
        } else {
          displayFeedback(UI_COPY[activeLanguage].stopped, null);
        }
      };
      recognition.onerror = (event: any) => {
        const error = event.error;
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          manualStopRef.current = true;
          shouldListenRef.current = false;
          setIsListening(false);
          displayFeedback(UI_COPY[activeLanguage].allowMicrophone, 'error');
          return;
        }
        if (error === 'no-speech') {
          if (shouldListenRef.current) {
            displayFeedback(UI_COPY[activeLanguage].noClearSpeech, 'info');
            restartRecognition(300);
          }
          return;
        }
        if (error === 'aborted' || error === 'network' || error === 'audio-capture') {
          if (shouldListenRef.current) {
            displayFeedback(UI_COPY[activeLanguage].restarting, 'info');
            restartRecognition(700);
          }
          return;
        }
        if (shouldListenRef.current) restartRecognition(700);
      };
      recognitionRef.current = recognition;
      return () => {
        manualStopRef.current = true;
        shouldListenRef.current = false;
        clearConfirmationTimer();
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        try {
          recognition.stop();
        } catch {
          // تجاهل
        }
      };
    } catch {
      displayFeedback(UI_COPY[activeLanguage].recognitionFailed, 'error');
    }
  }, [activeLanguage, clearConfirmationTimer, displayFeedback, processCommand, restartRecognition]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    clearConfirmationTimer();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [clearConfirmationTimer]);

  const toggleListening = useCallback(() => {
    if (!SpeechRecognitionCtor) {
      setIsPanelVisible(true);
      displayFeedback(copy.unsupported, 'error');
      return;
    }
    if (shouldListenRef.current) {
      manualStopRef.current = true;
      shouldListenRef.current = false;
      restartAttemptsRef.current = 0;
      pendingConfirmationRef.current = null;
      clearConfirmationTimer();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        // تجاهل
      }
      setIsListening(false);
      displayFeedback(copy.stopped, null);
      return;
    }
    manualStopRef.current = false;
    shouldListenRef.current = true;
    restartAttemptsRef.current = 0;
    displayFeedback(copy.lessonModeActive, 'info');
    try {
      recognitionRef.current?.start();
    } catch {
      restartRecognition(300);
    }
  }, [clearConfirmationTimer, copy, displayFeedback, restartRecognition]);

  const isActive = isListening || shouldListenRef.current;
  const shouldShowPanel = isPanelVisible && Boolean(transcript || feedback.message);
  const statusIcon = useMemo(() => {
    if (isActive) return null;
    if (feedback.type === 'success') return <CheckCircle className="w-3.5 h-3.5" />;
    if (feedback.type === 'error') return <XCircle className="w-3.5 h-3.5" />;
    if (feedback.type === 'info') return <Bot className="w-3.5 h-3.5" />;
    return <HelpCircle className="w-3.5 h-3.5" />;
  }, [feedback.type, isActive]);

  return (
    <div
      className={`fixed z-[99999] flex flex-col items-${dir === 'rtl' ? 'start' : 'end'} pointer-events-none ${dir === 'rtl' ? 'left-3 md:left-6' : 'right-3 md:right-6'} bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-7`}
      dir={dir}
    >
      {shouldShowPanel && (
        <div className="mb-2 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-xl rounded-2xl p-3 max-w-[20rem] pointer-events-auto animate-in slide-in-from-bottom-2 fade-in shadow-indigo-500/10">
          <div className="flex items-center gap-2 mb-1.5">
            {isActive ? (
              <div className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse tracking-wide">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
                {copy.activeBadge}
              </div>
            ) : (
              <div className={`flex items-center gap-1 text-[10px] font-bold ${feedback.type === 'success' ? 'text-emerald-600' : feedback.type === 'error' ? 'text-rose-600' : 'text-slate-500'}`}>
                {statusIcon}
                {feedback.type === 'success' ? copy.successBadge : feedback.type === 'error' ? copy.alertBadge : feedback.type === 'info' ? copy.systemBadge : copy.noteBadge}
              </div>
            )}
          </div>
          <p className="text-xs font-bold text-slate-800 leading-relaxed min-h-[1.25rem]">
            {transcript || feedback.message}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={toggleListening}
        className={`pointer-events-auto flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full shadow-xl transition-all duration-300 active:scale-90 border ${
          isActive
            ? 'bg-indigo-600 text-white shadow-indigo-500/30 ring-4 ring-indigo-500/15 border-indigo-500'
            : SpeechRecognitionCtor
              ? 'bg-slate-800 text-white hover:bg-slate-700 border-slate-700'
              : 'bg-slate-300 text-slate-500 border-slate-300'
        }`}
        aria-label={isActive ? copy.stopAria : copy.startAria}
        title={isActive ? copy.stopAria : copy.startAria}
      >
        {isProcessing ? <Bot className="w-5 h-5 animate-pulse" /> : isActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default VoiceAssistant;
