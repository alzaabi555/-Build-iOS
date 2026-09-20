import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Trophy,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RotateCcw,
  Users,
  AlertTriangle,
  Gamepad2,
  Download,
  WifiOff,
  CalendarDays,
  Gift,
  CloudDownload
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// =========================================================================
// TeacherGameResultsDashboard
// -------------------------------------------------------------------------
// لوحة {tr('gameResultsTitle')} للمعلم.
// - تعرض نتائج الطلاب حسب الفلاتر.
// - تضيف إحصائية {tr('gameNonParticipantsTitle')} حسب الصف/الشعبة/الفصل الدراسي/اللعبة.
// - تعتمد على قائمة الطلاب الكاملة من props للمقارنة مع نتائج الألعاب.
// =========================================================================

export type TeacherGameType =
  | 'snake_ladder'
  | 'knowledge_race'
  | 'football_quiz'
  | 'true_false'
  | 'match_cards'
  | 'sequence_order'
  | string;

export interface TeacherGameResultLogEntry {
  id: string;
  studentId: string;
  studentName?: string;
  className?: string;
  grade?: string;
  semester?: string;
  gameType: TeacherGameType;
  score: number;
  correct: number;
  wrong: number;
  completed: boolean;
  weakQuestionIds: string[];
  playedAt: string;
  savedAt?: string;
  syncStatus?: 'local_only' | 'pending_sync' | 'synced';
  subject?: string;
  unit?: string;
  lesson?: string;
  publishBatchId?: string;
  activityDate?: string;
  attemptNumber?: number;
  bestScore?: number;
  isOfficialBest?: boolean;
  taskId?: string;
  rawResult?: unknown;
}

export interface TeacherGameResultsStudent {
  id: string;
  name?: string;
  civilId?: string;
  rasedId?: string;
  secretCode?: string;
  parentCode?: string;
  grade?: string;
  classes?: string[];
  className?: string;
  semester?: string;
}

interface TeacherGameResultsDashboardProps {
  results?: TeacherGameResultLogEntry[];
  students?: TeacherGameResultsStudent[];
  teacherId?: string;
  schoolCode?: string;
  className?: string;
  readLocalStorageFallback?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void | Promise<void>;
}

type CompletionFilter = 'all' | 'completed' | 'not_completed';

interface GroupedStudentResult {
  studentId: string;
  studentName: string;
  className: string;
  grade?: string;
  totalScore: number;
  totalCorrect: number;
  totalWrong: number;
  totalWeakQuestions: number;
  attempts: number;
  completedAttempts: number;
  latestPlayedAt: string;
  games: TeacherGameResultLogEntry[];
}

interface NonParticipantStudent {
  studentId: string;
  studentName: string;
  className: string;
  grade?: string;
  semester?: string;
  rawStudent: TeacherGameResultsStudent;
}

const GAME_RESULTS_CLOUD_URL = 'https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec';
const PARTICIPATION_POINTS = 5;
const omanDateKey = (value?: string | Date) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Muscat', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};
const mergeResultsById = (lists: TeacherGameResultLogEntry[][]) => {
  const map = new Map<string, TeacherGameResultLogEntry>();
  lists.flat().forEach(item => {
    const normalized = normalizeResult(item);
    if (!normalized) return;
    const key = normalized.id || `${normalized.studentId}|${normalized.publishBatchId || ''}|${normalized.gameType}|${normalized.playedAt}`;
    const previous = map.get(key);
    if (!previous || new Date(normalized.savedAt || normalized.playedAt).getTime() >= new Date(previous.savedAt || previous.playedAt).getTime()) map.set(key, normalized);
  });
  return Array.from(map.values()).sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
};
const GAME_LABEL_KEYS: Record<string, string> = {
  snake_ladder: 'gameNameSnakeLadder',
  knowledge_race: 'gameNameKnowledgeRace',
  football_quiz: 'gameNameFootballQuiz',
  true_false: 'gameNameTrueFalse',
  match_cards: 'gameNameMatchCards',
  sequence_order: 'gameNameSequenceOrder'
};

const SYNC_LABEL_KEYS: Record<string, string> = {
  local_only: 'gameSyncLocalOnly',
  pending_sync: 'gameSyncPending',
  synced: 'gameSyncSynced'
};

const normalizeCode = (value?: unknown) => String(value || '').trim().toUpperCase();
const normalizeText = (value?: unknown) => String(value || '').trim().replace(/[أإآ]/g, 'ا').replace(/\s+/g, ' ').toLowerCase();

const normalizeClassName = (value?: unknown) => {
  const arabicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };

  return String(value || '')
    .trim()
    .replace(/[٠-٩۰-۹]/g, digit => arabicDigits[digit] || digit)
    .replace(/\s+/g, '')
    .replace(/الصف|صف|الفصل|الشعبة|شعبة/g, '')
    .replace(/\\/g, '/')
    .replace(/-/g, '/')
    .toLowerCase();
};

const formatDateTime = (value: string | undefined, locale: string, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const safeNumber = (value: unknown, fallback = 0) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const getRawObject = (value: unknown) => {
  if (!value || typeof value !== 'object') return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
};

const getStudentCanonicalId = (student: TeacherGameResultsStudent) => {
  return normalizeCode(student.rasedId || student.secretCode || student.parentCode || student.civilId || student.id);
};

const getStudentPrimaryClass = (student: TeacherGameResultsStudent) => {
  return student.className || student.classes?.[0] || '—';
};

const getStudentDisplayNameFromStudent = (student: TeacherGameResultsStudent) => {
  return student.name || getStudentCanonicalId(student) || 'طالب غير محدد';
};

const getStudentDisplayName = (result: TeacherGameResultLogEntry, studentsMap: Map<string, TeacherGameResultsStudent>) => {
  const student = studentsMap.get(normalizeCode(result.studentId));
  return result.studentName || student?.name || result.studentId || 'طالب غير محدد';
};

const getStudentClassName = (result: TeacherGameResultLogEntry, studentsMap: Map<string, TeacherGameResultsStudent>) => {
  const student = studentsMap.get(normalizeCode(result.studentId));
  return result.className || student?.className || student?.classes?.[0] || '—';
};

const getResultSemester = (raw: Record<string, unknown>) => {
  const rawResult = getRawObject(raw.rawResult);
  return String(raw.semester || rawResult.semester || rawResult.currentSemester || '').trim();
};

const normalizeResult = (value: unknown): TeacherGameResultLogEntry | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  const rawResult = getRawObject(raw.rawResult);
  const id = typeof raw.id === 'string' ? raw.id : `result_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const studentId = normalizeCode(raw.studentId || raw.rasedId || raw.parentCode || raw.civilID || raw.civilId || rawResult.studentId || rawResult.rasedId || 'default');
  const gameType = typeof raw.gameType === 'string' ? raw.gameType : typeof rawResult.gameType === 'string' ? rawResult.gameType : 'unknown_game';
  const weakQuestionIds = Array.isArray(raw.weakQuestionIds)
    ? raw.weakQuestionIds.filter((item): item is string => typeof item === 'string')
    : Array.isArray(rawResult.weakQuestionIds)
      ? rawResult.weakQuestionIds.filter((item): item is string => typeof item === 'string')
      : [];

  return {
    id,
    studentId,
    studentName: typeof raw.studentName === 'string' ? raw.studentName : typeof rawResult.studentName === 'string' ? rawResult.studentName : undefined,
    className: typeof raw.className === 'string' ? raw.className : typeof rawResult.className === 'string' ? rawResult.className : undefined,
    grade: typeof raw.grade === 'string' ? raw.grade : typeof rawResult.grade === 'string' ? rawResult.grade : undefined,
    semester: getResultSemester(raw),
    gameType,
    score: safeNumber(raw.score, safeNumber(rawResult.score)),
    correct: safeNumber(raw.correct, safeNumber(rawResult.correct, safeNumber(raw.matched, safeNumber(rawResult.matched)))),
    wrong: safeNumber(raw.wrong, safeNumber(rawResult.wrong)),
    completed: raw.completed === true || String(raw.completed ?? rawResult.completed).toUpperCase() === 'TRUE',
    weakQuestionIds,
    playedAt: typeof raw.playedAt === 'string'
      ? raw.playedAt
      : typeof rawResult.playedAt === 'string'
        ? rawResult.playedAt
        : typeof raw.savedAt === 'string'
          ? raw.savedAt
          : new Date().toISOString(),
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : typeof rawResult.savedAt === 'string' ? rawResult.savedAt : undefined,
    syncStatus: raw.syncStatus === 'synced' || raw.syncStatus === 'pending_sync' || raw.syncStatus === 'local_only' ? raw.syncStatus : 'local_only',
    subject: typeof raw.subject === 'string' ? raw.subject : typeof rawResult.subject === 'string' ? rawResult.subject : undefined,
    unit: typeof raw.unit === 'string' ? raw.unit : typeof rawResult.unit === 'string' ? rawResult.unit : undefined,
    lesson: typeof raw.lesson === 'string' ? raw.lesson : typeof rawResult.lesson === 'string' ? rawResult.lesson : undefined,
    publishBatchId: String(raw.publishBatchId || rawResult.publishBatchId || '').trim() || undefined,
    activityDate: String(raw.activityDate || rawResult.activityDate || '').slice(0, 10) || undefined,
    attemptNumber: safeNumber(raw.attemptNumber, safeNumber(rawResult.attemptNumber, 1)),
    bestScore: safeNumber(raw.bestScore, safeNumber(rawResult.bestScore, safeNumber(raw.score, safeNumber(rawResult.score)))),
    isOfficialBest: Boolean(raw.isOfficialBest ?? rawResult.isOfficialBest ?? true),
    taskId: String(raw.taskId || rawResult.taskId || '').trim() || undefined,
    rawResult: raw.rawResult || raw
  };
};

const readLocalResults = (): TeacherGameResultLogEntry[] => {
  if (typeof window === 'undefined') return [];

  const collected: TeacherGameResultLogEntry[] = [];
  const seen = new Set<string>();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      const shouldRead = key.startsWith('rased_student_game_results_log_') || key.startsWith('rased_student_latest_game_result_');
      if (!shouldRead) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        list.forEach(item => {
          const normalized = normalizeResult(item);
          if (!normalized || seen.has(normalized.id)) return;
          seen.add(normalized.id);
          collected.push(normalized);
        });
      } catch {
        // تجاهل المفاتيح غير القابلة للقراءة.
      }
    }
  } catch {
    return [];
  }

  return collected.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
};

const escapeCsvCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`;

const downloadCsv = (fileName: string, headers: string[], rows: string[][]) => {
  const csv = [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportResultsAsCsv = (results: TeacherGameResultLogEntry[], studentsMap: Map<string, TeacherGameResultsStudent>, labels: { headers: string[]; yes: string; no: string; unknown: string; filePrefix: string }, getGameLabel: (type?: string) => string, getSyncLabel: (status?: string) => string, formatValue: (value?: string) => string) => {
  const headers = labels.headers;

  const rows = results.map(result => [
    getStudentDisplayName(result, studentsMap),
    getStudentClassName(result, studentsMap),
    result.semester || labels.unknown,
    getGameLabel(result.gameType),
    String(result.score),
    String(result.correct),
    String(result.wrong),
    result.completed ? labels.yes : labels.no,
    String(result.weakQuestionIds.length),
    formatValue(result.playedAt),
    getSyncLabel(result.syncStatus)
  ]);

  downloadCsv(`${labels.filePrefix}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
};

const exportNonParticipantsAsCsv = (students: NonParticipantStudent[], headers: string[], filePrefix: string) => {
  const rows = students.map(student => [
    student.studentName,
    student.studentId,
    student.className,
    student.grade || '',
    student.semester || ''
  ]);

  downloadCsv(`${filePrefix}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
};

const TeacherGameResultsDashboard: React.FC<TeacherGameResultsDashboardProps> = ({
  results,
  students = [],
  teacherId = '',
  schoolCode = '',
  className = '',
  readLocalStorageFallback = true,
  isLoading = false,
  onRefresh
}) => {
  const app = useApp() as any;
  const { t, dir, language } = app;
  const appStudents = Array.isArray(app?.students) ? app.students : [];
  const updateAppStudents = typeof app?.setStudents === 'function' ? app.setStudents : null;
  const currentSemester = app?.currentSemester || '1';
  const teacherInfo = app?.teacherInfo || {};
  const tr = (key: string, values?: Record<string, string | number>) => {
    let text = String(t(key) || key);
    if (values) Object.entries(values).forEach(([name, value]) => { text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)); });
    return text;
  };
  const locale = language === 'ar' ? 'ar-OM' : 'en-GB';
  const unknownLabel = tr('gameUnknown');
  const getGameLabel = (gameType?: string) => tr(GAME_LABEL_KEYS[gameType || ''] || '') !== '' && GAME_LABEL_KEYS[gameType || ''] ? tr(GAME_LABEL_KEYS[gameType || '']) : (gameType || unknownLabel);
  const getSyncLabel = (status?: string) => SYNC_LABEL_KEYS[status || ''] ? tr(SYNC_LABEL_KEYS[status || '']) : unknownLabel;

  const [query, setQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');
  const [syncFilter, setSyncFilter] = useState<string>('all');
  const [refreshToken, setRefreshToken] = useState(0);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [showNonParticipants, setShowNonParticipants] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(omanDateKey());
  const [cloudResults, setCloudResults] = useState<TeacherGameResultLogEntry[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const requestIdRef = useRef(0);
  const effectiveSchoolCode = String(schoolCode || teacherInfo?.schoolCode || teacherInfo?.school || '').trim();
  const effectiveTeacherId = String(teacherId || teacherInfo?.id || teacherInfo?.civilId || teacherInfo?.name || '').trim();
  const cacheKey = `rased_teacher_cloud_game_results_cache_v2_${effectiveSchoolCode}_${effectiveTeacherId}`;
  const propStudents = Array.isArray(students) ? students : [];
  const sourceStudents = (propStudents.length > 0 ? propStudents : appStudents) as TeacherGameResultsStudent[];

  const fetchCloudResults = async () => {
    if (!effectiveSchoolCode && !effectiveTeacherId) {
      setCloudError('تعذر تحديد المدرسة أو المعلم لجلب النتائج السحابية.');
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsCloudLoading(true);
    setCloudError('');
    try {
      const query = new URLSearchParams({
        action: 'getGameResults',
        schoolCode: effectiveSchoolCode,
        teacherId: effectiveTeacherId,
        _: String(Date.now())
      });
      const response = await fetch(`${GAME_RESULTS_CLOUD_URL}?${query.toString()}`, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store'
      });
      const responseText = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 160)}`);
      let payload: any;
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new Error(`استجابة السحابة ليست JSON: ${responseText.slice(0, 160)}`);
      }
      if (requestId !== requestIdRef.current) return;
      if (payload?.success === false || payload?.status === 'error') throw new Error(String(payload?.message || payload?.error || 'تعذر جلب النتائج'));
      const incoming = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.results) ? payload.results : Array.isArray(payload?.gameResults) ? payload.gameResults : Array.isArray(payload) ? payload : [];
      const normalizedIncoming = incoming.map(normalizeResult).filter((item: TeacherGameResultLogEntry | null): item is TeacherGameResultLogEntry => Boolean(item));
      if (normalizedIncoming.length === 0) {
        setCloudError('اتصلت السحابة بنجاح، لكن لم تعد نتائج مطابقة لمعرف المدرسة والمعلم الحاليين.');
      }
      setCloudResults(previous => {
        const merged = normalizedIncoming.length > 0 ? mergeResultsById([previous, normalizedIncoming]) : previous;
        if (merged.length > 0 && typeof window !== 'undefined') {
          try { window.localStorage.setItem(cacheKey, JSON.stringify(merged)); } catch { /* تجاهل امتلاء التخزين */ }
        }
        return merged;
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setCloudError(error instanceof Error ? error.message : 'تعذر تحديث النتائج. تم الاحتفاظ بآخر نسخة ناجحة.');
    } finally {
      if (requestId === requestIdRef.current) setIsCloudLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = JSON.parse(window.localStorage.getItem(cacheKey) || '[]');
        if (Array.isArray(cached)) setCloudResults(mergeResultsById([cached]));
      } catch { /* لا نمسح النتائج الحالية عند تلف ذاكرة قديمة */ }
    }
    void fetchCloudResults();
  }, [cacheKey]);

  const studentsMap = useMemo(() => {
    const map = new Map<string, TeacherGameResultsStudent>();
    sourceStudents.forEach(student => {
      const ids = [student.id, student.rasedId, student.civilId, student.secretCode, student.parentCode].map(normalizeCode).filter(Boolean);
      ids.forEach(id => map.set(id, student));
    });
    return map;
  }, [sourceStudents]);

  const normalizedStudents = useMemo<NonParticipantStudent[]>(() => {
    const seen = new Set<string>();

    return sourceStudents
      .map(student => {
        const studentId = getStudentCanonicalId(student);
        if (!studentId || seen.has(studentId)) return null;
        seen.add(studentId);

        return {
          studentId,
          studentName: getStudentDisplayNameFromStudent(student),
          className: getStudentPrimaryClass(student),
          grade: student.grade,
          semester: student.semester,
          rawStudent: student
        };
      })
      .filter((item): item is NonParticipantStudent => Boolean(item));
  }, [sourceStudents]);

  const allResults = useMemo(() => {
    void refreshToken;
    const provided = Array.isArray(results) ? results : [];
    const local = readLocalStorageFallback ? readLocalResults() : [];
    return mergeResultsById([cloudResults, provided, local]);
  }, [cloudResults, results, readLocalStorageFallback, refreshToken]);

  const gameTypes = useMemo(() => {
    return Array.from(new Set(allResults.map(result => result.gameType))).filter(Boolean);
  }, [allResults]);

  const classOptions = useMemo(() => {
    const fromResults = allResults.map(result => getStudentClassName(result, studentsMap));
    const fromStudents = normalizedStudents.map(student => student.className);
    return Array.from(new Set([...fromResults, ...fromStudents].filter(Boolean))).sort((a, b) => a.localeCompare(b, language === 'ar' ? 'ar' : 'en'));
  }, [allResults, studentsMap, normalizedStudents]);

  const semesterOptions = useMemo(() => {
    const fromResults = allResults.map(result => result.semester).filter(Boolean) as string[];
    const fromStudents = normalizedStudents.map(student => student.semester).filter(Boolean) as string[];
    return Array.from(new Set([...fromResults, ...fromStudents])).sort();
  }, [allResults, normalizedStudents]);

  const filteredResultsWithoutQuery = useMemo(() => {
    return allResults.filter(result => {
      const studentClassName = getStudentClassName(result, studentsMap);
      const matchesGame = gameFilter === 'all' || result.gameType === gameFilter;
      const matchesClass = classFilter === 'all' || normalizeClassName(studentClassName) === normalizeClassName(classFilter);
      const matchesSemester = semesterFilter === 'all' || String(result.semester || '') === semesterFilter;
      const matchesCompletion =
        completionFilter === 'all' ||
        (completionFilter === 'completed' && result.completed) ||
        (completionFilter === 'not_completed' && !result.completed);
const matchesSync = syncFilter === 'all' || (result.syncStatus || 'local_only') === syncFilter;
      const resultDate = result.activityDate || omanDateKey(result.playedAt);
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const targetDate = dateFilter === 'today' ? omanDateKey() : dateFilter === 'yesterday' ? omanDateKey(yesterday) : dateFilter === 'custom' ? customDate : '';
      const matchesDate = dateFilter === 'all' || resultDate === targetDate;
      return matchesGame && matchesClass && matchesSemester && matchesCompletion && matchesSync && matchesDate;
    });
  }, [allResults, studentsMap, gameFilter, classFilter, semesterFilter, completionFilter, syncFilter, dateFilter, customDate]);

  const filteredResults = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return filteredResultsWithoutQuery.filter(result => {
      const studentName = normalizeText(getStudentDisplayName(result, studentsMap));
      const studentClassName = normalizeText(getStudentClassName(result, studentsMap));
      const gameLabel = normalizeText(getGameLabel(result.gameType));
      const studentId = normalizeText(result.studentId);
      const lesson = normalizeText(result.lesson);
      const subject = normalizeText(result.subject);

      return (
        !normalizedQuery ||
        studentName.includes(normalizedQuery) ||
        studentClassName.includes(normalizedQuery) ||
        gameLabel.includes(normalizedQuery) ||
        studentId.includes(normalizedQuery) ||
        lesson.includes(normalizedQuery) ||
        subject.includes(normalizedQuery)
      );
    });
  }, [filteredResultsWithoutQuery, studentsMap, query]);

  const eligibleStudents = useMemo(() => {
    return normalizedStudents.filter(student => {
      const matchesClass = classFilter === 'all' || normalizeClassName(student.className) === normalizeClassName(classFilter);
      const matchesSemester = semesterFilter === 'all' || !student.semester || student.semester === semesterFilter;
      return matchesClass && matchesSemester;
    });
  }, [normalizedStudents, classFilter, semesterFilter]);

  const nonParticipatingStudents = useMemo(() => {
    const participatingIds = new Set(
      filteredResultsWithoutQuery
        .filter(result => result.completed && result.correct + result.wrong > 0)
        .map(result => normalizeCode(result.studentId))
        .filter(Boolean)
    );

    const normalizedQuery = normalizeText(query);

    return eligibleStudents
      .filter(student => !participatingIds.has(student.studentId))
      .filter(student => {
        if (!normalizedQuery) return true;
        return (
          normalizeText(student.studentName).includes(normalizedQuery) ||
          normalizeText(student.studentId).includes(normalizedQuery) ||
          normalizeText(student.className).includes(normalizedQuery)
        );
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar'));
  }, [eligibleStudents, filteredResultsWithoutQuery, query]);

  const groupedResults = useMemo<GroupedStudentResult[]>(() => {
    const map = new Map<string, GroupedStudentResult>();

    filteredResults.forEach(result => {
      const key = normalizeCode(result.studentId || result.id);
      const studentName = getStudentDisplayName(result, studentsMap);
      const studentClassName = getStudentClassName(result, studentsMap);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          studentId: result.studentId,
          studentName,
          className: studentClassName,
          grade: result.grade,
          totalScore: result.score,
          totalCorrect: result.correct,
          totalWrong: result.wrong,
          totalWeakQuestions: result.weakQuestionIds.length,
          attempts: 1,
          completedAttempts: result.completed ? 1 : 0,
          latestPlayedAt: result.playedAt,
          games: [result]
        });
        return;
      }

      if (result.score > existing.totalScore) {
        existing.totalScore = result.score;
        existing.totalCorrect = result.correct;
        existing.totalWrong = result.wrong;
        existing.totalWeakQuestions = result.weakQuestionIds.length;
      }
      existing.attempts += 1;
      existing.completedAttempts += result.completed ? 1 : 0;
      existing.games.push(result);

      if (new Date(result.playedAt).getTime() > new Date(existing.latestPlayedAt).getTime()) {
        existing.latestPlayedAt = result.playedAt;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
  }, [filteredResults, studentsMap]);

  const participationPreview = useMemo(() => {
    const eligible: Array<{ result: TeacherGameResultLogEntry; student: any; awardId: string }> = [];
    const alreadyAwarded: string[] = [];
    const excluded: string[] = [];
    const byBatchStudent = new Map<string, TeacherGameResultLogEntry>();
    filteredResultsWithoutQuery.forEach(result => {
      const raw = getRawObject(result.rawResult);
      const isReview = Boolean(raw.isReview || raw.reviewMode || raw.source === 'review' || raw.context === 'review');
      const batchId = String(result.publishBatchId || '').trim();
      if (!result.completed || result.correct + result.wrong <= 0 || !batchId || isReview) { excluded.push(result.id); return; }
      const activityDate = result.activityDate || omanDateKey(result.playedAt);
      if (!activityDate || activityDate !== omanDateKey(result.playedAt)) { excluded.push(result.id); return; }
      const key = `${normalizeCode(result.studentId)}|${batchId}`;
      const previous = byBatchStudent.get(key);
      if (!previous || result.score > previous.score) byBatchStudent.set(key, result);
    });
    byBatchStudent.forEach(result => {
      const student = studentsMap.get(normalizeCode(result.studentId)) as any;
      if (!student) { excluded.push(result.id); return; }
      const awardId = `game-participation:${normalizeCode(result.studentId)}:${result.publishBatchId}`;
      if ((student.behaviors || []).some((behavior: any) => behavior?.id === awardId)) alreadyAwarded.push(awardId);
      else eligible.push({ result, student, awardId });
    });
    return { eligible, alreadyAwarded, excluded };
  }, [filteredResultsWithoutQuery, studentsMap]);

  const applyParticipationAwards = () => {
    if (participationPreview.eligible.length === 0) return;
    if (!updateAppStudents) {
      setCloudError('تعذر تحديث نقاط الطلاب لأن setStudents غير متاح في AppContext.');
      return;
    }
    const awards = new Map(participationPreview.eligible.map(item => [normalizeCode(item.result.studentId), item]));
    updateAppStudents((previous: any[]) => (Array.isArray(previous) ? previous : []).map(student => {
      const ids = [(student as any).id, (student as any).rasedId, (student as any).civilId, (student as any).secretCode, (student as any).parentCode].map(normalizeCode);
      const entry = ids.map(id => awards.get(id)).find(Boolean);
      if (!entry) return student;
      const result = entry.result;
      const activityDate = result.activityDate || omanDateKey(result.playedAt);
      const behaviors = Array.isArray((student as any).behaviors) ? (student as any).behaviors : [];
      if (behaviors.some((behavior: any) => behavior?.id === entry.awardId)) return student;
      const behavior = {
        id: entry.awardId,
        date: `${activityDate}T12:00:00+04:00`,
        type: 'positive' as const,
        description: 'مشاركة في الألعاب التعليمية',
        points: PARTICIPATION_POINTS,
        semester: currentSemester,
        source: 'educational_game',
        publishBatchId: result.publishBatchId,
        resultId: result.id,
        gameType: result.gameType,
        activityDate,
        autoAwarded: true
      };
      return { ...student, behaviors: [behavior, ...behaviors] } as any;
    }));
  };

  const summary = useMemo(() => {
    const totalAttempts = filteredResults.length;
    const uniqueStudents = groupedResults.length;
    const expectedStudents = eligibleStudents.length;
    const nonParticipants = nonParticipatingStudents.length;
    const participationRate = expectedStudents > 0 ? Math.round((uniqueStudents / expectedStudents) * 100) : 0;
    const totalScore = filteredResults.reduce((sum, result) => sum + result.score, 0);
    const completedAttempts = filteredResults.filter(result => result.completed).length;
    const totalWeakQuestions = filteredResults.reduce((sum, result) => sum + result.weakQuestionIds.length, 0);
    const averageScore = uniqueStudents > 0 ? Math.round(totalScore / uniqueStudents) : 0;

    return {
      totalAttempts,
      uniqueStudents,
      expectedStudents,
      nonParticipants,
      participationRate,
      completedAttempts,
      totalWeakQuestions,
      averageScore
    };
  }, [filteredResults, groupedResults, eligibleStudents, nonParticipatingStudents]);

  return (
    <div className={`rased-teacher-light bg-bgMain text-textPrimary rounded-3xl ${className}`} dir={dir}>
      <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm relative overflow-hidden mb-4">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-textPrimary mb-1">{tr('gameResultsTitle')}</h2>
              <p className="text-[11px] font-bold text-textSecondary leading-6">
                {tr('gameResultsSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchCloudResults();
                if (onRefresh) onRefresh();
                setRefreshToken(prev => prev + 1);
              }}
              className="h-10 px-3 rounded-2xl bg-bgSoft border border-borderColor text-textSecondary hover:text-primary font-black text-xs flex items-center gap-2 active:scale-95"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading || isCloudLoading ? 'animate-spin' : ''}`} />
              {isLoading || isCloudLoading ? tr('gameRefreshing') : tr('gameRefresh')}
            </button>
            <button
              type="button"
              onClick={() => exportResultsAsCsv(filteredResults, studentsMap, { headers: [tr('gameCsvStudentName'), tr('gameCsvClass'), tr('gameCsvSemester'), tr('gameCsvGame'), tr('gameCsvPoints'), tr('gameCsvCorrect'), tr('gameCsvWrong'), tr('gameCsvCompleted'), tr('gameCsvWeakQuestions'), tr('gameCsvPlayedAt'), tr('gameCsvSyncStatus')], yes: tr('yes'), no: tr('no'), unknown: unknownLabel, filePrefix: 'teacher_game_results' }, getGameLabel, getSyncLabel, value => formatDateTime(value, locale, unknownLabel))}
              disabled={filteredResults.length === 0}
              className="h-10 px-3 rounded-2xl bg-primary text-white font-black text-xs flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {tr('gameExportCsv')}
            </button>
          </div>
        </div>
      </section>

      {cloudError && <div className="mb-4 rounded-2xl border border-warning/20 bg-warning/10 p-3 text-xs font-black text-warning">{cloudError}، مع الاحتفاظ بآخر نسخة ناجحة.</div>}
      <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-success/10 text-success border border-success/20 flex items-center justify-center"><Gift className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-black text-textPrimary">نقاط مشاركة الألعاب</h3>
              <p className="text-[11px] font-bold text-textSecondary mt-1">مؤهلون: {participationPreview.eligible.length} • منح سابقًا: {participationPreview.alreadyAwarded.length} • مستبعدون: {participationPreview.excluded.length}</p>
              <p className="text-[10px] font-bold text-textMuted mt-1">تُمنح {PARTICIPATION_POINTS} نقاط مرة واحدة لكل طالب ولكل دفعة مكتملة في يوم النشاط نفسه.</p>
            </div>
          </div>
          <button type="button" onClick={applyParticipationAwards} disabled={participationPreview.eligible.length === 0} className="h-11 px-4 rounded-2xl bg-success text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50"><Gift className="w-4 h-4" />اعتماد نقاط المستحقين</button>
        </div>
      </section>
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-2">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">{tr('gameAttempts')}</p>
          <p className="text-xl font-black text-textPrimary">{summary.totalAttempts}</p>
        </div>
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-info/10 text-info border border-info/20 flex items-center justify-center mb-2">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">{tr('gameParticipated')}</p>
          <p className="text-xl font-black text-textPrimary">{summary.uniqueStudents}</p>
        </div>
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-danger/10 text-danger border border-danger/20 flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">لم ي{tr('gameParticipated')}</p>
          <p className="text-xl font-black text-danger">{summary.nonParticipants}</p>
        </div>
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-success/10 text-success border border-success/20 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">{tr('gameParticipationRate')}</p>
          <p className="text-xl font-black text-success">{summary.participationRate}%</p>
        </div>
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-warning/10 text-warning border border-warning/20 flex items-center justify-center mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">{tr('gameAverageStudentScore')}</p>
          <p className="text-xl font-black text-warning">{summary.averageScore}</p>
        </div>
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-danger/10 text-danger border border-danger/20 flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">{tr('gameWeakQuestions')}</p>
          <p className="text-xl font-black text-danger">{summary.totalWeakQuestions}</p>
        </div>
      </section>

      <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <select value={dateFilter} onChange={event => setDateFilter(event.target.value as any)} className="h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-xs font-black text-textPrimary">
            <option value="today">نتائج اليوم</option><option value="yesterday">نتائج أمس</option><option value="custom">تاريخ محدد</option><option value="all">كل التواريخ</option>
          </select>
          {dateFilter === 'custom' && <input type="date" value={customDate} onChange={event => setCustomDate(event.target.value)} className="h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-xs font-black text-textPrimary" />}
          <div className="rounded-2xl bg-primary/5 border border-primary/15 px-3 flex items-center text-[10px] font-black text-primary"><CloudDownload className="w-4 h-4 ml-2" />{cloudResults.length} نتيجة محفوظة</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_165px_165px_145px_150px_165px] gap-3">
          <label className="relative block">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={tr('gameSearchPlaceholder')}
              className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor pr-10 pl-3 text-sm font-bold text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-primary/40"
            />
          </label>

          <label className="relative block">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
            <select
              value={gameFilter}
              onChange={event => setGameFilter(event.target.value)}
              className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor pr-10 pl-3 text-xs font-black text-textPrimary focus:outline-none focus:border-primary/40"
            >
              <option value="all">{tr('gameAllGames')}</option>
              {gameTypes.map(gameType => (
                <option key={gameType} value={gameType}>{getGameLabel(gameType)}</option>
              ))}
            </select>
          </label>

          <select
            value={classFilter}
            onChange={event => setClassFilter(event.target.value)}
            className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-xs font-black text-textPrimary focus:outline-none focus:border-primary/40"
          >
            <option value="all">{tr('gameAllClasses')}</option>
            {classOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={event => setSemesterFilter(event.target.value)}
            className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-xs font-black text-textPrimary focus:outline-none focus:border-primary/40"
          >
            <option value="all">{tr('gameAllSemesters')}</option>
            {semesterOptions.map(option => (
              <option key={option} value={option}>{tr('semesterLabel')} {option}</option>
            ))}
          </select>

          <select
            value={completionFilter}
            onChange={event => setCompletionFilter(event.target.value as CompletionFilter)}
            className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-xs font-black text-textPrimary focus:outline-none focus:border-primary/40"
          >
            <option value="all">{tr('gameAllStatuses')}</option>
            <option value="completed">{tr('gameCompleted')}</option>
            <option value="not_completed">{tr('gameNotCompleted')}</option>
          </select>

          <select
            value={syncFilter}
            onChange={event => setSyncFilter(event.target.value)}
            className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-xs font-black text-textPrimary focus:outline-none focus:border-primary/40"
          >
            <option value="all">{tr('gameAllSyncStatuses')}</option>
            <option value="local_only">{tr('gameSyncLocalOnly')}</option>
            <option value="pending_sync">{tr('gameSyncPending')}</option>
            <option value="synced">{tr('gameSyncSynced')}</option>
          </select>
        </div>
      </section>

      <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-danger/10 text-danger border border-danger/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-textPrimary mb-1">{tr('gameNonParticipantsTitle')}</h3>
              <p className="text-[11px] font-bold text-textSecondary leading-6">
                {tr('gameNonParticipantsDescription')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNonParticipants(prev => !prev)}
              className="h-10 px-3 rounded-2xl bg-bgSoft border border-borderColor text-textSecondary hover:text-primary font-black text-xs active:scale-95"
            >
              {showNonParticipants ? tr('gameHideList') : tr('gameShowList')}
            </button>
            <button
              type="button"
              onClick={() => exportNonParticipantsAsCsv(nonParticipatingStudents, [tr('gameCsvStudentName'), tr('gameCsvRasedCode'), tr('gameCsvClassSection'), tr('gameCsvGrade'), tr('gameCsvSemester')], 'teacher_game_non_participants')}
              disabled={nonParticipatingStudents.length === 0}
              className="h-10 px-3 rounded-2xl bg-danger text-white font-black text-xs flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {tr('gameExportNonParticipants')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-2xl bg-bgSoft border border-borderColor p-3 text-center">
            <p className="text-[9px] font-black text-textSecondary mb-1">{tr('gameFilteredStudents')}</p>
            <p className="text-lg font-black text-textPrimary">{summary.expectedStudents}</p>
          </div>
          <div className="rounded-2xl bg-success/5 border border-success/15 p-3 text-center">
            <p className="text-[9px] font-black text-textSecondary mb-1">{tr('gameParticipated')}</p>
            <p className="text-lg font-black text-success">{summary.uniqueStudents}</p>
          </div>
          <div className="rounded-2xl bg-danger/5 border border-danger/15 p-3 text-center">
            <p className="text-[9px] font-black text-textSecondary mb-1">لم ي{tr('gameParticipated')}</p>
            <p className="text-lg font-black text-danger">{summary.nonParticipants}</p>
          </div>
        </div>

        {showNonParticipants && (
          <div>
            {normalizedStudents.length === 0 ? (
              <div className="rounded-2xl bg-warning/10 border border-warning/20 p-4 text-center">
                <p className="text-sm font-black text-textPrimary mb-1">{tr('gameNoCompleteStudentList')}</p>
                <p className="text-[11px] font-bold text-textSecondary leading-6">
                  {tr('gameNoCompleteStudentListHint')}
                </p>
              </div>
            ) : nonParticipatingStudents.length === 0 ? (
              <div className="rounded-2xl bg-success/10 border border-success/20 p-4 text-center text-success font-black">
                جميع {tr('gameFilteredStudents')} لديهم مشاركة أو نتيجة ظاهرة حسب الفلاتر الحالية.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {nonParticipatingStudents.map(student => (
                  <div key={student.studentId} className="rounded-2xl bg-bgSoft border border-borderColor p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-textPrimary truncate">{student.studentName}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{student.className}</span>
                        {student.grade && <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{student.grade}</span>}
                        {student.semester && <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{tr('semesterLabel')} {student.semester}</span>}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-black text-danger bg-danger/10 border border-danger/20 px-2 py-1 rounded-xl shrink-0" dir="ltr">
                      {student.studentId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        {groupedResults.length === 0 ? (
          <div className="bg-bgCard border border-borderColor rounded-3xl p-6 text-center shadow-sm">
            <WifiOff className="w-12 h-12 mx-auto text-textMuted mb-3" />
            <h3 className="text-base font-black text-textPrimary mb-1">{tr('gameNoResultsTitle')}</h3>
            <p className="text-[11px] font-bold text-textSecondary leading-6">
              {tr('gameNoResultsHint')}
            </p>
          </div>
        ) : (
          groupedResults.map(student => {
            const isExpanded = expandedStudent === student.studentId;
            const allCompleted = student.completedAttempts === student.attempts;

            return (
              <article key={student.studentId} className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm hover:shadow-card transition-all">
                <button
                  type="button"
                  onClick={() => setExpandedStudent(prev => (prev === student.studentId ? null : student.studentId))}
                  className="w-full text-start"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${allCompleted ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                        {allCompleted ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-textPrimary truncate">{student.studentName}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[9px] font-black bg-bgSoft border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">
                            {student.className}
                          </span>
                          <span className="text-[9px] font-black bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">
                            {student.attempts} {tr('gameAttemptWord')}
                          </span>
                          <span className="text-[9px] font-black bg-bgSoft border border-borderColor text-textSecondary px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {tr('gameLastPlayed')}: {formatDateTime(student.latestPlayedAt, locale, unknownLabel)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 lg:grid-cols-5 gap-2 lg:min-w-[520px]">
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">{tr('gameTotal')}</p>
                        <p className="text-sm font-black text-warning">{student.totalScore}</p>
                      </div>
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">{tr('gameCorrect')}</p>
                        <p className="text-sm font-black text-success">{student.totalCorrect}</p>
                      </div>
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">{tr('gameWrong')}</p>
                        <p className="text-sm font-black text-danger">{student.totalWrong}</p>
                      </div>
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">{tr('gameWeak')}</p>
                        <p className="text-sm font-black text-danger">{student.totalWeakQuestions}</p>
                      </div>
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center col-span-4 lg:col-span-1">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">{tr('gameDetails')}</p>
                        <p className="text-[10px] font-black text-primary">{isExpanded ? tr('gameHide') : tr('gameShow')}</p>
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-borderColor space-y-3">
                    {student.games.map(game => {
                      const syncStatus = game.syncStatus || 'local_only';

                      return (
                        <div key={game.id} className="bg-bgSoft border border-borderColor rounded-2xl p-3">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-primary">{getGameLabel(game.gameType)}</span>
                              {game.subject && <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{game.subject}</span>}
                              {game.lesson && <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{game.lesson}</span>}
                              {game.semester && <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">{tr('semesterLabel')} {game.semester}</span>}
                              <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">
                                {formatDateTime(game.playedAt, locale, unknownLabel)}
                              </span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${syncStatus === 'synced' ? 'bg-success/10 text-success border-success/20' : syncStatus === 'pending_sync' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-bgCard text-textSecondary border-borderColor'}`}>
                                {getSyncLabel(syncStatus)}
                              </span>
                            </div>

                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${game.completed ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                              {game.completed ? tr('gameCompleted') : tr('gameNotCompleted')}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                            <div className="rounded-xl bg-bgCard border border-borderColor p-2">
                              <p className="text-[8px] text-textSecondary mb-0.5">{tr('gamePoints')}</p>
                              <p className="font-black text-warning">{game.score}</p>
                            </div>
                            <div className="rounded-xl bg-bgCard border border-borderColor p-2">
                              <p className="text-[8px] text-textSecondary mb-0.5">{tr('gameCorrect')}</p>
                              <p className="font-black text-success">{game.correct}</p>
                            </div>
                            <div className="rounded-xl bg-bgCard border border-borderColor p-2">
                              <p className="text-[8px] text-textSecondary mb-0.5">{tr('gameWrong')}</p>
                              <p className="font-black text-danger">{game.wrong}</p>
                            </div>
                            <div className="rounded-xl bg-bgCard border border-borderColor p-2">
                              <p className="text-[8px] text-textSecondary mb-0.5">{tr('gameWeak')}</p>
                              <p className="font-black text-danger">{game.weakQuestionIds.length}</p>
                            </div>
                          </div>

                          {game.weakQuestionIds.length > 0 && (
                            <div className="mt-3 rounded-2xl bg-danger/5 border border-danger/15 p-3">
                              <p className="text-[10px] font-black text-danger mb-1">{tr('gameReviewQuestionIds')}</p>
                              <p className="text-[10px] font-bold text-textSecondary leading-5 break-words">
                                {game.weakQuestionIds.join('، ')}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
};

export default TeacherGameResultsDashboard;
