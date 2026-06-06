import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, CheckCircle, XCircle, Bot } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';

interface VoiceAssistantProps {
  onNavigate?: (tab: string) => void;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onNavigate }) => {
  const { t, dir, students, setStudents, currentSemester } = useApp(); 
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'info' | 'success' | 'error' | null }>({ message: '', type: null });
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const feedbackTimerRef = useRef<NodeJS.Timeout>();

  const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

  const studentsRef = useRef(students);
  useEffect(() => { studentsRef.current = students; }, [students]);
  const navigateRef = useRef(onNavigate);
  useEffect(() => { navigateRef.current = onNavigate; }, [onNavigate]);

  // ==========================================
  // 🧠 1. Agent Memory (ذاكرة الوكيل الذكي)
  // ==========================================
  const agentMemoryRef = useRef({
    pendingIntent: null as string | null,
    pendingStudent: null as Student | null,
    targetClass: null as string | null,
    lastCommand: '',
    currentContext: ''
  });

  // ==========================================
  // 🧠 2. Undo Manager (نظام إدارة التراجع)
  // ==========================================
  const historyRef = useRef<Student[][]>([]);

  const saveSnapshot = useCallback(() => {
    historyRef.current.push(JSON.parse(JSON.stringify(studentsRef.current)));
    if (historyRef.current.length > 20) {
      historyRef.current.shift(); // الاحتفاظ بآخر 20 عملية فقط كما اقترحت
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
  }, [setStudents]);

  // ==========================================
  // 🗣️ Voice Engine (محرك التحدث والإشعارات)
  // ==========================================
  const speak = (text: string) => {
    if ('speechSynthesis' in window && !isElectron) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const displayFeedback = useCallback((msg: string, type: 'success' | 'error' | 'info' | null) => {
    setFeedback({ message: msg, type });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      if (shouldListenRef.current) {
        setFeedback({ message: 'الوكيل الذكي يستمع...', type: 'info' });
      } else {
        setFeedback({ message: '', type: null }); 
      }
    }, 4000);
  }, []);

  // ==========================================
  // 🧹 NLP Helpers (مساعدات معالجة اللغات)
  // ==========================================
  const normalizeText = (text: string) => {
    return text.replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/^(ل|ب|ك|ف|ال)/, '').toLowerCase();
  };

  const extractAmount = (text: string): number => {
    const words = text.split(' ');
    for (let w of words) {
      if (w.match(/(نقطتين|درجتين|نجمتين|علامتين|اثنين|مرتين|2)/)) return 2;
      if (w.match(/(ثلاث|3)/)) return 3;
      if (w.match(/(اربع|4)/)) return 4;
      if (w.match(/(خمس|5)/)) return 5;
      if (w.match(/(ست|6)/)) return 6;
      if (w.match(/(سبع|7)/)) return 7;
      if (w.match(/(ثمان|8)/)) return 8;
      if (w.match(/(تسع|9)/)) return 9;
      if (w.match(/(عشر|10)/)) return 10;
    }
    return 1;
  };

  // ==========================================
  // 🧠 3. Action Engine (محرك تنفيذ الإجراءات المباشرة)
  // ==========================================
  const executeAgentAction = (intent: string, payload: any) => {
    saveSnapshot();

    switch (intent) {
      case 'add_points':
        setStudents(prev => prev.map(s => s.id === payload.studentId ? {
            ...s, behaviors: [...(s.behaviors || []), {
              id: Date.now().toString(), date: new Date().toISOString(), type: 'positive', description: 'إضافة ذكية (صوتياً)', points: payload.amount, semester: currentSemester
            }]
          } : s));
        displayFeedback(`إضافة ${payload.amount} نقاط لـ ${payload.studentName}`, 'success');
        speak(`إضافة ${payload.amount}`);
        return true;

      case 'deduct_points':
        setStudents(prev => prev.map(s => s.id === payload.studentId ? {
            ...s, behaviors: [...(s.behaviors || []), {
              id: Date.now().toString(), date: new Date().toISOString(), type: 'negative', description: 'خصم ذكي (صوتياً)', points: -payload.amount, semester: currentSemester
            }]
          } : s));
        displayFeedback(`خصم ${payload.amount} من ${payload.studentName}`, 'success');
        speak(`خصم ${payload.amount}`);
        return true;

      case 'mark_absent':
        setStudents(prev => prev.map(s => s.id === payload.studentId ? {
            ...s, attendance: [...(s.attendance || []), { date: new Date().toISOString(), status: 'absent' }]
          } : s));
        displayFeedback(`غياب: ${payload.studentName}`, 'success');
        speak('تم الغياب');
        return true;

      case 'mark_present':
        setStudents(prev => prev.map(s => s.id === payload.studentId ? {
            ...s, attendance: [...(s.attendance || []), { date: new Date().toISOString(), status: 'present' }]
          } : s));
        displayFeedback(`حضور: ${payload.studentName}`, 'success');
        speak('تم التحضير');
        return true;
    }
    return false;
  };

  // ==========================================
  // 🧠 4. Student Creation Engine (إنشاء طالب صوتياً)
  // ==========================================
  const createStudentVoice = (name: string, grade: string) => {
    saveSnapshot();
    const newStudent: Student = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      name,
      gender: 'male',
      classes: [grade],
      attendance: [], behaviors: [], grades: [], tests: []
    };
    setStudents(prev => [...prev, newStudent]);
    displayFeedback(`تم إنشاء الطالب: ${name}`, 'success');
    speak(`تم إنشاء ${name.split(' ')[0]}`);
  };

  // ==========================================
  // 🧠 5. Form Engine (اكتشاف الحقول والكتابة)
  // ==========================================
  const findInputByMeaning = (keyword: string): HTMLInputElement | undefined => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    return inputs.find(el => {
      const input = el as HTMLInputElement;
      const text = (input.placeholder || input.name || input.id || input.getAttribute('aria-label') || '').toLowerCase();
      return text.includes(keyword.toLowerCase());
    }) as HTMLInputElement;
  };

  const writeToField = (fieldKeyword: string, value: string) => {
    const input = findInputByMeaning(fieldKeyword);
    if (!input) return false;
    
    input.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  // ==========================================
  // 📍 Navigation & DOM Fallbacks
  // ==========================================
  const getTargetRoute = (text: string): string | null => {
    const cmd = text.toLowerCase();
    if (cmd.match(/(رئيسي|داشبورد|لوحه|شاشه رئيسي)/)) return 'dashboard';
    if (cmd.match(/(تقرير|تقارير|احصائيات|نتايج|نتائج)/)) return 'reports';
    if (cmd.match(/(درجات|درجه|رصد|سجل الدرجات)/)) return 'grades';
    if (cmd.match(/(حضور|غياب|سجل الغياب|تحضير)/)) return 'attendance';
    if (cmd.match(/(طلاب|طلبه|قائمه|وارد)/)) return 'students';
    if (cmd.match(/(فرسان|شرف|اوائل)/)) return 'leaderboard';
    if (cmd.match(/(اعدادات|ضبط)/)) return 'settings';
    return null;
  };

  const scanAndClick = (command: string): boolean => {
    const clickableElements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    let bestMatch: HTMLElement | null = null;
    for (const el of clickableElements) {
      const elementText = normalizeText((el.textContent || '').trim());
      if (elementText && command.includes(elementText)) {
        bestMatch = el as HTMLElement; break;
      }
    }
    if (bestMatch) {
      bestMatch.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.5)';
      setTimeout(() => { if (bestMatch) bestMatch.style.boxShadow = ''; }, 300);
      bestMatch.click(); 
      return true;
    }
    return false;
  };

  // ==========================================
  // 🧠 6. The Master Pipeline (خط المعالجة الرئيسي)
  // ==========================================
  const processCommand = (command: string) => {
    if (!command.trim()) return;
    const originalText = command.trim();
    const text = normalizeText(originalText);
    agentMemoryRef.current.lastCommand = originalText;

    // --- 1. أوامر التراجع ---
    if (text.match(/(تراجع|ارجع|الغ اخر عملية|عفوا)/)) {
        undoLastAction(); return;
    }

    // --- 2. الحوار السياقي (Context Dialog) ---
    if (agentMemoryRef.current.pendingIntent === 'create_student') {
        createStudentVoice(originalText, agentMemoryRef.current.targetClass || 'بدون فصل');
        agentMemoryRef.current.pendingIntent = null;
        agentMemoryRef.current.targetClass = null;
        return;
    }

    // --- 3. الكتابة التلقائية ---
    if (text.match(/(اكتب|ابحث عن)/)) {
        const valueToType = originalText.replace(/(اكتب|ابحث عن|في خانة|في حقل|عن)/g, '').trim();
        if (writeToField('بحث', valueToType) || writeToField('search', valueToType) || writeToField('اسم', valueToType)) {
            displayFeedback(`تمت كتابة: ${valueToType}`, 'success');
        } else {
            displayFeedback('لم أجد حقل كتابة', 'error');
        }
        return;
    }

    // --- 4. نوايا البدء (Intent Starters) ---
    if (text.match(/(طالب جديد|اضف طالب|انشاء طالب)/)) {
        const classMatch = text.match(/في فصل (.*)/);
        agentMemoryRef.current.targetClass = classMatch ? classMatch[1].trim() : 'بدون فصل';
        agentMemoryRef.current.pendingIntent = 'create_student';
        displayFeedback('ما اسم الطالب؟', 'info');
        speak('ما اسم الطالب؟');
        return;
    }

    // --- 5. البحث عن الطالب في الـ Context ---
    let foundStudent: Student | undefined;
    for (const s of studentsRef.current) {
      const studentWords = s.name.split(' ').map(normalizeText);
      const firstName = studentWords[0];
      if (firstName.length >= 2 && text.includes(firstName)) {
        foundStudent = s;
        if (studentWords.length > 1 && text.includes(studentWords[1])) break;
      }
    }

    // --- 6. توجيه الإجراء للمحرك (Action Routing) ---
    if (foundStudent) {
      const isAbsent = text.match(/(غايب|غائب|غياب|غاب|مريض)/);
      const isPresent = text.match(/(حاضر|حضر|موجود)/);
      const isNegative = text.match(/(خصم|ناقص|ازعاج|مزعج|نايم|نام|تاخير|متاخر|خطا|غلط|سيء|نقص|اسحب)/);
      const isPositive = !isNegative && text.match(/(نجم|نقط|درج|ممتاز|بطل|مشارك|صح|شاطر|كفو|عظيم|مبدع|زيد|اعط|ضيف)/);
      const amount = extractAmount(text);
      const shortName = foundStudent.name.split(' ')[0];

      if (isAbsent) return executeAgentAction('mark_absent', { studentId: foundStudent.id, studentName: shortName });
      if (isPresent) return executeAgentAction('mark_present', { studentId: foundStudent.id, studentName: shortName });
      if (isNegative) return executeAgentAction('deduct_points', { studentId: foundStudent.id, studentName: shortName, amount });
      if (isPositive) return executeAgentAction('add_points', { studentId: foundStudent.id, studentName: shortName, amount });
    }

    // --- 7. التنقل والنقر الذكي ---
    const targetRoute = getTargetRoute(text);
    if (targetRoute && navigateRef.current) {
        navigateRef.current(targetRoute);
        displayFeedback(`جاري الانتقال...`, 'success');
        return;
    }

    if (scanAndClick(text)) {
      displayFeedback(`تم تنفيذ الإجراء`, 'success');
      return;
    }

    displayFeedback(`عفواً، لم أفهم: "${originalText}"`, 'error');
  };

  // ==========================================
  // 🎙️ Speech Recognition Setup
  // ==========================================
  useEffect(() => {
    if (!SpeechRecognition || isElectron) return;
    try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; 
        recognition.interimResults = false; 
        recognition.lang = 'ar-OM'; 

        recognition.onstart = () => {
          setIsListening(true);
          if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
          setFeedback({ message: 'الوكيل الذكي مستعد...', type: 'info' });
        };

        recognition.onresult = (event: any) => {
          let finalText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
          }
          setTranscript(finalText);
          if (finalText) {
            processCommand(finalText);
            setTimeout(() => setTranscript(''), 2500); 
          }
        };

        recognition.onend = () => {
          if (shouldListenRef.current) {
            setTimeout(() => { if (shouldListenRef.current) try { recognition.start(); } catch (e) {} }, 350);
          } else {
            setIsListening(false);
            displayFeedback('تم إيقاف الوكيل', null);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed') {
             shouldListenRef.current = false; setIsListening(false);
             displayFeedback('الرجاء السماح للتطبيق بالوصول للمايكروفون', 'error');
          }
        };

        recognitionRef.current = recognition;
        return () => { shouldListenRef.current = false; recognition.stop(); }
    } catch (error) {}
  }, [displayFeedback, isElectron]); 

  const toggleListening = useCallback(() => {
    shouldListenRef.current = !shouldListenRef.current;
    if (shouldListenRef.current) {
      try { recognitionRef.current?.start(); } catch (e) {}
    } else {
      recognitionRef.current?.stop();
    }
  }, []);

  if (!SpeechRecognition || isElectron) return null;

  return (
    <div className={`fixed bottom-24 md:bottom-8 ${dir === 'rtl' ? 'left-6' : 'right-6'} z-[99999] flex flex-col items-${dir === 'rtl' ? 'start' : 'end'} pointer-events-none`} dir={dir}>
      {(isListening || transcript || feedback.message) && (
        <div className="mb-4 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl p-4 max-w-sm pointer-events-auto animate-in slide-in-from-bottom-2 fade-in shadow-indigo-500/10">
          <div className="flex items-center gap-2 mb-2">
            {isListening ? (
              <div className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[11px] font-bold animate-pulse tracking-wide">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div> الوكيل الذكي نشط
              </div>
            ) : feedback.type === 'success' ? (
              <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-bold"><CheckCircle className="w-3.5 h-3.5" /> تم</div>
            ) : feedback.type === 'error' ? (
              <div className="flex items-center gap-1 text-rose-600 text-[11px] font-bold"><XCircle className="w-3.5 h-3.5" /> تنبيه</div>
            ) : (
              <div className="flex items-center gap-1 text-slate-500 text-[11px] font-bold"><Bot className="w-3.5 h-3.5" /> النظام</div>
            )}
          </div>
          <p className="text-sm font-bold text-slate-800 leading-relaxed min-h-[1.5rem]">{transcript || feedback.message}</p>
        </div>
      )}

      <button onClick={toggleListening} className={`pointer-events-auto flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 active:scale-90 ${isListening ? 'bg-indigo-600 text-white shadow-indigo-500/40 ring-4 ring-indigo-500/20' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
        {isListening ? <div className="relative flex items-center justify-center"><Mic className="w-7 h-7 relative z-10" /></div> : <MicOff className="w-7 h-7" />}
      </button>
    </div>
  );
};

export default VoiceAssistant;
