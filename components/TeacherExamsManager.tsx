import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FilePlus2,
  GraduationCap,
  Gamepad2,
  Library,
  ListChecks,
  Plus,
  Save,
  Search,
  Send,
  Upload,
  Users,
  X,
} from "lucide-react";

export type ExamType = "short_exam_1" | "short_exam_2" | "final_exam";
export type ExamStatus = "draft" | "scheduled" | "published" | "closed" | "archived";
export type QuestionType = "multiple_choice" | "true_false" | "match" | "sequence";
export type Difficulty = "easy" | "medium" | "hard";
export type GradingMode = "whole_question" | "per_item";

export interface TeacherExamBankQuestion {
  id: string;
  question: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswerText?: string;
  correctOrderedItems?: string[];
  correctMatchedPairs?: Record<string, string>;
  explanation?: string;
  subject?: string;
  unit?: string;
  lesson?: string;
  difficulty?: Difficulty;
  defaultGrade?: number;
  createdAt: string;
  updatedAt?: string;
  sourceBatchId?: string;
  sourceGameType?: string;
  usedInExamIds: string[];
  archived?: boolean;
}

export interface PublishedExamQuestion {
  id: string;
  sourceQuestionId: string;
  question: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswerText?: string;
  correctOrderedItems?: string[];
  correctMatchedPairs?: Record<string, string>;
  explanation?: string;
  subject?: string;
  unit?: string;
  lesson?: string;
  difficulty?: Difficulty;
  grade: number;
  gradingMode: GradingMode;
  itemGrade?: number;
  order: number;
}

export interface RasedExam {
  id: string;
  title: string;
  examType: ExamType;
  status: ExamStatus;
  questionIds: string[];
  questionCount: number;
  maximumGrade: number;
  schoolCode: string;
  teacherId: string;
  classIds: string[];
  subject?: string;
  units?: string[];
  lessons?: string[];
  instructions?: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowPreviousQuestion: boolean;
  showResultImmediately: boolean;
  durationMinutes?: number;
  maxAttempts: number;
  visibleFrom: string;
  visibleUntil?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishBatchId?: string;
  questionsSnapshot: PublishedExamQuestion[];
}

const QUESTION_BANK_KEY = "rased_teacher_exam_question_bank_v1";
const EXAMS_KEY = "rased_teacher_exams_v1";

const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  short_exam_1: "الاختبار القصير الأول",
  short_exam_2: "الاختبار القصير الثاني",
  final_exam: "الاختبار النهائي",
};

const STATUS_LABELS: Record<ExamStatus, string> = {
  draft: "مسودة",
  scheduled: "مجدول",
  published: "منشور",
  closed: "مغلق",
  archived: "مؤرشف",
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => loadLocal(key, initialValue));
  useEffect(() => window.localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;
}

const GAME_QUESTION_KEY_PREFIXES = [
  "rased_teacher_game_questions_",
  "rased_teacher_game_questions_active_",
  "rased_teacher_game_questions_archive_",
] as const;

const GAME_QUESTION_FIXED_KEYS = [
  "rased_teacher_published_game_questions",
  "rased_game_questions",
] as const;

function asTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
  } catch {
    // ليست JSON، نجرب القائمة المفصولة بفواصل.
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function readQuestionArrayFromStorage(key: string): any[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.questions)) return parsed.questions;
    return [];
  } catch {
    return [];
  }
}

function getAllGameQuestionStorageKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys = new Set<string>(GAME_QUESTION_FIXED_KEYS);
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    if (GAME_QUESTION_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.add(key);
  }
  return Array.from(keys);
}

function convertGameQuestionToExamBank(raw: any): TeacherExamBankQuestion | null {
  const text = String(raw?.question ?? "").trim();
  const sourceId = String(raw?.id ?? "").trim();
  if (!text || !sourceId || raw?.questionType === "hints") return null;

  const sourceType = String(raw?.questionType ?? "multiple_choice");
  const questionType: QuestionType = sourceType === "matching"
    ? "match"
    : sourceType === "sequence"
      ? "sequence"
      : sourceType === "true_false"
        ? "true_false"
        : "multiple_choice";

  const pairs = Array.isArray(raw?.pairs) ? raw.pairs : [];
  const correctMatchedPairs = pairs.reduce((result: Record<string, string>, pair: any) => {
    const left = String(pair?.left ?? pair?.term ?? "").trim();
    const right = String(pair?.right ?? pair?.definition ?? "").trim();
    if (left && right) result[left] = right;
    return result;
  }, {});

  const options = questionType === "true_false" ? ["صح", "خطأ"] : asTextArray(raw?.options);
  const correctIndex = Number(raw?.correctAnswerIndex);

  return {
    id: sourceId,
    question: text,
    questionType,
    options: questionType === "multiple_choice" || questionType === "true_false" ? options : undefined,
    correctAnswerIndex: Number.isFinite(correctIndex) ? correctIndex : undefined,
    correctAnswerText: String(raw?.correctAnswerText ?? "").trim() || undefined,
    correctOrderedItems: questionType === "sequence" ? asTextArray(raw?.sequence) : undefined,
    correctMatchedPairs: questionType === "match" && Object.keys(correctMatchedPairs).length > 0 ? correctMatchedPairs : undefined,
    explanation: String(raw?.explanation ?? "").trim() || undefined,
    subject: String(raw?.subject ?? "").trim() || undefined,
    unit: String(raw?.unit ?? "").trim() || undefined,
    lesson: String(raw?.lesson ?? "").trim() || undefined,
    difficulty: raw?.difficulty === "hard" || raw?.difficulty === "medium" ? raw.difficulty : "easy",
    defaultGrade: 1,
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw?.updatedAt ?? "").trim() || undefined,
    sourceBatchId: String(raw?.publishBatchId ?? "").trim() || undefined,
    sourceGameType: asTextArray(raw?.gameTypes).join(",") || "educational_games",
    usedInExamIds: [],
    archived: false,
  };
}

function collectGameQuestionsForExamBank(): TeacherExamBankQuestion[] {
  if (typeof window === "undefined") return [];
  const byId = new Map<string, TeacherExamBankQuestion>();
  getAllGameQuestionStorageKeys().forEach((key) => {
    readQuestionArrayFromStorage(key).forEach((raw) => {
      const converted = convertGameQuestionToExamBank(raw);
      if (!converted) return;
      const previous = byId.get(converted.id);
      if (!previous || new Date(converted.updatedAt ?? converted.createdAt).getTime() >= new Date(previous.updatedAt ?? previous.createdAt).getTime()) {
        byId.set(converted.id, converted);
      }
    });
  });
  return Array.from(byId.values());
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "blue" | "green" | "amber" | "red" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

export default function TeacherExamsManager() {
  const [questions, setQuestions] = useLocalStorageState<TeacherExamBankQuestion[]>(QUESTION_BANK_KEY, []);
  const [exams, setExams] = useLocalStorageState<RasedExam[]>(EXAMS_KEY, []);

  const syncGameQuestionsIntoBank = () => {
    const imported = collectGameQuestionsForExamBank();
    setQuestions((current) => {
      const map = new Map(current.map((question) => [question.id, question]));
      imported.forEach((question) => {
        const existing = map.get(question.id);
        map.set(question.id, existing
          ? {
              ...question,
              defaultGrade: existing.defaultGrade ?? question.defaultGrade,
              usedInExamIds: existing.usedInExamIds ?? [],
              archived: existing.archived ?? false,
            }
          : question);
      });
      return Array.from(map.values());
    });
  };

  useEffect(() => {
    syncGameQuestionsIntoBank();
    const handleStorage = (event: StorageEvent) => {
      if (event.key && (GAME_QUESTION_FIXED_KEYS.includes(event.key as any) || GAME_QUESTION_KEY_PREFIXES.some((prefix) => event.key!.startsWith(prefix)))) {
        syncGameQuestionsIntoBank();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
  const [section, setSection] = useState<"bank" | "create" | "exams" | "results">("bank");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<"all" | Difficulty>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    questionType: "multiple_choice" as QuestionType,
    option1: "",
    option2: "",
    subject: "",
    unit: "",
    lesson: "",
    difficulty: "medium" as Difficulty,
    defaultGrade: 1,
  });
  const [draft, setDraft] = useState({
    title: "",
    examType: "short_exam_1" as ExamType,
    subject: "",
    classIds: "",
    units: "",
    lessons: "",
    instructions: "اقرأ كل سؤال بعناية قبل اختيار الإجابة.",
    visibleFrom: new Date().toISOString().slice(0, 16),
    visibleUntil: "",
    maxAttempts: 1,
    durationMinutes: 20,
    allowPreviousQuestion: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultImmediately: false,
  });

  const filteredQuestions = useMemo(() => questions.filter((q) => {
    const text = `${q.question} ${q.subject ?? ""} ${q.unit ?? ""} ${q.lesson ?? ""}`.toLowerCase();
    return !q.archived && text.includes(search.toLowerCase()) && (difficulty === "all" || q.difficulty === difficulty);
  }), [questions, search, difficulty]);

  const selectedQuestions = selectedIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean) as TeacherExamBankQuestion[];

  const maximumGrade = selectedQuestions.reduce(
    (sum, q) => sum + (grades[q.id] ?? q.defaultGrade ?? 1),
    0,
  );

  function addQuestion() {
    if (!newQuestion.question.trim()) return;
    if (["multiple_choice", "true_false"].includes(newQuestion.questionType) && (!newQuestion.option1.trim() || !newQuestion.option2.trim())) return;

    const question: TeacherExamBankQuestion = {
      id: uid("question"),
      question: newQuestion.question.trim(),
      questionType: newQuestion.questionType,
      options: newQuestion.questionType === "true_false"
        ? ["صح", "خطأ"]
        : [newQuestion.option1.trim(), newQuestion.option2.trim()],
      correctAnswerIndex: 0,
      subject: newQuestion.subject.trim() || undefined,
      unit: newQuestion.unit.trim() || undefined,
      lesson: newQuestion.lesson.trim() || undefined,
      difficulty: newQuestion.difficulty,
      defaultGrade: Math.max(0.25, newQuestion.defaultGrade),
      createdAt: nowIso(),
      usedInExamIds: [],
    };

    setQuestions((current) => [...current, question]);
    setNewQuestion({ question: "", questionType: "multiple_choice", option1: "", option2: "", subject: "", unit: "", lesson: "", difficulty: "medium", defaultGrade: 1 });
    setShowQuestionForm(false);
  }

  function saveExam(status: ExamStatus) {
    if (!draft.title.trim() || selectedQuestions.length === 0) return;
    const id = uid("exam");
    const questionsSnapshot: PublishedExamQuestion[] = selectedQuestions.map((q, index) => ({
      id: `${id}_${q.id}`,
      sourceQuestionId: q.id,
      question: q.question,
      questionType: q.questionType,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      correctAnswerText: q.correctAnswerText,
      correctOrderedItems: q.correctOrderedItems,
      correctMatchedPairs: q.correctMatchedPairs,
      explanation: q.explanation,
      subject: q.subject,
      unit: q.unit,
      lesson: q.lesson,
      difficulty: q.difficulty,
      grade: grades[q.id] ?? q.defaultGrade ?? 1,
      gradingMode: "whole_question",
      order: index,
    }));

    const exam: RasedExam = {
      id,
      title: draft.title.trim(),
      examType: draft.examType,
      status,
      questionIds: selectedQuestions.map((q) => q.id),
      questionCount: selectedQuestions.length,
      maximumGrade,
      schoolCode: "RSD_LOCAL",
      teacherId: "teacher_local",
      classIds: draft.classIds.split(",").map((v) => v.trim()).filter(Boolean),
      subject: draft.subject.trim() || undefined,
      units: draft.units.split(",").map((v) => v.trim()).filter(Boolean),
      lessons: draft.lessons.split(",").map((v) => v.trim()).filter(Boolean),
      instructions: draft.instructions.trim() || undefined,
      shuffleQuestions: draft.shuffleQuestions,
      shuffleOptions: draft.shuffleOptions,
      allowPreviousQuestion: draft.allowPreviousQuestion,
      showResultImmediately: draft.showResultImmediately,
      durationMinutes: draft.durationMinutes > 0 ? draft.durationMinutes : undefined,
      maxAttempts: Math.max(1, draft.maxAttempts),
      visibleFrom: new Date(draft.visibleFrom).toISOString(),
      visibleUntil: draft.visibleUntil ? new Date(draft.visibleUntil).toISOString() : undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      publishedAt: status === "published" ? nowIso() : undefined,
      publishBatchId: status === "published" ? uid("publish") : undefined,
      questionsSnapshot,
    };

    setExams((current) => [...current, exam]);
    setQuestions((current) => current.map((q) => selectedIds.includes(q.id)
      ? { ...q, usedInExamIds: Array.from(new Set([...q.usedInExamIds, id])) }
      : q));
    setSelectedIds([]);
    setGrades({});
    setDraft((current) => ({ ...current, title: "" }));
    setSection("exams");
  }

  function exportQuestionBank() {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rased-question-bank-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importQuestionBank(file?: File) {
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text()) as TeacherExamBankQuestion[];
      if (!Array.isArray(imported)) return;
      setQuestions((current) => {
        const map = new Map(current.map((q) => [q.id, q]));
        imported.forEach((q) => q?.id && q?.question && map.set(q.id, { ...q, usedInExamIds: q.usedInExamIds ?? [] }));
        return Array.from(map.values());
      });
    } catch {
      window.alert("تعذر استيراد الملف. تأكد من أنه JSON صالح لبنك أسئلة راصد.");
    }
  }

  const nav = [
    { id: "bank" as const, label: "بنك الأسئلة", icon: Library },
    { id: "create" as const, label: "إنشاء اختبار", icon: FilePlus2 },
    { id: "exams" as const, label: "إدارة الاختبارات", icon: ClipboardCheck },
    { id: "results" as const, label: "النتائج", icon: Users },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-4 py-5 sm:px-7">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-blue-700"><GraduationCap className="h-4 w-4" /> راصد المعلم</div>
            <h1 className="mt-1 text-2xl font-black">الاختبارات</h1>
            <p className="mt-1 text-sm text-slate-500">نظام تقييم رسمي مستقل يعتمد الدرجات التي يحددها المعلم.</p>
          </div>
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{questions.length} سؤالًا في بنك الفصل</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-7">
        <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)} className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${section === id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-600"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>

        {section === "bank" && (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1"><Search className="absolute right-3 top-3 h-5 w-5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في السؤال أو المادة أو الوحدة أو الدرس" className="w-full rounded-2xl border py-3 pr-11 pl-4 outline-none focus:border-blue-400" /></div>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as "all" | Difficulty)} className="rounded-2xl border bg-white px-4 py-3 font-bold"><option value="all">كل المستويات</option><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option></select>
                <button onClick={() => setShowQuestionForm(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white"><Plus className="h-5 w-5" /> إضافة سؤال</button>
                <button onClick={syncGameQuestionsIntoBank} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700"><Gamepad2 className="h-4 w-4" /> مزامنة أسئلة الألعاب</button>
                <button onClick={exportQuestionBank} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-bold"><Download className="h-4 w-4" /> تصدير</button>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-bold"><Upload className="h-4 w-4" /> استيراد<input type="file" accept="application/json" className="hidden" onChange={(e) => importQuestionBank(e.target.files?.[0])} /></label>
              </div>
            </section>

            {showQuestionForm && (
              <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between"><h2 className="font-black">سؤال جديد</h2><button onClick={() => setShowQuestionForm(false)}><X className="h-5 w-5" /></button></div>
                <div className="grid gap-3 md:grid-cols-2">
                  <textarea value={newQuestion.question} onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })} placeholder="نص السؤال" className="min-h-24 rounded-2xl border p-3 md:col-span-2" />
                  <select value={newQuestion.questionType} onChange={(e) => setNewQuestion({ ...newQuestion, questionType: e.target.value as QuestionType })} className="rounded-2xl border bg-white p-3"><option value="multiple_choice">اختيار من متعدد</option><option value="true_false">صح أو خطأ</option></select>
                  <select value={newQuestion.difficulty} onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value as Difficulty })} className="rounded-2xl border bg-white p-3"><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option></select>
                  {newQuestion.questionType === "multiple_choice" && <><input value={newQuestion.option1} onChange={(e) => setNewQuestion({ ...newQuestion, option1: e.target.value })} placeholder="الإجابة الصحيحة" className="rounded-2xl border p-3" /><input value={newQuestion.option2} onChange={(e) => setNewQuestion({ ...newQuestion, option2: e.target.value })} placeholder="الإجابة البديلة" className="rounded-2xl border p-3" /></>}
                  <input value={newQuestion.subject} onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })} placeholder="المادة" className="rounded-2xl border p-3" />
                  <input value={newQuestion.unit} onChange={(e) => setNewQuestion({ ...newQuestion, unit: e.target.value })} placeholder="الوحدة" className="rounded-2xl border p-3" />
                  <input value={newQuestion.lesson} onChange={(e) => setNewQuestion({ ...newQuestion, lesson: e.target.value })} placeholder="الدرس" className="rounded-2xl border p-3" />
                  <label className="flex items-center gap-3 rounded-2xl border px-3"><span className="text-sm font-bold">الدرجة الافتراضية</span><input type="number" min="0.25" step="0.25" value={newQuestion.defaultGrade} onChange={(e) => setNewQuestion({ ...newQuestion, defaultGrade: Number(e.target.value) })} className="w-24 p-3 outline-none" /></label>
                </div>
                <button onClick={addQuestion} className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white"><Save className="h-4 w-4" /> حفظ في البنك</button>
              </section>
            )}

            <div className="grid gap-3">
              {filteredQuestions.map((q) => {
                const selected = selectedIds.includes(q.id);
                return (
                  <button key={q.id} onClick={() => setSelectedIds((current) => selected ? current.filter((id) => id !== q.id) : [...current, q.id])} className={`rounded-3xl border p-5 text-right ${selected ? "border-blue-400 bg-blue-50" : "border-transparent bg-white"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>{selected && <CheckCircle2 className="h-4 w-4" />}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{q.subject ?? "غير مصنف"}</Badge><Badge>{q.questionType === "multiple_choice" ? "اختيار من متعدد" : "صح أو خطأ"}</Badge>{q.difficulty && <Badge tone={q.difficulty === "easy" ? "green" : q.difficulty === "hard" ? "red" : "amber"}>{DIFFICULTY_LABELS[q.difficulty]}</Badge>}</div>
                        <h3 className="mt-3 font-black leading-7">{q.question}</h3>
                        <p className="mt-2 text-xs text-slate-500">الدرجة الافتراضية: {q.defaultGrade ?? 1} · استُخدم في {q.usedInExamIds.length} اختبار</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {section === "create" && (
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-black">1. بيانات الاختبار</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="عنوان الاختبار" className="rounded-2xl border p-3 md:col-span-2" />
                  <select value={draft.examType} onChange={(e) => setDraft({ ...draft, examType: e.target.value as ExamType })} className="rounded-2xl border bg-white p-3"><option value="short_exam_1">الاختبار القصير الأول</option><option value="short_exam_2">الاختبار القصير الثاني</option><option value="final_exam">الاختبار النهائي</option></select>
                  <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="المادة" className="rounded-2xl border p-3" />
                  <input value={draft.classIds} onChange={(e) => setDraft({ ...draft, classIds: e.target.value })} placeholder="الفصول، مفصولة بفاصلة" className="rounded-2xl border p-3" />
                  <input value={draft.units} onChange={(e) => setDraft({ ...draft, units: e.target.value })} placeholder="الوحدات" className="rounded-2xl border p-3" />
                  <input value={draft.lessons} onChange={(e) => setDraft({ ...draft, lessons: e.target.value })} placeholder="الدروس" className="rounded-2xl border p-3" />
                  <label className="rounded-2xl border px-3 py-2 text-xs font-bold text-slate-500">عدد المحاولات<input type="number" min="1" value={draft.maxAttempts} onChange={(e) => setDraft({ ...draft, maxAttempts: Number(e.target.value) })} className="block w-full pt-1 text-base text-slate-900 outline-none" /></label>
                  <label className="rounded-2xl border px-3 py-2 text-xs font-bold text-slate-500">المدة بالدقائق<input type="number" min="0" value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })} className="block w-full pt-1 text-base text-slate-900 outline-none" /></label>
                  <label className="rounded-2xl border px-3 py-2 text-xs font-bold text-slate-500">وقت الظهور<input type="datetime-local" value={draft.visibleFrom} onChange={(e) => setDraft({ ...draft, visibleFrom: e.target.value })} className="block w-full pt-1 text-base text-slate-900 outline-none" /></label>
                  <label className="rounded-2xl border px-3 py-2 text-xs font-bold text-slate-500">وقت الإغلاق<input type="datetime-local" value={draft.visibleUntil} onChange={(e) => setDraft({ ...draft, visibleUntil: e.target.value })} className="block w-full pt-1 text-base text-slate-900 outline-none" /></label>
                  <textarea value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} placeholder="تعليمات المعلم" className="min-h-24 rounded-2xl border p-3 md:col-span-2" />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    ["allowPreviousQuestion", "السماح بالعودة للسؤال السابق"],
                    ["shuffleQuestions", "خلط ترتيب الأسئلة"],
                    ["shuffleOptions", "خلط خيارات الإجابة"],
                    ["showResultImmediately", "إظهار النتيجة مباشرة"],
                  ].map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" checked={Boolean(draft[key as keyof typeof draft])} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} className="h-5 w-5 accent-blue-600" />{label}</label>)}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black">2. الأسئلة ودرجاتها</h2><button onClick={() => setSection("bank")} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">اختيار من البنك</button></div>
                {selectedQuestions.length === 0 ? <div className="rounded-3xl border border-dashed p-8 text-center text-slate-500"><ListChecks className="mx-auto mb-3 h-8 w-8" />لم تختر أسئلة بعد.</div> : <div className="space-y-3">{selectedQuestions.map((q, index) => <div key={q.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"><div className="flex-1"><span className="text-xs font-black text-blue-600">السؤال {index + 1}</span><p className="mt-1 font-bold">{q.question}</p></div><label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3"><span className="text-sm font-black">الدرجة</span><input type="number" min="0.25" step="0.25" value={grades[q.id] ?? q.defaultGrade ?? 1} onChange={(e) => setGrades({ ...grades, [q.id]: Math.max(0.25, Number(e.target.value)) })} className="w-20 bg-transparent py-3 text-center font-black outline-none" /></label><button onClick={() => setSelectedIds((ids) => ids.filter((id) => id !== q.id))} className="rounded-xl p-3 text-red-600"><X className="h-5 w-5" /></button></div>)}</div>}
              </section>
            </div>

            <aside className="h-fit rounded-3xl bg-slate-900 p-5 text-white lg:sticky lg:top-5">
              <h2 className="text-lg font-black">معاينة سريعة</h2>
              <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-400">العنوان</span><strong>{draft.title || "غير محدد"}</strong></div><div className="flex justify-between"><span className="text-slate-400">النوع</span><strong>{EXAM_TYPE_LABELS[draft.examType]}</strong></div><div className="flex justify-between"><span className="text-slate-400">الأسئلة</span><strong>{selectedQuestions.length}</strong></div><div className="flex justify-between border-t border-slate-700 pt-3"><span className="text-slate-300">الدرجة النهائية</span><strong className="text-xl text-emerald-400">{maximumGrade}</strong></div></div>
              <div className="mt-6 grid gap-2"><button onClick={() => saveExam("draft")} disabled={!draft.title || !selectedQuestions.length} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-slate-900 disabled:opacity-40"><Save className="h-4 w-4" /> حفظ كمسودة</button><button onClick={() => saveExam("published")} disabled={!draft.title || !selectedQuestions.length} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-black disabled:opacity-40"><Send className="h-4 w-4" /> نشر الآن</button><button onClick={() => saveExam("scheduled")} disabled={!draft.title || !selectedQuestions.length} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-700 px-4 py-3 font-black disabled:opacity-40"><CalendarClock className="h-4 w-4" /> جدولة</button></div>
            </aside>
          </div>
        )}

        {section === "exams" && <div className="space-y-3">{exams.length === 0 ? <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500">لا توجد اختبارات بعد.</div> : exams.map((exam) => <article key={exam.id} className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex gap-2"><Badge tone={exam.status === "published" ? "green" : exam.status === "scheduled" ? "amber" : "slate"}>{STATUS_LABELS[exam.status]}</Badge><Badge tone="blue">{EXAM_TYPE_LABELS[exam.examType]}</Badge></div><h3 className="mt-3 text-lg font-black">{exam.title}</h3><p className="mt-1 text-sm text-slate-500">{exam.questionCount} سؤال · الدرجة النهائية {exam.maximumGrade} · {exam.classIds.join("، ")}</p></div><div className="flex gap-2">{exam.status === "draft" && <button onClick={() => setExams((items) => items.map((item) => item.id === exam.id ? { ...item, status: "published", publishedAt: nowIso(), updatedAt: nowIso() } : item))} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">نشر</button>}<button onClick={() => setExams((items) => items.map((item) => item.id === exam.id ? { ...item, status: "archived", updatedAt: nowIso() } : item))} className="rounded-2xl bg-slate-100 p-3"><Archive className="h-5 w-5" /></button></div></div></article>)}</div>}

        {section === "results" && <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500"><Users className="mx-auto mb-3 h-9 w-9" /><h2 className="font-black text-slate-800">نتائج الاختبارات</h2><p className="mt-2">هذا القسم جاهز لاستقبال نتائج الطلاب وربط لوحة المؤشرات في المرحلة التالية.</p></div>}
      </main>
    </div>
  );
}
