import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  FileQuestion,
  Gamepad2,
  GraduationCap,
  HelpCircle,
  Home,
  ListChecks,
  Loader2,
  Mail,
  Menu,
  Monitor,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  X
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext';

type GuideTopic = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
  warning?: string;
  tags?: string[];
  isNew?: boolean;
};

type GuideSection = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  topics: GuideTopic[];
};

const normalizeText = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();

const GUIDE_EN: Record<string, string> = {
  "ابدأ من هنا": "Start Here",
  "التهيئة الأولى والخطوات الأساسية قبل استخدام راصد المعلم.": "Initial setup and the essential steps before using Rased Teacher.",
  "الإعداد الأول للتطبيق": "Initial App Setup",
  "تجهيز بيانات المعلم والمدرسة والفصل الدراسي قبل بدء العمل.": "Prepare the teacher, school, and semester details before getting started.",
  "افتح الإعدادات وأدخل اسم المعلم والمدرسة والمحافظة والمادة الدراسية.": "Open Settings and enter the teacher name, school, governorate, and subject.",
  "حدد الفصل الدراسي الحالي؛ الأول أو الثاني.": "Select the current semester: first or second.",
  "أضف الفصول التي يدرّسها المعلم وتأكد من كتابتها بصيغة موحدة.": "Add the classes you teach and use a consistent naming format.",
  "اضبط أوقات الحصص والجدول الأسبوعي من لوحة المعلومات.": "Set period times and the weekly schedule from the dashboard.",
  "أنشئ نسخة محلية بعد اكتمال الإعداد الأول.": "Create a local backup after completing the initial setup.",
  "استخدم الاسم نفسه للمدرسة والمادة في جميع أجهزة المعلم حتى تعمل المزامنة بصورة دقيقة.": "Use the same school and subject names on all teacher devices for accurate synchronization.",
  "إعداد": "Setup",
  "بداية": "Getting Started",
  "مدرسة": "School",
  "مادة": "Subject",
  "إضافة الطلاب وأكواد راصد": "Adding Students and Rased Codes",
  "إضافة الطلاب يدويًا أو من Excel مع الحفاظ على الأكواد القديمة ومنع التكرار.": "Add students manually or from Excel while preserving existing codes and preventing duplicates.",
  "اختر الفصل المطلوب ثم أضف الطالب يدويًا أو استورد ملف Excel.": "Select a class, then add the student manually or import an Excel file.",
  "يراجع راصد الاسم والفصل قبل إنشاء طالب جديد لمنع التكرار.": "Rased checks the name and class before creating a new student to prevent duplicates.",
  "يحافظ التطبيق على كود RSD القديم عند تحديث بيانات الطالب.": "The app preserves the existing RSD code when student data is updated.",
  "استخدم بطاقات أولياء الأمور لتسليم الكود السري لكل طالب.": "Use parent cards to provide each student’s private code.",
  "لا تنشئ طالبًا جديدًا لتصحيح الاسم؛ عدّل بيانات الطالب الموجود حتى لا تتوزع درجاته وسجلاته على معرفين.": "Do not create a new student to correct a name. Edit the existing record so grades and logs are not split across two IDs.",
  "طلاب": "Students",
  "ولي الأمر": "Parent",
  "لوحة المعلومات والتخطيط": "Dashboard and Planning",
  "الجدول والحصص والخطة الفصلية وخطة التقويم المستمر.": "Schedule, periods, term plan, and continuous assessment plan.",
  "الجدول الأسبوعي والحصة الحالية": "Weekly Schedule and Current Period",
  "إدارة جدول المعلم وإظهار الحصة الحالية والقادمة والتوقيت.": "Manage the teacher schedule and display the current and next periods with timing.",
  "أدخل أوقات الحصص بالترتيب الصحيح.": "Enter period times in the correct order.",
  "وزع الفصول على أيام الأسبوع والحصص.": "Assign classes to weekdays and periods.",
  "تعرض لوحة المعلومات الحصة الحالية والقادمة بناءً على وقت الجهاز.": "The dashboard shows the current and next periods based on the device time.",
  "في Android يمكن إضافة ويدجيت راصد إلى الشاشة الرئيسية.": "On Android, you can add the Rased widget to the home screen.",
  "إذا لم يتحدث الويدجيت، افتح راصد المعلم مرة واحدة للتأكد من وصول آخر بيانات الجدول.": "If the widget does not update, open Rased Teacher once to refresh the latest schedule data.",
  "جدول": "Schedule",
  "حصة": "Period",
  "ويدجيت": "Widget",
  "الخطة الفصلية": "Term Plan",
  "تنظيم الوحدات والدروس والموضوعات على أسابيع الفصل الدراسي.": "Organize units, lessons, and topics across the semester weeks.",
  "افتح الخطة الفصلية من لوحة المعلومات.": "Open the term plan from the dashboard.",
  "أدخل اسم الأسبوع وتاريخ البداية والنهاية والوحدة والدرس.": "Enter the week name, start and end dates, unit, and lesson.",
  "يمكن إضافة أسابيع أو حذفها واستيراد الخطة من Excel.": "You can add or delete weeks and import the plan from Excel.",
  "تدخل الخطة ضمن النسخة المحلية والسحابية لراصد المعلم.": "The term plan is included in local and cloud backups.",
  "خطة فصلية": "Term Plan",
  "أسابيع": "Weeks",
  "وحدات": "Units",
  "خطة التقويم المستمر": "Continuous Assessment Plan",
  "تنظيم أدوات ومهام التقويم بحسب أشهر الفصل الدراسي.": "Organize assessment tools and tasks by semester month.",
  "افتح خطة التقويم المستمر.": "Open the continuous assessment plan.",
  "اختر الشهر وأضف أدوات التقويم المطلوبة.": "Choose a month and add the required assessment tools.",
  "حدّث الخطة عند تغيير مواعيد الاختبارات أو المشاريع.": "Update the plan when quiz or project dates change.",
  "تُحفظ الخطة ضمن النسخ الاحتياطية الجديدة.": "The plan is included in the new backups.",
  "تقويم": "Assessment",
  "اختبارات": "Tests",
  "مشاريع": "Projects",
  "خطة": "Plan",
  "الطلاب والحضور والسلوك": "Students, Attendance, and Behavior",
  "متابعة الطالب اليومية من الحضور إلى السلوك والتقارير الفردية.": "Daily student follow-up, from attendance and behavior to individual reports.",
  "الحضور والغياب والتأخر": "Attendance, Absence, and Lateness",
  "تسجيل حالة كل طالب في بداية الحصة ومراجعة السجل لاحقًا.": "Record each student’s status at the start of the period and review it later.",
  "اختر الفصل والحصة.": "Select the class and period.",
  "سجّل الحاضر والغائب والمتأخر والمتسرب حسب الحالة.": "Mark each student as present, absent, late, or truant.",
  "راجع السجل قبل الانتقال إلى الحصة التالية.": "Review the record before moving to the next period.",
  "تظهر ملخصات الحضور في تقرير الطالب وفي المزامنة المخصصة للإدارة وولي الأمر.": "Attendance summaries appear in student reports and the dedicated admin and parent sync.",
  "تسجيل الحضور والغياب مبكرًا يختصر وقت المتابعة.": "Recording attendance early reduces follow-up time.",
  "حضور": "Attendance",
  "غياب": "Absence",
  "تأخر": "Late",
  "إدارة": "Administration",
  "السلوك الإيجابي والسلبي": "Positive and Negative Behavior",
  "إضافة الملاحظات والنقاط وربطها بالفصل الدراسي.": "Add notes and points and associate them with the semester.",
  "افتح بطاقة الطالب أو شاشة السلوك.": "Open the student card or behavior screen.",
  "اختر نوع السلوك واكتب الملاحظة وحدد النقاط.": "Choose the behavior type, write the note, and set the points.",
  "راجع السلوكيات حسب الفصل الدراسي في تقرير الطالب.": "Review behaviors by semester in the student report.",
  "تصل السجلات المناسبة إلى راصد ولي الأمر عبر المزامنة.": "Relevant records are sent to Rased Parent through synchronization.",
  "سلوك": "Behavior",
  "نقاط": "Points",
  "إدارة مجموعات الطلاب": "Student Group Management",
  "إنشاء تقسيمات متعددة وتوزيع الطلاب وعرض المجموعات وتصديرها.": "Create multiple categorizations, assign students, present groups, and export them.",
  "اختر الفصل ثم أنشئ تقسيمًا مثل مشروع أو نشاط أو مراجعة.": "Select a class, then create a categorization such as a project, activity, or review.",
  "أنشئ المجموعات يدويًا أو حدد عددها للتوزيع التلقائي.": "Create groups manually or specify a count for automatic distribution.",
  "راجع الطلاب غير الموزعين وأضفهم إلى المجموعات.": "Review unassigned students and add them to groups.",
  "يمكن نسخ التقسيم داخل الفصل أو إلى فصل آخر مع الطلاب أو بدونهم.": "Duplicate the categorization in the same class or another class, with or without students.",
  "استخدم العرض التقديمي أو صدّر المجموعات كصورة أو PDF.": "Use presentation mode or export the groups as an image or PDF.",
  "أرشف التقسيمات القديمة بدل حذفها.": "Archive old categorizations instead of deleting them.",
  "مجموعات": "Groups",
  "توزيع تلقائي": "Automatic Distribution",
  "أرشيف": "Archive",
  "الدرجات والتقويم": "Grades and Assessment",
  "أدوات التقويم وإدخال الدرجات وحساب نتائج الفصول والنتيجة النهائية.": "Assessment tools, grade entry, semester results, and final result calculations.",
  "إعداد أدوات التقويم": "Configure Assessment Tools",
  "تعريف الاختبارات والمشاريع والأنشطة والامتحان النهائي ودرجاتها.": "Define tests, projects, activities, the final exam, and their maximum scores.",
  "افتح إعدادات الدرجات وأضف أدوات التقويم.": "Open grade settings and add assessment tools.",
  "حدد الدرجة القصوى لكل أداة.": "Set the maximum score for each tool.",
  "حدد أداة الامتحان النهائي بصورة صحيحة.": "Correctly identify the final exam tool.",
  "تأكد أن مجموع الدرجات يتوافق مع إعداد الدرجة الكلية.": "Ensure the score total matches the configured overall score.",
  "درجات": "Grades",
  "أدوات تقويم": "Assessment Tools",
  "امتحان نهائي": "Final Exam",
  "نتائج الفصلين والنتيجة النهائية": "Semester Results and Final Result",
  "عرض نتائج الفصل الأول أو الثاني بصورة مستقلة، أو متوسط العام الدراسي.": "View first- or second-semester results independently, or the academic-year average.",
  "في تقرير الطالب أو سجل الدرجات اختر الفصل الدراسي الأول فقط لعرض درجاته وحدها.": "In the student report or gradebook, select First Semester Only to show its grades independently.",
  "اختر الفصل الدراسي الثاني فقط لعرض درجاته وحدها.": "Select Second Semester Only to show its grades independently.",
  "اختر النتيجة النهائية للعام لحساب متوسط مجموع الفصلين.": "Select Final Academic Year Result to calculate the average of both semester totals.",
  "إذا كانت بيانات أحد الفصلين غير مكتملة، يعرض التقرير أن النتيجة السنوية غير مكتملة.": "If either semester is incomplete, the report marks the annual result as incomplete.",
  "فصل أول": "First Semester",
  "فصل ثاني": "Second Semester",
  "نتيجة نهائية": "Final Result",
  "متوسط": "Average",
  "المراسلات وولي الأمر": "Messaging and Parents",
  "استقبال رسائل ولي الأمر والرد وإرسال رسائل مهنية مباشرة.": "Receive parent messages, reply, and send professional messages directly.",
  "مركز المراسلات": "Messaging Center",
  "صفحة مستقلة للوارد والمرسل وإنشاء رسالة جديدة.": "A standalone page for inbox, sent messages, and composing a new message.",
  "افتح مركز المراسلات واضغط تحديث لجلب الرسائل من سحابة ولي الأمر.": "Open the Messaging Center and select Refresh to fetch messages from the parent cloud.",
  "افتح الرسالة الواردة ثم اكتب الرد وأرسله.": "Open an incoming message, write a reply, and send it.",
  "في تبويب إرسال اختر الصف والفصل والطالب ونوع الرسالة.": "On the Compose tab, select the grade, class, student, and message type.",
  "يمكن استخدام القوالب الجاهزة للتنبيه السلوكي أو التقارير أو الإشادة أو الواجب.": "Use ready-made templates for behavior alerts, performance reports, praise, or homework reminders.",
  "يحتفظ راصد بسجل محلي محدود للرسائل المرسلة حتى تصل إلى السحابة.": "Rased keeps a limited local sent-message log until cloud records are available.",
  "مراسلات": "Messaging",
  "وارد": "Inbox",
  "مرسل": "Sent",
  "رد": "Reply",
  "المهام والمكتبة": "Tasks and Library",
  "إنشاء المهام ومشاركة الموارد التعليمية مع راصد الطالب.": "Create tasks and share educational resources with Rased Student.",
  "إنشاء المهام": "Create Tasks",
  "إضافة مهمة وتحديد المادة والفصل المستهدف ثم مزامنتها.": "Add a task, select the subject and target class, then synchronize it.",
  "افتح صفحة المهام وأدخل عنوان المهمة والمادة.": "Open Tasks and enter the task title and subject.",
  "حدد الفصل المستهدف ثم احفظ المهمة.": "Select the target class and save the task.",
  "نفّذ مزامنة راصد الطالب لإظهار المهمة للطلاب.": "Synchronize Rased Student to make the task available to students.",
  "تدخل المهام ضمن النسخة المحلية والسحابية لراصد المعلم.": "Tasks are included in local and cloud backups.",
  "مهام": "Tasks",
  "راصد الطالب": "Rased Student",
  "مزامنة": "Sync",
  "المكتبة التعليمية": "Educational Library",
  "إرسال رابط أو فيديو أو مورد PDF إلى الفصل المستهدف.": "Send a link, video, or PDF resource to the target class.",
  "اختر نوع المورد وأدخل العنوان والرابط.": "Choose the resource type and enter its title and link.",
  "حدد الفصل المستهدف ثم أرسل المورد.": "Select the target class and send the resource.",
  "يمكن مراجعة أرشيف المكتبة داخل راصد المعلم.": "Review the library archive in Rased Teacher.",
  "أرشيف المكتبة يدخل ضمن النسخ الاحتياطية.": "The library archive is included in backups.",
  "مكتبة": "Library",
  "رابط": "Link",
  "فيديو": "Video",
  "الألعاب التعليمية": "Educational Games",
  "بنك الأسئلة والنشر ونتائج اللعب وتحليل المشاركة.": "Question bank, publishing, game results, and participation analysis.",
  "بنك أسئلة الألعاب": "Game Question Bank",
  "إنشاء أسئلة ديناميكية دون الحاجة إلى تحديث تطبيق الطالب.": "Create dynamic questions without updating the student app.",
  "أنشئ السؤال وحدد الصف والفصل الدراسي والوحدة والدرس.": "Create the question and select the grade, semester, unit, and lesson.",
  "حدد نوع السؤال والألعاب التي يمكن استخدامه فيها.": "Select the question type and the games that can use it.",
  "احفظ السؤال كمسودة أو انشره ضمن الأسئلة النشطة.": "Save the question as a draft or publish it as active.",
  "يمكن أرشفة الأسئلة وإعادتها لاحقًا.": "Archive questions and restore them later.",
  "زامن المحتوى مع راصد الطالب بعد النشر.": "Synchronize content with Rased Student after publishing.",
  "ألعاب": "Games",
  "أسئلة": "Questions",
  "مسودات": "Drafts",
  "نشر": "Publishing",
  "نتائج الألعاب والمشاركة": "Game Results and Participation",
  "تحليل نتائج الطلاب ومعرفة المشاركين وغير المشاركين.": "Analyze student results and identify participants and non-participants.",
  "افتح لوحة نتائج الألعاب واختر كل الألعاب أو لعبة محددة.": "Open Game Results and select all games or a specific game.",
  "راجع النقاط ونسب الإجابات الصحيحة والخاطئة.": "Review points and correct/incorrect answer rates.",
  "استخدم قائمة الطلاب غير المشاركين للمتابعة.": "Use the non-participant list for follow-up.",
  "راجع الأسئلة الضعيفة لتحديد المهارات التي تحتاج علاجًا.": "Review weak questions to identify skills that need intervention.",
  "نتائج": "Results",
  "غير مشاركين": "Non-participants",
  "تحليل": "Analysis",
  "أسئلة ضعيفة": "Weak Questions",
  "مركز التقارير": "Report Center",
  "التقارير والسجلات والتحليل الإحصائي والشهادات والبطاقات.": "Reports, records, statistical analysis, certificates, and cards.",
  "تقرير طالب أو فصل كامل": "Student or Full-Class Report",
  "معاينة وطباعة تقرير تفصيلي للفصل المختار أو لطالب محدد.": "Preview and print a detailed report for a selected class or student.",
  "حدد نوع التقرير: فصل كامل أو طالب.": "Select the report type: full class or individual student.",
  "اختر الفصل الدراسي الأول أو الثاني أو النتيجة النهائية للعام.": "Select the first semester, second semester, or final academic-year result.",
  "راجع الدرجات والحضور والسلوك قبل التصدير.": "Review grades, attendance, and behavior before exporting.",
  "صدّر التقرير إلى PDF أو شاركه من نافذة النظام على الجوال.": "Export the report to PDF or share it from the mobile system dialog.",
  "تقرير طالب": "Student Report",
  "فصل كامل": "Full Class",
  "التحليل الإحصائي": "Statistical Analysis",
  "قراءة مستوى الفصل وتوزيع الدرجات والأداء في أدوات التقويم.": "Understand class level, score distribution, and performance across assessment tools.",
  "اختر الصف والفصل وأداة التقويم أو نطاق التحليل.": "Select the grade, class, assessment tool, or analysis scope.",
  "راجع المتوسطات والتوزيع ومستويات الأداء.": "Review averages, distributions, and performance levels.",
  "استخدم نتائج التحليل لتحديد الطلاب والمهارات التي تحتاج متابعة.": "Use the analysis to identify students and skills that need follow-up.",
  "اطبع التحليل عند الحاجة للاجتماعات أو ملفات المتابعة.": "Print the analysis when needed for meetings or follow-up files.",
  "تحليل إحصائي": "Statistical Analysis",
  "أداء": "Performance",
  "شهادات التقدير والتميز": "Certificates of Appreciation and Excellence",
  "استخدام تصميم راصد أو رفع صورة أو PDF لشهادة فارغة.": "Use the Rased design or upload a blank certificate image or PDF.",
  "اختر الطلاب واكتب عنوان الشهادة ونصها.": "Select students and enter the certificate title and text.",
  "استخدم التصميم الافتراضي أو ارفع صورة شهادة فارغة.": "Use the default design or upload a blank certificate image.",
  "يمكن رفع ملف PDF؛ يحول راصد الصفحة الأولى إلى خلفية.": "You can upload a PDF; Rased converts the first page into a background.",
  "راجع موضع النص والاسم فوق الخلفية ثم صدّر الشهادات.": "Review text and name placement over the background, then export the certificates.",
  "يفضل استخدام شهادة أفقية بنسبة A4 وبخلفية واضحة ومساحة مناسبة لاسم الطالب والنص.": "Use an A4 landscape certificate with a clear background and enough space for the student name and text.",
  "شهادة": "Certificate",
  "صورة": "Image",
  "تميز": "Excellence",
  "بطاقات أولياء الأمور": "Parent Cards",
  "طباعة بطاقات مبسطة تتضمن اسم الطالب والفصل والكود السري.": "Print simplified cards with the student name, class, and private code.",
  "اختر الفصل المطلوب.": "Select the required class.",
  "راجع أسماء الطلاب وأكوادهم قبل الطباعة.": "Review student names and codes before printing.",
  "وزع البطاقات بصورة فردية للمحافظة على خصوصية الأكواد.": "Distribute cards individually to protect code privacy.",
  "بطاقات": "Cards",
  "كود سري": "Private Code",
  "النسخ والمزامنة": "Backup and Sync",
  "حفظ بيانات راصد المعلم محليًا وسحابيًا واستعادتها بأمان.": "Save Rased Teacher data locally and in the cloud and restore it safely.",
  "النسخة المحلية": "Local Backup",
  "إنشاء ملف JSON شامل يمكن حفظه ومشاركته أو نقله إلى جهاز آخر.": "Create a comprehensive JSON file that can be saved, shared, or moved to another device.",
  "افتح الإعدادات ثم قسم النسخ الاحتياطي.": "Open Settings, then the Backup section.",
  "اختر إنشاء نسخة محلية.": "Select Create Local Backup.",
  "على الجوال استخدم نافذة المشاركة لحفظ الملف في المكان المطلوب.": "On mobile, use the share dialog to save the file where you want.",
  "على Windows يُنزّل الملف إلى الجهاز.": "On Windows, the file is downloaded to the device.",
  "تأكد من الاحتفاظ بنسخة حديثة قبل إعادة ضبط التطبيق.": "Keep a recent backup before resetting the app.",
  "نسخة محلية": "Local Backup",
  "استعادة": "Restore",
  "النسخة السحابية بين أجهزة المعلم": "Cloud Backup Across Teacher Devices",
  "مزامنة نسخة راصد المعلم بين Windows وAndroid وiOS.": "Synchronize Rased Teacher across Windows, Android, and iOS.",
  "تأكد من اكتمال معرف المعلم المستخدم في سحابة راصد المعلم.": "Ensure the teacher identifier used by the Rased Teacher cloud is complete.",
  "ارفع نسخة سحابية بعد انتهاء التعديلات المهمة.": "Upload a cloud backup after important changes.",
  "عند الاستعادة يحمّل راصد النسخة الشاملة ويعيد تشغيل التطبيق لقراءة بيانات المكونات.": "During restore, Rased downloads the comprehensive backup and restarts to reload component data.",
  "تشمل النسخة الجديدة الخطط والمهام والمكتبة والمجموعات والألعاب والإعدادات الجديدة.": "The new backup includes plans, tasks, library, groups, games, and new settings.",
  "لا تستعد نسخة قديمة قبل إنشاء نسخة أمان من البيانات الحالية.": "Do not restore an old backup before safeguarding the current data.",
  "سحابة": "Cloud",
  "ما الذي يدخل في النسخة؟": "What Is Included in the Backup?",
  "نظرة على البيانات الأساسية والإضافات الجديدة المشمولة.": "An overview of core data and newly included features.",
  "الطلاب والفصول والحضور والسلوك والدرجات وأوراق الاختبارات.": "Students, classes, attendance, behavior, grades, and exam papers.",
  "الجدول وأوقات الحصص وأدوات التقويم وإعدادات الشهادات.": "Schedule, period times, assessment tools, and certificate settings.",
  "الخطة الفصلية وخطة التقويم المستمر.": "Term plan and continuous assessment plan.",
  "المهام وأرشيف المكتبة والمجموعات والتقسيمات المؤرشفة.": "Tasks, library archive, groups, and archived categorizations.",
  "سجل الرسائل المحلية وبنوك أسئلة الألعاب والنتائج المحلية.": "Local sent-message log, game question banks, and local game results.",
  "بيانات الرسائل والنتائج الموجودة أصلًا في سحب مستقلة لا تُكرر بلا حاجة.": "Messages and results already stored in separate clouds are not duplicated unnecessarily.",
  "محتوى النسخة": "Backup Contents",
  "بيانات": "Data",
  "الإعدادات والخصوصية": "Settings and Privacy",
  "بيانات المعلم واللغة والثيم وإعادة الضبط وإرشادات الأمان.": "Teacher details, language, theme, reset, and safety guidance.",
  "بيانات المعلم والمظهر": "Teacher Profile and Appearance",
  "تحديث الملف التعريفي واللغة والاتجاه والثيم.": "Update the profile, language, direction, and theme.",
  "حدّث اسم المعلم والمدرسة والمادة والمحافظة.": "Update the teacher name, school, subject, and governorate.",
  "اختر اللغة والثيم المناسبين.": "Choose the preferred language and theme.",
  "تأكد من ظهور الشعار والختم بصورة صحيحة في التقارير.": "Ensure the logo and stamp appear correctly in reports.",
  "إعدادات": "Settings",
  "لغة": "Language",
  "ثيم": "Theme",
  "ملف شخصي": "Profile",
  "إعادة ضبط التطبيق": "Reset the App",
  "حذف بيانات راصد المعلم من الجهاز والبدء من جديد.": "Delete Rased Teacher data from the device and start again.",
  "أنشئ نسخة محلية وسحابية أولًا.": "Create local and cloud backups first.",
  "تأكد أن ملف النسخة موجود ويمكن الوصول إليه.": "Ensure the backup file exists and is accessible.",
  "نفّذ إعادة الضبط فقط عند الحاجة.": "Reset only when necessary.",
  "بعد إعادة التشغيل استعد النسخة ثم راجع البيانات الأساسية.": "After restart, restore the backup and review the core data.",
  "إعادة الضبط تحذف البيانات المحلية. لا تنفذها دون نسخة احتياطية حديثة.": "Reset deletes local data. Do not continue without a recent backup.",
  "إعادة ضبط": "Reset",
  "حذف": "Delete",
  "تحذير": "Warning",
  "حل المشكلات": "Troubleshooting",
  "إجراءات سريعة للمشكلات الأكثر شيوعًا في التطبيق والتصدير والمزامنة.": "Quick steps for common app, export, and sync issues.",
  "المزامنة لا تعيد البيانات": "Sync Does Not Restore Data",
  "تحقق من الاتصال والمعرف والنسخة السحابية قبل إعادة المحاولة.": "Check the connection, teacher identifier, and cloud backup before retrying.",
  "تأكد من الاتصال بالإنترنت.": "Check the internet connection.",
  "تحقق من بيانات المعلم المستخدمة كمعرف في السحابة.": "Verify the teacher details used as the cloud identifier.",
  "تأكد من نجاح رفع النسخة قبل الاستعادة.": "Confirm the backup was uploaded successfully before restoring.",
  "أغلق التطبيق وافتحه بعد اكتمال الاستعادة.": "Close and reopen the app after the restore is complete.",
  "لا تحذف النسخة المحلية حتى تتأكد من عودة البيانات.": "Do not delete the local backup until all data is restored.",
  "اتصال": "Connection",
  "تعذر إنشاء أو قراءة PDF": "Unable to Create or Read PDF",
  "حلول سريعة لتقارير PDF وخلفيات الشهادات.": "Quick solutions for PDF reports and certificate backgrounds.",
  "جرّب ملف PDF غير محمي بكلمة مرور.": "Try a PDF that is not password-protected.",
  "تأكد أن الملف سليم ويحتوي على صفحة واحدة على الأقل.": "Ensure the file is valid and contains at least one page.",
  "للخلفيات المعقدة يمكن تحويل الشهادة إلى PNG ثم رفعها.": "For complex backgrounds, convert the certificate to PNG before uploading.",
  "اسمح لنافذة المشاركة أو حفظ الملفات بالظهور على الجوال.": "Allow the system share or file-save dialog to open on mobile.",
  "تصدير": "Export",
  "ويدجيت الجدول لا يتحدث": "Schedule Widget Does Not Update",
  "تحديث البيانات وإعادة إضافة الويدجيت عند الحاجة.": "Refresh the data and re-add the widget if needed.",
  "افتح راصد المعلم وانتظر اكتمال تحميل الجدول.": "Open Rased Teacher and wait for the schedule to load.",
  "ارجع إلى الشاشة الرئيسية لمراجعة الويدجيت.": "Return to the home screen and review the widget.",
  "إذا بقيت بيانات قديمة، احذف الويدجيت وأضفه من جديد.": "If old data remains, remove the widget and add it again.",
  "تأكد من أن الوقت والجدول وأوقات الحصص مضبوطة.": "Ensure the device time, schedule, and period times are correct."
};

const UserGuide: React.FC = () => {
  const { t, dir, language } = useApp();
  const g = (ar: string, en: string) => language === 'ar' ? ar : en;
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('rased_guide_active_section') || 'start');
  const [query, setQuery] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(['start-first-setup']));

  const baseSections = useMemo<GuideSection[]>(() => [
    {
      id: 'start',
      title: 'ابدأ من هنا',
      description: 'التهيئة الأولى والخطوات الأساسية قبل استخدام راصد المعلم.',
      icon: GraduationCap,
      accent: 'bg-primary/10 text-primary border-primary/20',
      topics: [
        {
          id: 'start-first-setup',
          title: 'الإعداد الأول للتطبيق',
          summary: 'تجهيز بيانات المعلم والمدرسة والفصل الدراسي قبل بدء العمل.',
          steps: [
            'افتح الإعدادات وأدخل اسم المعلم والمدرسة والمحافظة والمادة الدراسية.',
            'حدد الفصل الدراسي الحالي؛ الأول أو الثاني.',
            'أضف الفصول التي يدرّسها المعلم وتأكد من كتابتها بصيغة موحدة.',
            'اضبط أوقات الحصص والجدول الأسبوعي من لوحة المعلومات.',
            'أنشئ نسخة محلية بعد اكتمال الإعداد الأول.'
          ],
          tips: ['استخدم الاسم نفسه للمدرسة والمادة في جميع أجهزة المعلم حتى تعمل المزامنة بصورة دقيقة.'],
          tags: ['إعداد', 'بداية', 'مدرسة', 'مادة']
        },
        {
          id: 'start-students',
          title: 'إضافة الطلاب وأكواد راصد',
          summary: 'إضافة الطلاب يدويًا أو من Excel مع الحفاظ على الأكواد القديمة ومنع التكرار.',
          steps: [
            'اختر الفصل المطلوب ثم أضف الطالب يدويًا أو استورد ملف Excel.',
            'يراجع راصد الاسم والفصل قبل إنشاء طالب جديد لمنع التكرار.',
            'يحافظ التطبيق على كود RSD القديم عند تحديث بيانات الطالب.',
            'استخدم بطاقات أولياء الأمور لتسليم الكود السري لكل طالب.'
          ],
          warning: 'لا تنشئ طالبًا جديدًا لتصحيح الاسم؛ عدّل بيانات الطالب الموجود حتى لا تتوزع درجاته وسجلاته على معرفين.',
          tags: ['طلاب', 'Excel', 'RSD', 'ولي الأمر']
        }
      ]
    },
    {
      id: 'dashboard',
      title: 'لوحة المعلومات والتخطيط',
      description: 'الجدول والحصص والخطة الفصلية وخطة التقويم المستمر.',
      icon: Home,
      accent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      topics: [
        {
          id: 'dashboard-schedule',
          title: 'الجدول الأسبوعي والحصة الحالية',
          summary: 'إدارة جدول المعلم وإظهار الحصة الحالية والقادمة والتوقيت.',
          steps: [
            'أدخل أوقات الحصص بالترتيب الصحيح.',
            'وزع الفصول على أيام الأسبوع والحصص.',
            'تعرض لوحة المعلومات الحصة الحالية والقادمة بناءً على وقت الجهاز.',
            'في Android يمكن إضافة ويدجيت راصد إلى الشاشة الرئيسية.'
          ],
          tips: ['إذا لم يتحدث الويدجيت، افتح راصد المعلم مرة واحدة للتأكد من وصول آخر بيانات الجدول.'],
          tags: ['جدول', 'حصة', 'ويدجيت', 'Android']
        },
        {
          id: 'dashboard-term-plan',
          title: 'الخطة الفصلية',
          summary: 'تنظيم الوحدات والدروس والموضوعات على أسابيع الفصل الدراسي.',
          steps: [
            'افتح الخطة الفصلية من لوحة المعلومات.',
            'أدخل اسم الأسبوع وتاريخ البداية والنهاية والوحدة والدرس.',
            'يمكن إضافة أسابيع أو حذفها واستيراد الخطة من Excel.',
            'تدخل الخطة ضمن النسخة المحلية والسحابية لراصد المعلم.'
          ],
          isNew: true,
          tags: ['خطة فصلية', 'أسابيع', 'وحدات', 'Excel']
        },
        {
          id: 'dashboard-assessment-plan',
          title: 'خطة التقويم المستمر',
          summary: 'تنظيم أدوات ومهام التقويم بحسب أشهر الفصل الدراسي.',
          steps: [
            'افتح خطة التقويم المستمر.',
            'اختر الشهر وأضف أدوات التقويم المطلوبة.',
            'حدّث الخطة عند تغيير مواعيد الاختبارات أو المشاريع.',
            'تُحفظ الخطة ضمن النسخ الاحتياطية الجديدة.'
          ],
          isNew: true,
          tags: ['تقويم', 'اختبارات', 'مشاريع', 'خطة']
        }
      ]
    },
    {
      id: 'students',
      title: 'الطلاب والحضور والسلوك',
      description: 'متابعة الطالب اليومية من الحضور إلى السلوك والتقارير الفردية.',
      icon: Users,
      accent: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      topics: [
        {
          id: 'students-attendance',
          title: 'الحضور والغياب والتأخر',
          summary: 'تسجيل حالة كل طالب في بداية الحصة ومراجعة السجل لاحقًا.',
          steps: [
            'اختر الفصل والحصة.',
            'سجّل الحاضر والغائب والمتأخر والمتسرب حسب الحالة.',
            'راجع السجل قبل الانتقال إلى الحصة التالية.',
            'تظهر ملخصات الحضور في تقرير الطالب وفي المزامنة المخصصة للإدارة وولي الأمر.'
          ],
          tips: ['تسجيل الحضور والغياب مبكرًا يختصر وقت المتابعة.'],
          tags: ['حضور', 'غياب', 'تأخر', 'إدارة']
        },
        {
          id: 'students-behavior',
          title: 'السلوك الإيجابي والسلبي',
          summary: 'إضافة الملاحظات والنقاط وربطها بالفصل الدراسي.',
          steps: [
            'افتح بطاقة الطالب أو شاشة السلوك.',
            'اختر نوع السلوك واكتب الملاحظة وحدد النقاط.',
            'راجع السلوكيات حسب الفصل الدراسي في تقرير الطالب.',
            'تصل السجلات المناسبة إلى راصد ولي الأمر عبر المزامنة.'
          ],
          tags: ['سلوك', 'نقاط', 'ولي الأمر']
        },
        {
          id: 'students-groups',
          title: 'إدارة مجموعات الطلاب',
          summary: 'إنشاء تقسيمات متعددة وتوزيع الطلاب وعرض المجموعات وتصديرها.',
          steps: [
            'اختر الفصل ثم أنشئ تقسيمًا مثل مشروع أو نشاط أو مراجعة.',
            'أنشئ المجموعات يدويًا أو حدد عددها للتوزيع التلقائي.',
            'راجع الطلاب غير الموزعين وأضفهم إلى المجموعات.',
            'يمكن نسخ التقسيم داخل الفصل أو إلى فصل آخر مع الطلاب أو بدونهم.',
            'استخدم العرض التقديمي أو صدّر المجموعات كصورة أو PDF.',
            'أرشف التقسيمات القديمة بدل حذفها.'
          ],
          isNew: true,
          tags: ['مجموعات', 'توزيع تلقائي', 'أرشيف', 'PDF']
        }
      ]
    },
    {
      id: 'grades',
      title: 'الدرجات والتقويم',
      description: 'أدوات التقويم وإدخال الدرجات وحساب نتائج الفصول والنتيجة النهائية.',
      icon: BarChart3,
      accent: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
      topics: [
        {
          id: 'grades-tools',
          title: 'إعداد أدوات التقويم',
          summary: 'تعريف الاختبارات والمشاريع والأنشطة والامتحان النهائي ودرجاتها.',
          steps: [
            'افتح إعدادات الدرجات وأضف أدوات التقويم.',
            'حدد الدرجة القصوى لكل أداة.',
            'حدد أداة الامتحان النهائي بصورة صحيحة.',
            'تأكد أن مجموع الدرجات يتوافق مع إعداد الدرجة الكلية.'
          ],
          tags: ['درجات', 'أدوات تقويم', 'امتحان نهائي']
        },
        {
          id: 'grades-semesters',
          title: 'نتائج الفصلين والنتيجة النهائية',
          summary: 'عرض نتائج الفصل الأول أو الثاني بصورة مستقلة، أو متوسط العام الدراسي.',
          steps: [
            'في تقرير الطالب أو سجل الدرجات اختر الفصل الدراسي الأول فقط لعرض درجاته وحدها.',
            'اختر الفصل الدراسي الثاني فقط لعرض درجاته وحدها.',
            'اختر النتيجة النهائية للعام لحساب متوسط مجموع الفصلين.',
            'إذا كانت بيانات أحد الفصلين غير مكتملة، يعرض التقرير أن النتيجة السنوية غير مكتملة.'
          ],
          isNew: true,
          tags: ['فصل أول', 'فصل ثاني', 'نتيجة نهائية', 'متوسط']
        }
      ]
    },
    {
      id: 'communication',
      title: 'المراسلات وولي الأمر',
      description: 'استقبال رسائل ولي الأمر والرد وإرسال رسائل مهنية مباشرة.',
      icon: Mail,
      accent: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      topics: [
        {
          id: 'communication-mailbox',
          title: 'مركز المراسلات',
          summary: 'صفحة مستقلة للوارد والمرسل وإنشاء رسالة جديدة.',
          steps: [
            'افتح مركز المراسلات واضغط تحديث لجلب الرسائل من سحابة ولي الأمر.',
            'افتح الرسالة الواردة ثم اكتب الرد وأرسله.',
            'في تبويب إرسال اختر الصف والفصل والطالب ونوع الرسالة.',
            'يمكن استخدام القوالب الجاهزة للتنبيه السلوكي أو التقارير أو الإشادة أو الواجب.',
            'يحتفظ راصد بسجل محلي محدود للرسائل المرسلة حتى تصل إلى السحابة.'
          ],
          isNew: true,
          tags: ['مراسلات', 'وارد', 'مرسل', 'رد']
        }
      ]
    },
    {
      id: 'tasks-library',
      title: 'المهام والمكتبة',
      description: 'إنشاء المهام ومشاركة الموارد التعليمية مع راصد الطالب.',
      icon: ListChecks,
      accent: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      topics: [
        {
          id: 'tasks-create',
          title: 'إنشاء المهام',
          summary: 'إضافة مهمة وتحديد المادة والفصل المستهدف ثم مزامنتها.',
          steps: [
            'افتح صفحة المهام وأدخل عنوان المهمة والمادة.',
            'حدد الفصل المستهدف ثم احفظ المهمة.',
            'نفّذ مزامنة راصد الطالب لإظهار المهمة للطلاب.',
            'تدخل المهام ضمن النسخة المحلية والسحابية لراصد المعلم.'
          ],
          isNew: true,
          tags: ['مهام', 'راصد الطالب', 'مزامنة']
        },
        {
          id: 'library-resources',
          title: 'المكتبة التعليمية',
          summary: 'إرسال رابط أو فيديو أو مورد PDF إلى الفصل المستهدف.',
          steps: [
            'اختر نوع المورد وأدخل العنوان والرابط.',
            'حدد الفصل المستهدف ثم أرسل المورد.',
            'يمكن مراجعة أرشيف المكتبة داخل راصد المعلم.',
            'أرشيف المكتبة يدخل ضمن النسخ الاحتياطية.'
          ],
          isNew: true,
          tags: ['مكتبة', 'رابط', 'فيديو', 'PDF']
        }
      ]
    },
    {
      id: 'games',
      title: 'الألعاب التعليمية',
      description: 'بنك الأسئلة والنشر ونتائج اللعب وتحليل المشاركة.',
      icon: Gamepad2,
      accent: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      topics: [
        {
          id: 'games-questions',
          title: 'بنك أسئلة الألعاب',
          summary: 'إنشاء أسئلة ديناميكية دون الحاجة إلى تحديث تطبيق الطالب.',
          steps: [
            'أنشئ السؤال وحدد الصف والفصل الدراسي والوحدة والدرس.',
            'حدد نوع السؤال والألعاب التي يمكن استخدامه فيها.',
            'احفظ السؤال كمسودة أو انشره ضمن الأسئلة النشطة.',
            'يمكن أرشفة الأسئلة وإعادتها لاحقًا.',
            'زامن المحتوى مع راصد الطالب بعد النشر.'
          ],
          isNew: true,
          tags: ['ألعاب', 'أسئلة', 'مسودات', 'نشر']
        },
        {
          id: 'games-results',
          title: 'نتائج الألعاب والمشاركة',
          summary: 'تحليل نتائج الطلاب ومعرفة المشاركين وغير المشاركين.',
          steps: [
            'افتح لوحة نتائج الألعاب واختر كل الألعاب أو لعبة محددة.',
            'راجع النقاط ونسب الإجابات الصحيحة والخاطئة.',
            'استخدم قائمة الطلاب غير المشاركين للمتابعة.',
            'راجع الأسئلة الضعيفة لتحديد المهارات التي تحتاج علاجًا.'
          ],
          isNew: true,
          tags: ['نتائج', 'غير مشاركين', 'تحليل', 'أسئلة ضعيفة']
        }
      ]
    },
    {
      id: 'reports',
      title: 'مركز التقارير',
      description: 'التقارير والسجلات والتحليل الإحصائي والشهادات والبطاقات.',
      icon: Printer,
      accent: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      topics: [
        {
          id: 'reports-student',
          title: 'تقرير طالب أو فصل كامل',
          summary: 'معاينة وطباعة تقرير تفصيلي للفصل المختار أو لطالب محدد.',
          steps: [
            'حدد نوع التقرير: فصل كامل أو طالب.',
            'اختر الفصل الدراسي الأول أو الثاني أو النتيجة النهائية للعام.',
            'راجع الدرجات والحضور والسلوك قبل التصدير.',
            'صدّر التقرير إلى PDF أو شاركه من نافذة النظام على الجوال.'
          ],
          isNew: true,
          tags: ['تقرير طالب', 'فصل كامل', 'PDF']
        },
        {
          id: 'reports-analytics',
          title: 'التحليل الإحصائي',
          summary: 'قراءة مستوى الفصل وتوزيع الدرجات والأداء في أدوات التقويم.',
          steps: [
            'اختر الصف والفصل وأداة التقويم أو نطاق التحليل.',
            'راجع المتوسطات والتوزيع ومستويات الأداء.',
            'استخدم نتائج التحليل لتحديد الطلاب والمهارات التي تحتاج متابعة.',
            'اطبع التحليل عند الحاجة للاجتماعات أو ملفات المتابعة.'
          ],
          tags: ['تحليل إحصائي', 'متوسط', 'أداء']
        },
        {
          id: 'reports-certificates',
          title: 'شهادات التقدير والتميز',
          summary: 'استخدام تصميم راصد أو رفع صورة أو PDF لشهادة فارغة.',
          steps: [
            'اختر الطلاب واكتب عنوان الشهادة ونصها.',
            'استخدم التصميم الافتراضي أو ارفع صورة شهادة فارغة.',
            'يمكن رفع ملف PDF؛ يحول راصد الصفحة الأولى إلى خلفية.',
            'راجع موضع النص والاسم فوق الخلفية ثم صدّر الشهادات.'
          ],
          isNew: true,
          warning: 'يفضل استخدام شهادة أفقية بنسبة A4 وبخلفية واضحة ومساحة مناسبة لاسم الطالب والنص.',
          tags: ['شهادة', 'صورة', 'PDF', 'تميز']
        },
        {
          id: 'reports-parent-cards',
          title: 'بطاقات أولياء الأمور',
          summary: 'طباعة بطاقات مبسطة تتضمن اسم الطالب والفصل والكود السري.',
          steps: [
            'اختر الفصل المطلوب.',
            'راجع أسماء الطلاب وأكوادهم قبل الطباعة.',
            'وزع البطاقات بصورة فردية للمحافظة على خصوصية الأكواد.'
          ],
          tags: ['بطاقات', 'كود سري', 'ولي الأمر']
        }
      ]
    },
    {
      id: 'backup',
      title: 'النسخ والمزامنة',
      description: 'حفظ بيانات راصد المعلم محليًا وسحابيًا واستعادتها بأمان.',
      icon: Cloud,
      accent: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      topics: [
        {
          id: 'backup-local',
          title: 'النسخة المحلية',
          summary: 'إنشاء ملف JSON شامل يمكن حفظه ومشاركته أو نقله إلى جهاز آخر.',
          steps: [
            'افتح الإعدادات ثم قسم النسخ الاحتياطي.',
            'اختر إنشاء نسخة محلية.',
            'على الجوال استخدم نافذة المشاركة لحفظ الملف في المكان المطلوب.',
            'على Windows يُنزّل الملف إلى الجهاز.',
            'تأكد من الاحتفاظ بنسخة حديثة قبل إعادة ضبط التطبيق.'
          ],
          tags: ['نسخة محلية', 'JSON', 'استعادة']
        },
        {
          id: 'backup-cloud',
          title: 'النسخة السحابية بين أجهزة المعلم',
          summary: 'مزامنة نسخة راصد المعلم بين Windows وAndroid وiOS.',
          steps: [
            'تأكد من اكتمال معرف المعلم المستخدم في سحابة راصد المعلم.',
            'ارفع نسخة سحابية بعد انتهاء التعديلات المهمة.',
            'عند الاستعادة يحمّل راصد النسخة الشاملة ويعيد تشغيل التطبيق لقراءة بيانات المكونات.',
            'تشمل النسخة الجديدة الخطط والمهام والمكتبة والمجموعات والألعاب والإعدادات الجديدة.'
          ],
          isNew: true,
          warning: 'لا تستعد نسخة قديمة قبل إنشاء نسخة أمان من البيانات الحالية.',
          tags: ['سحابة', 'Windows', 'Android', 'iOS']
        },
        {
          id: 'backup-scope',
          title: 'ما الذي يدخل في النسخة؟',
          summary: 'نظرة على البيانات الأساسية والإضافات الجديدة المشمولة.',
          steps: [
            'الطلاب والفصول والحضور والسلوك والدرجات وأوراق الاختبارات.',
            'الجدول وأوقات الحصص وأدوات التقويم وإعدادات الشهادات.',
            'الخطة الفصلية وخطة التقويم المستمر.',
            'المهام وأرشيف المكتبة والمجموعات والتقسيمات المؤرشفة.',
            'سجل الرسائل المحلية وبنوك أسئلة الألعاب والنتائج المحلية.',
            'بيانات الرسائل والنتائج الموجودة أصلًا في سحب مستقلة لا تُكرر بلا حاجة.'
          ],
          tags: ['محتوى النسخة', 'بيانات']
        }
      ]
    },
    {
      id: 'settings',
      title: 'الإعدادات والخصوصية',
      description: 'بيانات المعلم واللغة والثيم وإعادة الضبط وإرشادات الأمان.',
      icon: Settings,
      accent: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      topics: [
        {
          id: 'settings-profile',
          title: 'بيانات المعلم والمظهر',
          summary: 'تحديث الملف التعريفي واللغة والاتجاه والثيم.',
          steps: [
            'حدّث اسم المعلم والمدرسة والمادة والمحافظة.',
            'اختر اللغة والثيم المناسبين.',
            'تأكد من ظهور الشعار والختم بصورة صحيحة في التقارير.'
          ],
          tags: ['إعدادات', 'لغة', 'ثيم', 'ملف شخصي']
        },
        {
          id: 'settings-reset',
          title: 'إعادة ضبط التطبيق',
          summary: 'حذف بيانات راصد المعلم من الجهاز والبدء من جديد.',
          steps: [
            'أنشئ نسخة محلية وسحابية أولًا.',
            'تأكد أن ملف النسخة موجود ويمكن الوصول إليه.',
            'نفّذ إعادة الضبط فقط عند الحاجة.',
            'بعد إعادة التشغيل استعد النسخة ثم راجع البيانات الأساسية.'
          ],
          warning: 'إعادة الضبط تحذف البيانات المحلية. لا تنفذها دون نسخة احتياطية حديثة.',
          tags: ['إعادة ضبط', 'حذف', 'تحذير']
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'حل المشكلات',
      description: 'إجراءات سريعة للمشكلات الأكثر شيوعًا في التطبيق والتصدير والمزامنة.',
      icon: HelpCircle,
      accent: 'bg-red-500/10 text-red-500 border-red-500/20',
      topics: [
        {
          id: 'troubleshooting-sync',
          title: 'المزامنة لا تعيد البيانات',
          summary: 'تحقق من الاتصال والمعرف والنسخة السحابية قبل إعادة المحاولة.',
          steps: [
            'تأكد من الاتصال بالإنترنت.',
            'تحقق من بيانات المعلم المستخدمة كمعرف في السحابة.',
            'تأكد من نجاح رفع النسخة قبل الاستعادة.',
            'أغلق التطبيق وافتحه بعد اكتمال الاستعادة.',
            'لا تحذف النسخة المحلية حتى تتأكد من عودة البيانات.'
          ],
          tags: ['مزامنة', 'استعادة', 'اتصال']
        },
        {
          id: 'troubleshooting-pdf',
          title: 'تعذر إنشاء أو قراءة PDF',
          summary: 'حلول سريعة لتقارير PDF وخلفيات الشهادات.',
          steps: [
            'جرّب ملف PDF غير محمي بكلمة مرور.',
            'تأكد أن الملف سليم ويحتوي على صفحة واحدة على الأقل.',
            'للخلفيات المعقدة يمكن تحويل الشهادة إلى PNG ثم رفعها.',
            'اسمح لنافذة المشاركة أو حفظ الملفات بالظهور على الجوال.'
          ],
          tags: ['PDF', 'شهادة', 'تصدير']
        },
        {
          id: 'troubleshooting-widget',
          title: 'ويدجيت الجدول لا يتحدث',
          summary: 'تحديث البيانات وإعادة إضافة الويدجيت عند الحاجة.',
          steps: [
            'افتح راصد المعلم وانتظر اكتمال تحميل الجدول.',
            'ارجع إلى الشاشة الرئيسية لمراجعة الويدجيت.',
            'إذا بقيت بيانات قديمة، احذف الويدجيت وأضفه من جديد.',
            'تأكد من أن الوقت والجدول وأوقات الحصص مضبوطة.'
          ],
          tags: ['ويدجيت', 'جدول', 'Android']
        }
      ]
    }
  ], []);

  const sections = useMemo<GuideSection[]>(() => {
    const localize = (value: string) => language === 'ar' ? value : (GUIDE_EN[value] || value);
    return baseSections.map(section => ({
      ...section,
      title: localize(section.title),
      description: localize(section.description),
      topics: section.topics.map(topic => ({
        ...topic,
        title: localize(topic.title),
        summary: localize(topic.summary),
        steps: topic.steps.map(localize),
        tips: topic.tips?.map(localize),
        warning: topic.warning ? localize(topic.warning) : undefined,
        tags: topic.tags?.map(localize)
      }))
    }));
  }, [baseSections, language]);

  useEffect(() => {
    localStorage.setItem('rased_guide_active_section', activeSection);
  }, [activeSection]);

  const activeSectionData = sections.find(section => section.id === activeSection) || sections[0];

  const filteredSections = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return sections;

    return sections
      .map(section => {
        const sectionMatches = normalizeText(`${section.title} ${section.description}`).includes(normalizedQuery);
        const topics = section.topics.filter(topic => {
          const text = [topic.title, topic.summary, ...topic.steps, ...(topic.tips || []), topic.warning || '', ...(topic.tags || [])].join(' ');
          return sectionMatches || normalizeText(text).includes(normalizedQuery);
        });
        return { ...section, topics };
      })
      .filter(section => section.topics.length > 0);
  }, [query, sections]);

  const totalTopics = sections.reduce((sum, section) => sum + section.topics.length, 0);
  const searchResultsCount = filteredSections.reduce((sum, section) => sum + section.topics.length, 0);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(previous => {
      const next = new Set(previous);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const selectSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);
    requestAnimationFrame(() => {
      document.getElementById(`guide-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('guide-print-content');
    if (!element) return;

    try {
      setIsExporting(true);
      const worker = html2pdf().set({
        margin: [7, 7, 7, 7],
        filename: `Rased_Teacher_Guide_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 1.7, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      }).from(element).toPdf();

      if (Capacitor.isNativePlatform()) {
        const dataUri = await worker.output('datauristring');
        const base64Data = String(dataUri).split(',')[1];
        const result = await Filesystem.writeFile({
          path: `Rased_Teacher_Guide_${Date.now()}.pdf`,
          data: base64Data,
          directory: Directory.Cache
        });
        await Share.share({
          title: t('guidePdfTitle'),
          text: t('guidePdfShareText'),
          url: result.uri,
          dialogTitle: t('guidePdfDialogTitle')
        });
      } else {
        await worker.save();
      }
    } catch (error) {
      console.error('Guide PDF export error:', error);
      alert(t('guidePdfExportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const renderTopic = (topic: GuideTopic, section: GuideSection) => {
    const Icon = section.icon;
    const expanded = expandedTopics.has(topic.id) || Boolean(query.trim());

    return (
      <article key={topic.id} className="bg-bgCard border border-borderColor rounded-3xl shadow-sm overflow-hidden break-inside-avoid">
        <button
          type="button"
          onClick={() => toggleTopic(topic.id)}
          className="w-full p-4 md:p-5 flex items-start justify-between gap-4 text-start hover:bg-bgSoft transition-colors"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${section.accent}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-black text-base md:text-lg text-textPrimary">{topic.title}</h3>
                {topic.isNew && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black bg-success/10 text-success border border-success/20">
                    <Sparkles size={10} /> {t('newBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm font-bold text-textSecondary leading-6">{topic.summary}</p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-textSecondary shrink-0 mt-2" /> : <ChevronDown className="w-5 h-5 text-textSecondary shrink-0 mt-2" />}
        </button>

        {expanded && (
          <div className="px-4 md:px-5 pb-5 border-t border-borderColor bg-bgSoft/40">
            <div className="pt-4">
              <p className="text-[11px] font-black text-textSecondary mb-3 flex items-center gap-2">
                <ListChecks size={15} className="text-primary" /> {t('guideUsageSteps')}
              </p>
              <ol className="space-y-3">
                {topic.steps.map((step, index) => (
                  <li key={`${topic.id}-step-${index}`} className="flex items-start gap-3 text-xs md:text-sm font-bold text-textPrimary leading-6">
                    <span className="w-7 h-7 rounded-xl bg-primary text-white flex items-center justify-center text-[11px] font-black shrink-0">{index + 1}</span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {topic.tips?.map((tip, index) => (
              <div key={`${topic.id}-tip-${index}`} className="mt-4 rounded-2xl p-3 bg-info/10 text-info border border-info/20 text-xs font-bold leading-6 flex items-start gap-2">
                <Sparkles size={16} className="shrink-0 mt-1" />
                <span><strong>{t('guideTipLabel')}:</strong> {tip}</span>
              </div>
            ))}

            {topic.warning && (
              <div className="mt-4 rounded-2xl p-3 bg-warning/10 text-warning border border-warning/20 text-xs font-bold leading-6 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-1" />
                <span><strong>{t('guideWarningLabel')}:</strong> {topic.warning}</span>
              </div>
            )}

            {topic.tags && (
              <div className="mt-4 flex flex-wrap gap-2">
                {topic.tags.map(tag => (
                  <span key={`${topic.id}-${tag}`} className="px-2.5 py-1 rounded-full bg-bgCard border border-borderColor text-[9px] font-black text-textSecondary">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className={`h-full min-h-0 bg-bgMain text-textPrimary ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      <div className="h-full min-h-0 flex overflow-hidden">
        {isSidebarOpen && (
          <button type="button" aria-label={t('guideCloseMenu')} onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden" />
        )}

        <aside className={`fixed lg:static inset-y-0 ${dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'} z-50 w-[290px] bg-bgCard border-borderColor transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="h-full flex flex-col pt-[max(env(safe-area-inset-top),12px)]">
            <div className="p-4 border-b border-borderColor flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center"><BookOpen size={21} /></div>
                <div>
                  <h2 className="font-black text-lg">{t('guideTitle')}</h2>
                  <p className="text-[10px] font-bold text-textSecondary">{t('guideInteractiveHelp')}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-xl bg-bgSoft text-textSecondary"><X size={18} /></button>
            </div>

            <div className="p-3 border-b border-borderColor">
              <label className="relative block">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('guideSearchPlaceholder')} className={`w-full h-11 rounded-2xl bg-bgSoft border border-borderColor text-sm font-bold outline-none focus:border-primary ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'}`} />
              </label>
              {query && <p className="mt-2 text-[10px] font-black text-primary">{searchResultsCount} {t('guideMatchingTopics')}</p>}
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {sections.map(section => {
                const Icon = section.icon;
                const active = activeSection === section.id;
                return (
                  <button key={section.id} type="button" onClick={() => selectSection(section.id)} className={`w-full p-3 rounded-2xl flex items-center justify-between gap-2 transition-all ${active ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-bgSoft hover:text-textPrimary'}`}>
                    <span className="flex items-center gap-3 min-w-0"><Icon size={17} className="shrink-0" /><span className="font-black text-xs truncate">{section.title}</span></span>
                    <span className={`text-[9px] font-black min-w-6 h-6 px-1 rounded-lg flex items-center justify-center ${active ? 'bg-white/20 text-white' : 'bg-bgSoft border border-borderColor'}`}>{section.topics.length}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-borderColor">
              <button type="button" onClick={handleDownloadPDF} disabled={isExporting} className="w-full h-11 rounded-2xl bg-primary text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-60">
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isExporting ? t('guidePreparingPdf') : t('guideSavePdf')}
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar scroll-smooth">
          <div className="sticky top-0 z-30 lg:hidden bg-bgMain/95 backdrop-blur border-b border-borderColor pt-[max(env(safe-area-inset-top),8px)] p-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSidebarOpen(true)} className="w-11 h-11 rounded-2xl bg-bgCard border border-borderColor flex items-center justify-center"><Menu size={20} /></button>
              <select value={activeSection} onChange={event => selectSection(event.target.value)} className="flex-1 h-11 rounded-2xl bg-bgCard border border-borderColor px-3 font-black text-xs outline-none focus:border-primary">
                {sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}
              </select>
            </div>
          </div>

          <div id="guide-print-content" className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8 pb-28">
            <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-indigo-700 text-white p-5 md:p-8 mb-5 md:mb-7 shadow-lg">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-[10px] font-black mb-4"><Sparkles size={13} /> {t('guideModernBadge')}</div>
                  <h1 className="text-3xl md:text-5xl font-black leading-tight mb-3">{t('guideHeroTitle')}</h1>
                  <p className="text-sm md:text-base font-bold text-white/80 leading-7 max-w-3xl">{t('guideHeroDescription')}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 min-w-[260px]">
                  <div className="rounded-2xl bg-white/15 border border-white/20 p-3 text-center"><p className="text-2xl font-black">{sections.length}</p><p className="text-[9px] font-bold text-white/70">{t('guideSectionsLabel')}</p></div>
                  <div className="rounded-2xl bg-white/15 border border-white/20 p-3 text-center"><p className="text-2xl font-black">{totalTopics}</p><p className="text-[9px] font-bold text-white/70">{t('guideTopicsLabel')}</p></div>
                  <div className="rounded-2xl bg-white/15 border border-white/20 p-3 text-center"><p className="text-2xl font-black">3</p><p className="text-[9px] font-bold text-white/70">{t('guidePlatformsLabel')}</p></div>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 md:mb-7">
              <div className="bg-bgCard border border-borderColor rounded-3xl p-4 flex items-center gap-3"><Monitor className="text-primary" /><div><p className="font-black text-sm">Windows</p><p className="text-[10px] font-bold text-textSecondary">واجهة واسعة وتصدير مباشر</p></div></div>
              <div className="bg-bgCard border border-borderColor rounded-3xl p-4 flex items-center gap-3"><Smartphone className="text-success" /><div><p className="font-black text-sm">{t('guideMobileTitle')}</p><p className="text-[10px] font-bold text-textSecondary">{t('guideMobileDescription')}</p></div></div>
              <div className="bg-bgCard border border-borderColor rounded-3xl p-4 flex items-center gap-3"><ShieldCheck className="text-warning" /><div><p className="font-black text-sm">{t('guideSafeBackupTitle')}</p><p className="text-[10px] font-bold text-textSecondary">{t('guideSafeBackupDescription')}</p></div></div>
            </section>

            {filteredSections.length === 0 ? (
              <div className="bg-bgCard border border-dashed border-borderColor rounded-3xl p-10 text-center"><FileQuestion className="w-14 h-14 mx-auto text-textMuted mb-3" /><h2 className="font-black text-lg">{t('guideNoResults')}</h2><p className="text-xs font-bold text-textSecondary mt-2">{t('guideNoResultsHint')}</p></div>
            ) : (
              <div className="space-y-6">
                {filteredSections.map(section => {
                  const SectionIcon = section.icon;
                  const visible = query.trim() || activeSection === section.id;
                  if (!visible) return null;
                  return (
                    <section id={`guide-section-${section.id}`} key={section.id} className="scroll-mt-24">
                      <div className="bg-bgCard border border-borderColor rounded-3xl p-4 md:p-5 mb-3 shadow-sm">
                        <div className="flex items-start gap-3"><div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${section.accent}`}><SectionIcon size={22} /></div><div><h2 className="text-xl md:text-2xl font-black">{section.title}</h2><p className="text-xs md:text-sm font-bold text-textSecondary leading-6 mt-1">{section.description}</p></div></div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">{section.topics.map(topic => renderTopic(topic, section))}</div>
                    </section>
                  );
                })}
              </div>
            )}

            <footer className="mt-8 rounded-3xl bg-bgCard border border-borderColor p-5 text-center">
              <BookOpen className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="font-black text-sm">{t('guideTitle')}</p>
              <p className="text-[10px] font-bold text-textSecondary mt-1">{t('guideFooterUpdate')} • {new Date().getFullYear()}</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserGuide;
