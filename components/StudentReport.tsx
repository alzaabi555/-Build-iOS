import React, { useState } from 'react';
import { Student, GradeRecord } from '../types';
import { Award, AlertCircle, MessageCircle, PhoneCall, Trash2, Download, Loader2, Mail, UserCheck, FileText } from 'lucide-react';

// تعريف html2pdf لتجنب أخطاء TypeScript
declare var html2pdf: any;

interface StudentReportProps {
  student: Student;
  onUpdateStudent?: (s: Student) => void;
}

const StudentReport: React.FC<StudentReportProps> = ({ student, onUpdateStudent }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  // تغيير الحالة لتخزين معرف الدرجة التي يتم إنشاء استدعاء لها حالياً لفصل الأزرار
  const [generatingSummonsId, setGeneratingSummonsId] = useState<string | null>(null);
  
  const behaviors = student.behaviors || [];
  const allGrades = student.grades || [];

  // حساب مجموع نقاط السلوك
  const totalPositivePoints = behaviors.filter(b => b.type === 'positive').reduce((acc, b) => acc + b.points, 0);
  const totalNegativePoints = behaviors.filter(b => b.type === 'negative').reduce((acc, b) => acc + Math.abs(b.points), 0);

  // --- منطق حساب الدرجات المحدث ---
  // فصل الدرجات حسب الفصل الدراسي بدقة
  const sem1Grades = allGrades.filter(g => !g.semester || g.semester === '1');
  const sem2Grades = allGrades.filter(g => g.semester === '2');

  const calcStats = (grades: GradeRecord[]) => {
      const score = grades.reduce((acc, g) => acc + (Number(g.score) || 0), 0);
      const max = grades.reduce((acc, g) => acc + (Number(g.maxScore) || 0), 0);
      return { score, max };
  };

  const sem1Stats = calcStats(sem1Grades);
  const sem2Stats = calcStats(sem2Grades);

  // المجموع الكلي التراكمي
  const finalScore = sem1Stats.score + sem2Stats.score;
  const finalMax = sem1Stats.max + sem2Stats.max;
  const finalPercentage = finalMax > 0 ? Math.round((finalScore / finalMax) * 100) : 0;

  // دالة تحديد الرمز اللفظي (تمت المراجعة)
  const getGradeSymbol = (percentage: number) => {
    if (finalMax === 0) return null;
    if (percentage >= 90) return { symbol: 'أ', desc: 'ممتاز', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (percentage >= 80) return { symbol: 'ب', desc: 'جيد جداً', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (percentage >= 65) return { symbol: 'ج', desc: 'جيد', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
    if (percentage >= 50) return { symbol: 'د', desc: 'مقبول', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { symbol: 'هـ', desc: 'يحتاج مساعدة', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
  };

  const finalSymbol = getGradeSymbol(finalPercentage);

  // تصفية درجات الاستدعاء
  const lowGradesForSummons = allGrades.filter(g => 
    (g.category.includes('اختبار قصير') || g.category.includes('الاختبار القصير') || g.category.includes('Short Test')) && 
    g.score < 10
  );

  const handleDeleteBehavior = (behaviorId: string) => {
      if (confirm('هل أنت متأكد من حذف هذا السلوك؟')) {
          const updatedBehaviors = behaviors.filter(b => b.id !== behaviorId);
          if (onUpdateStudent) {
              onUpdateStudent({ ...student, behaviors: updatedBehaviors });
          }
      }
  };

  // --- الطريقة السحرية لحفظ PDF ---
  const exportPDF = async (element: HTMLElement, filename: string, setLoader: (val: boolean) => void) => {
    setLoader(true);
    
    // إعدادات محسنة جداً للآيفون
    const opt = {
        margin: [10, 10, 10, 10], // هوامش متوازنة
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, // دقة عالية
            useCORS: true, 
            letterRendering: true,
            scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        try {
            const worker = html2pdf().set(opt).from(element).toPdf();
            const pdfBlob = await worker.output('blob');
            const file = new File([pdfBlob], filename, { type: 'application/pdf' });

            // 1. المحاولة الأولى: المشاركة الأصلية (Native Share)
            // هذه أفضل طريقة للآيفون لأنها تفتح قائمة "حفظ في الملفات" أو "إرسال"
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: filename,
                    text: `إليك ملف ${filename}`
                });
            } else {
                // 2. المحاولة الثانية: الفتح المباشر (Blob URL)
                // إذا فشلت المشاركة، نفتح الملف في تبويب جديد.
                // في الآيفون، سفاري سيفتح عارض PDF ومن هناك يمكن للمستخدم الحفظ
                const url = URL.createObjectURL(pdfBlob);
                
                // إنشاء رابط مخفي والنقر عليه (أفضل للأندرويد والكمبيوتر)
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank'; // فتح في نافذة جديدة
                // link.download = filename; // محاولة فرض التحميل (قد لا تعمل في الآيفون لذا نعتمد على الفتح)
                
                document.body.appendChild(link);
                link.click();
                
                // تنظيف
                setTimeout(() => {
                    document.body.removeChild(link);
                    // لا نحذف الـ URL فوراً لضمان فتحه في الآيفون
                    setTimeout(() => URL.revokeObjectURL(url), 60000); 
                }, 100);
            }
        } catch (err) {
            console.error('PDF Error:', err);
            alert('حدث خطأ أثناء إنشاء التقرير. يرجى المحاولة مرة أخرى.');
        } finally {
            setLoader(false);
        }
    } else {
        alert('مكتبة PDF غير جاهزة، تأكد من الاتصال بالإنترنت');
        setLoader(false);
    }
  };

  // توليد تقرير الطالب
  const handleSaveReport = () => {
    const element = document.createElement('div');
    element.setAttribute('dir', 'rtl');
    element.style.fontFamily = 'Tajawal, sans-serif';
    element.style.padding = '20px';
    element.style.color = '#000';

    // حساب نسبة الفصلين للعرض في الجدول
    const sem1Perc = sem1Stats.max > 0 ? Math.round((sem1Stats.score / sem1Stats.max) * 100) : 0;
    const sem2Perc = sem2Stats.max > 0 ? Math.round((sem2Stats.score / sem2Stats.max) * 100) : 0;

    element.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px;">
        <h1 style="margin: 0; font-size: 24px;">تقرير الطالب الدراسي والسلوكي</h1>
        <p style="margin: 5px 0 0; font-size: 14px; color: #555;">مدرسة: ${localStorage.getItem('schoolName') || '................'}</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #777;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
      </div>

      <div style="background: #f9fafb; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
         <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px; font-weight: bold; width: 120px;">اسم الطالب:</td>
              <td style="padding: 6px;">${student.name}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold;">المقيد بالصف:</td>
              <td style="padding: 6px;">${student.classes[0] || '-'}</td>
            </tr>
         </table>
      </div>

      <!-- ملخص الدرجات الجديد -->
      <div style="margin-bottom: 20px;">
         <h3 style="border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px;">ملخص النتائج</h3>
         <table style="width: 100%; border-collapse: collapse; text-align: center; border: 1px solid #ccc;">
            <tr style="background: #f0f0f0;">
                <th style="padding: 8px; border: 1px solid #ccc;">الفصل الأول</th>
                <th style="padding: 8px; border: 1px solid #ccc;">الفصل الثاني</th>
                <th style="padding: 8px; border: 1px solid #ccc; background: #e0f2fe;">المجموع النهائي</th>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid #ccc;">
                    <div style="font-weight: bold; font-size: 16px;">${sem1Stats.score} / ${sem1Stats.max}</div>
                    <div style="font-size: 10px; color: #666;">(${sem1Perc}%)</div>
                </td>
                <td style="padding: 10px; border: 1px solid #ccc;">
                     <div style="font-weight: bold; font-size: 16px;">${sem2Stats.score} / ${sem2Stats.max}</div>
                     <div style="font-size: 10px; color: #666;">(${sem2Perc}%)</div>
                </td>
                <td style="padding: 10px; border: 1px solid #ccc; background: #f0f9ff;">
                     <div style="font-weight: bold; font-size: 18px; color: #0284c7;">${finalScore} / ${finalMax}</div>
                     <div style="font-weight: bold; font-size: 14px; margin-top: 4px;">التقدير: ${finalSymbol?.desc || '-'} (${finalSymbol?.symbol || ''})</div>
                </td>
            </tr>
         </table>
      </div>

      <div style="margin-bottom: 20px;">
         <h3 style="border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px;">ملخص السلوك</h3>
         <table style="width: 100%; text-align: center; border-collapse: separate; border-spacing: 10px;">
            <tr>
               <td style="padding: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; width: 50%;">
                  <div style="font-size: 12px; font-weight: bold; color: #047857;">نقاط إيجابية</div>
                  <div style="font-size: 20px; font-weight: 900; color: #059669;">+${totalPositivePoints}</div>
               </td>
               <td style="padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; width: 50%;">
                  <div style="font-size: 12px; font-weight: bold; color: #b91c1c;">نقاط سلبية</div>
                  <div style="font-size: 20px; font-weight: 900; color: #dc2626;">-${totalNegativePoints}</div>
               </td>
            </tr>
         </table>
      </div>

      <div>
         <h3 style="border-bottom: 1px solid #333; padding-bottom: 5px;">تفاصيل الدرجات</h3>
         <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
            <thead>
               <tr style="background: #e5e7eb;">
                  <th style="border: 1px solid #9ca3af; padding: 8px;">الأداة</th>
                  <th style="border: 1px solid #9ca3af; padding: 8px;">الدرجة</th>
                  <th style="border: 1px solid #9ca3af; padding: 8px;">العظمى</th>
                  <th style="border: 1px solid #9ca3af; padding: 8px;">الفصل</th>
               </tr>
            </thead>
            <tbody>
               ${allGrades.length > 0 ? allGrades.map(g => `
                  <tr>
                     <td style="border: 1px solid #9ca3af; padding: 8px;">${g.category}</td>
                     <td style="border: 1px solid #9ca3af; padding: 8px; text-align: center; font-weight: bold;">${g.score}</td>
                     <td style="border: 1px solid #9ca3af; padding: 8px; text-align: center;">${g.maxScore}</td>
                     <td style="border: 1px solid #9ca3af; padding: 8px; text-align: center;">${g.semester === '1' ? 'الأول' : 'الثاني'}</td>
                  </tr>
               `).join('') : '<tr><td colspan="4" style="text-align:center; padding: 8px; border: 1px solid #9ca3af;">لا توجد درجات</td></tr>'}
            </tbody>
         </table>
      </div>
      
      <div style="margin-top: 30px; text-align: left; padding-left: 20px;">
         <p>يعتمد،،</p>
         <p style="font-weight: bold;">مدير المدرسة: سلطان الزيدي</p>
      </div>
    `;
    exportPDF(element, `تقرير_${student.name}.pdf`, setIsGeneratingPdf);
  };

  // خطاب استدعاء ولي الأمر (باستخدام المعرف للفصل بين الأزرار)
  const handleGenerateSummons = (grade: GradeRecord) => {
    // تعيين معرف الدرجة الحالية لتشغيل اللودر الخاص بها فقط
    setGeneratingSummonsId(grade.id);
    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('ar-EG');
    const dayName = today.toLocaleDateString('ar-EG', { weekday: 'long' });
    const teacherName = localStorage.getItem('teacherName') || 'محمد درويش الزعابي';

    const element = document.createElement('div');
    element.setAttribute('dir', 'rtl');
    element.style.fontFamily = 'Tajawal, sans-serif';
    element.style.padding = '40px';
    element.style.color = '#000';
    element.style.lineHeight = '2';

    element.innerHTML = `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="text-decoration: underline; font-size: 24px; font-weight: 900; margin-bottom: 10px;">الموضوع: استدعاء ولي أمر الطالب</h1>
      </div>

      <p style="font-size: 18px; margin-bottom: 15px;">
        الفاضل ولي أمر الطالب : <b>${student.name}</b> <br/>
        المحترم
      </p>
      
      <p style="font-size: 18px; margin-bottom: 25px;">
         المقيد بالصف: <b>${student.classes[0] || '..........'}</b>
      </p>

      <p style="font-size: 18px; margin-bottom: 20px;">
        السلام عليكم ورحمة الله وبرکاته/ وبعد،،
      </p>

      <p style="font-size: 18px; text-align: justify; margin-bottom: 20px;">
        تود إدارة مدرسة <b>${localStorage.getItem('schoolName') || '................'}</b> دعوتكم للحضور لمراجعة 
        الاستاذ: <b>${teacherName}</b> / معلم الدراسات الاجتماعية، وذلك في يوم <b>${dayName}</b> 
        الموافق <b>${formattedDate}</b> في تمام الساعة التاسعة صباحاً.
      </p>

      <p style="font-size: 18px; margin-bottom: 10px; font-weight: bold;">وذلك لمناقشة الأمر التالي:</p>
      <p style="font-size: 18px; margin-bottom: 30px; border-right: 4px solid #000; padding-right: 15px; background: #f9f9f9;">
        مستوى التحصيل الدراسي . حيث حصل على درجة ( <b>${grade.score}</b> ) في <b>${grade.category}</b> .
      </p>

      <p style="font-size: 18px; margin-bottom: 40px;">
        نأمل منكم الحضور في الموعد المحدد، لما في ذلك من مصلحة تخدم مسيرة الطالب الدراسية والتربوية.
        شاكرين لكم حسن تعاونكم الدائم معنا.
      </p>

      <p style="font-size: 18px; margin-bottom: 50px;">وتقبلوا وافر التحية والتقدير،،</p>

      <div style="margin-top: 60px;">
        <p style="margin-bottom: 5px;">يعتمد</p>
        <p style="font-weight: bold; font-size: 20px;">مدير المدرسة: سلطان الزيدي</p>
        
        <div style="display: flex; justify-content: space-between; margin-top: 40px;">
            <div style="text-align: center; border-top: 1px dashed #000; width: 150px; padding-top: 10px;">التوقيع</div>
            <div style="text-align: center; border: 2px solid #000; width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">ختم المدرسة</div>
        </div>
      </div>
    `;

    // تمرير دالة لتصفير المعرف بعد الانتهاء بدلاً من boolean
    exportPDF(element, `استدعاء_${student.name}.pdf`, (isLoading) => {
        if (!isLoading) setGeneratingSummonsId(null);
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-6 relative">
            
            {/* زر الحفظ */}
            <div className="absolute top-6 left-6 flex gap-2">
                <button 
                    onClick={handleSaveReport} 
                    disabled={isGeneratingPdf}
                    className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50 shadow-sm border border-gray-100" 
                    title="حفظ التقرير PDF"
                >
                    {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <FileText className="w-5 h-5" />}
                </button>
            </div>

            {/* رأس الصفحة */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-100">{student.name.charAt(0)}</div>
                <div>
                  <h1 className="text-sm font-black text-gray-900 mb-1">{student.name}</h1>
                  <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black">الصف: {student.classes[0] || 'غير محدد'}</span>
                </div>
            </div>

            {/* المجموع والمستوى - تصميم مصغر ومتجاور */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl flex flex-col items-center justify-center h-32 relative overflow-hidden">
                    <span className="text-[9px] font-black text-slate-400 mb-1 absolute top-3">المجموع النهائي</span>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">{finalScore}</span>
                        <span className="text-xs font-bold text-slate-400">/ {finalMax}</span>
                    </div>
                    {/* عرض تفاصيل الفصلين تحت المجموع */}
                    <div className="flex gap-2 mt-2 border-t border-slate-200 pt-2 w-full justify-center">
                         <div className="text-center">
                             <span className="block text-[8px] text-slate-400 font-bold">فصل 1</span>
                             <span className="block text-[9px] font-black text-slate-600">{sem1Stats.score}</span>
                         </div>
                         <div className="w-px bg-slate-200"></div>
                         <div className="text-center">
                             <span className="block text-[8px] text-slate-400 font-bold">فصل 2</span>
                             <span className="block text-[9px] font-black text-slate-600">{sem2Stats.score}</span>
                         </div>
                    </div>
                </div>

                <div className={`${finalSymbol ? finalSymbol.bg : 'bg-gray-50'} ${finalSymbol ? finalSymbol.border : 'border-gray-100'} border p-4 rounded-3xl flex flex-col items-center justify-center h-32 relative overflow-hidden transition-all`}>
                    <span className="text-[9px] font-black opacity-50 mb-1 absolute top-3">المستوى</span>
                    {finalSymbol ? (
                        <>
                            <span className={`text-6xl font-black ${finalSymbol.color} leading-none mt-2`}>{finalSymbol.symbol}</span>
                            <span className={`text-[10px] font-bold ${finalSymbol.color} opacity-80 mt-1`}>{finalSymbol.desc}</span>
                        </>
                    ) : (
                        <span className="text-2xl font-black text-gray-300">-</span>
                    )}
                </div>
            </div>

            {/* نقاط السلوك المجمعة */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center min-h-[80px]">
                    <div className="flex items-center gap-1 mb-1">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[9px] font-black text-emerald-800">نقاط إيجابية</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-600">+{totalPositivePoints}</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 flex flex-col items-center justify-center min-h-[80px]">
                    <div className="flex items-center gap-1 mb-1">
                         <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span className="text-[9px] font-black text-rose-800">نقاط سلبية</span>
                    </div>
                    <span className="text-2xl font-black text-rose-600">-{totalNegativePoints}</span>
                </div>
            </div>

            {/* استدعاء ولي أمر - تم إصلاح مشكلة الأزرار المدمجة */}
            {lowGradesForSummons.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-[2rem] animate-in slide-in-from-bottom duration-500">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-amber-200 rounded-lg">
                            <Mail className="w-3.5 h-3.5 text-amber-900" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-amber-900">إجراء إداري مطلوب</h3>
                            <p className="text-[9px] font-bold text-amber-700">درجة متدنية في الاختبارات</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {lowGradesForSummons.map(grade => (
                            <div key={grade.id} className="w-full bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between shadow-sm">
                                <div className="text-right">
                                    <span className="block text-[10px] font-black text-gray-800">{grade.category}</span>
                                    <span className="text-[9px] font-bold text-rose-500">الدرجة: {grade.score} من {grade.maxScore}</span>
                                </div>
                                <button 
                                    onClick={() => handleGenerateSummons(grade)}
                                    // تعطيل الزر فقط إذا كان هذا الزر تحديداً هو الذي يتم معالجته
                                    disabled={generatingSummonsId !== null}
                                    className={`px-3 py-1.5 rounded-lg flex gap-1 items-center transition-all ${generatingSummonsId === grade.id ? 'bg-amber-200 text-amber-800' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95'}`}
                                >
                                    {generatingSummonsId === grade.id ? (
                                        <>
                                           <Loader2 className="w-3 h-3 animate-spin" />
                                           <span className="text-[9px] font-black">جاري الحفظ...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-[9px] font-black">طباعة استدعاء</span>
                                            <UserCheck className="w-3 h-3" />
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* أزرار الاتصال */}
            {student.parentPhone && (
              <div className="flex gap-2 border-t border-gray-50 pt-4">
                <a href={`https://wa.me/${student.parentPhone}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black active:scale-95 transition-all"><MessageCircle className="w-4 h-4"/> واتساب</a>
                <a href={`tel:${student.parentPhone}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 rounded-2xl text-[10px] font-black active:scale-95 transition-all"><PhoneCall className="w-4 h-4"/> اتصال</a>
              </div>
            )}
          </div>

          {/* سجل السلوكيات مع الحذف */}
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
            <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-gray-800 text-[11px]">كشف السلوكيات التفصيلي</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {behaviors.length > 0 ? behaviors.map(b => (
                <div key={b.id} className="p-4 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${b.type === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {b.type === 'positive' ? <Award className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                    </div>
                    <div>
                        <span className="block text-[10px] font-black text-gray-800">{b.description}</span>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[9px] text-gray-400 font-bold">{new Date(b.date).toLocaleDateString('ar-EG')}</span>
                            <span className={`text-[9px] font-black ${b.type === 'positive' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ({b.points > 0 ? `+${b.points}` : b.points} نقطة)
                            </span>
                        </div>
                    </div>
                  </div>
                  {onUpdateStudent && (
                      <button onClick={() => handleDeleteBehavior(b.id)} className="p-2 text-gray-200 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                      </button>
                  )}
                </div>
              )) : <p className="p-8 text-center text-[10px] text-gray-400 font-bold">سجل السلوك نظيف لهذا الطالب</p>}
            </div>
          </div>
      </div>
    </div>
  );
};

export default StudentReport;