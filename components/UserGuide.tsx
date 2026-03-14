import React, { useState, useMemo } from 'react';
// ✅ تم استخدام أيقونات آمنة (Standard Icons) لمنع الأخطاء والشاشة البيضاء
import {
  Home, Users, Calendar, BarChart, Award, Settings, BookOpen, 
  Download, Menu, X, WifiOff, MessageCircle, FileText, Shield, 
  CheckCircle, PenTool, PieChart, Printer, Save, RefreshCw, 
  Trash2, Share2, MousePointer, User, Bell, File, Clock, Star
} from 'lucide-react';

// ✅ استيراد آمن للمكتبة لمنع أخطاء التصدير
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

// --- Components ---

type DetailCardProps = {
  icon: React.ElementType;
  title: string;
  desc: string;
  details?: string[];
  colorClass?: string;
};

const DetailCard: React.FC<DetailCardProps> = ({ icon: Icon, title, desc, details, colorClass }) => (
  <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/30 transition-all duration-300">
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-xl shrink-0 text-white ${colorClass ?? 'bg-indigo-600/30'}`}>
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

  // ✅ استخدام useMemo للأيقونات الآمنة
  const menuItems = useMemo(
    () => [
      { id: 'dashboard', label: '1. لوحة القيادة', icon: Home },
      { id: 'attendance', label: '2. الحضور والغياب', icon: Calendar },
      { id: 'students', label: '3. إدارة الطلاب', icon: Users },
      { id: 'grades', label: '4. سجل الدرجات', icon: BarChart },
      { id: 'knights', label: '5. الفرسان', icon: Award },
      { id: 'reports', label: '6. التقارير', icon: Printer },
      { id: 'settings', label: '7. الإعدادات', icon: Settings },
    ],
    []
  );

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSidebarOpen(false);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);

      // ✅ تحديد العنصر الداخلي الذي يحتوي على النصوص (وليس الحاوية الخارجية) لضمان تصوير كل شيء
      const element = document.getElementById('guide-content-inner');
      
      if (!element) {
        alert('لم يتم العثور على محتوى الدليل!');
        return;
      }

      const opt = {
        margin: [5, 5, 5, 5],
        filename: 'Rased_Manual.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#0f172a', // الخلفية الداكنة
            scrollY: 0 // مهم جداً لتصوير المحتوى الطويل المخفي
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      // ✅ استدعاء آمن للمكتبة
      const worker = html2pdf().set(opt).from(element);

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await worker.output('datauristring');
        
        // تنظيف البيانات (إزالة الـ Prefix)
        const base64Data = pdfBase64.split(',')[1];

        const result = await Filesystem.writeFile({
          path: `Rased_Manual_${new Date().getTime()}.pdf`,
          data: base64Data,
          directory: Directory.Cache,
        });
        
        await Share.share({ 
            title: 'دليل راصد الشامل', 
            url: result.uri,
            dialogTitle: 'مشاركة الدليل PDF'
        });
      } else {
        // للويب
        worker.save();
      }
    } catch (e) {
      console.error("PDF Export Error:", e);
      alert('حدث خطأ أثناء التصدير. حاول مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed inset-y-0 right-0 z-50 w-72 bg-slate-900 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static
        `}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl">دليل راصد</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-bold transition-all duration-200
                  ${
                    activeSection === item.id
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
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {isExporting ? (
                <span className="animate-pulse">جاري الحفظ...</span>
              ) : (
                <>
                  <Download size={16} /> تحميل الدليل PDF
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-950">
        
        {/* زر القائمة للموبايل */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 right-4 z-40 p-3 bg-slate-800/80 backdrop-blur rounded-xl text-white shadow-lg lg:hidden border border-slate-700"
        >
          <Menu size={24} />
        </button>

        {/* ✅ هذا هو الـ ID المهم جداً للتصدير: يجب أن يغلف المحتوى الداخلي فقط */}
        <div id="guide-content-inner" className="w-full">

            <header id="hero" className="relative pt-20 pb-16 px-6 text-center border-b border-slate-900 bg-slate-950">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> الإصدار الشامل V4.4.1
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
                دليل المستخدم <span className="text-indigo-500">الشامل</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                كل ما تحتاج معرفته لاحتراف تطبيق راصد. تم تجميع كل التفاصيل الدقيقة والميزات المخفية في هذا المرجع.
              </p>
            </header>

            <div className="max-w-5xl mx-auto px-6 pb-32 space-y-24 pt-12 bg-slate-950">
              
              {/* 1. Dashboard */}
              <section id="dashboard" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-indigo-600 p-3 rounded-2xl">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white">1. لوحة القيادة (Dashboard)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    icon={User}
                    colorClass="bg-indigo-600"
                    title="الهوية الرسمية (Profile)"
                    desc="اضغط على صورتك الشخصية في الأعلى لفتح نافذة التعديل."
                    details={[
                      'إضافة صورة شخصية: تظهر في الواجهة.',
                      'إضافة توقيعك (صورة): يظهر تلقائياً في أسفل الشهادات والتقارير.',
                      'إضافة ختم المدرسة: لتوثيق الشهادات رسمياً.',
                      'شعار الوزارة: يمكنك رفعه ليظهر في ترويسة التقارير.',
                    ]}
                  />
                  <DetailCard
                    icon={Calendar}
                    colorClass="bg-amber-600"
                    title="الجدول والخطة (Timeline)"
                    desc="إدارة وقتك ومهامك بذكاء."
                    details={[
                      'الجدول اليومي: يعرض حصص اليوم فقط. الحصة الحالية تظهر بلون مميز مع كلمة (الآن).',
                      'زر التحضير السريع: بجوار الحصة الحالية يوجد زر ينقلك مباشرة لصفحة الغياب.',
                      'خطة التقويم: بطاقات شهرية تعرض المهام المطلوبة. الشهر الحالي يظهر بوضوح.',
                    ]}
                  />
                  <DetailCard
                    icon={Bell}
                    colorClass="bg-rose-600"
                    title="شريط التنبيهات (Alert Bar)"
                    desc="شريط يظهر تلقائياً أسفل الشاشة."
                    details={[
                      'يظهر فقط إذا كان هناك مهام تقويم في الشهر الحالي.',
                      'يذكرك بالمهام العاجلة (مثل: اختبار قصير 1).',
                      'يمكن إغلاقه يدوياً لجلسة العمل الحالية.',
                    ]}
                  />
                  <DetailCard
                    icon={Clock}
                    colorClass="bg-emerald-600"
                    title="استيراد الجدول (Import)"
                    desc="من أيقونة الساعة في أعلى الجدول."
                    details={[
                      'يمكنك رفع ملف Excel يحتوي على جدولك.',
                      'أو تعديل توقيت الحصص يدوياً لضبط بداية ونهاية كل حصة.',
                    ]}
                  />
                </div>
              </section>

              {/* 2. Attendance */}
              <section id="attendance" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-emerald-600 p-3 rounded-2xl">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white">2. الحضور والغياب (Attendance)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    icon={CheckCircle}
                    title="التحضير الجماعي (Bulk Actions)"
                    desc="ثلاثة أزرار علوية ضخمة تنجز المهمة في ثوانٍ."
                    details={[
                      'حضور الكل ✅: يضع علامة حاضر لجميع الطلاب بلمسة واحدة.',
                      'غياب الكل ❌: مفيد في الأيام التي يغيب فيها الفصل بالكامل.',
                      'تصفير: لإلغاء التحضير والبدء من جديد.',
                      'عداد حي: يعرض عدد (الحاضرين، الغائبين، المتأخرين) يتحدث لحظياً.',
                    ]}
                  />
                  <DetailCard
                    icon={MousePointer}
                    title="بطاقات الطلاب التفاعلية"
                    desc="كل طالب يظهر في بطاقة مستقلة تتلون بالكامل."
                    details={[
                      'إطار أخضر 🟢 = حاضر.',
                      'إطار أحمر 🔴 = غائب.',
                      'إطار برتقالي 🟠 = متأخر.',
                      'إطار بنفسجي 🟣 = تسرب (هروب من الحصة).',
                      'أزرار تحكم سريعة داخل كل بطاقة لتغيير الحالة بلمسة.',
                    ]}
                  />
                  <DetailCard
                    icon={MessageCircle}
                    title="الإشعار الفوري (Smart Notify)"
                    desc="نظام ذكي يربط الغياب بالتواصل."
                    details={[
                      "بمجرد ضغط 'غياب' أو 'تأخر'، يسألك التطبيق: (هل تريد إشعار ولي الأمر؟).",
                      'زر واتساب: يفتح المحادثة ويرسل رسالة جاهزة.',
                      'زر SMS: للحالات التي لا تملك واتساب.',
                    ]}
                  />
                  <DetailCard
                    icon={Share2}
                    title="تصدير السجل (Excel)"
                    desc="زر المشاركة في الأعلى."
                    details={[
                      'يولد ملف Excel احترافي لشهر كامل.',
                      'يحتوي على أيام الشهر وحالة الطالب في كل يوم.',
                      'يحتوي على إحصائية نهائية لكل طالب.',
                    ]}
                  />
                </div>
              </section>

              {/* 3. Students */}
              <section id="students" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-pink-600 p-3 rounded-2xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white">3. إدارة الطلاب (Students)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    icon={Award}
                    title="القرعة العشوائية (Random Picker)"
                    desc="أداة لكسر الجمود وضمان العدالة."
                    details={[
                      'تختار طالباً عشوائياً من (الحاضرين فقط) وتتجاهل الغائبين.',
                      'مؤثرات بصرية عند اختيار الفائز.',
                      'أزرار مباشرة لمنحه درجات أو نقاط تعزيز.',
                    ]}
                  />
                  <DetailCard
                    icon={Clock}
                    title="المؤقت الصفي (Timer)"
                    desc="لإدارة وقت الأنشطة والامتحانات القصيرة."
                    details={[
                      'خيارات جاهزة (1، 3، 5، 10 دقائق).',
                      'الشاشة يتغير لونها عند اقتراب النهاية.',
                      'تنبيه عند انتهاء الوقت.',
                    ]}
                  />
                  <DetailCard
                    icon={File}
                    title="الاستيراد الذكي (Import)"
                    desc="لإضافة مئات الطلاب دفعة واحدة."
                    details={[
                      'تحميل قالب Excel منظم.',
                      'نسخ الأسماء والأرقام إلى القالب.',
                      'رفع الملف لإنشاء الطلاب تلقائياً.',
                    ]}
                  />
                  <DetailCard
                    icon={Star}
                    title="مكافأة الانضباط (Group Reward)"
                    desc="زر سحري في قائمة الخيارات."
                    details={[
                      'يمنح نقاطًا لجميع الطلاب الحاضرين دفعة واحدة.',
                      'مفيد لتحفيز الفصل على الهدوء والانضباط.',
                    ]}
                  />
                </div>
              </section>

              {/* 4. Grades */}
              <section id="grades" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-blue-600 p-3 rounded-2xl">
                    <BarChart className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white">4. سجل الدرجات (Grades)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    icon={PenTool}
                    title="الرصد السحري (Magic Fill)"
                    desc="أداة لتوفير الوقت عند رصد الدرجات."
                    details={['تطبيق درجة موحدة للجميع ثم تعديل من نقصت درجته فقط.']}
                  />
                  <DetailCard
                    icon={Settings}
                    title="أدوات التقويم (Tools Setup)"
                    desc="تخصيص أعمدة السجل."
                    details={['إضافة/حذف أدوات، وتحديد الامتحان النهائي بنجمة ★.']}
                  />
                  <DetailCard
                    icon={PieChart}
                    title="التلوين التلقائي والتحليل"
                    desc="فهم مستوى الطالب بمجرد النظر."
                    details={['تلوين النتيجة النهائية حسب الأداء وحساب التقدير.']}
                  />
                  <DetailCard
                    icon={FileText}
                    title="تصدير السجل (Export)"
                    desc="تحويل السجل الرقمي لملف ورقي."
                    details={['Excel منظم: أسماء + درجات + مجموع + تقدير.']}
                  />
                </div>
              </section>

              {/* 5. Knights */}
              <section id="knights" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-amber-600 p-3 rounded-2xl">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white">5. لوحة الفرسان (Leaderboard)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    icon={Award}
                    title="منصة الأبطال (The Podium)"
                    desc="عرض تنافسي للطلاب الثلاثة الأوائل."
                    details={['المركز الأول في المنتصف، وبقية الطلاب في قائمة مرتبة.']}
                  />
                  <DetailCard
                    icon={FileText}
                    title="نافذة الشهادات (Certificates)"
                    desc="معاينة شهادة فخمة جاهزة."
                    details={['زر تحميل PDF لحفظها وطباعتها.']}
                  />
                  <DetailCard
                    icon={Users}
                    title="تخصيص نوع المدرسة"
                    desc="من القائمة العلوية."
                    details={['اختيار (ذكور/إناث/مختلط) وتغيير العناوين تلقائياً.']}
                  />
                </div>
              </section>

              {/* 6. Reports */}
              <section id="reports" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-indigo-600 p-3 rounded-2xl">
                    <Printer className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white">6. مركز التقارير (Report Center)</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <DetailCard
                    icon={FileText}
                    title="تقرير الطالب الشامل (Student Profile)"
                    desc="الوثيقة الأهم لمقابلة ولي الأمر."
                    details={['بيانات + درجات + سلوك + ميزات طباعة جماعية للفصل.']}
                  />
                  <DetailCard
                    icon={Printer}
                    title="طباعة الشهادات الجماعية"
                    desc="وفر الورق والوقت."
                    details={['دمج شهادات متعددة في PDF واحد للطباعة والقص.']}
                  />
                  <DetailCard
                    icon={Shield}
                    title="استدعاء ولي أمر (Summon Letter)"
                    desc="خطاب رسمي منظم."
                    details={['سبب الاستدعاء + موعد مقترح + مكان توقيع ولي الأمر.']}
                  />
                </div>
              </section>

              {/* 7. Settings */}
              <section id="settings" className="scroll-mt-24 border-t border-slate-800 pt-12">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-slate-700 p-3 rounded-2xl">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white">7. الإعدادات والأمان</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailCard
                    icon={Save}
                    title="النسخ الاحتياطي (Backup)"
                    desc="بياناتك هي أثمن ما تملك."
                    details={['تصدير نسخة مشفرة وحفظها في مكان آمن.']}
                  />
                  <DetailCard
                    icon={RefreshCw}
                    title="استعادة البيانات (Restore)"
                    desc="عند تغيير الهاتف."
                    details={['اختر ملف النسخة الاحتياطية وسيعود التطبيق كما كان.']}
                  />
                  <DetailCard
                    icon={Trash2}
                    title="تصفير البيانات (Reset)"
                    desc="لبدء عام جديد."
                    details={['خيارات متعددة مع تأكيدات للحذف.']}
                  />
                  <DetailCard
                    icon={WifiOff}
                    title="العمل أوفلاين"
                    desc="الخصوصية أولاً."
                    details={['الإنترنت مطلوب فقط للواتساب/المشاركة.']}
                  />
                </div>
              </section>
            </div>

            <div className="text-center py-12 text-slate-500 text-sm font-medium border-t border-slate-900 bg-slate-950">
              تم التطوير لخدمة المعلم العماني | جميع الحقوق محفوظة {new Date().getFullYear()}
            </div>

        </div> {/* End of #guide-content-inner */}

      </main>
    </div>
  );
};

export default UserGuide;
