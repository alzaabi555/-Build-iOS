import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Upload, Info, FileSpreadsheet, LayoutGrid, Plus, Check, X, AlertCircle } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext'; // 🌍 استدعاء محرك اللغات

interface ExcelImportProps {
  onImport: (students: any[]) => void;
  existingClasses: string[];
  onAddClass: (className: string) => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ onImport, existingClasses, onAddClass }) => {
  // 🌍 دوال الترجمة والاتجاه
  const { t, dir, language } = useApp();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [classError, setClassError] = useState('');
  const [locallyAddedClasses, setLocallyAddedClasses] = useState<string[]>([]);

  const normalizedClassKey = (value: string) =>
    String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase(language === 'ar' ? 'ar' : undefined);

  const availableClasses = Array.from(new Map(
    [...(Array.isArray(existingClasses) ? existingClasses : []), ...locallyAddedClasses]
      .filter(Boolean)
      .map(className => [normalizedClassKey(className), className.trim()])
  ).values());

  const handleAddClass = () => {
    const className = newClassName.trim().replace(/\s+/g, ' ');
    if (!className) {
      setClassError(language === 'ar' ? 'اكتب اسم الفصل أولًا.' : 'Enter the class name first.');
      return;
    }
    const existingClass = availableClasses.find(item => normalizedClassKey(item) === normalizedClassKey(className));
    if (existingClass) {
      setSelectedClass(existingClass);
      setClassError(language === 'ar' ? 'هذا الفصل موجود مسبقًا وتم تحديده.' : 'This class already exists and has been selected.');
      return;
    }
    onAddClass(className);
    setLocallyAddedClasses(previous => [...previous, className]);
    setSelectedClass(className);
    setNewClassName('');
    setClassError('');
    setIsAddingClass(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const wsData = [
        ['الرقم المدني (Civil ID)', 'اسم الطالب (Student Name)', 'رقم هاتف ولي الأمر (Parent Phone)', 'النوع (Gender: male/female)'],
        ['123456789', 'أحمد محمد', '98765432', 'male'],
        ['987654321', 'فاطمة علي', '91234567', 'female']
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 20 }];
      
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      const fileName = `Rased_Students_Template.xlsx`;

      if (Capacitor.isNativePlatform()) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const result = await Filesystem.writeFile({ path: fileName, data: wbout, directory: Directory.Cache });
        await Share.share({ title: 'قالب الطلاب', url: result.uri });
      } else {
        XLSX.writeFile(wb, fileName);
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في تحميل القالب');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedClass) {
        alert(t('alertSelectClassExcel'));
        return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length <= 1) {
          alert(t('alertNoValidDataExcel'));
          return;
      }

      const headers = jsonData[0].map(h => String(h).toLowerCase());
      const nameIndex = headers.findIndex(h => h.includes('اسم') || h.includes('name'));
      const civilIdIndex = headers.findIndex(h => h.includes('مدني') || h.includes('civil') || h.includes('id'));
      const phoneIndex = headers.findIndex(h => h.includes('هاتف') || h.includes('رقم') || h.includes('phone'));
      const genderIndex = headers.findIndex(h => h.includes('نوع') || h.includes('جنس') || h.includes('gender'));

      if (nameIndex === -1) {
          alert(t('alertNoValidDataExcel'));
          return;
      }

      const importedStudents = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0 || !row[nameIndex]) continue;

        const name = String(row[nameIndex]).trim();
        if (!name) continue;

        const civilID = civilIdIndex !== -1 && row[civilIdIndex] ? String(row[civilIdIndex]).trim() : '';
        const phone = phoneIndex !== -1 && row[phoneIndex] ? String(row[phoneIndex]).trim() : '';
        
        let gender: 'male' | 'female' = 'male'; 
        if (genderIndex !== -1 && row[genderIndex]) {
            const gStr = String(row[genderIndex]).toLowerCase().trim();
            if (gStr === 'female' || gStr === 'أنثى' || gStr === 'بنت' || gStr === 'انثى') {
                gender = 'female';
            }
        }

        importedStudents.push({
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          classes: [selectedClass],
          parentCode: civilID,
          parentPhone: phone,
          gender: gender,
          attendance: [],
          behaviors: [],
          grades: [],
          grade: ''
        });
      }

      if (importedStudents.length > 0) {
          onImport(importedStudents);
      } else {
          alert(t('alertNoValidDataExcel'));
      }

    } catch (error) {
      console.error(error);
      alert('خطأ في قراءة الملف');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`p-4 md:p-6 flex flex-col gap-5 w-full h-full overflow-y-auto custom-scrollbar bg-bgMain text-textPrimary ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      <section className="rounded-3xl border border-borderColor bg-bgCard p-4 md:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-success/10 text-success border border-success/20 flex items-center justify-center shrink-0"><FileSpreadsheet className="w-5 h-5" /></div>
          <div className="min-w-0"><h2 className="font-black text-base md:text-lg text-textPrimary">{t('importFromExcelMenu')}</h2><p className="text-xs font-bold leading-6 text-textSecondary mt-1">{t('excelTipBestResults')}</p></div>
        </div>
        <button type="button" onClick={handleDownloadTemplate} className="w-full py-3.5 rounded-2xl font-black text-sm flex justify-center items-center gap-3 transition-colors shadow-sm border bg-success/10 hover:bg-success/20 text-success border-success/20"><Download className="w-5 h-5" />{t('downloadExcelTemplateWithCivilId')}</button>
      </section>

      <section className="p-4 md:p-5 rounded-3xl border border-borderColor bg-bgCard shadow-sm">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <div><h3 className="font-black flex items-center gap-2 text-textPrimary"><LayoutGrid className="w-5 h-5 text-primary" />{t('assignStudentsToClass')}</h3><p className="text-[11px] font-bold text-textSecondary mt-1">{language === 'ar' ? 'اختر الفصل أولًا، أو أضف فصلًا جديدًا ثم تابع استيراد ملف Excel.' : 'Select a class, or add a new class, then import the Excel file.'}</p></div>
          <button type="button" onClick={() => { setIsAddingClass(previous => !previous); setClassError(''); setNewClassName(''); }} className="text-xs font-black px-3 py-2.5 rounded-xl transition-colors text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 flex items-center justify-center gap-1.5 shrink-0">{isAddingClass ? <X size={15} /> : <Plus size={15} />}{isAddingClass ? (language === 'ar' ? 'إلغاء الإضافة' : 'Cancel') : t('newClassBtnPlus')}</button>
        </div>
        {isAddingClass && (
          <div className="mb-4 p-3 md:p-4 rounded-2xl border border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2">
            <label className="block text-[11px] font-black text-textSecondary mb-2">{language === 'ar' ? 'اسم الفصل الجديد' : 'New class name'}</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={newClassName} onChange={event => { setNewClassName(event.target.value); if (classError) setClassError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleAddClass(); } }} autoFocus placeholder={t('classNameExample')} className="flex-1 min-w-0 h-12 rounded-xl border border-borderColor bg-bgCard px-4 text-sm font-black text-textPrimary placeholder:text-textSecondary outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              <button type="button" onClick={handleAddClass} disabled={!newClassName.trim()} className="h-12 px-5 rounded-xl bg-primary text-white text-xs font-black shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"><Check size={16} />{language === 'ar' ? 'إضافة وتحديد الفصل' : 'Add and select'}</button>
            </div>
            {classError && <div className="mt-2 flex items-start gap-2 text-[11px] font-bold text-warning"><AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{classError}</span></div>}
          </div>
        )}
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
          {availableClasses.map(cls => <button type="button" key={cls} onClick={() => setSelectedClass(cls)} className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${selectedClass === cls ? 'border-primary bg-primary text-white shadow-sm' : 'border-borderColor bg-bgSoft text-textSecondary hover:border-primary/30 hover:text-textPrimary'}`}>{cls}</button>)}
          {availableClasses.length === 0 && !isAddingClass && <div className="w-full rounded-2xl border border-dashed border-borderColor bg-bgSoft p-4 text-center"><p className="text-xs font-bold text-textSecondary">{language === 'ar' ? 'لا توجد فصول. اضغط «إضافة فصل جديد» للبدء.' : 'No classes yet. Select Add New Class to begin.'}</p></div>}
        </div>
      </section>

      <section className={`border-2 border-dashed rounded-3xl p-6 md:p-8 text-center transition-all flex flex-col items-center justify-center min-h-[250px] ${selectedClass ? 'border-primary/30 bg-primary/5' : 'border-borderColor bg-bgSoft opacity-75'}`}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-sm bg-bgCard text-primary border-primary/20"><Upload className="w-8 h-8" /></div>
        <h3 className="font-black text-lg mb-2 text-textPrimary">{t('uploadExcelFileTitle')}</h3>
        <p className="text-xs font-bold mb-6 text-textSecondary">{!selectedClass ? t('mustSelectClassFirst') : (language === 'ar' ? `سيتم استيراد الطلاب إلى الفصل: ${selectedClass}` : `Students will be imported to: ${selectedClass}`)}</p>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" disabled={!selectedClass} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!selectedClass} className="px-8 py-3.5 rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto mx-auto disabled:opacity-50 disabled:scale-100 bg-primary hover:bg-primary/80 text-white"><Upload className="w-4 h-4" />{t('chooseFileNow')}</button>
      </section>

      <div className="border rounded-2xl p-4 flex items-start gap-3 mt-auto shrink-0 bg-warning/10 border-warning/20"><Info className="w-5 h-5 shrink-0 mt-0.5 text-warning" /><p className="text-xs font-bold leading-relaxed text-textPrimary">{t('excelTipBestResults')}</p></div>
    </div>
  );
};
export default ExcelImport;
