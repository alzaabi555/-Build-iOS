import React, { useState } from 'react';
import { 
  Printer, BookOpen, LayoutDashboard, Users, CalendarCheck, 
  BarChart3, Award, Globe, Database, Settings, ShieldCheck, 
  Menu, X, ChevronLeft, Lightbulb, MousePointerClick, FileText, 
  Download, Code, Smartphone, Monitor, Apple, CheckCircle2
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const UserGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState('intro');
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [isExporting, setIsExporting] = useState(false);

  const sections = [
    { id: 'intro', title: 'مقدمة وفلسفة التطبيق', icon: BookOpen },
    { id: 'downloads', title: 'تحميل التطبيق (النسخ)', icon: Download },
    { id: 'dashboard', title: 'لوحة التحكم والجدول', icon: LayoutDashboard },
    { id: 'students', title: 'إدارة الطلاب والبيانات', icon: Users },
    { id: 'attendance', title: 'نظام الحضور الذكي', icon: CalendarCheck },
    { id: 'grades', title: 'سجل الدرجات المتطور', icon: BarChart3 },
    { id: 'gamification', title: 'التحفيز ودوري العباقرة', icon: Award },
    { id: 'ministry', title: 'الربط الوزاري الآمن', icon: Globe },
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

      const opt = {
          margin: [10, 10, 10, 10],
          filename: 'Rased_User_Manual.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      try {
          const worker = html2pdf().set(opt).from(element).toPdf();
          
          if (Capacitor.isNativePlatform()) {
              const pdfBase64 = await worker.output('datauristring');
              const base64Data = pdfBase64.split(',')[1];
              const result = await Filesystem.writeFile({
                  path: 'Rased_User_Manual.pdf',
                  data: base64Data,
                  directory: Directory.Cache
              });
              await Share.share({
                  title: 'دليل مستخدم راصد',
                  url: result.uri
              });
          } else {
              worker.save();
          }
      } catch (e) {
          console.error('PDF Export Error:', e);
          alert('حدث خطأ أثناء تصدير الدليل.');
      } finally {
          setIsExporting(false);
      }
  };

  const handleDownloadHTML = async () => {
      const content = document.getElementById('guide-content-inner')?.innerHTML;
      if (!content) return;

      const fullHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>دليل مستخدم تطبيق راصد</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px; line-height: 1.6; }
        h1, h2, h3 { color: #1e293b; font-weight: 900; }
        h1 { border-bottom: 4px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 30px; }
        section { background: white; padding: 30px; border-radius: 16px; margin-bottom: 30px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        ul { padding-right: 20px; }
        li { margin-bottom: 8px; }
        .highlight { background: #e0e7ff; color: #1e3a8a; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
    </style>
</head>
<body>
    <div style="max-width: 800px; margin: 0 auto;">
        ${content}
        <div style="text-align: center; margin-top: 50px; color: #64748b; font-size: 12px;">
            <p>تم استخراج هذا الدليل من تطبيق راصد - الإصدار 3.6.0</p>
        </div>
    </div>
</body>
</html>`;

      if (Capacitor.isNativePlatform()) {
          try {
              const result = await Filesystem.writeFile({
                  path: 'Rased_Guide.html',
                  data: fullHtml,
                  directory: Directory.Cache,
                  encoding: Encoding.UTF8
              });
              await Share.share({
                  title: 'دليل مستخدم راصد (HTML)',
                  url: result.uri
              });
          } catch(e) { console.error(e); }
      } else {
          const blob = new Blob([fullHtml], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Rased_Manual.html';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans relative">
        
        {/* ================= Header (Fixed Blue) ================= */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-6 pt-[env(safe-area-inset-top)] pb-8 transition-all duration-300">
            <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 lg:hidden text-white transition-colors">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-blue-300" />
                            دليل المعلم المحترف
                        </h1>
                        <p className="text-[10px] font-bold text-blue-200 opacity-80">راصد V3.6.0 - الدليل الرسمي</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isExporting}
                        className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        {isExporting ? 'جاري...' : 'PDF'}
                    </button>
                    <button 
                        onClick={handleDownloadHTML}
                        className="bg-white text-[#1e3a8a] px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-slate-100 transition-all active:scale-95 hidden sm:flex"
                    >
                        <Code className="w-4 h-4" />
                        HTML
                    </button>
                </div>
            </div>
        </div>

        {/* ================= Main Content Layout ================= */}
        <div className="flex flex-1 h-full pt-[130px] relative overflow-hidden">
            
            {/* Sidebar Navigation (Desktop: Sticky Left, Mobile: Drawer) */}
            <aside className={`
                fixed inset-y-0 right-0 z-40 w-64 bg-white border-l border-slate-200 shadow-2xl lg:shadow-none lg:static lg:block transition-transform duration-300 pt-[env(safe-area-inset-top)] lg:pt-0
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}>
                <div className="flex flex-col h-full">
                    <div className="p-4 lg:hidden flex justify-end">
                        <button onClick={() => setSidebarOpen(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500"/></button>
                    </div>
                    <div className="p-4 space-y-1 h-full overflow-y-auto custom-scrollbar pb-20">
                        <p className="text-xs font-black text-slate-400 mb-3 px-2">فهرس المحتويات</p>
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-bold text-xs text-right ${activeSection === section.id ? 'bg-[#1e3a8a] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <section.icon className={`w-4 h-4 ${activeSection === section.id ? 'text-blue-300' : 'text-slate-400'}`} />
                                {section.title}
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>}

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] p-4 md:p-6 scroll-smooth" id="guide-content">
                <div id="guide-content-inner" className="max-w-4xl mx-auto space-y-8 pb-32">
                    
                    {/* 1. Intro */}
                    <section id="intro" className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 scroll-mt-36">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Lightbulb className="w-6 h-6" /></div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">1. فلسفة راصد</h2>
                        </div>
                        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium text-sm md:text-base">
                            <p className="mb-4">
                                تم تصميم تطبيق <strong>راصد</strong> (Rased App) ليكون المساعد الرقمي الشخصي للمعلم العماني. الفكرة الأساسية هي "الأتمتة الكاملة" لمهام المعلم الروتينية.
                            </p>
                            <ul className="list-disc pr-5 space-y-2">
                                <li>يعمل التطبيق <strong>بدون إنترنت</strong> بشكل كامل للحفاظ على الخصوصية والسرعة.</li>
                                <li>تم تصميم واجهة المستخدم لتكون مريحة للعين وتدعم الاستخدام السريع بيد واحدة.</li>
                                <li>يدعم التطبيق التزامن مع بوابة الوزارة عند توفر الإنترنت برغبة المعلم.</li>
                            </ul>
                        </div>
                    </section>
                    
                    {/* 2. Downloads */}
                    <section id="downloads" className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 scroll-mt-36 no-print">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600"><Download className="w-6 h-6" /></div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">2. تحميل التطبيق</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="border border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center hover:shadow-lg transition-all bg-emerald-50/50">
                                <Smartphone className="w-8 h-8 text-emerald-600 mb-2"/>
                                <h3 className="font-black text-base text-slate-900">أندرويد (APK)</h3>
                                <p className="text-[10px] text-gray-500 mt-1">تحميل مباشر</p>
                            </div>
                            <div className="border border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center hover:shadow-lg transition-all bg-slate-50/50">
                                <Apple className="w-8 h-8 text-slate-800 mb-2"/>
                                <h3 className="font-black text-base text-slate-900">آيفون (iOS)</h3>
                                <p className="text-[10px] text-gray-500 mt-1">ملف IPA</p>
                            </div>
                            <div className="border border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center hover:shadow-lg transition-all bg-blue-50/50">
                                <Monitor className="w-8 h-8 text-blue-600 mb-2"/>
                                <h3 className="font-black text-base text-slate-900">كمبيوتر (PC)</h3>
                                <p className="text-[10px] text-gray-500 mt-1">نظام Windows</p>
                            </div>
                        </div>
                    </section>

                    {/* 3. Dashboard */}
                    <section id="dashboard" className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 scroll-mt-36">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600"><LayoutDashboard className="w-6 h-6" /></div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">3. لوحة التحكم والجدول</h2>
                        </div>
                        <div className="text-slate-600 leading-relaxed font-medium space-y-4 text-sm md:text-base">
                            <p>تعتبر لوحة التحكم هي واجهة الانطلاق اليومية للمعلم، حيث تعرض:</p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"/> <span><strong>جدول الحصص اليومي:</strong> يظهر جدول اليوم الحالي تلقائياً. الحصة الحالية يتم تمييزها بلون مختلف ومؤشر "الآن".</span></li>
                                <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"/> <span><strong>جرس الحصص:</strong> يمكنك تفعيل التنبيهات للحصول على إشعار صوتي عند بداية ونهاية كل حصة.</span></li>
                                <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"/> <span><strong>الملف الشخصي:</strong> يمكنك تحديث بياناتك (الاسم، المدرسة، الشعار) من خلال أيقونة القلم في الأعلى.</span></li>
                            </ul>
                        </div>
                    </section>

                    {/* 4. Students */}
                    <section id="students" className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 scroll-mt-36">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Users className="w-6 h-6" /></div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">4. إدارة الطلاب والبيانات</h2>
                        </div>
                        <div className="text-slate-600 leading-relaxed font-medium text-sm md:text-base">
                            <p className="mb-4">يمكنك إضافة الطلاب بطريقتين:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-slate-900 mb-2">الإضافة اليدوية</h4>
                                    <p className="text-xs">إضافة طالب واحد في كل مرة مع تحديد الاسم والصف ورقم ولي الأمر.</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-slate-900 mb-2">الاستيراد من Excel</h4>
                                    <p className="text-xs">الطريقة الأسرع. قم برفع ملف إكسل يحتوي على عمودي "الاسم" و"رقم الهاتف" وسيتم إضافة الفصل كاملاً.</p>
                                </div>
                            </div>
                            <p><strong>تلميح:</strong> يمكنك استخدام ميزة "الاختيار العشوائي" في الفصل لطرح الأسئلة بشكل عادل.</p>
                        </div>
                    </section>

                    {/* 5. Attendance */}
                    <section id="attendance" className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 scroll-mt-36">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600"><CalendarCheck className="w-6 h-6" /></div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">5. نظام الحضور الذكي</h2>
                        </div>
                        <div className="text-slate-600 leading-relaxed font-medium space-y-4 text-sm md:text-base">
                            <p>رصد الغياب أصبح أسهل من أي وقت مضى:</p>
                            <ul className="list-disc pr-5 space-y-2">
                                <li>اضغط على الأيقونات (صح، خطأ، ساعة، باب) أمام اسم الطالب لتحديد حالته (حضور، غياب، تأخير، تسرب).</li>
                                <li><strong>تنبيهات الواتساب:</strong> عند تسجيل غياب أو تأخير، يظهر زر لإرسال رسالة جاهزة لولي الأمر بضغطة زر واحدة.</li>
                                <li>يمكنك تصدير كشف غياب شهري بصيغة Excel من أعلى الصفحة.</li>
                            </ul>
                        </div>
                    </section>

                    {/* 6. Grades */}
                    <section id="grades" className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 scroll-mt-36">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><BarChart3 className="w-6 h-6" /></div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">6. سجل الدرجات المتطور</h2>
                        </div>
                        <div className="text-slate-600 leading-relaxed font-medium space-y-4 text-sm md:text-base">
                            <p>يتيح لك السجل إنشاء أدوات تقويم مخصصة (مثل: اختبار قصير 1، مشروع، واجبات) ورصد الدرجات بسهولة.</p>
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-900">
                                <strong>ميزة المصحح الإلكتروني:</strong> يمكنك تصوير ورقة اختبار الطالب وتصحيحها داخل التطبيق وحفظ صورة الورقة المصححة مع الدرجة في ملف الطالب.
                            </div>
                        </div>
                    </section>

                    {/* 7. Gamification */}
                    <section id="gamification" className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 scroll-mt-36">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600"><Award className="w-6 h-6" /></div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">7. التحفيز ودوري العباقرة</h2>
                        </div>
                        <div className="text-slate-600 leading-relaxed font-medium text-sm md:text-base">
                            <p className="mb-4">حول فصلك إلى بيئة تنافسية ممتعة:</p>
                            <ul className="space-y-3">
                                <li><strong>نقاط السلوك:</strong> امنح نقاطاً إيجابية (👍) أو سلبية (👎) للطلاب. النقاط الإيجابية تتحول إلى "عملات ذهبية".</li>
                                <li><strong>المتجر:</strong> يمكن للطلاب استبدال عملاتهم بمكافآت (مثل: تغيير المكان، قائد الطابور).</li>
                                <li><strong>دوري المجموعات:</strong> قسّم الفصل إلى فرق وتنافسوا على اللقب.</li>
                            </ul>
                        </div>
                    </section>

                    {/* 8. Ministry Sync */}
                    <section id="ministry" className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 scroll-mt-36">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600"><Globe className="w-6 h-6" /></div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">8. الربط الوزاري الآمن</h2>
                        </div>
                        <div className="text-slate-600 leading-relaxed font-medium text-sm md:text-base">
                            <p className="mb-4">ميزة حصرية لربط التطبيق مع البوابة التعليمية لرفع الغياب والدرجات بضغطة زر.</p>
                            <div className="bg-slate-100 p-4 rounded-xl text-[10px] font-mono mb-4 text-left text-slate-600" dir="ltr">
                                https://mobile.moe.gov.om/...
                            </div>
                            <p className="text-xs text-slate-500">
                                <strong>ملاحظة هامة:</strong> يتم الاتصال مباشرة بين جهازك وخوادم الوزارة عبر قناة مشفرة. لا يتم تخزين كلمات المرور أو البيانات الحساسة على أي خوادم خارجية.
                            </p>
                        </div>
                    </section>

                    {/* 9. Data & Security */}
                    <section id="data" className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 scroll-mt-36">
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><Database className="w-6 h-6" /></div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">9. البيانات والأمان</h2>
                        </div>
                        <div className="text-slate-600 leading-relaxed font-medium space-y-4 text-sm md:text-base">
                            <p>جميع البيانات مخزنة <strong>محلياً على جهازك</strong> ولا يتم رفعها لأي سحابة (Cloud).</p>
                            <ul className="list-disc pr-5 space-y-2">
                                <li>قم بعمل <strong>نسخة احتياطية</strong> بشكل دوري من صفحة الإعدادات.</li>
                                <li>يمكنك استعادة البيانات عند تغيير الجهاز أو حذف التطبيق عن طريق الخطأ.</li>
                                <li>استخدم ميزة "تصدير PDF" للاحتفاظ بنسخ ورقية من التقارير والسجلات.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Footer */}
                    <div className="text-center pt-8 border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-400"> ❤️</p>
                    </div>
                </div>
            </main>
        </div>
    </div>
  );
};

export default UserGuide;
