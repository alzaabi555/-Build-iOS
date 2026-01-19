import React, { useState } from 'react';
import { 
  Printer, BookOpen, LayoutDashboard, Users, CalendarCheck, 
  BarChart3, Award, Globe, Database, Settings, ShieldCheck, 
  Menu, X, ChevronLeft, Lightbulb, MousePointerClick, FileText, 
  Download, Code, Smartphone, Monitor, Apple, CheckCircle2,
  Zap, MessageCircle, FileSpreadsheet, Wand2
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const UserGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState('intro');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const sections = [
    { id: 'intro', title: 'مرحباً بك في راصد', icon: Zap },
    { id: 'downloads', title: 'تحميل النسخ', icon: Download },
    { id: 'ui', title: 'واجهة الاستخدام الجديدة', icon: LayoutDashboard },
    { id: 'students', title: 'الطلاب والسلوك', icon: Users },
    { id: 'attendance', title: 'الحضور والإنصراف', icon: CalendarCheck },
    { id: 'grades', title: 'سجل الدرجات', icon: BarChart3 },
    { id: 'reports', title: 'مركز التقارير', icon: FileText },
    { id: 'data', title: 'البيانات والأمان', icon: Database },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setSidebarOpen(false);
  };

  const handleDownloadPDF = async () => {
      setIsExporting(true);
      const element = document.getElementById('guide-content-inner');
      if (!element) return;

      // إخفاء الأزرار مؤقتاً أثناء الطباعة
      const buttons = element.querySelectorAll('button');
      buttons.forEach(b => b.style.display = 'none');

      const opt = {
          margin: [10, 10, 10, 10],
          filename: 'Rased_User_Manual_V3.6.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      try {
          const worker = html2pdf().set(opt).from(element).toPdf();
          
          if (Capacitor.isNativePlatform()) {
              const pdfBase64 = await worker.output('datauristring');
              const base64Data = pdfBase64.split(',')[1];
              const result = await Filesystem.writeFile({
                  path: 'Rased_Manual.pdf',
                  data: base64Data,
                  directory: Directory.Cache
              });
              await Share.share({ title: 'دليل مستخدم راصد', url: result.uri });
          } else {
              worker.save();
          }
      } catch (e) {
          console.error('Export Error:', e);
          alert('حدث خطأ أثناء التصدير.');
      } finally {
          buttons.forEach(b => b.style.display = ''); // إعادة إظهار الأزرار
          setIsExporting(false);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans relative">
        
        {/* ================= Header (Fixed Blue) ================= */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-6 pt-[env(safe-area-inset-top)] pb-8 transition-all duration-300 print:hidden">
            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 lg:hidden text-white transition-colors">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-blue-300" />
                            الدليل الشامل
                        </h1>
                        <p className="text-[10px] font-bold text-blue-200 opacity-80">راصد V3.6.0 • الإصدار الملكي</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleDownloadPDF}
                    disabled={isExporting}
                    className="bg-white text-[#1e3a8a] px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
                >
                    <Printer className="w-4 h-4" />
                    {isExporting ? 'جاري التحضير...' : 'طباعة الدليل'}
                </button>
            </div>
        </div>

        {/* ================= Main Layout ================= */}
        <div className="flex flex-1 h-full pt-[130px] relative overflow-hidden">
            
            {/* Sidebar Navigation */}
            <aside className={`
                fixed inset-y-0 right-0 z-40 w-72 bg-white border-l border-slate-200 shadow-2xl lg:shadow-none lg:static lg:block transition-transform duration-300 pt-[env(safe-area-inset-top)] lg:pt-0
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                print:hidden
            `}>
                <div className="flex flex-col h-full">
                    <div className="p-4 lg:hidden flex justify-end">
                        <button onClick={() => setSidebarOpen(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500"/></button>
                    </div>
                    <div className="p-6 space-y-2 h-full overflow-y-auto custom-scrollbar pb-20">
                        <p className="text-xs font-black text-slate-400 mb-4 px-2 uppercase tracking-widest">المحتويات</p>
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm text-right group ${activeSection === section.id ? 'bg-[#1e3a8a] text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-blue-300' : 'text-slate-400 group-hover:text-[#1e3a8a]'}`} />
                                {section.title}
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Sidebar Overlay */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>}

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] p-4 md:p-8 scroll-smooth" id="guide-content">
                <div id="guide-content-inner" className="max-w-4xl mx-auto space-y-12 pb-32">
                    
                    {/* 1. Introduction */}
                    <section id="intro" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-40 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#1e3a8a] shadow-sm"><Zap className="w-7 h-7" /></div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">مرحباً بك في راصد</h2>
                                <p className="text-slate-500 text-sm font-bold">الإصدار الثالث (V3.6) - التصميم الجديد</p>
                            </div>
                        </div>
                        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium">
                            <p className="text-lg mb-4">
                                تطبيق <strong>راصد</strong> هو مساعدك الرقمي الذكي داخل الغرفة الصفية. تم إعادة تصميمه بالكامل ليوفر تجربة مستخدم "فخمة" وسلسة، مع التركيز على الإنتاجية والخصوصية.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3">
                                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">خصوصية تامة</h4>
                                        <p className="text-xs text-slate-500 mt-1">بياناتك محفوظة محلياً على جهازك ولا تغادره أبداً.</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">يعمل بلا إنترنت</h4>
                                        <p className="text-xs text-slate-500 mt-1">استخدم التطبيق في أي مكان دون الحاجة لاتصال بالشبكة.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    
                    {/* 2. Downloads */}
                    <section id="downloads" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-40 no-print">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600"><Download className="w-6 h-6" /></div>
                            <h2 className="text-xl font-black text-slate-800">تحميل التطبيق</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <a href="#" className="group relative overflow-hidden bg-slate-900 text-white p-6 rounded-[2rem] text-center hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                                <Smartphone className="w-8 h-8 mx-auto mb-3 text-emerald-400"/>
                                <h3 className="font-bold text-sm">نسخة الأندرويد</h3>
                                <span className="text-[10px] opacity-60">ملف APK مباشر</span>
                            </a>
                            <a href="#" className="group relative overflow-hidden bg-slate-900 text-white p-6 rounded-[2rem] text-center hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                                <Apple className="w-8 h-8 mx-auto mb-3 text-gray-300"/>
                                <h3 className="font-bold text-sm">نسخة الآيفون</h3>
                                <span className="text-[10px] opacity-60">ملف IPA للمطورين</span>
                            </a>
                            <a href="#" className="group relative overflow-hidden bg-slate-900 text-white p-6 rounded-[2rem] text-center hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                                <Monitor className="w-8 h-8 mx-auto mb-3 text-blue-400"/>
                                <h3 className="font-bold text-sm">نسخة الويندوز</h3>
                                <span className="text-[10px] opacity-60">ملف EXE للكمبيوتر</span>
                            </a>
                        </div>
                    </section>

                    {/* 3. Dashboard UI */}
                    <section id="ui" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-40">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600"><LayoutDashboard className="w-6 h-6" /></div>
                            <h2 className="text-xl font-black text-slate-800">واجهة الاستخدام</h2>
                        </div>
                        <div className="space-y-6">
                            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> الهيدر الأزرق (Blue Header)</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    يتميز التصميم الجديد بشريط علوي أزرق داكن ومنحني. يحتوي هذا الشريط على المعلومات الأساسية (اسم الصفحة، الأدوات السريعة) ويتم تحديثه ديناميكياً حسب الصفحة.
                                </p>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500"></div> القائمة السفلية العائمة</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    للوصول السريع على الهاتف، استخدمنا قائمة سفلية بيضاء بحواف دائرية. الأيقونة النشطة "تطفو" للأعلى بلون مميز لسهولة التمييز.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 4. Students */}
                    <section id="students" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-40">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Users className="w-6 h-6" /></div>
                            <h2 className="text-xl font-black text-slate-800">الطلاب والسلوك</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 font-medium">
                            <p>تم تحويل قائمة الطلاب إلى <strong>بطاقات تفاعلية ذكية</strong>:</p>
                            <ul className="space-y-4">
                                <li className="flex gap-3 items-start">
                                    <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
                                    <div>
                                        <strong className="text-slate-900 block mb-1">الألوان التفاعلية:</strong>
                                        <span className="text-sm">تتغير خلفية بطاقة الطالب تلقائياً. <span className="text-emerald-600 font-bold">خضراء</span> إذا كان سلوكه إيجابياً، و <span className="text-rose-600 font-bold">حمراء</span> إذا كان سلبياً.</span>
                                    </div>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
                                    <div>
                                        <strong className="text-slate-900 block mb-1">قائمة الأدوات (Menu):</strong>
                                        <span className="text-sm">لإضافة طالب جديد، أو استيراد الأسماء من Excel، أو استخدام القرعة العشوائية، اضغط على أيقونة <strong>الثلاث شرط (Menu)</strong> في أعلى يسار الصفحة.</span>
                                    </div>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
                                    <div>
                                        <strong className="text-slate-900 block mb-1">أزرار السلوك الكبيرة:</strong>
                                        <span className="text-sm">أسفل كل اسم، ستجد زرين كبيرين وواضحين: "سلوك إيجابي" و "سلوك سلبي". الضغط عليها يفتح قائمة خيارات سريعة.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* 5. Attendance */}
                    <section id="attendance" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-40">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600"><CalendarCheck className="w-6 h-6" /></div>
                            <h2 className="text-xl font-black text-slate-800">الحضور والإنصراف</h2>
                        </div>
                        <div className="text-slate-600 font-medium space-y-4">
                            <p>نظام رصد سريع يعتمد على <strong>البطاقات الكبيرة</strong> لتجنب الأخطاء:</p>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                                    <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500 mb-1"/>
                                    <span className="text-xs font-bold">حضور</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                                    <X className="w-5 h-5 mx-auto text-rose-500 mb-1"/>
                                    <span className="text-xs font-bold">غياب</span>
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 items-center">
                                <MessageCircle className="w-6 h-6 text-blue-600" />
                                <div>
                                    <strong className="block text-blue-900 text-sm">التنبيه الذكي (واتساب)</strong>
                                    <p className="text-xs text-blue-700 mt-1">
                                        عند اختيار حالة سلبية (غياب/تأخر)، سيظهر لك زر "مراسلة" صغير في البطاقة. اضغط عليه لإرسال رسالة جاهزة لولي الأمر فوراً.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 6. Reports */}
                    <section id="reports" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-40">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><FileSpreadsheet className="w-6 h-6" /></div>
                            <h2 className="text-xl font-black text-slate-800">مركز التقارير</h2>
                        </div>
                        <div className="text-slate-600 font-medium space-y-4">
                            <p>تم تجميع كافة التقارير في مكان واحد مع شريط تنقل علوي:</p>
                            <ul className="list-disc pr-5 space-y-2 text-sm">
                                <li><strong>تقرير طالب:</strong> شامل للدرجات، السلوك، والحضور.</li>
                                <li><strong>سجل الدرجات:</strong> كشف كلاسيكي لدرجات الفصل كاملاً.</li>
                                <li><strong>الشهادات:</strong> طباعة شهادات تقدير ملونة مع إمكانية تخصيص النص.</li>
                                <li><strong>الاستدعاء:</strong> توليد خطابات استدعاء رسمية لأولياء الأمور.</li>
                            </ul>
                            <p className="text-xs bg-slate-100 p-2 rounded text-center">💡 جميع التقارير تدعم التصدير كـ PDF والمشاركة المباشرة.</p>
                        </div>
                    </section>

                    {/* 7. Data */}
                    <section id="data" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-40">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><Database className="w-6 h-6" /></div>
                            <h2 className="text-xl font-black text-slate-800">إدارة البيانات</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-slate-600 text-sm font-medium">من صفحة "الإعدادات"، يمكنك:</p>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                    <Download className="w-4 h-4 text-indigo-600"/>
                                    <span className="text-xs font-bold text-slate-700">إنشاء نسخة احتياطية (ملف JSON)</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                    <Wand2 className="w-4 h-4 text-emerald-600"/>
                                    <span className="text-xs font-bold text-slate-700">استعادة البيانات عند تغيير الهاتف</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="text-center pt-8 border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-400">الزعابي </p>
                    </div>
                </div>
            </main>
        </div>
    </div>
  );
};

export default UserGuide;
