import React, { useState, useMemo, useEffect } from 'react';
import { Printer, FileSpreadsheet, User, Award, BarChart3, Settings, FileWarning, FileText, Loader2, Layers, ArrowRight, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import StudentReport from './StudentReport';
import Modal from './Modal';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';

interface ReportsProps {
    initialTab?: 'student_report' | 'grades_record' | 'certificates' | 'summon';
}

const DEFAULT_CERT_SETTINGS = {
    title: 'شهادة تقدير',
    bodyText: 'يسرنا تكريم الطالب/الطالبة لتفوقه الدراسي وتميزه في مادة...',
    showDefaultDesign: true,
    backgroundImage: ''
};

// --- Helper: Read grading settings globally ---
const getGradingSettings = () => {
    const saved = localStorage.getItem('rased_grading_settings');
    return saved ? JSON.parse(saved) : { totalScore: 100, finalExamWeight: 40, finalExamName: 'الامتحان النهائي' };
};

const PrintPreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; content: React.ReactNode; landscape?: boolean; }> = ({ isOpen, onClose, title, content, landscape }) => {
    const [isPrinting, setIsPrinting] = useState(false);
    const handlePrint = async () => {
        const element = document.getElementById('preview-content-area');
        if (!element) return;
        setIsPrinting(true);
        const scrollContainer = document.getElementById('preview-scroll-container');
        if (scrollContainer) scrollContainer.scrollTop = 0;
        
        const opt = { margin: [0, 0, 0, 0], filename: `${title.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: landscape ? 1123 : 794 }, jsPDF: { unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' }, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } };
        try {
            const worker = html2pdf().set(opt).from(element).toPdf();
            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = await worker.output('datauristring');
                const base64Data = pdfBase64.split(',')[1];
                const result = await Filesystem.writeFile({ path: opt.filename, data: base64Data, directory: Directory.Cache });
                await Share.share({ title: title, url: result.uri, dialogTitle: 'مشاركة التقرير' });
            } else { worker.save(); }
        } catch (e) { console.error("Print Error:", e); alert('حدث خطأ أثناء إنشاء ملف PDF.'); } finally { setIsPrinting(false); }
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-white/10 shrink-0 shadow-xl safe-area-top"><div className="flex items-center gap-3"><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowRight className="w-6 h-6" /></button><div><h3 className="font-bold text-lg">{title}</h3><p className="text-xs text-slate-400 font-mono">{landscape ? 'A4 Landscape' : 'A4 Portrait'}</p></div></div><button onClick={handlePrint} disabled={isPrinting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95">{isPrinting ? <Loader2 className="animate-spin w-5 h-5" /> : <Printer className="w-5 h-5" />} {isPrinting ? 'جاري المعالجة...' : 'تصدير ومشاركة'}</button></div>
            <div id="preview-scroll-container" className="flex-1 overflow-auto bg-slate-800 p-4 md:p-8 flex justify-center cursor-default"><div id="preview-content-area" className="bg-white text-black shadow-2xl origin-top" style={{ width: landscape ? '297mm' : '210mm', minHeight: landscape ? '210mm' : '297mm', padding: '0', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', backgroundColor: '#ffffff', color: '#000000', boxSizing: 'border-box' }}>{content}</div></div>
        </div>
    );
};

// =======================
// TEMPLATES (Dynamic Update)
// =======================

const GradesTemplate = ({ students, tools, teacherInfo, semester, gradeClass }: any) => { 
    const settings = getGradingSettings();
    const finalExamName = settings.finalExamName.trim();
    const finalWeight = settings.finalExamWeight;
    const continuousWeight = settings.totalScore - finalWeight;

    // Filter tools for template (exclude final exam from continuous columns)
    const continuousTools = tools.filter((t: any) => t.name.trim() !== finalExamName);
    
    return (
        <div className="w-full text-black bg-white p-10 print-content">
            <div className="text-center mb-6 border-b-2 border-black pb-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-right text-sm font-bold leading-relaxed"><p>سلطنة عمان</p><p>وزارة التربية والتعليم</p></div>
                    <div><h1 className="text-2xl font-black underline">سجل درجات الطلاب</h1></div>
                    <div className="text-left text-sm font-bold leading-relaxed"><p>المادة: {teacherInfo?.subject || '........'}</p><p>الصف: {gradeClass}</p></div>
                </div>
            </div>
            <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-black p-1 w-8 text-center">م</th>
                        <th className="border border-black p-1 text-right w-48">الاسم</th>
                        {continuousTools.map((t: any) => <th key={t.id} className="border border-black p-1 bg-orange-50 text-center">{t.name}</th>)}
                        <th className="border border-black p-1 bg-blue-100 text-center font-bold">المجموع ({continuousWeight})</th>
                        {finalWeight > 0 && <th className="border border-black p-1 bg-pink-100 text-center font-bold">{finalExamName} ({finalWeight})</th>}
                        <th className="border border-black p-1 bg-gray-300 text-center font-black">الكلي ({settings.totalScore})</th>
                        <th className="border border-black p-1 text-center">الرمز</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((s: any, i: number) => { 
                        const semGrades = (s.grades || []).filter((g: any) => (g.semester || '1') === semester); 
                        let contSum = 0; 
                        const contCells = continuousTools.map((tool: any) => { 
                            const g = semGrades.find((r: any) => r.category.trim() === tool.name.trim()); 
                            const val = g ? Number(g.score) : 0; 
                            contSum += val; 
                            return <td key={tool.id} className="border border-black p-1 text-center font-medium">{g ? g.score : '-'}</td>; 
                        }); 
                        
                        let finalVal = 0;
                        let finalCell = null;
                        if (finalWeight > 0) {
                            const finalG = semGrades.find((r: any) => r.category.trim() === finalExamName);
                            finalVal = finalG ? Number(finalG.score) : 0;
                            finalCell = <td className="border border-black p-1 text-center font-bold bg-pink-50">{finalG ? finalG.score : '-'}</td>;
                        }

                        const total = contSum + finalVal; 
                        
                        const getSymbol = (sc: number) => { 
                            const percent = (sc / settings.totalScore) * 100;
                            if (percent >= 90) return 'أ'; if (percent >= 80) return 'ب'; if (percent >= 65) return 'ج'; if (percent >= 50) return 'د'; return 'هـ'; 
                        }; 
                        
                        return (
                            <tr key={s.id} style={{ pageBreakInside: 'avoid' }}>
                                <td className="border border-black p-1 text-center">{i + 1}</td>
                                <td className="border border-black p-1 font-bold whitespace-nowrap">{s.name}</td>
                                {contCells}
                                <td className="border border-black p-1 text-center font-bold bg-blue-50">{contSum}</td>
                                {finalWeight > 0 && finalCell}
                                <td className="border border-black p-1 text-center font-black bg-gray-100">{total}</td>
                                <td className="border border-black p-1 text-center font-bold">{getSymbol(total)}</td>
                            </tr>
                        ); 
                    })}
                </tbody>
            </table>
            <div className="mt-8 flex justify-between px-16 font-bold text-sm"><div className="text-center"><p className="mb-8">معلم المادة</p><p>{teacherInfo?.name}</p></div><div className="text-center"><p className="mb-8">يعتمد مدير المدرسة</p><p>........................</p></div></div>
        </div>
    ); 
};

const CertificatesTemplate = ({ students, settings, teacherInfo }: any) => { 
    const safeSettings = settings || DEFAULT_CERT_SETTINGS; const title = safeSettings.title || 'شهادة شكر وتقدير'; const rawBody = safeSettings.bodyText || 'يسرنا تكريم الطالب...'; const hasImage = !!safeSettings.backgroundImage; 
    const containerStyle: React.CSSProperties = { width: '100%', height: '210mm', position: 'relative', backgroundColor: '#ffffff', color: '#000000', pageBreakAfter: 'always', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...(hasImage ? { backgroundImage: `url('${safeSettings.backgroundImage}')`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' } : { border: '10px double #047857' }) }; 
    if (!students || students.length === 0) return <div className="p-10 text-center text-black">لا يوجد طلاب</div>; 
    return (<div className="w-full text-black bg-white">{students.map((s: any) => { const safeName = `<span style="color:#b91c1c; font-weight:900; margin:0 5px; font-size: 1.2em;">${s.name}</span>`; const processedBody = rawBody.replace(/(الطالبة|الطالب)/g, ` ${safeName} `); return (<div key={s.id} style={containerStyle} className="cert-page"><div style={{ width: hasImage ? '90%' : '100%', height: hasImage ? '85%' : '100%', backgroundColor: hasImage ? 'rgba(255,255,255,0.95)' : 'transparent', borderRadius: '20px', padding: '40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center', border: hasImage ? '1px solid rgba(0,0,0,0.1)' : 'none', boxShadow: hasImage ? '0 10px 30px rgba(0,0,0,0.1)' : 'none' }}><div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', width:'100%'}}><div style={{textAlign:'right', fontSize:'14px', fontWeight:'bold', lineHeight:'1.6'}}><p style={{margin:0}}>سلطنة عمان</p><p style={{margin:0}}>وزارة التربية والتعليم</p><p style={{margin:0}}>مدرسة {teacherInfo?.school || '................'}</p></div><div>{teacherInfo?.ministryLogo ? (<img src={teacherInfo.ministryLogo} style={{height:'80px', objectFit:'contain'}} alt="Logo" />) : (<div style={{height:'80px', width:'80px', border:'2px dashed #ccc', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px'}}>شعار</div>)}</div><div style={{textAlign:'left', fontSize:'14px', fontWeight:'bold', lineHeight:'1.6', visibility:'hidden'}}><p>مساحة فارغة للتوازن</p></div></div><div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'20px 0'}}><h1 style={{fontSize:'64px', fontWeight:'900', color:'#047857', marginBottom:'40px', fontFamily:'Tajawal', letterSpacing:'-1px'}}>{title}</h1><div style={{fontSize:'26px', lineHeight:'2', fontWeight:'600', color:'#374151', maxWidth:'95%'}} dangerouslySetInnerHTML={{ __html: processedBody }} /></div><div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'30px', width:'100%', padding:'0 40px'}}><div style={{textAlign:'center'}}><p style={{fontWeight:'bold', fontSize:'18px', marginBottom:'50px', color:'#000'}}>معلم المادة</p><p style={{fontWeight:'900', fontSize:'22px', color:'#000'}}>{teacherInfo?.name}</p></div><div style={{textAlign:'center'}}>{teacherInfo?.stamp && <img src={teacherInfo.stamp} style={{width:'140px', opacity:0.8, mixBlendMode:'multiply', transform:'rotate(-5deg)'}} alt="Stamp" />}</div><div style={{textAlign:'center'}}><p style={{fontWeight:'bold', fontSize:'18px', marginBottom:'50px', color:'#000'}}>مدير المدرسة</p><p style={{fontWeight:'900', fontSize:'22px', color:'#000'}}>....................</p></div></div></div></div>); })}</div>); 
};

const SummonTemplate = ({ student, teacherInfo, data }: any) => { 
    if (!student) return <div className="p-10 text-center">خطأ: بيانات الطالب غير متوفرة</div>; 
    return (<div className="w-full text-black bg-white p-16 font-serif text-right h-full" dir="rtl"><div className="text-center mb-12 border-b-2 border-black pb-6"><div className="flex justify-center mb-4">{teacherInfo?.ministryLogo ? <img src={teacherInfo.ministryLogo} className="h-24 object-contain" /> : <div className="w-20 h-20 bg-slate-100 rounded-full"></div>}</div><h3 className="font-bold text-lg mb-1">سلطنة عمان - وزارة التربية والتعليم</h3><h3 className="font-bold text-lg">مدرسة {teacherInfo?.school || '................'}</h3></div><div className="bg-gray-50 border border-gray-300 p-6 rounded-2xl mb-10 flex justify-between items-center shadow-sm"><div><p className="text-gray-500 text-sm font-bold mb-1">إلى الفاضل ولي أمر الطالب:</p><h2 className="text-2xl font-black text-slate-900">{student.name}</h2></div><div className="text-left"><p className="font-bold text-base">الصف: {data.className}</p><p className="font-bold text-base text-gray-500">التاريخ: {data.issueDate}</p></div></div><h2 className="text-center text-4xl font-black underline mb-12">استدعاء ولي أمر</h2><div className="text-2xl leading-loose text-justify mb-10 px-4"><p className="mb-4">السلام عليكم ورحمة الله وبركاته،،،</p><p>نود إفادتكم بضرورة الحضور إلى المدرسة يوم <strong>{data.date}</strong> الساعة <strong>{data.time}</strong>، وذلك لمناقشة الأمر التالي:</p></div><div className="bg-white border-2 border-black p-8 text-center text-2xl font-bold rounded-2xl mb-12 shadow-sm min-h-[120px] flex items-center justify-center">{data.reason}</div>{data.procedures && data.procedures.length > 0 && (<div className="mb-12 border border-dashed border-gray-400 p-6 rounded-xl bg-slate-50"><p className="font-bold underline mb-4 text-xl">الإجراءات المتخذة مسبقاً:</p><ul className="list-disc pr-8 text-xl space-y-2">{data.procedures.map((p:any) => <li key={p}>{p}</li>)}</ul></div>)}<p className="text-xl mt-12 mb-20 text-center font-bold">شاكرين لكم حسن تعاونكم واهتمامكم بمصلحة الطالب.</p><div className="flex justify-between items-end px-10 mt-auto"><div className="text-center"><p className="font-bold text-xl mb-8">معلم المادة</p><p className="text-2xl font-black">{teacherInfo?.name}</p></div><div className="text-center">{teacherInfo?.stamp && <img src={teacherInfo.stamp} className="w-40 opacity-80 mix-blend-multiply" />}</div><div className="text-center"><p className="font-bold text-xl mb-8">مدير المدرسة</p><p className="text-2xl font-black">....................</p></div></div></div>); 
};

const ClassReportsTemplate = ({ students, teacherInfo, semester, assessmentTools }: any) => { 
    const settings = getGradingSettings();
    const finalExamName = settings.finalExamName.trim();
    if (!students || students.length === 0) return <div className="text-black text-center p-10">لا توجد بيانات طلاب لعرضها</div>; 
    
    // Filter tools based on settings
    const continuousTools = assessmentTools ? assessmentTools.filter((t: any) => t.name.trim() !== finalExamName) : [];
    const finalTool = assessmentTools ? assessmentTools.find((t: any) => t.name.trim() === finalExamName) : null; 
    
    return (<div className="w-full text-black bg-white">{students.map((student: any) => { 
        const behaviors = (student.behaviors || []).filter((b: any) => !b.semester || b.semester === (semester || '1')); 
        const grades = (student.grades || []).filter((g: any) => !g.semester || g.semester === (semester || '1')); 
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
        const totalPositive = behaviors.filter((b: any) => b.type === 'positive').reduce((acc: number, b: any) => acc + b.points, 0); 
        const totalNegative = behaviors.filter((b: any) => b.type === 'negative').reduce((acc: number, b: any) => acc + Math.abs(b.points), 0); 
        
        return (<div key={student.id} className="w-full min-h-[297mm] p-10 border-b border-gray-300 page-break-after-always relative bg-white" style={{ pageBreakAfter: 'always' }}><div className="flex justify-between items-start mb-8 border-b-2 border-slate-200 pb-4"><div className="text-right w-1/3 text-sm font-bold"><p>سلطنة عمان</p><p>وزارة التربية والتعليم</p><p>مدرسة {teacherInfo?.school}</p></div><div className="text-center w-1/3">{teacherInfo?.ministryLogo && <img src={teacherInfo.ministryLogo} className="h-16 object-contain mx-auto" />}<h2 className="text-xl font-black underline mt-2 text-black">تقرير مستوى طالب</h2></div><div className="text-left w-1/3 text-sm font-bold"><p>العام: {teacherInfo?.academicYear}</p><p>الفصل: {semester === '1' ? 'الأول' : 'الثاني'}</p></div></div><div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 flex justify-between items-center text-black"><div><h3 className="text-2xl font-black mb-1">{student.name}</h3><p className="text-base text-slate-600 font-bold">الصف: {student.classes[0]}</p></div><div className="flex gap-4 text-xs font-bold"><span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded">إيجابي: {totalPositive}</span><span className="bg-rose-100 text-rose-800 px-3 py-1 rounded">سلبي: {totalNegative}</span></div></div><h3 className="font-bold text-lg mb-3 border-b-2 border-black inline-block">التحصيل الدراسي</h3><table className="w-full border-collapse border border-black text-sm mb-8"><thead><tr className="bg-gray-100"><th className="border border-black p-3 text-right">المادة</th><th className="border border-black p-3 text-center">أداة التقويم</th><th className="border border-black p-3 text-center w-24">الدرجة</th></tr></thead><tbody>{continuousTools.map((t: any) => { const g = grades.find((r: any) => r.category.trim() === t.name.trim()); return <tr key={t.id}><td className="border border-black p-3 font-bold">{teacherInfo?.subject}</td><td className="border border-black p-3 text-center">{t.name}</td><td className="border border-black p-3 text-center font-bold">{g ? g.score : '-'}</td></tr> })}{finalTool && (() => { const g = grades.find((r: any) => r.category.trim() === finalTool.name.trim()); return <tr><td className="border border-black p-3 font-bold">{teacherInfo?.subject}</td><td className="border border-black p-3 text-center bg-pink-50 font-bold">{finalTool.name}</td><td className="border border-black p-3 text-center font-black">{g ? g.score : '-'}</td></tr> })()}<tr className="bg-slate-200 font-bold"><td colSpan={2} className="border border-black p-3 text-right text-base">المجموع الكلي</td><td className="border border-black p-3 text-center text-lg font-black">{totalScore}</td></tr></tbody></table><div className="flex gap-6 mb-12"><div className="flex-1 border-2 border-slate-200 p-4 rounded-xl text-center"><p className="text-sm font-bold text-slate-500 mb-1">أيام الغياب</p><p className="text-3xl font-black text-rose-600">{absenceCount}</p></div><div className="flex-1 border-2 border-slate-200 p-4 rounded-xl text-center"><p className="text-sm font-bold text-slate-500 mb-1">مرات التسرب</p><p className="text-3xl font-black text-purple-600">{truantCount}</p></div></div><div className="flex justify-between items-end px-12 mt-auto"><div className="text-center"><p className="font-bold text-base mb-8">معلم المادة</p><p className="font-bold text-lg">{teacherInfo?.name}</p></div><div className="text-center">{teacherInfo?.stamp && <img src={teacherInfo.stamp} className="w-24 opacity-80 mix-blend-multiply" />}</div><div className="text-center"><p className="font-bold text-base mb-8">مدير المدرسة</p><p className="font-bold text-lg">........................</p></div></div></div>); })}</div>); 
};

// =================================================================================
// 3. UI (Main Component)
// =================================================================================
const Reports: React.FC<ReportsProps> = ({ initialTab }) => {
  const { students, setStudents, classes, teacherInfo, currentSemester, assessmentTools, certificateSettings, setCertificateSettings } = useApp();
  const [activeTab, setActiveTab] = useState<'student_report' | 'grades_record' | 'certificates' | 'summon'>(initialTab || 'student_report');

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
  
  const [tempCertSettings, setTempCertSettings] = useState(certificateSettings || DEFAULT_CERT_SETTINGS);
  
  const [summonGrade, setSummonGrade] = useState<string>('all');
  const [summonClass, setSummonClass] = useState<string>('');
  const [summonStudentId, setSummonStudentId] = useState<string>('');
  const [summonData, setSummonData] = useState({ date: new Date().toISOString().split('T')[0], time: '09:00', reasonType: 'absence', customReason: '', issueDate: new Date().toISOString().split('T')[0] });
  const [takenProcedures, setTakenProcedures] = useState<string[]>([]);

  const [previewData, setPreviewData] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; landscape?: boolean }>({ isOpen: false, title: '', content: null });

  // Helpers
  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      students.forEach(s => { if (s.grade) grades.add(s.grade); else if (s.classes[0]) { const match = s.classes[0].match(/^(\d+)/); if (match) grades.add(match[1]); } });
      if (grades.size === 0 && classes.length > 0) return ['عام']; return Array.from(grades).sort();
  }, [students, classes]);

  const getClassesForGrade = (grade: string) => grade === 'all' ? classes : classes.filter(c => c.startsWith(grade));
  const filteredStudentsForStudentTab = useMemo(() => students.filter(s => s.classes.includes(stClass)), [students, stClass]);
  const filteredStudentsForGrades = useMemo(() => students.filter(s => gradesClass === 'all' || s.classes.includes(gradesClass)), [students, gradesClass]);
  const filteredStudentsForCert = useMemo(() => students.filter(s => s.classes.includes(certClass)), [students, certClass]);
  const availableStudentsForSummon = useMemo(() => students.filter(s => s.classes.includes(summonClass)), [summonClass, students]);

  useEffect(() => { if(getClassesForGrade(stGrade).length > 0) setStClass(getClassesForGrade(stGrade)[0]); }, [stGrade]);
  useEffect(() => { if(getClassesForGrade(certGrade).length > 0) setCertClass(getClassesForGrade(certGrade)[0]); }, [certGrade]);
  useEffect(() => { if(getClassesForGrade(summonGrade).length > 0) setSummonClass(getClassesForGrade(summonGrade)[0]); }, [summonGrade]);
  useEffect(() => { if (certificateSettings) setTempCertSettings(certificateSettings); }, [certificateSettings]);

  const handleUpdateStudent = (updatedStudent: Student) => { setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s)); setViewingStudent(updatedStudent); };

  const getReasonText = () => {
    switch (summonData.reasonType) {
        case 'absence': return 'تكرار الغياب عن المدرسة وتأثيره على المستوى الدراسي';
        case 'truant': return 'التسرب المتكرر من الحصص الدراسية';
        case 'behavior': return 'مناقشة بعض السلوكيات الصادرة من الطالب';
        case 'level': return 'مناقشة تدني المستوى التحصيلي للطالب';
        case 'other': return summonData.customReason || '................................'; 
        default: return '';
    }
  };

  const availableProceduresList = ['تنبيه شفوي', 'تعهد خطي', 'اتصال هاتفي', 'إشعار واتساب', 'تحويل أخصائي'];
  const toggleProcedure = (proc: string) => setTakenProcedures(prev => prev.includes(proc) ? prev.filter(p => p !== proc) : [...prev, proc]);

  // Preview Functions (Corrected: No useApp inside)
  const openGradesPreview = () => {
    if (filteredStudentsForGrades.length === 0) return alert('لا يوجد طلاب');
    setPreviewData({ isOpen: true, title: 'سجل الدرجات', landscape: true, content: <GradesTemplate students={filteredStudentsForGrades} tools={assessmentTools} teacherInfo={teacherInfo} semester={currentSemester} gradeClass={gradesClass === 'all' ? 'الكل' : gradesClass} /> });
  };

  const openCertificatesPreview = () => {
    const targets = filteredStudentsForCert.filter(s => selectedCertStudents.includes(s.id));
    if (targets.length === 0) return;
    setPreviewData({ isOpen: true, title: 'شهادات التقدير', landscape: true, content: <CertificatesTemplate students={targets} settings={certificateSettings || DEFAULT_CERT_SETTINGS} teacherInfo={teacherInfo} /> });
  };

  const openSummonPreview = () => {
    const s = availableStudentsForSummon.find(st => st.id === summonStudentId);
    if (!s) return alert('اختر طالباً');
    setPreviewData({ isOpen: true, title: `استدعاء - ${s.name}`, landscape: false, content: <SummonTemplate student={s} teacherInfo={teacherInfo} data={{...summonData, reason: getReasonText(), className: summonClass, procedures: takenProcedures, issueDate: summonData.issueDate}} /> });
  };

  const openClassReportsPreview = () => {
      if (filteredStudentsForStudentTab.length === 0) return alert('لا يوجد طلاب في هذا الفصل');
      setPreviewData({ isOpen: true, title: `تقارير الصف ${stClass}`, landscape: false, content: <ClassReportsTemplate students={filteredStudentsForStudentTab} teacherInfo={teacherInfo} semester={currentSemester} assessmentTools={assessmentTools} /> });
  };

  const selectAllCertStudents = () => { if (selectedCertStudents.length === filteredStudentsForCert.length) { setSelectedCertStudents([]); } else { setSelectedCertStudents(filteredStudentsForCert.map(s => s.id)); } };
  const toggleCertStudent = (id: string) => { setSelectedCertStudents(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id] ); };

  if (viewingStudent) return <StudentReport student={viewingStudent} onUpdateStudent={handleUpdateStudent} currentSemester={currentSemester} teacherInfo={teacherInfo} onBack={() => setViewingStudent(null)} />;

  const tabs = [
      { id: 'student_report', label: 'تقرير طالب', icon: User },
      { id: 'grades_record', label: 'سجل الدرجات', icon: BarChart3 },
      { id: 'certificates', label: 'الشهادات', icon: Award },
      { id: 'summon', label: 'استدعاء', icon: FileWarning },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 relative font-sans animate-in fade-in duration-500">
      <PrintPreviewModal isOpen={previewData.isOpen} onClose={() => setPreviewData({...previewData, isOpen: false})} title={previewData.title} content={previewData.content} landscape={previewData.landscape} />
      
      {/* ================= HEADER ================= */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a8a] text-white rounded-b-[2.5rem] shadow-lg px-4 pt-[env(safe-area-inset-top)] pb-4 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 mt-4 px-2">
             <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20"><FileSpreadsheet className="w-6 h-6 text-white" /></div>
             <div><h1 className="text-xl font-black tracking-wide">مركز التقارير</h1><p className="text-[10px] text-blue-200 font-bold opacity-80">طباعة الكشوفات والشهادات</p></div>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
             {tabs.map(tab => {
                 const isActive = activeTab === tab.id;
                 return (<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${isActive ? 'bg-white text-[#1e3a8a] shadow-lg' : 'bg-white/10 text-blue-100 hover:bg-white/20'}`}><tab.icon className={`w-4 h-4 ${isActive ? 'text-[#1e3a8a]' : 'text-blue-200'}`} />{tab.label}</button>)
             })}
          </div>
      </div>

      {/* ================= CONTENT AREA ================= */}
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
          <div className="w-full h-[190px] shrink-0"></div>
          <div className="px-4 pb-24">
             <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 min-h-[400px] animate-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'student_report' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-2"><div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><User size={20}/></div><h3 className="font-black text-lg text-slate-800">تقرير الطالب الشامل</h3></div>
                        <div className="space-y-4">
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">{availableGrades.map(g => <button key={g} onClick={() => setStGrade(g)} className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${stGrade === g ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>صف {g}</button>)}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select value={stClass} onChange={(e) => setStClass(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors text-sm">{getClassesForGrade(stGrade).map(c => <option key={c} value={c}>{c}</option>)}</select>
                                <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors text-sm"><option value="">اختر طالباً...</option>{filteredStudentsForStudentTab.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-4 mt-4 flex-wrap">
                            <button onClick={openClassReportsPreview} disabled={!stClass || filteredStudentsForStudentTab.length === 0} className="bg-slate-800 disabled:opacity-50 text-white px-5 py-3.5 rounded-xl font-black text-xs shadow-lg hover:bg-slate-700 flex items-center gap-2 active:scale-95 transition-all flex-1 justify-center"><Layers size={16} /> طباعة الفصل كاملاً</button>
                            <button onClick={() => { if(selectedStudentId) { const s = students.find(st=>st.id===selectedStudentId); if(s) setViewingStudent(s); }}} disabled={!selectedStudentId} className="bg-indigo-600 disabled:opacity-50 text-white px-6 py-3.5 rounded-xl font-black text-xs shadow-lg hover:bg-indigo-700 flex items-center gap-2 active:scale-95 transition-all flex-1 justify-center"><FileText size={16} /> معاينة فردية</button>
                        </div>
                    </div>
                )}
                {activeTab === 'grades_record' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-2"><div className="p-2 bg-amber-50 rounded-xl text-amber-600"><BarChart3 size={20}/></div><h3 className="font-black text-lg text-slate-800">سجل الدرجات</h3></div>
                        <div className="space-y-4">
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">{availableGrades.map(g => <button key={g} onClick={() => { setGradesGrade(g); setGradesClass('all'); }} className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${gradesGrade === g ? 'bg-amber-600 text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>صف {g}</button>)}</div>
                            <select value={gradesClass} onChange={(e) => setGradesClass(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-500 transition-colors text-sm"><option value="all">الكل</option>{getClassesForGrade(gradesGrade).map(c => <option key={c} value={c}>{c}</option>)}</select>
                        </div>
                        <div className="flex justify-end pt-4"><button onClick={openGradesPreview} className="w-full bg-amber-500 text-white px-6 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-amber-600 active:scale-95 transition-all"><Printer size={18} /> معاينة وطباعة السجل</button></div>
                    </div>
                )}
                {activeTab === 'certificates' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-50 mb-2">
                            <div className="flex items-center gap-3"><div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Award size={20}/></div><h3 className="font-black text-lg text-slate-800">شهادات التقدير</h3></div>
                            <button onClick={() => setShowCertSettingsModal(true)} className="p-2 bg-slate-50 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"><Settings size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">{availableGrades.map(g => <button key={g} onClick={() => setCertGrade(g)} className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${certGrade === g ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>صف {g}</button>)}</div>
                            <select value={certClass} onChange={(e) => { setCertClass(e.target.value); setSelectedCertStudents([]); }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors text-sm">{getClassesForGrade(certGrade).map(c => <option key={c} value={c}>{c}</option>)}</select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between px-2"><label className="text-xs font-bold text-slate-500">الطلاب ({selectedCertStudents.length})</label><button onClick={selectAllCertStudents} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">تحديد الكل</button></div>
                            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1 custom-scrollbar">
                                {filteredStudentsForCert.map(s => (<button key={s.id} onClick={() => toggleCertStudent(s.id)} className={`p-3 rounded-xl border text-xs font-bold flex justify-between transition-all ${selectedCertStudents.includes(s.id) ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s.name} {selectedCertStudents.includes(s.id) && <Check size={14}/>}</button>))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-4"><button onClick={openCertificatesPreview} disabled={selectedCertStudents.length === 0} className="w-full bg-emerald-600 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"><Printer size={18} /> معاينة وطباعة الشهادات</button></div>
                    </div>
                )}
                {activeTab === 'summon' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-2"><div className="p-2 bg-rose-50 rounded-xl text-rose-600"><FileWarning size={20}/></div><h3 className="font-black text-lg text-slate-800">استدعاء ولي أمر</h3></div>
                        <div className="grid grid-cols-2 gap-4">
                             <select value={summonClass} onChange={(e) => setSummonClass(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-rose-500 transition-colors text-sm">{getClassesForGrade(summonGrade).map(c => <option key={c} value={c}>{c}</option>)}</select>
                             <select value={summonStudentId} onChange={(e) => setSummonStudentId(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-rose-500 transition-colors text-sm"><option value="">الطالب...</option>{availableStudentsForSummon.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">{[{ id: 'absence', label: 'غياب' }, { id: 'truant', label: 'تسرب' }, { id: 'behavior', label: 'سلوك' }, { id: 'level', label: 'مستوى' }, { id: 'other', label: 'أخرى' }].map((r) => (<button key={r.id} onClick={() => setSummonData({...summonData, reasonType: r.id})} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${summonData.reasonType === r.id ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{r.label}</button>))}</div>
                            {summonData.reasonType === 'other' && (<textarea value={summonData.customReason} onChange={(e) => setSummonData({...summonData, customReason: e.target.value})} placeholder="اكتب سبب الاستدعاء هنا..." className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-bold text-slate-800 mt-2 h-20 resize-none outline-none focus:border-rose-500 transition-colors text-sm"/>)}
                        </div>
                        <div className="grid grid-cols-2 gap-2">{availableProceduresList.map(p => <button key={p} onClick={() => toggleProcedure(p)} className={`p-2 rounded-lg text-[10px] font-bold border transition-all ${takenProcedures.includes(p) ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{p}</button>)}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">تاريخ الإصدار</label><input type="date" value={summonData.issueDate} onChange={(e) => setSummonData({...summonData, issueDate: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-rose-500" /></div>
                             <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">تاريخ الحضور</label><input type="date" value={summonData.date} onChange={(e) => setSummonData({...summonData, date: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-rose-500" /></div>
                             <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">الوقت</label><input type="time" value={summonData.time} onChange={(e) => setSummonData({...summonData, time: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-rose-500" /></div>
                        </div>
                        <div className="flex justify-end pt-4"><button onClick={openSummonPreview} disabled={!summonStudentId} className="w-full bg-rose-600 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-rose-700 active:scale-95 transition-all"><Eye size={18} /> معاينة الخطاب</button></div>
                    </div>
                )}
             </div>
          </div>
      </div>

      <Modal isOpen={showCertSettingsModal} onClose={() => setShowCertSettingsModal(false)} className="max-w-md rounded-[2rem]">
          <div className="text-center p-4">
              <h3 className="font-black text-lg mb-4 text-slate-800">إعدادات الشهادة</h3>
              <div className="space-y-3">
                  <input type="text" value={tempCertSettings.title} onChange={(e) => setTempCertSettings({...tempCertSettings, title: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-colors" placeholder="عنوان الشهادة" />
                  <textarea value={tempCertSettings.bodyText} onChange={(e) => setTempCertSettings({...tempCertSettings, bodyText: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 h-24 outline-none focus:border-indigo-500 transition-colors resize-none" placeholder="نص الشهادة" />
                  <button onClick={() => { setCertificateSettings(tempCertSettings); setShowCertSettingsModal(false); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">حفظ</button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default Reports;
