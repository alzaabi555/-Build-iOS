import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Check, Loader2, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import StudentReport from './StudentReport';
import { Drawer as DrawerSheet } from './ui/Drawer'; // ✅ استبدال Modal القديم بالنافذة الحديثة
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';

// ✅ استدعاء قالب البطاقات الجديد
import ParentCardsTemplate from './ParentCardsTemplate';

// =================================================================================
// ✅ أيقونات 3D 
// =================================================================================

const Icon3DParentCard = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradCard" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <rect x="15" y="30" width="70" height="40" rx="6" fill="url(#gradCard)" />
    <circle cx="30" cy="50" r="8" fill="white" opacity="0.9" />
    <rect x="45" y="45" width="30" height="4" rx="2" fill="white" opacity="0.9" />
    <rect x="45" y="55" width="20" height="4" rx="2" fill="white" opacity="0.9" />
    <path d="M15 50 L20 50 M80 50 L85 50" stroke="white" strokeWidth="2" strokeDasharray="2 2" />
  </svg>
);

const Icon3DReportCenter = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradRep" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <rect x="20" y="15" width="60" height="70" rx="8" fill="url(#gradRep)" />
    <rect x="30" y="30" width="40" height="5" rx="2" fill="white" opacity="0.8" />
    <rect x="30" y="45" width="40" height="5" rx="2" fill="white" opacity="0.8" />
    <rect x="30" y="60" width="25" height="5" rx="2" fill="white" opacity="0.8" />
    <circle cx="70" cy="70" r="8" fill="#fbbf24" />
  </svg>
);

const Icon3DStudent = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradUser" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="35" r="18" fill="url(#gradUser)" />
    <path d="M20 85 Q50 55 80 85" fill="url(#gradUser)" />
  </svg>
);

const Icon3DGrades = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradChart" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <rect x="20" y="50" width="15" height="30" rx="3" fill="url(#gradChart)" />
    <rect x="42" y="30" width="15" height="50" rx="3" fill="url(#gradChart)" />
    <rect x="64" y="15" width="15" height="65" rx="3" fill="url(#gradChart)" />
    <path d="M10 85 H90" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const Icon3DCertificate = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradCert" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="40" r="25" fill="url(#gradCert)" />
    <circle cx="50" cy="40" r="18" fill="none" stroke="white" strokeWidth="3" strokeDasharray="4 2" />
    <path d="M35 60 L25 85 L40 75 L55 85 L45 60" fill="#f59e0b" stroke="white" strokeWidth="1" />
    <path d="M65 60 L75 85 L60 75 L45 85 L55 60" fill="#f59e0b" stroke="white" strokeWidth="1" />
  </svg>
);

const Icon3DSummon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradWarn" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
    </defs>
    <path d="M50 15 L85 80 H15 Z" fill="url(#gradWarn)" stroke="white" strokeWidth="3" strokeLinejoin="round" />
    <path d="M50 35 V60" stroke="white" strokeWidth="6" strokeLinecap="round" />
    <circle cx="50" cy="70" r="4" fill="white" />
  </svg>
);

const Icon3DPrint = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradPrint" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
    </defs>
    <rect x="25" y="40" width="50" height="30" rx="4" fill="url(#gradPrint)" />
    <path d="M35 40 V25 H65 V40" fill="white" opacity="0.9" />
    <path d="M35 60 V75 H65 V60" fill="white" />
    <rect x="60" y="48" width="5" height="5" rx="1" fill="#4ade80" />
  </svg>
);

const Icon3DSettings = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradSet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="25" fill="none" stroke="url(#gradSet)" strokeWidth="15" strokeDasharray="12 8" />
    <circle cx="50" cy="50" r="12" fill="#64748b" />
  </svg>
);

const Icon3DLayers = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradLay" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <path d="M15 40 L50 20 L85 40 L50 60 Z" fill="url(#gradLay)" />
    <path d="M15 55 L50 75 L85 55" fill="none" stroke="url(#gradLay)" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const Icon3DDocument = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradDoc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#db2777" />
      </linearGradient>
    </defs>
    <rect x="25" y="20" width="50" height="60" rx="5" fill="url(#gradDoc)" />
    <path d="M35 35 H65 M35 45 H65 M35 55 H50" stroke="white" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const Icon3DEye = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className || "w-6 h-6"} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradEye" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    <path d="M15 50 Q50 15 85 50 Q50 85 15 50" fill="white" />
    <circle cx="50" cy="50" r="18" fill="url(#gradEye)" />
    <circle cx="55" cy="45" r="5" fill="white" opacity="0.6" />
  </svg>
);

// =================================================================================

interface ReportsProps {
  initialTab?: 'student_report' | 'grades_record' | 'certificates' | 'parent_cards' | 'summon';
}

const getGradingSettings = () => {
  const saved = localStorage.getItem('rased_grading_settings');
  return saved ? JSON.parse(saved) : null; 
};

// --- نافذة المعاينة (Print Preview Modal) ---
const PrintPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  landscape?: boolean;
}> = ({ isOpen, onClose, title, content, landscape }) => {
  const { t, dir } = useApp(); 
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    const element = document.getElementById('preview-content-area');
    if (!element) return;

    setIsPrinting(true);

    const scrollContainer = document.getElementById('preview-scroll-container');
    if (scrollContainer) scrollContainer.scrollTop = 0;

    const opt = {
      margin: [0, 0, 0, 0],
      filename: `${title.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: landscape ? 1123 : 794 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      const worker = html2pdf().set(opt).from(element).toPdf();
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = await worker.output('datauristring');
        const result = await Filesystem.writeFile({
          path: opt.filename,
          data: pdfBase64.split(',')[1],
          directory: Directory.Cache
        });
        await Share.share({ title: title, url: result.uri, dialogTitle: t('shareReport') });
      } else {
        worker.save();
      }
    } catch (e) {
      console.error("Print Error:", e);
      alert(t('pdfGenerationError'));
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[99999] bg-bgMain/95 backdrop-blur-sm ${dir === 'rtl' ? 'md:pr-[18rem]' : 'md:pl-[18rem]'} flex flex-col`} dir={dir}>
      <div id="preview-scroll-container" className="h-full overflow-auto p-4 md:p-8 custom-scrollbar">
        
        <div className="sticky top-0 z-50 bg-bgCard text-textPrimary p-4 flex justify-between items-center border border-borderColor shadow-2xl rounded-2xl mb-6 backdrop-blur-md">
          <button
            onClick={onClose}
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 md:px-6 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <ArrowRight className={`w-5 h-5 ${dir === 'ltr' ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline">{t('closeAndReturn')}</span>
          </button>

          <div className="text-center flex-1 px-4">
            <h3 className="font-black text-lg text-primary">{title}</h3>
            <p className="text-[10px] text-textSecondary font-mono tracking-widest">{landscape ? 'A4 Landscape' : 'A4 Portrait'}</p>
          </div>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="bg-primary hover:bg-primary/80 text-white px-4 md:px-6 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95 pointer-events-auto"
          >
            {isPrinting ? <Loader2 className="animate-spin w-5 h-5" /> : <Icon3DPrint className="w-5 h-5" />}
            <span className="hidden sm:inline">{isPrinting ? t('processingPrint') : t('exportToPrint')}</span>
          </button>
        </div>

        <div className="flex justify-center pb-20">
          <div
            id="preview-content-area"
            className="bg-white text-black shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            style={{
              width: landscape ? '297mm' : '210mm',
              minHeight: landscape ? '210mm' : '297mm',
              padding: '0',
              direction: dir, 
              fontFamily: 'Tajawal, sans-serif',
              backgroundColor: '#ffffff', // 👈 حماية للطباعة بالحبر الأبيض والأسود
              color: '#000000',
              boxSizing: 'border-box'
            }}
          >
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================================
// ✅ القوالب المحدثة (للتباعة: تظل دائمًا بخلفية بيضاء لتوفير الحبر)
// =================================================================================

const GradesTemplate = ({ students, tools, teacherInfo, semester, gradeClass }: any) => {
  const { t, dir } = useApp();
  const safeStudents = Array.isArray(students) ? students : [];

  const settings = getGradingSettings() || { totalScore: 100, finalExamWeight: 40, finalExamName: '' };
  
  const savedFinalExamName = settings.finalExamName?.trim() || '';
  const isDefaultExamName = savedFinalExamName === 'الامتحان النهائي' || savedFinalExamName === 'Final Exam' || savedFinalExamName === '';
  const finalExamName = isDefaultExamName ? t('finalExamNameDefault') : savedFinalExamName;

  const finalWeight = settings.finalExamWeight;
  const continuousWeight = settings.totalScore - finalWeight;
  const continuousTools = tools.filter((t: any) => t.name.trim() !== finalExamName);

  const ROWS_PER_PAGE = 20;
  const chunkedStudents = [];
  for (let i = 0; i < safeStudents.length; i += ROWS_PER_PAGE) {
    chunkedStudents.push(safeStudents.slice(i, i + ROWS_PER_PAGE));
  }

  return (
    <div className="w-full text-black bg-white" dir={dir}>
      {chunkedStudents.map((chunk, pageIndex) => (
        <React.Fragment key={pageIndex}>
          <div className="p-8 w-full bg-white relative">
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <div className="flex justify-between items-center mb-4">
                <div className={`text-${dir === 'rtl' ? 'right' : 'left'} text-sm font-bold leading-relaxed`}>
                  <p>{t('sultanateOfOman')}</p>
                  <p>{t('ministryOfEducation')}</p>
                </div>
                <div>
                  <h1 className="text-2xl font-black underline text-black">{t('studentGradesRecord')}</h1>
                </div>
                <div className={`text-${dir === 'rtl' ? 'left' : 'right'} text-sm font-bold leading-relaxed`}>
                  <p>{t('subjectLabel')} {teacherInfo?.subject || '........'}</p>
                  <p>{t('classLabelTemplate')} {gradeClass}</p>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse border border-black text-[10px]">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1 w-8 text-center text-black">{t('numLabel')}</th>
                  <th className={`border border-black p-1 text-${dir === 'rtl' ? 'right' : 'left'} w-48 text-black`}>{t('nameLabel')}</th>
                  {continuousTools.map((t: any) => (
                    <th key={t.id} className="border border-black p-1 bg-orange-50 text-center text-black">{t.name}</th>
                  ))}
                  <th className="border border-black p-1 bg-blue-100 text-center font-bold text-black">{t('totalLabel')} ({continuousWeight})</th>
                  {finalWeight > 0 && (
                    <th className="border border-black p-1 bg-pink-100 text-center font-bold text-black">{finalExamName} ({finalWeight})</th>
                  )}
                  <th className="border border-black p-1 bg-gray-300 text-center font-black text-black">{t('overallLabel')} ({settings.totalScore})</th>
                  <th className="border border-black p-1 text-center text-black">{t('gradeSymbolLabel')}</th>
                </tr>
              </thead>

              <tbody>
                {chunk.map((s: any, i: number) => {
                  const globalIndex = (pageIndex * ROWS_PER_PAGE) + i + 1;
                  const semGrades = (s.grades || []).filter((g: any) => (g.semester || '1') === semester);
                  let contSum = 0;

                  const contCells = continuousTools.map((tool: any) => {
                    const g = semGrades.find((r: any) => r.category.trim() === tool.name.trim());
                    const val = g ? Number(g.score) : 0;
                    contSum += val;
                    return (
                      <td key={tool.id} className="border border-black p-1 text-center font-medium text-black">
                        {g ? g.score : '-'}
                      </td>
                    );
                  });

                  let finalVal = 0;
                  let finalCell = null;

                  if (finalWeight > 0) {
                    const finalG = semGrades.find((r: any) => r.category.trim() === finalExamName);
                    finalVal = finalG ? Number(finalG.score) : 0;
                    finalCell = (
                      <td className="border border-black p-1 text-center font-bold bg-pink-50 text-black">
                        {finalG ? finalG.score : '-'}
                      </td>
                    );
                  }

                  const total = contSum + finalVal;
                  const getSymbol = (sc: number) => {
                    const percent = (sc / settings.totalScore) * 100;
                    if (dir === 'rtl') {
                        if (percent >= 90) return 'أ';
                        if (percent >= 80) return 'ب';
                        if (percent >= 65) return 'ج';
                        if (percent >= 50) return 'د';
                        return 'هـ';
                    } else {
                        if (percent >= 90) return 'A';
                        if (percent >= 80) return 'B';
                        if (percent >= 65) return 'C';
                        if (percent >= 50) return 'D';
                        return 'F';
                    }
                  };

                  return (
                    <tr key={s.id || i}>
                      <td className="border border-black p-1 text-center text-black">{globalIndex}</td>
                      <td className={`border border-black p-1 font-bold whitespace-nowrap text-black text-${dir === 'rtl' ? 'right' : 'left'}`}>{s.name}</td>
                      {contCells}
                      <td className="border border-black p-1 text-center font-bold bg-blue-50 text-black">{contSum}</td>
                      {finalWeight > 0 && finalCell}
                      <td className="border border-black p-1 text-center font-black bg-gray-100 text-black">{total}</td>
                      <td className="border border-black p-1 text-center font-bold text-black">{getSymbol(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="text-center text-[10px] text-gray-500 mt-4">
                {t('pageWord')} {pageIndex + 1} {t('ofWord')} {chunkedStudents.length}
            </div>
          </div>
          {pageIndex !== chunkedStudents.length - 1 && (
            <div className="html2pdf__page-break" style={{ pageBreakBefore: 'always', height: 0, margin: 0, padding: 0, overflow: 'hidden' }}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const CertificatesTemplate = ({ students, settings, teacherInfo }: any) => {
  const { t, dir, language } = useApp(); 
  const safeStudents = Array.isArray(students) ? students : [];

  const safeSettings = settings || {};
  const titleRaw = safeSettings.title;
  const bodyRaw = safeSettings.bodyText;

  const isDefaultTitle = !titleRaw || titleRaw === 'شهادة تقدير' || titleRaw === 'شهادة تميز' || titleRaw === 'Certificate of Excellence';
  const isDefaultBody = !bodyRaw || bodyRaw.includes('وذلك لتميزه الدراسي') || bodyRaw.includes('تقديراً لجهوده العظيمة') || bodyRaw.includes('in appreciation of his great efforts');

  const title = isDefaultTitle ? t('certificateOfExcellence') : titleRaw;
  const rawBody = isDefaultBody ? t('knightAppreciationText') : bodyRaw;

  if (safeStudents.length === 0) return <div className="p-10 text-center text-black">{t('noStudentDataToDisplay')}</div>;

  const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
  const subject = teacherInfo?.subject || t('subjectCol');
  const schoolName = teacherInfo?.school || t('schoolPrefix');

  return (
    <div className="w-full text-black bg-white" dir={dir}>
      {safeStudents.map((s: any, index: number) => {
        const studentClass = Array.isArray(s.classes) ? s.classes[0] : '-';
        return (
          <div 
            key={s.id || index} 
            className="relative mx-auto font-sans [-webkit-print-color-adjust:exact] print:shadow-none bg-white"
            style={{
              width: '297mm',
              height: '210mm',
              pageBreakAfter: index === safeStudents.length - 1 ? 'auto' : 'always', 
              padding: '10mm',
              boxSizing: 'border-box',
              overflow: 'hidden',
              direction: dir
            }}
          >
            <div className="w-full h-full border-[12px] border-double border-amber-400 p-2 relative z-10">
              <div className="w-full h-full border-4 border-[#1e3a8a] bg-[#faf9f6] p-8 relative flex flex-col justify-between overflow-hidden">
                
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                  <Award className="w-[600px] h-[600px] text-amber-900" />
                </div>

                <div className="w-full grid grid-cols-3 items-start relative z-10">
                  <div className={`text-${dir === 'rtl' ? 'right' : 'left'} space-y-1`}>
                    <h3 className="font-black text-[18px] text-[#1e3a8a]">{t('sultanateOfOman')}</h3>
                    <h3 className="font-bold text-[16px] text-[#1e3a8a]">{t('ministryOfEducation')}</h3>
                    <h3 className="font-bold text-[16px] text-[#1e3a8a]">{teacherInfo?.governorate || t('eduDirectoratePrefix')}</h3>
                    <h3 className="font-bold text-[16px] text-amber-600">{schoolName}</h3>
                  </div>

                  <div className="flex justify-center">
                    {teacherInfo?.ministryLogo ? (
                      <img src={teacherInfo.ministryLogo} alt="Logo" className="w-24 h-24 object-contain" />
                    ) : (
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#1e3a8a] flex items-center justify-center text-xs font-bold text-[#1e3a8a] bg-white">Logo</div>
                    )}
                  </div>

                  <div className={`text-${dir === 'rtl' ? 'left' : 'right'} space-y-3 ${dir === 'rtl' ? 'border-r-2 pr-4' : 'border-l-2 pl-4'} border-amber-400 justify-self-end w-full`}>
                    <div className={`flex items-center justify-${dir === 'rtl' ? 'end' : 'start'} gap-2`}>
                      <span className="font-bold text-[16px] text-gray-500">{t('dateLabel')}</span>
                      <span className="font-black text-[18px] text-[#1e3a8a]" dir="ltr">{date}</span>
                    </div>
                    <div className={`flex items-center justify-${dir === 'rtl' ? 'end' : 'start'} gap-2`}>
                      <span className="font-bold text-[16px] text-gray-500">{t('subjectLabel').replace(':', '')}</span>
                      <span className="font-black text-[18px] text-[#1e3a8a]">{subject}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-center w-full z-10 -mt-2">
                  <h1 className="text-6xl font-black text-[#1e3a8a] mb-5 tracking-normal">
                      {title}
                  </h1>
                  
                  <div className="bg-amber-400 text-[#1e3a8a] px-10 py-2 rounded-full font-black text-xl mb-8 shadow-md">
                    {t('studentMeritMedal')}
                  </div>

                  <p className="text-xl font-bold text-gray-700 mb-4">
                    {t('thanksAndAppreciationToStudent')}
                  </p>

                  <div className="relative w-2/3 py-4 border-y-2 border-amber-300 bg-white/50 backdrop-blur-sm shadow-sm mb-5 rounded-2xl">
                    <h2 className="text-5xl font-black text-[#1e3a8a] leading-tight">
                      {s.name}
                    </h2>
                  </div>

                  <p className="text-xl font-bold text-gray-700 leading-relaxed max-w-3xl">
                    {t('enrolledInClass')} <span className="text-amber-600 font-black text-2xl mx-2">({studentClass})</span>
                    {rawBody}
                  </p>
                </div>

                <div className="w-full grid grid-cols-3 items-end relative z-10 pt-2 mt-auto">
                  <div className={`text-center justify-self-${dir === 'rtl' ? 'start' : 'end'} w-64`}>
                    <h4 className="font-bold text-lg text-[#1e3a8a] mb-4">{t('subjectTeacherLabel')}</h4>
                    <div className="border-b-2 border-gray-400 mx-8 mb-2"></div>
                    <h3 className="font-black text-lg text-gray-700">{teacherInfo?.name || '..........'}</h3>
                  </div>

                  <div className="flex justify-center translate-y-2">
                    {teacherInfo?.stamp ? (
                      <img src={teacherInfo.stamp} alt="Stamp" className="w-32 h-32 object-contain opacity-90 mix-blend-multiply" />
                    ) : (
                      <div className="w-32 h-32 rounded-full border-2 border-dashed border-red-500 flex items-center justify-center text-xs font-bold text-red-500 opacity-50 rotate-[-15deg] bg-white">Stamp</div>
                    )}
                  </div>

                  <div className={`text-center justify-self-${dir === 'rtl' ? 'end' : 'start'} w-64`}>
                    <h4 className="font-bold text-lg text-[#1e3a8a] mb-4">{t('schoolPrincipalLabel')}</h4>
                    <div className="border-b-2 border-gray-400 mx-8 mb-2"></div>
                    <h3 className="font-black text-xl text-gray-400 italic">..........................</h3>
                  </div>
                </div>

                <div className="absolute top-2 right-2 w-16 h-16 border-t-4 border-r-4 border-[#1e3a8a]"></div>
                <div className="absolute top-2 left-2 w-16 h-16 border-t-4 border-l-4 border-[#1e3a8a]"></div>
                <div className="absolute bottom-2 right-2 w-16 h-16 border-b-4 border-r-4 border-[#1e3a8a]"></div>
                <div className="absolute bottom-2 left-2 w-16 h-16 border-b-4 border-l-4 border-[#1e3a8a]"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SummonTemplate = ({ student, teacherInfo, data }: any) => {
  const { t, dir } = useApp();

  if (!student) return <div className="p-10 text-center text-black">{t('errorStudentDataUnavailable')}</div>;

  const safeData = data || {};
  const safeProcedures = Array.isArray(safeData.procedures) ? safeData.procedures : [];

  const getProcLabel = (procId: string) => {
    const map: any = {
        'procVerbalWarning': t('procVerbalWarning'),
        'procWrittenPledge': t('procWrittenPledge'),
        'procPhoneCall': t('procPhoneCall'),
        'procWhatsappNotice': t('procWhatsappNotice'),
        'procReferToSpecialist': t('procReferToSpecialist'),
        'تنبيه شفوي': t('procVerbalWarning'),
        'تعهد خطي': t('procWrittenPledge'),
        'اتصال هاتفي': t('procPhoneCall'),
        'إشعار واتساب': t('procWhatsappNotice'),
        'تحويل أخصائي': t('procReferToSpecialist'),
    };
    return map[procId] || procId;
  };

  return (
    <div className={`w-full text-black bg-white p-16 font-serif text-${dir === 'rtl' ? 'right' : 'left'} h-full`} dir={dir}>
      <div className="text-center mb-12 border-b-2 border-black pb-6">
        <div className="flex justify-center mb-4">
          {teacherInfo?.ministryLogo ? <img src={teacherInfo.ministryLogo} className="h-24 object-contain" /> : <div className="w-20 h-20 bg-slate-100 rounded-full border"></div>}
        </div>
        <h3 className="font-bold text-lg mb-1 text-black">{t('sultanateOfOman')} - {t('ministryOfEducation')}</h3>
        <h3 className="font-bold text-lg text-black">{t('schoolWord')} {teacherInfo?.school || '................'}</h3>
      </div>

      <div className="bg-gray-50 border border-black p-6 rounded-2xl mb-10 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-gray-500 text-sm font-bold mb-1">{t('toTheRespectedParentOfStudent')}</p>
          <h2 className="text-2xl font-black text-black">{student.name}</h2>
        </div>
        <div className={`text-${dir === 'rtl' ? 'left' : 'right'}`}>
          <p className="font-bold text-base text-black">{t('classLabelTemplate')} {safeData.className || '...'}</p>
          <p className="font-bold text-base text-gray-500">{t('dateLabel')} {safeData.issueDate || '...'}</p>
        </div>
      </div>

      <h2 className="text-center text-4xl font-black underline mb-12 text-black">{t('summonParentTitle')}</h2>

      <div className="text-2xl leading-loose text-justify mb-10 px-4 text-black">
        <p className="mb-4">{t('greetingsText')}</p>
        <p>
          {t('pleaseAttendSchoolOnDay')} <strong>{safeData.date || '...'}</strong> {t('atTime')} <strong>{safeData.time || '...'}</strong>، {t('toDiscussTheFollowingMatter')}
        </p>
      </div>

      <div className="bg-white border-2 border-black p-8 text-center text-2xl font-bold rounded-2xl mb-12 shadow-sm min-h-[120px] flex items-center justify-center text-black">
        {safeData.reason || '................................'}
      </div>

      {safeProcedures.length > 0 && (
        <div className="mb-12 border border-dashed border-gray-400 p-6 rounded-xl bg-slate-50 text-black">
          <p className="font-bold underline mb-4 text-xl">{t('previouslyTakenProcedures')}</p>
          <ul className={`list-disc ${dir === 'rtl' ? 'pr-8' : 'pl-8'} text-xl space-y-2`}>
            {safeProcedures.map((p: any, i: number) => <li key={i}>{getProcLabel(p)}</li>)}
          </ul>
        </div>
      )}

      <p className="text-xl mt-12 mb-20 text-center font-bold text-black">{t('thanksForCooperation')}</p>

      <div className="flex justify-between items-end px-10 mt-auto text-black">
        <div className="text-center">
          <p className="font-bold text-xl mb-8">{t('subjectTeacherLabel')}</p>
          <p className="text-2xl font-black">{teacherInfo?.name}</p>
        </div>

        <div className="text-center">
          {teacherInfo?.stamp && <img src={teacherInfo.stamp} className="w-40 opacity-80" style={{ backgroundColor: 'transparent' }} />}
        </div>

        <div className="text-center">
          <p className="font-bold text-xl mb-8">{t('schoolPrincipalMale')}</p>
          <p className="text-2xl font-black">....................</p>
        </div>
      </div>
    </div>
  );
};

const ClassReportsTemplate = ({ students, teacherInfo, semester, assessmentTools }: any) => {
  const { t, dir, language } = useApp(); 
  const safeStudents = Array.isArray(students) ? students : [];

  const settings = getGradingSettings();
  const finalExamNameRaw = settings?.finalExamName?.trim() || '';
  const isDefaultExamName = finalExamNameRaw === 'الامتحان النهائي' || finalExamNameRaw === 'Final Exam' || finalExamNameRaw === '';
  const finalExamName = isDefaultExamName ? t('finalExamNameDefault') : finalExamNameRaw;

  if (safeStudents.length === 0) return <div className="text-black text-center p-10">{t('noStudentDataToDisplay')}</div>;

  const safeTools = Array.isArray(assessmentTools) ? assessmentTools : [];
  const continuousTools = safeTools.filter((t: any) => t.name.trim() !== finalExamName);
  const finalTool = safeTools.find((t: any) => t.name.trim() === finalExamName);

  const translateBehavior = (desc: string) => {
    const map: any = {
        'إجابة متميزة': t('behPos1'),
        'إجابة صحيحة': t('behPos2'),
        'واجب مميز': t('behPos3'),
        'مساعدة الزملاء': t('behPos4'),
        'مشاركة صفية متميزة': t('behPos5'),
        'إبداع وتميز': t('behPos6'),
        'إزعاج في الحصة': t('behNeg1'),
        'عدم حل الواجب': t('behNeg2'),
        'نسيان الكتاب والدفتر': t('behNeg3'),
        'تأخر عن الحصة': t('behNeg4'),
        'سلوك غير لائق': t('behNeg5'),
        'النوم في الفصل': t('behNeg6'),
        'هدوء وانضباط': t('rewardDiscipline'),
    };
    return map[desc] || desc; 
  };

  return (
    <div className="w-full text-black bg-white" dir={dir}>
      {safeStudents.map((student: any) => {
        const studentClass = Array.isArray(student.classes) ? student.classes[0] : '-';
        const behaviors = (student.behaviors || []).filter((b: any) => !b.semester || b.semester === (semester || '1'));
        const grades = (student.grades || []).filter((g: any) => !g.semester || g.semester === (semester || '1'));

        const posBehaviors = behaviors.filter((b: any) => b.type === 'positive');
        const negBehaviors = behaviors.filter((b: any) => b.type === 'negative');
        const displayPosBehaviors = posBehaviors.filter((b: any) => b.description !== 'هدوء وانضباط');
        let continuousSum = 0;
        continuousTools.forEach((tool: any) => {
          const g = grades.find((r: any) => r.category.trim() === tool.name.trim());
          if (g) continuousSum += (Number(g.score) || 0);
        });

        let finalScore = 0;
        if (finalTool) {
          const g = grades.find((r: any) => r.category.trim() === finalTool.name.trim());
          if (g) finalScore = (Number(g.score) || 0);
        }

        const totalScore = continuousSum + finalScore;
        const absenceCount = (student.attendance || []).filter((a: any) => a.status === 'absent').length;
        const truantCount = (student.attendance || []).filter((a: any) => a.status === 'truant').length;
        const totalPositive = posBehaviors.reduce((acc: number, b: any) => acc + b.points, 0);
        const totalNegative = negBehaviors.reduce((acc: number, b: any) => acc + Math.abs(b.points), 0);

        return (
          <div key={student.id} className="w-full min-h-[297mm] p-10 border-b border-black page-break-after-always relative bg-white" style={{ pageBreakAfter: 'always' }}>
            
            <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4 text-black">
              <div className={`text-${dir === 'rtl' ? 'right' : 'left'} w-1/3 text-sm font-bold`}>
                <p>{t('sultanateOfOman')}</p>
                <p>{t('ministryOfEducation')}</p>
                <p>{t('schoolWord')} {teacherInfo?.school}</p>
              </div>

              <div className="text-center w-1/3">
                {teacherInfo?.ministryLogo && <img src={teacherInfo.ministryLogo} className="h-16 object-contain mx-auto" />}
                <h2 className="text-xl font-black underline mt-2 text-black">{t('studentLevelReport')}</h2>
              </div>

              <div className={`text-${dir === 'rtl' ? 'left' : 'right'} w-1/3 text-sm font-bold`}>
                <p>{t('yearLabel')} {teacherInfo?.academicYear}</p>
                <p>{t('semesterLabel')} {semester === '1' ? t('firstSemesterWord') : t('secondSemesterWord')}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-black mb-8 flex justify-between items-center text-black">
              <div>
                <h3 className="text-2xl font-black mb-1">{student.name}</h3>
                <p className="text-base text-black font-bold">{t('classLabelTemplate')} {studentClass}</p>
              </div>
              <div className="flex gap-4 text-xs font-bold">
                <span className="bg-emerald-100 border border-black text-emerald-900 px-3 py-1 rounded">{t('positiveLabel')} {totalPositive}</span>
                <span className="bg-rose-100 border border-black text-rose-900 px-3 py-1 rounded">{t('negativeLabel')} {totalNegative}</span>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-3 border-b-2 border-black inline-block text-black">{t('academicAchievement')}</h3>

            <table className="w-full border-collapse border border-black text-sm mb-8 text-black">
              <thead>
                <tr className="bg-gray-100">
                  <th className={`border border-black p-3 text-${dir === 'rtl' ? 'right' : 'left'}`}>{t('subjectCol')}</th>
                  <th className="border border-black p-3 text-center">{t('assessmentTool')}</th>
                  <th className="border border-black p-3 text-center w-24">{t('degreeLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {continuousTools.map((t: any) => {
                  const g = grades.find((r: any) => r.category.trim() === t.name.trim());
                  return (
                    <tr key={t.id}>
                      <td className={`border border-black p-3 font-bold text-${dir === 'rtl' ? 'right' : 'left'}`}>{teacherInfo?.subject || t('subjectCol')}</td>
                      <td className="border border-black p-3 text-center">{t.name}</td>
                      <td className="border border-black p-3 text-center font-bold">{g ? g.score : '-'}</td>
                    </tr>
                  );
                })}
                {finalTool && (() => {
                  const g = grades.find((r: any) => r.category.trim() === finalTool.name.trim());
                  return (
                    <tr>
                      <td className={`border border-black p-3 font-bold text-${dir === 'rtl' ? 'right' : 'left'}`}>{teacherInfo?.subject || t('subjectCol')}</td>
                      <td className="border border-black p-3 text-center bg-pink-50 font-bold">{finalTool.name}</td>
                      <td className="border border-black p-3 text-center font-black">{g ? g.score : '-'}</td>
                    </tr>
                  );
                })()}
                <tr className="bg-slate-200 font-bold">
                  <td colSpan={2} className={`border border-black p-3 text-${dir === 'rtl' ? 'right' : 'left'} text-base`}>{t('grandTotal')}</td>
                  <td className="border border-black p-3 text-center text-lg font-black">{totalScore}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex gap-6 mb-8">
              <div className="flex-1 border-2 border-black p-4 rounded-xl text-center">
                <p className="text-sm font-bold text-black mb-1">{t('absenceDays')}</p>
                <p className="text-3xl font-black text-rose-600">{absenceCount}</p>
              </div>
              <div className="flex-1 border-2 border-black p-4 rounded-xl text-center">
                <p className="text-sm font-bold text-black mb-1">{t('truancyTimes')}</p>
                <p className="text-3xl font-black text-purple-600">{truantCount}</p>
              </div>
            </div>

            <div className="mb-12">
                <h3 className="font-bold text-lg mb-3 border-b-2 border-black inline-block text-black">{t('behaviorAndAttendanceRecord')}</h3>
                <div className="flex gap-4 items-start">
                    
                    <div className="flex-1 border-2 border-black rounded-xl overflow-hidden min-h-[150px]">
                        <div className="bg-green-100 p-2 text-center font-bold border-b-2 border-black text-green-900 text-sm">
                            {t('notablePositiveBehaviors')} ({displayPosBehaviors.length})
                        </div>
                        <div className="p-2 space-y-2">
                            {displayPosBehaviors.length > 0 ? displayPosBehaviors.map((b: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center border-b border-black/50 pb-1 last:border-0 text-sm">
                                    <span className="font-bold text-black">{translateBehavior(b.description)}</span>
                                    <div className={`text-${dir === 'rtl' ? 'left' : 'right'} text-[10px] font-bold text-black flex flex-col items-${dir === 'rtl' ? 'end' : 'start'}`}>
                                        <span>{new Date(b.date).toLocaleDateString(language === 'ar' ? 'en-GB' : 'en-US')}</span>
                                        {b.session && <span>{t('sessionLabel')} {b.session}</span>}
                                    </div>
                                </div>
                            )) : <div className="text-center text-xs text-gray-500 py-4">{t('noneFound')}</div>}
                        </div>
                    </div>

                    <div className="flex-1 border-2 border-black rounded-xl overflow-hidden min-h-[150px]">
                        <div className="bg-red-100 p-2 text-center font-bold border-b-2 border-black text-red-900 text-sm">
                            {t('negativeBehaviors')} ({negBehaviors.length})
                        </div>
                        <div className="p-2 space-y-2">
                            {negBehaviors.length > 0 ? negBehaviors.map((b: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center border-b border-black/50 pb-1 last:border-0 text-sm">
                                    <span className="font-bold text-black">{translateBehavior(b.description)}</span>
                                    <div className={`text-${dir === 'rtl' ? 'left' : 'right'} text-[10px] font-bold text-black flex flex-col items-${dir === 'rtl' ? 'end' : 'start'}`}>
                                        <span>{new Date(b.date).toLocaleDateString(language === 'ar' ? 'en-GB' : 'en-US')}</span>
                                        {b.session && <span>{t('sessionLabel')} {b.session}</span>}
                                    </div>
                                </div>
                            )) : <div className="text-center text-xs text-gray-500 py-4">{t('noneFound')}</div>}
                        </div>
                    </div>

                </div>
            </div>

            <div className="flex justify-between items-end px-12 mt-auto text-black">
              <div className="text-center">
                <p className="font-bold text-base mb-8 text-black">{t('subjectTeacherLabel')}</p>
                <p className="text-2xl font-bold text-black">{teacherInfo?.name}</p>
              </div>
              <div className="text-center">
                {teacherInfo?.stamp && <img src={teacherInfo.stamp} className="w-24 opacity-80" style={{ backgroundColor: 'transparent' }} />}
              </div>
              <div className="text-center">
                <p className="font-bold text-base mb-8 text-black">{t('schoolPrincipalMale')}</p>
                <p className="font-bold text-lg text-black">........................</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// =================================================================================
// 3. UI (Main Component - Using Dynamic Theme Variables)
// =================================================================================
const Reports: React.FC<ReportsProps> = ({ initialTab }) => {
  const { students, setStudents, classes, teacherInfo, currentSemester, assessmentTools, certificateSettings, setCertificateSettings, t, dir, language } = useApp(); 
  const [activeTab, setActiveTab] = useState<'student_report' | 'grades_record' | 'certificates' | 'parent_cards' | 'summon'>(initialTab || 'student_report');

  const [stGrade, setStGrade] = useState<string>('all');
  const [stClass, setStClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const [gradesGrade, setGradesGrade] = useState<string>('all');
  const [gradesClass, setGradesClass] = useState<string>('all');

  const [certGrade, setCertGrade] = useState<string>('all');
  const [certClass, setCertClass] = useState<string>('');
  const [selectedCertStudents, setSelectedCertStudents] = useState<string[]>([]);
  const [showCertSettingsModal, setShowCertSettingsModal] = useState(false);

  const [tempCertSettings, setTempCertSettings] = useState(certificateSettings || { title: '', bodyText: '' });

  const [summonGrade, setSummonGrade] = useState<string>('all');
  const [summonClass, setSummonClass] = useState<string>('');
  const [summonStudentId, setSummonStudentId] = useState<string>('');

  const [summonData, setSummonData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    reasonType: 'absence',
    customReason: '',
    issueDate: new Date().toISOString().split('T')[0]
  });

  const [takenProcedures, setTakenProcedures] = useState<string[]>([]);

  const [cardsGrade, setCardsGrade] = useState<string>('all');
  const [cardsClass, setCardsClass] = useState<string>('all');

  const [previewData, setPreviewData] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; landscape?: boolean }>({
    isOpen: false, title: '', content: null
  });

  // 🛡️ دروع الحماية الأساسية من أي بيانات فاسدة أو طلاب ناقصين
  const safeStudents = Array.isArray(students) ? students : [];
  const safeClasses = Array.isArray(classes) ? classes : [];

  const availableGrades = useMemo(() => {
    const grades = new Set<string>();
    safeClasses.forEach(c => {
      if (typeof c !== 'string') return;
      if (c.includes('/')) {
        grades.add(c.split('/')[0].trim());
      } else {
        const numMatch = c.match(/^(\d+)/);
        if (numMatch) grades.add(numMatch[1]);
        else grades.add(c.split(' ')[0]);
      }
    });
    safeStudents.forEach(s => { if (s && s.grade) grades.add(s.grade); });
    if (grades.size === 0 && safeClasses.length > 0) return ['عام'];

    return Array.from(grades).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [safeStudents, safeClasses]);

  const getClassesForGrade = (grade: string) => {
    if (grade === 'all') return safeClasses;
    return safeClasses.filter(c => {
      if (typeof c !== 'string') return false; 
      if (c.includes('/')) return c.split('/')[0].trim() === grade;
      return c.startsWith(grade);
    });
  };

  // 🛡️ الفلاتر المدرعة لمنع أي انهيار بسبب الفصول المفقودة
  const filteredStudentsForStudentTab = useMemo(() => safeStudents.filter(s => Array.isArray(s?.classes) && s.classes.includes(stClass)), [safeStudents, stClass]);
  const filteredStudentsForGrades = useMemo(() => safeStudents.filter(s => gradesClass === 'all' || (Array.isArray(s?.classes) && s.classes.includes(gradesClass))), [safeStudents, gradesClass]);
  const filteredStudentsForCert = useMemo(() => safeStudents.filter(s => Array.isArray(s?.classes) && s.classes.includes(certClass)), [safeStudents, certClass]);
  const availableStudentsForSummon = useMemo(() => safeStudents.filter(s => Array.isArray(s?.classes) && s.classes.includes(summonClass)), [summonClass, safeStudents]);

  useEffect(() => { const cls = getClassesForGrade(stGrade); if (cls.length > 0) setStClass(cls[0]); }, [stGrade, classes]);
  useEffect(() => { const cls = getClassesForGrade(certGrade); if (cls.length > 0) setCertClass(cls[0]); }, [certGrade, classes]);
  useEffect(() => { const cls = getClassesForGrade(summonGrade); if (cls.length > 0) setSummonClass(cls[0]); }, [summonGrade, classes]);
  useEffect(() => { const cls = getClassesForGrade(cardsGrade); if (cls.length > 0) setCardsClass('all'); }, [cardsGrade, classes]); 
  useEffect(() => { if (certificateSettings) setTempCertSettings(certificateSettings); }, [certificateSettings]);

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setViewingStudent(updatedStudent);
  };

  const getReasonText = () => {
    switch (summonData.reasonType) {
      case 'absence': return t('reasonAbsence');
      case 'truant': return t('reasonTruancy');
      case 'behavior': return t('reasonBehavior');
      case 'level': return t('reasonLevel');
      case 'other': return summonData.customReason || t('reasonOtherFallback');
      default: return '';
    }
  };

  const availableProceduresList = [
    { id: 'procVerbalWarning', label: t('procVerbalWarning') }, 
    { id: 'procWrittenPledge', label: t('procWrittenPledge') }, 
    { id: 'procPhoneCall', label: t('procPhoneCall') }, 
    { id: 'procWhatsappNotice', label: t('procWhatsappNotice') }, 
    { id: 'procReferToSpecialist', label: t('procReferToSpecialist') }
  ];
  
  const toggleProcedure = (procId: string) => setTakenProcedures(prev => prev.includes(procId) ? prev.filter(p => p !== procId) : [...prev, procId]);

  const openGradesPreview = () => {
    if (filteredStudentsForGrades.length === 0) return alert(t('noStudentsFound'));
    setPreviewData({
      isOpen: true,
      title: t('gradesRecordTab'),
      landscape: true,
      content: <GradesTemplate students={filteredStudentsForGrades} tools={assessmentTools} teacherInfo={teacherInfo} semester={currentSemester} gradeClass={gradesClass === 'all' ? t('allClassesInGrade').split(' ')[0] : gradesClass} />
    });
  };

  const openCertificatesPreview = () => {
    const targets = filteredStudentsForCert.filter(s => selectedCertStudents.includes(s.id));
    if (targets.length === 0) return;
    setPreviewData({
      isOpen: true,
      title: t('certificatesTab'),
      landscape: true,
      content: <CertificatesTemplate students={targets} settings={certificateSettings} teacherInfo={teacherInfo} />
    });
  };

  const openSummonPreview = () => {
    const s = availableStudentsForSummon.find(st => st.id === summonStudentId);
    if (!s) return alert(t('selectStudentPlaceholder'));
    setPreviewData({
      isOpen: true,
      title: `${t('summonTab')} - ${s.name}`,
      landscape: false,
      content: <SummonTemplate student={s} teacherInfo={teacherInfo} data={{ ...summonData, reason: getReasonText(), className: summonClass, procedures: takenProcedures, issueDate: summonData.issueDate }} />
    });
  };

  const openClassReportsPreview = () => {
    if (filteredStudentsForStudentTab.length === 0) return alert(t('noStudentsFound'));
    setPreviewData({
      isOpen: true,
      title: `${t('studentLevelReport')} - ${stClass}`,
      landscape: false,
      content: <ClassReportsTemplate students={filteredStudentsForStudentTab} teacherInfo={teacherInfo} semester={currentSemester} assessmentTools={assessmentTools} />
    });
  };

  const openParentCardsPreview = () => {
    setPreviewData({
      isOpen: true,
      title: t('parentLoginCards'),
      landscape: false, 
      content: <ParentCardsTemplate students={students} schoolName={teacherInfo?.school} teacherName={teacherInfo?.name} selectedClass={cardsClass} />
    });
  };

  const selectAllCertStudents = () => {
    if (selectedCertStudents.length === filteredStudentsForCert.length) {
      setSelectedCertStudents([]);
    } else {
      setSelectedCertStudents(filteredStudentsForCert.map(s => s.id));
    }
  };

  const toggleCertStudent = (id: string) => {
    setSelectedCertStudents(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  if (viewingStudent) {
    return (
      <StudentReport
        student={viewingStudent}
        onUpdateStudent={handleUpdateStudent}
        currentSemester={currentSemester}
        teacherInfo={teacherInfo}
        onBack={() => setViewingStudent(null)}
      />
    );
  }

  const tabs = [
    { id: 'student_report', label: t('studentReportTab'), icon: Icon3DStudent },
    { id: 'grades_record', label: t('gradesRecordTab'), icon: Icon3DGrades },
    { id: 'certificates', label: t('certificatesTab'), icon: Icon3DCertificate },
    { id: 'parent_cards', label: t('parentCardsTab'), icon: Icon3DParentCard }, 
    { id: 'summon', label: t('summonTab'), icon: Icon3DSummon },
  ];

  return (
    <div className={`flex flex-col h-full relative font-sans transition-colors duration-500 text-textPrimary ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      <PrintPreviewModal
        isOpen={previewData.isOpen}
        onClose={() => setPreviewData({ ...previewData, isOpen: false })}
        title={previewData.title}
        content={previewData.content}
        landscape={previewData.landscape}
      />

      {/* ================= HEADER ================= */}
      <header className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent text-textPrimary`}>
        
        {/* 1. منطقة السحب (Drag Area): مخصصة فقط للعنوان لتجنب تعطيل الأزرار */}
        <div className="flex items-center gap-3 mb-6 mt-4 px-2 cursor-move" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="p-2.5 rounded-xl border bg-bgSoft backdrop-blur-md border-borderColor" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <Icon3DReportCenter className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide">{t('reportsCenter')}</h1>
            <p className="text-[10px] font-bold opacity-80 text-textSecondary">{t('printStatementsAndCertificates')}</p>
          </div>
        </div>

        {/* 2. منطقة الأزرار (Tabs): حرة تماماً لتعمل النقرات والتمرير (Scroll) 100% */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1 relative z-50" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${isActive ? 'bg-primary text-white shadow-md backdrop-blur-md' : 'bg-bgSoft text-textSecondary hover:text-textPrimary hover:bg-bgCard'}`}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? 'opacity-100' : 'text-textSecondary opacity-80'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ================= CONTENT AREA ================= */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-28 custom-scrollbar relative z-10">
        <div className="rounded-[2rem] p-6 shadow-sm border min-h-[400px] transition-colors glass-panel border-borderColor text-textPrimary">
          
          {activeTab === 'student_report' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b pb-4 mb-2 border-borderColor">
                <div className="p-2 rounded-xl bg-primary/20 text-primary"><Icon3DStudent className="w-5 h-5" /></div>
                <h3 className="font-black text-lg text-textPrimary">{t('comprehensiveStudentReport')}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {availableGrades.map(g => (
                    <button
                      key={g}
                      onClick={() => setStGrade(g)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${stGrade === g ? 'bg-primary text-white border-primary backdrop-blur-sm' : 'bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard backdrop-blur-sm'}`}
                    >
                      {t('gradePrefix')} {g}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select value={stClass} onChange={(e) => setStClass(e.target.value)} className="w-full p-4 border rounded-2xl font-bold outline-none transition-colors text-sm bg-bgCard border-borderColor text-textPrimary focus:border-primary backdrop-blur-md">
                    {getClassesForGrade(stGrade).map(c => <option key={c} value={c} className="bg-bgCard text-textPrimary">{c}</option>)}
                  </select>

                  <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full p-4 border rounded-2xl font-bold outline-none transition-colors text-sm bg-bgCard border-borderColor text-textPrimary focus:border-primary backdrop-blur-md">
                    <option value="" className="text-textSecondary bg-bgCard">{t('selectStudentPlaceholder')}</option>
                    {filteredStudentsForStudentTab.map(s => <option key={s.id} value={s.id} className="bg-bgCard text-textPrimary">{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 mt-4 flex-wrap">
                <button
                  onClick={openClassReportsPreview}
                  disabled={!stClass || filteredStudentsForStudentTab.length === 0}
                  className="px-5 py-3.5 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all flex-1 justify-center disabled:opacity-50 bg-bgSoft text-textPrimary hover:bg-bgCard border border-borderColor backdrop-blur-md"
                >
                  <Icon3DLayers className="w-4 h-4" /> {t('printEntireClass')}
                </button>

                <button
                  onClick={() => {
                    if (selectedStudentId) {
                      const s = safeStudents.find(st => st && st.id === selectedStudentId);
                      if (s) setViewingStudent(s);
                    }
                  }}
                  disabled={!selectedStudentId}
                  className="disabled:opacity-50 px-6 py-3.5 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all flex-1 justify-center bg-primary text-white hover:bg-primary/80"
                >
                  <Icon3DDocument className="w-4 h-4" /> {t('individualPreview')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'grades_record' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b pb-4 mb-2 border-borderColor">
                <div className="p-2 rounded-xl bg-warning/20 text-warning"><Icon3DGrades className="w-5 h-5" /></div>
                <h3 className="font-black text-lg text-textPrimary">{t('gradesRecordTab')}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {availableGrades.map(g => (
                    <button
                      key={g}
                      onClick={() => { setGradesGrade(g); setGradesClass('all'); }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${gradesGrade === g ? 'bg-warning text-white border-warning backdrop-blur-sm' : 'bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard backdrop-blur-sm'}`}
                    >
                      {t('gradePrefix')} {g}
                    </button>
                  ))}
                </div>

                <select value={gradesClass} onChange={(e) => setGradesClass(e.target.value)} className="w-full p-4 border rounded-2xl font-bold outline-none transition-colors text-sm bg-bgCard border-borderColor text-textPrimary focus:border-warning backdrop-blur-md">
                  <option value="all" className="bg-bgCard text-textPrimary">{t('allClassesInGrade').split(' ')[0]}</option>
                  {getClassesForGrade(gradesGrade).map(c => <option key={c} value={c} className="bg-bgCard text-textPrimary">{c}</option>)}
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={openGradesPreview} className="w-full text-white px-6 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all bg-warning hover:bg-warning/80">
                  <Icon3DPrint className="w-5 h-5" /> {t('previewAndPrintRecord')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b mb-2 border-borderColor">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-success/20 text-success"><Icon3DCertificate className="w-5 h-5" /></div>
                  <h3 className="font-black text-lg text-textPrimary">{t('certificatesTab')}</h3>
                </div>
                <button onClick={() => setShowCertSettingsModal(true)} className="p-2 rounded-xl transition-colors bg-bgSoft text-textSecondary hover:text-textPrimary hover:bg-bgCard backdrop-blur-sm">
                  <Icon3DSettings className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {availableGrades.map(g => (
                    <button
                      key={g}
                      onClick={() => setCertGrade(g)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${certGrade === g ? 'bg-success text-white border-success backdrop-blur-sm' : 'bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard backdrop-blur-sm'}`}
                    >
                      {t('gradePrefix')} {g}
                    </button>
                  ))}
                </div>

                <select value={certClass} onChange={(e) => { setCertClass(e.target.value); setSelectedCertStudents([]); }} className="w-full p-4 border rounded-2xl font-bold outline-none transition-colors text-sm bg-bgCard border-borderColor text-textPrimary focus:border-success backdrop-blur-md">
                  <option value="" disabled className="text-textSecondary bg-bgCard">{t('selectClassPlaceholder')}</option>
                  {getClassesForGrade(certGrade).map(c => <option key={c} value={c} className="bg-bgCard text-textPrimary">{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between px-2">
                  <label className="text-xs font-bold text-textSecondary">{t('studentsLabel')} ({selectedCertStudents.length})</label>
                  <button onClick={selectAllCertStudents} className="text-xs font-bold transition-colors text-success hover:text-success/80">{t('selectAll')}</button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1 custom-scrollbar">
                  {filteredStudentsForCert.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleCertStudent(s.id)}
                      className={`p-3 rounded-xl border text-xs font-bold flex justify-between transition-all ${selectedCertStudents.includes(s.id) ? 'bg-success text-white border-success shadow-md backdrop-blur-sm' : 'bg-bgSoft border-borderColor text-textSecondary hover:bg-bgCard backdrop-blur-sm'}`}
                    >
                      {s.name} {selectedCertStudents.includes(s.id) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={openCertificatesPreview}
                  disabled={selectedCertStudents.length === 0}
                  className="w-full disabled:opacity-50 text-white px-6 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all bg-success hover:bg-success/80"
                >
                  <Icon3DPrint className="w-5 h-5" /> {t('previewAndPrintCertificates')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'parent_cards' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b pb-4 mb-2 border-borderColor">
                <div className="p-2 rounded-xl bg-warning/20 text-warning"><Icon3DParentCard className="w-5 h-5" /></div>
                <h3 className="font-black text-lg text-textPrimary">{t('parentLoginCards')}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {availableGrades.map(g => (
                    <button
                      key={g}
                      onClick={() => { setCardsGrade(g); setCardsClass('all'); }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${cardsGrade === g ? 'bg-warning text-white border-warning backdrop-blur-sm' : 'bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard backdrop-blur-sm'}`}
                    >
                      {t('gradePrefix')} {g}
                    </button>
                  ))}
                </div>

                <select value={cardsClass} onChange={(e) => setCardsClass(e.target.value)} className="w-full p-4 border rounded-2xl font-bold outline-none transition-colors text-sm bg-bgCard border-borderColor text-textPrimary focus:border-warning backdrop-blur-md">
                  <option value="all" className="bg-bgCard text-textPrimary">{t('allClassesInGrade')}</option>
                  {getClassesForGrade(cardsGrade).map(c => <option key={c} value={c} className="bg-bgCard text-textPrimary">{c}</option>)}
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={openParentCardsPreview} className="w-full text-white px-6 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all bg-warning hover:bg-warning/80">
                  <Icon3DPrint className="w-5 h-5" /> {t('previewAndPrintCards')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'summon' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b pb-4 mb-2 border-borderColor">
                <div className="p-2 rounded-xl bg-danger/20 text-danger"><Icon3DSummon className="w-5 h-5" /></div>
                <h3 className="font-black text-lg text-textPrimary">{t('summonTab')}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select value={summonClass} onChange={(e) => setSummonClass(e.target.value)} className="p-4 border rounded-2xl font-bold outline-none transition-colors text-sm bg-bgCard border-borderColor text-textPrimary focus:border-danger backdrop-blur-md">
                  <option value="" disabled className="text-textSecondary bg-bgCard">{t('selectClassPlaceholder')}</option>
                  {getClassesForGrade(summonGrade).map(c => <option key={c} value={c} className="bg-bgCard text-textPrimary">{c}</option>)}
                </select>

                <select value={summonStudentId} onChange={(e) => setSummonStudentId(e.target.value)} className="p-4 border rounded-2xl font-bold outline-none transition-colors text-sm bg-bgCard border-borderColor text-textPrimary focus:border-danger backdrop-blur-md">
                  <option value="" className="text-textSecondary bg-bgCard">{t('studentPlaceholder')}</option>
                  {availableStudentsForSummon.map(s => <option key={s.id} value={s.id} className="bg-bgCard text-textPrimary">{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'absence', label: t('absenceReason') },
                    { id: 'truant', label: t('truantReason') },
                    { id: 'behavior', label: t('behaviorReason') },
                    { id: 'level', label: t('levelReason') },
                    { id: 'other', label: t('otherReason') }
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSummonData({ ...summonData, reasonType: r.id })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${summonData.reasonType === r.id ? 'bg-danger text-white border-danger shadow-md backdrop-blur-sm' : 'bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard backdrop-blur-sm'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {summonData.reasonType === 'other' && (
                  <textarea
                    value={summonData.customReason}
                    onChange={(e) => setSummonData({ ...summonData, customReason: e.target.value })}
                    placeholder={t('writeSummonReasonHere')}
                    className="w-full p-4 border rounded-2xl font-bold mt-2 h-20 resize-none outline-none transition-colors text-sm bg-bgCard border-borderColor text-textPrimary focus:border-danger placeholder:text-textSecondary backdrop-blur-md"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {availableProceduresList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleProcedure(p.id)}
                    className={`p-2 rounded-lg text-[10px] font-bold border transition-all ${takenProcedures.includes(p.id) ? 'bg-primary/20 border-primary text-primary backdrop-blur-sm' : 'bg-bgSoft border-borderColor text-textSecondary hover:bg-bgCard backdrop-blur-sm'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">{t('issueDateLabel')}</label>
                  <input type="date" value={summonData.issueDate} onChange={(e) => setSummonData({ ...summonData, issueDate: e.target.value })} className="w-full p-3 border rounded-xl text-xs font-bold outline-none bg-bgCard border-borderColor text-textPrimary focus:border-danger backdrop-blur-md" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">{t('attendanceDateLabel')}</label>
                  <input type="date" value={summonData.date} onChange={(e) => setSummonData({ ...summonData, date: e.target.value })} className="w-full p-3 border rounded-xl text-xs font-bold outline-none bg-bgCard border-borderColor text-textPrimary focus:border-danger backdrop-blur-md" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-textSecondary">{t('timeLabel')}</label>
                  <input type="time" value={summonData.time} onChange={(e) => setSummonData({ ...summonData, time: e.target.value })} className="w-full p-3 border rounded-xl text-xs font-bold outline-none bg-bgCard border-borderColor text-textPrimary focus:border-danger backdrop-blur-md" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={openSummonPreview}
                  disabled={!summonStudentId}
                  className="w-full disabled:opacity-50 text-white px-6 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all bg-danger hover:bg-danger/80"
                >
                  <Icon3DEye className="w-5 h-5" /> {t('previewLetter')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ استخدام DrawerSheet لخيارات الشهادة */}
      <DrawerSheet isOpen={showCertSettingsModal} onClose={() => setShowCertSettingsModal(false)} dir={dir} mode="bottom">
        <div className="text-center p-6 bg-bgCard border-borderColor flex flex-col h-full w-full">
          <h3 className="font-black text-lg mb-4 text-textPrimary">{t('certificateSettingsTitle')}</h3>
          <div className="space-y-3">
            <input type="text" value={tempCertSettings.title} onChange={(e) => setTempCertSettings({ ...tempCertSettings, title: e.target.value })} className="w-full p-3 border rounded-xl font-bold outline-none transition-colors bg-bgSoft border-borderColor text-textPrimary focus:border-primary placeholder:text-textSecondary" placeholder={t('certificateTitlePlaceholder')} />
            <textarea value={tempCertSettings.bodyText} onChange={(e) => setTempCertSettings({ ...tempCertSettings, bodyText: e.target.value })} className="w-full p-3 border rounded-xl font-bold h-24 outline-none transition-colors resize-none bg-bgSoft border-borderColor text-textPrimary focus:border-primary placeholder:text-textSecondary" placeholder={t('certificateBodyPlaceholder')} />
            <button onClick={() => { setCertificateSettings(tempCertSettings); setShowCertSettingsModal(false); }} className="w-full py-3 rounded-xl font-black shadow-lg active:scale-95 transition-all bg-primary hover:bg-primary/80 text-white">{t('saveBtn')}</button>
          </div>
        </div>
      </DrawerSheet>

    </div>
  );
};

export default Reports;