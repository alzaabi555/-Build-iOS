import React, { useState } from 'react';
import { Student } from '../types';
import { FileUp, CheckCircle2, FileSpreadsheet, Loader2, AlertCircle, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  onImport: (students: Student[]) => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ onImport }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newClassName, setNewClassName] = useState('');

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

      if (jsonData.length === 0) throw new Error('الملف فارغ');

      const mappedStudents: Student[] = jsonData.map((row, idx) => {
        const rowKeys = Object.keys(row);
        const nameKey = rowKeys.find(k => {
          const val = k.trim();
          return ['الاسم', 'اسم الطالب', 'اسم', 'Name', 'Student Name', 'Full Name', 'المتعلم', 'اسم المتعلم'].includes(val);
        });
        
        const gradeKey = rowKeys.find(k => 
          ['الصف', 'صف', 'Grade', 'Level', 'المرحلة'].includes(k.trim())
        );
        
        const classKey = rowKeys.find(k => 
          ['الفصل', 'فصل', 'الشعبة', 'Class', 'Section', 'شعبة'].includes(k.trim())
        );

        return {
          id: Math.random().toString(36).substr(2, 9),
          name: row[nameKey || ''] || row[rowKeys[0]] || `طالب ${idx + 1}`,
          grade: String(row[gradeKey || ''] || ''),
          classes: row[classKey || ''] ? [String(row[classKey || ''])] : (newClassName ? [newClassName] : []),
          attendance: [],
          behaviors: []
        };
      });

      onImport(mappedStudents);
      setImportStatus('success');
      setTimeout(() => setImportStatus('idle'), 3000);
      setNewClassName('');
    } catch (error) {
      console.error(error);
      setImportStatus('error');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-xs font-black text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-500" />
            إضافة فصل جديد (اختياري)
        </h3>
        <input 
          type="text" 
          placeholder="اسم الفصل (مثلاً: 1/أ)" 
          className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
        />
        <p className="text-[9px] text-gray-400 font-medium leading-relaxed px-1">سيتم تعيين هذا الفصل تلقائياً لجميع الطلاب المستوردين إذا كان ملف الإكسل لا يحتوي على عمود للفصل.</p>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-blue-100 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 relative z-10">
          {isImporting ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin" /> : <FileSpreadsheet className="w-6 h-6 text-blue-600" />}
        </div>
        <h3 className="text-sm font-black mb-1 text-gray-900 relative z-10">استيراد من إكسل</h3>
        <p className="text-[10px] text-gray-400 mb-6 px-4 relative z-10">تأكد من وجود عمود باسم "الاسم"</p>
        
        <label className="w-full max-w-[180px] relative z-10">
          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileChange} disabled={isImporting} />
          <div className={`w-full py-3.5 rounded-2xl font-black text-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 ${isImporting ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}>
            <FileUp className="w-4 h-4" /> اختيار ملف
          </div>
        </label>
      </div>

      {importStatus === 'success' && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-black">تم استيراد الطلاب بنجاح!</span>
        </div>
      )}

      {importStatus === 'error' && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-black">حدث خطأ، تأكد من صحة الملف.</span>
        </div>
      )}
    </div>
  );
};

export default ExcelImport;