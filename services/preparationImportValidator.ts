import type {
  PreparationEducationalElement,
  PreparationFutureSkill,
  PreparationOutcomeAlignment,
  PreparationSession,
  PreparationValidationIssue,
  PreparationValidationResult,
  TeacherPreparation
} from '../types/preparationTypes';

const array = <T = unknown>(value: unknown): T[] => Array.isArray(value) ? value as T[] : value == null || value === '' ? [] : [value as T];
const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
const id = () => globalThis.crypto?.randomUUID?.() || `prep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function sanitizePreparationHtml(value: unknown): string {
  const html = String(value ?? '');
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return clean(html.replace(/<[^>]*>/g, ' '));
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(node => node.remove());
  doc.querySelectorAll('*').forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || ['srcdoc', 'formaction'].includes(name)) element.removeAttribute(attribute.name);
      if (['href', 'src'].includes(name) && /^\s*javascript:/i.test(attribute.value)) element.removeAttribute(attribute.name);
    });
  });
  return doc.body.firstElementChild?.innerHTML || '';
}

function normalizeOutcome(value: unknown): { id?: string; text: string } | null {
  if (typeof value === 'string') return clean(value) ? { text: clean(value) } : null;
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    const text = clean(row.text);
    return text ? { id: clean(row.id) || undefined, text } : null;
  }
  return null;
}

function normalizeFutureSkill(value: unknown): PreparationFutureSkill | null {
  if (typeof value === 'string') return clean(value) ? { skill: clean(value) } : null;
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const skill = clean(row.skill || row.name);
  return skill ? { skill, studentPerformance: clean(row.studentPerformance) || undefined, assessmentEvidence: clean(row.assessmentEvidence) || undefined } : null;
}

function normalizeSession(rawValue: unknown, lessonFallback: Record<string, unknown>, fallbackNumber: number): PreparationSession {
  const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as Record<string, any>;
  const meta = raw.session || {};
  const explicitOutcomes = array(raw.outcomes).map(normalizeOutcome).filter(Boolean) as Array<{ id?: string; text: string }>;
  const official = array(raw.officialOutcomes || raw.official_outcomes).map(normalizeOutcome).filter(Boolean) as Array<{ id?: string; text: string }>;
  const additional = array(raw.additionalObjectives || raw.additional_objectives || raw.objective)
    .map(item => typeof item === 'string' ? clean(item) : clean((item as any)?.text)).filter(Boolean);
  const futureSkills = array(raw.futureSkills).map(normalizeFutureSkill).filter(Boolean) as PreparationFutureSkill[];
  return {
    number: Number(meta.number || raw.sessionNumber || fallbackNumber) || fallbackNumber,
    title: clean(meta.title || raw.sessionTitle || `الحصة ${fallbackNumber}`),
    bookPages: array(meta.bookPages || raw.bookPages).map(clean).filter(Boolean),
    officialOutcomes: official.length ? official : explicitOutcomes.filter(outcome => array(raw.outcomes).some((item: any) => item?.id === outcome.id && item?.type === 'official')),
    additionalObjectives: additional.length ? additional : array(raw.outcomes).filter((item: any) => item?.type === 'additional').map((item: any) => clean(item.text)).filter(Boolean),
    taxonomies: array(raw.taxonomies).map((item: any) => clean(item?.label || item?.text || item)).filter(Boolean),
    strategies: array(raw.strategies).map((item: any) => clean(item?.label || item?.text || item)).filter(Boolean),
    resources: array(raw.resources || raw.teaching_aids).map((item: any) => clean(item?.label || item?.text || item)).filter(Boolean),
    conceptsHtml: sanitizePreparationHtml(raw.concepts || raw.conceptHtml || raw.lesson_vocabulary),
    introductionHtml: sanitizePreparationHtml(raw.introduction || raw.introductionHtml || raw.description),
    preLearningHtml: sanitizePreparationHtml(raw.preLearning || raw.preLearningHtml || raw.pre_learning),
    proceduresHtml: sanitizePreparationHtml(raw.lessonProcedures || raw.proceduresHtml || raw.thinking_skills),
    formativeHtml: sanitizePreparationHtml(raw.formativeAssessment || raw.formativeHtml || raw.formative_assessment),
    closingHtml: sanitizePreparationHtml(raw.closingAssessment || raw.closingHtml || raw.closing_assessment),
    activitiesHtml: sanitizePreparationHtml(raw.activities || raw.activitiesHtml),
    weeklyCommentsHtml: sanitizePreparationHtml(raw.weeklyPlanComments || raw.weeklyCommentsHtml || raw.weekly_study_plan_comments),
    educationalElements: array<PreparationEducationalElement>(raw.educationalElements),
    outcomeAlignments: array<PreparationOutcomeAlignment>(raw.outcomeAlignments),
    futureSkills,
    notes: clean(raw.notes),
    status: 'complete'
  };
}

export function parsePreparationPackage(rawValue: unknown, sourceType: TeacherPreparation['sourceType']): PreparationValidationResult {
  const issues: PreparationValidationIssue[] = [];
  if (!rawValue || typeof rawValue !== 'object') return { valid: false, issues: [{ level: 'error', path: 'root', message: 'محتوى الحزمة ليس كائن JSON صالحًا.' }] };
  const raw = rawValue as Record<string, any>;
  const lesson = raw.lesson || raw.sessions?.[0]?.lesson || {};
  const rawSessions = Array.isArray(raw.sessions) ? raw.sessions : [raw];
  if (!rawSessions.length) issues.push({ level: 'error', path: 'sessions', message: 'لا توجد حصص داخل الحزمة.' });
  const sessions = rawSessions.map((item, index) => normalizeSession(item, lesson, index + 1)).sort((a, b) => a.number - b.number);
  const seen = new Set<number>();
  sessions.forEach((session, index) => {
    if (seen.has(session.number)) issues.push({ level: 'error', path: `sessions.${index}.number`, message: `رقم الحصة ${session.number} مكرر.` });
    seen.add(session.number);
    const outcomeCount = session.officialOutcomes.length + session.additionalObjectives.length;
    if (outcomeCount < 3) issues.push({ level: 'warning', path: `sessions.${session.number}.outcomes`, message: `الحصة ${session.number} تحتوي ${outcomeCount} مخرج فقط.` });
    if (!session.proceduresHtml) issues.push({ level: 'warning', path: `sessions.${session.number}.procedures`, message: `سير الدرس غير موجود في الحصة ${session.number}.` });
    if (!session.formativeHtml) issues.push({ level: 'warning', path: `sessions.${session.number}.formative`, message: `التقويم التكويني غير موجود في الحصة ${session.number}.` });
  });
  const title = clean(lesson.title);
  if (!title) issues.push({ level: 'error', path: 'lesson.title', message: 'عنوان الدرس غير موجود.' });
  const now = new Date().toISOString();
  const preparation: TeacherPreparation = {
    id: clean(raw.id || raw.preparationId) || id(),
    format: clean(raw.format) || 'NOOR_COPILOT_LESSON_PACKAGE_V2',
    version: clean(raw.version) || '1.0',
    lesson: {
      title,
      unit: clean(lesson.unit || lesson.unitTitle),
      grade: clean(lesson.grade),
      totalSessions: Number(lesson.totalSessions || sessions.length) || sessions.length,
      subject: clean(lesson.subject || raw.subject)
    },
    sessions,
    packageRules: raw.packageRules || {},
    finalQualityAudit: raw.finalQualityAudit || {},
    linkedClasses: [],
    status: issues.some(issue => issue.level === 'warning') ? 'needs_review' : 'complete',
    sourceType,
    createdAt: now,
    updatedAt: now
  };
  return { valid: !issues.some(issue => issue.level === 'error'), issues, preparation };
}
