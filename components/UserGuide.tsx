import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, CalendarCheck, BarChart3, Award, 
  Settings, BookOpen, Download, Menu, X, 
  WifiOff, MessageCircle, FileText, ShieldCheck, CheckCircle2,
  Wand2, PieChart, Crown, Printer,  HardDriveDownload,
  RefreshCw, Trash2, ArrowUp, Share2, MousePointerClick, 
  UserCog, BellRing, FileSpreadsheet, Timer, Dices, Star
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

// --- Components ---

// بطاقة شرح ميزة تفصيلية
const DetailCard: React.FC<{ icon: any; title: string; desc: string; details?: string[] }> = ({ icon: Icon, title, desc, details }) => (
  <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/30 transition-all duration-300">
    <div className="flex items-start gap-4">
      <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
        <Icon size={24} />
      </div>
      <div>
        <h4 className="text-white font-bold text-lg mb-2">{title}</h4>
        <p className="text-slate-400 text-sm leading-relaxed font-medium mb-3">{desc}</p>
        {details && (
          <ul className="space-y-2 mt-3 border-t border-slate-700/50 pt-3">
            {details.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-indigo-500 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);

const UserGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState('hero');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSidebarOpen(false);
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('guide-container');
    if (!element) return;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: 'Rased_Full_Manual.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const worker = html2pdf().set(opt).from(element).toPdf();
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await worker.output('datauristring');
        const result = await Filesystem.writeFile({
          path: 'Rased_Manual.pdf',
          data: pdfBase64.split(',')[1],
          directory: Directory.Cache
        });
        await Share.share({ title: 'دليل راصد الشامل', url: result.uri });
      } else {
        worker.save();
      }
    } catch (e) {
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: '1. لوحة القيادة', icon: LayoutDashboard },
    { id: 'attendance', label: '2. الحضور والغياب', icon: CalendarCheck },
    { id: 'students', label: '3. إدارة الطلاب', icon: Users },
    { id: 'grades', label: '4. سجل الدرجات', icon: BarChart3 },
    { id: 'knights', label: '5. الفرسان', icon: Crown },
    { id: 'reports', label: '6. التقارير', icon: Printer },
    { id: 'settings', label: '7. الإعدادات', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-72 bg-slate-900 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl"><BookOpen className="w-5 h-5 text-white" /></div>
              <span className="font-black text-xl">دليل راصد</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white"><X size={20}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-bold transition-all duration-200
                  ${activeSection === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg translate-x-[-4px]' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <item.icon className={`w-4 h-4 ${activeSection === item.id ? 'text-white' : 'text-slate-500'}`} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800">
            <button onClick={handleDownloadPDF} disabled={isExporting} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
              {isExporting ? <span className="animate-pulse">جاري الحفظ...</span> : <><Download size={16} /> تحميل الدليل PDF</>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-950" id="guide-container">
        <button onClick={() => setSidebarOpen(true)} className="fixed top-4 right-4 z-40 p-3 bg-slate-800/80 backdrop-blur rounded-xl text-white shadow-lg lg:hidden border border-slate-700"><Menu size={24} /></button>

        {/* Hero */}
        <header id="hero" className="relative pt-20 pb-16 px-6 text-center border-b border-slate-900">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> الإصدار الشامل V4.0.2
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">دليل المستخدم <span className="text-indigo-500">الشامل</span></h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">كل ما تحتاج معرفته لاحتراف تطبيق راصد. تم تجميع كل التفاصيل الدقيقة والميزات المخفية في هذا المرجع.</p>
        </header>

        <div className="max-w-5xl mx-auto px-6 pb-32 space-y-24 pt-12">
          
          {/* 1. Dashboard */}
          <section id="dashboard" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-indigo-600 p-3 rounded-2xl"><LayoutDashboard className="w-6 h-6 text-white"/></div>
              <h2 className="text-3xl font-black text-white">1. لوحة القيادة (Dashboard)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailCard 
                icon={UserCog} colorClass="bg-indigo-500" 
                title="الهوية الرسمية (Profile)" 
                desc="اضغط على صورتك الشخصية في الأعلى لفتح نافذة التعديل."
                details={[
                  "إضافة صورة شخصية: تظهر في الواجهة.",
                  "إضافة توقيعك (صورة): يظهر تلقائياً في أسفل الشهادات والتقارير.",
                  "إضافة ختم المدرسة: لتوثيق الشهادات رسمياً.",
                  "شعار الوزارة: يمكنك رفعه ليظهر في ترويسة التقارير."
                ]}
              />
              <DetailCard 
                icon={CalendarCheck} colorClass="bg-amber-500" 
                title="الجدول والخطة (Timeline)" 
                desc="إدارة وقتك ومهامك بذكاء."
                details={[
                  "الجدول اليومي: يعرض حصص اليوم فقط. الحصة الحالية تظهر بلون مميز مع كلمة (الآن).",
                  "زر التحضير السريع: بجوار الحصة الحالية يوجد زر ينقلك مباشرة لصفحة الغياب.",
                  "خطة التقويم: بطاقات شهرية تعرض المهام المطلوبة. الشهر الحالي يظهر بوضوح."
                ]}
              />
              <DetailCard 
                icon={BellRing} colorClass="bg-rose-500" 
                title="شريط التنبيهات (Alert Bar)" 
                desc="شريط يظهر تلقائياً أسفل الشاشة."
                details={[
                  "يظهر فقط إذا كان هناك مهام تقويم في الشهر الحالي.",
                  "يذكرك بالمهام العاجلة (مثل: اختبار قصير 1).",
                  "يمكن إغلاقه يدوياً لجلسة العمل الحالية."
                ]}
              />
              <DetailCard 
                icon={FileSpreadsheet} colorClass="bg-emerald-500" 
                title="استيراد الجدول (Import)" 
                desc="من أيقونة 'الساعة' في أعلى الجدول."
                details={[
                  "يمكنك رفع ملف Excel يحتوي على جدولك.",
                  "أو تعديل توقيت الحصص يدوياً لضبط بداية ونهاية كل حصة."
                ]}
              />
            </div>
          </section>

          {/* 2. Attendance */}
          <section id="attendance" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-600 p-3 rounded-2xl"><CalendarCheck className="w-6 h-6 text-white"/></div>
              <h2 className="text-3xl font-black text-white">2. الحضور والغياب (Attendance)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailCard 
                icon={CheckCircle2} 
                title="التحضير الجماعي (Bulk Actions)" 
                desc="ثلاثة أزرار علوية ضخمة تنجز المهمة في ثوانٍ."
                details={[
                  "حضور الكل ✅: يضع علامة حاضر لجميع الطلاب بلمسة واحدة.",
                  "غياب الكل ❌: مفيد في الأيام التي يغيب فيها الفصل بالكامل.",
                  "تصفير: لإلغاء التحضير والبدء من جديد.",
                  "عداد حي: يعرض عدد (الحاضرين، الغائبين، المتأخرين) يتحدث لحظياً."
                ]}
              />
              <DetailCard 
                icon={MousePointerClick} 
                title="بطاقات الطلاب التفاعلية" 
                desc="كل طالب يظهر في بطاقة مستقلة تتلون بالكامل."
                details={[
                  "إطار أخضر 🟢 = حاضر.",
                  "إطار أحمر 🔴 = غائب.",
                  "إطار برتقالي 🟠 = متأخر.",
                  "إطار بنفسجي 🟣 = تسرب (هروب من الحصة).",
                  "أزرار تحكم سريعة داخل كل بطاقة لتغيير الحالة بلمسة."
                ]}
              />
              <DetailCard 
                icon={MessageCircle} 
                title="الإشعار الفوري (Smart Notify)" 
                desc="نظام ذكي يربط الغياب بالتواصل."
                details={[
                  "بمجرد ضغط 'غياب' أو 'تأخر'، يسألك التطبيق: (هل تريد إشعار ولي الأمر؟).",
                  "زر واتساب: يفتح المحادثة ويرسل رسالة جاهزة (السلام عليكم، ابنكم فلان غائب اليوم...).",
                  "زر SMS: للحالات التي لا تملك واتساب."
                ]}
              />
              <DetailCard 
                icon={Share2} 
                title="تصدير السجل (Excel)" 
                desc="زر المشاركة في الأعلى."
                details={[
                  "يولد ملف Excel احترافي لشهر كامل.",
                  "يحتوي على أيام الشهر (1-30) وحالة الطالب في كل يوم.",
                  "يحتوي على إحصائية نهائية (مجموع أيام الغياب والتأخر) لكل طالب."
                ]}
              />
            </div>
          </section>

          {/* 3. Students */}
          <section id="students" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-pink-600 p-3 rounded-2xl"><Users className="w-6 h-6 text-white"/></div>
              <h2 className="text-3xl font-black text-white">3. إدارة الطلاب (Students)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailCard 
                icon={Dices} 
                title="القرعة العشوائية (Random Picker)" 
                desc="أداة لكسر الجمود وضمان العدالة."
                details={[
                  "تختار طالباً عشوائياً من (الحاضرين فقط) وتتجاهل الغائبين.",
                  "مؤثرات بصرية (قصاصات ملونة) عند اختيار الفائز.",
                  "أزرار مباشرة لمنحه درجات أو نقاط تعزيز."
                ]}
              />
              <DetailCard 
                icon={Timer} 
                title="المؤقت الصفي (Timer)" 
                desc="لإدارة وقت الأنشطة والامتحانات القصيرة."
                details={[
                  "خيارات جاهزة (1، 3، 5، 10 دقائق).",
                  "الشاشة يتغير لونها وتنبض عند اقتراب النهاية.",
                  "جرس تنبيه عالي عند انتهاء الوقت."
                ]}
              />
              <DetailCard 
                icon={FileSpreadsheet} 
                title="الاستيراد الذكي (Import)" 
                desc="لإضافة مئات الطلاب دفعة واحدة."
                details={[
                  "اضغط (تحميل قالب فارغ) للحصول على ملف Excel منظم.",
                  "انسخ أسماء الطلاب وأرقامهم إلى القالب.",
                  "ارفع الملف وسيتم إنشاء الطلاب والفصول تلقائياً."
                ]}
              />
              <DetailCard 
                icon={Star} 
                title="مكافأة الانضباط (Group Reward)" 
                desc="زر سحري في قائمة الخيارات."
                details={[
                  "يمنح (نقطتين هدوء) لجميع الطلاب الحاضرين دفعة واحدة.",
                  "مفيد جداً لتحفيز الفصل على الهدوء والانضباط السريع."
                ]}
              />
            </div>
          </section>

          {/* 4. Grades */}
          <section id="grades" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-blue-600 p-3 rounded-2xl"><BarChart3 className="w-6 h-6 text-white"/></div>
              <h2 className="text-3xl font-black text-white">4. سجل الدرجات (Grades)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailCard 
                icon={Wand2} 
                title="الرصد السحري (Magic Fill)" 
                desc="أداة لتوفير الوقت عند رصد الدرجات الكاملة."
                details={[
                  "تتيح لك إدخال درجة معينة (مثلاً 10) وتطبيقها على جميع طلاب الفصل.",
                  "يمكنك بعدها تعديل درجات الطلاب الذين نقصوا فقط."
                ]}
              />
              <DetailCard 
                icon={Settings} 
                title="أدوات التقويم (Tools Setup)" 
                desc="تخصيص أعمدة السجل."
                details={[
                  "إضافة أدوات جديدة (مشروع، واجب، شفهي).",
                  "تحديد (الامتحان النهائي) لتمييزه بنجمة ★.",
                  "حذف الأدوات غير المرغوب فيها."
                ]}
              />
              <DetailCard 
                icon={PieChart} 
                title="التلوين التلقائي والتحليل" 
                desc="فهم مستوى الطالب بمجرد النظر."
                details={[
                  "التطبيق يجمع الدرجات تلقائياً.",
                  "يلون الخانة النهائية (أخضر = ممتاز، أصفر = جيد، أحمر = ضعيف/راسب).",
                  "يحسب التقدير اللفظي (أ، ب، ج، د، هـ) بناءً على إعداداتك."
                ]}
              />
              <DetailCard 
                icon={FileText} 
                title="تصدير السجل (Export)" 
                desc="تحويل السجل الرقمي لملف ورقي."
                details={[
                  "يصدر ملف Excel منظم يحتوي على أسماء الطلاب.",
                  "درجات كل أداة في عمود منفصل.",
                  "المجموع النهائي والتقدير."
                ]}
              />
            </div>
          </section>

          {/* 5. Knights */}
          <section id="knights" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-amber-600 p-3 rounded-2xl"><Crown className="w-6 h-6 text-white"/></div>
              <h2 className="text-3xl font-black text-white">5. لوحة الفرسان (Leaderboard)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailCard 
                icon={Award} 
                title="منصة الأبطال (The Podium)" 
                desc="عرض تنافسي للطلاب الثلاثة الأوائل."
                details={[
                  "المركز الأول يظهر في المنتصف مع تاج متحرك 👑.",
                  "يتم عرض (الاسم الأول + اللقب) لتفادي تشابه الأسماء.",
                  "باقي الطلاب يظهرون في قائمة مرتبة أسفل المنصة."
                ]}
              />
              <DetailCard 
                icon={Scroll} 
                title="نافذة الشهادات (Certificates)" 
                desc="بضغطة زر (شهادة) تحت اسم أي طالب."
                details={[
                  "تفتح معاينة لشهادة فخمة وجاهزة.",
                  "تحتوي تلقائياً على: اسم الطالب، شعار الوزارة، توقيع المعلم، توقيع المدير، وختم المدرسة.",
                  "زر تحميل PDF لحفظها وطباعتها."
                ]}
              />
              <DetailCard 
                icon={Users} 
                title="تخصيص نوع المدرسة" 
                desc="من القائمة العلوية."
                details={[
                  "يمكنك اختيار (ذكور / إناث / مختلط).",
                  "يتغير عنوان الصفحة تلقائياً إلى (فرسان شهر..) أو (فارسات شهر..)."
                ]}
              />
            </div>
          </section>

          {/* 6. Reports */}
          <section id="reports" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-indigo-600 p-3 rounded-2xl"><Printer className="w-6 h-6 text-white"/></div>
              <h2 className="text-3xl font-black text-white">6. مركز التقارير (Report Center)</h2>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <DetailCard 
                icon={FileText} 
                title="تقرير الطالب الشامل (Student Profile)" 
                desc="الوثيقة الأهم لمقابلة ولي الأمر."
                details={[
                  "يعرض بيانات الطالب الأساسية.",
                  "رسم بياني لمستواه في المواد.",
                  "جدول تفصيلي لدرجاته.",
                  "سجل سلوكي (المخالفات + التميز).",
                  "ميزة (طباعة الفصل كاملاً): تطبع ملفاً واحداً يحتوي على تقارير جميع الطلاب لسهولة التوزيع."
                ]}
              />
              <DetailCard 
                icon={Printer} 
                title="طباعة الشهادات الجماعية" 
                desc="وفر الورق والوقت."
                details={[
                  "بدلاً من طباعة شهادة واحدة في كل ورقة، هذه الميزة تتيح لك تحديد 10 أو 20 طالباً.",
                  "يتم دمجهم في ملف PDF واحد.",
                  "جاهزة للطباعة والقص والتوزيع."
                ]}
              />
              <DetailCard 
                icon={MailWarning} 
                title="استدعاء ولي أمر (Summon Letter)" 
                desc="خطاب رسمي شديد اللهجة (ولكن مهذب)."
                details={[
                  "نموذج رسمي بترويسة الوزارة.",
                  "يحتوي على خيارات جاهزة لسبب الاستدعاء (تدني مستوى، غياب متكرر، سلوك).",
                  "خانة لتحديد (تاريخ ووقت) الزيارة المقترح.",
                  "مكان لتوقيع ولي الأمر بالعلم."
                ]}
              />
            </div>
          </section>

          {/* 7. Settings */}
          <section id="settings" className="scroll-mt-24 border-t border-slate-800 pt-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-slate-700 p-3 rounded-2xl"><Settings className="w-6 h-6 text-white"/></div>
              <h2 className="text-3xl font-black text-white">7. الإعدادات والأمان</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailCard 
                icon={HardDriveDownload} 
                title="النسخ الاحتياطي (Backup)" 
                desc="بياناتك هي أثمن ما تملك."
                details={[
                  "زر (تصدير نسخة احتياطية) يحفظ ملفاً مشفراً يحتوي على كل شيء (طلاب، درجات، إعدادات).",
                  "احفظ هذا الملف في جوجل درايف أو أرسله لنفسك بالواتساب."
                ]}
              />
              <DetailCard 
                icon={RefreshCw} 
                title="استعادة البيانات (Restore)" 
                desc="عند تغيير الهاتف أو فرمتة الجهاز."
                details={[
                  "اختر ملف النسخة الاحتياطية الذي حفظته سابقاً.",
                  "سيعود التطبيق كما كان تماماً في ثوانٍ."
                ]}
              />
              <DetailCard 
                icon={Trash2} 
                title="تصفير البيانات (Reset)" 
                desc="لبدء عام دراسي جديد."
                details={[
                  "خيارات متعددة: حذف الدرجات فقط، حذف الغياب فقط، أو تصفير شامل.",
                  "نوافذ تحذيرية للتأكد قبل الحذف النهائي."
                ]}
              />
              <DetailCard 
                icon={WifiOff} 
                title="العمل أوفلاين" 
                desc="الخصوصية أولاً."
                details={[
                  "التطبيق لا يرفع أي بيانات لسيرفرات خارجية.",
                  "كل شيء مخزن في ذاكرة هاتفك.",
                  "الإنترنت مطلوب فقط لإرسال الواتساب."
                ]}
              />
            </div>
          </section>

        </div>

        <div className="text-center py-12 text-slate-500 text-sm font-medium border-t border-slate-900 bg-slate-950">
          تم التطوير لخدمة المعلم العماني ❤️ | جميع الحقوق محفوظة {new Date().getFullYear()}
        </div>
      </main>
    </div>
  );
};

export default UserGuide;
