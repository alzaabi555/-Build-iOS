
import React, { useRef, useState } from 'react';
import { 
  BookOpen, Download, Globe, BarChart3, CalendarCheck, Users, 
  GraduationCap, Trophy, FileSpreadsheet, Settings, 
  Search, Filter, Plus, Edit, Trash2, Share, CheckCircle2, 
  AlertTriangle, MessageCircle, Smartphone, Clock, LayoutGrid, 
  MoreHorizontal, RefreshCw, Star, Shield, Zap, ChevronLeft
} from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share as SharePlugin } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

declare var html2pdf: any;

const UserGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [isExporting, setIsExporting] = useState(false);

  const sections = [
    {
      id: 'dashboard',
      title: 'الرئيسية والإعدادات',
      icon: BarChart3,
      color: 'blue',
      content: `
        <div class="guide-intro">
            <p>تعتبر لوحة التحكم هي مركز العمليات اليومي. تم تصميمها لتعطيك نظرة شمولية فورية.</p>
        </div>
        <div class="feature-block">
            <h3>1. الشريط العلوي (الترحيب والهوية)</h3>
            <p>يحتوي المستطيل العلوي الملون على اسم المعلم، المدرسة، والمادة.</p>
            <ul>
                <li><strong>زر التعديل (القلم):</strong> اضغط على أيقونة القلم الصغيرة بجانب الاسم لتعديل بياناتك (الاسم، المدرسة، المادة، المحافظة). هذه البيانات تظهر تلقائياً في التقارير والشهادات.</li>
                <li><strong>زر الإعدادات (الترس):</strong> يظهر في الزاوية للوصول السريع لخيارات التطبيق العامة.</li>
            </ul>
        </div>
        <div class="feature-block">
            <h3>2. الجدول المدرسي وإدارة الوقت</h3>
            <ul>
                <li><strong>عرض الجدول:</strong> يظهر جدول حصص اليوم الحالي تلقائياً. يمكنك التنقل بين الأيام بالضغط على أزرار الأيام.</li>
                <li><strong>زر "تعديل":</strong> يفتح نافذة لكتابة المواد أو الفصول لكل حصة يدوياً.</li>
                <li><strong>زر "التوقيت" (Clock):</strong> ميزة حيوية! اضغط عليها لضبط وقت بداية ونهاية كل حصة.</li>
            </ul>
        </div>
      `
    },
    {
      id: 'students',
      title: 'إدارة الطلاب والفصول',
      icon: Users,
      color: 'indigo',
      content: `
        <div class="guide-intro">
            <p>قسم الطلاب هو القلب النابض للتطبيق. هنا يتم إضافة البيانات وتعديلها.</p>
        </div>
        <div class="feature-block">
            <h3>1. إضافة الطلاب</h3>
            <ul>
                <li><strong>الإضافة اليدوية (+):</strong> الزر الأزرق يفتح نافذة لإدخال بيانات طالب واحد.</li>
                <li><strong>الاستيراد الجماعي (Excel):</strong> الزر الأخضر ينقلك لصفحة الاستيراد الذكي.</li>
            </ul>
        </div>
        <div class="feature-block">
            <h3>3. بطاقة الطالب</h3>
            <p>كل طالب يظهر في بطاقة زجاجية تحتوي على:</p>
            <ul>
                <li><strong>سلوك إيجابي (إبهام لأعلى):</strong> لرصد نقطة إيجابية فورية.</li>
                <li><strong>سلوك سلبي (إبهام لأسفل):</strong> لرصد مخالفة.</li>
                <li><strong>زر التقرير (>):</strong> للدخول لملف الطالب التفصيلي.</li>
            </ul>
        </div>
      `
    },
    {
      id: 'attendance',
      title: 'نظام الحضور والغياب',
      icon: CalendarCheck,
      color: 'emerald',
      content: `
        <div class="guide-intro">
            <p>نظام ذكي للرصد اليومي مع إمكانيات التواصل المباشر مع أولياء الأمور.</p>
        </div>
        <div class="feature-block">
            <h3>1. واجهة الرصد</h3>
            <ul>
                <li><strong>التاريخ والفصل:</strong> تأكد من التاريخ في الأعلى، واستخدم القائمة المنسدلة لفلترة فصل معين.</li>
                <li><strong>الأزرار الثلاثة:</strong> أمام كل طالب 3 خيارات: حاضر (✓)، غائب (X)، تأخير (Clock).</li>
            </ul>
        </div>
        <div class="feature-block">
            <h3>3. التبليغ الذكي</h3>
            <p>عند اختيار "غائب" أو "متأخر"، تظهر أيقونة رسالة (Message) بجانب اسم الطالب للتواصل عبر واتساب مباشرة.</p>
        </div>
      `
    },
    {
      id: 'grades',
      title: 'سجل الدرجات والتقويم',
      icon: GraduationCap,
      color: 'amber',
      content: `
        <div class="guide-intro">
            <p>بديل السجل الورقي. مرن جداً ويحتسب الدرجات والنسب المئوية تلقائياً.</p>
        </div>
        <div class="feature-block">
            <h3>1. إعداد السجل</h3>
            <ul>
                <li><strong>أزرار الفصول (ف1 / ف2):</strong> للتبديل بين الفصل الدراسي الأول والثاني.</li>
                <li><strong>أدوات التقويم (Settings):</strong> أهم خطوة! اضغط هنا لإضافة أعمدة السجل.</li>
            </ul>
        </div>
        <div class="feature-block">
            <h3>2. رصد الدرجات</h3>
            <ul>
                <li>اضغط علامة (+) أمام الطالب لإضافة درجة جديدة.</li>
            </ul>
        </div>
      `
    },
    {
      id: 'competition',
      title: 'دوري العباقرة (المنافسة)',
      icon: Trophy,
      color: 'purple',
      content: `
        <div class="guide-intro">
            <p>نظام تنافسي بين المجموعات لزيادة الحماس.</p>
        </div>
        <div class="feature-block">
            <h3>1. إعداد الفرق</h3>
            <ul>
                <li>اضغط زر <strong>"إدارة الفرق"</strong> (رمز القفل).</li>
                <li>اضغط على أي فريق لتغيير اسمه وإضافة الطلاب.</li>
            </ul>
        </div>
        <div class="feature-block">
            <h3>2. إدارة اللعبة</h3>
            <ul>
                <li>الفريق المتصدر يحصل تلقائياً على <strong>تاج</strong>.</li>
                <li>استخدم الأزرار السريعة لمنح أو خصم النقاط من الفريق بالكامل.</li>
            </ul>
        </div>
      `
    }
  ];

  const exportAsHTML = async () => {
      alert('سيتم تصدير الدليل كملف HTML');
  };

  const exportAsPDF = () => {
      alert('يتم الآن تحضير ملف PDF...');
  };

  return (
    <div className="bg-white/80 dark:bg-white/5 min-h-full rounded-[2rem] shadow-sm dark:shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col h-[calc(100dvh-130px)] md:h-full relative animate-in fade-in duration-300 backdrop-blur-xl text-slate-900 dark:text-white">
      
      {/* Luxurious Header */}
      <div className="bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white p-5 md:p-8 flex flex-col md:flex-row justify-between items-start shrink-0 relative overflow-hidden gap-4 border-b border-gray-200 dark:border-white/10">
         <div className="relative z-10 w-full md:w-auto">
             <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl backdrop-blur-sm border border-blue-200 dark:border-blue-500/30">
                    <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                 </div>
                 <h1 className="text-lg md:text-2xl font-black tracking-tight">دليل المعلم</h1>
             </div>
             <p className="text-slate-500 dark:text-white/50 text-[10px] md:text-xs font-bold max-w-md leading-relaxed">
                 استكشف كافة مميزات تطبيق راصد. تم إعداد هذا الدليل ليشرح كل أداة وخاصية بدقة.
             </p>
         </div>
         
         <div className="flex gap-2 relative z-10 w-full md:w-auto">
             <button onClick={exportAsHTML} className="flex-1 md:flex-none group flex items-center justify-center gap-2 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 px-4 py-2.5 rounded-xl transition-all backdrop-blur-md border border-gray-200 dark:border-white/10 active:scale-95">
                 <Globe className="w-4 h-4 text-blue-500 dark:text-blue-300 group-hover:text-blue-600 dark:group-hover:text-blue-200" />
                 <span className="text-[10px] font-black text-slate-600 dark:text-white">حفظ كويب</span>
             </button>
             <button onClick={exportAsPDF} className="flex-1 md:flex-none group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95">
                 {isExporting ? <span className="animate-spin text-white">⌛</span> : <Download className="w-4 h-4 text-white" />}
                 <span className="text-[10px] font-black text-white">تحميل PDF</span>
             </button>
         </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 overflow-hidden flex flex-row bg-transparent">
          
          {/* Vertical Sidebar Navigation */}
          <div className="w-[85px] md:w-72 bg-slate-50 dark:bg-black/20 border-l border-gray-200 dark:border-white/10 flex flex-col p-2 gap-2 shrink-0 z-10 shadow-inner overflow-y-auto">
              {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex flex-col md:flex-row items-center md:gap-3 px-1 md:px-4 py-3 rounded-2xl transition-all w-full text-center md:text-right border ${activeSection === section.id ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white border-gray-200 dark:border-white/20 shadow-sm transform scale-[1.02]' : 'text-slate-500 dark:text-white/40 border-transparent hover:bg-gray-200 dark:hover:bg-white/5'}`}
                  >
                      <div className={`p-2 rounded-xl mb-1 md:mb-0 ${activeSection === section.id ? 'bg-slate-100 dark:bg-white/20' : 'bg-transparent dark:bg-white/5'}`}>
                          <section.icon className={`w-5 h-5 md:w-5 md:h-5 ${activeSection === section.id ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-white/40'}`} />
                      </div>
                      <div className="flex-1 w-full overflow-hidden">
                          <span className="block text-[9px] md:text-xs font-black truncate leading-tight md:leading-normal">{section.title}</span>
                      </div>
                      {activeSection === section.id && <ChevronLeft className="hidden md:block w-4 h-4 opacity-50" />}
                  </button>
              ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 relative scroll-smooth" id="guide-content-for-pdf">
              <div className="hidden print-visible text-center mb-10 pb-6 border-b-2 border-gray-200 dark:border-white/10">
                  <h1 className="text-4xl font-black text-black mb-2">دليل استخدام راصد</h1>
                  <p className="text-gray-500 font-bold">الدليل الشامل</p>
              </div>

              {sections.map(section => (
                  <div key={section.id} className={`${activeSection === section.id || isExporting ? 'block' : 'hidden'} animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto`}>
                      
                      <div className="flex items-center gap-4 mb-6 md:mb-8">
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-lg bg-slate-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 backdrop-blur-sm`}>
                              <section.icon className={`w-6 h-6 md:w-8 md:h-8 text-${section.color}-500 dark:text-${section.color}-400`} />
                          </div>
                          <div>
                              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-1">{section.title}</h2>
                              <div className={`h-1.5 w-16 md:w-20 rounded-full bg-${section.color}-500/50`}></div>
                          </div>
                      </div>
                      
                      <div 
                        className="prose prose-sm md:prose-lg max-w-none text-slate-700 dark:text-white/80 font-medium leading-loose guide-content"
                        dangerouslySetInnerHTML={{ __html: section.content }} 
                      />

                      <div className="hidden print-visible my-12 border-b border-gray-200"></div>
                  </div>
              ))}

              <div className="mt-8 md:mt-16 p-6 md:p-8 bg-white dark:bg-white/5 rounded-[2rem] md:rounded-3xl text-center border border-gray-200 dark:border-white/10 shadow-sm max-w-2xl mx-auto backdrop-blur-sm">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-500/20">
                      <Settings className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400 animate-spin-slow" />
                  </div>
                  <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">الدعم الفني والتحديثات</h3>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-white/50 leading-relaxed">
                      نحن ملتزمون بتطوير التطبيق باستمرار. إذا واجهت أي مشكلة أو كان لديك اقتراح، لا تتردد في التواصل معنا.
                  </p>
              </div>
          </div>
      </div>

      <style>{`
        /* Dynamic Typography Colors */
        .guide-content h3 {
            color: #0f172a; /* Slate 900 for Light Mode */
            font-weight: 900;
            font-size: 1.1rem;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .guide-content li {
            position: relative;
            padding-right: 1.25rem;
            margin-bottom: 0.5rem;
            font-size: 0.85rem;
            color: #475569; /* Slate 600 for Light Mode */
        }
        .guide-content strong {
            color: #0f172a;
            font-weight: 800;
        }
        .guide-content .feature-block {
            background: #f8fafc; /* Slate 50 */
            border: 1px solid #e2e8f0; /* Slate 200 */
            border-radius: 1.5rem;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s;
        }
        
        /* Dark Mode Overrides (Inherited via HTML class) */
        html.dark .guide-content h3 { color: #fff; }
        html.dark .guide-content li { color: rgba(255, 255, 255, 0.7); }
        html.dark .guide-content strong { color: #fff; }
        html.dark .guide-content .feature-block {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        html.dark .guide-content .feature-block:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
        }

        /* Responsive */
        @media (min-width: 768px) {
            .guide-content h3 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 1rem; }
            .guide-content .feature-block { padding: 2rem; margin-bottom: 1.5rem; }
            .guide-content li { padding-right: 1.5rem; margin-bottom: 0.75rem; font-size: 0.95rem; }
        }

        .guide-content li::before {
            content: "•";
            color: #60a5fa;
            font-weight: bold;
            font-size: 1.25rem;
            position: absolute;
            right: 0;
            top: -0.15rem;
        }
        
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default UserGuide;
