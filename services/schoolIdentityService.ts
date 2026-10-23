/**
 * Rased School Identity Client v1.0.0
 * المرحلة الأولى: فحص ومطابقة فقط، من دون إنشاء هويات أو تغيير أكواد RSD.
 */

export type IdentityResolutionStatus =
  | 'matched'
  | 'created'
  | 'pending'
  | 'conflict'
  | 'invalid';

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
  error?: string;
}

export interface SchoolResolutionResponse {
  ok: boolean;
  status?: 'matched' | 'not_found';
  schoolCode?: string;
  school?: {
    schoolId: string;
    schoolCode: string;
    schoolName: string;
    status: string;
  };
  error?: string;
}

export interface HealthCheckResponse {
  ok: boolean;
  service?: string;
  version?: string;
  timestamp?: string;
  error?: string;
}

// ضع هنا رابط النشر المنتهي بـ /exec فقط.
// لا تستخدم رابط /dev في التطبيق.
const SCHOOL_IDENTITY_URL = 'PASTE_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE';
const REQUEST_TIMEOUT_MS = 30000;

const getServiceUrl = (): string => {
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

    if (!response.ok) {
      throw new Error(`IDENTITY_HTTP_${response.status}`);
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('IDENTITY_REQUEST_TIMEOUT');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const healthCheck = async (): Promise<HealthCheckResponse> =>
  postJson<HealthCheckResponse>({ action: 'healthCheck' });

export const resolveSchool = async (
  schoolCode: string,
): Promise<SchoolResolutionResponse> => {
  const cleanSchoolCode = String(schoolCode || '').trim();
  if (!cleanSchoolCode) throw new Error('SCHOOL_CODE_REQUIRED');

  return postJson<SchoolResolutionResponse>({
    action: 'resolveSchool',
    schoolCode: cleanSchoolCode,
  });
};

/**
 * فحص آمن فقط: allowCreate مثبتة دائمًا على false.
 * لا تنشئ هذه الدالة centralStudentId أو RSD جديدًا.
 */
export const inspectStudentsIdentity = async (params: {
  schoolCode: string;
  actorId: string;
  students: IdentityStudentInput[];
}): Promise<BatchResolutionResponse> => {
  const schoolCode = String(params.schoolCode || '').trim();
  const actorId = String(params.actorId || '').trim();
  const students = Array.isArray(params.students) ? params.students : [];

  if (!schoolCode) throw new Error('SCHOOL_CODE_REQUIRED');
  if (!actorId) throw new Error('ACTOR_ID_REQUIRED');
  if (!students.length) throw new Error('STUDENTS_REQUIRED');

  return postJson<BatchResolutionResponse>({
    action: 'batchResolveStudents',
    schoolCode,
    actorId,
    allowCreate: false,
    students: students.map((student) => ({
      localStudentId: String(student.localStudentId || student.id || '').trim(),
      centralStudentId: String(student.centralStudentId || '').trim(),
      name: String(student.name || '').trim(),
      classes: Array.isArray(student.classes) ? student.classes : undefined,
      className: String(student.className || '').trim(),
      rasedId: String(student.rasedId || '').trim(),
      parentCode: String(student.parentCode || '').trim(),
      secretCode: String(student.secretCode || '').trim(),
    })),
  });
};
