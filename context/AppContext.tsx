import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import type {
  AssessmentTool,
  CertificateSettings,
  GradeSettings,
  Group,
  GroupCategorization,
  PeriodTime,
  RasedBackupPayload,
  RasedExtendedStorageSnapshot,
  ScheduleDay,
  Student
} from '../types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { translations } from './translations';

export type Language = 'ar' | 'en';

export interface TeacherInfo {
  name: string;
  school: string;
  subject: string;
  governorate: string;
  avatar?: string;
  stamp?: string;
  ministryLogo?: string;
  academicYear?: string;
  gender?: 'male' | 'female';
  civilId?: string;
  role?: 'teacher' | 'senior';
  departmentName?: string;
}

export interface RestoreBackupOptions {
  saveToDeviceFile?: boolean;
  reloadAfterRestore?: boolean;
}

interface AppContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  classes: string[];
  setClasses: React.Dispatch<React.SetStateAction<string[]>>;
  hiddenClasses: string[];
  setHiddenClasses: React.Dispatch<React.SetStateAction<string[]>>;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  schedule: ScheduleDay[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleDay[]>>;
  periodTimes: PeriodTime[];
  setPeriodTimes: React.Dispatch<React.SetStateAction<PeriodTime[]>>;
  teacherInfo: TeacherInfo;
  setTeacherInfo: React.Dispatch<React.SetStateAction<TeacherInfo>>;
  currentSemester: '1' | '2';
  setCurrentSemester: React.Dispatch<React.SetStateAction<'1' | '2'>>;
  assessmentTools: AssessmentTool[];
  setAssessmentTools: React.Dispatch<React.SetStateAction<AssessmentTool[]>>;
  gradeSettings: GradeSettings;
  setGradeSettings: React.Dispatch<React.SetStateAction<GradeSettings>>;
  certificateSettings: CertificateSettings;
  setCertificateSettings: React.Dispatch<React.SetStateAction<CertificateSettings>>;
  isDataLoaded: boolean;
  defaultStudentGender: 'male' | 'female';
  setDefaultStudentGender: React.Dispatch<React.SetStateAction<'male' | 'female'>>;
  categorizations: GroupCategorization[];
  setCategorizations: React.Dispatch<React.SetStateAction<GroupCategorization[]>>;
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  t: (key: keyof typeof translations['ar'] | string) => string;
  dir: 'rtl' | 'ltr';
  createBackupPayload: () => RasedBackupPayload;
  restoreBackupPayload: (
    rawBackup: unknown,
    options?: RestoreBackupOptions
  ) => Promise<RasedBackupPayload>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const RASED_DB_FILENAME = 'teacher_raseddatabasev2.json';
export const RASED_BACKUP_SCHEMA_VERSION = 5;
export const RASED_APP_DATA_VERSION = '5.0.0';

const CORE_STORAGE_KEYS = {
  students: 'teacher_studentData',
  classes: 'teacher_classesData',
  hiddenClasses: 'teacher_hiddenClasses',
  groups: 'teacher_groupsData',
  categorizations: 'teacher_categorizationsData',
  schedule: 'teacher_scheduleData',
  periodTimes: 'teacher_periodTimes',
  assessmentTools: 'teacher_assessmentTools',
  gradeSettings: 'teacher_gradeSettings',
  certificateSettings: 'teacher_certificateSettings',
  currentSemester: 'teacher_currentSemester',
  defaultStudentGender: 'teacher_defaultStudentGender',
  language: 'teacher_appLanguage'
} as const;

const EXTENDED_STORAGE_KEYS = {
  termPlan: 'rased_term_plan',
  assessmentPlan: 'rased_assessment_plan',
  tasks: 'rased_teacher_tasks',
  libraryArchive: 'rased_library_archive',
  sentMessagesLocal: 'rased_teacher_sent_messages_local',
  gradingSettings: 'rased_grading_settings'
} as const;

const GAME_STORAGE_EXACT_KEYS = ['rased_game_questions'] as const;
const GAME_STORAGE_PREFIXES = [
  'rased_teacher_game_questions_',
  'rased_student_game_results_log_',
  'rased_student_latest_game_result_'
] as const;

const DEFAULT_GRADE_SETTINGS: GradeSettings = {
  totalScore: 100,
  finalExamScore: 40,
  finalExamName: 'الامتحان النهائي'
};

const DEFAULT_EXTENDED_GRADING_SETTINGS = {
  totalScore: 100,
  finalExamWeight: 40,
  finalExamName: 'الامتحان النهائي'
};

const normalizeGradeSettings = (value: unknown): GradeSettings => {
  let source: any = value;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return { ...DEFAULT_GRADE_SETTINGS };
  }

  const totalScore = Number(source.totalScore);
  const finalExamScore = Number(
    source.finalExamScore ?? source.finalExamWeight
  );
  const safeTotalScore =
    Number.isFinite(totalScore) && totalScore > 0
      ? totalScore
      : DEFAULT_GRADE_SETTINGS.totalScore;
  const safeFinalExamScore =
    Number.isFinite(finalExamScore) &&
    finalExamScore >= 0 &&
    finalExamScore <= safeTotalScore
      ? finalExamScore
      : DEFAULT_GRADE_SETTINGS.finalExamScore;

  return {
    ...DEFAULT_GRADE_SETTINGS,
    ...source,
    totalScore: safeTotalScore,
    finalExamScore: safeFinalExamScore,
    finalExamName:
      String(source.finalExamName || '').trim() ||
      DEFAULT_GRADE_SETTINGS.finalExamName
  };
};

const normalizeExtendedGradingSettings = (value: unknown) => {
  let source: any = value;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return { ...DEFAULT_EXTENDED_GRADING_SETTINGS };
  }

  const totalScore = Number(source.totalScore);
  const finalExamWeight = Number(
    source.finalExamWeight ?? source.finalExamScore
  );
  const safeTotalScore =
    Number.isFinite(totalScore) && totalScore > 0
      ? totalScore
      : DEFAULT_EXTENDED_GRADING_SETTINGS.totalScore;
  const safeFinalExamWeight =
    Number.isFinite(finalExamWeight) &&
    finalExamWeight >= 0 &&
    finalExamWeight <= safeTotalScore
      ? finalExamWeight
      : DEFAULT_EXTENDED_GRADING_SETTINGS.finalExamWeight;

  return {
    ...DEFAULT_EXTENDED_GRADING_SETTINGS,
    ...source,
    totalScore: safeTotalScore,
    finalExamWeight: safeFinalExamWeight,
    finalExamName:
      String(source.finalExamName || '').trim() ||
      DEFAULT_EXTENDED_GRADING_SETTINGS.finalExamName
  };
};

const DEFAULT_GROUPS: Group[] = [
  { id: 'g1', name: 'الصقور', color: 'emerald' },
  { id: 'g2', name: 'النمور', color: 'orange' },
  { id: 'g3', name: 'النجوم', color: 'purple' },
  { id: 'g4', name: 'الرواد', color: 'blue' }
];

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { dayName: 'الأحد', periods: Array(8).fill('') },
  { dayName: 'الاثنين', periods: Array(8).fill('') },
  { dayName: 'الثلاثاء', periods: Array(8).fill('') },
  { dayName: 'الأربعاء', periods: Array(8).fill('') },
  { dayName: 'الخميس', periods: Array(8).fill('') }
];

const createDefaultPeriodTimes = (): PeriodTime[] =>
  Array.from({ length: 8 }, (_, index) => ({
    periodNumber: index + 1,
    startTime: '',
    endTime: ''
  }));

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const readStorageJson = <T,>(key: string, fallback: T): T =>
  safeJsonParse<T>(localStorage.getItem(key), fallback);

const writeStorageJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const collectGameStorage = (): Record<string, unknown> => {
  const collected: Record<string, unknown> = {};

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;

      const isExactKey = GAME_STORAGE_EXACT_KEYS.includes(
        key as (typeof GAME_STORAGE_EXACT_KEYS)[number]
      );
      const hasKnownPrefix = GAME_STORAGE_PREFIXES.some(prefix =>
        key.startsWith(prefix)
      );

      if (!isExactKey && !hasKnownPrefix) continue;

      const rawValue = localStorage.getItem(key);
      if (rawValue === null) continue;
      collected[key] = safeJsonParse<unknown>(rawValue, rawValue);
    }
  } catch (error) {
    console.warn('Unable to collect game storage.', error);
  }

  return collected;
};

export const readRasedExtendedStorage = (): RasedExtendedStorageSnapshot => ({
  termPlan: readStorageJson(EXTENDED_STORAGE_KEYS.termPlan, []),
  assessmentPlan: readStorageJson(EXTENDED_STORAGE_KEYS.assessmentPlan, []),
  tasks: readStorageJson(EXTENDED_STORAGE_KEYS.tasks, []),
  libraryArchive: readStorageJson(EXTENDED_STORAGE_KEYS.libraryArchive, []),
  sentMessagesLocal: readStorageJson(
    EXTENDED_STORAGE_KEYS.sentMessagesLocal,
    []
  ),
  gradingSettings: normalizeExtendedGradingSettings(
    localStorage.getItem(EXTENDED_STORAGE_KEYS.gradingSettings)
  ),
  gameStorage: collectGameStorage()
});

export const writeRasedExtendedStorage = (
  snapshot?: Partial<RasedExtendedStorageSnapshot> | null
) => {
  if (!snapshot) return;

  if (Array.isArray(snapshot.termPlan)) {
    writeStorageJson(EXTENDED_STORAGE_KEYS.termPlan, snapshot.termPlan);
  }
  if (Array.isArray(snapshot.assessmentPlan)) {
    writeStorageJson(
      EXTENDED_STORAGE_KEYS.assessmentPlan,
      snapshot.assessmentPlan
    );
  }
  if (Array.isArray(snapshot.tasks)) {
    writeStorageJson(EXTENDED_STORAGE_KEYS.tasks, snapshot.tasks);
  }
  if (Array.isArray(snapshot.libraryArchive)) {
    writeStorageJson(
      EXTENDED_STORAGE_KEYS.libraryArchive,
      snapshot.libraryArchive
    );
  }
  if (Array.isArray(snapshot.sentMessagesLocal)) {
    writeStorageJson(
      EXTENDED_STORAGE_KEYS.sentMessagesLocal,
      snapshot.sentMessagesLocal.slice(0, 100)
    );
  }
  if (snapshot.gradingSettings !== undefined) {
    writeStorageJson(
      EXTENDED_STORAGE_KEYS.gradingSettings,
      normalizeExtendedGradingSettings(snapshot.gradingSettings)
    );
  }

  if (snapshot.gameStorage && typeof snapshot.gameStorage === 'object') {
    Object.entries(snapshot.gameStorage).forEach(([key, value]) => {
      const isExactKey = GAME_STORAGE_EXACT_KEYS.includes(
        key as (typeof GAME_STORAGE_EXACT_KEYS)[number]
      );
      const hasKnownPrefix = GAME_STORAGE_PREFIXES.some(prefix =>
        key.startsWith(prefix)
      );
      if (!isExactKey && !hasKnownPrefix) return;
      writeStorageJson(key, value);
    });
  }
};

const normalizeArabicName = (name: string) =>
  String(name || '')
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ؤئء]/g, '')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const normalizeArabicDigits = (value: string) => {
  const arabicDigits: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9'
  };

  return String(value || '').replace(
    /[٠-٩۰-۹]/g,
    digit => arabicDigits[digit] || digit
  );
};

const normalizeClassName = (className: string) =>
  normalizeArabicDigits(className)
    .trim()
    .replace(/\s+/g, '')
    .replace(/الصف/g, '')
    .replace(/صف/g, '')
    .replace(/الفصل/g, '')
    .replace(/الشعبة/g, '')
    .replace(/شعبة/g, '')
    .replace(/\\/g, '/')
    .replace(/-/g, '/')
    .replace(/الأول|اول/g, '1')
    .replace(/الثاني|ثاني/g, '2')
    .replace(/الثالث|ثالث/g, '3')
    .replace(/الرابع|رابع/g, '4')
    .replace(/الخامس|خامس/g, '5')
    .replace(/السادس|سادس/g, '6')
    .replace(/السابع|سابع/g, '7')
    .replace(/الثامن|ثامن/g, '8')
    .replace(/التاسع|تاسع/g, '9')
    .replace(/العاشر|عاشر/g, '10')
    .replace(/الحاديعشر|حاديعشر/g, '11')
    .replace(/الثانيعشر|ثانيعشر/g, '12')
    .toLowerCase();

const getStudentClassValue = (student: any) =>
  String(
    student?.classes?.[0] || student?.className || student?.class || ''
  ).trim();

const getExistingRasedCodeFromStudent = (student: any) => {
  const possibleCode = String(
    student?.rasedId ||
      student?.rasedID ||
      student?.secretCode ||
      student?.parentCode ||
      student?.civilID ||
      student?.civilId ||
      ''
  )
    .trim()
    .toUpperCase();

  return possibleCode.startsWith('RSD-') ? possibleCode : '';
};

const makeStudentIdentityKey = (
  schoolName: string,
  name: string,
  className: string
) => {
  const normalizedSchool = String(schoolName || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
  const normalizedName = normalizeArabicName(name).replace(/\s+/g, '');
  const normalizedClass = normalizeClassName(className);
  return `${normalizedSchool}_${normalizedName}_${normalizedClass}`;
};

const hashToRasedCode = (value: string) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = hash * 33 ^ value.charCodeAt(index);
  }

  const code = Math.abs(hash)
    .toString(36)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .padStart(6, '0')
    .substring(0, 6);

  return `RSD-${code}`;
};

const generateRasedId = (
  name: string,
  className: string,
  schoolName = ''
) => {
  if (!name || !className) {
    return `RSD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  return hashToRasedCode(
    makeStudentIdentityKey(schoolName, name, className)
  );
};

const mergeStudentArrays = (oldList: any[] = [], newList: any[] = []) => {
  const map = new Map<string, any>();
  [...oldList, ...newList].forEach(item => {
    if (!item) return;
    const id = String(item.id || item.date || JSON.stringify(item));
    if (!map.has(id)) map.set(id, item);
  });
  return Array.from(map.values());
};

const migrateAndDedupeStudents = (
  rawStudents: any[],
  schoolName: string
): Student[] => {
  const identityMap = new Map<string, any>();

  rawStudents.forEach(rawStudent => {
    if (!rawStudent) return;

    const studentClass = getStudentClassValue(rawStudent) || 'غير محدد';
    const identityKey = makeStudentIdentityKey(
      schoolName,
      rawStudent.name || '',
      studentClass
    );
    const existingCode = getExistingRasedCodeFromStudent(rawStudent);
    const rasedId =
      existingCode ||
      generateRasedId(rawStudent.name || '', studentClass, schoolName);

    const {
      civilID,
      civilId,
      parentCode,
      secretCode,
      rasedID,
      ...cleanStudent
    } = rawStudent;

    const normalizedStudent = {
      ...cleanStudent,
      id: cleanStudent.id || rawStudent.id || rasedId,
      rasedId,
      name: rawStudent.name || '',
      classes:
        Array.isArray(rawStudent.classes) && rawStudent.classes.length > 0
          ? rawStudent.classes
          : [studentClass],
      grade: rawStudent.grade || '',
      parentPhone: rawStudent.parentPhone || '',
      gender: rawStudent.gender || 'male',
      avatar: rawStudent.avatar,
      behaviors: Array.isArray(rawStudent.behaviors)
        ? rawStudent.behaviors
        : [],
      grades: Array.isArray(rawStudent.grades) ? rawStudent.grades : [],
      attendance: Array.isArray(rawStudent.attendance)
        ? rawStudent.attendance
        : [],
      examPapers: Array.isArray(rawStudent.examPapers)
        ? rawStudent.examPapers
        : []
    };

    const existing = identityMap.get(identityKey);
    if (!existing) {
      identityMap.set(identityKey, normalizedStudent);
      return;
    }

    identityMap.set(identityKey, {
      ...existing,
      ...normalizedStudent,
      rasedId: existing.rasedId || normalizedStudent.rasedId,
      parentPhone:
        normalizedStudent.parentPhone || existing.parentPhone,
      gender: normalizedStudent.gender || existing.gender,
      avatar: normalizedStudent.avatar || existing.avatar,
      behaviors: mergeStudentArrays(
        existing.behaviors,
        normalizedStudent.behaviors
      ),
      grades: mergeStudentArrays(existing.grades, normalizedStudent.grades),
      attendance: mergeStudentArrays(
        existing.attendance,
        normalizedStudent.attendance
      ),
      examPapers: mergeStudentArrays(
        existing.examPapers,
        normalizedStudent.examPapers
      )
    });
  });

  return Array.from(identityMap.values());
};

const normalizeLegacyBackup = (
  rawBackup: any,
  fallback: RasedBackupPayload
): RasedBackupPayload => {
  const source = rawBackup?.core
    ? {
        ...rawBackup,
        ...rawBackup.core,
        extendedStorage:
          rawBackup.extendedStorage ||
          rawBackup.teaching ||
          rawBackup.dashboard ||
          {}
      }
    : rawBackup || {};

  const legacyExtended = source.extendedStorage || {};

  return {
    schemaVersion:
      Number(source.schemaVersion) || RASED_BACKUP_SCHEMA_VERSION,
    version: String(source.version || RASED_APP_DATA_VERSION),
    timestamp: String(
      source.timestamp || source.exportedAt || new Date().toISOString()
    ),
    students: Array.isArray(source.students)
      ? source.students
      : fallback.students,
    classes: Array.isArray(source.classes) ? source.classes : fallback.classes,
    hiddenClasses: Array.isArray(source.hiddenClasses)
      ? source.hiddenClasses
      : fallback.hiddenClasses,
    groups: Array.isArray(source.groups) ? source.groups : fallback.groups,
    categorizations: Array.isArray(source.categorizations)
      ? source.categorizations
      : fallback.categorizations,
    schedule: Array.isArray(source.schedule)
      ? source.schedule
      : fallback.schedule,
    periodTimes: Array.isArray(source.periodTimes)
      ? source.periodTimes
      : fallback.periodTimes,
    teacherInfo:
      source.teacherInfo && typeof source.teacherInfo === 'object'
        ? source.teacherInfo
        : fallback.teacherInfo,
    currentSemester:
      source.currentSemester === '2' ? '2' : source.currentSemester === '1'
        ? '1'
        : fallback.currentSemester,
    assessmentTools: Array.isArray(source.assessmentTools)
      ? source.assessmentTools
      : fallback.assessmentTools,
    gradeSettings: normalizeGradeSettings(
      source.gradeSettings ?? fallback.gradeSettings
    ),
    certificateSettings:
      source.certificateSettings &&
      typeof source.certificateSettings === 'object'
        ? { ...fallback.certificateSettings, ...source.certificateSettings }
        : fallback.certificateSettings,
    defaultStudentGender:
      source.defaultStudentGender === 'female' ? 'female' : 'male',
    language: source.language === 'en' ? 'en' : fallback.language,
    extendedStorage: {
      termPlan: Array.isArray(legacyExtended.termPlan)
        ? legacyExtended.termPlan
        : Array.isArray(source.termPlan)
          ? source.termPlan
          : fallback.extendedStorage.termPlan,
      assessmentPlan: Array.isArray(legacyExtended.assessmentPlan)
        ? legacyExtended.assessmentPlan
        : Array.isArray(source.assessmentPlan)
          ? source.assessmentPlan
          : fallback.extendedStorage.assessmentPlan,
      tasks: Array.isArray(legacyExtended.tasks)
        ? legacyExtended.tasks
        : Array.isArray(source.tasks)
          ? source.tasks
          : fallback.extendedStorage.tasks,
      libraryArchive: Array.isArray(legacyExtended.libraryArchive)
        ? legacyExtended.libraryArchive
        : Array.isArray(source.libraryArchive)
          ? source.libraryArchive
          : Array.isArray(source.library)
            ? source.library
            : fallback.extendedStorage.libraryArchive,
      sentMessagesLocal: Array.isArray(legacyExtended.sentMessagesLocal)
        ? legacyExtended.sentMessagesLocal
        : Array.isArray(source.sentMessagesLocal)
          ? source.sentMessagesLocal
          : fallback.extendedStorage.sentMessagesLocal,
      gradingSettings: normalizeExtendedGradingSettings(
        legacyExtended.gradingSettings !== undefined
          ? legacyExtended.gradingSettings
          : source.gradingSettings !== undefined
            ? source.gradingSettings
            : fallback.extendedStorage.gradingSettings
      ),
      gameStorage:
        legacyExtended.gameStorage &&
        typeof legacyExtended.gameStorage === 'object'
          ? legacyExtended.gameStorage
          : source.gameStorage && typeof source.gameStorage === 'object'
            ? source.gameStorage
            : fallback.extendedStorage.gameStorage
    }
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem(CORE_STORAGE_KEYS.language) as Language) || 'ar'
  );

  const currentMonth = new Date().getMonth();
  const defaultSemester: '1' | '2' =
    currentMonth >= 1 && currentMonth <= 7 ? '2' : '1';

  const [currentSemester, setCurrentSemester] = useState<'1' | '2'>(
    defaultSemester
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [hiddenClasses, setHiddenClasses] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [categorizations, setCategorizations] = useState<
    GroupCategorization[]
  >([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>(DEFAULT_SCHEDULE);
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(
    createDefaultPeriodTimes()
  );

  const now = new Date();
  const defaultAcademicYear =
    now.getMonth() >= 7
      ? `${now.getFullYear()} / ${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1} / ${now.getFullYear()}`;

  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>({
    name: '',
    school: '',
    subject: '',
    governorate: '',
    avatar: '',
    stamp: '',
    ministryLogo: '',
    academicYear: defaultAcademicYear,
    gender: 'male',
    civilId: '',
    role: 'teacher',
    departmentName: ''
  });

  const [assessmentTools, setAssessmentTools] = useState<AssessmentTool[]>([]);
  const [gradeSettings, setGradeSettingsState] = useState<GradeSettings>(() =>
    normalizeGradeSettings(
      localStorage.getItem(CORE_STORAGE_KEYS.gradeSettings)
    )
  );
  const setGradeSettings: React.Dispatch<
    React.SetStateAction<GradeSettings>
  > = valueOrUpdater => {
    setGradeSettingsState(previousValue => {
      const nextValue =
        typeof valueOrUpdater === 'function'
          ? valueOrUpdater(normalizeGradeSettings(previousValue))
          : valueOrUpdater;
      return normalizeGradeSettings(nextValue);
    });
  };
  const [certificateSettings, setCertificateSettings] =
    useState<CertificateSettings>({
      title: 'شهادة تفوق دراسي',
      bodyText:
        'تتشرف إدارة المدرسة بمنح الطالب هذه الشهادة نظير تفوقه وتميزه في المادة',
      showDefaultDesign: true
    });
  const [defaultStudentGender, setDefaultStudentGender] = useState<
    'male' | 'female'
  >('male');

  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHeavyEnvironment = () =>
    Capacitor.isNativePlatform() || (window as any).electron !== undefined;

  const createBackupPayload = (): RasedBackupPayload => ({
    schemaVersion: RASED_BACKUP_SCHEMA_VERSION,
    version: RASED_APP_DATA_VERSION,
    timestamp: new Date().toISOString(),
    students,
    classes,
    hiddenClasses,
    groups,
    categorizations,
    schedule,
    periodTimes,
    teacherInfo,
    currentSemester,
    assessmentTools,
    gradeSettings: normalizeGradeSettings(gradeSettings),
    certificateSettings,
    defaultStudentGender,
    language,
    extendedStorage: readRasedExtendedStorage()
  });

  const persistCoreToLocalStorage = (payload: RasedBackupPayload) => {
    writeStorageJson(CORE_STORAGE_KEYS.students, payload.students);
    writeStorageJson(CORE_STORAGE_KEYS.classes, payload.classes);
    writeStorageJson(CORE_STORAGE_KEYS.hiddenClasses, payload.hiddenClasses);
    writeStorageJson(CORE_STORAGE_KEYS.groups, payload.groups);
    writeStorageJson(
      CORE_STORAGE_KEYS.categorizations,
      payload.categorizations
    );
    writeStorageJson(CORE_STORAGE_KEYS.schedule, payload.schedule);
    writeStorageJson(CORE_STORAGE_KEYS.periodTimes, payload.periodTimes);
    writeStorageJson(
      CORE_STORAGE_KEYS.assessmentTools,
      payload.assessmentTools
    );
    writeStorageJson(
      CORE_STORAGE_KEYS.gradeSettings,
      normalizeGradeSettings(payload.gradeSettings)
    );
    writeStorageJson(
      CORE_STORAGE_KEYS.certificateSettings,
      payload.certificateSettings
    );

    localStorage.setItem(
      CORE_STORAGE_KEYS.currentSemester,
      payload.currentSemester
    );
    localStorage.setItem(
      CORE_STORAGE_KEYS.defaultStudentGender,
      payload.defaultStudentGender
    );
    localStorage.setItem(CORE_STORAGE_KEYS.language, payload.language);

    localStorage.setItem('teacher_teacherName', teacherInfo.name || '');
    localStorage.setItem('teacher_schoolName', teacherInfo.school || '');
    localStorage.setItem('teacher_subjectName', teacherInfo.subject || '');
    localStorage.setItem(
      'teacher_governorate',
      teacherInfo.governorate || ''
    );
    localStorage.setItem('teacher_teacherAvatar', teacherInfo.avatar || '');
    localStorage.setItem('teacher_teacherStamp', teacherInfo.stamp || '');
    localStorage.setItem(
      'teacher_ministryLogo',
      teacherInfo.ministryLogo || ''
    );
    localStorage.setItem(
      'teacher_academicYear',
      teacherInfo.academicYear || ''
    );
    localStorage.setItem(
      'teacher_teacherGender',
      teacherInfo.gender || 'male'
    );
    localStorage.setItem('teacher_civilId', teacherInfo.civilId || '');
    localStorage.setItem('teacher_role', teacherInfo.role || 'teacher');
    localStorage.setItem(
      'teacher_departmentName',
      teacherInfo.departmentName || ''
    );
    localStorage.setItem('teacher_lastLocalUpdate', Date.now().toString());

    writeRasedExtendedStorage(payload.extendedStorage);
  };

  const restoreBackupPayload = async (
    rawBackup: unknown,
    options: RestoreBackupOptions = {}
  ): Promise<RasedBackupPayload> => {
    if (!rawBackup || typeof rawBackup !== 'object') {
      throw new Error('INVALID_BACKUP_PAYLOAD');
    }

    const fallback = createBackupPayload();
    const normalized = normalizeLegacyBackup(rawBackup as any, fallback);

    if (!Array.isArray(normalized.students)) {
      throw new Error('INVALID_STUDENTS_DATA');
    }

    const migratedStudents = migrateAndDedupeStudents(
      normalized.students,
      String((normalized.teacherInfo as TeacherInfo)?.school || '')
    );
    const safeTeacherInfo = {
      ...teacherInfo,
      ...(normalized.teacherInfo as TeacherInfo)
    };
    const finalPayload: RasedBackupPayload = {
      ...normalized,
      students: migratedStudents,
      teacherInfo: safeTeacherInfo
    };

    setStudents(finalPayload.students);
    setClasses(finalPayload.classes);
    setHiddenClasses(finalPayload.hiddenClasses);
    setGroups(finalPayload.groups);
    setCategorizations(finalPayload.categorizations);
    setSchedule(finalPayload.schedule);
    setPeriodTimes(finalPayload.periodTimes);
    setTeacherInfo(safeTeacherInfo);
    setCurrentSemester(finalPayload.currentSemester);
    setAssessmentTools(finalPayload.assessmentTools);
    setGradeSettings(normalizeGradeSettings(finalPayload.gradeSettings));
    setCertificateSettings(finalPayload.certificateSettings);
    setDefaultStudentGender(finalPayload.defaultStudentGender);
    setLanguage(finalPayload.language);

    persistCoreToLocalStorage(finalPayload);

    if (options.saveToDeviceFile !== false && isHeavyEnvironment()) {
      await Filesystem.writeFile({
        path: RASED_DB_FILENAME,
        data: JSON.stringify(finalPayload),
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
    }

    if (options.reloadAfterRestore) {
      window.setTimeout(() => window.location.reload(), 400);
    }

    return finalPayload;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        let data: any = null;

        if (isHeavyEnvironment()) {
          try {
            const result = await Filesystem.readFile({
              path: RASED_DB_FILENAME,
              directory: Directory.Data,
              encoding: Encoding.UTF8
            });
            if (result.data) data = JSON.parse(result.data as string);
          } catch {
            console.log('No local database file yet; checking localStorage.');
          }
        }

        if (!data) {
          const storedStudents = localStorage.getItem(
            CORE_STORAGE_KEYS.students
          );
          if (storedStudents) {
            data = {
              students: safeJsonParse(storedStudents, []),
              classes: readStorageJson(CORE_STORAGE_KEYS.classes, []),
              hiddenClasses: readStorageJson(
                CORE_STORAGE_KEYS.hiddenClasses,
                []
              ),
              groups: readStorageJson(CORE_STORAGE_KEYS.groups, DEFAULT_GROUPS),
              categorizations: readStorageJson(
                CORE_STORAGE_KEYS.categorizations,
                []
              ),
              schedule: readStorageJson(
                CORE_STORAGE_KEYS.schedule,
                DEFAULT_SCHEDULE
              ),
              periodTimes: readStorageJson(
                CORE_STORAGE_KEYS.periodTimes,
                createDefaultPeriodTimes()
              ),
              assessmentTools: readStorageJson(
                CORE_STORAGE_KEYS.assessmentTools,
                []
              ),
              gradeSettings: normalizeGradeSettings(
                localStorage.getItem(CORE_STORAGE_KEYS.gradeSettings)
              ),
              certificateSettings: readStorageJson(
                CORE_STORAGE_KEYS.certificateSettings,
                null
              ),
              currentSemester: localStorage.getItem(
                CORE_STORAGE_KEYS.currentSemester
              ),
              defaultStudentGender: localStorage.getItem(
                CORE_STORAGE_KEYS.defaultStudentGender
              ),
              language: localStorage.getItem(CORE_STORAGE_KEYS.language),
              teacherInfo: {
                name: localStorage.getItem('teacher_teacherName') || '',
                school: localStorage.getItem('teacher_schoolName') || '',
                subject: localStorage.getItem('teacher_subjectName') || '',
                governorate:
                  localStorage.getItem('teacher_governorate') || '',
                avatar: localStorage.getItem('teacher_teacherAvatar') || '',
                stamp: localStorage.getItem('teacher_teacherStamp') || '',
                ministryLogo:
                  localStorage.getItem('teacher_ministryLogo') || '',
                academicYear:
                  localStorage.getItem('teacher_academicYear') ||
                  defaultAcademicYear,
                gender:
                  localStorage.getItem('teacher_teacherGender') || 'male',
                civilId: localStorage.getItem('teacher_civilId') || '',
                role: localStorage.getItem('teacher_role') || 'teacher',
                departmentName:
                  localStorage.getItem('teacher_departmentName') || ''
              },
              extendedStorage: readRasedExtendedStorage()
            };
          }
        }

        if (data) {
          const fallback = createBackupPayload();
          const normalized = normalizeLegacyBackup(data, fallback);
          const loadedTeacherInfo = normalized.teacherInfo as TeacherInfo;
          const activeSchoolName =
            loadedTeacherInfo?.school ||
            localStorage.getItem('teacher_schoolName') ||
            '';

          setStudents(
            migrateAndDedupeStudents(normalized.students, activeSchoolName)
          );
          setClasses(normalized.classes);
          setHiddenClasses(normalized.hiddenClasses);
          setGroups(normalized.groups);
          setCategorizations(normalized.categorizations);
          setSchedule(normalized.schedule);
          setPeriodTimes(normalized.periodTimes);
          setAssessmentTools(normalized.assessmentTools);
          setGradeSettings(previous =>
            normalizeGradeSettings({
              ...previous,
              ...normalized.gradeSettings
            })
          );
          setCurrentSemester(normalized.currentSemester);
          setTeacherInfo(previous => ({
            ...previous,
            ...loadedTeacherInfo
          }));
          setCertificateSettings(previous => ({
            ...previous,
            ...normalized.certificateSettings
          }));
          setDefaultStudentGender(normalized.defaultStudentGender);
          setLanguage(normalized.language);
          writeRasedExtendedStorage(normalized.extendedStorage);
        }
      } catch (error) {
        console.error('Data loading error', error);
      } finally {
        setIsDataLoaded(true);
        window.setTimeout(() => {
          isInitialLoad.current = false;
        }, 1000);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(async () => {
      const payload = createBackupPayload();

      try {
        persistCoreToLocalStorage(payload);
      } catch (error) {
        console.error('Unable to save localStorage data.', error);
      }

      if (isHeavyEnvironment()) {
        try {
          await Filesystem.writeFile({
            path: RASED_DB_FILENAME,
            data: JSON.stringify(payload),
            directory: Directory.Data,
            encoding: Encoding.UTF8
          });
        } catch (error) {
          console.error('Unable to save local database file.', error);
        }
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    students,
    classes,
    hiddenClasses,
    groups,
    schedule,
    periodTimes,
    teacherInfo,
    currentSemester,
    assessmentTools,
    gradeSettings,
    certificateSettings,
    defaultStudentGender,
    categorizations,
    language
  ]);

  const t = (key: keyof typeof translations['ar'] | string): string =>
    (translations[language] as any)[key] || key;

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <AppContext.Provider
      value={{
        students,
        setStudents,
        classes,
        setClasses,
        hiddenClasses,
        setHiddenClasses,
        groups,
        setGroups,
        schedule,
        setSchedule,
        periodTimes,
        setPeriodTimes,
        teacherInfo,
        setTeacherInfo,
        currentSemester,
        setCurrentSemester,
        assessmentTools,
        setAssessmentTools,
        gradeSettings,
        setGradeSettings,
        certificateSettings,
        setCertificateSettings,
        isDataLoaded,
        defaultStudentGender,
        setDefaultStudentGender,
        categorizations,
        setCategorizations,
        language,
        setLanguage,
        t,
        dir,
        createBackupPayload,
        restoreBackupPayload
      }}
    >
      <div dir={dir} className="h-full w-full">
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
