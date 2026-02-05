
import React, { useState, useMemo, useEffect } from 'react';
import { Printer, FileSpreadsheet, User, Award, BarChart3, Check, Settings, FileWarning, ChevronDown, FileText, Loader2, ListChecks, Eye, Layers, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import StudentReport from './StudentReport';
import Modal from './Modal';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import html2pdf from 'html2pdf.js';

// تعريف الإعدادات الافتراضية للشهادة (حماية من الانهيار)
const DEFAULT_CERT_SETTINGS = {
    title: 'شهادة تقدير',
    bodyText: 'يسرنا تكريم الطالب/الطالبة لتفوقه الدراسي وتميزه في مادة...',
    showDefaultDesign: true
};

// --- 1. محرك الطباعة والمعاينة ---
const PrintPreviewModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    content: React.ReactNode; 
    landscape?: boolean;
}> = ({ isOpen, onClose, title, content, landscape }) => {
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async () => {
        const element = document.getElementById('preview-content-area');
        if (!element) return;

        setIsPrinting(true);
        const scrollContainer = document.getElementById('preview-scroll-container');
        if (scrollContainer) scrollContainer.scrollTop = 0;

        const opt = {
            margin: 0,
            filename: `${title.replace(/\s/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                backgroundColor: '#ffffff', // ضمان خلفية بيضاء
                windowWidth: landscape ? 1123 : 794
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: landscape ? 'landscape' : 'portrait' 
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        try {
            const worker = html2pdf().set(opt).from(element).toPdf();
            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = await worker.output('datauristring');
                const base64Data = pdfBase64.split(',')[1];
                const result = await Filesystem.writeFile({ 
                    path: opt.filename, 
                    data: base64Data, 
                    directory: Directory.Cache 
                });
                await Share.share({ title: title, url: result.uri });
            } else {
                worker.save();
            }
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء الطباعة.');
        } finally {
            setIsPrinting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-white/10 shrink-0 shadow-xl">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowRight className="w-6 h-6" /></button>
                    <div>
                        <h3 className="font-bold text-lg">{title}</h3>
                        <p className="text-xs text-slate-400">{landscape ? 'أفقي (Landscape)' : 'عمودي (Portrait)'}</p>
                    </div>
                </div>
                <button onClick={handlePrint} disabled={isPrinting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all">
                    {isPrinting ? <Loader2 className="animate-spin w-5 h-5" /> : <Printer className="w-5 h-5" />} 
                    {isPrinting ? 'جاري التحويل...' : 'تصدير PDF'}
                </button>
            </div>
            <div id="preview-scroll-container" className="flex-1 overflow-auto bg-slate-800 p-4 md:p-8 flex justify-center">
                <div id="preview-content-area" className="bg-white text-black shadow-2xl origin-top"
                    style={{ width: landscape ? '297mm' : '210mm', minHeight: landscape ? '210mm' : '297mm', padding: '0', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', backgroundColor: '#ffffff', color: '#000000' }}>
                    {content}
                </div>
            </div>
        </div>
    );
};

// --- 2. القوالب (Templates) ---
// (No changes to templates, omitting for brevity as they are unchanged)
const GradesTemplate = ({ students, tools, finalTool, teacherInfo, semester, gradeClass }: any) => { /* ... existing code ... */ return <div className="p-10">...</div>; };
const CertificatesTemplate = ({ students, settings, teacherInfo }: any) => { /* ... existing code ... */ return <div>...</div>; };
const SummonTemplate = ({ student, teacherInfo, data }: any) => { /* ... existing code ... */ return <div>...</div>; };
const ClassReportsTemplate = ({ students, teacherInfo, semester, assessmentTools }: any) => { /* ... existing code ... */ return <div>...</div>; };

// --- المكون الرئيسي ---
const Reports: React.FC = () => {
  const { students, setStudents, classes, teacherInfo, currentSemester, assessmentTools, certificateSettings, setCertificateSettings } = useApp();
  const [activeTab, setActiveTab] = useState<'student_report' | 'grades_record' | 'certificates' | 'summon'>('student_report');

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
  
  // 🛑 تهيئة الحالة الافتراضية لمنع الانهيار
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
      students.forEach(s => {
          if (s.grade) grades.add(s.grade); else if (s.classes[0]) { const match = s.classes[0].match(/^(\d+)/); if (match) grades.add(match[1]); }
      });
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

  // تحديث الإعدادات عند التغيير لمنع التعارض
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

  // --- دوال فتح المعاينة ---
  const openGradesPreview = () => {
    if (filteredStudentsForGrades.length === 0) return alert('لا يوجد طلاب');
    const finalExamName = "الامتحان النهائي";
    const continuousTools = assessmentTools.filter(t => t.name.trim() !== finalExamName);
    const finalTool = assessmentTools.find(t => t.name.trim() === finalExamName);
    setPreviewData({ isOpen: true, title: 'سجل الدرجات', landscape: true, content: <GradesTemplate students={filteredStudentsForGrades} tools={continuousTools} finalTool={finalTool} teacherInfo={teacherInfo} semester={currentSemester} gradeClass={gradesClass === 'all' ? 'الكل' : gradesClass} /> });
  };

  const openCertificatesPreview = () => {
    const targets = filteredStudentsForCert.filter(s => selectedCertStudents.includes(s.id));
    if (targets.length === 0) return;
    setPreviewData({ 
        isOpen: true, 
        title: 'شهادات التقدير', 
        landscape: true, 
        // تمرير إعدادات آمنة
        content: <CertificatesTemplate students={targets} settings={certificateSettings || DEFAULT_CERT_SETTINGS} teacherInfo={teacherInfo} /> 
    });
  };

  const openSummonPreview = () => {
    const s = availableStudentsForSummon.find(st => st.id === summonStudentId);
    if (!s) return alert('اختر طالباً');
    setPreviewData({ isOpen: true, title: `استدعاء - ${s.name}`, landscape: false, content: <SummonTemplate student={s} teacherInfo={teacherInfo} data={{...summonData, reason: getReasonText(), className: summonClass, procedures: takenProcedures, issueDate: summonData.issueDate}} /> });
  };

  const openClassReportsPreview = () => {
      if (filteredStudentsForStudentTab.length === 0) return alert('لا يوجد طلاب في هذا الفصل');
      setPreviewData({ 
          isOpen: true, 
          title: `تقارير الصف ${stClass}`, 
          landscape: false, 
          content: <ClassReportsTemplate students={filteredStudentsForStudentTab} teacherInfo={teacherInfo} semester={currentSemester} assessmentTools={assessmentTools} /> 
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
      setSelectedCertStudents(prev => 
          prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
      );
  };

  if (viewingStudent) return <StudentReport student={viewingStudent} onUpdateStudent={handleUpdateStudent} currentSemester={currentSemester} teacherInfo={teacherInfo} onBack={() => setViewingStudent(null)} />;

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-6 pb-20">
      <PrintPreviewModal isOpen={previewData.isOpen} onClose={() => setPreviewData({...previewData, isOpen: false})} title={previewData.title} content={previewData.content} landscape={previewData.landscape} />
      
      {/* 2️⃣ New Royal Blue Header */}
      <header className="bg-[#1e3a8a] text-white pt-8 pb-6 px-6 rounded-b-[2.5rem] shadow-lg relative z-30 -mx-4 -mt-4 mb-4">
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
                      <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                      <h1 className="text-2xl font-black tracking-wide">مركز التقارير</h1>
                      <p className="text-[10px] text-blue-200 font-bold opacity-80">الكشوفات • الشهادات • الاستدعاءات</p>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[{id:'student_report', label:'تقرير طالب', icon:User}, {id:'grades_record', label:'سجل الدرجات', icon:BarChart3}, {id:'certificates', label:'الشهادات', icon:Award}, {id:'summon', label:'استدعاء', icon:FileWarning}].map((item) => (
                <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id as any)} 
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${activeTab === item.id ? 'bg-white text-[#1e3a8a] shadow-md border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === item.id ? 'bg-[#1e3a8a]/10 text-[#1e3a8a]' : 'bg-white/10 text-white'}`}><item.icon size={18} /></div>
                    <span className="block font-black text-xs">{item.label}</span>
                </button>
            ))}
          </div>
      </header>

      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 min-h-[400px] shadow-xl relative">
        {activeTab === 'student_report' && (
            <div className="space-y-6">
                 <div className="pb-4 border-b border-slate-100 flex items-center gap-3"><div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><User size={20}/></div><div><h3 className="font-black text-lg text-slate-800">تقرير الطالب الشامل</h3></div></div>
                 <div className="space-y-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">{availableGrades.map(g => <button key={g} onClick={() => setStGrade(g)} className={`px-4 py-1.5 text-xs font-bold rounded-xl border ${stGrade === g ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>صف {g}</button>)}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <select value={stClass} onChange={(e) => setStClass(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700">{getClassesForGrade(stGrade).map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700"><option value="">اختر طالباً...</option>{filteredStudentsForStudentTab.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    </div>
                 </div>
                 <div className="flex gap-4 justify-end pt-6 border-t border-slate-100 mt-4">
                     <button onClick={openClassReportsPreview} disabled={!stClass} className="bg-slate-800 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-lg hover:bg-slate-700 flex items-center gap-2"><Layers size={16} /> طباعة تقارير الفصل كاملاً</button>
                     <button onClick={() => { if(selectedStudentId) { const s = students.find(st=>st.id===selectedStudentId); if(s) setViewingStudent(s); }}} disabled={!selectedStudentId} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 flex items-center gap-2"><FileText size={16} /> معاينة فردية</button>
                 </div>
            </div>
        )}
        {activeTab === 'grades_record' && (
            <div className="space-y-6">
                <div className="pb-4 border-b border-slate-100 flex items-center gap-3"><h3 className="font-black text-lg text-slate-800">سجل الدرجات</h3></div>
                <div className="space-y-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">{availableGrades.map(g => <button key={g} onClick={() => { setGradesGrade(g); setGradesClass('all'); }} className={`px-4 py-1.5 text-xs font-bold rounded-xl border ${gradesGrade === g ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>صف {g}</button>)}</div>
                    <select value={gradesClass} onChange={(e) => setGradesClass(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700"><option value="all">الكل</option>{getClassesForGrade(gradesGrade).map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div className="flex justify-end pt-6"><button onClick={openGradesPreview} className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-amber-600"><Printer size={18} /> معاينة وطباعة السجل</button></div>
            </div>
        )}
        {activeTab === 'certificates' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100"><h3 className="font-black text-lg text-slate-800">شهادات التقدير</h3><button onClick={() => setShowCertSettingsModal(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600"><Settings size={18}/></button></div>
                <div className="space-y-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">{availableGrades.map(g => <button key={g} onClick={() => setCertGrade(g)} className={`px-4 py-1.5 text-xs font-bold rounded-xl border ${certGrade === g ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>صف {g}</button>)}</div>
                    <select value={certClass} onChange={(e) => { setCertClass(e.target.value); setSelectedCertStudents([]); }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700">{getClassesForGrade(certGrade).map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between px-2"><label className="text-xs font-bold text-slate-500">الطلاب ({selectedCertStudents.length})</label><button onClick={selectAllCertStudents} className="text-xs font-bold text-emerald-600">تحديد الكل</button></div>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {filteredStudentsForCert.map(s => (<button key={s.id} onClick={() => toggleCertStudent(s.id)} className={`p-3 rounded-xl border text-xs font-bold flex justify-between ${selectedCertStudents.includes(s.id) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 text-slate-600'}`}>{s.name} {selectedCertStudents.includes(s.id) && <Check size={14}/>}</button>))}
                    </div>
                </div>
                <div className="flex justify-end pt-6"><button onClick={openCertificatesPreview} disabled={selectedCertStudents.length === 0} className="bg-emerald-600 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-emerald-700"><Printer size={18} /> معاينة وطباعة الشهادات</button></div>
            </div>
        )}
        {activeTab === 'summon' && (
            <div className="space-y-6">
                <div className="pb-4 border-b border-slate-100 flex items-center gap-3"><div className="p-2 bg-rose-50 rounded-xl text-rose-600"><FileWarning size={20}/></div><h3 className="font-black text-lg text-slate-800">استدعاء ولي أمر</h3></div>
                <div className="grid grid-cols-2 gap-4">
                     <select value={summonClass} onChange={(e) => setSummonClass(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700">{getClassesForGrade(summonGrade).map(c => <option key={c} value={c}>{c}</option>)}</select>
                     <select value={summonStudentId} onChange={(e) => setSummonStudentId(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700"><option value="">الطالب...</option>{availableStudentsForSummon.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                </div>
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">{[{ id: 'absence', label: 'غياب' }, { id: 'truant', label: 'تسرب' }, { id: 'behavior', label: 'سلوك' }, { id: 'level', label: 'مستوى' }, { id: 'other', label: 'أخرى (اكتب السبب)' }].map((r) => (<button key={r.id} onClick={() => setSummonData({...summonData, reasonType: r.id})} className={`px-4 py-2 rounded-xl text-xs font-bold border ${summonData.reasonType === r.id ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600'}`}>{r.label}</button>))}</div>
                    {summonData.reasonType === 'other' && (<textarea value={summonData.customReason} onChange={(e) => setSummonData({...summonData, customReason: e.target.value})} placeholder="اكتب سبب الاستدعاء هنا..." className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl font-bold text-slate-800 mt-2 h-24 resize-none outline-none focus:border-rose-500 transition-colors animate-in fade-in"/>)}
                </div>
                <div className="grid grid-cols-2 gap-2">{availableProceduresList.map(p => <button key={p} onClick={() => toggleProcedure(p)} className={`p-2 rounded-lg text-xs font-bold border ${takenProcedures.includes(p) ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>{p}</button>)}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">تاريخ الإصدار</label><input type="date" value={summonData.issueDate} onChange={(e) => setSummonData({...summonData, issueDate: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" /></div>
                     <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">تاريخ الحضور</label><input type="date" value={summonData.date} onChange={(e) => setSummonData({...summonData, date: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" /></div>
                     <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">الوقت</label><input type="time" value={summonData.time} onChange={(e) => setSummonData({...summonData, time: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" /></div>
                </div>
                <div className="flex justify-end pt-6"><button onClick={openSummonPreview} disabled={!summonStudentId} className="bg-rose-600 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-rose-700"><Eye size={18} /> معاينة الخطاب</button></div>
            </div>
        )}
      </div>

      <Modal isOpen={showCertSettingsModal} onClose={() => setShowCertSettingsModal(false)} className="max-w-md rounded-[2rem]">
          <div className="text-center p-4">
              <h3 className="font-black text-lg mb-4 text-slate-800">إعدادات الشهادة</h3>
              <div className="space-y-3">
                  <input type="text" value={tempCertSettings.title} onChange={(e) => setTempCertSettings({...tempCertSettings, title: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800" placeholder="عنوان الشهادة" />
                  <textarea value={tempCertSettings.bodyText} onChange={(e) => setTempCertSettings({...tempCertSettings, bodyText: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 h-24" placeholder="نص الشهادة" />
                  <button onClick={() => { setCertificateSettings(tempCertSettings); setShowCertSettingsModal(false); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg">حفظ</button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default Reports;
