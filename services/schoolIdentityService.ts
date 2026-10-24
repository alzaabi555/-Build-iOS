/**
 * Rased School Identity Client v1.1.0
 * يدعم الفحص الآمن والترحيل التجريبي المحكوم لخمسة طلاب كحد أقصى.
 */
export type IdentityResolutionStatus = 'matched' | 'created' | 'pending' | 'conflict' | 'invalid';

export interface IdentityStudentInput {
  id?: string;
  localStudentId?: string;
  centralStudentId?: string;
  name: string;
  classes?: string[];
  className?: string;
  rasedId?: string;
  parentCode?: string;
  secretCode?: string;
}

export interface IdentityResolutionResult {
  localStudentId: string;
  status: IdentityResolutionStatus;
  matchMethod?: 'trusted_identifier' | 'transitional_name_class';
  centralStudentId?: string;
  schoolId?: string;
  rasedId?: string;
  legacyRasedIds?: string[];
  conflictId?: string;
  candidateCount?: number;
  error?: string;
}

export interface BatchResolutionResponse {
  ok: boolean;
  schoolId?: string;
  schoolCode?: string;
  results?: IdentityResolutionResult[];
  summary?: Partial<Record<IdentityResolutionStatus, number>>;
  migrationJobId?: string;
  error?: string;
}

// انقل هنا رابط /exec نفسه من النسخة الحالية من schoolIdentityService.ts.
const SCHOOL_IDENTITY_URL = 'PASTE_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE';
const REQUEST_TIMEOUT_MS = 30000;

const getServiceUrl = () => {
  const url = SCHOOL_IDENTITY_URL.trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(url)) {
    throw new Error('SCHOOL_IDENTITY_URL_NOT_CONFIGURED');
  }
  return url;
};

const postJson = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(getServiceUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`IDENTITY_HTTP_${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('IDENTITY_REQUEST_TIMEOUT');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const normalizeStudents = (students: IdentityStudentInput[]) => students.map((student) => ({
  localStudentId: String(student.localStudentId || student.id || '').trim(),
  centralStudentId: String(student.centralStudentId || '').trim(),
  name: String(student.name || '').trim(),
  classes: Array.isArray(student.classes) ? student.classes : undefined,
  className: String(student.className || '').trim(),
  rasedId: String(student.rasedId || '').trim(),
  parentCode: String(student.parentCode || '').trim(),
  secretCode: String(student.secretCode || '').trim(),
}));

export const inspectStudentsIdentity = async (params: {
  schoolCode: string;
  actorId: string;
  students: IdentityStudentInput[];
}): Promise<BatchResolutionResponse> => {
  const schoolCode = String(params.schoolCode || '').trim();
  const actorId = String(params.actorId || '').trim();
  if (!schoolCode) throw new Error('SCHOOL_CODE_REQUIRED');
  if (!actorId) throw new Error('ACTOR_ID_REQUIRED');
  if (!params.students?.length) throw new Error('STUDENTS_REQUIRED');
  return postJson<BatchResolutionResponse>({
    action: 'batchResolveStudents',
    schoolCode,
    actorId,
    allowCreate: false,
    students: normalizeStudents(params.students),
  });
};

/** ترحيل تجريبي فقط، من 1 إلى 5 طلاب، ولا يحدّث سجلات التطبيق المحلية. */
export const migratePilotStudents = async (params: {
  schoolCode: string;
  actorId: string;
  requestId: string;
  confirmationText: string;
  students: IdentityStudentInput[];
}): Promise<BatchResolutionResponse> => {
  const schoolCode = String(params.schoolCode || '').trim();
  const actorId = String(params.actorId || '').trim();
  const requestId = String(params.requestId || '').trim();
  const confirmationText = String(params.confirmationText || '').trim();
  const students = params.students || [];
  if (!schoolCode) throw new Error('SCHOOL_CODE_REQUIRED');
  if (!actorId) throw new Error('ACTOR_ID_REQUIRED');
  if (!requestId) throw new Error('REQUEST_ID_REQUIRED');
  if (confirmationText !== 'ترحيل تجريبي') throw new Error('MIGRATION_CONFIRMATION_REQUIRED');
  if (students.length < 1 || students.length > 5) throw new Error('PILOT_SIZE_MUST_BE_1_TO_5');
  return postJson<BatchResolutionResponse>({
    action: 'migratePilotStudents',
    schoolCode,
    actorId,
    requestId,
    confirmationText,
    students: normalizeStudents(students),
  });
};
