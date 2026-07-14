import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  CloudUpload,
  AlertTriangle,
  Gamepad2,
  HelpCircle,
  ListChecks,
  Eye,
  EyeOff,
  Edit3,
  Copy,
  Download,
  Upload,
  Archive,
  RotateCcw,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type GameQuestionType = 'multiple_choice' | 'true_false' | 'matching' | 'sequence';
export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type EducationalGameType =
  | 'snake_ladder'
  | 'race'
  | 'knowledge_race'
  | 'true_false'
  | 'football'
  | 'penalty'
  | 'matching'
  | 'match_cards'
  | 'sequence'
  | 'order';

export interface TeacherGameQuestion {
  id: string;
  schoolCode: string;
  teacherId: string;
  subject: string;
  grade: string;
  classes: string[];
  semester?: '1' | '2';
  unit: string;
  lesson: string;
  gameTypes: EducationalGameType[];
  questionType: GameQuestionType;
  question: string;
  options: string[];
  correctAnswerIndex?: number;
  correctAnswerText?: string;
  pairs?: { left: string; right: string }[];
  sequence?: string[];
  explanation: string;
  difficulty: GameDifficulty;
  skill?: string;
  active: boolean;
  visibleFrom?: string;
  createdAt: string;
  updatedAt: string;
  status?: 'active' | 'archived' | 'review' | string;
  publishBatchId?: string;
  archivedAt?: string;
}

export interface PublishGameQuestionsPayload {
  schoolCode: string;
  teacherId: string;
  subject: string;
  grade: string;
  classes: string[];
  questions: TeacherGameQuestion[];
  publishedAt: string;
}

interface TeacherGameQuestionsManagerProps {
  schoolCode: string;
  teacherId: string;
  teacherName?: string;
  defaultSubject?: string;
  defaultGrade?: string;
  classOptions?: string[];
  subjectOptions?: string[];
  gradeOptions?: string[];
  onPublish?: (payload: PublishGameQuestionsPayload) => Promise<void> | void;
}

type ToastState = { type: 'success' | 'warning' | 'danger'; message: string } | null;
type QuestionValidation = { ok: boolean; message?: string };
type QuestionsView = 'editor' | 'archive';

const TEACHER_GAME_QUESTIONS_CLOUD_URL =
  'https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec';

const GAME_OPTIONS: { id: EducationalGameType; labelKey: string; hintKey: string; accepts: GameQuestionType[] }[] = [
  { id: 'snake_ladder', labelKey: 'gameNameSnakeLadder', hintKey: 'gameHintSnakeLadder', accepts: ['multiple_choice', 'true_false'] },
  { id: 'knowledge_race', labelKey: 'gameNameKnowledgeRace', hintKey: 'gameHintKnowledgeRace', accepts: ['multiple_choice'] },
  { id: 'true_false', labelKey: 'gameNameTrueFalse', hintKey: 'gameHintTrueFalse', accepts: ['true_false'] },
  { id: 'football', labelKey: 'gameNameFootballQuiz', hintKey: 'gameHintFootball', accepts: ['multiple_choice', 'true_false'] },
  { id: 'matching', labelKey: 'gameNameMatchCards', hintKey: 'gameHintMatching', accepts: ['matching'] },
  { id: 'sequence', labelKey: 'gameNameSequenceOrder', hintKey: 'gameHintSequence', accepts: ['sequence'] }
];

const QUESTION_TYPES: { id: GameQuestionType; labelKey: string; hintKey: string }[] = [
  { id: 'multiple_choice', labelKey: 'gameQuestionTypeMultipleChoice', hintKey: 'gameQuestionHintMultipleChoice' },
  { id: 'true_false', labelKey: 'gameQuestionTypeTrueFalse', hintKey: 'gameQuestionHintTrueFalse' },
  { id: 'matching', labelKey: 'gameQuestionTypeMatching', hintKey: 'gameQuestionHintMatching' },
  { id: 'sequence', labelKey: 'gameQuestionTypeSequence', hintKey: 'gameQuestionHintSequence' }
];

const DIFFICULTY_OPTIONS: { id: GameDifficulty; labelKey: string }[] = [
  { id: 'easy', labelKey: 'gameDifficultyEasy' },
  { id: 'medium', labelKey: 'gameDifficultyMedium' },
  { id: 'hard', labelKey: 'gameDifficultyHard' }
];

const createId = () => `gq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const getInitialQuestion = (
  schoolCode: string,
  teacherId: string,
  defaultSubject = '',
  defaultGrade = '',
  classOptions: string[] = []
): TeacherGameQuestion => {
  const now = new Date().toISOString();
  return {
    id: createId(),
    schoolCode,
    teacherId,
    subject: defaultSubject,
    grade: defaultGrade,
    classes: classOptions.length > 0 ? [classOptions[0]] : [],
    semester: '1',
    unit: '',
    lesson: '',
    gameTypes: ['snake_ladder'],
    questionType: 'multiple_choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    correctAnswerText: '',
    pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }],
    sequence: ['', '', ''],
    explanation: '',
    difficulty: 'easy',
    skill: 'فهم',
    active: true,
    visibleFrom: todayIsoDate(),
    createdAt: now,
    updatedAt: now,
    status: 'active'
  };
};

/**
 * دوال حماية وتطبيع مهمة جدًا للأرشيف:
 * بعض بيانات السحابة أو التخزين المحلي قد تصل كسلاسل نصية بدل مصفوفات.
 * هذه الدوال تمنع الشاشة البيضاء عند النسخ أو ال{tr('groupsRestoreAction')} من {tr('groupsArchive')}.
 */
const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(item => String(item || '').trim()).filter(Boolean);
    } catch {
      // ليس JSON، نستخدم الفواصل.
    }

    return text.split(',').map(item => item.trim()).filter(Boolean);
  }

  return [];
};

const asPairs = (value: unknown): { left: string; right: string }[] => {
  let list: unknown = value;

  if (typeof value === 'string') {
    try {
      list = JSON.parse(value || '[]');
    } catch {
      list = [];
    }
  }

  if (!Array.isArray(list)) return [];

  return list
    .map((item: any) => ({
      left: String(item?.left ?? item?.term ?? '').trim(),
      right: String(item?.right ?? item?.definition ?? '').trim()
    }))
    .filter(pair => pair.left || pair.right);
};

const safeReadQuestions = (key: string): TeacherGameQuestion[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeTeacherGameQuestion = (
  raw: Partial<TeacherGameQuestion> | any,
  schoolCode: string,
  teacherId: string,
  fallbackSubject = '',
  fallbackGrade = '',
  fallbackClasses: string[] = []
): TeacherGameQuestion => {
  const now = new Date().toISOString();
  const allowedQuestionTypes: GameQuestionType[] = ['multiple_choice', 'true_false', 'matching', 'sequence'];
  const questionType = allowedQuestionTypes.includes(raw?.questionType)
    ? raw.questionType as GameQuestionType
    : 'multiple_choice';

  const classes = asStringArray(raw?.classes || raw?.className);
  const options = questionType === 'true_false' ? ['صح', 'خطأ'] : asStringArray(raw?.options);

  const parsedCorrectIndex =
    typeof raw?.correctAnswerIndex === 'number' && Number.isFinite(raw.correctAnswerIndex)
      ? raw.correctAnswerIndex
      : raw?.correctAnswerIndex !== undefined && raw?.correctAnswerIndex !== '' && !Number.isNaN(Number(raw.correctAnswerIndex))
        ? Number(raw.correctAnswerIndex)
        : 0;

  const normalizedOptions = questionType === 'multiple_choice'
    ? (options.length > 0 ? options : ['', '', '', ''])
    : options;

  return {
    id: String(raw?.id || createId()),
    schoolCode: String(raw?.schoolCode || schoolCode || ''),
    teacherId: String(raw?.teacherId || teacherId || ''),
    subject: String(raw?.subject || fallbackSubject || ''),
    grade: String(raw?.grade || fallbackGrade || ''),
    classes: classes.length > 0 ? classes : fallbackClasses,
    semester: raw?.semester === '2' ? '2' : '1',
    unit: String(raw?.unit || ''),
    lesson: String(raw?.lesson || ''),
    gameTypes: asStringArray(raw?.gameTypes) as EducationalGameType[],
    questionType,
    question: String(raw?.question || ''),
    options: normalizedOptions,
    correctAnswerIndex: questionType === 'true_false'
      ? (parsedCorrectIndex === 1 ? 1 : 0)
      : parsedCorrectIndex,
    correctAnswerText: String(raw?.correctAnswerText || ''),
    pairs: asPairs(raw?.pairs),
    sequence: asStringArray(raw?.sequence),
    explanation: String(raw?.explanation || ''),
    difficulty: (raw?.difficulty === 'medium' || raw?.difficulty === 'hard' ? raw.difficulty : 'easy') as GameDifficulty,
    skill: String(raw?.skill || 'فهم'),
    active: raw?.active === false ? false : true,
    visibleFrom: String(raw?.visibleFrom || todayIsoDate()),
    createdAt: String(raw?.createdAt || now),
    updatedAt: String(raw?.updatedAt || now),
    status: raw?.status,
    publishBatchId: raw?.publishBatchId,
    archivedAt: raw?.archivedAt
  };
};

const validateQuestion = (question: TeacherGameQuestion, translate?: (key: string) => string): QuestionValidation => {
  const tx = (key: string, fallback: string) => translate ? translate(key) : fallback;
  const classes = Array.isArray(question.classes) ? question.classes : [];
  const gameTypes = Array.isArray(question.gameTypes) ? question.gameTypes : [];
  const options = Array.isArray(question.options) ? question.options : [];
  const pairs = Array.isArray(question.pairs) ? question.pairs : [];
  const sequence = Array.isArray(question.sequence) ? question.sequence : [];

  if (!String(question.subject || '').trim()) return { ok: false, message: tx('gameValidateSubject', 'اختر المادة.') };
  if (classes.length === 0) return { ok: false, message: tx('gameValidateClass', 'اختر فصلًا واحدًا على الأقل.') };
  if (!String(question.unit || '').trim()) return { ok: false, message: tx('gameValidateUnit', 'أدخل الوحدة.') };
  if (!String(question.lesson || '').trim()) return { ok: false, message: tx('gameValidateLesson', 'أدخل الدرس.') };
  if (!String(question.question || '').trim()) return { ok: false, message: tx('gameValidateQuestion', 'أدخل نص السؤال.') };
  if (gameTypes.length === 0) return { ok: false, message: tx('gameValidateGame', 'اختر لعبة واحدة على الأقل.') };

  if (question.questionType === 'multiple_choice') {
    const filledOptions = options.filter(option => String(option || '').trim());
    if (filledOptions.length < 2) return { ok: false, message: tx('gameValidateOptions', 'أدخل اختيارين على الأقل.') };
    if (typeof question.correctAnswerIndex !== 'number') return { ok: false, message: tx('gameValidateCorrectAnswer', 'حدد الإجابة الصحيحة.') };
    if (!String(options[question.correctAnswerIndex] || '').trim()) return { ok: false, message: tx('gameValidateCorrectNotEmpty', 'الإجابة الصحيحة لا يمكن أن تكون فارغة.') };
  }

  if (question.questionType === 'true_false' && question.correctAnswerIndex !== 0 && question.correctAnswerIndex !== 1) {
    return { ok: false, message: tx('gameValidateTrueFalse', 'حدد صح أو خطأ.') };
  }

  if (question.questionType === 'matching') {
    const validPairs = pairs.filter(pair => String(pair.left || '').trim() && String(pair.right || '').trim());
    if (validPairs.length < 2) return { ok: false, message: tx('gameValidatePairs', 'أدخل زوجين على الأقل للمطابقة.') };
  }

  if (question.questionType === 'sequence') {
    const validSequence = sequence.filter(item => String(item || '').trim());
    if (validSequence.length < 3) return { ok: false, message: tx('gameValidateSequence', 'أدخل 3 عناصر على الأقل للترتيب.') };
  }

  if (!String(question.explanation || '').trim()) return { ok: false, message: tx('gameValidateExplanation', 'أدخل تفسير الإجابة ليستفيد الطالب بعد اللعب.') };
  return { ok: true };
};

const sanitizeForStudent = (question: TeacherGameQuestion) => {
  const classes = Array.isArray(question.classes) ? question.classes : [];
  const options = Array.isArray(question.options) ? question.options : [];
  const pairs = Array.isArray(question.pairs) ? question.pairs : [];
  const sequence = Array.isArray(question.sequence) ? question.sequence : [];

  return {
    id: question.id,
    schoolCode: question.schoolCode,
    teacherId: question.teacherId,
    subject: question.subject,
    grade: question.grade,
    className: classes[0] || '',
    classes,
    semester: question.semester || '1',
    unit: question.unit,
    lesson: question.lesson,
    gameTypes: Array.isArray(question.gameTypes) ? question.gameTypes : [],
    questionType: question.questionType,
    question: question.question,
    options: question.questionType === 'true_false' ? ['صح', 'خطأ'] : options.filter(option => String(option || '').trim()),
    correctAnswerIndex: question.correctAnswerIndex,
    correctAnswerText: question.correctAnswerText,
    pairs: pairs.filter(pair => String(pair.left || '').trim() && String(pair.right || '').trim()),
    sequence: sequence.filter(item => String(item || '').trim()),
    explanation: question.explanation,
    difficulty: question.difficulty,
    skill: question.skill,
    active: question.active,
    status: question.status || 'active',
    publishBatchId: question.publishBatchId,
    visibleFrom: question.visibleFrom,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    archivedAt: question.archivedAt
  };
};

const formatDateTime = (value: string | undefined, locale: string, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};


const TeacherGameQuestionsManager: React.FC<TeacherGameQuestionsManagerProps> = ({
  schoolCode,
  teacherId,
  teacherName,
  defaultSubject = '',
  defaultGrade = '',
  classOptions = [],
  subjectOptions = [],
  gradeOptions: _gradeOptions = [],
  onPublish
}) => {
  const { t, dir, language } = useApp();
  const tr = (key: string) => String(t(key) || key);
  const locale = language === 'ar' ? 'ar-OM' : 'en-GB';
  const unknownLabel = tr('gameUnknown');
  const getQuestionTypeLabel = (type?: string) => { const item = QUESTION_TYPES.find(entry => entry.id === type); return item ? tr(item.labelKey) : (type || unknownLabel); };

  const draftKey = `rased_teacher_game_questions_${schoolCode}_${teacherId}`;
  const activePublishedKey = `rased_teacher_game_questions_active_${schoolCode}_${teacherId}`;
  const archiveKey = `rased_teacher_game_questions_archive_${schoolCode}_${teacherId}`;

  const [questions, setQuestions] = useState<TeacherGameQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<TeacherGameQuestion>(() =>
    getInitialQuestion(schoolCode, teacherId, defaultSubject, defaultGrade, classOptions)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewStudentPayload, setPreviewStudentPayload] = useState(false);
  const [questionsView, setQuestionsView] = useState<QuestionsView>('editor');
  const [localArchiveQuestions, setLocalArchiveQuestions] = useState<TeacherGameQuestion[]>([]);
  const [cloudArchiveQuestions, setCloudArchiveQuestions] = useState<TeacherGameQuestion[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);

  useEffect(() => {
    try {
      const saved = safeReadQuestions(draftKey);
      if (saved.length > 0) {
        setQuestions(
          saved
            .filter((q: any) => q?.questionType !== 'hints')
            .map((q: any) => normalizeTeacherGameQuestion(q, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions))
        );
        return;
      }

      const activePublished = safeReadQuestions(activePublishedKey);
      setQuestions(
        activePublished
          .filter((q: any) => q?.questionType !== 'hints')
          .map((q: any) => normalizeTeacherGameQuestion(q, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions))
      );
    } catch {
      setQuestions([]);
    }
  }, [draftKey, activePublishedKey, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions]);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(questions));
  }, [draftKey, questions]);

  useEffect(() => {
    const archiveFromKey = safeReadQuestions(archiveKey);
    const activePublished = safeReadQuestions(activePublishedKey);
    const drafts = safeReadQuestions(draftKey);

    const archivedLike = [...activePublished, ...drafts].filter((question: any) => {
      const status = String(question?.status || '').toLowerCase();
      return status === 'archived' || status === 'review' || question?.active === false || question?.archivedAt;
    });

    const map = new Map<string, TeacherGameQuestion>();

    [...archiveFromKey, ...archivedLike]
      .filter((question: any) => question && question.questionType !== 'hints')
      .map((question: any) => normalizeTeacherGameQuestion(question, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions))
      .forEach(question => map.set(question.id, question));

    const nextLocalArchive = Array.from(map.values()).sort(
      (a, b) => new Date(b.archivedAt || b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.archivedAt || a.updatedAt || a.createdAt || 0).getTime()
    );

    setLocalArchiveQuestions(nextLocalArchive);
    localStorage.setItem(archiveKey, JSON.stringify(nextLocalArchive));
  }, [archiveKey, activePublishedKey, draftKey, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions]);

  const compatibleGames = useMemo(
    () => GAME_OPTIONS.filter(game => game.accepts.includes(currentQuestion.questionType)),
    [currentQuestion.questionType]
  );

  const validQuestions = useMemo(() => questions.filter(question => validateQuestion(question, tr).ok), [questions]);

  const archiveQuestions = useMemo(() => {
    const map = new Map<string, TeacherGameQuestion>();
    [...cloudArchiveQuestions, ...localArchiveQuestions].forEach(item => {
      if (!item?.id || item.questionType === 'hints') return;
      map.set(item.id, item);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.archivedAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.archivedAt || a.updatedAt || a.createdAt || 0).getTime()
    );
  }, [cloudArchiveQuestions, localArchiveQuestions]);

  const setField = <K extends keyof TeacherGameQuestion>(key: K, value: TeacherGameQuestion[K]) => {
    setCurrentQuestion(prev => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  };

  const showToast = (type: ToastState extends infer T ? T extends null ? never : T['type'] : never, message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2600);
  };

  const saveLocalArchive = (items: TeacherGameQuestion[]) => {
    const map = new Map<string, TeacherGameQuestion>();
    items.forEach((item: any) => {
      if (!item?.id || item.questionType === 'hints') return;
      const normalized = normalizeTeacherGameQuestion(item, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions);
      map.set(normalized.id, normalized);
    });
    const nextArchive = Array.from(map.values()).sort(
      (a, b) => new Date(b.archivedAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.archivedAt || a.updatedAt || a.createdAt || 0).getTime()
    );
    setLocalArchiveQuestions(nextArchive);
    localStorage.setItem(archiveKey, JSON.stringify(nextArchive));
  };

  const archivePreviousActiveQuestionsLocally = (nextActiveQuestions: TeacherGameQuestion[]) => {
    const now = new Date().toISOString();
    const normalizedNextActiveQuestions = nextActiveQuestions.map((question: any) =>
      normalizeTeacherGameQuestion(question, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions)
    );
    const nextIds = new Set(normalizedNextActiveQuestions.map(question => question.id));
    const previousActive = safeReadQuestions(activePublishedKey);

    const archivedPrevious = previousActive
      .filter((question: any) => question && question.questionType !== 'hints' && !nextIds.has(question.id))
      .map((question: any) => ({
        ...normalizeTeacherGameQuestion(question, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions),
        active: false,
        status: 'archived',
        archivedAt: now,
        updatedAt: now
      }));

    if (archivedPrevious.length > 0) saveLocalArchive([...archivedPrevious, ...localArchiveQuestions]);
    localStorage.setItem(activePublishedKey, JSON.stringify(normalizedNextActiveQuestions));
  };

  const fetchCloudArchiveQuestions = async () => {
    setIsLoadingArchive(true);
    try {
      const response = await fetch(TEACHER_GAME_QUESTIONS_CLOUD_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getTeacherGameQuestions', schoolCode, teacherId, status: 'archived' })
      });
      const result = await response.json();
      const list = Array.isArray(result?.data) ? result.data : [];
      const normalizedCloudArchive = list
        .filter((q: any) => q && q.questionType !== 'hints')
        .map((q: any) => normalizeTeacherGameQuestion(q, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions))
        .map(q => ({ ...q, active: false, status: q.status || 'archived' }));

      setCloudArchiveQuestions(normalizedCloudArchive);
      saveLocalArchive([...normalizedCloudArchive, ...localArchiveQuestions]);
    } catch (error) {
      console.error('Failed to fetch archived game questions', error);
      setCloudArchiveQuestions([]);
      showToast('warning', tr('gameArchiveCloudError'));
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const openArchiveView = () => {
    setQuestionsView('archive');
    fetchCloudArchiveQuestions();
  };

  const resetForm = () => {
    setEditingId(null);
    setCurrentQuestion(getInitialQuestion(schoolCode, teacherId, defaultSubject, defaultGrade, classOptions));
  };

  const handleQuestionTypeChange = (type: GameQuestionType) => {
    const allowedGames = GAME_OPTIONS.filter(game => game.accepts.includes(type)).map(game => game.id);
    setCurrentQuestion(prev => ({
      ...prev,
      questionType: type,
      gameTypes: prev.gameTypes.filter(game => allowedGames.includes(game)),
      options: type === 'true_false' ? ['صح', 'خطأ'] : prev.options.length ? prev.options : ['', '', '', ''],
      correctAnswerIndex: type === 'true_false' ? 0 : prev.correctAnswerIndex ?? 0,
      updatedAt: new Date().toISOString()
    }));
  };

  const toggleClass = (className: string) => {
    setCurrentQuestion(prev => {
      const exists = prev.classes.includes(className);
      return {
        ...prev,
        classes: exists ? prev.classes.filter(item => item !== className) : [...prev.classes, className],
        updatedAt: new Date().toISOString()
      };
    });
  };

  const toggleGame = (gameId: EducationalGameType) => {
    setCurrentQuestion(prev => {
      const exists = prev.gameTypes.includes(gameId);
      return {
        ...prev,
        gameTypes: exists ? prev.gameTypes.filter(item => item !== gameId) : [...prev.gameTypes, gameId],
        updatedAt: new Date().toISOString()
      };
    });
  };

  const updateOption = (index: number, value: string) => {
    setCurrentQuestion(prev => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options, updatedAt: new Date().toISOString() };
    });
  };

  const updatePair = (index: number, side: 'left' | 'right', value: string) => {
    setCurrentQuestion(prev => {
      const pairs = [...(prev.pairs || [])];
      pairs[index] = { ...(pairs[index] || { left: '', right: '' }), [side]: value };
      return { ...prev, pairs, updatedAt: new Date().toISOString() };
    });
  };

  const updateSequence = (index: number, value: string) => {
    setCurrentQuestion(prev => {
      const sequence = [...(prev.sequence || [])];
      sequence[index] = value;
      return { ...prev, sequence, updatedAt: new Date().toISOString() };
    });
  };

  const addQuestion = () => {
    const normalizedCurrent = normalizeTeacherGameQuestion(currentQuestion, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions);
    const validation = validateQuestion(normalizedCurrent, tr);
    if (!validation.ok) {
      showToast('warning', validation.message || tr('gameReviewQuestionData'));
      return;
    }
    const cleanQuestion: TeacherGameQuestion = { ...normalizedCurrent, status: 'active', active: normalizedCurrent.active !== false };
    if (editingId) {
      setQuestions(prev => prev.map(question => question.id === editingId ? { ...cleanQuestion, updatedAt: new Date().toISOString() } : question));
      showToast('success', tr('gameQuestionUpdated'));
    } else {
      setQuestions(prev => [...prev, { ...cleanQuestion, id: cleanQuestion.id || createId(), createdAt: cleanQuestion.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }]);
      showToast('success', tr('gameQuestionAdded'));
    }
    resetForm();
  };

  const editQuestion = (question: TeacherGameQuestion) => {
    const normalized = normalizeTeacherGameQuestion(question, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions);
    setEditingId(normalized.id);
    setCurrentQuestion({ ...normalized, status: 'active', active: normalized.active !== false });
    setQuestionsView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const duplicateQuestion = (question: TeacherGameQuestion) => {
    const now = new Date().toISOString();
    const normalized = normalizeTeacherGameQuestion(question, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions);
    setQuestions(prev => [
      ...prev,
      {
        ...normalized,
        id: createId(),
        question: `${normalized.question || tr('gameQuestionFallback')} - ${tr('groupsCopySuffix')}`,
        active: true,
        status: 'active',
        archivedAt: undefined,
        createdAt: now,
        updatedAt: now
      }
    ]);
    setQuestionsView('editor');
    showToast('success', tr('gameQuestionCopied'));
  };

  const restoreFromArchive = (question: TeacherGameQuestion) => {
    const now = new Date().toISOString();
    const normalized = normalizeTeacherGameQuestion(question, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions);
    const restored: TeacherGameQuestion = {
      ...normalized,
      id: createId(),
      active: true,
      status: 'active',
      archivedAt: undefined,
      createdAt: now,
      updatedAt: now
    };
    setQuestions(prev => [restored, ...prev]);
    setQuestionsView('editor');
    showToast('success', tr('gameQuestionRestored'));
  };

  const deleteQuestion = (id: string) => {
    if (!window.confirm(tr('gameConfirmDeleteQuestion'))) return;
    setQuestions(prev => prev.filter(question => question.id !== id));
    if (editingId === id) resetForm();
    showToast('danger', tr('gameQuestionDeleted'));
  };

  const toggleQuestionActive = (id: string) => {
    setQuestions(prev => prev.map(question => question.id === id ? { ...question, active: !question.active, updatedAt: new Date().toISOString() } : question));
  };

  const buildPublishPayload = (): PublishGameQuestionsPayload => {
    const firstQuestion = validQuestions[0];
    return {
      schoolCode,
      teacherId,
      subject: firstQuestion?.subject || defaultSubject || '',
      grade: firstQuestion?.grade || defaultGrade || '',
      classes: Array.from(new Set(validQuestions.flatMap(question => Array.isArray(question.classes) ? question.classes : []))),
      questions: validQuestions.map(question => ({
        ...normalizeTeacherGameQuestion(question, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions),
        status: 'active',
        active: question.active !== false
      })),
      publishedAt: new Date().toISOString()
    };
  };

  const publishQuestions = async () => {
    if (validQuestions.length === 0) {
      showToast('warning', tr('gameNoValidQuestions'));
      return;
    }
    const payload = buildPublishPayload();
    try {
      setIsPublishing(true);
      if (onPublish) await onPublish(payload);
      else localStorage.setItem('rased_game_questions', JSON.stringify(validQuestions.map(sanitizeForStudent)));
      archivePreviousActiveQuestionsLocally(payload.questions);
      showToast('success', tr('gamePublishSuccess'));
    } catch (error) {
      console.error(error);
      showToast('danger', tr('gamePublishError'));
    } finally {
      setIsPublishing(false);
    }
  };

  const exportJson = () => {
    const data = JSON.stringify(buildPublishPayload(), null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rased-game-questions-${schoolCode}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedQuestions = Array.isArray(parsed) ? parsed : Array.isArray(parsed.questions) ? parsed.questions : [];
      if (!Array.isArray(importedQuestions) || importedQuestions.length === 0) {
        showToast('warning', tr('gameImportNoValidQuestions'));
        return;
      }
      const now = new Date().toISOString();
      setQuestions(prev => [
        ...prev,
        ...importedQuestions
          .filter((question: any) => question?.questionType !== 'hints')
          .map((question: any) => ({
            ...normalizeTeacherGameQuestion(question, schoolCode, teacherId, defaultSubject, defaultGrade, classOptions),
            id: question.id || createId(),
            schoolCode,
            teacherId,
            active: question.active !== false,
            status: 'active',
            updatedAt: now
          }))
      ]);
      showToast('success', tr('gameImportSuccess'));
    } catch {
      showToast('danger', tr('gameImportReadError'));
    }
  };

  const renderQuestionSpecificFields = () => {
    if (currentQuestion.questionType === 'multiple_choice') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-black text-textPrimary">{tr('gameChoices')}</label>
          {currentQuestion.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setField('correctAnswerIndex', index)}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs ${currentQuestion.correctAnswerIndex === index ? 'bg-success text-white border-success' : 'bg-bgSoft text-textSecondary border-borderColor'}`}
                title={tr('gameSelectCorrectAnswer')}
              >
                {index + 1}
              </button>
              <input
                value={option}
                onChange={event => updateOption(index, event.target.value)}
                placeholder={`${tr('gameChoice')} ${index + 1}`}
                className="flex-1 h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold text-textPrimary outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>
      );
    }

    if (currentQuestion.questionType === 'true_false') {
      return (
        <div className="grid grid-cols-2 gap-3">
          {['صح', 'خطأ'].map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setField('correctAnswerIndex', index)}
              className={`h-12 rounded-2xl border font-black ${currentQuestion.correctAnswerIndex === index ? 'bg-success text-white border-success' : 'bg-bgSoft text-textSecondary border-borderColor'}`}
            >
              {index === 0 ? tr('gameTrue') : tr('gameFalse')}
            </button>
          ))}
        </div>
      );
    }

    if (currentQuestion.questionType === 'matching') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-black text-textPrimary">{tr('gameMatchingPairs')}</label>
          {(currentQuestion.pairs || []).map((pair, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <input value={pair.left} onChange={event => updatePair(index, 'left', event.target.value)} placeholder={tr('gameTerm')} className="h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary" />
              <input value={pair.right} onChange={event => updatePair(index, 'right', event.target.value)} placeholder={tr('gameDefinition')} className="h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary" />
            </div>
          ))}
          <button type="button" onClick={() => setField('pairs', [...(currentQuestion.pairs || []), { left: '', right: '' }])} className="h-10 px-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-xs font-black">
            {tr('gameAddPair')}
          </button>
        </div>
      );
    }

    if (currentQuestion.questionType === 'sequence') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-black text-textPrimary">{tr('gameCorrectSequence')}</label>
          {(currentQuestion.sequence || []).map((item, index) => (
            <input key={index} value={item} onChange={event => updateSequence(index, event.target.value)} placeholder={`${tr('gameItem')} ${index + 1}`} className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary" />
          ))}
          <button type="button" onClick={() => setField('sequence', [...(currentQuestion.sequence || []), ''])} className="h-10 px-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-xs font-black">
            {tr('gameAddItem')}
          </button>
        </div>
      );
    }

    return null;
  };

  const studentPreview = useMemo(() => validQuestions.map(sanitizeForStudent), [validQuestions]);

  return (
    <div className="rased-teacher-games flex flex-col h-full min-h-0 bg-bgMain text-textPrimary" dir={dir}>
      <header className="bg-bgCard border-b border-borderColor p-4 shadow-sm shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-textPrimary flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" />
              {tr('gameQuestionsBankTitle')}
            </h1>
            <p className="text-xs font-bold text-textSecondary mt-1">{tr('gameQuestionsBankSubtitle')}</p>
            {teacherName && <p className="text-[10px] font-bold text-textMuted mt-1">{tr('teacherLabel')} {teacherName}</p>}
          </div>

          <button type="button" onClick={publishQuestions} disabled={isPublishing || validQuestions.length === 0} className="h-11 px-4 rounded-2xl bg-primary text-white font-black text-xs flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
            <CloudUpload className="w-4 h-4" />
            {isPublishing ? tr('gamePublishing') : tr('gamePublishToCloud')}
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed top-4 left-4 right-4 z-[999] flex justify-center pointer-events-none">
          <div className={`max-w-md w-full rounded-2xl border p-3 shadow-elevated font-black text-xs pointer-events-auto ${toast.type === 'success' ? 'bg-success/10 border-success/20 text-success' : toast.type === 'danger' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-warning/10 border-warning/20 text-warning'}`}>
            {toast.message}
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-4">
        <section className="bg-bgCard border border-borderColor rounded-3xl p-2 shadow-sm flex gap-2">
          <button type="button" onClick={() => setQuestionsView('editor')} className={`flex-1 h-11 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${questionsView === 'editor' ? 'bg-primary text-white shadow-sm' : 'bg-bgSoft text-textSecondary hover:text-primary'}`}>
            <Plus className="w-4 h-4" />
            {tr('gameCreateQuestions')}
          </button>
          <button type="button" onClick={openArchiveView} className={`flex-1 h-11 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${questionsView === 'archive' ? 'bg-primary text-white shadow-sm' : 'bg-bgSoft text-textSecondary hover:text-primary'}`}>
            <Archive className="w-4 h-4" />
            {tr('groupsArchive')}
          </button>
        </section>

        {questionsView === 'editor' ? (
          <>
            <section className="grid grid-cols-3 gap-3">
              <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm"><p className="text-[10px] font-bold text-textSecondary mb-1">{tr('gameTotalQuestions')}</p><p className="text-2xl font-black text-primary">{questions.length}</p></div>
              <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm"><p className="text-[10px] font-bold text-textSecondary mb-1">{tr('gameValidForPublish')}</p><p className="text-2xl font-black text-success">{validQuestions.length}</p></div>
              <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm"><p className="text-[10px] font-bold text-textSecondary mb-1">{tr('gameActiveQuestions')}</p><p className="text-2xl font-black text-warning">{questions.filter(question => question.active).length}</p></div>
            </section>

            <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-black text-textPrimary flex items-center gap-2"><Plus className="w-4 h-4 text-primary" />{editingId ? tr('gameEditQuestion') : tr('gameAddNewQuestion')}</h2>
                {editingId && <button type="button" onClick={resetForm} className="text-xs font-black text-danger">{tr('gameCancelEdit')}</button>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-textSecondary block mb-1">{tr('subjectCol')}</label>
                  <input list="subject-options" value={currentQuestion.subject} onChange={event => setField('subject', event.target.value)} placeholder={tr('gameSubjectExample')} className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary" />
                  <datalist id="subject-options">{subjectOptions.map(subject => <option key={subject} value={subject} />)}</datalist>
                </div>
                <div>
                  <label className="text-[10px] font-black text-textSecondary block mb-1">{tr('semesterLabel')}</label>
                  <select value={currentQuestion.semester || '1'} onChange={event => setField('semester', event.target.value as '1' | '2')} className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary">
                    <option value="1">{tr('semester1')}</option><option value="2">{tr('semester2')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-textSecondary block mb-2">{tr('gameTargetClasses')}</label>
                <div className="flex flex-wrap gap-2">
                  {classOptions.length > 0 ? classOptions.map(className => (
                    <button key={className} type="button" onClick={() => toggleClass(className)} className={`px-3 py-2 rounded-2xl border text-xs font-black ${currentQuestion.classes.includes(className) ? 'bg-primary text-white border-primary' : 'bg-bgSoft text-textSecondary border-borderColor'}`}>{className}</button>
                  )) : (
                    <input value={currentQuestion.classes.join(',')} onChange={event => setField('classes', event.target.value.split(',').map(item => item.trim()).filter(Boolean))} placeholder={tr('gameClassesExample')} className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-[10px] font-black text-textSecondary block mb-1">{tr('unitLabel')}</label><input value={currentQuestion.unit} onChange={event => setField('unit', event.target.value)} placeholder="مثال: {tr('unitLabel')} الثانية" className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary" /></div>
                <div><label className="text-[10px] font-black text-textSecondary block mb-1">{tr('lessonLabel')}</label><input value={currentQuestion.lesson} onChange={event => setField('lesson', event.target.value)} placeholder={tr('gameLessonExample')} className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary" /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="text-[10px] font-black text-textSecondary block mb-1">{tr('gameQuestionType')}</label><select value={currentQuestion.questionType} onChange={event => handleQuestionTypeChange(event.target.value as GameQuestionType)} className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary">{QUESTION_TYPES.map(type => <option key={type.id} value={type.id}>{tr(type.labelKey)}</option>)}</select></div>
                <div><label className="text-[10px] font-black text-textSecondary block mb-1">{tr('gameDifficulty')}</label><select value={currentQuestion.difficulty} onChange={event => setField('difficulty', event.target.value as GameDifficulty)} className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary">{DIFFICULTY_OPTIONS.map(item => <option key={item.id} value={item.id}>{tr(item.labelKey)}</option>)}</select></div>
                <div><label className="text-[10px] font-black text-textSecondary block mb-1">{tr('gameVisibleFrom')}</label><input type="date" value={currentQuestion.visibleFrom || ''} onChange={event => setField('visibleFrom', event.target.value)} className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary" /></div>
              </div>

              <div>
                <label className="text-[10px] font-black text-textSecondary block mb-2">{tr('gameCompatibleGames')}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{compatibleGames.map(game => <button key={game.id} type="button" onClick={() => toggleGame(game.id)} className={`text-start rounded-2xl border p-3 ${currentQuestion.gameTypes.includes(game.id) ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-bgSoft border-borderColor text-textSecondary'}`}><p className="text-xs font-black">{tr(game.labelKey)}</p><p className="text-[9px] font-bold opacity-80 mt-0.5">{tr(game.hintKey)}</p></button>)}</div>
              </div>

              <div><label className="text-[10px] font-black text-textSecondary block mb-1">{tr('gameQuestionChallengeText')}</label><textarea value={currentQuestion.question} onChange={event => setField('question', event.target.value)} placeholder={tr('gameQuestionPlaceholder')} className="w-full min-h-[90px] rounded-2xl bg-bgSoft border border-borderColor p-3 text-sm font-bold outline-none focus:border-primary resize-none" /></div>

              {renderQuestionSpecificFields()}

              <div><label className="text-[10px] font-black text-textSecondary block mb-1">{tr('gameExplanationForStudent')}</label><textarea value={currentQuestion.explanation} onChange={event => setField('explanation', event.target.value)} placeholder={tr('gameExplanationPlaceholder')} className="w-full min-h-[80px] rounded-2xl bg-bgSoft border border-borderColor p-3 text-sm font-bold outline-none focus:border-primary resize-none" /></div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={currentQuestion.skill || ''} onChange={event => setField('skill', event.target.value)} placeholder={tr('gameSkillPlaceholder')} className="h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary" />
                <button type="button" onClick={() => setField('active', !currentQuestion.active)} className={`h-11 rounded-2xl border font-black text-xs flex items-center justify-center gap-2 ${currentQuestion.active ? 'bg-success/10 border-success/20 text-success' : 'bg-bgSoft border-borderColor text-textSecondary'}`}>{currentQuestion.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}{currentQuestion.active ? tr('gameEnabledForStudents') : tr('gameDisabled')}</button>
                <button type="button" onClick={addQuestion} className="h-11 rounded-2xl bg-primary text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"><Save className="w-4 h-4" />{editingId ? tr('gameSaveEdit') : tr('gameAddQuestion')}</button>
              </div>
            </section>

            <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-black text-textPrimary flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" />{tr('gameAddedQuestions')}</h2>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPreviewStudentPayload(prev => !prev)} className="h-9 px-3 rounded-xl bg-bgSoft border border-borderColor text-xs font-black text-textSecondary flex items-center gap-1"><Eye className="w-4 h-4" />{tr('gamePreviewPayload')}</button>
                  <button type="button" onClick={exportJson} className="h-9 px-3 rounded-xl bg-bgSoft border border-borderColor text-xs font-black text-textSecondary flex items-center gap-1"><Download className="w-4 h-4" />{tr('gameExport')}</button>
                  <label className="h-9 px-3 rounded-xl bg-bgSoft border border-borderColor text-xs font-black text-textSecondary flex items-center gap-1 cursor-pointer"><Upload className="w-4 h-4" />{tr('gameImport')}<input type="file" accept="application/json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) importJson(file); event.currentTarget.value = ''; }} /></label>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-10 bg-bgSoft border border-borderColor rounded-3xl border-dashed"><HelpCircle className="w-10 h-10 text-textMuted mx-auto mb-3" /><p className="text-xs font-black text-textPrimary">{tr('gameNoQuestionsYet')}</p><p className="text-[10px] font-bold text-textSecondary mt-1">{tr('gameNoQuestionsHint')}</p></div>
              ) : (
                <div className="space-y-2.5">
                  {questions.map(question => {
                    const validation = validateQuestion(question, tr);
                    return (
                      <div key={question.id} className="bg-bgSoft border border-borderColor rounded-2xl p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{question.subject || tr('gameUnknownSubject')}</span>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-bgCard border border-borderColor text-textSecondary">{question.lesson || tr('gameUnknownLesson')}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${validation.ok ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>{validation.ok ? tr('readyStatus') : tr('gameIncompleteData')}</span>
                              {!question.active && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">{tr('gameDisabled')}</span>}
                            </div>
                            <p className="text-sm font-black text-textPrimary line-clamp-2">{question.question || tr('gameQuestionWithoutText')}</p>
                            {!validation.ok && validation.message && <p className="text-[10px] font-bold text-warning mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{validation.message}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={() => toggleQuestionActive(question.id)} className="w-9 h-9 rounded-xl bg-bgCard border border-borderColor flex items-center justify-center text-textSecondary">{question.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                            <button type="button" onClick={() => editQuestion(question)} className="w-9 h-9 rounded-xl bg-bgCard border border-borderColor flex items-center justify-center text-primary"><Edit3 className="w-4 h-4" /></button>
                            <button type="button" onClick={() => duplicateQuestion(question)} className="w-9 h-9 rounded-xl bg-bgCard border border-borderColor flex items-center justify-center text-info"><Copy className="w-4 h-4" /></button>
                            <button type="button" onClick={() => deleteQuestion(question.id)} className="w-9 h-9 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {previewStudentPayload && <section className="bg-slate-950 text-slate-100 rounded-3xl p-4 overflow-auto text-left" dir="ltr"><pre className="text-[11px] leading-5 whitespace-pre-wrap">{JSON.stringify(studentPreview, null, 2)}</pre></section>}
          </>
        ) : (
          <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-black text-textPrimary flex items-center gap-2"><Archive className="w-4 h-4 text-primary" />{tr('gameArchiveTitle')}</h2>
                <p className="text-[10px] font-bold text-textSecondary mt-1">{tr('gameArchiveSubtitle')}</p>
              </div>
              <button type="button" onClick={fetchCloudArchiveQuestions} className="h-10 px-3 rounded-2xl bg-bgSoft border border-borderColor text-textSecondary hover:text-primary font-black text-xs flex items-center gap-2 active:scale-95">
                <RotateCcw className={`w-4 h-4 ${isLoadingArchive ? 'animate-spin' : ''}`} />
                {isLoadingArchive ? tr('gameRefreshing') : tr('gameRefresh')}
              </button>
            </div>

            {archiveQuestions.length === 0 ? (
              <div className="text-center py-10 bg-bgSoft border border-borderColor rounded-3xl border-dashed"><Archive className="w-10 h-10 text-textMuted mx-auto mb-3" /><p className="text-xs font-black text-textPrimary">{tr('gameNoArchivedQuestions')}</p><p className="text-[10px] font-bold text-textSecondary mt-1">بعد نشر دفعة جديدة ستنتقل الأسئلة السابقة إلى {tr('groupsArchive')} تلقائيًا.</p></div>
            ) : (
              <div className="space-y-2.5">
                {archiveQuestions.map(question => (
                  <div key={question.id} className="bg-bgSoft border border-borderColor rounded-2xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{question.subject || tr('gameUnknownSubject')}</span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-bgCard border border-borderColor text-textSecondary">{question.unit || tr('gameUnknownUnit')}</span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-bgCard border border-borderColor text-textSecondary">{question.lesson || tr('gameUnknownLesson')}</span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">{getQuestionTypeLabel(question.questionType)}</span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">{tr('gameArchived')}</span>
                        </div>
                        <p className="text-sm font-black text-textPrimary line-clamp-2">{question.question || tr('gameQuestionWithoutText')}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-[9px] font-bold text-textSecondary">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tr('gameArchivedAt')}:  {formatDateTime(question.archivedAt, locale, unknownLabel)}</span>
                          <span>{tr('classesCountLabel')}:  {asStringArray(question.classes).join(language === 'ar' ? '، ' : ', ') || unknownLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => restoreFromArchive(question)} className="h-9 px-3 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-black">{tr('groupsRestoreAction')}</button>
                        <button type="button" onClick={() => duplicateQuestion(question)} className="w-9 h-9 rounded-xl bg-bgCard border border-borderColor flex items-center justify-center text-info"><Copy className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default TeacherGameQuestionsManager;
