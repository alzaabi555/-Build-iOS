import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, Bot, AlertCircle } from 'lucide-react';
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

const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

const MAX_RESTART_ATTEMPTS = 5;
const CONFIRMATION_TIMEOUT_MS = 10000;

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onNavigate }) => {
  const { dir, students, setStudents, currentSemester } = useApp();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: FeedbackType }>({
    message: '',
    type: null
  });
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

  const lastProcessedRef = useRef({
    text: '',
    time: 0
  });

  const pendingConfirmationRef = useRef<{
    message: string;
    tasks: VoiceTask[];
  } | null>(null);

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

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }

    feedbackTimerRef.current = setTimeout(() => {
      if (shouldListenRef.current) {
        setFeedback({ message: 'وضع الحصة نشط... الوكيل يستمع', type: 'info' });
        setIsPanelVisible(false);
      } else {
        setFeedback({ message: '', type: null });
        setIsPanelVisible(false);
      }
    }, 1800);
  }, []);

  /**
   * أثناء الحصة نوقف النطق الصوتي لتقليل البطء ومنع تداخل صوت الجهاز مع المايكروفون.
   * إذا أردت لاحقًا نضيف إعداد: "تفعيل الرد الصوتي".
   */
  const speak = useCallback((_message: string) => {
    return;
  }, []);

  const restartRecognition = useCallback((delay = 250) => {
    if (!shouldListenRef.current) return;
    if (!recognitionRef.current) return;

    if (restartAttemptsRef.current >= MAX_RESTART_ATTEMPTS) {
      shouldListenRef.current = false;
      manualStopRef.current = true;
      setIsListening(false);
      displayFeedback('تعذر استمرار الاستماع. أعد تشغيل الوكيل.', 'error');
      return;
    }

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }

    restartTimerRef.current = setTimeout(() => {
      if (!shouldListenRef.current || !recognitionRef.current) return;
      if (isRecognitionStartingRef.current) return;

      try {
        isRecognitionStartingRef.current = true;
        restartAttemptsRef.current += 1;
        recognitionRef.current.start();
      } catch {
        // غالبًا المحرك يعمل بالفعل أو لم ينهِ دورة الإيقاف بعد.
      } finally {
        setTimeout(() => {
          isRecognitionStartingRef.current = false;
        }, 500);
      }
    }, delay);
  }, [displayFeedback]);

  const createId = useCallback(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, []);

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

  const runTasks = useCallback(
    (tasks: VoiceTask[]) => {
      if (!tasks.length) return;

      if (requiresConfirmation(tasks)) {
        clearConfirmationTimer();

        pendingConfirmationRef.current = {
          message: 'هذا إجراء حساس. هل تؤكد التنفيذ؟',
          tasks
        };

        displayFeedback('هذا إجراء حساس. قل: نعم للتأكيد أو لا للإلغاء', 'info');
        speak('هذا إجراء حساس. هل تؤكد التنفيذ؟');

        confirmationTimerRef.current = setTimeout(() => {
          if (!pendingConfirmationRef.current) return;
          pendingConfirmationRef.current = null;
          displayFeedback('انتهت مهلة التأكيد وتم إلغاء الإجراء', 'info');
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
    },
    [
      clearConfirmationTimer,
      createId,
      currentSemester,
      displayFeedback,
      onNavigate,
      saveSnapshot,
      setStudents,
      speak,
      undoLastAction
    ]
  );

  const processCommand = useCallback(
    (command: string) => {
      const originalText = command.trim();

      if (!originalText) return;

      const normalized = normalizeText(originalText);
      const now = Date.now();

      if (
        normalized === lastProcessedRef.current.text &&
        now - lastProcessedRef.current.time < 1200
      ) {
        return;
      }

      lastProcessedRef.current = {
        text: normalized,
        time: now
      };

      memoryRef.current.setLastCommand(originalText);
      setIsProcessing(true);
      setIsPanelVisible(true);
      setFeedback({ message: 'جاري تحليل الأمر...', type: 'info' });

      try {
        if (pendingConfirmationRef.current) {
          if (/(نعم|ايوا|ايوه|اكد|أكد|موافق|نفذ)/.test(normalized)) {
            const pending = pendingConfirmationRef.current;
            pendingConfirmationRef.current = null;
            clearConfirmationTimer();
            runTasks(pending.tasks);
            return;
          }

          if (/(لا|الغ|الغي|تراجع|وقف|إلغاء|الغاء)/.test(normalized)) {
            pendingConfirmationRef.current = null;
            clearConfirmationTimer();
            displayFeedback('تم إلغاء الإجراء', 'info');
            speak('تم الإلغاء');
            return;
          }

          displayFeedback('قل نعم للتأكيد أو لا للإلغاء', 'info');
          return;
        }

        const memory = memoryRef.current.snapshot;

        if (memory.pendingIntent === 'create_student') {
          const cleanName = originalText
            .replace(/^(اسمه|اسم الطالب|الطالب اسمه|اسمها|اسم الطالبة|الطالبة اسمها)\s*/g, '')
            .trim();

          const tasks: VoiceTask[] = [
            {
              type: 'create_student',
              payload: {
                name: cleanName,
                grade: memory.pendingGrade || 'بدون فصل'
              }
            }
          ];

          memoryRef.current.clearPendingIntent();
          runTasks(tasks);
          return;
        }

        const tasks = planCommand(originalText, {
          students: studentsRef.current,
          memory: memoryRef.current
        });

        runTasks(tasks);
      } finally {
        setIsProcessing(false);
      }
    },
    [clearConfirmationTimer, displayFeedback, runTasks, speak]
  );

  useEffect(() => {
    if (!SpeechRecognitionCtor) return;

    try {
      const recognition = new SpeechRecognitionCtor();

      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'ar-OM';

      recognition.onstart = () => {
        isRecognitionStartingRef.current = false;
        restartAttemptsRef.current = 0;
        setIsListening(true);

        if (feedbackTimerRef.current) {
          clearTimeout(feedbackTimerRef.current);
        }

        setFeedback({
          message: 'وضع الحصة نشط... الوكيل يستمع',
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
        setIsPanelVisible(true);
        processCommand(finalText);

        setTimeout(() => {
          setTranscript('');
        }, 1200);

        restartRecognition(350);
      };

      recognition.onend = () => {
        setIsListening(false);

        if (manualStopRef.current) {
          manualStopRef.current = false;
          shouldListenRef.current = false;
          displayFeedback('تم إيقاف الوكيل', null);
          return;
        }

        if (shouldListenRef.current) {
          setFeedback({
            message: 'إعادة تنشيط الاستماع...',
            type: 'info'
          });

          restartRecognition(250);
        } else {
          displayFeedback('تم إيقاف الوكيل', null);
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;

        if (error === 'not-allowed' || error === 'service-not-allowed') {
          manualStopRef.current = true;
          shouldListenRef.current = false;
          setIsListening(false);
          displayFeedback('الرجاء السماح للتطبيق بالوصول للمايكروفون', 'error');
          return;
        }

        if (error === 'no-speech') {
          if (shouldListenRef.current) {
            displayFeedback('لم أسمع أمرًا واضحًا... ما زلت أستمع', 'info');
            restartRecognition(300);
          }
          return;
        }

        if (error === 'aborted' || error === 'network' || error === 'audio-capture') {
          if (shouldListenRef.current) {
            displayFeedback('إعادة تشغيل الاستماع...', 'info');
            restartRecognition(700);
          }
          return;
        }

        if (shouldListenRef.current) {
          restartRecognition(700);
        }
      };

      recognitionRef.current = recognition;

      return () => {
        manualStopRef.current = true;
        shouldListenRef.current = false;
        clearConfirmationTimer();

        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }

        try {
          recognition.stop();
        } catch {
          // تجاهل
        }
      };
    } catch {
      displayFeedback('تعذر تشغيل التعرف الصوتي', 'error');
    }
  }, [clearConfirmationTimer, displayFeedback, processCommand, restartRecognition]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }

      clearConfirmationTimer();

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [clearConfirmationTimer]);

  const toggleListening = useCallback(() => {
    if (!SpeechRecognitionCtor) {
      setIsPanelVisible(true);
      displayFeedback('التعرف الصوتي غير مدعوم في هذا المتصفح', 'error');
      return;
    }

    if (shouldListenRef.current) {
      manualStopRef.current = true;
      shouldListenRef.current = false;
      restartAttemptsRef.current = 0;
      pendingConfirmationRef.current = null;
      clearConfirmationTimer();

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }

      try {
        recognitionRef.current?.stop();
      } catch {
        // تجاهل
      }

      setIsListening(false);
      displayFeedback('تم إيقاف الوكيل', null);
      return;
    }

    manualStopRef.current = false;
    shouldListenRef.current = true;
    restartAttemptsRef.current = 0;

    displayFeedback('وضع الحصة نشط... الوكيل يستمع', 'info');

    try {
      recognitionRef.current?.start();
    } catch {
      restartRecognition(300);
    }
  }, [clearConfirmationTimer, displayFeedback, restartRecognition]);

  const isActive = isListening || shouldListenRef.current;
  const shouldShowPanel = isPanelVisible && (transcript || feedback.message);

  return (
    <div
      className={`fixed z-[99999] flex flex-col items-${dir === 'rtl' ? 'start' : 'end'} pointer-events-none ${
        dir === 'rtl' ? 'left-3 md:left-6' : 'right-3 md:right-6'
      } bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-7`}
      dir={dir}
    >
      {shouldShowPanel && (
        <div className="mb-2 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-xl rounded-2xl p-3 max-w-[18rem] pointer-events-auto animate-in slide-in-from-bottom-2 fade-in shadow-indigo-500/10">
          <div className="flex items-center gap-2 mb-1.5">
            {isActive ? (
              <div className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse tracking-wide">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
                وضع الحصة نشط
              </div>
            ) : feedback.type === 'success' ? (
              <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                تم
              </div>
            ) : feedback.type === 'error' ? (
              <div className="flex items-center gap-1 text-rose-600 text-[10px] font-bold">
                <XCircle className="w-3.5 h-3.5" />
                تنبيه
              </div>
            ) : feedback.type === 'info' ? (
              <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold">
                <Bot className="w-3.5 h-3.5" />
                النظام
              </div>
            ) : (
              <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                ملاحظة
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
        className={`pointer-events-auto flex items-center justify-center w-12 h-12 md:w-13 md:h-13 rounded-full shadow-xl transition-all duration-300 active:scale-90 border ${
          isActive
            ? 'bg-indigo-600 text-white shadow-indigo-500/30 ring-4 ring-indigo-500/15 border-indigo-500'
            : SpeechRecognitionCtor
              ? 'bg-slate-800 text-white hover:bg-slate-700 border-slate-700'
              : 'bg-slate-300 text-slate-500 border-slate-300'
        }`}
        aria-label={isActive ? 'إيقاف وضع الحصة الصوتي' : 'تشغيل وضع الحصة الصوتي'}
      >
        {isProcessing ? (
          <Bot className="w-5 h-5 animate-pulse" />
        ) : isActive ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};

export default VoiceAssistant;
