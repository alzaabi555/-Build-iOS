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
  Upload
} from 'lucide-react';

// =========================================================================
// راصد المعلم - مكون بنك أسئلة الألعاب التعليمية
// TeacherGameQuestionsManager.tsx
// -------------------------------------------------------------------------
// الهدف:
// - المعلم ينشئ أسئلة الألعاب التعليمية من راصد المعلم.
// - الأسئلة تحفظ كمسودات محليًا.
// - عند النشر يتم تمرير payload جاهز إلى دالة onPublish لإرساله للسحابة.
// - راصد الطالب يقرأ نفس البنية عبر student.gameQuestions أو قناة المزامنة.
// =========================================================================

export type GameQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'matching'
  | 'sequence';

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

type ToastState = {
  type: 'success' | 'warning' | 'danger';
  message: string;
} | null;

type QuestionValidation = {
  ok: boolean;
  message?: string;
};

const GAME_OPTIONS: {
  id: EducationalGameType;
  label: string;
  hint: string;
  accepts: GameQuestionType[];
}[] = [
  {
    id: 'snake_ladder',
    label: 'السلم والثعبان',
    hint: 'مناسب للاختيار من متعدد وصح/خطأ',
    accepts: ['multiple_choice', 'true_false']
  },
  {
    id: 'knowledge_race',
    label: 'سباق المعرفة',
    hint: 'مناسب للاختيار من متعدد',
    accepts: ['multiple_choice']
  },
  {
    id: 'true_false',
    label: 'صح أم خطأ',
    hint: 'مناسب لعبارات صح/خطأ',
    accepts: ['true_false']
  },
  {
    id: 'football',
    label: 'ركلات المعرفة',
    hint: 'مناسب للاختيار من متعدد وصح/خطأ',
    accepts: ['multiple_choice', 'true_false']
  },
  {
    id: 'matching',
    label: 'طابق المفهوم',
    hint: 'مناسب للمصطلحات والتعريفات',
    accepts: ['matching']
  },
  {
    id: 'sequence',
    label: 'رتّب الأحداث',
    hint: 'مناسب للأحداث والخطوات',
    accepts: ['sequence']
  }
];

const QUESTION_TYPES: { id: GameQuestionType; label: string; hint: string }[] = [
  { id: 'multiple_choice', label: 'اختيار من متعدد', hint: 'سؤال مع عدة اختيارات' },
  { id: 'true_false', label: 'صح أم خطأ', hint: 'عبارة يحدد الطالب صحتها' },
  { id: 'matching', label: 'مطابقة', hint: 'مصطلح وتعريف' },
  { id: 'sequence', label: 'ترتيب', hint: 'ترتيب أحداث أو خطوات' }
];

const DIFFICULTY_OPTIONS: { id: GameDifficulty; label: string }[] = [
  { id: 'easy', label: 'سهل' },
  { id: 'medium', label: 'متوسط' },
  { id: 'hard', label: 'متقدم' }
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
    pairs: [
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' }
    ],
    sequence: ['', '', ''],
    explanation: '',
    difficulty: 'easy',
    skill: 'فهم',
    active: true,
    visibleFrom: todayIsoDate(),
    createdAt: now,
    updatedAt: now
  };
};

const validateQuestion = (question: TeacherGameQuestion): QuestionValidation => {
  if (!question.subject.trim()) return { ok: false, message: 'اختر المادة.' };
  if (question.classes.length === 0) return { ok: false, message: 'اختر فصلًا واحدًا على الأقل.' };
  if (!question.unit.trim()) return { ok: false, message: 'أدخل الوحدة.' };
  if (!question.lesson.trim()) return { ok: false, message: 'أدخل الدرس.' };
  if (!question.question.trim()) return { ok: false, message: 'أدخل نص السؤال.' };
  if (question.gameTypes.length === 0) return { ok: false, message: 'اختر لعبة واحدة على الأقل.' };

  if (question.questionType === 'multiple_choice') {
    const filledOptions = question.options.filter(option => option.trim());
    if (filledOptions.length < 2) return { ok: false, message: 'أدخل اختيارين على الأقل.' };
    if (typeof question.correctAnswerIndex !== 'number') return { ok: false, message: 'حدد الإجابة الصحيحة.' };
    if (!question.options[question.correctAnswerIndex]?.trim()) return { ok: false, message: 'الإجابة الصحيحة لا يمكن أن تكون فارغة.' };
  }

  if (question.questionType === 'true_false') {
    if (question.correctAnswerIndex !== 0 && question.correctAnswerIndex !== 1) {
      return { ok: false, message: 'حدد صح أو خطأ.' };
    }
  }

  if (question.questionType === 'matching') {
    const validPairs = (question.pairs || []).filter(pair => pair.left.trim() && pair.right.trim());
    if (validPairs.length < 2) return { ok: false, message: 'أدخل زوجين على الأقل للمطابقة.' };
  }

  if (question.questionType === 'sequence') {
    const validSequence = (question.sequence || []).filter(item => item.trim());
    if (validSequence.length < 3) return { ok: false, message: 'أدخل 3 عناصر على الأقل للترتيب.' };
  }

  if (!question.explanation.trim()) return { ok: false, message: 'أدخل تفسير الإجابة ليستفيد الطالب بعد اللعب.' };

  return { ok: true };
};

const sanitizeForStudent = (question: TeacherGameQuestion) => {
  // تبقى الإجابة الصحيحة موجودة داخل بيانات اللعبة لأن التحقق يتم محليًا في محرك اللعبة.
  // لاحقًا يمكن توقيع payload أو ضغطه إذا احتجنا طبقة حماية إضافية.
  return {
    id: question.id,
    subject: question.subject,
    grade: question.grade,
    className: question.classes[0] || '',
    classes: question.classes,
    unit: question.unit,
    lesson: question.lesson,
    gameTypes: question.gameTypes,
    questionType: question.questionType,
    question: question.question,
    options:
      question.questionType === 'true_false'
        ? ['صح', 'خطأ']
        : question.options.filter(option => option.trim()),
    correctAnswerIndex: question.correctAnswerIndex,
    correctAnswerText: question.correctAnswerText,
    pairs: question.pairs?.filter(pair => pair.left.trim() && pair.right.trim()),
    sequence: question.sequence?.filter(item => item.trim()),
    explanation: question.explanation,
    difficulty: question.difficulty,
    skill: question.skill,
    active: question.active,
    visibleFrom: question.visibleFrom
  };
};

const TeacherGameQuestionsManager: React.FC<TeacherGameQuestionsManagerProps> = ({
  schoolCode,
  teacherId,
  teacherName,
  defaultSubject = '',
  defaultGrade = '',
  classOptions = [],
  subjectOptions = [],
  onPublish
}) => {
  const draftKey = `rased_teacher_game_questions_${schoolCode}_${teacherId}`;

  const [questions, setQuestions] = useState<TeacherGameQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<TeacherGameQuestion>(() =>
    getInitialQuestion(schoolCode, teacherId, defaultSubject, defaultGrade, classOptions)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewStudentPayload, setPreviewStudentPayload] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || '[]');
      if (Array.isArray(saved)) setQuestions(saved);
    } catch {
      setQuestions([]);
    }
  }, [draftKey]);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(questions));
  }, [draftKey, questions]);

  const compatibleGames = useMemo(() => {
    return GAME_OPTIONS.filter(game => game.accepts.includes(currentQuestion.questionType));
  }, [currentQuestion.questionType]);

  const validQuestions = useMemo(() => {
    return questions.filter(question => validateQuestion(question).ok);
  }, [questions]);

  const setField = <K extends keyof TeacherGameQuestion>(
    key: K,
    value: TeacherGameQuestion[K]
  ) => {
    setCurrentQuestion(prev => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString()
    }));
  };

  const showToast = (type: ToastState extends infer T ? T extends null ? never : T['type'] : never, message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2600);
  };

  const resetForm = () => {
    setEditingId(null);
    setCurrentQuestion(
      getInitialQuestion(schoolCode, teacherId, defaultSubject, defaultGrade, classOptions)
    );
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
        classes: exists
          ? prev.classes.filter(item => item !== className)
          : [...prev.classes, className],
        updatedAt: new Date().toISOString()
      };
    });
  };

  const toggleGame = (gameId: EducationalGameType) => {
    setCurrentQuestion(prev => {
      const exists = prev.gameTypes.includes(gameId);
      return {
        ...prev,
        gameTypes: exists
          ? prev.gameTypes.filter(item => item !== gameId)
          : [...prev.gameTypes, gameId],
        updatedAt: new Date().toISOString()
      };
    });
  };

  const updateOption = (index: number, value: string) => {
    setCurrentQuestion(prev => {
      const options = [...prev.options];
      options[index] = value;
      return {
        ...prev,
        options,
        updatedAt: new Date().toISOString()
      };
    });
  };

  const updatePair = (index: number, side: 'left' | 'right', value: string) => {
    setCurrentQuestion(prev => {
      const pairs = [...(prev.pairs || [])];
      pairs[index] = {
        ...(pairs[index] || { left: '', right: '' }),
        [side]: value
      };
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
    const validation = validateQuestion(currentQuestion);
    if (!validation.ok) {
      showToast('warning', validation.message || 'راجع بيانات السؤال.');
      return;
    }

    if (editingId) {
      setQuestions(prev =>
        prev.map(question =>
          question.id === editingId
            ? { ...currentQuestion, updatedAt: new Date().toISOString() }
            : question
        )
      );
      showToast('success', 'تم تحديث السؤال.');
    } else {
      setQuestions(prev => [
        ...prev,
        {
          ...currentQuestion,
          id: currentQuestion.id || createId(),
          createdAt: currentQuestion.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
      showToast('success', 'تمت إضافة السؤال إلى البنك.');
    }

    resetForm();
  };

  const editQuestion = (question: TeacherGameQuestion) => {
    setEditingId(question.id);
    setCurrentQuestion(question);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const duplicateQuestion = (question: TeacherGameQuestion) => {
    const now = new Date().toISOString();
    setQuestions(prev => [
      ...prev,
      {
        ...question,
        id: createId(),
        question: `${question.question} - نسخة`,
        createdAt: now,
        updatedAt: now
      }
    ]);
    showToast('success', 'تم نسخ السؤال.');
  };

  const deleteQuestion = (id: string) => {
    if (!window.confirm('هل تريد حذف هذا السؤال؟')) return;
    setQuestions(prev => prev.filter(question => question.id !== id));
    if (editingId === id) resetForm();
    showToast('danger', 'تم حذف السؤال.');
  };

  const toggleQuestionActive = (id: string) => {
    setQuestions(prev =>
      prev.map(question =>
        question.id === id
          ? { ...question, active: !question.active, updatedAt: new Date().toISOString() }
          : question
      )
    );
  };

  const buildPublishPayload = (): PublishGameQuestionsPayload => {
    const firstQuestion = validQuestions[0];

    return {
      schoolCode,
      teacherId,
      subject: firstQuestion?.subject || defaultSubject || '',
      grade: firstQuestion?.grade || defaultGrade || '',
      classes: Array.from(new Set(validQuestions.flatMap(question => question.classes))),
      questions: validQuestions,
      publishedAt: new Date().toISOString()
    };
  };

  const publishQuestions = async () => {
    if (validQuestions.length === 0) {
      showToast('warning', 'لا توجد أسئلة صالحة للنشر.');
      return;
    }

    const payload = buildPublishPayload();

    try {
      setIsPublishing(true);

      if (onPublish) {
        await onPublish(payload);
      } else {
        // وضع مؤقت للتجربة داخل نفس المتصفح:
        // يحاكي وصول الأسئلة إلى راصد الطالب عبر localStorage.
        const studentPayload = validQuestions.map(sanitizeForStudent);
        localStorage.setItem('rased_game_questions', JSON.stringify(studentPayload));
      }

      showToast('success', 'تم نشر أسئلة الألعاب بنجاح.');
    } catch (error) {
      console.error(error);
      showToast('danger', 'تعذر نشر الأسئلة. تحقق من الاتصال أو خدمة السحابة.');
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
      const importedQuestions = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.questions)
          ? parsed.questions
          : [];

      if (!Array.isArray(importedQuestions) || importedQuestions.length === 0) {
        showToast('warning', 'الملف لا يحتوي على أسئلة صالحة.');
        return;
      }

      setQuestions(prev => [
        ...prev,
        ...importedQuestions
          .filter((question: TeacherGameQuestion) => question.questionType !== 'hints')
          .map((question: TeacherGameQuestion) => ({
            ...question,
            id: question.id || createId(),
            schoolCode,
            teacherId,
            updatedAt: new Date().toISOString()
          }))
      ]);

      showToast('success', 'تم استيراد الأسئلة.');
    } catch {
      showToast('danger', 'تعذر قراءة ملف الأسئلة.');
    }
  };

  const renderQuestionSpecificFields = () => {
    if (currentQuestion.questionType === 'multiple_choice') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-black text-textPrimary">الاختيارات</label>
          {currentQuestion.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setField('correctAnswerIndex', index)}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs ${
                  currentQuestion.correctAnswerIndex === index
                    ? 'bg-success text-white border-success'
                    : 'bg-bgSoft text-textSecondary border-borderColor'
                }`}
                title="تحديد الإجابة الصحيحة"
              >
                {index + 1}
              </button>
              <input
                value={option}
                onChange={event => updateOption(index, event.target.value)}
                placeholder={`الاختيار ${index + 1}`}
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
              className={`h-12 rounded-2xl border font-black ${
                currentQuestion.correctAnswerIndex === index
                  ? 'bg-success text-white border-success'
                  : 'bg-bgSoft text-textSecondary border-borderColor'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      );
    }

    if (currentQuestion.questionType === 'matching') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-black text-textPrimary">أزواج المطابقة</label>
          {(currentQuestion.pairs || []).map((pair, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <input
                value={pair.left}
                onChange={event => updatePair(index, 'left', event.target.value)}
                placeholder="المصطلح"
                className="h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
              />
              <input
                value={pair.right}
                onChange={event => updatePair(index, 'right', event.target.value)}
                placeholder="التعريف"
                className="h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setField('pairs', [...(currentQuestion.pairs || []), { left: '', right: '' }])}
            className="h-10 px-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-xs font-black"
          >
            إضافة زوج
          </button>
        </div>
      );
    }

    if (currentQuestion.questionType === 'sequence') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-black text-textPrimary">العناصر بالترتيب الصحيح</label>
          {(currentQuestion.sequence || []).map((item, index) => (
            <input
              key={index}
              value={item}
              onChange={event => updateSequence(index, event.target.value)}
              placeholder={`العنصر ${index + 1}`}
              className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
            />
          ))}
          <button
            type="button"
            onClick={() => setField('sequence', [...(currentQuestion.sequence || []), ''])}
            className="h-10 px-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-xs font-black"
          >
            إضافة عنصر
          </button>
        </div>
      );
    }

    return null;
  };

  const studentPreview = useMemo(() => validQuestions.map(sanitizeForStudent), [validQuestions]);

  return (
    <div className="rased-teacher-games flex flex-col h-full min-h-0 bg-bgMain text-textPrimary" dir="rtl">
      <header className="bg-bgCard border-b border-borderColor p-4 shadow-sm shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-textPrimary flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" />
              بنك أسئلة الألعاب التعليمية
            </h1>
            <p className="text-xs font-bold text-textSecondary mt-1">
              أنشئ أسئلة مرتبطة بالمنهج، ثم انشرها لتظهر في راصد الطالب دون تحديث التطبيق.
            </p>
            {teacherName && (
              <p className="text-[10px] font-bold text-textMuted mt-1">المعلم: {teacherName}</p>
            )}
          </div>

          <button
            type="button"
            onClick={publishQuestions}
            disabled={isPublishing || validQuestions.length === 0}
            className="h-11 px-4 rounded-2xl bg-primary text-white font-black text-xs flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
          >
            <CloudUpload className="w-4 h-4" />
            {isPublishing ? 'جارٍ النشر...' : 'نشر للسحابة'}
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed top-4 left-4 right-4 z-[999] flex justify-center pointer-events-none">
          <div
            className={`max-w-md w-full rounded-2xl border p-3 shadow-elevated font-black text-xs pointer-events-auto ${
              toast.type === 'success'
                ? 'bg-success/10 border-success/20 text-success'
                : toast.type === 'danger'
                  ? 'bg-danger/10 border-danger/20 text-danger'
                  : 'bg-warning/10 border-warning/20 text-warning'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-4">
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-textSecondary mb-1">إجمالي الأسئلة</p>
            <p className="text-2xl font-black text-primary">{questions.length}</p>
          </div>
          <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-textSecondary mb-1">صالحة للنشر</p>
            <p className="text-2xl font-black text-success">{validQuestions.length}</p>
          </div>
          <div className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-textSecondary mb-1">نشطة</p>
            <p className="text-2xl font-black text-warning">
              {questions.filter(question => question.active).length}
            </p>
          </div>
        </section>

        <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-textPrimary flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              {editingId ? 'تعديل سؤال' : 'إضافة سؤال جديد'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-black text-danger"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-textSecondary block mb-1">المادة</label>
              <input
                list="subject-options"
                value={currentQuestion.subject}
                onChange={event => setField('subject', event.target.value)}
                placeholder="مثال: الدراسات الاجتماعية"
                className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
              />
              <datalist id="subject-options">
                {subjectOptions.map(subject => <option key={subject} value={subject} />)}
              </datalist>
            </div>

            <div>
              <label className="text-[10px] font-black text-textSecondary block mb-1">الفصل الدراسي</label>
              <select
                value={currentQuestion.semester || '1'}
                onChange={event => setField('semester', event.target.value as '1' | '2')}
                className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
              >
                <option value="1">الفصل الأول</option>
                <option value="2">الفصل الثاني</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-textSecondary block mb-2">الفصول المستهدفة</label>
            <div className="flex flex-wrap gap-2">
              {classOptions.length > 0 ? classOptions.map(className => (
                <button
                  key={className}
                  type="button"
                  onClick={() => toggleClass(className)}
                  className={`px-3 py-2 rounded-2xl border text-xs font-black ${
                    currentQuestion.classes.includes(className)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-bgSoft text-textSecondary border-borderColor'
                  }`}
                >
                  {className}
                </button>
              )) : (
                <input
                  value={currentQuestion.classes.join(',')}
                  onChange={event => setField('classes', event.target.value.split(',').map(item => item.trim()).filter(Boolean))}
                  placeholder="مثال: سادس/1, سادس/2"
                  className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-textSecondary block mb-1">الوحدة</label>
              <input
                value={currentQuestion.unit}
                onChange={event => setField('unit', event.target.value)}
                placeholder="مثال: الوحدة الثانية"
                className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-textSecondary block mb-1">الدرس</label>
              <input
                value={currentQuestion.lesson}
                onChange={event => setField('lesson', event.target.value)}
                placeholder="مثال: مجلس عمان"
                className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black text-textSecondary block mb-1">نوع السؤال</label>
              <select
                value={currentQuestion.questionType}
                onChange={event => handleQuestionTypeChange(event.target.value as GameQuestionType)}
                className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
              >
                {QUESTION_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-textSecondary block mb-1">الصعوبة</label>
              <select
                value={currentQuestion.difficulty}
                onChange={event => setField('difficulty', event.target.value as GameDifficulty)}
                className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
              >
                {DIFFICULTY_OPTIONS.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-textSecondary block mb-1">تظهر للطلاب من</label>
              <input
                type="date"
                value={currentQuestion.visibleFrom || ''}
                onChange={event => setField('visibleFrom', event.target.value)}
                className="w-full h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-textSecondary block mb-2">الألعاب التي تستخدم هذا السؤال</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {compatibleGames.map(game => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => toggleGame(game.id)}
                  className={`text-start rounded-2xl border p-3 ${
                    currentQuestion.gameTypes.includes(game.id)
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-bgSoft border-borderColor text-textSecondary'
                  }`}
                >
                  <p className="text-xs font-black">{game.label}</p>
                  <p className="text-[9px] font-bold opacity-80 mt-0.5">{game.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-textSecondary block mb-1">نص السؤال / التحدي</label>
            <textarea
              value={currentQuestion.question}
              onChange={event => setField('question', event.target.value)}
              placeholder="اكتب السؤال كما سيظهر للطالب داخل اللعبة"
              className="w-full min-h-[90px] rounded-2xl bg-bgSoft border border-borderColor p-3 text-sm font-bold outline-none focus:border-primary resize-none"
            />
          </div>

          {renderQuestionSpecificFields()}

          <div>
            <label className="text-[10px] font-black text-textSecondary block mb-1">تفسير الإجابة للطالب</label>
            <textarea
              value={currentQuestion.explanation}
              onChange={event => setField('explanation', event.target.value)}
              placeholder="اكتب تفسيرًا مختصرًا يظهر للطالب بعد الإجابة"
              className="w-full min-h-[80px] rounded-2xl bg-bgSoft border border-borderColor p-3 text-sm font-bold outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={currentQuestion.skill || ''}
              onChange={event => setField('skill', event.target.value)}
              placeholder="المهارة: تذكر / فهم / تطبيق"
              className="h-11 rounded-2xl bg-bgSoft border border-borderColor px-3 text-sm font-bold outline-none focus:border-primary"
            />

            <button
              type="button"
              onClick={() => setField('active', !currentQuestion.active)}
              className={`h-11 rounded-2xl border font-black text-xs flex items-center justify-center gap-2 ${
                currentQuestion.active
                  ? 'bg-success/10 border-success/20 text-success'
                  : 'bg-bgSoft border-borderColor text-textSecondary'
              }`}
            >
              {currentQuestion.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {currentQuestion.active ? 'مفعّل للطلاب' : 'غير مفعّل'}
            </button>

            <button
              type="button"
              onClick={addQuestion}
              className="h-11 rounded-2xl bg-primary text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'حفظ التعديل' : 'إضافة السؤال'}
            </button>
          </div>
        </section>

        <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-black text-textPrimary flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              الأسئلة المضافة
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewStudentPayload(prev => !prev)}
                className="h-9 px-3 rounded-xl bg-bgSoft border border-borderColor text-xs font-black text-textSecondary flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                معاينة payload
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="h-9 px-3 rounded-xl bg-bgSoft border border-borderColor text-xs font-black text-textSecondary flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                تصدير
              </button>
              <label className="h-9 px-3 rounded-xl bg-bgSoft border border-borderColor text-xs font-black text-textSecondary flex items-center gap-1 cursor-pointer">
                <Upload className="w-4 h-4" />
                استيراد
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) importJson(file);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-10 bg-bgSoft border border-borderColor rounded-3xl border-dashed">
              <HelpCircle className="w-10 h-10 text-textMuted mx-auto mb-3" />
              <p className="text-xs font-black text-textPrimary">لا توجد أسئلة بعد</p>
              <p className="text-[10px] font-bold text-textSecondary mt-1">ابدأ بإضافة سؤال من النموذج بالأعلى.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {questions.map(question => {
                const validation = validateQuestion(question);
                return (
                  <div key={question.id} className="bg-bgSoft border border-borderColor rounded-2xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {question.subject || 'مادة غير محددة'}
                          </span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-bgCard border border-borderColor text-textSecondary">
                            {question.lesson || 'درس غير محدد'}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${validation.ok ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                            {validation.ok ? 'جاهز' : 'ناقص'}
                          </span>
                          {!question.active && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">
                              غير مفعّل
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-black text-textPrimary line-clamp-2">
                          {question.question || 'سؤال بدون نص'}
                        </p>
                        {!validation.ok && validation.message && (
                          <p className="text-[10px] font-bold text-warning mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {validation.message}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => toggleQuestionActive(question.id)} className="w-9 h-9 rounded-xl bg-bgCard border border-borderColor flex items-center justify-center text-textSecondary">
                          {question.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button type="button" onClick={() => editQuestion(question)} className="w-9 h-9 rounded-xl bg-bgCard border border-borderColor flex items-center justify-center text-primary">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => duplicateQuestion(question)} className="w-9 h-9 rounded-xl bg-bgCard border border-borderColor flex items-center justify-center text-info">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => deleteQuestion(question.id)} className="w-9 h-9 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {previewStudentPayload && (
          <section className="bg-slate-950 text-slate-100 rounded-3xl p-4 overflow-auto text-left" dir="ltr">
            <pre className="text-[11px] leading-5 whitespace-pre-wrap">
              {JSON.stringify(studentPreview, null, 2)}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
};

export default TeacherGameQuestionsManager;
