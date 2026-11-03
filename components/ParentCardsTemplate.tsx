import React from 'react';
import { School, Key, Info, Smartphone, User } from 'lucide-react'; // 🔑 تم استبدال Fingerprint بـ Key
import { useApp } from '../context/AppContext';

interface ParentCardsTemplateProps {
  students: any[];
  schoolName?: string;
  teacherName?: string;
  selectedClass: string;
}

const ParentCardsTemplate: React.FC<ParentCardsTemplateProps> = ({ students, schoolName, teacherName, selectedClass }) => {
  const { t, dir } = useApp();

  const targetStudents = selectedClass === 'all'
    ? students
    : students.filter((s: any) => s.classes && s.classes.includes(selectedClass));

  const normalizeCode = (value: unknown) => String(value ?? '').trim();
  const getLegacyCode = (student: any) =>
    normalizeCode(student?.rasedId) ||
    normalizeCode(student?.secretCode) ||
    normalizeCode(student?.parentCode) ||
    '-';
  const getUnifiedCode = (student: any) =>
    normalizeCode(student?.centralRasedId) ||
    normalizeCode(student?.CentralRasedID) ||
    '';
  // تُعرض البطاقة إذا توفر الكود السابق أو الكود الموحد، دون إنشاء أي كود محلياً.
  const validStudents = targetStudents.filter((student: any) =>
    getLegacyCode(student) !== '-' || getUnifiedCode(student) !== ''
  );

  if (validStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center" dir={dir}>
        <Info className="w-16 h-16 text-amber-500 mb-4 opacity-50" />
        <h2 className="text-xl font-black text-slate-800 mb-2">{t('cannotGenerateCards')}</h2>
        {/* 🔑 تعديل النص التوضيحي ليتناسب مع "الكود السري" */}
        <p className="text-slate-500 font-bold">لا يوجد طلاب يمتلكون أكواد سرية في هذا الفصل</p>
      </div>
    );
  }

  const qrCodeImageUrl = "assets/qr-code.png"; 

  return (
    <div className={`w-full bg-white p-8 font-sans text-black print:p-0 ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      <div className="mb-6 text-center border-b-2 border-black pb-4 print:mb-6">
        <h1 className="text-2xl font-black">{t('parentLoginCardsTitle')}</h1>
        <p className="text-slate-600 font-bold mt-1">{t('parentCardsSubtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-x-[4%] gap-y-6 justify-start print:gap-y-8" style={{ pageBreakInside: 'auto' }}>
        
        {validStudents.map((student: any) => (
          <div key={student.id} className="w-[48%] border-2 border-dashed border-gray-400 p-1.5 rounded-[1.5rem]" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            
            <div className="bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] rounded-2xl p-4 text-white flex h-[210px] relative overflow-hidden shadow-md gap-3">
              
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 pointer-events-none print:hidden"></div>
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-amber-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 pointer-events-none print:hidden"></div>

              {/* ================= القسم الأيمن (بيانات الطالب) ================= */}
              <div className={`flex-1 flex flex-col justify-between z-10 border-white/10 gap-1 ${dir === 'rtl' ? 'border-l pl-3' : 'border-r pr-3'}`}>
                {/* الترويسة العلوية للمدرسة */}
                <div className="flex items-start gap-2 border-b border-white/20 pb-2 mb-1 shrink-0">
                  <div className="bg-white/10 p-1 rounded-lg backdrop-blur-sm border border-white/10 shrink-0">
                    <School className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-[10px] leading-normal">{schoolName || t('defaultSchoolName')}</h3>
                    <p className="text-[8px] text-blue-200 font-bold mt-0.5">{t('rasedParentsPortal')}</p>
                  </div>
                </div>

                {/* بيانات الطالب */}
                <div className="flex-1 flex flex-col justify-center py-1 gap-1">
                  <h2 className="font-black text-[12px] text-amber-400 mb-1 leading-normal break-words">
                    {student.name}
                  </h2>
                  <div className="self-start bg-white/10 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white border border-white/10">
                    {t('classLabel')} {student.classes[0] || t('undefinedClass')}
                  </div>
                </div>

                {/* الكود السابق خلال المرحلة الانتقالية */}
                <div className="bg-white rounded-xl p-1.5 flex items-center justify-between shadow-inner border border-amber-200 shrink-0 mt-1">
                  <div className="flex items-center gap-1">
                    <div className="bg-amber-50 p-1 rounded-md shrink-0">
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                    </div>
                    <span className="text-[8px] font-black text-amber-700">الكود السابق</span>
                  </div>
                  <span className="font-mono font-black text-[11px] text-amber-900 tracking-wider bg-amber-50 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap" dir="ltr">
                    {getLegacyCode(student)}
                  </span>
                </div>
                {/* الكود الموحد الصادر من خدمة الهوية المركزية */}
                <div className="bg-emerald-50 rounded-xl p-1.5 flex items-center justify-between shadow-inner border border-emerald-300 shrink-0 mb-1">
                  <span className="text-[8px] font-black text-emerald-700">الكود الموحد</span>
                  <span className="font-mono font-black text-[12px] text-emerald-900 tracking-wider bg-white px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap" dir="ltr">
                    {getUnifiedCode(student) || 'قيد الإصدار'}
                  </span>
                </div>

                {/* اسم المعلم */}
                {teacherName && (
                  <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-white/10 shrink-0">
                    <User className="w-3.5 h-3.5 text-blue-200/80" />
                    <span className="text-[8px] text-blue-200/80 font-bold">{t('teacherLabel')} {teacherName}</span>
                  </div>
                )}
              </div>

              {/* ================= القسم الأيسر (الباركود والتوجيهات) ================= */}
              <div className="w-[85px] flex flex-col items-center justify-center z-10 shrink-0">
                <div className="bg-white p-1 rounded-xl mb-2 shadow-lg">
                  <img src={qrCodeImageUrl} alt="QR Code" className="w-16 h-16 object-contain" />
                </div>
                <div className="text-center flex flex-col items-center gap-1">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <p className="text-[8px] font-bold text-blue-100 leading-tight">
                    {t('scanQrCodeLine1')} <br/>
                    {t('scanQrCodeLine2')}
                  </p>
                  <p className="text-[7px] font-bold text-amber-400/80 mt-1" dir="ltr" style={{fontSize: '5px', wordBreak: 'break-all', textAlign: 'center'}}>
                    alzaabi555.github.io/Rased-Parents-website
                  </p>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParentCardsTemplate;
