
import React, { useState } from 'react';
import { Student, AttendanceStatus } from '../types';
import { Check, X, Clock, Calendar, Filter, MessageCircle, ChevronDown, CheckCircle2, RotateCcw, Search, Printer, Loader2, CalendarRange } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { motion } from 'framer-motion';
import Modal from './Modal';
import { useTheme } from '../context/ThemeContext';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

declare var html2pdf: any;

interface AttendanceTrackerProps {
  students: Student[];
  classes: string[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ students, classes, setStudents }) => {
  const { theme, isLowPower } = useTheme();
  const today = new Date().toLocaleDateString('en-CA'); 
  const [selectedDate, setSelectedDate] = useState(today);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [notificationTarget, setNotificationTarget] = useState<{student: Student, type: 'absent' | 'late'} | null>(null);

  const styles = {
      header: isLowPower 
        ? 'bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-gray-800'
        : 'bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 shadow-sm',
      card: isLowPower
        ? 'bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl mb-2'
        : 'bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md dark:hover:bg-white/10',
      search: 'bg-white dark:bg-white/5 rounded-xl border border-gray-300 dark:border-white/10',
      select: 'bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/30 rounded-full',
      btnGroup: 'bg-slate-50 dark:bg-black/10 rounded-xl border border-gray-100 dark:border-white/5 p-1.5',
      statusBtn: 'rounded-lg',
  };

  const formatDateDisplay = (dateString: string) => {
      const d = new Date(dateString);
      return d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const toggleAttendance = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const filtered = s.attendance.filter(a => a.date !== selectedDate);
      const currentStatus = s.attendance.find(a => a.date === selectedDate)?.status;
      
      if (currentStatus === status) {
          return { ...s, attendance: filtered };
      }
      return {
        ...s,
        attendance: [...filtered, { date: selectedDate, status }]
      };
    }));
  };

  const handleMarkAll = (status: AttendanceStatus | 'reset') => {
      if (classFilter === 'all' && students.length > 50) {
          if (!confirm(`سيتم تطبيق هذا الإجراء على جميع الطلاب (${students.length}). هل أنت متأكد؟`)) return;
      }
      
      setStudents(prev => prev.map(s => {
          if (classFilter !== 'all' && (!s.classes || !s.classes.includes(classFilter))) {
              return s;
          }
          const filtered = s.attendance.filter(a => a.date !== selectedDate);
          if (status === 'reset') return { ...s, attendance: filtered };
          return { ...s, attendance: [...filtered, { date: selectedDate, status }] };
      }));
  };

  const handleNotifyParent = (student: Student, type: 'absent' | 'late') => {
    if (!student.parentPhone) {
      alert('رقم ولي الأمر غير متوفر لهذا الطالب');
      return;
    }
    setNotificationTarget({ student, type });
  };

  const performNotification = async (method: 'whatsapp' | 'sms') => {
      if(!notificationTarget || !notificationTarget.student.parentPhone) {
          alert('لا يوجد رقم هاتف مسجل');
          return;
      }
      const { student, type } = notificationTarget;
      
      let cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
      
      if (!cleanPhone || cleanPhone.length < 5) {
          alert('رقم الهاتف غير صحيح أو قصير جداً');
          return;
      }
      
      if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
      
      if (cleanPhone.length === 8) {
          cleanPhone = '968' + cleanPhone;
      } else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) {
          cleanPhone = '968' + cleanPhone.substring(1);
      }

      const statusText = type === 'absent' ? 'تغيب عن المدرسة' : 'تأخر في الحضور إلى المدرسة';
      const msg = encodeURIComponent(`السلام عليكم، نود إبلاغكم بأن الطالب ${student.name} قد ${statusText} اليوم ${new Date(selectedDate).toLocaleDateString('ar-EG')}.`);

      if (method === 'whatsapp') {
          const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
          try {
            await Browser.open({ url: url });
          } catch (e) {
            window.open(url, '_blank');
          }
      } else {
          window.location.href = `sms:${cleanPhone}?body=${msg}`;
      }
      setNotificationTarget(null);
  };

  const getStatus = (student: Student) => {
    return student.attendance.find(a => a.date === selectedDate)?.status;
  };

  const filteredStudents = students.filter(s => {
      const matchClass = classFilter === 'all' || (s.classes && s.classes.includes(classFilter));
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSearch;
  });

  // --- PDF Printing Logic ---
  const getBase64Image = async (url: string): Promise<string> => {
      try {
          const response = await fetch(url);
          if (!response.ok) return "";
          const blob = await response.blob();
          return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const result = reader.result as string;
                  if (result && result.startsWith('data:')) resolve(result);
                  else resolve("");
              };
              reader.onerror = () => resolve("");
              reader.readAsDataURL(blob);
          });
      } catch (error) { return ""; }
  };

  const exportPDF = async (element: HTMLElement, filename: string, setLoader: (val: boolean) => void, orientation: 'portrait' | 'landscape' = 'portrait') => {
    setLoader(true);
    const opt = {
        margin: 5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: orientation }
    };

    if (typeof html2pdf !== 'undefined') {
        try {
            const worker = html2pdf().set(opt).from(element).toPdf();
            if (Capacitor.isNativePlatform()) {
                 const pdfBase64 = await worker.output('datauristring');
                 const base64Data = pdfBase64.split(',')[1];
                 const result = await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Cache });
                 await Share.share({ title: filename, url: result.uri, dialogTitle: 'مشاركة/حفظ' });
            } else {
                 const pdfBlob = await worker.output('blob');
                 const url = URL.createObjectURL(pdfBlob);
                 const link = document.createElement('a');
                 link.href = url; link.download = filename; link.target = "_blank";
                 document.body.appendChild(link); link.click();
                 setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 2000);
            }
        } catch (err) { console.error('PDF Error:', err); } finally { setLoader(false); }
    } else { alert('مكتبة PDF غير جاهزة'); setLoader(false); }
  };

  const handlePrintDailyReport = async () => {
      if (filteredStudents.length === 0) {
          alert('لا يوجد طلاب في القائمة المختارة');
          return;
      }

      setIsGeneratingPdf(true);

      const teacherName = localStorage.getItem('teacherName') || '................';
      const schoolName = localStorage.getItem('schoolName') || '................';
      let emblemSrc = await getBase64Image('oman_logo.png') || await getBase64Image('icon.png');

      const dateStr = new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Sort students: absent/late first, then alphabetical
      const sortedStudents = [...filteredStudents].sort((a, b) => {
          const statusA = getStatus(a) || '';
          const statusB = getStatus(b) || '';
          if (statusA === statusB) return a.name.localeCompare(b.name);
          if (statusA === 'absent') return -1;
          if (statusB === 'absent') return 1;
          if (statusA === 'late') return -1;
          if (statusB === 'late') return 1;
          return 0;
      });

      const rows = sortedStudents.map((s, i) => {
          const status = getStatus(s);
          let statusText = 'حاضر';
          let statusColor = '#000';
          let bgColor = '#fff';

          if (status === 'absent') { statusText = 'غائب'; statusColor = '#dc2626'; bgColor = '#fef2f2'; }
          else if (status === 'late') { statusText = 'متأخر'; statusColor = '#d97706'; bgColor = '#fffbeb'; }
          else if (!status) { statusText = 'غير مرصود'; statusColor = '#9ca3af'; }

          // Cumulative stats
          const totalAbsent = s.attendance.filter(a => a.status === 'absent').length;
          const totalLate = s.attendance.filter(a => a.status === 'late').length;

          const cellStyle = "border: 1px solid #000 !important; padding: 8px; text-align: center; color: #000 !important;";
          
          return `
            <tr style="background-color: ${bgColor};">
                <td style="${cellStyle}">${i + 1}</td>
                <td style="${cellStyle}; text-align: right;">${s.name}</td>
                <td style="${cellStyle}; font-weight: bold; color: ${statusColor} !important;">${statusText}</td>
                <td style="${cellStyle}">${totalAbsent}</td>
                <td style="${cellStyle}">${totalLate}</td>
                <td style="${cellStyle}"></td>
            </tr>
          `;
      }).join('');

      const element = document.createElement('div');
      element.setAttribute('dir', 'rtl');
      element.style.fontFamily = 'Tajawal, sans-serif';
      element.style.padding = '20px';
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#000000';

      const headerStyle = "border: 1px solid #000 !important; padding: 10px; color: #000 !important; font-weight: bold; background-color: #f3f4f6;";

      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px; color: #000 !important;">
            ${emblemSrc ? `<img src="${emblemSrc}" style="height: 60px; margin-bottom: 10px;" />` : ''}
            <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #000 !important;">تقرير متابعة الحضور والغياب اليومي</h2>
            <div style="display: flex; justify-content: space-between; margin-top: 20px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; color: #000 !important; font-size: 14px;">
                <span>المدرسة: ${schoolName}</span>
                <span>المعلم: ${teacherName}</span>
                <span>التاريخ: ${dateStr}</span>
                <span>الفصل: ${classFilter === 'all' ? 'جميع الفصول' : classFilter}</span>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; border: 1px solid #000 !important;">
            <thead>
                <tr>
                    <th style="${headerStyle}; width: 40px;">#</th>
                    <th style="${headerStyle}; text-align: right;">اسم الطالب</th>
                    <th style="${headerStyle}; width: 15%;">الحالة اليوم</th>
                    <th style="${headerStyle}; width: 10%;">مجموع الغياب</th>
                    <th style="${headerStyle}; width: 10%;">مجموع التأخر</th>
                    <th style="${headerStyle}; width: 20%;">ملاحظات</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        
        <div style="margin-top: 40px; display: flex; justify-content: space-between; padding: 0 50px; color: #000 !important;">
            <div style="text-align: center;">
                <p style="font-weight: bold; margin-bottom: 40px;">توقيع المعلم</p>
                <p>......................</p>
            </div>
            <div style="text-align: center;">
                <p style="font-weight: bold; margin-bottom: 40px;">مدير المدرسة</p>
                <p>......................</p>
            </div>
        </div>
      `;

      exportPDF(element, `تقرير_غياب_${selectedDate}.pdf`, setIsGeneratingPdf, 'portrait');
  };

  const handlePrintFullReport = async () => {
      if (filteredStudents.length === 0) {
          alert('لا يوجد طلاب في القائمة المختارة');
          return;
      }

      setIsGeneratingPdf(true);

      const teacherName = localStorage.getItem('teacherName') || '................';
      const schoolName = localStorage.getItem('schoolName') || '................';
      let emblemSrc = await getBase64Image('oman_logo.png') || await getBase64Image('icon.png');

      // 1. Collect all unique dates recorded for the filtered students
      const allDates = new Set<string>();
      filteredStudents.forEach(s => {
          s.attendance.forEach(a => allDates.add(a.date));
      });
      const sortedDates = Array.from(allDates).sort();

      if (sortedDates.length === 0) {
          alert('لا توجد سجلات حضور مسجلة حتى الآن');
          setIsGeneratingPdf(false);
          return;
      }

      // 2. Build Date Headers HTML (Smart Vertical Stacking)
      const dateHeaders = sortedDates.map(date => {
          const d = new Date(date);
          const day = d.getDate();
          const month = d.getMonth() + 1;
          
          return `<th style="border: 1px solid #000; padding: 2px; width: 28px; background-color: #f3f4f6; vertical-align: middle;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1;">
                  <span style="font-size: 11px; font-weight: 900; color: #000;">${day}</span>
                  <span style="font-size: 8px; color: #666; font-weight: bold;">${month}</span>
              </div>
          </th>`;
      }).join('');

      // 3. Build Student Rows
      const rows = filteredStudents.map((s, i) => {
          const totalAbsent = s.attendance.filter(a => a.status === 'absent').length;
          const totalLate = s.attendance.filter(a => a.status === 'late').length;

          const dateCells = sortedDates.map(date => {
              const record = s.attendance.find(a => a.date === date);
              let symbol = '';
              let color = 'transparent';
              
              if (record?.status === 'present') { symbol = '✔'; color = '#dcfce7'; } // green-100
              else if (record?.status === 'absent') { symbol = '✖'; color = '#fee2e2'; } // red-100
              else if (record?.status === 'late') { symbol = 'ت'; color = '#fef3c7'; } // amber-100
              
              return `<td style="border: 1px solid #000; padding: 2px; text-align: center; background-color: ${color}; font-size: 10px;">${symbol}</td>`;
          }).join('');

          return `
            <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${s.name}</td>
                ${dateCells}
                <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${totalAbsent}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${totalLate}</td>
            </tr>
          `;
      }).join('');

      const element = document.createElement('div');
      
      // Strict RTL enforcement
      element.setAttribute('dir', 'rtl');
      element.style.direction = 'rtl';
      element.style.fontFamily = 'Tajawal, sans-serif';
      element.style.padding = '10px';
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#000000';

      const headerStyle = "border: 1px solid #000 !important; padding: 5px; color: #000 !important; font-weight: bold; background-color: #f3f4f6;";

      element.innerHTML = `
        <style>
            table { direction: rtl; border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; }
        </style>
        <div style="text-align: center; margin-bottom: 20px; color: #000 !important;">
            ${emblemSrc ? `<img src="${emblemSrc}" style="height: 50px; margin-bottom: 10px;" />` : ''}
            <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #000 !important;">سجل الحضور والغياب الشامل (التفريغ)</h2>
            <div style="display: flex; justify-content: space-between; margin-top: 15px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; color: #000 !important; font-size: 12px;">
                <span>المدرسة: ${schoolName}</span>
                <span>المعلم: ${teacherName}</span>
                <span>الفصل: ${classFilter === 'all' ? 'جميع الفصول' : classFilter}</span>
                <span>عدد الأيام: ${sortedDates.length}</span>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #000 !important; direction: rtl;">
            <thead>
                <tr>
                    <th style="${headerStyle}; width: 30px;">#</th>
                    <th style="${headerStyle}; text-align: right; min-width: 120px;">اسم الطالب</th>
                    ${dateHeaders}
                    <th style="${headerStyle}; width: 30px;">غ</th>
                    <th style="${headerStyle}; width: 30px;">ت</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        
        <div style="margin-top: 20px; font-size: 10px;">
            <p><strong>المفتاح:</strong> (✔) حاضر ، (✖) غائب ، (ت) متأخر</p>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; padding: 0 50px; color: #000 !important;">
            <div style="text-align: center;">
                <p style="font-weight: bold; margin-bottom: 30px;">توقيع المعلم</p>
                <p>......................</p>
            </div>
            <div style="text-align: center;">
                <p style="font-weight: bold; margin-bottom: 30px;">مدير المدرسة</p>
                <p>......................</p>
            </div>
        </div>
      `;

      // Use Landscape for the full record
      exportPDF(element, `سجل_حضور_شامل_${classFilter}.pdf`, setIsGeneratingPdf, 'landscape');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] -mt-4 -mx-4 text-slate-900 dark:text-white">
      
      {/* Sticky Full Width Header */}
      <div className={`${styles.header} px-4 pt-4 pb-2 sticky top-0 z-30 shrink-0`}>
          <div className="flex items-end justify-between mb-3">
             <div>
                 <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">الحضور</h1>
                 <p className="text-xs text-slate-500 dark:text-white/50 font-bold mt-1">{formatDateDisplay(selectedDate)}</p>
             </div>
             <div className="flex gap-2">
                 {/* Print Daily Button */}
                 <button 
                    onClick={handlePrintDailyReport}
                    disabled={isGeneratingPdf}
                    className="w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                    title="طباعة تقرير الحضور (يومي)"
                 >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                 </button>

                 {/* Print Full Record Button (NEW) */}
                 <button 
                    onClick={handlePrintFullReport}
                    disabled={isGeneratingPdf}
                    className="w-9 h-9 flex items-center justify-center bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
                    title="طباعة السجل الكامل (تفريغ)"
                 >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
                 </button>

                 {/* Class Filter Button */}
                 <div className="relative">
                    <select 
                        value={classFilter} 
                        onChange={(e) => setClassFilter(e.target.value)} 
                        className={`appearance-none text-indigo-700 dark:text-indigo-200 font-bold text-xs py-2 pl-3 pr-8 shadow-sm focus:ring-0 cursor-pointer outline-none transition-colors ${styles.select}`}
                    >
                        <option value="all" className="text-black">كل الفصول</option>
                        {classes.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                    </select>
                    <ChevronDown className="w-3 h-3 text-indigo-400 dark:text-indigo-300 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                 </div>
                 {/* Date Picker Button */}
                 <div className="relative">
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className="absolute inset-0 opacity-0 z-10 w-full cursor-pointer"
                    />
                    <button className="text-slate-700 dark:text-white/80 font-bold text-xs py-2 px-3 shadow-sm flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-white/20 transition-all bg-white dark:bg-white/10 rounded-full border border-gray-200 dark:border-white/10">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>التاريخ</span>
                    </button>
                 </div>
             </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-2">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400 dark:text-white/40" />
              </div>
              <input
                  type="text"
                  className={`w-full text-slate-900 dark:text-white text-sm py-2 pr-9 pl-4 outline-none placeholder:text-slate-400 dark:placeholder:text-white/30 transition-all text-right shadow-sm ${styles.search}`}
                  placeholder="بحث عن طالب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>

          {/* Batch Actions */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button 
                  onClick={() => handleMarkAll('present')}
                  className="flex-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 py-1.5 text-[10px] font-bold shadow-sm active:scale-95 transition-all hover:bg-emerald-200 dark:hover:bg-emerald-500/30 rounded-xl border border-emerald-200 dark:border-emerald-500/20"
              >
                  تحديد الكل "حاضر"
              </button>
              <button 
                  onClick={() => handleMarkAll('reset')}
                  className="px-4 bg-white dark:bg-white/10 text-slate-600 dark:text-white/60 py-1.5 shadow-sm active:scale-95 transition-all hover:bg-gray-50 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white rounded-xl border border-gray-200 dark:border-white/10"
              >
                  <RotateCcw className="w-4 h-4" />
              </button>
          </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-32 custom-scrollbar">
          {filteredStudents.length > 0 ? (
              <div className="space-y-2">
                  {filteredStudents.map((student, index) => {
                    const status = getStatus(student);
                    return (
                        <div 
                            key={student.id} 
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 transition-all ${styles.card}`}
                        >
                            
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm ${
                                    status === 'present' ? 'bg-emerald-500 border border-emerald-400' : 
                                    status === 'absent' ? 'bg-rose-500 border border-rose-400' : 
                                    status === 'late' ? 'bg-amber-500 border border-amber-400' : 
                                    'bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-500 dark:text-white'
                                }`}>
                                    {student.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate text-right">{student.name}</h4>
                                    <p className="text-[9px] text-slate-500 dark:text-white/40 truncate text-right font-bold px-1.5 py-0.5 inline-block mt-0.5 bg-slate-100 dark:bg-white/5 rounded-md">{student.classes[0]}</p>
                                </div>
                            </div>

                            <div className={`flex items-center justify-end gap-2 w-full sm:w-auto ${styles.btnGroup}`}>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => toggleAttendance(student.id, 'present')} 
                                        className={`w-9 h-9 flex items-center justify-center transition-all ${styles.statusBtn} ${status === 'present' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 text-slate-400 dark:text-emerald-400/50 border border-gray-100 dark:border-transparent hover:bg-emerald-50 dark:hover:bg-emerald-500/20'}`}
                                        title="حاضر"
                                    >
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                    </button>
                                    <button 
                                        onClick={() => toggleAttendance(student.id, 'absent')} 
                                        className={`w-9 h-9 flex items-center justify-center transition-all ${styles.statusBtn} ${status === 'absent' ? 'bg-rose-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 text-slate-400 dark:text-rose-400/50 border border-gray-100 dark:border-transparent hover:bg-rose-50 dark:hover:bg-rose-500/20'}`}
                                        title="غائب"
                                    >
                                        <X className="w-4 h-4" strokeWidth={3} />
                                    </button>
                                    <button 
                                        onClick={() => toggleAttendance(student.id, 'late')} 
                                        className={`w-9 h-9 flex items-center justify-center transition-all ${styles.statusBtn} ${status === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 text-slate-400 dark:text-amber-400/50 border border-gray-100 dark:border-transparent hover:bg-amber-50 dark:hover:bg-amber-500/20'}`}
                                        title="تأخير"
                                    >
                                        <Clock className="w-4 h-4" strokeWidth={3} />
                                    </button>
                                </div>
                                
                                {(status === 'absent' || status === 'late') && (
                                    <button 
                                        onClick={() => handleNotifyParent(student, status)} 
                                        className={`w-9 h-9 flex items-center justify-center bg-blue-500 text-white active:scale-90 transition-transform shadow-sm ml-1 ${styles.statusBtn}`}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                        </div>
                    );
                  })}
              </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Filter className="w-12 h-12 text-slate-400 dark:text-white mb-2" />
                <p className="text-sm font-bold text-slate-500 dark:text-white">لا يوجد طلاب مطابقين</p>
            </div>
          )}
      </div>

      {/* Notification Modal */}
      <Modal isOpen={!!notificationTarget} onClose={() => setNotificationTarget(null)} className="rounded-[28px]">
          <h3 className="text-center font-black text-slate-900 dark:text-white text-lg mb-1 shrink-0">
              إبلاغ ولي الأمر
          </h3>
          <p className="text-center text-xs font-bold text-slate-500 dark:text-white/50 mb-6 shrink-0">
              {notificationTarget?.type === 'absent' ? 'الطالب غائب اليوم' : 'الطالب متأخر اليوم'}
          </p>
          
          <div className="space-y-3">
              <button onClick={() => performNotification('whatsapp')} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/30 transition-all">
                  <MessageCircle className="w-6 h-6 fill-white" />
                  فتح واتساب مباشرة
              </button>
              <button onClick={() => performNotification('sms')} className="w-full bg-slate-100 dark:bg-white/10 active:bg-slate-200 dark:active:bg-white/20 py-4 rounded-2xl text-slate-700 dark:text-white font-black text-sm flex items-center justify-center gap-2 border border-gray-200 dark:border-white/10">
                  <CheckCircle2 className="w-5 h-5" />
                  رسالة نصية SMS
              </button>
          </div>
          
          <button onClick={() => setNotificationTarget(null)} className="w-full mt-3 bg-transparent py-3 rounded-xl text-rose-500 dark:text-rose-400 font-bold text-sm hover:bg-rose-50 dark:hover:bg-white/5">
              إلغاء
          </button>
      </Modal>
    </div>
  );
};

export default AttendanceTracker;
