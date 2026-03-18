import React, { forwardRef } from 'react';
import { Award } from 'lucide-react';
import { useApp } from '../context/AppContext'; // 🌍 استيراد محرك اللغات

export interface CertificateProps {
  studentName: string;
  grade: string;
  teacherName: string;
  schoolName?: string;
  subject?: string;
  date?: string;
}

const CertificateTemplate = forwardRef<HTMLDivElement, CertificateProps>(({
  studentName,
  grade,
  teacherName,
  schoolName,
  subject,
  date
}, ref) => {
  // 🌍 استدعاء دوال الترجمة والاتجاه
  const { t, dir, language } = useApp();

  // معالجة القيم الافتراضية هنا لكي تدعم الترجمة الديناميكية
  const finalSchoolName = schoolName ?? t('defaultSchoolNameAlEbdaa');
  const finalSubject = subject ?? t('defaultSubjectSocialStudies');
  const finalDate = date ?? new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');

  return (
    <div 
      ref={ref}
      className={`w-[1122px] h-[793px] bg-white relative p-6 mx-auto overflow-hidden font-sans [-webkit-print-color-adjust:exact] print:shadow-none shadow-2xl ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
      dir={dir}
    >
      {/* الإطار الخارجي */}
      <div className="w-full h-full border-[12px] border-double border-amber-400 p-2 relative z-10">
        
        {/* الإطار الداخلي */}
        <div className="w-full h-full border-4 border-[#1e3a8a] bg-[#faf9f6] p-8 relative flex flex-col justify-between overflow-hidden">
          
          {/* العلامة المائية الشفافة */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <Award className="w-[600px] h-[600px] text-amber-900" />
          </div>

          {/* ================= الترويسة ================= */}
          <div className="w-full grid grid-cols-3 items-start relative z-10">
            {/* بيانات الوزارة */}
            <div className={`${dir === 'rtl' ? 'text-right' : 'text-left'} space-y-1`}>
              <h3 className="font-black text-[18px] text-[#1e3a8a]">{t('sultanateOfOman')}</h3>
              <h3 className="font-bold text-[16px] text-[#1e3a8a]">{t('ministryOfEducation')}</h3>
              <h3 className="font-bold text-[16px] text-[#1e3a8a]">{t('directorateNorthBatinah')}</h3>
              <h3 className="font-bold text-[16px] text-amber-600">{finalSchoolName}</h3>
            </div>

            {/* الشعار السلطاني */}
            <div className="flex justify-center">
              <img 
                src={require('../assets/pngegg (2).png')} 
                alt="شعار سلطنة عمان" 
                className="w-24 h-24 object-contain"
              />
            </div>

            {/* بيانات الإصدار */}
            <div className={`${dir === 'rtl' ? 'text-left border-r-2 pr-4' : 'text-right border-l-2 pl-4'} space-y-3 border-amber-400 justify-self-end w-full`}>
              <div className={`flex items-center justify-${dir === 'rtl' ? 'end' : 'start'} gap-2`}>
                <span className="font-bold text-[16px] text-gray-500">{t('dateLabel')}</span>
                <span className="font-black text-[18px] text-[#1e3a8a]" dir="ltr">{finalDate}</span>
              </div>
              <div className={`flex items-center justify-${dir === 'rtl' ? 'end' : 'start'} gap-2`}>
                <span className="font-bold text-[16px] text-gray-500">{t('subjectLabel').replace(':', '')}</span>
                <span className="font-black text-[18px] text-[#1e3a8a]">{finalSubject}</span>
              </div>
            </div>
          </div>

          {/* ================= المحتوى الرئيسي ================= */}
          <div className="flex flex-col items-center justify-center text-center w-full z-10 -mt-2">
            
            <h1 className="text-6xl font-black text-[#1e3a8a] mb-5">{t('certificateOfExcellence')}</h1>
            
            <div className="bg-amber-400 text-[#1e3a8a] px-8 py-2 rounded-full font-black text-xl mb-8 shadow-md">
              {t('forKnightsOfMonth')}
            </div>

            <p className="text-xl font-bold text-gray-700 mb-4">
              {t('proudToCrownKnight')}
            </p>

            <div className="relative w-2/3 py-4 border-y-2 border-amber-300 bg-white/50 backdrop-blur-sm shadow-sm mb-5 rounded-2xl">
              <h2 className="text-5xl font-black text-[#1e3a8a] leading-tight">
                {studentName}
              </h2>
            </div>

            <p className="text-xl font-bold text-gray-700 leading-relaxed max-w-3xl">
              {t('enrolledInClass')} <span className="text-amber-600 font-black text-2xl mx-2">({grade})</span>
              {t('knightAppreciationText')}
            </p>
          </div>

          {/* ================= التذييل والأختام ================= */}
          <div className="w-full grid grid-cols-3 items-end relative z-10 pt-2 mt-auto">
            
            {/* توقيع المعلم */}
            {/* استخدام justify-self-start سيجعله في اليمين للغة العربية، وفي اليسار للإنجليزية تلقائياً بفضل الـ CSS Grid + dir */}
            <div className="text-center justify-self-start w-64">
              <h4 className="font-bold text-lg text-[#1e3a8a] mb-4">{t('subjectTeacherLabel')}</h4>
              <div className="border-b-2 border-gray-400 mx-8 mb-2"></div>
              <h3 className="font-black text-lg text-gray-700">{teacherName}</h3>
            </div>

            {/* ختم المدرسة */}
            <div className="flex justify-center translate-y-2">
              <img 
                src={require('../assets/School seal.png')} 
                alt="ختم المدرسة" 
                className="w-32 h-32 object-contain opacity-90 mix-blend-multiply"
              />
            </div>

            {/* توقيع الإدارة */}
            {/* استخدام justify-self-end سيجعله في اليسار للغة العربية، وفي اليمين للإنجليزية تلقائياً */}
            <div className="text-center justify-self-end w-64">
              <h4 className="font-bold text-lg text-[#1e3a8a] mb-4">{t('schoolPrincipalLabel')}</h4>
              <div className="border-b-2 border-gray-400 mx-8 mb-2"></div>
              <h3 className="font-black text-xl text-gray-400 italic">..........................</h3>
            </div>

          </div>

          {/* زينة الزوايا (باقية كما هي لأنها متناظرة الأبعاد) */}
          <div className="absolute top-2 right-2 w-16 h-16 border-t-4 border-r-4 border-[#1e3a8a]"></div>
          <div className="absolute top-2 left-2 w-16 h-16 border-t-4 border-l-4 border-[#1e3a8a]"></div>
          <div className="absolute bottom-2 right-2 w-16 h-16 border-b-4 border-r-4 border-[#1e3a8a]"></div>
          <div className="absolute bottom-2 left-2 w-16 h-16 border-b-4 border-l-4 border-[#1e3a8a]"></div>
        </div>
      </div>
    </div>
  );
});

export default CertificateTemplate;
