import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, Bot } from 'lucide-react';
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

  const isElectron =
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('electron');

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  const displayFeedback = useCallback((message: string, type: FeedbackType) => {
    setFeedback({ message, type });

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
  }, []);

  const speak = useCallback(
    (message: string) => {
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        !isElectron
      ) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'ar-SA';
        utterance.rate = 1.08;

        window.speechSynthesis.speak(utterance);
      }
    },
    [isElectron]
  );

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
        pendingConfirmationRef.current = {
          message: 'هذا إجراء حساس. هل تؤكد التنفيذ؟',
          tasks
        };

        displayFeedback('هذا إجراء حساس. قل: نعم للتأكيد أو لا للإلغاء', 'info');
        speak('هذا إجراء حساس. هل تؤكد التنفيذ؟');
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
        now - lastProcessedRef.current.time < 2500
      ) {
        return;
      }

      lastProcessedRef.current = {
        text: normalized,
        time: now
      };

      memoryRef.current.setLastCommand(originalText);

      if (pendingConfirmationRef.current) {
        if (/(نعم|ايوا|ايوه|اكد|أكد|موافق|نفذ)/.test(normalized)) {
          const pending = pendingConfirmationRef.current;
          pendingConfirmationRef.current = null;
          runTasks(pending.tasks);
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
    },
    [displayFeedback, runTasks, speak]
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
                // المحرك قد يكون يعمل بالفعل
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
          displayFeedback('لم أسمع أمرًا واضحًا', 'info');
        }
      };

      recognitionRef.current = recognition;

      return () => {
        shouldListenRef.current = false;

        try {
          recognition.stop();
        } catch {
          // تجاهل
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
        // قد يكون المحرك يعمل
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
