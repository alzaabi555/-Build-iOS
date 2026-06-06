import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';

interface VoiceAssistantProps {
  onNavigate?: (tab: string) => void;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onNavigate }) => {
  const { t, dir, students, setStudents } = useApp(); 
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'info' | 'success' | 'error' | null }>({ message: '', type: null });
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const feedbackTimerRef = useRef<NodeJS.Timeout>();

  const studentsRef = useRef(students);
  useEffect(() => { studentsRef.current = students; }, [students]);
  const navigateRef = useRef(onNavigate);
  useEffect(() => { navigateRef.current = onNavigate; }, [onNavigate]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 👁️ الميزة الجديدة: إخفاء المربع الذكي بعد التنفيذ
  const displayFeedback = useCallback((msg: string, type: 'success' | 'error' | 'info' | null) => {
    setFeedback({ message: msg, type });
    
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    
    // إخفاء أو إعادة تعيين الرسالة بعد 3 ثواني
    feedbackTimerRef.current = setTimeout(() => {
      if (shouldListenRef.current) {
        setFeedback({ message: 'راصد يستمع الآن...', type: 'info' });
      } else {
        setFeedback({ message: '', type: null }); // إخفاء المربع بالكامل
      }
    }, 3000);
  }, []);

  // 1️⃣ تنظيف النص
  const normalizeText = (text: string) => {
    return text
      .replace(/[\u064B-\u065F\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/^(ل|ب|ك|ف|ال)/, '') 
      .toLowerCase();
  };

  // 2️⃣ استخراج الأرقام
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

  // 3️⃣ خريطة التنقل المركزي
  const getTargetRoute = (text: string): string | null => {
    const cmd = text.toLowerCase();
    if (cmd.match(/(رئيسي|داشبورد|لوحه القياده|شاشه رئيسي)/)) return 'dashboard';
    if (cmd.match(/(تقرير|تقارير|احصائيات|نتايج|نتائج|شهادات|استدعاء)/)) return 'reports';
    if (cmd.match(/(درجات|درجه|رصد|سجل الدرجات)/)) return 'grades';
    if (cmd.match(/(حضور|غياب|سجل الغياب|تحضير)/)) return 'attendance';
    if (cmd.match(/(طلاب|طلبه|قائمه الطلاب|سجل الطلاب|وارد الاباء)/)) return 'students';
    if (cmd.match(/(مجموع|مجموعات|فرق|مجموعه)/)) return 'groups';
    if (cmd.match(/(فرسان|شرف|اوائل|متصدر|لوحه الشرف)/)) return 'leaderboard';
    if (cmd.match(/(مهام|واجب|تاسك|مهمه)/)) return 'tasks';
    if (cmd.match(/(مكتبه|مكتبة|مصادر|كتب|ملفات)/)) return 'library';
    if (cmd.match(/(مزامنه|مزامنة|سحاب|تزامن|رفع|باك اب|احتياطي|نسخ)/)) return 'sync';
    if (cmd.match(/(اعدادات|ضبط|خصائص|تفضيل)/)) return 'settings';
    if (cmd.match(/(دليل|شرح|مساعده|استخدام)/)) return 'guide';
    if (cmd.match(/(حول|عن التطبيق|تطبيق)/)) return 'about';
    
    if (cmd.match(/(قفل|خروج|اغلاق التطبيق|تسجيل خروج)/)) {
       window.location.reload();
       return null;
    }
    return null;
  };

  // 👁️ محرك البحث والتفاعل الذكي مع مكونات الشاشة (الإصبع الافتراضي)
  const scanAndClick = (command: string): boolean => {
    const actionsMap: { [key: string]: RegExp } = {
      'add': /(اضافه|جديد|اضف|انشاء)/,
      'save': /(حفظ|تأكيد|تاكيد|موافق|تم)/,
      'cancel': /(الغاء|تراجع)/,
      'close': /(اغلاق النافذه|اغلق|سكّر|رجوع|عوده|اكس)/,
      'edit': /(تعديل|حرر|غير)/,
      'delete': /(حذف|امسح|ازاله|ازالة)/,
      'export': /(تصدير|اكسل|بي دي اف|pdf|طباعه|اطبع)/,
      'search': /(بحث|ابحث|دور)/,
      'filter': /(تصفيه|فلتر)/
    };

    const clickableElements = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]'));
    let bestMatch: HTMLElement | null = null;

    for (const el of clickableElements) {
      const elementText = normalizeText((el.textContent || '').trim());
      const ariaLabel = normalizeText(el.getAttribute('aria-label') || '');
      const voiceData = normalizeText(el.getAttribute('data-voice') || ''); 

      if (elementText && command.includes(elementText)) {
        bestMatch = el as HTMLElement; break;
      }
      
      if (ariaLabel && command.includes(ariaLabel)) {
        bestMatch = el as HTMLElement; break;
      }

      for (const [action, regex] of Object.entries(actionsMap)) {
        if (regex.test(command)) {
          if (regex.test(elementText) || regex.test(ariaLabel) || regex.test(voiceData)) {
            bestMatch = el as HTMLElement; break;
          }
        }
      }
      if (bestMatch) break;
    }

    if (bestMatch) {
      bestMatch.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.5)';
      setTimeout(() => { if (bestMatch) bestMatch.style.boxShadow = ''; }, 300);
      bestMatch.click(); 
      return true;
    }

    return false;
  };

  // 🧠 المعالج اللغوي الشامل
  const processCommand = (command: string) => {
    if (!command.trim()) return;
    
    const originalText = command.trim();
    const text = normalizeText(originalText);
    
    if (scanAndClick(text)) {
      displayFeedback(`تم تنفيذ الإجراء`, 'success');
      return;
    }

    const isNavigationWord = text.match(/(افتح|روح|انتقل|عرض|هات|صفح|شاش|ودني|ورني|قسم)/);
    const targetRoute = getTargetRoute(text);

    let foundStudent: Student | undefined;
    for (const s of studentsRef.current) {
      const studentWords = s.name.split(' ').map(normalizeText);
      const firstName = studentWords[0];
      if (firstName.length >= 2 && text.includes(firstName)) {
        foundStudent = s;
        if (studentWords.length > 1 && text.includes(studentWords[1])) break;
      }
    }

    if (targetRoute && (isNavigationWord || !foundStudent)) {
      if (navigateRef.current) {
        navigateRef.current(targetRoute);
        displayFeedback(`جاري الانتقال...`, 'success');
        return;
      }
    }

    if (foundStudent && !isNavigationWord) {
      const isAbsent = text.match(/(غايب|غائب|غياب|غاب|مريض)/);
      const isPresent = text.match(/(حاضر|حضر|موجود)/);
      const isNegative = text.match(/(خصم|ناقص|ازعاج|مزعج|نايم|نام|تاخير|متاخر|خطا|غلط|سيء|ضعيف|نقص|اسحب)/);
      const isPositive = !isNegative && text.match(/(نجم|نقط|درج|ممتاز|بطل|مشارك|صح|شاطر|كفو|عظيم|مبدع|زيد|اعط|ضيف)/);
      const amount = extractAmount(text);

      if (isAbsent) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, attendance: [...(s.attendance || []), { date: new Date().toISOString(), status: 'absent' }] } : s));
        displayFeedback(`غياب: ${foundStudent.name}`, 'success');
        speak(`تم الغياب`);
        return;
      }
      else if (isPresent) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, attendance: [...(s.attendance || []), { date: new Date().toISOString(), status: 'present' }] } : s));
        displayFeedback(`حضور: ${foundStudent.name}`, 'success');
        return;
      }
      else if (isNegative) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, behaviors: [...(s.behaviors || []), { id: Math.random().toString(), date: new Date().toISOString(), description: `تقويم سلوك (${amount})`, type: 'negative', points: -amount }] } : s));
        displayFeedback(`خصم ${amount} من: ${foundStudent.name}`, 'success');
        speak(`خصم ${amount}`);
        return;
      }
      else if (isPositive) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, behaviors: [...(s.behaviors || []), { id: Math.random().toString(), date: new Date().toISOString(), description: `مشاركة وتفاعل (${amount})`, type: 'positive', points: amount }] } : s));
        displayFeedback(`إضافة ${amount} لـ: ${foundStudent.name}`, 'success');
        speak(`إضافة ${amount}`);
        return;
      }
    }

    displayFeedback(`أمر غير واضح: "${originalText}"`, 'error');
  };

  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.lang = 'ar-OM'; 

    recognition.onstart = () => {
      setIsListening(true);
      // مسح أي مؤقت سابق وتثبيت رسالة الاستماع
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      setFeedback({ message: 'راصد يستمع الآن...', type: 'info' });
    };

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }

      setTranscript(interimText || finalText);

      if (finalText) {
        processCommand(finalText);
        setTimeout(() => setTranscript(''), 2500); 
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try { recognition.start(); } catch (e) {}
      } else {
        setIsListening(false);
        displayFeedback('تم الإيقاف', null);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
         shouldListenRef.current = false;
         setIsListening(false);
         displayFeedback('الرجاء السماح للتطبيق باستخدام المايكروفون', 'error');
      }
    };

    recognitionRef.current = recognition;

    return () => {
       shouldListenRef.current = false;
       recognition.stop();
    }
  }, [displayFeedback]); 

  const toggleListening = useCallback(() => {
    shouldListenRef.current = !shouldListenRef.current;
    if (shouldListenRef.current) {
      try { recognitionRef.current?.start(); } catch (e) {}
    } else {
      recognitionRef.current?.stop();
    }
  }, []);

  if (!SpeechRecognition) return null;

  return (
    // 💉 التعديل الهندسي الأهم هنا: bottom-24 للموبايل ليرتفع فوق القائمة السفلية، و md:bottom-8 للشاشات الكبيرة
    <div className={`fixed bottom-24 md:bottom-8 ${dir === 'rtl' ? 'left-6' : 'right-6'} z-[99999] flex flex-col items-${dir === 'rtl' ? 'start' : 'end'} pointer-events-none`} dir={dir}>
      
      {(isListening || transcript || feedback.message) && (
        <div className="mb-4 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl p-4 max-w-sm pointer-events-auto animate-in slide-in-from-bottom-2 fade-in shadow-indigo-500/10">
          <div className="flex items-center gap-2 mb-2">
            {isListening ? (
              <div className="flex items-center gap-1.5 bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[11px] font-bold animate-pulse tracking-wide">
                <div className="w-2 h-2 bg-rose-600 rounded-full animate-ping"></div> المساعد الذكي نشط
              </div>
            ) : feedback.type === 'success' ? (
              <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> تم التنفيذ
              </div>
            ) : feedback.type === 'error' ? (
              <div className="flex items-center gap-1 text-rose-600 text-[11px] font-bold">
                <XCircle className="w-3.5 h-3.5" /> تنبيه
              </div>
            ) : (
              <div className="flex items-center gap-1 text-slate-500 text-[11px] font-bold">
                <Volume2 className="w-3.5 h-3.5" /> راصد
              </div>
            )}
          </div>
          
          <p className="text-sm font-bold text-slate-800 leading-relaxed min-h-[1.5rem]">
            {transcript || feedback.message}
          </p>
        </div>
      )}

      <button
        onClick={toggleListening}
        className={`pointer-events-auto flex items-center justify-center w-16 h-16 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.15)] transition-all duration-300 active:scale-90 ${
          isListening 
            ? 'bg-rose-500 text-white shadow-rose-500/40 ring-4 ring-rose-500/20' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-600/30'
        }`}
      >
        {isListening ? (
          <div className="relative flex items-center justify-center">
            <Mic className="w-7 h-7 relative z-10" />
          </div>
        ) : (
          <MicOff className="w-7 h-7" />
        )}
      </button>
    </div>
  );
};

export default VoiceAssistant;
