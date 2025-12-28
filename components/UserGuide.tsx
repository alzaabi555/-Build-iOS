import React, { useRef, useState } from 'react';
import { 
  BookOpen, Download, Globe, BarChart3, CalendarCheck, Users, 
  GraduationCap, Trophy, Brain, FileSpreadsheet, Settings, 
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
                <li><strong>زر الإعدادات (الترس - في الموبايل):</strong> يظهر في الزاوية للوصول السريع لخيارات التطبيق العامة.</li>
            </ul>
        </div>

        <div class="feature-block">
            <h3>2. الجدول المدرسي وإدارة الوقت</h3>
            <ul>
                <li><strong>عرض الجدول:</strong> يظهر جدول حصص اليوم الحالي تلقائياً. يمكنك التنقل بين الأيام بالضغط على أزرار الأيام (الأحد، الاثنين...) أعلى الجدول.</li>
                <li><strong>زر "تعديل":</strong> يفتح نافذة لكتابة المواد أو الفصول لكل حصة يدوياً.</li>
                <li><strong>زر "استيراد Excel":</strong> داخل نافذة التعديل، يمكنك رفع ملف Excel يحتوي على الجدول. (يجب أن يكون الملف مرتباً بحيث تكون الأيام في عمود والحصص تليها في نفس الصف).</li>
                <li><strong>زر "التوقيت" (Clock):</strong> ميزة حيوية! اضغط عليها لضبط وقت بداية ونهاية كل حصة. هذا يفعل نظام التنبيهات وإشعارات "بداية/نهاية الحصة" التلقائية.</li>
            </ul>
        </div>

        <div class="feature-block">
            <h3>3. الإحصائيات السريعة</h3>
            <ul>
                <li><strong>دائرة الحضور:</strong> رسم بياني يوضح نسبة الحضور والغياب لليوم الحالي.</li>
                <li><strong>عدادات السلوك:</strong> بطاقات تعرض إجمالي نقاط السلوك الإيجابي (الأخضر) والسلبي (الأحمر) المرصودة اليوم.</li>
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
            <p>قسم الطلاب هو القلب النابض للتطبيق. هنا يتم إضافة البيانات، تعديلها، وإدارة الهيكل التنظيمي للفصول.</p>
        </div>

        <div class="feature-block">
            <h3>1. إضافة الطلاب (طريقتان)</h3>
            <ul>
                <li><strong>الإضافة اليدوية (+):</strong> الزر الأزرق يفتح نافذة لإدخال بيانات طالب واحد (الاسم، الصف، رقم ولي الأمر).</li>
                <li><strong>الاستيراد الجماعي (Excel):</strong> الزر الأخضر ينقلك لصفحة الاستيراد.
                    <br/>- اختر الفصل أولاً أو أنشئ فصلاً جديداً.
                    <br/>- ارفع ملف Excel (الأسماء في عمود، والأرقام في عمود).
                    <br/>- التطبيق ذكي وسيكتشف الأعمدة تلقائياً.
                </li>
            </ul>
        </div>

        <div class="feature-block">
            <h3>2. أدوات القائمة العلوية</h3>
            <ul>
                <li><strong>القرعة العشوائية (Sparkles):</strong> زر يختار طالباً عشوائياً للمشاركة، مع مؤثرات بصرية لتحفيز الطلاب.</li>
                <li><strong>تقرير الفصل (Download):</strong> يقوم بتوليد ملف PDF شامل يحتوي على قائمة طلاب الفصل المختار مع ملخص درجاتهم وسلوكهم.</li>
                <li><strong>إدارة الفصول (الترس/Filter):</strong> تتيح لك:
                    <br/>- تعديل اسم الفصل (زر القلم).
                    <br/>- حذف الفصل (زر السلة) - يحذف الفصل ويبقي الطلاب "بدون فصل".
                    <br/>- نقل طالب من فصل لآخر بسهولة.
                </li>
            </ul>
        </div>

        <div class="feature-block">
            <h3>3. بطاقة الطالب (الخيارات)</h3>
            <p>كل طالب يظهر في بطاقة تحتوي على:</p>
            <ul>
                <li><strong>سلوك إيجابي (إبهام لأعلى):</strong> لرصد نقطة إيجابية فورية.</li>
                <li><strong>سلوك سلبي (إبهام لأسفل):</strong> لرصد مخالفة. (في حالة اختيار "التسرب من الحصة"، سيطلب منك تحديد رقم الحصة).</li>
                <li><strong>زر التقرير (>):</strong> للدخول لملف الطالب التفصيلي (الشهادات، الدرجات، التواصل).</li>
                <li><strong>زر التعديل (القلم الصغير):</strong> لتعديل اسم الطالب، نقله لفصل آخر، أو تعديل رقم الهاتف.</li>
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
                <li><strong>الأزرار الثلاثة:</strong> أمام كل طالب 3 خيارات:
                    <br/>- <span style="color:#10b981; font-weight:bold;">حاضر (✓)</span>.
                    <br/>- <span style="color:#f43f5e; font-weight:bold;">غائب (X)</span>.
                    <br/>- <span style="color:#f59e0b; font-weight:bold;">تأخير (Clock)</span>.
                </li>
            </ul>
        </div>

        <div class="feature-block">
            <h3>2. التحضير الجماعي (توفير الوقت)</h3>
            <p>استخدم زر <strong>"تحديد الكل حاضر"</strong> في الأعلى لرصد جميع الطلاب حضوراً بضغطة واحدة، ثم قم بتغيير حالة الطلاب الغائبين فقط.</p>
        </div>

        <div class="feature-block">
            <h3>3. التبليغ الذكي</h3>
            <p>عند اختيار "غائب" أو "متأخر"، تظهر أيقونة رسالة (Message) بجانب اسم الطالب.</p>
            <ul>
                <li>اضغط عليها لفتح خيارات التواصل (واتساب أو SMS).</li>
                <li>يقوم التطبيق بكتابة رسالة رسمية جاهزة: "السلام عليكم، نود إبلاغكم بأن الطالب... قد تغيب اليوم...".</li>
                <li>يتم فتح تطبيق واتساب مباشرة على رقم ولي الأمر دون الحاجة لحفظ الرقم في جهات الاتصال.</li>
            </ul>
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
                <li><strong>أدوات التقويم (Settings):</strong> أهم خطوة! اضغط هنا لإضافة أعمدة السجل (مثلاً: "اختبار قصير 1"، "واجبات"، "مشروع"). حدد الدرجة العظمى لكل أداة.</li>
            </ul>
        </div>

        <div class="feature-block">
            <h3>2. رصد الدرجات</h3>
            <ul>
                <li>اضغط علامة (+) أمام الطالب.</li>
                <li>اختر الأداة من القائمة (مثلاً "اختبار قصير").</li>
                <li>أدخل درجة الطالب.</li>
                <li>اضغط حفظ. سيتم تحديث مجموع الطالب ونسبته المئوية فوراً.</li>
            </ul>
        </div>

        <div class="feature-block">
            <h3>3. التصدير والمعاينة</h3>
            <ul>
                <li><strong>معاينة التقرير (Eye):</strong> يعرض جدولاً كاملاً للدرجات يشبه السجل الورقي.</li>
                <li><strong>تحميل السجل (Download):</strong> يصدر ملف Excel منظم يحتوي على أسماء الطلاب ودرجاتهم في كل الأدوات والمجموع النهائي والمستوى (أ، ب، ج..).</li>
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
            <p>نظام تنافسي بين المجموعات (التعلم التعاوني) لزيادة الحماس والضبط الصفي.</p>
        </div>

        <div class="feature-block">
            <h3>1. إعداد الفرق (وضع الإعداد)</h3>
            <ul>
                <li>اضغط زر <strong>"إدارة الفرق"</strong> (رمز القفل).</li>
                <li>اضغط على أي فريق لتغيير اسمه (مثلاً: الصقور، النمور) ولونه.</li>
                <li>استخدم حقل البحث لإضافة طلاب لهذا الفريق. الطالب يمكنه الانضمام لفريق واحد فقط.</li>
            </ul>
        </div>

        <div class="feature-block">
            <h3>2. إدارة اللعبة</h3>
            <ul>
                <li>تظهر الفرق كبطاقات كبيرة. الفريق المتصدر يحصل تلقائياً على <strong>تاج</strong> وإطار ذهبي.</li>
                <li><strong>الأزرار السريعة:</strong>
                    <br/>- <span style="color:#10b981;">نظام (+5):</span> تمنح 5 نقاط لكل عضو في الفريق.
                    <br/>- <span style="color:#3b82f6;">تفاعل (+10):</span> تمنح 10 نقاط لكل عضو.
                    <br/>- <span style="color:#f43f5e;">مخالفة (-5):</span> تخصم 5 نقاط من كل عضو.
                </li>
                <li>يتم تسجيل هذه النقاط في سجل سلوك كل طالب فردياً أيضاً.</li>
            </ul>
        </div>
      `
    },
    {
      id: 'moalim-ai',
      title: 'المعلم الذكي AI',
      icon: Brain,
      color: 'rose',
      content: `
        <div class="guide-intro">
            <p>مساعد شخصي يعتمد على الذكاء الاصطناعي لتوفير ساعات من العمل.</p>
        </div>

        <div class="feature-block">
            <h3>1. إنشاء اختبار (Exam)</h3>
            <p>الصق نص الدرس أو ارفع ملف PDF، وسيقوم الذكاء الاصطناعي بتوليد أسئلة اختيار من متعدد مع الإجابات. يمكنك تحويلها لمسابقة تفاعلية مباشرة.</p>
        </div>

        <div class="feature-block">
            <h3>2. تحضير الدروس (Plan)</h3>
            <p>يطلب منك النظام موضوع الدرس وعدد الحصص. سيقوم بكتابة خطة درس كاملة متوافقة مع معايير "منصة نور" (الأهداف، الاستراتيجيات، التمهيد، الغلق) مقسمة على عدد الحصص.</p>
        </div>

        <div class="feature-block">
            <h3>3. أتمتة الويب (Automation)</h3>
            <p>ميزة متقدمة! اطلب منه مثلاً "كود لفتح موقع نور وإدخال الدرجات". سيقوم بتوليد كود برمجي (Script) بلغة Python يمكنك تشغيله على حاسوبك لأتمتة المهام المملة.</p>
        </div>

        <div class="feature-block">
            <h3>4. الأرشيف والتصدير</h3>
            <p>جميع محادثاتك محفوظة في "الأرشيف". يمكنك تصدير أي نتيجة (تحضير أو اختبار) كملف <strong>Word</strong> قابل للتعديل أو <strong>PDF</strong>.</p>
        </div>
      `
    }
  ];

  const exportAsHTML = async () => {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>دليل استخدام تطبيق راصد - الدليل الشامل</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
                
                body { 
                    font-family: 'Tajawal', sans-serif; 
                    background-color: #f8fafc; 
                    color: #1e293b; 
                    margin: 0; 
                    padding: 40px 20px;
                    line-height: 1.8;
                }
                .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 24px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1); overflow: hidden; }
                
                .header { 
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); 
                    color: white; 
                    padding: 60px 40px; 
                    text-align: center; 
                    position: relative;
                }
                .header h1 { margin: 0; font-size: 3rem; font-weight: 900; letter-spacing: -1px; }
                .header p { margin-top: 10px; font-size: 1.2rem; opacity: 0.8; font-weight: bold; }
                .version-tag { display: inline-block; background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; margin-top: 20px; }

                .content { padding: 40px; }
                
                .section { margin-bottom: 50px; border-bottom: 2px dashed #e2e8f0; padding-bottom: 40px; }
                .section:last-child { border-bottom: none; }
                
                .section-header { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
                .icon-box { 
                    width: 50px; height: 50px; 
                    background: #eff6ff; color: #2563eb; 
                    border-radius: 12px; 
                    display: flex; align-items: center; justify-content: center;
                    font-size: 24px; font-weight: bold;
                }
                .section-title { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0; }
                
                .feature-block { 
                    background: #f8fafc; 
                    border: 1px solid #e2e8f0; 
                    border-radius: 16px; 
                    padding: 25px; 
                    margin-bottom: 20px; 
                }
                .feature-block h3 { color: #334155; margin-top: 0; font-size: 1.2rem; border-right: 4px solid #3b82f6; padding-right: 12px; }
                
                ul { padding-right: 20px; color: #475569; }
                li { margin-bottom: 10px; }
                strong { color: #0f172a; }
                
                .guide-intro { font-size: 1.1rem; color: #64748b; margin-bottom: 20px; font-weight: bold; }

                .footer { text-align: center; padding: 30px; background: #f1f5f9; color: #94a3b8; font-size: 0.9rem; font-weight: bold; }
                
                /* SVG styling specifically for the HTML export */
                svg { width: 20px; height: 20px; vertical-align: middle; display: inline-block; margin: 0 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>دليل استخدام تطبيق راصد</h1>
                    <p>المرجع الشامل للمعلم المحترف</p>
                    <div class="version-tag">الإصدار 3.3</div>
                </div>
                
                <div class="content">
                    ${sections.map(section => `
                        <div class="section">
                            <div class="section-header">
                                <div class="icon-box" style="background-color: var(--bg-${section.color}); color: var(--text-${section.color})">#</div>
                                <h2 class="section-title">${section.title}</h2>
                            </div>
                            ${section.content}
                        </div>
                    `).join('')}
                </div>

                <div class="footer">
                    تم إنشاء هذا الدليل بواسطة تطبيق راصد - جميع الحقوق محفوظة
                </div>
            </div>
        </body>
        </html>
      `;

      try {
          const fileName = 'Rased_User_Guide.html';
          if (Capacitor.isNativePlatform()) {
              const res = await Filesystem.writeFile({
                  path: fileName,
                  data: htmlContent,
                  directory: Directory.Cache,
                  encoding: Encoding.UTF8
              });
              await SharePlugin.share({
                  title: 'دليل الاستخدام - راصد',
                  url: res.uri
              });
          } else {
              const blob = new Blob([htmlContent], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
          }
      } catch (e) {
          console.error("Export Error", e);
          alert('حدث خطأ أثناء تصدير الملف');
      }
  };

  const exportAsPDF = () => {
      setIsExporting(true);
      const element = document.getElementById('guide-content-for-pdf');
      if (!element) return;

      const opt = {
          margin: [10, 10, 10, 10], // Margins: top, left, bottom, right
          filename: 'Rased_User_Guide.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      if (typeof html2pdf !== 'undefined') {
          html2pdf().set(opt).from(element).save().then(() => setIsExporting(false));
      } else {
          alert('مكتبة PDF غير جاهزة');
          setIsExporting(false);
      }
  };

  return (
    <div className="bg-white min-h-full rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-140px)] md:h-full relative animate-in fade-in duration-300">
      
      {/* Luxurious Header */}
      <div className="bg-slate-900 text-white p-6 md:p-8 flex justify-between items-start shrink-0 relative overflow-hidden">
         <div className="relative z-10">
             <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-blue-500/20 rounded-xl backdrop-blur-sm border border-blue-500/30">
                    <BookOpen className="w-6 h-6 text-blue-300" />
                 </div>
                 <h1 className="text-2xl font-black tracking-tight">دليل المعلم</h1>
             </div>
             <p className="text-slate-400 text-xs font-bold max-w-md leading-relaxed">
                 استكشف كافة مميزات تطبيق راصد. تم إعداد هذا الدليل ليشرح كل أداة وخاصية بدقة، لضمان تجربتك الأمثل.
             </p>
         </div>
         
         <div className="flex gap-2 relative z-10">
             <button onClick={exportAsHTML} className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-all backdrop-blur-md border border-white/10 active:scale-95">
                 <Globe className="w-4 h-4 text-blue-300 group-hover:text-blue-200" />
                 <span className="text-[10px] font-black hidden md:block">حفظ كصفحة ويب</span>
             </button>
             <button onClick={exportAsPDF} className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/50 active:scale-95">
                 {isExporting ? <span className="animate-spin text-white">⌛</span> : <Download className="w-4 h-4 text-white" />}
                 <span className="text-[10px] font-black text-white hidden md:block">تحميل PDF</span>
             </button>
         </div>

         {/* Decorative Background Elements */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50">
          
          {/* Sidebar Navigation */}
          <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-l border-gray-200 flex md:flex-col overflow-x-auto md:overflow-y-auto custom-scrollbar p-3 gap-2 shrink-0 z-10 shadow-sm">
              {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl transition-all min-w-[200px] md:min-w-0 text-right border ${activeSection === section.id ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-[1.02]' : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}
                  >
                      <div className={`p-2 rounded-xl ${activeSection === section.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                          <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                          <span className="block text-xs font-black">{section.title}</span>
                      </div>
                      {activeSection === section.id && <ChevronLeft className="w-4 h-4 opacity-50" />}
                  </button>
              ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative scroll-smooth" id="guide-content-for-pdf">
              {/* PDF Only Header */}
              <div className="hidden print-visible text-center mb-10 pb-6 border-b-2 border-slate-100">
                  <h1 className="text-4xl font-black text-slate-800 mb-2">دليل استخدام راصد</h1>
                  <p className="text-gray-500 font-bold">الدليل الشامل لكافة الخصائص</p>
              </div>

              {sections.map(section => (
                  <div key={section.id} className={`${activeSection === section.id || isExporting ? 'block' : 'hidden'} animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto`}>
                      
                      <div className="flex items-center gap-4 mb-8">
                          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg bg-gradient-to-br from-white to-gray-50 border border-gray-100`}>
                              <section.icon className={`w-8 h-8 text-${section.color}-600`} />
                          </div>
                          <div>
                              <h2 className="text-3xl font-black text-slate-800 mb-1">{section.title}</h2>
                              <div className={`h-1.5 w-20 rounded-full bg-${section.color}-500`}></div>
                          </div>
                      </div>
                      
                      <div 
                        className="prose prose-lg max-w-none text-slate-600 font-medium leading-loose guide-content"
                        dangerouslySetInnerHTML={{ __html: section.content }} 
                      />

                      {/* Visual Separator for PDF Flow */}
                      <div className="hidden print-visible my-12 border-b border-gray-200"></div>
                  </div>
              ))}

              <div className="mt-16 p-8 bg-white rounded-3xl text-center border border-gray-100 shadow-sm max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings className="w-8 h-8 text-blue-500 animate-spin-slow" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">الدعم الفني والتحديثات</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                      نحن ملتزمون بتطوير التطبيق باستمرار. إذا واجهت أي مشكلة أو كان لديك اقتراح، لا تتردد في التواصل معنا عبر صفحة "حول التطبيق".
                  </p>
              </div>
          </div>
      </div>

      <style>{`
        .guide-content h3 {
            color: #1e293b;
            font-weight: 900;
            font-size: 1.25rem;
            margin-top: 2rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .guide-content .feature-block {
            background: white;
            border: 1px solid #f1f5f9;
            border-radius: 1.5rem;
            padding: 2rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
            transition: transform 0.2s;
        }
        .guide-content .feature-block:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
            border-color: #e2e8f0;
        }
        .guide-content ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .guide-content li {
            position: relative;
            padding-right: 1.5rem;
            margin-bottom: 0.75rem;
            font-size: 0.95rem;
        }
        .guide-content li::before {
            content: "•";
            color: #3b82f6;
            font-weight: bold;
            font-size: 1.5rem;
            position: absolute;
            right: 0;
            top: -0.25rem;
        }
        .guide-content strong {
            color: #0f172a;
            font-weight: 800;
        }
        /* Custom scrollbar for better look */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
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