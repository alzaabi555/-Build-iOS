import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Trophy,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RotateCcw,
  Clock,
  Users,
  AlertTriangle,
  Gamepad2,
  BookOpen,
  Download,
  WifiOff,
  CalendarDays
} from 'lucide-react';

// =========================================================================
// TeacherGameResultsDashboard
// -------------------------------------------------------------------------
// لوحة نتائج ألعاب الطلاب للمعلم.
// - مصممة لتكون مكوّنًا مستقلًا يمكن وضعه بجانب TeacherGameQuestionsManager.
// - تستقبل النتائج من props إذا كانت متاحة من السحابة أو AppContext.
// - وتستطيع مؤقتًا قراءة نتائج localStorage للتجربة داخل نفس المتصفح.
// - لا تغيّر أو تنشئ الأسئلة؛ فقط تعرض نتائج الطلاب.
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
  rawResult?: unknown;
}

export interface TeacherGameResultsStudent {
  id: string;
  name?: string;
  civilId?: string;
  rasedId?: string;
  grade?: string;
  classes?: string[];
  className?: string;
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

const GAME_LABELS: Record<string, string> = {
  snake_ladder: 'السلم والثعبان',
  knowledge_race: 'سباق المعرفة',
  football_quiz: 'ركلات المعرفة',
  true_false: 'صح أم خطأ',
  match_cards: 'طابق المفهوم',
  sequence_order: 'رتّب الأحداث'
};

const SYNC_LABELS: Record<string, string> = {
  local_only: 'محلي فقط',
  pending_sync: 'بانتظار المزامنة',
  synced: 'متزامن'
};

const getGameLabel = (gameType?: string) => GAME_LABELS[gameType || ''] || gameType || 'غير محدد';

const formatDateTime = (value?: string) => {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return new Intl.DateTimeFormat('ar-OM', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const safeNumber = (value: unknown, fallback = 0) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const getStudentDisplayName = (result: TeacherGameResultLogEntry, studentsMap: Map<string, TeacherGameResultsStudent>) => {
  const student = studentsMap.get(result.studentId);
  return result.studentName || student?.name || result.studentId || 'طالب غير محدد';
};

const getStudentClassName = (result: TeacherGameResultLogEntry, studentsMap: Map<string, TeacherGameResultsStudent>) => {
  const student = studentsMap.get(result.studentId);
  return result.className || student?.className || student?.classes?.[0] || 'غير محدد';
};

const normalizeResult = (value: unknown): TeacherGameResultLogEntry | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  const id = typeof raw.id === 'string' ? raw.id : `result_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const studentId = typeof raw.studentId === 'string' ? raw.studentId : 'default';
  const gameType = typeof raw.gameType === 'string' ? raw.gameType : 'unknown_game';
  const weakQuestionIds = Array.isArray(raw.weakQuestionIds)
    ? raw.weakQuestionIds.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    id,
    studentId,
    studentName: typeof raw.studentName === 'string' ? raw.studentName : undefined,
    className: typeof raw.className === 'string' ? raw.className : undefined,
    grade: typeof raw.grade === 'string' ? raw.grade : undefined,
    gameType,
    score: safeNumber(raw.score),
    correct: safeNumber(raw.correct, safeNumber(raw.matched)),
    wrong: safeNumber(raw.wrong),
    completed: Boolean(raw.completed),
    weakQuestionIds,
    playedAt: typeof raw.playedAt === 'string' ? raw.playedAt : typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : undefined,
    syncStatus: raw.syncStatus === 'synced' || raw.syncStatus === 'pending_sync' || raw.syncStatus === 'local_only' ? raw.syncStatus : 'local_only',
    subject: typeof raw.subject === 'string' ? raw.subject : undefined,
    unit: typeof raw.unit === 'string' ? raw.unit : undefined,
    lesson: typeof raw.lesson === 'string' ? raw.lesson : undefined,
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

const exportResultsAsCsv = (results: TeacherGameResultLogEntry[], studentsMap: Map<string, TeacherGameResultsStudent>) => {
  const headers = [
    'اسم الطالب',
    'الصف',
    'اللعبة',
    'النقاط',
    'الصحيح',
    'الخطأ',
    'مكتمل',
    'الأسئلة الضعيفة',
    'وقت اللعب',
    'حالة المزامنة'
  ];

  const rows = results.map(result => [
    getStudentDisplayName(result, studentsMap),
    getStudentClassName(result, studentsMap),
    getGameLabel(result.gameType),
    String(result.score),
    String(result.correct),
    String(result.wrong),
    result.completed ? 'نعم' : 'لا',
    String(result.weakQuestionIds.length),
    formatDateTime(result.playedAt),
    SYNC_LABELS[result.syncStatus || 'local_only'] || 'غير محدد'
  ]);

  const escapeCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `teacher_game_results_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const TeacherGameResultsDashboard: React.FC<TeacherGameResultsDashboardProps> = ({
  results,
  students = [],
  className = '',
  readLocalStorageFallback = true,
  isLoading = false,
  onRefresh
}) => {
  const [query, setQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');
  const [syncFilter, setSyncFilter] = useState<string>('all');
  const [refreshToken, setRefreshToken] = useState(0);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const studentsMap = useMemo(() => {
    const map = new Map<string, TeacherGameResultsStudent>();
    students.forEach(student => {
      if (student.id) map.set(student.id, student);
      if (student.rasedId) map.set(student.rasedId, student);
      if (student.civilId) map.set(student.civilId, student);
    });
    return map;
  }, [students]);

  const allResults = useMemo(() => {
    void refreshToken;
    const source = Array.isArray(results) ? results : readLocalStorageFallback ? readLocalResults() : [];
    return source
      .map(item => normalizeResult(item))
      .filter((item): item is TeacherGameResultLogEntry => Boolean(item))
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
  }, [results, readLocalStorageFallback, refreshToken]);

  const gameTypes = useMemo(() => {
    return Array.from(new Set(allResults.map(result => result.gameType))).filter(Boolean);
  }, [allResults]);

  const classOptions = useMemo(() => {
    return Array.from(new Set(allResults.map(result => getStudentClassName(result, studentsMap)).filter(Boolean))).sort();
  }, [allResults, studentsMap]);

  const filteredResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allResults.filter(result => {
      const studentName = getStudentDisplayName(result, studentsMap).toLowerCase();
      const studentClassName = getStudentClassName(result, studentsMap);
      const normalizedStudentClassName = studentClassName.toLowerCase();
      const gameLabel = getGameLabel(result.gameType).toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        studentName.includes(normalizedQuery) ||
        normalizedStudentClassName.includes(normalizedQuery) ||
        gameLabel.includes(normalizedQuery) ||
        result.studentId.toLowerCase().includes(normalizedQuery);

      const matchesGame = gameFilter === 'all' || result.gameType === gameFilter;
      const matchesClass = classFilter === 'all' || studentClassName === classFilter;
      const matchesCompletion =
        completionFilter === 'all' ||
        (completionFilter === 'completed' && result.completed) ||
        (completionFilter === 'not_completed' && !result.completed);
      const matchesSync = syncFilter === 'all' || (result.syncStatus || 'local_only') === syncFilter;

      return matchesQuery && matchesGame && matchesClass && matchesCompletion && matchesSync;
    });
  }, [allResults, studentsMap, query, gameFilter, classFilter, completionFilter, syncFilter]);

  const groupedResults = useMemo<GroupedStudentResult[]>(() => {
    const map = new Map<string, GroupedStudentResult>();

    filteredResults.forEach(result => {
      const key = result.studentId || result.id;
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

      existing.totalScore += result.score;
      existing.totalCorrect += result.correct;
      existing.totalWrong += result.wrong;
      existing.totalWeakQuestions += result.weakQuestionIds.length;
      existing.attempts += 1;
      existing.completedAttempts += result.completed ? 1 : 0;
      existing.games.push(result);

      if (new Date(result.playedAt).getTime() > new Date(existing.latestPlayedAt).getTime()) {
        existing.latestPlayedAt = result.playedAt;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
  }, [filteredResults, studentsMap]);

  const summary = useMemo(() => {
    const totalAttempts = filteredResults.length;
    const uniqueStudents = groupedResults.length;
    const totalScore = filteredResults.reduce((sum, result) => sum + result.score, 0);
    const completedAttempts = filteredResults.filter(result => result.completed).length;
    const totalWeakQuestions = filteredResults.reduce((sum, result) => sum + result.weakQuestionIds.length, 0);
    const averageScore = uniqueStudents > 0 ? Math.round(totalScore / uniqueStudents) : 0;

    return {
      totalAttempts,
      uniqueStudents,
      completedAttempts,
      totalWeakQuestions,
      averageScore
    };
  }, [filteredResults, groupedResults]);

  return (
    <div className={`rased-teacher-light bg-bgMain text-textPrimary rounded-3xl ${className}`} dir="rtl">
      <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm relative overflow-hidden mb-4">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-textPrimary mb-1">نتائج ألعاب الطلاب</h2>
              <p className="text-[11px] font-bold text-textSecondary leading-6">
                متابعة محاولات الطلاب، النقاط، الأسئلة الضعيفة، وحالة المزامنة. يمكن ربط هذه البيانات لاحقًا بالسحابة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onRefresh) {
                  onRefresh();
                  return;
                }
                setRefreshToken(prev => prev + 1);
              }}
              className="h-10 px-3 rounded-2xl bg-bgSoft border border-borderColor text-textSecondary hover:text-primary font-black text-xs flex items-center gap-2 active:scale-95"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'جاري التحديث' : 'تحديث'}
            </button>
            <button
              type="button"
              onClick={() => exportResultsAsCsv(filteredResults, studentsMap)}
              disabled={filteredResults.length === 0}
              className="h-10 px-3 rounded-2xl bg-primary text-white font-black text-xs flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-2">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">المحاولات</p>
          <p className="text-xl font-black text-textPrimary">{summary.totalAttempts}</p>
        </div>
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-info/10 text-info border border-info/20 flex items-center justify-center mb-2">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">الطلاب</p>
          <p className="text-xl font-black text-textPrimary">{summary.uniqueStudents}</p>
        </div>
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-success/10 text-success border border-success/20 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">مكتملة</p>
          <p className="text-xl font-black text-success">{summary.completedAttempts}</p>
        </div>
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-warning/10 text-warning border border-warning/20 flex items-center justify-center mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">متوسط نقاط الطالب</p>
          <p className="text-xl font-black text-warning">{summary.averageScore}</p>
        </div>
        <div className="bg-bgCard border border-borderColor rounded-3xl p-3 shadow-sm col-span-2 lg:col-span-1">
          <div className="w-9 h-9 rounded-2xl bg-danger/10 text-danger border border-danger/20 flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-[9px] font-black text-textSecondary mb-1">أسئلة ضعيفة</p>
          <p className="text-xl font-black text-danger">{summary.totalWeakQuestions}</p>
        </div>
      </section>

      <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_170px_170px_150px_170px] gap-3">
          <label className="relative block">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="ابحث باسم الطالب أو اللعبة أو الصف..."
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
              <option value="all">كل الألعاب</option>
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
            <option value="all">كل الصفوف والشعب</option>
            {classOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            value={completionFilter}
            onChange={event => setCompletionFilter(event.target.value as CompletionFilter)}
            className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-xs font-black text-textPrimary focus:outline-none focus:border-primary/40"
          >
            <option value="all">كل الحالات</option>
            <option value="completed">مكتمل</option>
            <option value="not_completed">غير مكتمل</option>
          </select>

          <select
            value={syncFilter}
            onChange={event => setSyncFilter(event.target.value)}
            className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-xs font-black text-textPrimary focus:outline-none focus:border-primary/40"
          >
            <option value="all">كل حالات المزامنة</option>
            <option value="local_only">محلي فقط</option>
            <option value="pending_sync">بانتظار المزامنة</option>
            <option value="synced">متزامن</option>
          </select>
        </div>
      </section>

      <section className="space-y-3">
        {groupedResults.length === 0 ? (
          <div className="bg-bgCard border border-borderColor rounded-3xl p-6 text-center shadow-sm">
            <WifiOff className="w-12 h-12 mx-auto text-textMuted mb-3" />
            <h3 className="text-base font-black text-textPrimary mb-1">لا توجد نتائج بعد</h3>
            <p className="text-[11px] font-bold text-textSecondary leading-6">
              ستظهر هنا نتائج الطلاب بعد إكمال الألعاب. في النسخة الحالية يمكن قراءة النتائج المحلية إذا كانت موجودة في نفس المتصفح.
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
                            {student.attempts} محاولة
                          </span>
                          <span className="text-[9px] font-black bg-bgSoft border border-borderColor text-textSecondary px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            آخر لعب: {formatDateTime(student.latestPlayedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 lg:grid-cols-5 gap-2 lg:min-w-[520px]">
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">المجموع</p>
                        <p className="text-sm font-black text-warning">{student.totalScore}</p>
                      </div>
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">صحيح</p>
                        <p className="text-sm font-black text-success">{student.totalCorrect}</p>
                      </div>
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">خطأ</p>
                        <p className="text-sm font-black text-danger">{student.totalWrong}</p>
                      </div>
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">ضعف</p>
                        <p className="text-sm font-black text-danger">{student.totalWeakQuestions}</p>
                      </div>
                      <div className="rounded-2xl bg-bgSoft border border-borderColor p-2 text-center col-span-4 lg:col-span-1">
                        <p className="text-[8px] font-bold text-textSecondary mb-0.5">التفاصيل</p>
                        <p className="text-[10px] font-black text-primary">{isExpanded ? 'إخفاء' : 'عرض'}</p>
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
                              <span className="text-[9px] font-black bg-bgCard border border-borderColor text-textSecondary px-2 py-0.5 rounded-full">
                                {formatDateTime(game.playedAt)}
                              </span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${syncStatus === 'synced' ? 'bg-success/10 text-success border-success/20' : syncStatus === 'pending_sync' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-bgCard text-textSecondary border-borderColor'}`}>
                                {SYNC_LABELS[syncStatus] || 'غير محدد'}
                              </span>
                            </div>

                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${game.completed ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                              {game.completed ? 'مكتمل' : 'غير مكتمل'}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                            <div className="rounded-xl bg-bgCard border border-borderColor p-2">
                              <p className="text-[8px] text-textSecondary mb-0.5">النقاط</p>
                              <p className="font-black text-warning">{game.score}</p>
                            </div>
                            <div className="rounded-xl bg-bgCard border border-borderColor p-2">
                              <p className="text-[8px] text-textSecondary mb-0.5">صحيح</p>
                              <p className="font-black text-success">{game.correct}</p>
                            </div>
                            <div className="rounded-xl bg-bgCard border border-borderColor p-2">
                              <p className="text-[8px] text-textSecondary mb-0.5">خطأ</p>
                              <p className="font-black text-danger">{game.wrong}</p>
                            </div>
                            <div className="rounded-xl bg-bgCard border border-borderColor p-2">
                              <p className="text-[8px] text-textSecondary mb-0.5">ضعف</p>
                              <p className="font-black text-danger">{game.weakQuestionIds.length}</p>
                            </div>
                          </div>

                          {game.weakQuestionIds.length > 0 && (
                            <div className="mt-3 rounded-2xl bg-danger/5 border border-danger/15 p-3">
                              <p className="text-[10px] font-black text-danger mb-1">معرّفات الأسئلة التي تحتاج مراجعة:</p>
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
