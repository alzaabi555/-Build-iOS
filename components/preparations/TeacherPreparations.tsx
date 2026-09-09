import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked, Upload, ClipboardPaste, Search, Trash2, Play, Eye, Download,
  X, ChevronLeft, ChevronRight, CheckCircle2, Circle, FileJson, AlertTriangle,
  Save, Edit3, Plus, Clock3, GraduationCap, Layers3, BookOpenCheck
} from 'lucide-react';
import type { PeriodTime, ScheduleDay } from '../../types';
import type { PreparationSession, PreparationSessionState, PreparationValidationIssue, TeacherPreparation } from '../../types/preparationTypes';
import { deletePreparation, loadPreparationSessionState, loadPreparations, savePreparationSessionState, savePreparations, upsertPreparation } from '../../services/preparationStorage';
import { parsePreparationPackage, sanitizePreparationHtml } from '../../services/preparationImportValidator';

interface TeacherPreparationsProps {
  classes?: string[];
  teacherInfo?: any;
  schedule?: ScheduleDay[];
  periodTimes?: PeriodTime[];
}

type DialogMode = 'none' | 'import' | 'preview' | 'teaching' | 'manual';

type TeachingStep = { key: string; title: string; html: string };

const stripHtml = (value: string) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeHtml = (value: string) => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
const downloadText = (text: string, name: string, type = 'application/json;charset=utf-8') => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
};

function teachingSteps(session: PreparationSession): TeachingStep[] {
  const outcomeSteps = session.outcomeAlignments.length
    ? session.outcomeAlignments.sort((a, b) => Number(a.procedureOrder || 0) - Number(b.procedureOrder || 0)).map((alignment, index) => {
        const rows = [
          alignment.outcomeText && `<h3>${escapeHtml(alignment.outcomeText)}</h3>`,
          alignment.educationalElement?.title && `<p><strong>العنصر التعليمي:</strong> ${escapeHtml(alignment.educationalElement.title)}${alignment.educationalElement.page ? `، صفحة ${escapeHtml(alignment.educationalElement.page)}` : ''}</p>`,
          alignment.sources?.length && `<p><strong>المصادر:</strong> ${alignment.sources.map(escapeHtml).join('، ')}</p>`,
          alignment.strategies?.length && `<p><strong>الاستراتيجيات:</strong> ${alignment.strategies.map(escapeHtml).join('، ')}</p>`,
          alignment.implementationMethod && `<p><strong>طريقة التنفيذ:</strong> ${escapeHtml(alignment.implementationMethod)}</p>`,
          alignment.participationMode && `<p><strong>نمط المشاركة:</strong> ${escapeHtml(alignment.participationMode)}</p>`,
          alignment.educationalElement?.use && `<p><strong>التوظيف:</strong> ${escapeHtml(alignment.educationalElement.use)}</p>`,
          alignment.futureSkills?.length && `<p><strong>مهارات المستقبل:</strong> ${alignment.futureSkills.map(item => `${escapeHtml(item.skill)}${item.studentPerformance ? `: ${escapeHtml(item.studentPerformance)}` : ''}`).join('، ')}</p>`
        ].filter(Boolean).join('');
        return { key: `outcome-${index + 1}`, title: `المخرج ${index + 1}`, html: rows };
      })
    : [];
  return [
    { key: 'intro', title: 'التهيئة والتمهيد', html: session.introductionHtml || session.preLearningHtml },
    ...outcomeSteps,
    { key: 'procedures', title: 'إجراءات سير الدرس', html: session.proceduresHtml },
    { key: 'formative', title: 'التقويم التكويني', html: session.formativeHtml },
    { key: 'activities', title: 'الأنشطة والمهام', html: session.activitiesHtml },
    { key: 'closing', title: 'التقويم الختامي', html: session.closingHtml },
    { key: 'weekly', title: 'ملاحظات الخطة', html: session.weeklyCommentsHtml }
  ].filter(step => stripHtml(step.html));
}

const TeacherPreparations: React.FC<TeacherPreparationsProps> = ({ classes = [], teacherInfo, schedule = [], periodTimes = [] }) => {
  const [preparations, setPreparations] = useState<TeacherPreparation[]>(() => loadPreparations());
  const [dialog, setDialog] = useState<DialogMode>('none');
  const [selected, setSelected] = useState<TeacherPreparation | null>(null);
  const [selectedSessionNumber, setSelectedSessionNumber] = useState(1);
  const [query, setQuery] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pending, setPending] = useState<TeacherPreparation | null>(null);
  const [issues, setIssues] = useState<PreparationValidationIssue[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [quickNote, setQuickNote] = useState('');
  const [manual, setManual] = useState({ title: '', unit: '', grade: '', subject: teacherInfo?.subject || '', sessionTitle: '', procedures: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { savePreparations(preparations); } catch (error) { console.error(error); }
  }, [preparations]);

  const filtered = useMemo(() => {
    const key = query.trim().toLowerCase();
    if (!key) return preparations;
    return preparations.filter(item => [item.lesson.subject, item.lesson.unit, item.lesson.title, item.lesson.grade].some(value => String(value || '').toLowerCase().includes(key)));
  }, [preparations, query]);

  const activeSession = selected?.sessions.find(session => session.number === selectedSessionNumber) || selected?.sessions[0] || null;
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
      catch { setPending(null); setIssues([{ level: 'error', path: 'json', message: 'تعذر قراءة ملف JSON. تأكد من أن الملف غير تالف.' }]); setDialog('import'); }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const inspectPaste = () => {
    try { inspectRaw(JSON.parse(pasteText), 'json_paste'); }
    catch { setPending(null); setIssues([{ level: 'error', path: 'json', message: 'النص الملصق ليس JSON صالحًا.' }]); }
  };

  const commitPending = () => {
    if (!pending || issues.some(issue => issue.level === 'error')) return;
    const duplicate = preparations.find(item => item.lesson.title.trim() === pending.lesson.title.trim() && item.lesson.unit.trim() === pending.lesson.unit.trim() && item.lesson.grade.trim() === pending.lesson.grade.trim());
    let replaceId: string | undefined;
    if (duplicate) {
      const replace = window.confirm(`يوجد تحضير محفوظ للدرس «${duplicate.lesson.title}».\n\nموافق: استبدال التحضير مع إنشاء نسخة احتياطية.\nإلغاء: حفظ نسخة جديدة مستقلة.`);
      if (replace) replaceId = duplicate.id;
    }
    const next = upsertPreparation({ ...pending, updatedAt: new Date().toISOString() }, replaceId);
    setPreparations(next);
    setPending(null); setIssues([]); setPasteText(''); setDialog('none');
    alert('تم حفظ التحضير وجميع حصصه محليًا بنجاح.');
  };

  const openPreview = (preparation: TeacherPreparation) => {
    setSelected(preparation); setSelectedSessionNumber(preparation.sessions[0]?.number || 1); setDialog('preview');
  };

  const openTeaching = (preparation: TeacherPreparation, sessionNumber?: number) => {
    const state = loadPreparationSessionState();
    const number = sessionNumber || (state?.preparationId === preparation.id ? state.sessionNumber : preparation.sessions[0]?.number) || 1;
    setSelected(preparation); setSelectedSessionNumber(number);
    setStepIndex(state?.preparationId === preparation.id && state.sessionNumber === number ? state.stepIndex : 0);
    setCompletedSteps(state?.preparationId === preparation.id && state.sessionNumber === number ? state.completedStepKeys : []);
    setQuickNote(state?.preparationId === preparation.id && state.sessionNumber === number ? state.quickNote : '');
    setDialog('teaching');
  };

  useEffect(() => {
    if (dialog !== 'teaching' || !selected || !activeSession) return;
    const state: PreparationSessionState = { preparationId: selected.id, sessionNumber: activeSession.number, stepIndex, completedStepKeys: completedSteps, quickNote, updatedAt: new Date().toISOString() };
    savePreparationSessionState(state);
  }, [dialog, selected, activeSession, stepIndex, completedSteps, quickNote]);

  const changeTeachingSession = (number: number) => {
    setSelectedSessionNumber(number); setStepIndex(0); setCompletedSteps([]); setQuickNote('');
  };

  const toggleStep = () => {
    if (!activeStep) return;
    setCompletedSteps(previous => previous.includes(activeStep.key) ? previous.filter(key => key !== activeStep.key) : [...previous, activeStep.key]);
  };

  const updateSessionNote = () => {
    if (!selected || !activeSession) return;
    const updated = { ...selected, sessions: selected.sessions.map(session => session.number === activeSession.number ? { ...session, notes: quickNote } : session), updatedAt: new Date().toISOString() };
    const next = upsertPreparation(updated);
    setPreparations(next); setSelected(updated);
    alert('تم حفظ ملاحظة الحصة.');
  };

  const createManual = () => {
    if (!manual.title.trim() || !manual.sessionTitle.trim()) return alert('اكتب عنوان الدرس وعنوان الحصة.');
    const raw = { format: 'RASED_MANUAL_PREPARATION_V1', version: '1.0', lesson: { title: manual.title, unit: manual.unit, grade: manual.grade, subject: manual.subject, totalSessions: 1 }, sessions: [{ session: { number: 1, title: manual.sessionTitle, bookPages: [] }, officialOutcomes: [], additionalObjectives: [], lessonProcedures: `<p>${escapeHtml(manual.procedures)}</p>` }] };
    const result = parsePreparationPackage(raw, 'manual');
    if (!result.preparation) return;
    const next = upsertPreparation(result.preparation);
    setPreparations(next); setDialog('none'); setManual({ title: '', unit: '', grade: '', subject: teacherInfo?.subject || '', sessionTitle: '', procedures: '' });
  };

  const remove = (preparation: TeacherPreparation) => {
    if (!window.confirm(`حذف تحضير «${preparation.lesson.title}»؟`)) return;
    setPreparations(deletePreparation(preparation.id));
  };

  const exportPreparation = (preparation: TeacherPreparation) => downloadText(JSON.stringify(preparation, null, 2), `${preparation.lesson.title}.rased-preparation.json`);
  const exportAll = () => downloadText(JSON.stringify({ format: 'RASED_PREPARATIONS_BACKUP_V1', exportedAt: new Date().toISOString(), preparations }, null, 2), 'Rased_Preparations_Backup.json');

  const currentScheduleHint = useMemo(() => {
    if (!schedule.length || !periodTimes.length) return '';
    const today = new Intl.DateTimeFormat('ar-OM', { weekday: 'long' }).format(new Date()).replace('ال', '');
    const day = schedule.find(item => item.dayName.includes(today) || today.includes(item.dayName));
    if (!day) return '';
    const now = new Date(); const minutes = now.getHours() * 60 + now.getMinutes();
    const period = periodTimes.find(item => { const [sh, sm] = item.startTime.split(':').map(Number); const [eh, em] = item.endTime.split(':').map(Number); return minutes >= sh * 60 + sm && minutes <= eh * 60 + em; });
    return period ? day.periods[period.periodNumber - 1] || '' : '';
  }, [schedule, periodTimes]);

  return (
    <div className="space-y-4 pb-24" dir="rtl">
      <section className="rounded-3xl border border-borderColor bg-bgCard p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary"><BookMarked size={28} /></div>
            <div><h1 className="text-2xl font-black text-textPrimary">التحضير</h1><p className="mt-1 text-sm font-bold text-textSecondary">مكتبة التحاضير ووضع العرض أثناء الحصة</p>{currentScheduleHint && <p className="mt-2 text-xs font-black text-success">الحصة الحالية بحسب الجدول: {currentScheduleHint}</p>}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setDialog('import'); setPending(null); setIssues([]); }} className="rounded-xl bg-primary px-4 py-3 text-sm font-black text-white"><Upload className="ml-2 inline" size={17} />استيراد JSON</button>
            <button onClick={() => setDialog('manual')} className="rounded-xl border border-borderColor bg-bgSoft px-4 py-3 text-sm font-black text-textPrimary"><Plus className="ml-2 inline" size={17} />تحضير يدوي</button>
            <button onClick={exportAll} disabled={!preparations.length} className="rounded-xl border border-borderColor bg-bgSoft px-4 py-3 text-sm font-black text-textPrimary disabled:opacity-40"><Download className="ml-2 inline" size={17} />نسخة احتياطية</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-borderColor bg-bgCard p-4 shadow-sm">
        <div className="relative"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-textSecondary" size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث في المادة أو الوحدة أو عنوان الدرس أو الصف" className="w-full rounded-2xl border border-borderColor bg-bgSoft py-3 pr-12 pl-4 font-bold text-textPrimary outline-none focus:border-primary" /></div>
      </section>

      {!filtered.length ? (
        <section className="rounded-3xl border border-dashed border-borderColor bg-bgCard p-10 text-center"><BookOpenCheck className="mx-auto text-textSecondary" size={42} /><h2 className="mt-4 text-lg font-black text-textPrimary">لا توجد تحاضير محفوظة</h2><p className="mt-2 text-sm font-bold text-textSecondary">استورد ملف JSON الشامل لجميع حصص الدرس أو أنشئ تحضيرًا يدويًا.</p></section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map(preparation => (
            <article key={preparation.id} className="rounded-3xl border border-borderColor bg-bgCard p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">{preparation.lesson.subject || teacherInfo?.subject || 'مادة غير محددة'}</span><h2 className="mt-3 text-lg font-black text-textPrimary">{preparation.lesson.title}</h2><p className="mt-1 text-sm font-bold text-textSecondary">{preparation.lesson.unit || 'دون وحدة'} · الصف {preparation.lesson.grade || 'غير محدد'}</p></div><button onClick={() => remove(preparation)} className="rounded-xl bg-danger/10 p-2 text-danger" title="حذف"><Trash2 size={18} /></button></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-bgSoft p-3"><b className="block text-lg text-primary">{preparation.sessions.length}</b><span className="text-[10px] font-bold text-textSecondary">حصص</span></div><div className="rounded-xl bg-bgSoft p-3"><b className="block text-lg text-success">{preparation.sessions.reduce((sum, session) => sum + session.officialOutcomes.length + session.additionalObjectives.length, 0)}</b><span className="text-[10px] font-bold text-textSecondary">مخرجات</span></div><div className="rounded-xl bg-bgSoft p-3"><b className="block text-lg text-warning">{preparation.status === 'complete' ? 'مكتمل' : 'مراجعة'}</b><span className="text-[10px] font-bold text-textSecondary">الحالة</span></div></div>
              <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => openTeaching(preparation)} className="flex-1 rounded-xl bg-success px-3 py-3 text-sm font-black text-white"><Play className="ml-2 inline" size={16} />عرض الحصة</button><button onClick={() => openPreview(preparation)} className="rounded-xl bg-bgSoft px-4 py-3 text-sm font-black text-textPrimary"><Eye className="ml-2 inline" size={16} />معاينة</button><button onClick={() => exportPreparation(preparation)} className="rounded-xl bg-bgSoft p-3 text-textPrimary" title="تصدير JSON"><FileJson size={18} /></button></div>
            </article>
          ))}
        </div>
      )}

      {dialog !== 'none' && <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-3" onMouseDown={event => { if (event.target === event.currentTarget && dialog !== 'teaching') setDialog('none'); }}>
        <div className={`max-h-[94dvh] w-full overflow-auto rounded-3xl border border-borderColor bg-bgMain shadow-2xl ${dialog === 'teaching' ? 'max-w-6xl' : 'max-w-4xl'}`}>
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-borderColor bg-bgCard/95 p-4 backdrop-blur"><div><h2 className="text-lg font-black text-textPrimary">{dialog === 'import' ? 'استيراد ومعاينة الحزمة' : dialog === 'preview' ? 'معاينة التحضير' : dialog === 'manual' ? 'إنشاء تحضير يدوي' : 'وضع التدريس'}</h2>{selected && <p className="text-xs font-bold text-textSecondary">{selected.lesson.title}</p>}</div><button onClick={() => setDialog('none')} className="rounded-xl bg-bgSoft p-2 text-textPrimary"><X size={20} /></button></header>

          {dialog === 'import' && <div className="space-y-4 p-5">
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={event => readFile(event.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center"><Upload className="mx-auto text-primary" size={30} /><b className="mt-2 block text-primary">اختيار ملف JSON شامل لجميع الحصص</b></button>
            <div className="text-center text-xs font-black text-textSecondary">أو الصق محتوى JSON</div>
            <textarea value={pasteText} onChange={event => setPasteText(event.target.value)} rows={7} dir="ltr" className="w-full rounded-2xl border border-borderColor bg-bgCard p-3 font-mono text-xs text-textPrimary outline-none focus:border-primary" placeholder="{ ... }" />
            <button onClick={inspectPaste} disabled={!pasteText.trim()} className="rounded-xl bg-bgSoft px-4 py-3 text-sm font-black text-textPrimary disabled:opacity-40"><ClipboardPaste className="ml-2 inline" size={17} />فحص النص الملصق</button>
            {!!issues.length && <div className="space-y-2">{issues.map((issue, index) => <div key={`${issue.path}-${index}`} className={`rounded-xl border p-3 text-sm font-bold ${issue.level === 'error' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-warning/30 bg-warning/10 text-textPrimary'}`}><AlertTriangle className="ml-2 inline" size={16} />{issue.message}</div>)}</div>}
            {pending && <div className="rounded-2xl border border-borderColor bg-bgCard p-4"><h3 className="text-lg font-black text-textPrimary">{pending.lesson.title}</h3><p className="text-sm font-bold text-textSecondary">{pending.lesson.unit} · الصف {pending.lesson.grade}</p><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4"><InfoBox label="الحصص" value={pending.sessions.length} /><InfoBox label="المخرجات" value={pending.sessions.reduce((sum, s) => sum + s.officialOutcomes.length + s.additionalObjectives.length, 0)} /><InfoBox label="العناصر التعليمية" value={pending.sessions.reduce((sum, s) => sum + s.educationalElements.length, 0)} /><InfoBox label="حالة التدقيق" value={pending.status === 'complete' ? 'مكتمل' : 'تحتاج مراجعة'} /></div></div>}
            <button onClick={commitPending} disabled={!pending || issues.some(issue => issue.level === 'error')} className="w-full rounded-xl bg-primary py-3 font-black text-white disabled:opacity-40"><Save className="ml-2 inline" size={18} />حفظ التحضير في المكتبة</button>
          </div>}

          {dialog === 'manual' && <div className="grid gap-4 p-5 md:grid-cols-2">
            {(['subject','grade','unit','title','sessionTitle'] as const).map(field => <label key={field} className="space-y-2"><span className="text-xs font-black text-textSecondary">{{ subject:'المادة', grade:'الصف', unit:'الوحدة', title:'عنوان الدرس', sessionTitle:'عنوان الحصة' }[field]}</span><input value={manual[field]} onChange={event => setManual(previous => ({ ...previous, [field]: event.target.value }))} className="w-full rounded-xl border border-borderColor bg-bgCard p-3 font-bold text-textPrimary outline-none focus:border-primary" /></label>)}
            <label className="space-y-2 md:col-span-2"><span className="text-xs font-black text-textSecondary">سير الدرس الأولي</span><textarea rows={7} value={manual.procedures} onChange={event => setManual(previous => ({ ...previous, procedures: event.target.value }))} className="w-full rounded-xl border border-borderColor bg-bgCard p-3 font-bold text-textPrimary outline-none focus:border-primary" /></label>
            <button onClick={createManual} className="rounded-xl bg-primary py-3 font-black text-white md:col-span-2"><Save className="ml-2 inline" size={18} />حفظ التحضير اليدوي</button>
          </div>}

          {dialog === 'preview' && selected && activeSession && <div className="p-5"><SessionSelector preparation={selected} number={activeSession.number} onChange={setSelectedSessionNumber} /><SessionDetails session={activeSession} /></div>}

          {dialog === 'teaching' && selected && activeSession && <div className="p-4 md:p-6">
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-borderColor bg-bgCard p-4 md:flex-row md:items-center md:justify-between"><div><span className="text-xs font-black text-primary">الحصة {activeSession.number} من {selected.sessions.length}</span><h3 className="text-xl font-black text-textPrimary">{activeSession.title}</h3><p className="text-xs font-bold text-textSecondary">صفحات الكتاب: {activeSession.bookPages.join('، ') || 'غير محددة'}</p></div><SessionSelector preparation={selected} number={activeSession.number} onChange={changeTeachingSession} compact /></div>
            {activeStep ? <article className="min-h-[45vh] rounded-3xl border border-borderColor bg-bgCard p-5 md:p-8"><div className="mb-5 flex items-center justify-between gap-3"><div><span className="text-xs font-black text-primary">الخطوة {stepIndex + 1} من {steps.length}</span><h4 className="mt-1 text-2xl font-black text-textPrimary">{activeStep.title}</h4></div><button onClick={toggleStep} className={`rounded-xl px-4 py-3 font-black ${completedSteps.includes(activeStep.key) ? 'bg-success text-white' : 'bg-bgSoft text-textPrimary'}`}>{completedSteps.includes(activeStep.key) ? <CheckCircle2 className="ml-2 inline" size={18} /> : <Circle className="ml-2 inline" size={18} />}تم التنفيذ</button></div><div className="prose prose-lg max-w-none leading-9 text-textPrimary" dangerouslySetInnerHTML={{ __html: sanitizePreparationHtml(activeStep.html) }} /></article> : <div className="rounded-2xl bg-warning/10 p-6 text-center font-black text-textPrimary">لا توجد خطوات قابلة للعرض في هذه الحصة.</div>}
            <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr_auto]"><button onClick={() => setStepIndex(index => Math.max(0, index - 1))} disabled={stepIndex === 0} className="rounded-xl bg-bgCard px-5 py-3 font-black text-textPrimary disabled:opacity-35"><ChevronRight className="ml-2 inline" />السابق</button><div className="flex gap-2 overflow-x-auto rounded-xl bg-bgCard p-2">{steps.map((step, index) => <button key={step.key} onClick={() => setStepIndex(index)} className={`h-3 min-w-8 rounded-full ${index === stepIndex ? 'bg-primary' : completedSteps.includes(step.key) ? 'bg-success' : 'bg-borderColor'}`} title={step.title} />)}</div><button onClick={() => setStepIndex(index => Math.min(steps.length - 1, index + 1))} disabled={stepIndex >= steps.length - 1} className="rounded-xl bg-primary px-5 py-3 font-black text-white disabled:opacity-35">التالي<ChevronLeft className="mr-2 inline" /></button></div>
            <div className="mt-4 rounded-2xl border border-borderColor bg-bgCard p-4"><label className="text-xs font-black text-textSecondary">ملاحظة سريعة للحصة</label><textarea value={quickNote} onChange={event => setQuickNote(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-borderColor bg-bgSoft p-3 font-bold text-textPrimary outline-none focus:border-primary" placeholder="ما تم تنفيذه، ما يحتاج استكمالًا، أو ملاحظة للحصة القادمة" /><button onClick={updateSessionNote} className="mt-2 rounded-xl bg-bgSoft px-4 py-2 text-sm font-black text-textPrimary"><Save className="ml-2 inline" size={16} />حفظ الملاحظة</button></div>
          </div>}
        </div>
      </div>}
    </div>
  );
};

const InfoBox: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="rounded-xl bg-bgSoft p-3 text-center"><b className="block text-lg text-primary">{value}</b><span className="text-[10px] font-bold text-textSecondary">{label}</span></div>;

const SessionSelector: React.FC<{ preparation: TeacherPreparation; number: number; onChange: (number: number) => void; compact?: boolean }> = ({ preparation, number, onChange, compact }) => <select value={number} onChange={event => onChange(Number(event.target.value))} className={`rounded-xl border border-borderColor bg-bgSoft font-black text-textPrimary outline-none focus:border-primary ${compact ? 'p-3 text-sm' : 'mb-4 w-full p-3'}`}>{preparation.sessions.map(session => <option key={session.number} value={session.number}>الحصة {session.number}: {session.title}</option>)}</select>;

const HtmlBlock: React.FC<{ title: string; html: string }> = ({ title, html }) => stripHtml(html) ? <section className="rounded-2xl border border-borderColor bg-bgCard p-4"><h4 className="mb-3 font-black text-primary">{title}</h4><div className="prose max-w-none leading-8 text-textPrimary" dangerouslySetInnerHTML={{ __html: sanitizePreparationHtml(html) }} /></section> : null;

const SessionDetails: React.FC<{ session: PreparationSession }> = ({ session }) => <div className="space-y-3"><div className="rounded-2xl border border-borderColor bg-bgCard p-4"><h3 className="text-xl font-black text-textPrimary">الحصة {session.number}: {session.title}</h3><p className="mt-1 text-sm font-bold text-textSecondary">صفحات الكتاب: {session.bookPages.join('، ') || 'غير محددة'}</p><div className="mt-4 grid gap-3 md:grid-cols-2"><ListBox title="المخرجات الرسمية" items={session.officialOutcomes.map(item => item.text)} /><ListBox title="المخرجات الإضافية" items={session.additionalObjectives} /><ListBox title="الاستراتيجيات" items={session.strategies} /><ListBox title="المصادر" items={session.resources} /></div></div><HtmlBlock title="المفاهيم" html={session.conceptsHtml} /><HtmlBlock title="التهيئة والتمهيد" html={session.introductionHtml} /><HtmlBlock title="إجراءات سير الدرس" html={session.proceduresHtml} /><HtmlBlock title="التقويم التكويني" html={session.formativeHtml} /><HtmlBlock title="التقويم الختامي" html={session.closingHtml} /><HtmlBlock title="الأنشطة والمهام" html={session.activitiesHtml} /><HtmlBlock title="ملاحظات الخطة" html={session.weeklyCommentsHtml} />{session.notes && <div className="rounded-2xl bg-warning/10 p-4"><b className="text-warning">ملاحظة المعلم:</b><p className="mt-2 font-bold text-textPrimary">{session.notes}</p></div>}</div>;

const ListBox: React.FC<{ title: string; items: string[] }> = ({ title, items }) => <div className="rounded-xl bg-bgSoft p-4"><h4 className="font-black text-primary">{title}</h4>{items.length ? <ul className="mt-2 space-y-1 text-sm font-bold text-textPrimary">{items.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}</ul> : <p className="mt-2 text-xs font-bold text-textSecondary">غير متوفر</p>}</div>;

export default TeacherPreparations;
