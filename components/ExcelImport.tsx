import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Upload, Info, FileSpreadsheet, LayoutGrid } from 'lucide-react';
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

  // 🌍 تطبيق الاتجاه على الحاوية
  return (
    <div className={`p-6 bg-slate-50 flex flex-col gap-6 ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
        
        <button 
            onClick={handleDownloadTemplate}
            className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-200 py-4 rounded-2xl font-black text-sm flex justify-center items-center gap-3 transition-colors shadow-sm"
        >
            <Download className="w-5 h-5" />
            {t('downloadExcelTemplateWithCivilId')}
        </button>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-indigo-500" />
                    {t('assignStudentsToClass')}
                </h3>
                <button 
                    onClick={() => {
                        const newClass = prompt(t('classNameExample'));
                        if (newClass && newClass.trim()) {
                            onAddClass(newClass.trim());
                            setSelectedClass(newClass.trim());
                        }
                    }}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                    {t('newClassBtnPlus')}
                </button>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                {existingClasses.map(cls => (
                    <button
                        key={cls}
                        onClick={() => setSelectedClass(cls)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                            selectedClass === cls 
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm scale-105' 
                            : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-200'
                        }`}
                    >
                        {cls}
                    </button>
                ))}
                {existingClasses.length === 0 && (
                    <p className="text-xs text-slate-400 font-bold p-2">{t('alertSelectClassExcel')}</p>
                )}
            </div>
        </div>

        <div className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition-all ${selectedClass ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300 bg-slate-50 opacity-60'}`}>
            <div className="w-16 h-16 bg-indigo-100 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="font-black text-lg text-slate-800 mb-2">{t('uploadExcelFileTitle')}</h3>
            <p className="text-xs font-bold text-slate-500 mb-6">
                {!selectedClass ? t('mustSelectClassFirst') : `سيتم استيراد الطلاب إلى صف: ${selectedClass}`}
            </p>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
                disabled={!selectedClass}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedClass}
                className="bg-indigo-600 disabled:bg-slate-400 text-white px-8 py-3.5 rounded-xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2 mx-auto"
            >
                <Upload className="w-4 h-4" />
                {t('chooseFileNow')}
            </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-800 leading-relaxed">
                {t('excelTipBestResults')}
            </p>
        </div>

    </div>
  );
};

export default ExcelImport;
