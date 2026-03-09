import React from 'react';
import { QrCode, School, Fingerprint, Info } from 'lucide-react';

interface ParentCardsTemplateProps {
  students: any[];
  schoolName?: string;
  teacherName?: string;
  selectedClass: string;
}

const ParentCardsTemplate: React.FC<ParentCardsTemplateProps> = ({ students, schoolName, teacherName, selectedClass }) => {
  // 1. تصفية الطلاب حسب الفصل
  const targetStudents = selectedClass === 'all'
    ? students
    : students.filter((s: any) => s.classes && s.classes.includes(selectedClass));

  // 2. استبعاد الطلاب الذين لا يملكون رقماً مدنياً
  const validStudents = targetStudents.filter((s: any) => s.parentCode && s.parentCode.trim() !== '');

  if (validStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <Info className="w-16 h-16 text-amber-500 mb-4 opacity-50" />
        <h2 className="text-xl font-black text-slate-800 mb-2">لا يمكن توليد البطاقات</h2>
        <p className="text-slate-500 font-bold">لا يوجد طلاب في هذا الفصل لديهم (رقم مدني) مسجل.</p>
        <p className="text-sm text-amber-600 mt-2">يرجى الذهاب لقائمة الطلاب وتحديث بياناتهم بإضافة الرقم المدني أولاً.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-8 font-sans text-black" dir="rtl">
      <div className="mb-6 text-center border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black">بطاقات الدخول لولي الأمر (بواسطة الرقم المدني)</h1>
        <p className="text-slate-600 font-bold mt-1">قص هذه البطاقات ووزعها على الطلاب لتسليمها لأولياء أمورهم</p>
      </div>

      {/* شبكة البطاقات - 2 في كل صف (بحجم مصغر ومثالي للطباعة A4) */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-6" style={{ pageBreakInside: 'auto' }}>
        {validStudents.map((student: any) => (
          <div key={student.id} className="border-2 border-dashed border-gray-400 p-1.5 rounded-[1.5rem]" style={{ pageBreakInside: 'avoid' }}>
            {/* تم تصغير الارتفاع إلى h-44 (حوالي 176 بكسل) */}
            <div className="bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] rounded-2xl p-4 text-white flex flex-col h-44 relative overflow-hidden shadow-md">
              
              {/* زينة الخلفية */}
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20"></div>
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-amber-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20"></div>

              {/* الترويسة العلوية للمدرسة */}
              <div className="flex justify-between items-start relative z-10 border-b border-white/20 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                    <School className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs tracking-wide truncate max-w-[120px]">{schoolName || 'مدرسة الإبداع'}</h3>
                    <p className="text-[9px] text-blue-200 font-bold mt-0.5">بوابة "راصد" للآباء</p>
                  </div>
                </div>
                <QrCode className="w-8 h-8 text-white opacity-90" />
              </div>

              {/* بيانات الطالب */}
              <div className="relative z-10 mb-auto">
                <h2 className="font-black text-sm text-amber-400 mb-1 truncate leading-none">{student.name}</h2>
                <span className="inline-block bg-white/10 px-2 py-0.5 rounded-md text-[9px] font-bold text-white border border-white/10">
                  الصف: {student.classes[0] || 'غير محدد'}
                </span>
              </div>

              {/* الرقم المدني - قسم بارز */}
              <div className="bg-white rounded-xl p-2.5 flex items-center justify-between relative z-10 shadow-inner mt-2 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <div className="bg-blue-50 p-1 rounded-md">
                    <Fingerprint className="w-4 h-4 text-[#1e3a8a]" />
                  </div>
                  <span className="text-[10px] font-black text-slate-600">الرقم المدني:</span>
                </div>
                <span className="font-mono font-black text-base text-[#1e3a8a] tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                  {student.parentCode}
                </span>
              </div>

              {/* اسم المعلم كإمضاء */}
              {teacherName && (
                <div className="absolute bottom-1 left-3 z-10">
                  <span className="text-[7px] text-blue-200/50 font-bold">المعلم: {teacherName}</span>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParentCardsTemplate;
