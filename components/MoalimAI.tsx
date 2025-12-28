import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Brain, FileText, Upload, Sparkles, Loader2, Download, Copy, CheckCircle2, History, Trash2, X, FileType, Clock, Play, Check, Trophy, ArrowRight, RotateCcw, WifiOff, AlertTriangle, Layers, Bot, Code2 } from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
// @ts-ignore
import { asBlob } from 'html-docx-js-typescript';

declare var html2pdf: any;

interface HistoryItem {
  id: string;
  date: string;
  type: 'exam' | 'plan' | 'ideas' | 'automation';
  content: string;
  preview: string;
  quizData?: Question[]; 
}

interface Question {
  question: string;
  options: string[];
  answer: string;
}

const MoalimAI: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string, base64: string, mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [errorType, setErrorType] = useState<'quota' | 'network' | 'general' | null>(null);
  const [activeMode, setActiveMode] = useState<'exam' | 'plan' | 'ideas' | 'automation' | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lessonPeriods, setLessonPeriods] = useState<number>(1);
  
  // Quiz Game State
  const [quizData, setQuizData] = useState<Question[] | null>(null);
  const [showQuizGame, setShowQuizGame] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('moalim_ai_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  const saveToHistory = (type: 'exam' | 'plan' | 'ideas' | 'automation', content: string, qData?: Question[]) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type,
      content,
      preview: type === 'plan' ? `تحضير (${lessonPeriods} حصص) - منصة نور...` : content.substring(0, 100) + '...',
      quizData: qData
    };
    
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('moalim_ai_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm('هل أنت متأكد من حذف هذا العنصر من الأرشيف؟')) {
      const updated = history.filter(h => h.id !== id);
      setHistory(updated);
      localStorage.setItem('moalim_ai_history', JSON.stringify(updated));
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setResult(item.content);
    setActiveMode(item.type);
    setErrorType(null);
    if (item.quizData) {
        setQuizData(item.quizData);
    } else {
        setQuizData(null);
    }
    setShowHistory(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.type.startsWith('text/')) {
      alert('يرجى رفع ملف PDF أو ملف نصي فقط.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Raw = event.target?.result as string;
      const base64 = base64Raw.split(',')[1];
      setSelectedFile({
        name: file.name,
        base64: base64,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  // Helper to convert JSON quiz to Markdown for display/export
  const jsonToMarkdown = (questions: Question[]) => {
      let md = `# اختبار قصير\n\n`;
      questions.forEach((q, idx) => {
          md += `**${idx + 1}. ${q.question}**\n`;
          q.options.forEach(opt => {
              md += `- ${opt}\n`;
          });
          md += `\n*الإجابة الصحيحة: ${q.answer}*\n\n---\n\n`;
      });
      return md;
  };

  const generateContent = async (mode: 'exam' | 'plan' | 'ideas' | 'automation') => {
    if (!inputText && !selectedFile) {
      alert('الرجاء إدخال وصف المهمة أو نص الدرس أو رفع ملف PDF أولاً.');
      return;
    }

    setIsLoading(true);
    setActiveMode(mode);
    setResult('');
    setErrorType(null);
    setQuizData(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let prompt = "";
      let systemInstruction = "أنت مساعد ذكي وخبير تربوي وتقني للمعلمين.";
      let responseMimeType = "text/plain";

      if (mode === 'exam') {
          systemInstruction += " يجب أن تكون المخرجات بصيغة JSON حصراً.";
          prompt = `
            قم بإنشاء اختبار مكون من 10 أسئلة اختيار من متعدد بناءً على المحتوى.
            يجب أن يكون الرد مصفوفة JSON فقط (Array of Objects) بهذه الهيكلة تماماً:
            [
              {
                "question": "نص السؤال",
                "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
                "answer": "الخيار الصحيح (يجب أن يطابق حرفياً أحد الخيارات)"
              }
            ]
            لا تضف أي نص خارج JSON.
          `;
          responseMimeType = "application/json";
      } else if (mode === 'plan') {
         systemInstruction += " أنت خبير في التخطيط للدروس وفق متطلبات **منصة نور** حصراً.";
         prompt = `
            قم بإعداد تحضير درس احترافي وشامل للمحتوى المقدم وفق نموذج **منصة نور** بدقة متناهية.
            
            **تنبيه هام:** هذا الدرس يمتد لـ **(${lessonPeriods}) حصص**.
            يجب عليك تقسيم المحتوى والأهداف والإجراءات على ${lessonPeriods} حصص بشكل متسلسل ومنطقي.

            **المخرجات يجب أن تكون كود HTML فقط** (داخل div، بتنسيق RTL، وجداول أنيقة).

            لكل حصة (من 1 إلى ${lessonPeriods})، كرر الهيكل التالي بدقة:
            
            <h2 style="color:#2563eb; margin-top:30px; border-bottom:2px solid #2563eb; padding-bottom:5px;">الحصة رقم [رقم الحصة]: [عنوان فرعي لموضوع الحصة]</h2>

            ### 1. جدول التخطيط للحصة [رقم الحصة]
            أنشئ جدولاً عريضاً يحتوي الأعمدة التالية:
            *   **المخرجات التعليمية (الأهداف):** ضع **3 أهداف سلوكية فقط** لهذه الحصة.
            *   **المستوى:** (المعرفة - التطبيق - التحليل).
            *   **الاستراتيجيات:** حدد استراتيجية واحدة محددة لتنفيذ هذا الهدف بعينه (مثل: التعلم التعاوني، الرؤوس المرقمة، العصف الذهني، الخرائط الذهنية...الخ).
            *   **المصادر التعليمية:** حدد المصدر المستخدم لتنفيذ هذا الهدف (الكتاب، السبورة، عرض تقديمي، فيديو...الخ).

            ### 2. المفاهيم (الخاصة بالحصة)
            *   اذكر مفاهيم المادة الأساسية التي سيتم تغطيتها في هذه الحصة.

            ### 3. التمهيد / التعلم القبلي (لهذه الحصة)
            *   اكتب فقرة للتهيئة وتفعيل المعرفة السابقة لهذه الجزئية.

            ### 4. إجراءات سير الدرس / الأنشطة التدريسية
            **ملاحظة هامة:** لا تكتب وقتاً (دقائق) في هذا القسم.
            **خارطة الطريق:** لكل هدف من الأهداف الثلاثة التي وضعتها في الجدول أعلاه، اشرح بالتفصيل كيف ينفذه المعلم مستخدماً الاستراتيجية والمصدر المحددين له.
            
            يجب أن يكون الشرح على شكل خطوات متسلسلة لكل هدف، مثلاً:
            *   **تنفيذ الهدف الأول:** [نص الهدف]
                - يقوم المعلم بتطبيق استراتيجية [الاستراتيجية المختارة] باستخدام [المصدر] من خلال... (شرح الخطوات).
            
            *   **تنفيذ الهدف الثاني:** [نص الهدف]
                - يستخدم المعلم [المصدر] لتطبيق استراتيجية [الاستراتيجية المختارة] عبر... (شرح الخطوات).

            *   **تنفيذ الهدف الثالث:** [نص الهدف]
                - يقوم الطلاب بـ... (شرح الخطوات بناءً على الاستراتيجية).

            ### 5. التقويم (لهذه الحصة)
            *   **التقويم التكويني:** سؤال للتحقق من الفهم لكل هدف.
            *   **التقويم الختامي:** نشاط غلق للحصة.

            --- كرر ما سبق لكل حصة حتى تكتمل الـ ${lessonPeriods} حصص ---

            **ملاحظات للتنسيق (CSS):**
            - استخدم الخط 'Tajawal, sans-serif'.
            - اجعل خلفية رؤوس الجداول (th) باللون #eff6ff (أزرق فاتح جداً) والنص أزرق غامق.
            - الحدود (borders) بلون #e2e8f0.
            - Padding للخلايا 10px.
         `;
      } else if (mode === 'automation') {
         systemInstruction += " أنت مبرمج خبير في لغة Python و JavaScript وأدوات الأتمتة مثل Selenium و Puppeteer.";
         prompt = `
            قم بكتابة سكربت برمجي كامل (Code Script) لأتمتة المهمة التي طلبها المستخدم.
            
            المهمة المطلوبة: "${inputText}"
            
            المتطلبات:
            1. يفضل استخدام **Python** مع مكتبة **Selenium** للأتمتة (أو اقترح الأفضل للمهمة).
            2. اكتب الكود كاملاً بشكل منظم داخل بلوك كود.
            3. أضف تعليقات باللغة العربية تشرح كل خطوة في الكود.
            4. اشرح كيفية تثبيت المكتبات اللازمة (مثل \`pip install selenium\`).
            5. قدم نصائح هامة لتشغيل السكربت بنجاح على جهاز الكمبيوتر.
            
            تنبيه: تأكد أن الكود آمن وأخلاقي ولا ينتهك الخصوصية، ووجه المستخدم لاستخدامه في الأغراض التعليمية والإدارية المشروعة فقط.
         `;
      } else {
         systemInstruction += " أخرج النتائج بتنسيق Markdown عربي واضح ومنظم.";
         prompt = `
            اقترح 5 أفكار إبداعية واستراتيجيات تدريس ممتعة لشرح هذا الدرس للطلاب.
            لكل فكرة، اذكر:
            1. **عنوان الاستراتيجية** (مثلاً: الكرسي الساخن، الرؤوس المرقمة).
            2. **طريقة التنفيذ** (خطوات عملية وسريعة).
            3. **الهدف منها** (كيف تخدم الدرس الحالي).
            
            اجعل الأسلوب مشوقاً ومحفزاً للمعلم.
         `;
      }

      const parts: any[] = [{ text: prompt }];
      
      if (inputText && mode !== 'automation') {
        parts.push({ text: `نص الدرس / الموضوع: ${inputText}` });
      }

      if (selectedFile) {
        parts.push({
          inlineData: {
            mimeType: selectedFile.mimeType,
            data: selectedFile.base64
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: parts },
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          responseMimeType: responseMimeType,
        }
      });

      const rawText = response.text || "لم يتم استلام رد من النموذج.";
      
      if (mode === 'exam') {
          try {
              const parsedQuiz = JSON.parse(rawText);
              if (Array.isArray(parsedQuiz)) {
                  setQuizData(parsedQuiz);
                  const markdownText = jsonToMarkdown(parsedQuiz);
                  setResult(markdownText);
                  saveToHistory(mode, markdownText, parsedQuiz);
              } else {
                  setResult(rawText);
                  saveToHistory(mode, rawText);
              }
          } catch (e) {
              console.error("JSON Parse Error", e);
              setResult(rawText);
              saveToHistory(mode, rawText);
          }
      } else {
          setResult(rawText);
          saveToHistory(mode, rawText);
      }

    } catch (error: any) {
      console.error("Gemini Error:", error);
      const errString = error.toString().toLowerCase();
      
      if (errString.includes('429') || errString.includes('quota') || errString.includes('resource exhausted')) {
          setErrorType('quota');
          setResult("⚠️ عذراً، تم تجاوز حد الاستخدام المسموح به للذكاء الاصطناعي حالياً. يرجى الانتظار دقيقة والمحاولة مرة أخرى.");
      } else if (errString.includes('network') || errString.includes('fetch') || errString.includes('503')) {
          setErrorType('network');
          setResult("⚠️ تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.");
      } else {
          setErrorType('general');
          setResult("عذراً، حدث خطأ غير متوقع أثناء الاتصال بالذكاء الاصطناعي.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Quiz Game Logic ---
  const startQuiz = () => {
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowScore(false);
      setSelectedOption(null);
      setIsAnswerChecked(false);
      setShowQuizGame(true);
  };

  const handleOptionSelect = (option: string) => {
      if (isAnswerChecked) return;
      setSelectedOption(option);
  };

  const checkAnswer = () => {
      if (!selectedOption || !quizData) return;
      
      const isCorrect = selectedOption === quizData[currentQuestionIndex].answer;
      if (isCorrect) setScore(s => s + 1);
      
      setIsAnswerChecked(true);
  };

  const nextQuestion = () => {
      if (!quizData) return;
      if (currentQuestionIndex < quizData.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedOption(null);
          setIsAnswerChecked(false);
      } else {
          setShowScore(true);
      }
  };

  // Export & Utility functions
  const exportPDF = async () => {
    if (!resultRef.current) return;
    const element = resultRef.current;
    
    const opt = {
        margin: 10,
        filename: `MoalimAI_${activeMode}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        try {
            const worker = html2pdf().set(opt).from(element).toPdf();
            if (Capacitor.isNativePlatform()) {
                 const pdfBase64 = await worker.output('datauristring');
                 const base64Data = pdfBase64.split(',')[1];
                 const res = await Filesystem.writeFile({ path: opt.filename, data: base64Data, directory: Directory.Cache });
                 await Share.share({ title: "مساعد المعلم", url: res.uri });
            } else {
                 worker.save();
            }
        } catch (err) { console.error(err); }
    } else { alert('مكتبة PDF غير جاهزة'); }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = reader.result as string;
              resolve(base64.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  const exportWord = async () => {
      if (!result) return;
      const title = `MoalimAI_${activeMode}_${new Date().toISOString().split('T')[0]}`;
      
      const contentToExport = activeMode === 'plan' ? result : formatMarkdown(result);

      // إنشاء هيكل HTML متكامل مع دعم RTL لملف الوورد
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: right; vertical-align: top; }
            th { background-color: #f3f4f6; font-weight: bold; }
            h1, h2, h3 { color: #1e3a8a; margin-top: 20px; }
            ul, ol { margin-right: 20px; padding-right: 10px; }
            p { margin-bottom: 10px; }
          </style>
        </head>
        <body>
            <h2 style="text-align: center; margin-bottom: 20px; color: #333;">${title.replace(/_/g, ' ')}</h2>
            ${contentToExport}
        </body>
        </html>
      `;

      try {
          // استخدام مكتبة html-docx-js-typescript لتحويل HTML إلى ملف .docx حقيقي (Binary)
          // @ts-ignore
          const blob = await asBlob(htmlContent, {
              orientation: 'portrait',
              margins: { top: 720, right: 720, bottom: 720, left: 720 } // هوامش مناسبة
          });

          const fileName = `${title}.docx`; // الامتداد يجب أن يكون .docx

          if (Capacitor.isNativePlatform()) {
             const base64Data = await blobToBase64(blob as Blob);
             const res = await Filesystem.writeFile({ 
                 path: fileName, 
                 data: base64Data, 
                 directory: Directory.Cache 
             });
             await Share.share({ 
                 title: title, 
                 url: res.uri,
                 dialogTitle: 'مشاركة ملف وورد' 
             });
          } else {
             const url = URL.createObjectURL(blob as Blob);
             const link = document.createElement('a'); 
             link.href = url; 
             link.download = fileName;
             document.body.appendChild(link); 
             link.click(); 
             document.body.removeChild(link); 
             URL.revokeObjectURL(url);
          }
      } catch (e) { 
          console.error("Word Export Error:", e);
          alert('فشل تصدير ملف الوورد. يرجى المحاولة مرة أخرى.'); 
      }
  };

  const copyToClipboard = () => { 
      const textToCopy = resultRef.current ? resultRef.current.innerText : result;
      navigator.clipboard.writeText(textToCopy); 
      alert('تم نسخ النص!'); 
  };

  const formatMarkdown = (text: string) => {
    return text
      .replace(/```python([\s\S]*?)```/g, '<div dir="ltr" class="bg-slate-800 text-white p-4 rounded-lg my-2 font-mono text-xs overflow-x-auto whitespace-pre">$1</div>')
      .replace(/```javascript([\s\S]*?)```/g, '<div dir="ltr" class="bg-slate-800 text-white p-4 rounded-lg my-2 font-mono text-xs overflow-x-auto whitespace-pre">$1</div>')
      .replace(/```([\s\S]*?)```/g, '<div dir="ltr" class="bg-slate-800 text-white p-4 rounded-lg my-2 font-mono text-xs overflow-x-auto whitespace-pre">$1</div>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/## (.*?)\n/g, '<h3 class="text-lg font-bold text-blue-800 mt-4 mb-2">$1</h3>')
      .replace(/# (.*?)\n/g, '<h2 class="text-xl font-black text-blue-900 mt-5 mb-3">$1</h2>')
      .replace(/- (.*?)\n/g, '<li class="mr-4 list-disc">$1</li>')
      .replace(/\n/g, '<br />');
  };

  const renderContent = () => {
      if (errorType) {
          return (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                  {errorType === 'quota' && (
                      <div className="bg-amber-50 p-6 rounded-full">
                          <Clock className="w-12 h-12 text-amber-500" />
                      </div>
                  )}
                  {errorType === 'network' && (
                      <div className="bg-rose-50 p-6 rounded-full">
                          <WifiOff className="w-12 h-12 text-rose-500" />
                      </div>
                  )}
                  {errorType === 'general' && (
                      <div className="bg-gray-50 p-6 rounded-full">
                          <AlertTriangle className="w-12 h-12 text-gray-500" />
                      </div>
                  )}
                  <p className="text-gray-700 font-bold max-w-xs">{result}</p>
                  <button onClick={() => generateContent(activeMode!)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-colors">
                      إعادة المحاولة
                  </button>
              </div>
          );
      }

      if (!result) return null;

      if (activeMode === 'plan') {
          return (
              <div 
                className="prose prose-sm max-w-none font-medium text-gray-700 leading-relaxed overflow-x-auto" 
                ref={resultRef}
                dangerouslySetInnerHTML={{ __html: result }} 
              />
          );
      } else {
          return (
              <div 
                className="prose prose-sm max-w-none font-medium text-gray-700 leading-relaxed" 
                ref={resultRef}
                dangerouslySetInnerHTML={{ __html: formatMarkdown(result) }} 
              />
          );
      }
  };

  const getModeLabel = (mode: string) => {
      switch(mode) {
          case 'exam': return 'اختبار';
          case 'plan': return 'تحضير (نور)';
          case 'ideas': return 'أفكار';
          case 'automation': return 'أتمتة ويب';
          default: return mode;
      }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in duration-500 relative">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden flex justify-between items-start">
        <div className="relative z-10">
          <h2 className="text-2xl font-black flex items-center gap-2 mb-1">
            <Brain className="w-8 h-8 text-fuchsia-200" />
            مساعد المعلم الذكي
          </h2>
          <p className="text-purple-100 text-xs font-bold max-w-md">
            قم بتوليد الاختبارات، خطط الدروس، أكواد الأتمتة، والأفكار الإبداعية.
          </p>
        </div>
        
        <button 
            onClick={() => setShowHistory(true)} 
            className="relative z-10 bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-colors backdrop-blur-sm"
            title="الأرشيف والسجل"
        >
            <History className="w-6 h-6 text-white" />
        </button>

        <Sparkles className="absolute top-4 left-4 w-24 h-24 text-white opacity-10 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Input Section */}
        <div className="space-y-4">
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-black text-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500"/>
                        المدخلات / المهمة
                    </label>
                    <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                        <span className="text-[10px] font-bold text-gray-500">عدد الحصص (للتحضير):</span>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setLessonPeriods(Math.max(1, lessonPeriods - 1))}
                                className="w-5 h-5 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:bg-gray-100"
                            >-</button>
                            <span className="text-sm font-black text-blue-600 w-4 text-center">{lessonPeriods}</span>
                            <button 
                                onClick={() => setLessonPeriods(Math.min(9, lessonPeriods + 1))}
                                className="w-5 h-5 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:bg-gray-100"
                            >+</button>
                        </div>
                    </div>
                </div>
                
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="اكتب هنا: نص الدرس، وصف المهمة للأتمتة، أو الموضوع..."
                    className="w-full h-40 bg-gray-50 rounded-2xl p-4 text-sm font-medium outline-none border border-transparent focus:border-blue-500/30 focus:bg-white transition-all resize-none"
                />
                
                <div className="mt-4">
                    <label className={`w-full border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${selectedFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
                        <input type="file" accept="application/pdf, text/plain" className="hidden" onChange={handleFileUpload} />
                        {selectedFile ? (
                            <div className="text-center animate-in zoom-in">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                <span className="text-xs font-black text-emerald-700 block">{selectedFile.name}</span>
                                <span className="text-[10px] text-emerald-500 font-bold">اضغط للتغيير</span>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400">
                                <Upload className="w-6 h-6 mx-auto mb-2" />
                                <span className="text-xs font-bold">اضغط لرفع ملف PDF</span>
                            </div>
                        )}
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button 
                    onClick={() => generateContent('exam')}
                    disabled={isLoading}
                    className="bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-sm group min-h-[100px]"
                >
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-gray-700 text-center">إنشاء اختبار</span>
                </button>

                <button 
                    onClick={() => generateContent('plan')}
                    disabled={isLoading}
                    className="bg-white border border-purple-100 hover:border-purple-300 hover:bg-purple-50 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-sm group min-h-[100px]"
                >
                    <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-gray-700 text-center">تحضير (نور)</span>
                    {lessonPeriods > 1 && <span className="text-[8px] bg-purple-200 text-purple-800 px-1.5 rounded-full">{lessonPeriods} حصص</span>}
                </button>

                <button 
                    onClick={() => generateContent('ideas')}
                    disabled={isLoading}
                    className="bg-white border border-amber-100 hover:border-amber-300 hover:bg-amber-50 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-sm group min-h-[100px]"
                >
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-gray-700 text-center">أفكار إبداعية</span>
                </button>

                <button 
                    onClick={() => generateContent('automation')}
                    disabled={isLoading}
                    className="bg-white border border-slate-100 hover:border-slate-300 hover:bg-slate-50 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-sm group min-h-[100px]"
                >
                    <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Bot className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-gray-700 text-center">أتمتة الويب</span>
                </button>
            </div>
        </div>

        {/* Output Section */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full min-h-[500px] relative overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-800 flex items-center gap-2">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600"/> : <Sparkles className="w-4 h-4 text-fuchsia-500"/>}
                    {result && !errorType ? 'النتيجة المولدة' : 'مساحة العمل'}
                </h3>
                {result && !errorType && (
                    <div className="flex gap-2">
                        {quizData && (
                            <button onClick={startQuiz} className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 active:scale-95 transition-all flex items-center gap-2 text-[10px] font-black animate-in zoom-in">
                                <Play className="w-3 h-3 fill-white" />
                                مسابقة تفاعلية
                            </button>
                        )}
                        <button onClick={copyToClipboard} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-xl shadow-sm border border-gray-200" title="نسخ"><Copy className="w-4 h-4"/></button>
                        <button onClick={exportWord} className="p-2 text-blue-600 hover:text-blue-700 bg-blue-50 rounded-xl shadow-sm border border-blue-100" title="تصدير Word"><FileText className="w-4 h-4"/></button>
                        <button onClick={exportPDF} className="p-2 text-red-500 hover:text-red-600 bg-red-50 rounded-xl shadow-sm border border-red-100" title="تصدير PDF"><Download className="w-4 h-4"/></button>
                    </div>
                )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-50/30">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
                            <Brain className="w-8 h-8 text-violet-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <p className="text-sm font-bold animate-pulse">جاري معالجة الطلب...</p>
                    </div>
                ) : result || errorType ? (
                    <>
                        {renderContent()}
                        {!errorType && (
                            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
                                تم التوليد بواسطة مساعد المعلم الذكي (Moalim AI)
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <Brain className="w-20 h-20 mb-4 opacity-20" />
                        <p className="text-sm font-bold">النتائج ستظهر هنا</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* History Sidebar/Modal */}
      {showHistory && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowHistory(false)}>
              <div className="bg-white w-full max-w-sm h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                      <h3 className="font-black text-gray-900 flex items-center gap-2"><History className="w-5 h-5 text-violet-600"/> الأرشيف</h3>
                      <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                      {history.length === 0 ? (
                          <div className="text-center py-10 text-gray-400">
                              <History className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                              <p className="text-xs font-bold">السجل فارغ</p>
                          </div>
                      ) : (
                          history.map(item => (
                              <div key={item.id} onClick={() => loadFromHistory(item)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-violet-200 hover:shadow-md transition-all cursor-pointer group relative">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${item.type === 'exam' ? 'bg-blue-50 text-blue-600' : item.type === 'plan' ? 'bg-purple-50 text-purple-600' : item.type === 'automation' ? 'bg-slate-50 text-slate-600' : 'bg-amber-50 text-amber-600'}`}>
                                          {getModeLabel(item.type)}
                                      </span>
                                      <button onClick={(e) => deleteHistoryItem(item.id, e)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                                  <p className="text-xs text-gray-600 font-medium line-clamp-2 leading-relaxed mb-2">{item.preview}</p>
                                  <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold">
                                      <Clock className="w-3 h-3" />
                                      {new Date(item.date).toLocaleDateString('ar-EG')} - {new Date(item.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Quiz Game Modal Overlay */}
      {showQuizGame && quizData && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex flex-col animate-in fade-in duration-300">
              {/* Game Header */}
              <div className="p-4 md:p-6 flex justify-between items-center bg-slate-800 text-white shadow-md z-10 shrink-0">
                  <h3 className="text-base md:text-lg font-black flex items-center gap-2">
                      <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                      مسابقة تفاعلية
                  </h3>
                  <button onClick={() => setShowQuizGame(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X className="w-5 h-5 md:w-6 md:h-6 text-white"/></button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 w-full overflow-y-auto custom-scrollbar p-4">
                  <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                      {!showScore ? (
                          <div className="w-full flex flex-col justify-center gap-4 min-h-full py-2">
                              {/* Progress Bar */}
                              <div className="w-full h-2 md:h-3 bg-slate-700/50 rounded-full overflow-hidden shrink-0">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                                    style={{ width: `${((currentQuestionIndex + 1) / quizData.length) * 100}%` }}
                                  ></div>
                              </div>

                              {/* Question Card */}
                              <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl text-center animate-in slide-in-from-bottom duration-500 border-b-4 md:border-b-8 border-slate-200 flex flex-col items-center justify-center min-h-[150px] md:min-h-[200px]">
                                  <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] md:text-xs font-black mb-4">
                                      السؤال {currentQuestionIndex + 1} / {quizData.length}
                                  </span>
                                  <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-slate-800 leading-relaxed md:leading-snug">
                                      {quizData[currentQuestionIndex].question}
                                  </h2>
                              </div>

                              {/* Options Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                  {quizData[currentQuestionIndex].options.map((option, idx) => {
                                      let btnClass = "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";
                                      const isSelected = selectedOption === option;
                                      const isCorrect = option === quizData[currentQuestionIndex].answer;
                                      
                                      if (isAnswerChecked) {
                                          if (isCorrect) btnClass = "bg-emerald-500 text-white border-emerald-600 shadow-[0_4px_0_rgb(5,150,105)] translate-y-[-2px]";
                                          else if (isSelected) btnClass = "bg-rose-500 text-white border-rose-600 opacity-80";
                                          else btnClass = "bg-slate-100 text-slate-400 border-slate-200 opacity-50";
                                      } else if (isSelected) {
                                          btnClass = "bg-blue-600 text-white border-blue-700 shadow-[0_4px_0_rgb(29,78,216)] translate-y-[-2px]";
                                      } else {
                                          btnClass = "bg-white text-slate-700 border-b-4 border-slate-200 hover:border-blue-300 hover:bg-blue-50 active:border-t-4 active:border-b-0 active:translate-y-[4px] transition-all";
                                      }

                                      return (
                                          <button 
                                              key={idx}
                                              onClick={() => handleOptionSelect(option)}
                                              disabled={isAnswerChecked}
                                              className={`p-4 md:p-6 rounded-xl md:rounded-2xl text-base md:text-xl font-black transition-all duration-200 ${btnClass} flex items-center justify-between min-h-[70px] md:min-h-[90px]`}
                                          >
                                              <span className="text-right">{option}</span>
                                              {isAnswerChecked && isCorrect && <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-white animate-bounce shrink-0" />}
                                          </button>
                                      );
                                  })}
                              </div>

                              {/* Control Bar */}
                              <div className="mt-2 md:mt-6 flex justify-center pb-4 shrink-0">
                                  {!isAnswerChecked ? (
                                      <button 
                                        onClick={checkAnswer} 
                                        disabled={!selectedOption}
                                        className="w-full md:w-auto px-12 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
                                      >
                                          تأكيد الإجابة
                                      </button>
                                  ) : (
                                      <button 
                                        onClick={nextQuestion} 
                                        className="w-full md:w-auto px-12 py-3.5 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2 animate-in zoom-in"
                                      >
                                          السؤال التالي <ArrowRight className="w-5 h-5"/>
                                      </button>
                                  )}
                              </div>
                          </div>
                      ) : (
                          <div className="flex-1 flex flex-col items-center justify-center p-4">
                              <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 text-center max-w-md w-full shadow-2xl animate-in zoom-in duration-500">
                                  <div className="w-24 h-24 md:w-32 md:h-32 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-200">
                                      <Trophy className="w-12 h-12 md:w-16 md:h-16 text-yellow-500 animate-pulse" />
                                  </div>
                                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">انتهى الاختبار!</h2>
                                  <p className="text-sm md:text-base text-slate-500 font-bold mb-8">لقد أجبت بشكل صحيح على</p>
                                  
                                  <div className="text-5xl md:text-6xl font-black text-indigo-600 mb-2">{score}</div>
                                  <div className="text-lg md:text-xl font-bold text-gray-400 mb-10">من {quizData.length} أسئلة</div>

                                  <div className="flex flex-col gap-3">
                                      <button onClick={startQuiz} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                          <RotateCcw className="w-5 h-5" /> إعادة المحاولة
                                      </button>
                                      <button onClick={() => setShowQuizGame(false)} className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all">
                                          خروج
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default MoalimAI;