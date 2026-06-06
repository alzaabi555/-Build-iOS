import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, CheckCircle, XCircle, Bot } from 'lucide-react';
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
  const feedbackTimerRef = useRef<NodeJS.Timeout>();
  
  // 🌟 هذا هو السر الجديد: متغير يخبر التطبيق أنك تريد المايك مفتوحاً دائماً
  const isIntentionallyListening = useRef(false); 

  const studentsRef = useRef(students);
  useEffect(() => { studentsRef.current = students; }, [students]);
  const navigateRef = useRef(onNavigate);
  useEffect(() => { navigateRef.current = onNavigate; }, [onNavigate]);

  // 🗣️ التحدث بصوت المساعد
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.1; 
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const displayFeedback = useCallback((msg: string, type: 'success' | 'error' | 'info' | null, spokenText?: string) => {
    setFeedback({ message: msg, type });
    if (spokenText) speak(spokenText); 

    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback({ message: '', type: null }); 
    }, 4000); 
  }, [speak]);

  // 🧹 معالجة النصوص 
  const normalizeText = (text: string) => {
    return text
      .replace(/[\u064B-\u065F\u0640]/g, '') 
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .toLowerCase().trim();
  };

  const extractAmount = (text: string): number => {
    if (text.match(/(نقطتين|درجتين|نجمتين|علامتين|اثنين|مرتين|2)/)) return 2;
    if (text.match(/(ثلاث|3)/)) return 3;
    if (text.match(/(اربع|4)/)) return 4;
    if (text.match(/(خمس|5)/)) return 5;
    if (text.match(/(ست|6)/)) return 6;
    if (text.match(/(عشر|10)/)) return 10;
    return 1; 
  };

  // 🧠 المعالج اللغوي
  const processCommand = useCallback((command: string) => {
    if (!command.trim()) return;
    const text = normalizeText(command);
    
    // 1. أوامر الانتقال السريع (تمت إعادة "المزيد" وتوسيع الكلمات)
    const isNavigationWord = text.match(/(افتح|روح|انتقل|عرض|هات|صفح|شاش|ودني|ورني|قسم|مزيد|المزيد)/);
    if (isNavigationWord || text.match(/(المزيد|اعدادات)/)) {
        if (text.match(/(رئيسي|داشبورد|لوحه)/)) { navigateRef.current?.('dashboard'); displayFeedback('تم', 'success'); return; }
        if (text.match(/(تقرير|احصائيات|نتايج)/)) { navigateRef.current?.('reports'); displayFeedback('تم', 'success'); return; }
        if (text.match(/(درجات|رصد)/)) { navigateRef.current?.('grades'); displayFeedback('تم', 'success'); return; }
        if (text.match(/(حضور|غياب|تحضير)/)) { navigateRef.current?.('attendance'); displayFeedback('تم', 'success'); return; }
        if (text.match(/(طلاب|طلبه)/)) { navigateRef.current?.('students'); displayFeedback('تم', 'success'); return; }
        if (text.match(/(فرسان|شرف|اوائل)/)) { navigateRef.current?.('leaderboard'); displayFeedback('تم', 'success'); return; }
        if (text.match(/(مزيد|المزيد|اعدادات|قائمه)/)) { navigateRef.current?.('more'); displayFeedback('تم', 'success'); return; } // 🌟 إصلاح المزيد
    }

    // 2. البحث عن الطالب
    let foundStudent: Student | undefined;
    const searchWords = text.split(' ').filter(w => !w.match(/^(ل|ب|ك|ف|ال|يا)$/)); // فلترة سريعة
    
    for (const s of studentsRef.current) {
      const studentWords = s.name.split(' ').map(normalizeText);
      const firstName = studentWords[0];
      
      if (firstName.length >= 2 && text.includes(firstName)) {
        foundStudent = s;
        if (studentWords.length > 1 && text.includes(studentWords[1])) break; 
      }
    }

    // 3. تنفيذ الأوامر على الطالب
    if (foundStudent) {
      const isAbsent = text.match(/(غايب|غائب|غياب|غاب|مريض)/);
      const isPresent = text.match(/(حاضر|حضر|موجود)/);
      const isNegative = text.match(/(خصم|ناقص|ازعاج|مزعج|نايم|تاخير|متاخر|خطا|غلط|سيء|نقص|اسحب)/);
      const isPositive = !isNegative && text.match(/(نجم|نقط|درج|ممتاز|بطل|مشارك|صح|شاطر|كفو|عظيم|مبدع|زيد|اعط|ضيف)/);
      const amount = extractAmount(text);
      const shortName = foundStudent.name.split(' ')[0];

      if (isAbsent) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, attendance: [...(s.attendance || []), { date: new Date().toISOString(), status: 'absent' }] } : s));
        displayFeedback(`تم تسجيل غياب: ${foundStudent.name}`, 'success', `غياب ${shortName}`); 
        return;
      }
      else if (isPresent) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, attendance: [...(s.attendance || []), { date: new Date().toISOString(), status: 'present' }] } : s));
        displayFeedback(`تم تحضير: ${foundStudent.name}`, 'success', `حاضر ${shortName}`); 
        return;
      }
      else if (isNegative) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, behaviors: [...(s.behaviors || []), { id: Math.random().toString(), date: new Date().toISOString(), description: `تقويم سلوك (${amount})`, type: 'negative', points: -amount }] } : s));
        displayFeedback(`خصم ${amount} من: ${foundStudent.name}`, 'success', `خصم ${amount} من ${shortName}`); 
        return;
      }
      else if (isPositive) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, behaviors: [...(s.behaviors || []), { id: Math.random().toString(), date: new Date().toISOString(), description: `مشاركة وتفاعل (${amount})`, type: 'positive', points: amount }] } : s));
        displayFeedback(`إضافة ${amount} لـ: ${foundStudent.name}`, 'success', `تم لـ ${shortName}`); 
        return;
      }
    }

    displayFeedback(`لم أفهم: "${command}"`, 'error');
  }, [displayFeedback, setStudents]);

  // 🎙️ محرك الاستماع المستمر (Continuous Engine)
  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // 🌟 عودة الاستماع المستمر المفتوح
    recognition.interimResults = false; // الانتظار حتى تنهي الجملة لسرعة التنفيذ
    recognition.lang = 'ar-OM'; 

    recognition.onstart = () => { 
        setIsListening(true); 
        setFeedback({ message: 'راصد يستمع إليك باستمرار...', type: 'info' }); 
    };
    
    recognition.onresult = (event: any) => {
        // التقاط الجملة الأخيرة فقط من سلسلة الاستماع المستمر
        const currentIdx = event.resultIndex;
        const finalText = event.results[currentIdx][0].transcript;
        
        setTranscript(finalText);
        if (finalText) {
            processCommand(finalText);
        }
    };

    recognition.onend = () => {
        // 🛡️ هذا هو محرك الإنعاش: إذا أغلق الأندرويد المايك، نفتحه نحن فوراً ما دمت لم تضغط زر الإيقاف!
        if (isIntentionallyListening.current) {
            try {
                recognition.start();
            } catch (error) {
                // إذا فشل الإنعاش الفوري، ننتظر نصف ثانية ونحاول مجدداً بصمت
                setTimeout(() => {
                    if (isIntentionallyListening.current && recognitionRef.current) {
                        try { recognitionRef.current.start(); } catch (e) {}
                    }
                }, 500);
            }
        } else {
            setIsListening(false);
        }
    };

    recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
            isIntentionallyListening.current = false;
            setIsListening(false);
            displayFeedback('الرجاء السماح للتطبيق باستخدام المايكروفون', 'error');
        }
        // تجاهل أخطاء الصمت لأن محرك الإنعاش سيعالجه
    };

    recognitionRef.current = recognition;

    return () => { 
        isIntentionallyListening.current = false;
        recognition.stop(); 
    };
  }, [processCommand, displayFeedback]); 

  // 🎯 زر التشغيل والإيقاف اليدوي
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
        displayFeedback('متصفحك لا يدعم الأوامر الصوتية', 'error');
        return;
    }

    if (isListening) {
        isIntentionallyListening.current = false; // إيقاف مقصود من المستخدم
        recognitionRef.current.stop();
        setFeedback({ message: 'تم إيقاف المساعد الصوتي', type: 'info' });
        speak('تم الإيقاف');
    } else {
        isIntentionallyListening.current = true; // تشغيل مقصود للاستماع المستمر
        try {
            speak('معك أستاذي'); 
            setTimeout(() => {
                recognitionRef.current.start();
            }, 500);
        } catch (e) {
            console.warn(e);
        }
    }
  }, [isListening, displayFeedback, speak]);

  if (!SpeechRecognition) return null;

  return (
    <div className={`fixed bottom-24 md:bottom-8 ${dir === 'rtl' ? 'left-6' : 'right-6'} z-[99999] flex flex-col items-${dir === 'rtl' ? 'start' : 'end'} pointer-events-none`} dir={dir}>
      {/* 💭 فقاعة المحادثة */}
      {(isListening || transcript || feedback.message) && (
        <div className="mb-4 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-3xl p-4 max-w-xs md:max-w-sm pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300 shadow-indigo-500/20">
          <div className="flex items-center gap-2 mb-2">
            {isListening ? (
              <div className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[11px] font-bold animate-pulse tracking-wide">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div> المايك مفتوح...
              </div>
            ) : feedback.type === 'success' ? (
              <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> تم التنفيذ
              </div>
            ) : feedback.type === 'error' ? (
              <div className="flex items-center gap-1.5 bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[11px] font-bold">
                <XCircle className="w-3.5 h-3.5" /> تنبيه
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[11px] font-bold">
                <Bot className="w-3.5 h-3.5" /> راصد
              </div>
            )}
          </div>
          <p className="text-sm font-bold text-slate-800 leading-relaxed min-h-[1.5rem]">
            {transcript || feedback.message}
          </p>
        </div>
      )}

      {/* 🎤 الزر الرئيسي */}
      <button
        onClick={toggleListening}
        className={`pointer-events-auto flex items-center justify-center w-16 h-16 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.15)] transition-all duration-300 active:scale-90 ${
          isListening 
            ? 'bg-rose-500 text-white shadow-rose-500/40 ring-4 ring-rose-500/20 scale-110' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-600/30'
        }`}
      >
        {isListening ? (
          <div className="relative flex items-center justify-center">
            <Mic className="w-7 h-7 relative z-10 animate-pulse" />
          </div>
        ) : (
          <MicOff className="w-7 h-7" />
        )}
      </button>
    </div>
  );
};

export default VoiceAssistant;
