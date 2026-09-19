export type CertificateTemplateMode = 'builtin' | 'image';
export type CertificateFieldKey =
  | 'title' | 'awardTitle' | 'studentName' | 'bodyText'
  | 'grade' | 'points' | 'subject' | 'monthName'
  | 'teacherName' | 'schoolName' | 'issueDate';

export interface CertificateFieldStyle {
  x: number; y: number; width: number;
  fontSize: number; color: string; visible: boolean;
  align: 'right' | 'center' | 'left'; fontWeight: number;
}

export interface CertificateSettings {
  version: 1;
  mode: CertificateTemplateMode;
  templateDataUrl?: string;
  templateFileName?: string;
  title: string;
  awardTitle: string;
  bodyText: string;
  showMinistryLogo: boolean;
  showStamp: boolean;
  fields: Record<CertificateFieldKey, CertificateFieldStyle>;
}

export const CERTIFICATE_SETTINGS_KEY = 'rased_monthly_knight_certificate_settings_v1';

export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  version: 1,
  mode: 'builtin',
  title: 'شهادة تميز',
  awardTitle: 'فارس الشهر',
  bodyText: 'تقديرًا لجهوده المتميزة، وحرصه على المشاركة الفاعلة، وما أظهره من التزام وعطاء خلال الشهر، متمنين له دوام التوفيق والتقدم.',
  showMinistryLogo: true,
  showStamp: true,
  fields: {
    title: { x: 50, y: 25, width: 60, fontSize: 52, color: '#0f2f59', visible: true, align: 'center', fontWeight: 1000 },
    awardTitle: { x: 50, y: 34, width: 42, fontSize: 22, color: '#102a56', visible: true, align: 'center', fontWeight: 950 },
    studentName: { x: 50, y: 53, width: 70, fontSize: 40, color: '#173a70', visible: true, align: 'center', fontWeight: 1000 },
    bodyText: { x: 50, y: 66, width: 76, fontSize: 18, color: '#334155', visible: true, align: 'center', fontWeight: 700 },
    grade: { x: 26, y: 81, width: 22, fontSize: 18, color: '#173a70', visible: true, align: 'center', fontWeight: 950 },
    points: { x: 50, y: 81, width: 22, fontSize: 18, color: '#173a70', visible: true, align: 'center', fontWeight: 950 },
    subject: { x: 74, y: 81, width: 22, fontSize: 18, color: '#173a70', visible: true, align: 'center', fontWeight: 950 },
    monthName: { x: 50, y: 37, width: 40, fontSize: 18, color: '#102a56', visible: true, align: 'center', fontWeight: 950 },
    teacherName: { x: 22, y: 93, width: 25, fontSize: 14, color: '#0f2f59', visible: true, align: 'center', fontWeight: 800 },
    schoolName: { x: 82, y: 10, width: 25, fontSize: 15, color: '#0f2f59', visible: true, align: 'right', fontWeight: 900 },
    issueDate: { x: 16, y: 10, width: 18, fontSize: 13, color: '#526078', visible: true, align: 'left', fontWeight: 700 },
  },
};

export function loadCertificateSettings(): CertificateSettings {
  try {
    const raw = localStorage.getItem(CERTIFICATE_SETTINGS_KEY);
    if (!raw) return DEFAULT_CERTIFICATE_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CERTIFICATE_SETTINGS, ...parsed, fields: { ...DEFAULT_CERTIFICATE_SETTINGS.fields, ...(parsed.fields || {}) } };
  } catch { return DEFAULT_CERTIFICATE_SETTINGS; }
}

export function saveCertificateSettings(settings: CertificateSettings) {
  const serialized = JSON.stringify(settings);
  localStorage.setItem(CERTIFICATE_SETTINGS_KEY, serialized);
  if (localStorage.getItem(CERTIFICATE_SETTINGS_KEY) !== serialized) throw new Error('CERTIFICATE_SETTINGS_SAVE_FAILED');
}
