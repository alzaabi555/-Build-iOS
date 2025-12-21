
import React, { useState } from 'react';
import { Student } from '../types';
import { FileUp, CheckCircle2, FileSpreadsheet, ListChecks, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  onImport: (students: Student[]) => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ onImport }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportStatus('idle');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error('الملف فارغ أو غير صالح');
      }

      const importedStudents: Student[] = jsonData.map((row, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: row['الاسم'] || row['اسم الطالب'] || row['Name'] || `طالب ${index + 1}`,
        grade: String(row['الصف'] || row['Grade'] || ''),
        classes: row['الفصل'] || row['Class'] ? [String(row['الفصل'] || row['Class'])] : [],
        attendance: [],
        behaviors: []
      }));

      onImport(importedStudents);
      setImportStatus('success');
      setTimeout(() => setImportStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Import error:', error);
      setImportStatus('error');
      setErrorMessage(error.message || 'حدث خطأ أثناء قراءة الملف');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-b from-white to-blue-50/30 p-10 rounded-[3rem] border-2 border-dashed border-blue-100 flex flex-col items-center text-center relative overflow-hidden group">
        <div className="w-24 h-24 bg-blue-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-lg shadow-blue-50 group-hover:scale-110 transition-transform duration-500">
          {isImporting ? <Loader2 className="w-12 h-12 text-blue-600 animate-spin" /> : <FileSpreadsheet className="w-12 h-12 text-blue-600" />}
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 mb-3">استيراد البيانات الذكي</h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-[250px]">
          ارفع ملف Excel يحتوي على أعمدة "الاسم"، "الصف"، و "الفصل".
        </p>
        
        <label className="w-full relative z-10">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            onChange={handleFileChange}
            disabled={isImporting}
          />
          <div className={`w-full py-5 rounded-[1.5rem] font-black shadow-xl cursor-pointer transition-all flex items-center justify-center gap-3 active:scale-95 ${
            isImporting ? 'bg-gray-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
          }`}>
            {isImporting ? 'جاري التحليل...' : (
              <>
                <FileUp className="w-5 h-5" />
                <span>اختر ملف Excel</span>
              </>
            )}
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 flex gap-4">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
            <ListChecks className="text-orange-500 w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm mb-1">تنسيق الأعمدة الموصى به</h4>
            <p className="text-[10px] text-gray-400 font-medium">الاسم، الصف، الفصل</p>
          </div>
        </div>
      </div>

      {importStatus === 'success' && (
          <div className="fixed top-24 left-6 right-6 bg-emerald-600 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-10 z-[100]">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <p className="font-black text-sm">تم الاستيراد بنجاح!</p>
              </div>
          </div>
      )}

      {importStatus === 'error' && (
          <div className="fixed top-24 left-6 right-6 bg-rose-600 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-10 z-[100]">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-black text-sm">فشل الاستيراد</p>
                <p className="text-[10px] opacity-80">{errorMessage}</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default ExcelImport;
