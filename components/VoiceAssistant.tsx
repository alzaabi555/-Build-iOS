import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2, Volume2, CheckCircle, XCircle } from 'lucide-react';
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

  // 1️⃣ تنظيف النص
  const normalizeText = (text: string) => {
    return text
      .replace(/[\u064B-\u065F\u0640]/g, '') // إزالة التشكيل
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/^(ل|ب|ك|ف)/, '') // إزالة الحروف المتصلة من بداية الكلمة للتسهيل
      .toLowerCase();
  };

  // 2️⃣ استخراج الأرقام (الكميات) من الصوت
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
    return 1; // الافتراضي
  };

  // 3️⃣ خريطة طرق تعتمد على قاموس (Translations) الخاص بتطبيقك
  const getTargetRoute = (text: string): string | null => {
    const cmd = text.toLowerCase();
    
    // التوافق مع: navDashboard, dashboardMenu, رئيسية
    if (cmd.match(/(رئيسي|داشبورد|لوحه القياده|شاشه رئيسي)/)) return 'dashboard';
    
    // التوافق مع: navReports, reportsMenu, تقارير
    if (cmd.match(/(تقرير|تقارير|احصائيات|نتايج|نتائج|شهادات|استدعاء)/)) return 'reports';
    
    // التوافق مع: navGrades, gradesMenu, درجات
    if (cmd.match(/(درجات|درجه|رصد|سجل الدرجات)/)) return 'grades';
    
    // التوافق مع: navAttendance, attendanceMenu, حضور
    if (cmd.match(/(حضور|غياب|سجل الغياب|تحضير)/)) return 'attendance';
    
    // التوافق مع: navStudents, studentsMenu, طلاب
    if (cmd.match(/(طلاب|طلبه|قائمه الطلاب|سجل الطلاب|وارد الاباء)/)) return 'students';
    
    // التوافق مع: navGroups, groupsMenu, مجموعات
    if (cmd.match(/(مجموع|مجموعات|فرق|مجموعه)/)) return 'groups';
    
    // التوافق مع: navKnights, knightsMenu, فرسان
    if (cmd.match(/(فرسان|شرف|اوائل|متصدر|لوحه الشرف)/)) return 'leaderboard';
    
    // التوافق مع: navTasks, tasksMenu, مهام
    if (cmd.match(/(مهام|واجب|تاسك|مهمه)/)) return 'tasks';
    
    // التوافق مع: navLibrary, libraryMenu, مكتبة
    if (cmd.match(/(مكتبه|مكتبة|مصادر|كتب|ملفات)/)) return 'library';
    
    // التوافق مع: navSync, syncMenu, مزامنة
    if (cmd.match(/(مزامنه|مزامنة|سحاب|تزامن|رفع|باك اب|احتياطي|نسخ)/)) return 'sync';
    
    // التوافق مع: navSettings, settingsMenu, إعدادات
    if (cmd.match(/(اعدادات|ضبط|خصائص|تفضيل)/)) return 'settings';
    
    // التوافق مع: navGuide, userGuide, دليل
    if (cmd.match(/(دليل|شرح|مساعده|استخدام)/)) return 'guide';
    
    // التوافق مع: navAbout, aboutMenu, حول
    if (cmd.match(/(حول|عن التطبيق|تطبيق)/)) return 'about';
    
    // في حال طلب الخروج / تسجيل خروج
    if (cmd.match(/(قفل|خروج|اغلاق)/)) {
       window.location.reload();
       return null;
    }

    return null;
  };

  // 🧠 المعالج اللغوي المطور والفاصل بين التنقل والتقييم
  const processCommand = (command: string) => {
    if (!command.trim()) return;
    
    // نحتفظ بالنص الأصلي لبعض العمليات
    const originalText = command.trim();
    const text = normalizeText(originalText);
    
    // أ) تصنيف نية المتحدث (هل يريد الانتقال أم يريد تقييم طالب؟)
    const isNavigationWord = text.match(/(افتح|روح|انتقل|عرض|هات|صفح|شاش|ودني|ورني|قسم)/);
    const targetRoute = getTargetRoute(text);

    // ب) البحث عن الطالب
    let foundStudent: Student | undefined;
    for (const s of studentsRef.current) {
      const studentWords = s.name.split(' ').map(normalizeText);
      const firstName = studentWords[0];
      
      if (firstName.length >= 2 && text.includes(firstName)) {
        foundStudent = s;
        // تقوية التطابق في حال ذكر الاسم الثاني
        if (studentWords.length > 1 && text.includes(studentWords[1])) {
          break; // تطابق قوي جداً
        }
      }
    }

    // ==========================================
    // 1️⃣ أولوية التنقل: إذا نطق كلمة واضحة للتنقل (بدون اسم طالب، أو بوجود كلمة "افتح")
    // ==========================================
    if (targetRoute && (isNavigationWord || !foundStudent)) {
      if (navigateRef.current) {
        navigateRef.current(targetRoute);
        setFeedback({ message: `جاري الانتقال...`, type: 'success' });
        // speak(`جاري فتح القسم`); // قللناها لعدم الإزعاج
        return;
      }
    }

    // ==========================================
    // 2️⃣ أولوية تقييم الطالب (إذا وجدنا اسم طالب، والنية ليست تنقلاً صريحاً)
    // ==========================================
    if (foundStudent && !isNavigationWord) {
      
      const isAbsent = text.match(/(غايب|غائب|غياب|غاب|مريض)/);
      const isPresent = text.match(/(حاضر|حضر|موجود)/);
      // الكلمات السلبية صارمة لمنع التداخل
      const isNegative = text.match(/(خصم|ناقص|ازعاج|مزعج|نايم|نام|تاخير|متاخر|خطا|غلط|سيء|ضعيف|نقص|اسحب)/);
      // الكلمات الإيجابية (تعمل فقط إذا لم تكن الجملة سلبية)
      const isPositive = !isNegative && text.match(/(نجم|نقط|درج|ممتاز|بطل|مشارك|صح|شاطر|كفو|عظيم|مبدع|زيد|اعط|ضيف)/);
      
      const amount = extractAmount(text);

      if (isAbsent) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, attendance: [...(s.attendance || []), { date: new Date().toISOString(), status: 'absent' }] } : s));
        setFeedback({ message: `غياب: ${foundStudent.name}`, type: 'success' });
        speak(`تم الغياب`);
        return;
      }
      else if (isPresent) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, attendance: [...(s.attendance || []), { date: new Date().toISOString(), status: 'present' }] } : s));
        setFeedback({ message: `حضور: ${foundStudent.name}`, type: 'success' });
        return;
      }
      else if (isNegative) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, behaviors: [...(s.behaviors || []), { id: Math.random().toString(), date: new Date().toISOString(), description: `تقويم سلوك (${amount})`, type: 'negative', points: -amount }] } : s));
        setFeedback({ message: `خصم ${amount} من: ${foundStudent.name}`, type: 'success' });
        speak(`خصم ${amount}`);
        return;
      }
      else if (isPositive) {
        setStudents(prev => prev.map(s => s.id === foundStudent!.id ? { ...s, behaviors: [...(s.behaviors || []), { id: Math.random().toString(), date: new Date().toISOString(), description: `مشاركة وتفاعل (${amount})`, type: 'positive', points: amount }] } : s));
        setFeedback({ message: `إضافة ${amount} لـ: ${foundStudent.name}`, type: 'success' });
        speak(`إضافة ${amount}`);
        return;
      }
      else {
        // وجد الاسم لكن لم يفهم الفعل
        setFeedback({ message: `الطالب ${foundStudent.name.split(' ')[0]} موجود، ماذا أفعل؟`, type: 'error' });
        return;
      }
    }

    // ==========================================
    // 3️⃣ الرد عند عدم فهم أي شيء
    // ==========================================
    setFeedback({ message: `أمر غير واضح: "${originalText}"`, type: 'error' });
  };

  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.lang = 'ar-OM'; 

    recognition.onstart = () => {
      setIsListening(true);
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
        setFeedback({ message: 'تم الإيقاف', type: null });
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
         shouldListenRef.current = false;
         setIsListening(false);
         setFeedback({ message: 'الرجاء السماح للتطبيق باستخدام المايكروفون', type: 'error' });
      }
    };

    recognitionRef.current = recognition;

    return () => {
       shouldListenRef.current = false;
       recognition.stop();
    }
  }, []); 

  const toggleListening = useCallback(() => {
    shouldListenRef.current = !shouldListenRef.current;
    if (shouldListenRef.current) {
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    } else {
      recognitionRef.current?.stop();
    }
  }, []);

  if (!SpeechRecognition) return null;

  return (
    <div className={`fixed bottom-6 ${dir === 'rtl' ? 'left-6' : 'right-6'} z-[99999] flex flex-col items-${dir === 'rtl' ? 'start' : 'end'} pointer-events-none`} dir={dir}>
      
      {(isListening || transcript || feedback.message) && (
        <div className="mb-4 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl p-4 max-w-sm pointer-events-auto animate-in slide-in-from-bottom-2 fade-in shadow-indigo-500/10">
          <div className="flex items-center gap-2 mb-2">
            {isListening ? (
              <div className="flex items-center gap-1.5 bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[11px] font-bold animate-pulse tracking-wide">
                <div className="w-2 h-2 bg-rose-600 rounded-full animate-ping"></div> وضع التجول نشط
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
