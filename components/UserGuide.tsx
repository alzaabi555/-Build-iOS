import React, { useState } from 'react';
import { 
  Printer, BookOpen, LayoutDashboard, Users, CalendarCheck, 
  BarChart3, Award, Database, Menu, X, Download, 
  Zap, MessageCircle, FileSpreadsheet, Wand2, BellRing, 
  Settings, Search, Filter, Plus, Trash2, Edit3, Share2, 
  Calculator, CheckCircle2, AlertTriangle, FileUp, Save, 
  ChevronLeft, Info, HelpCircle, Moon, Clock, UserPlus, Eye
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const UserGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // قائمة الفصول في الدليل
  const sections = [
    { id: 'dashboard', title: '1. لوحة التحكم والجدول', icon: LayoutDashboard },
    { id: 'students', title: '2. شاشة الطلاب والسلوك', icon: Users },
    { id: 'attendance', title: '3. نظام الحضور والغياب', icon: CalendarCheck },
    { id: 'grades', title: '4. سجل الدرجات المتقدم', icon: BarChart3 },
    { id: 'reports', title: '5. مركز التقارير والطباعة', icon: FileSpreadsheet },
    { id: 'settings', title: '6. إدارة البيانات والنسخ', icon: Database },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
    setSidebarOpen(false);
  };

  const handleDownloadPDF = async () => {
      setIsExporting(true);
      const element = document.getElementById('guide-content-inner');
      if (!element) return;

      const buttons = element.querySelectorAll('button, .no-print');
      buttons.forEach((b: any) => b.style.display = 'none');

      const opt = {
          margin: [5, 5, 5, 5],
          filename: 'Rased_Full_Manual.pdf',
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
              await Share.share({ title: 'دليل المستخدم الشامل - راصد', url: result.uri });
          } else {
              worker.save();
          }
      } catch (e) {
          console.error('Export Error:', e);
          alert('حدث خطأ أثناء التصدير.');
      } finally {
          buttons.forEach((b: any) => b.style.display = '');
          setIsExporting(false);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans relative">
        
        {/* ================= Header ================= */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-6 pt-[env(safe-area-inset-top)] pb-8 transition-all duration-300 print:hidden">
            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 lg:hidden text-white transition-colors">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-blue-300" />
                            الدليل الموسوعي
                        </h1>
                        <p className="text-[10px] font-bold text-blue-200 opacity-80">شرح تفصيلي لكل أيقونة ونافذة</p>
                    </div>
                </div>
                <button onClick={handleDownloadPDF} disabled={isExporting} className="bg-white text-[#1e3a8a] px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50">
                    <Printer className="w-4 h-4" /> {isExporting ? 'جاري التحضير...' : 'طباعة الدليل'}
                </button>
            </div>
        </div>

        {/* ================= Layout ================= */}
        <div className="flex flex-1 h-full pt-[130px] relative overflow-hidden">
            
            {/* Sidebar Navigation */}
            <aside className={`fixed inset-y-0 right-0 z-40 w-72 bg-white border-l border-slate-200 shadow-2xl lg:shadow-none lg:static lg:block transition-transform duration-300 pt-[env(safe-area-inset-top)] lg:pt-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} print:hidden`}>
                <div className="flex flex-col h-full">
                    <div className="p-4 lg:hidden flex justify-end"><button onClick={() => setSidebarOpen(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500"/></button></div>
                    <div className="p-6 space-y-2 h-full overflow-y-auto custom-scrollbar pb-20">
                        <p className="text-xs font-black text-slate-400 mb-4 px-2 uppercase tracking-widest">فهرس المحتويات</p>
                        {sections.map(section => (
                            <button key={section.id} onClick={() => scrollToSection(section.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm text-right group ${activeSection === section.id ? 'bg-[#1e3a8a] text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-blue-300' : 'text-slate-400 group-hover:text-[#1e3a8a]'}`} /> {section.title}
                            </button>
                        ))}
                    </div>
                </div>
            </aside>
            {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] p-4 md:p-8 scroll-smooth" id="guide-content">
                <div id="guide-content-inner" className="max-w-4xl mx-auto space-y-12 pb-32">
                    
                    {/* المقدمة */}
                    <div className="text-center mb-10 border-b border-slate-200 pb-8">
                        <h1 className="text-3xl font-black text-[#1e3a8a] mb-2">تطبيق راصد - الإصدار الذهبي</h1>
                        <p className="text-slate-500 text-sm font-bold">دليل المستخدم التفصيلي (V3.6)</p>
                    </div>

                    {/* 1. Dashboard */}
                    <section id="dashboard" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 ring-4 ring-slate-50 scroll-mt-32">
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#1e3a8a] shadow-sm"><LayoutDashboard className="w-7 h-7" /></div>
                            <div><h2 className="text-2xl font-black text-slate-900">1. الصفحة الرئيسية والجدول</h2><p className="text-slate-500 text-xs font-bold">مركز القيادة والتحكم</p></div>
                        </div>

                        <div className="space-y-8">
                            {/* Header Icons */}
                            <div>
                                <h3 className="font-black text-sm text-indigo-900 mb-3 flex items-center gap-2"><Settings className="w-4 h-4"/> أيقونات الهيدر (الشريط العلوي)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-700"><Edit3 className="w-4 h-4"/></div>
                                        <div><strong className="text-xs font-bold block text-slate-900">زر تعديل الهوية:</strong><span className="text-[10px] text-slate-500 block leading-relaxed">يفتح نافذة لتعديل اسم المعلم، المدرسة، المادة، والصورة الشخصية والشعار. عند كتابة اسم المادة (مثال: علوم)، تتغير أيقونات الجدول تلقائياً لرموز معبرة (كأس مخبار).</span></div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-700"><BellRing className="w-4 h-4"/></div>
                                        <div><strong className="text-xs font-bold block text-slate-900">زر الإشعارات:</strong><span className="text-[10px] text-slate-500 block leading-relaxed">تفعيل/تعطيل التنبيهات قبل بداية الحصص. تظهر نقطة حمراء عند التفعيل.</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* Schedule Settings Modal */}
                            <div>
                                <h3 className="font-black text-sm text-indigo-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4"/> نافذة إعدادات الجدول (الترس)</h3>
                                <p className="text-xs text-slate-600 mb-3 font-medium">عند الضغط على أيقونة الترس بجانب "جدول اليوم"، تظهر قائمة منسدلة تحتوي على:</p>
                                <ul className="space-y-2 text-xs text-slate-600 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                    <li className="flex items-center gap-2"><Download className="w-4 h-4 text-indigo-600"/> <strong>استيراد الجدول:</strong> لرفع ملف Excel يحتوي على توزيع الحصص.</li>
                                    <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-600"/> <strong>ضبط التوقيت:</strong> يفتح نافذة لضبط مواعيد بداية ونهاية كل حصة (يدوياً أو استيراد من Excel).</li>
                                </ul>
                            </div>

                            {/* Schedule Cards */}
                            <div>
                                <h3 className="font-black text-sm text-indigo-900 mb-3 flex items-center gap-2"><Moon className="w-4 h-4"/> بطاقات الحصص</h3>
                                <div className="p-4 bg-white border-2 border-emerald-100 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><Calculator className="w-5 h-5"/></div>
                                            <div><strong className="text-sm">الرياضيات</strong><p className="text-[10px] text-slate-500">الحصة 2 • 5/1</p></div>
                                        </div>
                                        <button className="bg-[#1e3a8a] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">تحضير</button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 text-center">** ملاحظة: البطاقة النشطة (التي وقتها الآن) تظهر بإطار أخضر وزر "تحضير".</p>
                            </div>
                        </div>
                    </section>

                    {/* 2. Students */}
                    <section id="students" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 ring-4 ring-slate-50 scroll-mt-32">
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><Users className="w-7 h-7" /></div>
                            <div><h2 className="text-2xl font-black text-slate-900">2. شاشة الطلاب والسلوك</h2><p className="text-slate-500 text-xs font-bold">إدارة القوائم والنقاط</p></div>
                        </div>

                        <div className="space-y-8">
                            {/* Menu Dropdown */}
                            <div>
                                <h3 className="font-black text-sm text-blue-900 mb-3 flex items-center gap-2"><Menu className="w-4 h-4"/> القائمة الرئيسية (Menu)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <UserPlus className="w-5 h-5 mx-auto text-blue-600 mb-1"/>
                                        <strong className="text-xs block">إضافة طالب</strong>
                                        <span className="text-[9px] text-slate-500">يدوياً (الاسم، الصف، الهاتف)</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <FileUp className="w-5 h-5 mx-auto text-emerald-600 mb-1"/>
                                        <strong className="text-xs block">استيراد Excel</strong>
                                        <span className="text-[9px] text-slate-500">رفع قائمة كاملة دفعة واحدة</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <Wand2 className="w-5 h-5 mx-auto text-purple-600 mb-1"/>
                                        <strong className="text-xs block">القرعة العشوائية</strong>
                                        <span className="text-[9px] text-slate-500">اختيار طالب عشوائي للمشاركة</span>
                                    </div>
                                </div>
                            </div>

                            {/* Student Card Details */}
                            <div>
                                <h3 className="font-black text-sm text-blue-900 mb-3 flex items-center gap-2"><Award className="w-4 h-4"/> تفاصيل بطاقة الطالب</h3>
                                <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center font-bold">م</div>
                                            <div><strong className="text-sm">محمد أحمد</strong><span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded mr-2">+5 نقاط</span></div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Edit3 className="w-4 h-4 text-slate-400"/>
                                            <Trash2 className="w-4 h-4 text-rose-400"/>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-lg text-xs font-bold border border-emerald-100">سلوك إيجابي</button>
                                        <button className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-lg text-xs font-bold border border-rose-100">سلوك سلبي</button>
                                    </div>
                                </div>
                                <ul className="mt-3 space-y-1 text-xs text-slate-600 list-disc pr-4">
                                    <li><strong>الألوان:</strong> تتلون البطاقة بالأخضر إذا كان الرصيد موجباً، وبالأحمر إذا كان سالباً.</li>
                                    <li><strong>أزرار السلوك:</strong> تفتح نافذة لاختيار السبب (مشاركة، واجب / إزعاج، نسيان).</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* 3. Attendance */}
                    <section id="attendance" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 ring-4 ring-slate-50 scroll-mt-32">
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm"><CalendarCheck className="w-7 h-7" /></div>
                            <div><h2 className="text-2xl font-black text-slate-900">3. الحضور والإنصراف</h2><p className="text-slate-500 text-xs font-bold">رصد سريع وتواصل ذكي</p></div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h3 className="font-black text-sm text-rose-900 mb-2">أيقونات الحالة:</h3>
                                <div className="flex items-center gap-3 p-2 bg-white border rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500"/> 
                                    <span className="text-xs font-bold">حضور:</span> <span className="text-[10px] text-slate-500">الحالة الافتراضية.</span>
                                </div>
                                <div className="flex items-center gap-3 p-2 bg-white border rounded-lg">
                                    <X className="w-5 h-5 text-rose-500"/> 
                                    <span className="text-xs font-bold">غياب:</span> <span className="text-[10px] text-slate-500">يظهر زر واتساب.</span>
                                </div>
                                <div className="flex items-center gap-3 p-2 bg-white border rounded-lg">
                                    <Clock className="w-5 h-5 text-amber-500"/> 
                                    <span className="text-xs font-bold">تأخر:</span> <span className="text-[10px] text-slate-500">يظهر زر واتساب.</span>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <h3 className="font-black text-sm text-blue-900 mb-2 flex items-center gap-2"><MessageCircle className="w-4 h-4"/> التكامل مع واتساب</h3>
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    عند اختيار حالة سلبية (غياب أو تأخر)، يظهر زر صغير "مراسلة". عند الضغط عليه، يفتح التطبيق محادثة واتساب فورية مع ولي الأمر (إذا كان الرقم مسجلاً) برسالة جاهزة: "السلام عليكم، ابنكم [الاسم] غائب اليوم...".
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 4. Grades (Detailed) */}
                    <section id="grades" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 ring-4 ring-slate-50 scroll-mt-32">
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm"><BarChart3 className="w-7 h-7" /></div>
                            <div><h2 className="text-2xl font-black text-slate-900">4. سجل الدرجات (النظام الجديد)</h2><p className="text-slate-500 text-xs font-bold">أوزان مرنة وحسابات دقيقة</p></div>
                        </div>

                        <div className="space-y-8">
                            {/* Weight Settings (New Feature) */}
                            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                                <h3 className="font-black text-amber-900 mb-3 flex items-center gap-2"><Calculator className="w-5 h-5"/> نافذة "إعدادات وزن الدرجات"</h3>
                                <p className="text-xs text-amber-800 mb-3 font-medium">تفتح عند الضغط على أيقونة الآلة الحاسبة بجانب العنوان. تتيح لك تخصيص السجل لأي مرحلة:</p>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <li className="bg-white p-2 rounded-lg border border-amber-200"><strong>1. الدرجة الكلية:</strong> (افتراضياً 100).</li>
                                    <li className="bg-white p-2 rounded-lg border border-amber-200"><strong>2. وزن النهائي:</strong> حدد (40، 60، 70، أو 0).</li>
                                    <li className="bg-white p-2 rounded-lg border border-amber-200"><strong>3. مسمى النهائي:</strong> امتحان نهائي / مشروع.</li>
                                    <li className="bg-white p-2 rounded-lg border border-amber-200"><strong>4. النتيجة:</strong> يحسب النظام تلقائياً (المستمر + النهائي).</li>
                                </ul>
                            </div>

                            {/* Tools Menu */}
                            <div>
                                <h3 className="font-black text-sm text-slate-900 mb-3 flex items-center gap-2"><Settings className="w-4 h-4"/> قائمة إدارة الأدوات</h3>
                                <p className="text-xs text-slate-600 mb-2">من القائمة المنسدلة (Menu)، اختر "إعدادات أدوات التقويم" لتظهر نافذة تتيح:</p>
                                <ul className="list-disc pr-5 text-xs text-slate-600 space-y-1">
                                    <li><strong>إضافة أداة:</strong> (مثال: واجب 1، اختبار قصير).</li>
                                    <li><strong>حذف/تعديل:</strong> عبر أيقونات القلم والسلة بجانب كل أداة.</li>
                                </ul>
                            </div>

                            {/* Bulk Fill */}
                            <div className="flex gap-4 items-start">
                                <div className="p-3 bg-slate-50 rounded-xl"><Wand2 className="w-5 h-5 text-purple-600"/></div>
                                <div>
                                    <strong className="text-sm block text-slate-900">الرصد الجماعي (العصا السحرية):</strong>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        تظهر أدوات التقويم كأزرار في الشريط العلوي. عند الضغط على زر (مثال: "رصد واجب 1")، تظهر نافذة صغيرة لإدخال درجة واحدة وتطبيقها على جميع الطلاب في القائمة الحالية دفعة واحدة.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 5. Reports */}
                    <section id="reports" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 ring-4 ring-slate-50 scroll-mt-32">
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><FileSpreadsheet className="w-7 h-7" /></div>
                            <div><h2 className="text-2xl font-black text-slate-900">5. مركز التقارير</h2><p className="text-slate-500 text-xs font-bold">تصدير وطباعة المستندات</p></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border rounded-2xl hover:bg-slate-50 transition-colors">
                                <strong className="text-sm flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-indigo-600"/> الشهادات</strong>
                                <p className="text-[10px] text-slate-500">يتيح لك اختيار طلاب محددين، ثم الضغط على "معاينة" لتوليد شهادات تقدير ملونة بتصميم وزاري. يمكنك تعديل نص الشهادة من زر الترس.</p>
                            </div>
                            <div className="p-4 border rounded-2xl hover:bg-slate-50 transition-colors">
                                <strong className="text-sm flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-rose-600"/> الاستدعاء</strong>
                                <p className="text-[10px] text-slate-500">توليد خطاب رسمي لولي الأمر. يتيح لك اختيار سبب الاستدعاء (غياب، سلوك، مستوى) والإجراءات المتخذة، وتحديد وقت الحضور.</p>
                            </div>
                            <div className="p-4 border rounded-2xl hover:bg-slate-50 transition-colors">
                                <strong className="text-sm flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-amber-600"/> سجل الدرجات</strong>
                                <p className="text-[10px] text-slate-500">طباعة كشف درجات كامل للفصل (PDF) يحتوي على جميع الأدوات والمجموع والتقدير اللفظي.</p>
                            </div>
                            <div className="p-4 border rounded-2xl hover:bg-slate-50 transition-colors">
                                <strong className="text-sm flex items-center gap-2 mb-2"><Eye className="w-4 h-4 text-blue-600"/> تقرير طالب</strong>
                                <p className="text-[10px] text-slate-500">تقرير فردي مفصل لطالب واحد، يشمل بياناته، رسم بياني لدرجاته، وسجل غيابه وسلوكه.</p>
                            </div>
                        </div>
                    </section>

                    {/* 6. Settings */}
                    <section id="settings" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 ring-4 ring-slate-50 scroll-mt-32">
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600 shadow-sm"><Database className="w-7 h-7" /></div>
                            <div><h2 className="text-2xl font-black text-slate-900">6. إدارة البيانات</h2><p className="text-slate-500 text-xs font-bold">الحماية والاستعادة</p></div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <div className="p-3 bg-white rounded-full text-indigo-600 shadow-sm"><Download className="w-5 h-5"/></div>
                                <div>
                                    <strong className="block text-sm text-indigo-900">النسخ الاحتياطي (Backup)</strong>
                                    <p className="text-[10px] text-indigo-700 leading-relaxed">يقوم بتجميع كل بيانات التطبيق (الطلاب، الدرجات، الإعدادات) في ملف واحد (`.json`) وحفظه على جهازك. يُنصح بعمله أسبوعياً.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <div className="p-3 bg-white rounded-full text-emerald-600 shadow-sm"><Share2 className="w-5 h-5"/></div>
                                <div>
                                    <strong className="block text-sm text-emerald-900">استعادة البيانات (Restore)</strong>
                                    <p className="text-[10px] text-emerald-700 leading-relaxed">يستخدم عند تغيير الهاتف أو مسح التطبيق. يطلب منك اختيار ملف النسخة الاحتياطية ليعيد التطبيق كما كان.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                <div className="p-3 bg-white rounded-full text-rose-600 shadow-sm"><Trash2 className="w-5 h-5"/></div>
                                <div>
                                    <strong className="block text-sm text-rose-900">منطقة الخطر (Factory Reset)</strong>
                                    <p className="text-[10px] text-rose-700 leading-relaxed">يقوم بمسح جميع البيانات نهائياً وتصفير التطبيق وكأنه جديد. لا يمكن التراجع عن هذا الإجراء.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    <div className="text-center pt-10 border-t border-slate-200 mt-10">
                        <p className="text-xs font-bold text-slate-400 mb-2">تم تطوير هذا التطبيق بعناية فائقة لخدمة المعلم العماني</p>
                        <p className="text-[10px] text-slate-300">جميع الحقوق محفوظة © 2026</p>
                    </div>
                </div>
            </main>
        </div>
    </div>
  );
};

export default UserGuide;
