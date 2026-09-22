import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, BookMarked, CheckCircle2, ChevronLeft, ChevronRight, Circle,
  ClipboardPaste, Download, Edit3, Eye, FileJson, Play, Plus, Save, Search,
  Trash2, Upload, X
} from 'lucide-react';
import type { PeriodTime, ScheduleDay } from '../../types';
import type {
  PreparationSession,
  PreparationSessionState,
  PreparationValidationIssue,
  TeacherPreparation
} from '../../types/preparationTypes';
import {
  loadPreparationSessionState,
  loadPreparations,
  savePreparationSessionState,
} from '../../services/preparationStorage';
import { parsePreparationPackage, sanitizePreparationHtml } from '../../services/preparationImportValidator';

interface TeacherPreparationsProps {
  classes?: string[];
  teacherInfo?: any;
  schedule?: ScheduleDay[];
  periodTimes?: PeriodTime[];
}

type DialogMode = 'none' | 'import' | 'preview' | 'teaching' | 'manual';
type TeachingStep = { key: string; title: string; html: string };

type ManualForm = {
  subject: string;
  grade: string;
  unit: string;
  lessonTitle: string;
  sessionNumber: string;
  sessionTitle: string;
  bookPages: string;
  officialOutcomes: string;
  additionalObjectives: string;
  taxonomies: string;
  strategies: string;
  resources: string;
  concepts: string;
  introduction: string;
  preLearning: string;
  procedures: string;
  formativeAssessment: string;
  closingAssessment: string;
  activities: string;
  weeklyPlanComments: string;
  futureSkills: string;
};

const emptyManual = (subject = ''): ManualForm => ({
  subject,
  grade: '',
  unit: '',
  lessonTitle: '',
  sessionNumber: '1',
  sessionTitle: '',
  bookPages: '',
  officialOutcomes: '',
  additionalObjectives: '',
  taxonomies: '',
  strategies: '',
  resources: '',
  concepts: '',
  introduction: '',
  preLearning: '',
  procedures: '',
  formativeAssessment: '',
  closingAssessment: '',
  activities: '',
  weeklyPlanComments: '',
  futureSkills: ''
});

const lines = (value: string) => value.split(/\r?\n|،/).map(item => item.trim()).filter(Boolean);
const paragraphs = (value: string) => value.trim()
  ? value.split(/\r?\n/).map(item => item.trim()).filter(Boolean).map(item => `<p>${escapeHtml(item)}</p>`).join('')
  : '';
const stripHtml = (value: string) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeHtml = (value: string) => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char] || char));
const safeName = (value: string) => value.replace(/[\\/:*?"<>|]/g, '_').trim() || 'preparation';
const PREPARATIONS_STORAGE_KEY = 'rased_teacher_lesson_preparations_v1';
const PREPARATIONS_EMERGENCY_BACKUP_KEY = 'rased_teacher_lesson_preparations_backup_v1';
const readPreparationsDirectly = (): TeacherPreparation[] => {
  try {
    const raw = localStorage.getItem(PREPARATIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read preparations directly', error);
    return [];
  }
};
const persistPreparations = (items: TeacherPreparation[]) => {
  const serialized = JSON.stringify(items);
  const previous = localStorage.getItem(PREPARATIONS_STORAGE_KEY);
  if (previous && previous !== serialized) {
    localStorage.setItem(PREPARATIONS_EMERGENCY_BACKUP_KEY, previous);
  }
  localStorage.setItem(PREPARATIONS_STORAGE_KEY, serialized);
  if (localStorage.getItem(PREPARATIONS_STORAGE_KEY) !== serialized) {
    throw new Error('PREPARATIONS_STORAGE_WRITE_FAILED');
  }
};
const mergePreparationIntoList = (items: TeacherPreparation[], preparation: TeacherPreparation, replaceId?: string) => {
  const targetId = replaceId || preparation.id;
  const withoutTarget = items.filter(item => item.id !== targetId && item.id !== preparation.id);
  return [...withoutTarget, { ...preparation, id: replaceId || preparation.id }];
};

async function saveTextFile(text: string, fileName: string, mime = 'application/json;charset=utf-8') {
  const win = window as any;
  const capacitor = win.Capacitor;
  const filesystem = capacitor?.Plugins?.Filesystem;
  const share = capacitor?.Plugins?.Share;

  if (capacitor?.isNativePlatform?.() && filesystem) {
    const base64 = btoa(unescape(encodeURIComponent(text)));
    const result = await filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: 'CACHE',
      recursive: true
    });
    if (share && result?.uri) {
      await share.share({ title: fileName, url: result.uri, dialogTitle: 'حفظ أو مشاركة الملف' });
      return;
    }
  }

  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function teachingSteps(session: PreparationSession): TeachingStep[] {
  const outcomeSteps = [...session.officialOutcomes.map(item => item.text), ...session.additionalObjectives]
    .map((outcome, index) => ({ key: `outcome-${index + 1}`, title: `المخرج ${index + 1}`, html: `<h3>${escapeHtml(outcome)}</h3>` }));
  return [
    { key: 'intro', title: 'التهيئة والتمهيد والتعلم القبلي', html: session.introductionHtml || session.preLearningHtml },
    ...outcomeSteps,
    { key: 'procedures', title: 'إجراءات سير الدرس والأنشطة التدريسية', html: session.proceduresHtml },
    { key: 'formative', title: 'التقويم التكويني', html: session.formativeHtml },
    { key: 'activities', title: 'الأنشطة والمهام', html: session.activitiesHtml },
    { key: 'closing', title: 'التقويم الختامي', html: session.closingHtml },
    { key: 'weekly', title: 'ملاحظات الخطة الأسبوعية', html: session.weeklyCommentsHtml }
  ].filter(step => stripHtml(step.html));
}

const TeacherPreparations: React.FC<TeacherPreparationsProps> = ({ teacherInfo, schedule = [], periodTimes = [] }) => {
  const [preparations, setPreparations] = useState<TeacherPreparation[]>(() => {
    const fromDirectStorage = readPreparationsDirectly();
    if (fromDirectStorage.length) return fromDirectStorage;
    try { return loadPreparations(); } catch { return []; }
  });
  const [dialog, setDialog] = useState<DialogMode>('none');
  const [selected, setSelected] = useState<TeacherPreparation | null>(null);
  const [sessionNumber, setSessionNumber] = useState(1);
  const [query, setQuery] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pending, setPending] = useState<TeacherPreparation | null>(null);
  const [issues, setIssues] = useState<PreparationValidationIssue[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [quickNote, setQuickNote] = useState('');
  const [manual, setManual] = useState<ManualForm>(() => emptyManual(teacherInfo?.subject || ''));
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      persistPreparations(preparations);
    } catch (error) {
      console.error('Failed to persist preparations', error);
    }
  }, [preparations]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return preparations;
    return preparations.filter(item => [item.lesson.subject, item.lesson.unit, item.lesson.title, item.lesson.grade]
      .some(field => String(field || '').toLowerCase().includes(value)));
  }, [preparations, query]);

  const activeSession = selected?.sessions.find(item => item.number === sessionNumber) || selected?.sessions[0] || null;
  const steps = useMemo(() => activeSession ? teachingSteps(activeSession) : [], [activeSession]);
  const activeStep = steps[stepIndex] || null;

  const inspectRaw = (raw: unknown, sourceType: TeacherPreparation['sourceType']) => {
    const result = parsePreparationPackage(raw, sourceType);
    setIssues(result.issues);
    setPending(result.preparation || null);
    setDialog('import');
  };

  const readFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { inspectRaw(JSON.parse(String(reader.result || '')), 'json_import'); }
      catch { setPending(null); setIssues([{ level: 'error', path: 'json', message: 'تعذر قراءة ملف JSON.' }]); }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const commitPending = () => {
    if (!pending || issues.some(item => item.level === 'error')) return;
    const duplicate = preparations.find(item => item.lesson.title.trim() === pending.lesson.title.trim()
      && item.lesson.unit.trim() === pending.lesson.unit.trim() && item.lesson.grade.trim() === pending.lesson.grade.trim());
    const replaceId = duplicate && window.confirm(`يوجد تحضير محفوظ للدرس «${duplicate.lesson.title}». هل تريد استبداله؟`) ? duplicate.id : undefined;
    const prepared = { ...pending, updatedAt: new Date().toISOString() };
    const next = mergePreparationIntoList(preparations, prepared, replaceId);
    try { persistPreparations(next); } catch (error) {
      console.error(error);
      alert('تعذر حفظ التحضير على الجهاز. لم يتم إغلاق نافذة الاستيراد.');
      return;
    }
    setPreparations(next);
    setPending(null);
    setIssues([]);
    setPasteText('');
    setDialog('none');
    alert('تم حفظ التحضير وجميع حصصه.');
  };

  const openPreview = (preparation: TeacherPreparation) => {
    setSelected(preparation);
    setSessionNumber(preparation.sessions[0]?.number || 1);
    setDialog('preview');
  };

  const openTeaching = (preparation: TeacherPreparation) => {
    const state = loadPreparationSessionState();
    const number = state?.preparationId === preparation.id ? state.sessionNumber : preparation.sessions[0]?.number || 1;
    setSelected(preparation);
    setSessionNumber(number);
    setStepIndex(state?.preparationId === preparation.id ? state.stepIndex : 0);
    setCompletedSteps(state?.preparationId === preparation.id ? state.completedStepKeys : []);
    setQuickNote(state?.preparationId === preparation.id ? state.quickNote : '');
    setDialog('teaching');
  };

  useEffect(() => {
    if (dialog !== 'teaching' || !selected || !activeSession) return;
    const state: PreparationSessionState = {
      preparationId: selected.id,
      sessionNumber: activeSession.number,
      stepIndex,
      completedStepKeys: completedSteps,
      quickNote,
      updatedAt: new Date().toISOString()
    };
    savePreparationSessionState(state);
  }, [dialog, selected, activeSession, stepIndex, completedSteps, quickNote]);

  const createManual = () => {
    const required = [manual.subject, manual.grade, manual.unit, manual.lessonTitle, manual.sessionTitle,
      manual.officialOutcomes, manual.taxonomies, manual.strategies, manual.resources, manual.concepts,
      manual.introduction, manual.procedures, manual.formativeAssessment, manual.closingAssessment];
    if (required.some(value => !value.trim())) {
      alert('أكمل الحقول الأساسية المطابقة لتحضير منصة نور قبل الحفظ.');
      return;
    }
    const official = lines(manual.officialOutcomes);
    const additional = lines(manual.additionalObjectives);
    if (official.length + additional.length < 3) {
      alert('يجب ألا يقل مجموع المخرجات الرسمية والإضافية عن ثلاثة مخرجات.');
      return;
    }
    const futureSkills = lines(manual.futureSkills).map(skill => ({ skill }));
    const raw = {
      format: 'NOOR_COPILOT_LESSON_PACKAGE_V2',
      version: '1.0-manual',
      lesson: {
        title: manual.lessonTitle.trim(),
        unit: manual.unit.trim(),
        grade: manual.grade.trim(),
        subject: manual.subject.trim(),
        totalSessions: 1
      },
      sessions: [{
        format: 'NOOR_COPILOT_PREPARATION_V1',
        lesson: {
          title: manual.lessonTitle.trim(), unit: manual.unit.trim(), grade: manual.grade.trim(),
          subject: manual.subject.trim(), totalSessions: 1
        },
        session: {
          number: Number(manual.sessionNumber) || 1,
          title: manual.sessionTitle.trim(),
          bookPages: lines(manual.bookPages)
        },
        officialOutcomes: official,
        additionalObjectives: additional,
        taxonomies: lines(manual.taxonomies),
        strategies: lines(manual.strategies),
        resources: lines(manual.resources),
        concepts: paragraphs(manual.concepts),
        introduction: paragraphs(manual.introduction),
        preLearning: paragraphs(manual.preLearning),
        lessonProcedures: paragraphs(manual.procedures),
        formativeAssessment: paragraphs(manual.formativeAssessment),
        closingAssessment: paragraphs(manual.closingAssessment),
        activities: paragraphs(manual.activities),
        weeklyPlanComments: paragraphs(manual.weeklyPlanComments),
        futureSkills
      }]
    };
    const result = parsePreparationPackage(raw, 'manual');
    if (!result.valid || !result.preparation) {
      alert(result.issues.map(item => item.message).join('\n') || 'تعذر إنشاء التحضير اليدوي.');
      return;
    }
    const prepared = { ...result.preparation, updatedAt: new Date().toISOString() };
    const next = mergePreparationIntoList(preparations, prepared);
    try { persistPreparations(next); } catch (error) {
      console.error(error);
      alert('تعذر حفظ التحضير اليدوي على الجهاز.');
      return;
    }
    setPreparations(next);
    setManual(emptyManual(teacherInfo?.subject || ''));
    setDialog('none');
    alert('تم حفظ التحضير اليدوي بصيغة متطابقة مع حزمة منصة نور.');
  };

  const exportOne = async (preparation: TeacherPreparation) => {
    try {
      setExporting(true);
      await saveTextFile(JSON.stringify(preparation, null, 2), `${safeName(preparation.lesson.title)}.rased-preparation.json`);
    } catch (error) {
      console.error(error);
      alert('تعذر تصدير التحضير.');
    } finally { setExporting(false); }
  };

  const exportAll = async () => {
    if (!preparations.length) return;
    try {
      setExporting(true);
      const payload = { format: 'RASED_PREPARATIONS_BACKUP_V1', exportedAt: new Date().toISOString(), preparations };
      await saveTextFile(JSON.stringify(payload, null, 2), 'Rased_Preparations_Backup.json');
    } catch (error) {
      console.error(error);
      alert('تعذر إنشاء النسخة الاحتياطية.');
    } finally { setExporting(false); }
  };

  const remove = (preparation: TeacherPreparation) => {
    if (!window.confirm(`حذف تحضير «${preparation.lesson.title}»؟`)) return;
    const next = preparations.filter(item => item.id !== preparation.id);
    try { persistPreparations(next); } catch (error) {
      console.error(error);
      alert('تعذر حذف التحضير من التخزين المحلي.');
      return;
    }
    setPreparations(next);
    if (selected?.id === preparation.id) setSelected(null);
  };

  const updateNote = () => {
    if (!selected || !activeSession) return;
    const updated = { ...selected, sessions: selected.sessions.map(item => item.number === activeSession.number ? { ...item, notes: quickNote } : item), updatedAt: new Date().toISOString() };
    const next = mergePreparationIntoList(preparations, updated, selected.id);
    try { persistPreparations(next); } catch (error) {
      console.error(error);
      alert('تعذر حفظ ملاحظة الحصة.');
      return;
    }
    setPreparations(next);
    setSelected(updated);
    alert('تم حفظ ملاحظة الحصة.');
  };

  const currentScheduleHint = useMemo(() => {
    if (!schedule.length || !periodTimes.length) return '';
    return '';
  }, [schedule, periodTimes]);

  return <div className="space-y-4 pb-24" dir="rtl">
    <section className="rounded-3xl border border-borderColor bg-bgCard p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3"><div className="rounded-2xl bg-primary/10 p-3 text-primary"><BookMarked size={28}/></div><div><h1 className="text-2xl font-black text-textPrimary">التحضير</h1><p className="mt-1 text-sm font-bold text-textSecondary">مكتبة التحاضير ووضع العرض أثناء الحصة</p>{currentScheduleHint && <p>{currentScheduleHint}</p>}</div></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setDialog('import'); setPending(null); setIssues([]); }} className="rounded-xl bg-primary px-4 py-3 text-sm font-black text-white"><Upload className="ml-2 inline" size={17}/>استيراد JSON</button>
          <button onClick={() => setDialog('manual')} className="rounded-xl border border-borderColor bg-bgSoft px-4 py-3 text-sm font-black text-textPrimary"><Plus className="ml-2 inline" size={17}/>تحضير يدوي</button>
          <button onClick={exportAll} disabled={!preparations.length || exporting} className="rounded-xl border border-borderColor bg-bgSoft px-4 py-3 text-sm font-black text-textPrimary disabled:opacity-40"><Download className="ml-2 inline" size={17}/>{exporting ? 'جارٍ الحفظ...' : 'نسخة احتياطية'}</button>
        </div>
      </div>
    </section>

    <section className="rounded-3xl border border-borderColor bg-bgCard p-4 shadow-sm"><div className="relative"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-textSecondary" size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث في التحاضير" className="w-full rounded-2xl border border-borderColor bg-bgSoft py-3 pr-12 pl-4 font-bold text-textPrimary outline-none focus:border-primary"/></div></section>

    {!filtered.length ? <section className="rounded-3xl border border-dashed border-borderColor bg-bgCard p-10 text-center"><BookMarked className="mx-auto text-textSecondary" size={42}/><h2 className="mt-4 text-lg font-black text-textPrimary">لا توجد تحاضير محفوظة</h2></section> : <div className="grid gap-4 xl:grid-cols-2">{filtered.map(preparation => <article key={preparation.id} className="rounded-3xl border border-borderColor bg-bgCard p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">{preparation.lesson.subject || teacherInfo?.subject || 'مادة غير محددة'}</span><h2 className="mt-3 text-lg font-black text-textPrimary">{preparation.lesson.title}</h2><p className="mt-1 text-sm font-bold text-textSecondary">{preparation.lesson.unit} · الصف {preparation.lesson.grade}</p></div><button onClick={() => remove(preparation)} className="rounded-xl bg-danger/10 p-2 text-danger" title="حذف"><Trash2 size={18}/></button></div>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => openTeaching(preparation)} className="flex-1 rounded-xl bg-success px-3 py-3 text-sm font-black text-white"><Play className="ml-2 inline" size={16}/>عرض الحصة</button><button onClick={() => openPreview(preparation)} className="rounded-xl bg-bgSoft px-4 py-3 text-sm font-black text-textPrimary"><Eye className="ml-2 inline" size={16}/>معاينة</button><button onClick={() => exportOne(preparation)} disabled={exporting} className="rounded-xl bg-bgSoft p-3 text-textPrimary disabled:opacity-40" title="تصدير هذا التحضير JSON"><FileJson size={18}/></button></div>
    </article>)}</div>}

    {dialog !== 'none' && typeof document !== 'undefined' && createPortal(<div className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-slate-950/60 p-3"><div className={`max-h-[94dvh] w-full overflow-auto rounded-3xl border border-borderColor bg-bgMain shadow-2xl ${dialog === 'teaching' ? 'max-w-6xl' : 'max-w-5xl'}`}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-borderColor bg-bgCard p-4"><h2 className="text-lg font-black text-textPrimary">{dialog === 'import' ? 'استيراد ومعاينة الحزمة' : dialog === 'manual' ? 'التحضير اليدوي وفق خانات منصة نور' : dialog === 'preview' ? 'معاينة التحضير' : 'وضع التدريس'}</h2><button onClick={() => setDialog('none')} className="rounded-xl bg-bgSoft p-2 text-textPrimary"><X size={20}/></button></header>

      {dialog === 'import' && <div className="space-y-4 p-5"><input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={event => readFile(event.target.files?.[0])}/><button onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center"><Upload className="mx-auto text-primary"/><b className="mt-2 block text-primary">اختيار ملف JSON</b></button><textarea value={pasteText} onChange={event => setPasteText(event.target.value)} rows={7} dir="ltr" className="w-full rounded-2xl border border-borderColor bg-bgCard p-3 font-mono text-xs"/><button onClick={() => { try { inspectRaw(JSON.parse(pasteText), 'json_paste'); } catch { setIssues([{level:'error',path:'json',message:'النص الملصق ليس JSON صالحًا.'}]); } }} className="rounded-xl bg-bgSoft px-4 py-3 font-black"><ClipboardPaste className="ml-2 inline" size={17}/>فحص النص</button>{issues.map((issue,index)=><div key={index} className={`rounded-xl p-3 font-bold ${issue.level==='error'?'bg-danger/10 text-danger':'bg-warning/10 text-textPrimary'}`}><AlertTriangle className="ml-2 inline" size={16}/>{issue.message}</div>)}{pending && <div className="rounded-2xl bg-bgCard p-4"><h3 className="font-black">{pending.lesson.title}</h3><p>{pending.sessions.length} حصص</p></div>}<button onClick={commitPending} disabled={!pending || issues.some(item=>item.level==='error')} className="w-full rounded-xl bg-primary py-3 font-black text-white disabled:opacity-40"><Save className="ml-2 inline"/>حفظ التحضير</button></div>}

      {dialog === 'manual' && <ManualEditor value={manual} onChange={setManual} onSave={createManual}/>} 

      {dialog === 'preview' && selected && activeSession && <div className="p-5"><SessionSelector preparation={selected} number={activeSession.number} onChange={setSessionNumber}/><SessionDetails session={activeSession}/></div>}

      {dialog === 'teaching' && selected && activeSession && <div className="p-4 md:p-6"><SessionSelector preparation={selected} number={activeSession.number} onChange={number => {setSessionNumber(number);setStepIndex(0);setCompletedSteps([]);setQuickNote('');}}/>{activeStep && <article className="min-h-[45vh] rounded-3xl border border-borderColor bg-bgCard p-6"><div className="mb-5 flex items-center justify-between"><div><span className="text-xs font-black text-primary">الخطوة {stepIndex+1} من {steps.length}</span><h4 className="text-2xl font-black">{activeStep.title}</h4></div><button onClick={()=>setCompletedSteps(previous=>previous.includes(activeStep.key)?previous.filter(key=>key!==activeStep.key):[...previous,activeStep.key])} className={`rounded-xl px-4 py-3 font-black ${completedSteps.includes(activeStep.key)?'bg-success text-white':'bg-bgSoft'}`}>{completedSteps.includes(activeStep.key)?<CheckCircle2 className="ml-2 inline"/>:<Circle className="ml-2 inline"/>}تم التنفيذ</button></div><div className="prose prose-lg max-w-none leading-9" dangerouslySetInnerHTML={{__html:sanitizePreparationHtml(activeStep.html)}}/></article>}<div className="mt-4 flex justify-between"><button onClick={()=>setStepIndex(i=>Math.max(0,i-1))} disabled={stepIndex===0} className="rounded-xl bg-bgCard px-5 py-3 font-black disabled:opacity-30"><ChevronRight className="ml-2 inline"/>السابق</button><button onClick={()=>setStepIndex(i=>Math.min(steps.length-1,i+1))} disabled={stepIndex>=steps.length-1} className="rounded-xl bg-primary px-5 py-3 font-black text-white disabled:opacity-30">التالي<ChevronLeft className="mr-2 inline"/></button></div><div className="mt-4 rounded-2xl bg-bgCard p-4"><textarea value={quickNote} onChange={event=>setQuickNote(event.target.value)} rows={3} className="w-full rounded-xl border border-borderColor bg-bgSoft p-3" placeholder="ملاحظة سريعة للحصة"/><button onClick={updateNote} className="mt-2 rounded-xl bg-bgSoft px-4 py-2 font-black"><Save className="ml-2 inline" size={16}/>حفظ الملاحظة</button></div></div>}
    </div></div>, document.body)}
  </div>;
};

const ManualEditor: React.FC<{ value: ManualForm; onChange: React.Dispatch<React.SetStateAction<ManualForm>>; onSave: () => void }> = ({ value, onChange, onSave }) => {
  const field = (key: keyof ManualForm, label: string, required = false, placeholder = '') => <label className="space-y-2"><span className="text-xs font-black text-textSecondary">{label}{required && <span className="text-danger"> *</span>}</span><input value={value[key]} onChange={event=>onChange(previous=>({...previous,[key]:event.target.value}))} placeholder={placeholder} className="w-full rounded-xl border border-borderColor bg-bgCard p-3 font-bold text-textPrimary outline-none focus:border-primary"/></label>;
  const area = (key: keyof ManualForm, label: string, required = false, placeholder = '', rows = 4) => <label className="space-y-2"><span className="text-xs font-black text-textSecondary">{label}{required && <span className="text-danger"> *</span>}</span><textarea value={value[key]} onChange={event=>onChange(previous=>({...previous,[key]:event.target.value}))} placeholder={placeholder} rows={rows} className="w-full rounded-xl border border-borderColor bg-bgCard p-3 font-bold text-textPrimary outline-none focus:border-primary"/></label>;
  return <div className="space-y-5 p-5">
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><h3 className="font-black text-primary">بيانات الدرس والحصة</h3><p className="mt-1 text-xs font-bold text-textSecondary">الحقول أدناه مطابقة لبنية التحضير في منصة نور والحزمة المستوردة.</p></div>
    <div className="grid gap-4 md:grid-cols-2">{field('subject','المادة',true)}{field('grade','الصف',true)}{field('unit','الوحدة',true)}{field('lessonTitle','عنوان الدرس',true)}{field('sessionNumber','رقم الحصة',true)}{field('sessionTitle','عنوان الحصة',true)}{field('bookPages','صفحات الكتاب',false,'مثال: 17، 18، 19')}</div>
    <ManualSection title="المخرجات والمستويات"><div className="grid gap-4 md:grid-cols-2">{area('officialOutcomes','المخرجات التعليمية الرسمية',true,'مخرج واحد في كل سطر')}{area('additionalObjectives','المخرجات الإضافية',false,'مخرج واحد في كل سطر')}{area('taxonomies','المستويات المعرفية والمهارية',true,'الفهم، التحليل، التطبيق')}</div></ManualSection>
    <ManualSection title="الاستراتيجيات والمصادر والمفاهيم"><div className="grid gap-4 md:grid-cols-2">{area('strategies','الاستراتيجيات',true,'استراتيجية واحدة في كل سطر')}{area('resources','المصادر التعليمية',true,'مصدر واحد في كل سطر')}{area('concepts','المفاهيم والمصطلحات',true,'مفهوم أو مجموعة مفاهيم في كل سطر')}</div></ManualSection>
    <ManualSection title="التهيئة والتعلم القبلي">{area('introduction','التهيئة / التمهيد',true,'اكتب التهيئة كما ستظهر في منصة نور',5)}{area('preLearning','التعلم القبلي',false,'المعارف والخبرات السابقة اللازمة',4)}</ManualSection>
    <ManualSection title="إجراءات سير الدرس والأنشطة التدريسية">{area('procedures','إجراءات سير الدرس',true,'اربط كل مخرج بالمصدر والاستراتيجية وإجراء المعلم ونشاط الطالب والتغذية الراجعة والتقويم التكويني.',10)}</ManualSection>
    <ManualSection title="التقويم والأنشطة">{area('formativeAssessment','التقويم التكويني',true,'اكتب أدوات وأسئلة التقويم أثناء التعلم',5)}{area('closingAssessment','التقويم الختامي',true,'اكتب التقويم في نهاية الحصة',5)}{area('activities','الأنشطة والمهام',false,'أنشطة الكتاب والنوافذ المعرفية والمهمات',5)}</ManualSection>
    <ManualSection title="مهارات المستقبل وملاحظات الخطة">{area('futureSkills','مهارات المستقبل',false,'مهارة واحدة في كل سطر')}{area('weeklyPlanComments','ملاحظات الخطة الأسبوعية',false,'ملخص ما سيغطيه المعلم في الحصة')}</ManualSection>
    <button onClick={onSave} className="w-full rounded-xl bg-primary py-4 font-black text-white"><Save className="ml-2 inline"/>حفظ التحضير اليدوي</button>
  </div>;
};

const ManualSection: React.FC<{title:string;children:React.ReactNode}> = ({title,children}) => <section className="space-y-4 rounded-2xl border border-borderColor bg-bgSoft p-4"><h3 className="font-black text-primary">{title}</h3>{children}</section>;
const SessionSelector: React.FC<{ preparation: TeacherPreparation; number: number; onChange:(value:number)=>void }> = ({preparation,number,onChange}) => <select value={number} onChange={event=>onChange(Number(event.target.value))} className="mb-4 w-full rounded-xl border border-borderColor bg-bgSoft p-3 font-black">{preparation.sessions.map(session=><option key={session.number} value={session.number}>الحصة {session.number}: {session.title}</option>)}</select>;
const HtmlBlock: React.FC<{ title:string; html:string }> = ({title,html}) => stripHtml(html)?<section className="rounded-2xl border border-borderColor bg-bgCard p-4"><h4 className="mb-3 font-black text-primary">{title}</h4><div className="prose max-w-none leading-8" dangerouslySetInnerHTML={{__html:sanitizePreparationHtml(html)}}/></section>:null;
const ListBox: React.FC<{title:string;items:string[]}> = ({title,items}) => <div className="rounded-xl bg-bgSoft p-4"><h4 className="font-black text-primary">{title}</h4><ul className="mt-2 space-y-1 text-sm font-bold">{items.map((item,index)=><li key={index}>• {item}</li>)}</ul></div>;
const SessionDetails: React.FC<{session:PreparationSession}> = ({session}) => <div className="space-y-3"><div className="rounded-2xl bg-bgCard p-4"><h3 className="text-xl font-black">الحصة {session.number}: {session.title}</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><ListBox title="المخرجات الرسمية" items={session.officialOutcomes.map(item=>item.text)}/><ListBox title="المخرجات الإضافية" items={session.additionalObjectives}/><ListBox title="المستويات" items={session.taxonomies}/><ListBox title="الاستراتيجيات" items={session.strategies}/><ListBox title="المصادر" items={session.resources}/></div></div><HtmlBlock title="المفاهيم" html={session.conceptsHtml}/><HtmlBlock title="التهيئة / التمهيد / التعلم القبلي" html={session.introductionHtml || session.preLearningHtml}/><HtmlBlock title="إجراءات سير الدرس / الأنشطة التدريسية" html={session.proceduresHtml}/><HtmlBlock title="التقويم التكويني" html={session.formativeHtml}/><HtmlBlock title="التقويم الختامي" html={session.closingHtml}/><HtmlBlock title="الأنشطة والمهام" html={session.activitiesHtml}/><HtmlBlock title="ملاحظات الخطة الأسبوعية" html={session.weeklyCommentsHtml}/></div>;

export default TeacherPreparations;
