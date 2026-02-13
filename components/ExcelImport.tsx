import React, { useState } from 'react';
import { Student } from '../types';
import { FileUp, CheckCircle2, FileSpreadsheet, Loader2, Info, LayoutGrid, Check, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  existingClasses: string[];
  onImport: (students: Student[]) => void;
  onAddClass: (name: string) => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ existingClasses, onImport, onAddClass }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [targetClass, setTargetClass] = useState<string>('');
  const [newClassInput, setNewClassInput] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // ✅ ميزة جديدة: تحميل القالب الجاهز
  const handleDownloadTemplate = () => {
    // 1. تجهيز الأعمدة (الاسم، الهاتف، الجنس)
    const headers = ['اسم الطالب', 'رقم ولي الأمر', 'النوع (ذكر/أنثى)'];
    
    // 2. إضافة صف مثال توضيحي (ليعرف المعلم الصيغة الصحيحة)
    const sampleRow = ['محمد أحمد العماني', '91234567', 'ذكر'];
    const sampleRow2 = ['سارة علي', '99887766', 'أنثى'];

    // 3. إنشاء الملف
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow, sampleRow2]);

    // 4. تنسيق عرض الأعمدة ليكون مريحاً
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }];

    XLSX.utils.book_append_sheet(wb, ws, "قالب_الطلاب");
    XLSX.writeFile(wb, "قالب_ادخال_الطلاب.xlsx");
  };

  const cleanHeader = (header: string): string => {
      if (!header) return '';
      return String(header).trim().replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase();
  };

  const cleanPhoneNumber = (raw: any): string => {
      if (!raw) return '';
      const str = String(raw).trim();
      return str.replace(/[^0-9+]/g, '');
  };

  const looksLikeAPhoneNumber = (val: string): boolean => {
      const clean = cleanPhoneNumber(val);
      return /^\+?\d{7,15}$/.test(clean);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const finalTargetClass = isCreatingNew ? newClassInput.trim() : targetClass;
    if (!finalTargetClass) {
        alert('الرجاء اختيار فصل أو كتابة اسم فصل جديد قبل استيراد الملف');
        if (e.target) e.target.value = '';
        return;
    }
    
    setIsImporting(true);
    setImportStatus('idle');

    setTimeout(async () => {
        try {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false }) as any[];

          if (jsonData.length === 0) throw new Error('الملف فارغ');

          if (isCreatingNew && finalTargetClass) {
              onAddClass(finalTargetClass);
          }

          const headers = Object.keys(jsonData[0]);
          
          const nameKeywords = ['الاسم', 'اسم الطالب', 'اسم', 'name', 'student', 'full name', 'المتعلم'];
          const phoneKeywords = ['جوال', 'هاتف', 'phone', 'mobile', 'contact', ' تواصل', 'ولي امر','ولي أمر', 'parent', 'رقم', 'cell'];
          const genderKeywords = ['النوع', 'الجنس', 'gender', 'sex', 'type'];

          let nameKey = headers.find(h => nameKeywords.some(kw => cleanHeader(h).includes(kw)));
          let phoneKey = headers.find(h => phoneKeywords.some(kw => cleanHeader(h).includes(kw)));
          let genderKey = headers.find(h => genderKeywords.some(kw => cleanHeader(h).includes(kw)));

          if (!nameKey) nameKey = headers[0];

          // محاولة استنتاج عمود الهاتف إذا لم يوجد اسم صريح
          if (!phoneKey) {
              for (const header of headers) {
                  if (header === nameKey) continue;
                  let matchCount = 0;
                  let checkLimit = Math.min(jsonData.length, 10);
                  for (let i = 0; i < checkLimit; i++) {
                      if (looksLikeAPhoneNumber(jsonData[i][header])) matchCount++;
                  }
                  if (matchCount >= checkLimit * 0.3) {
                      phoneKey = header;
                      break;
                  }
              }
          }

          const mappedStudents: Student[] = jsonData
            .map((row, idx): Student | null => {
              const studentName = String(row[nameKey!] || '').trim();
              
              // تجاهل صفوف الأمثلة إذا قام المعلم برفع القالب كما هو
              if (studentName.includes('مثال:') || studentName === 'يكتب اسم الطالب ' || studentName === 'يكتب اسم الطالبه') return null;

              let parentPhone = '';
              if (phoneKey) parentPhone = cleanPhoneNumber(row[phoneKey]);
              if (!studentName || nameKeywords.includes(cleanHeader(studentName))) return null;

              // معالجة الجنس
              let gender: 'male' | 'female' = 'male'; // افتراضي
              if (genderKey && row[genderKey]) {
                  const val = String(row[genderKey]).toLowerCase().trim();
                  if (val.includes('انثى') || val.includes('أنثى') || val.includes('بنت') || val === 'f' || val === 'female') {
                      gender = 'female';
                  }
              }

              return {
                id: Math.random().toString(36).substr(2, 9),
                name: studentName,
                grade: '', // الصف يتم تحديده من القائمة المختارة وليس من الملف
                classes: [finalTargetClass],
                attendance: [],
                behaviors: [],
                grades: [],
                parentPhone: parentPhone,
                gender: gender 
              };
            })
            .filter((student): student is Student => student !== null);

          if (mappedStudents.length === 0) {
            alert('لم يتم العثور على بيانات صالحة. تأكد من صحة الملف.');
            setImportStatus('error');
            return;
          }

          onImport(mappedStudents);
          setImportStatus('success');
          setTimeout(() => setImportStatus('idle'), 3000);
          setNewClassInput('');
          setTargetClass('');
        } catch (error) {
          console.error(error);
          setImportStatus('error');
          alert('حدث خطأ أثناء قراءة الملف. تأكد من أن الملف سليم.');
        } finally {
          setIsImporting(false);
          if (e.target) e.target.value = '';
        }
    }, 100);
  };

  return (
    <div className="space-y-4 text-slate-900">
      
      {/* 1. زر تحميل القالب (الميزة الجديدة) */}
      <button 
        onClick={handleDownloadTemplate}
        className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors shadow-sm mb-2"
      >
        <Download size={16} /> تحميل ملف إكسل فارغ (جاهز للتعبئة)
      </button>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-indigo-500" />
                توزيع الطلاب على فصل
            </h3>
            <button 
                onClick={() => {
                    setIsCreatingNew(!isCreatingNew);
                    setTargetClass('');
                    setNewClassInput('');
                }}
                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full active:scale-95 transition-all hover:bg-indigo-100"
            >
                {isCreatingNew ? 'اختر من القائمة' : 'فصل جديد +'}
            </button>
        </div>

        {isCreatingNew ? (
            <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                <input 
                  type="text" 
                  placeholder="اكتب اسم الفصل الجديد (مثال: 4/ب)" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:border-indigo-500 outline-none text-slate-900 placeholder:text-gray-400"
                  value={newClassInput}
                  onChange={(e) => setNewClassInput(e.target.value)}
                  autoFocus
                />
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                {existingClasses.length > 0 ? existingClasses.map(cls => (
                    <button
                        key={cls}
                        onClick={() => setTargetClass(cls)}
                        className={`p-3 rounded-xl text-[10px] font-black transition-all border flex items-center justify-between ${targetClass === cls ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                        {cls}
                        {targetClass === cls && <Check className="w-3 h-3" />}
                    </button>
                )) : <p className="col-span-2 text-center text-[10px] text-gray-400 py-4">لا توجد فصول حالياً، قم بإنشاء فصل جديد.</p>}
            </div>
        )}
      </div>

      <div className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center text-center shadow-sm relative overflow-hidden transition-all bg-white ${ (isCreatingNew ? newClassInput : targetClass) ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'}`}>
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl shadow-sm flex items-center justify-center mb-3 relative z-10 border border-indigo-100">
          {isImporting ? <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /> : <FileSpreadsheet className="w-6 h-6 text-indigo-500" />}
        </div>
        
        <h3 className="text-sm font-black mb-1 text-slate-900 relative z-10">
            {isImporting ? 'جاري المعالجة...' : 'ارفع ملف الإكسل'}
        </h3>
        <p className="text-[10px] text-slate-500 mb-4 px-4 relative z-10 font-bold">
            {(isCreatingNew ? newClassInput : targetClass) 
                ? `سيتم استيراد الطلاب إلى فصل: ${isCreatingNew ? newClassInput : targetClass}`
                : 'يجب اختيار الفصل أولاً لتفعيل الزر'}
        </p>
        
        <label className={`w-full max-w-[200px] relative z-10 ${!(isCreatingNew ? newClassInput : targetClass) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            onChange={handleFileChange} 
            disabled={isImporting || !(isCreatingNew ? newClassInput : targetClass)} 
          />
          <div className={`w-full py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${isImporting || !(isCreatingNew ? newClassInput : targetClass) ? 'bg-slate-100 text-gray-400 shadow-none border border-slate-200' : 'bg-indigo-600 text-white shadow-indigo-200 active:scale-95'}`}>
            <FileUp className="w-4 h-4" /> اختر الملف الآن
          </div>
        </label>
      </div>

      {importStatus === 'success' && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 border border-emerald-200">
          <div className="bg-emerald-500 text-white p-1 rounded-full shadow-sm">
            <CheckCircle2 className="w-3 h-3" />
          </div>
          <div>
            <span className="text-[10px] font-black block leading-none">تم الاستيراد بنجاح!</span>
          </div>
        </div>
      )}

      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex gap-2 items-start">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[9px] text-amber-800 font-bold leading-relaxed text-right">
                  <p>لأفضل النتائج، استخدم القالب الجاهز أعلاه (يحتوي على الاسم ورقم الهاتف فقط).</p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ExcelImport;
