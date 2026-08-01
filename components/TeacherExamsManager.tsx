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

export type ExamType = string;
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
const EXAMS_CLOUD_URL = "https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec";

const LEGACY_EXAM_TYPE_LABELS: Record<string, string> = {
  short_exam_1: "الاختبار القصير الأول",
  short_exam_2: "الاختبار القصير الثاني",
  final_exam: "الاختبار النهائي",
};
const getExamTypeLabel = (type?: string) => LEGACY_EXAM_TYPE_LABELS[String(type || "")] || String(type || "اختبار");

interface TeacherExamsManagerProps {
  classOptions?: unknown[];
  students?: unknown[];
}

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

function normalizeClassLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (!value || typeof value !== "object") return "";
  const item = value as Record<string, unknown>;
  return String(item.name ?? item.className ?? item.class ?? item.label ?? item.value ?? item.id ?? "").trim();
}

function collectTeacherClasses(classOptions: unknown[], students: unknown[]): string[] {
  const classes = new Set<string>();
  classOptions.forEach((item) => {
    const label = normalizeClassLabel(item);
    if (label) classes.add(label);
  });
  students.forEach((raw) => {
    const student = (raw || {}) as Record<string, unknown>;
    const studentClasses = Array.isArray(student.classes)
      ? student.classes
      : [student.className ?? student.class];
    studentClasses.forEach((item) => {
      const label = normalizeClassLabel(item);
      if (label) classes.add(label);
    });
  });
  if (typeof window !== "undefined") {
    getAllGameQuestionStorageKeys().forEach((key) => {
      readQuestionArrayFromStorage(key).forEach((question) => {
        const questionClasses = Array.isArray(question?.classes)
          ? question.classes
          : [question?.className ?? question?.class];
        questionClasses.forEach((item: unknown) => {
          const label = normalizeClassLabel(item);
          if (label) classes.add(label);
        });
      });
    });
    ["rased_teacher_classes", "rased_classes", "classes"].forEach((key) => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(key) || "[]");
        if (Array.isArray(stored)) stored.forEach((item) => {
          const label = normalizeClassLabel(item);
          if (label) classes.add(label);
        });
      } catch {
        // نتجاوز المفاتيح غير الصالحة.
      }
    });
  }
  return Array.from(classes).sort((a, b) => a.localeCompare(b, "ar"));
}

function escapeWordHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
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

export default function TeacherExamsManager({ classOptions = [], students = [] }: TeacherExamsManagerProps) {
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
  const [isPublishingExam, setIsPublishingExam] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [isLoadingExamResults, setIsLoadingExamResults] = useState(false);
  const [resultClassFilter, setResultClassFilter] = useState("all");
  const [resultExamTypeFilter, setResultExamTypeFilter] = useState("all");
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
    examType: "" as ExamType,
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

  const teacherClasses = useMemo(
    () => collectTeacherClasses(classOptions, students),
    [classOptions, students, questions.length],
  );

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
  const availableResultClasses = Array.from(new Set([
    ...teacherClasses,
    ...examResults.map((result) => String(result.className || "").trim()).filter(Boolean),
  ]));
  const availableResultExamTypes = Array.from(new Set([
    ...exams.map((exam) => String(exam.examType || "").trim()).filter(Boolean),
    ...examResults.map((result) => String(result.examType || "").trim()).filter(Boolean),
  ]));
  const filteredExamResults = examResults.filter((result) =>
    (resultClassFilter === "all" || String(result.className || "") === resultClassFilter) &&
    (resultExamTypeFilter === "all" || String(result.examType || "") === resultExamTypeFilter)
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

  const getCloudIdentity = () => ({
    schoolCode: localStorage.getItem("rased_admin_school_code") || "RSD_LOCAL",
    teacherId: localStorage.getItem("rased_teacher_civil_id") || "teacher_local",
  });

  async function publishExamToCloud(exam: RasedExam) {
    const identity = getCloudIdentity();
    const cloudExam = { ...exam, schoolCode: identity.schoolCode, teacherId: identity.teacherId };
    const response = await fetch(EXAMS_CLOUD_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "publishExam",
        schoolCode: identity.schoolCode,
        teacherId: identity.teacherId,
        exam: cloudExam,
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload?.success === false) throw new Error(payload?.error || "فشل إرسال الاختبار إلى السحابة.");
    return cloudExam as RasedExam;
  }

  async function fetchExamResults() {
    const identity = getCloudIdentity();
    setIsLoadingExamResults(true);
    try {
      const response = await fetch(EXAMS_CLOUD_URL, {
        method: "POST",
        body: JSON.stringify({ action: "getExamResults", ...identity }),
      });
      const payload = await response.json();
      if (payload?.success === false) throw new Error(payload?.error || "فشل جلب النتائج.");
      setExamResults(Array.isArray(payload?.data) ? payload.data : []);
      setCloudMessage("تم تحديث نتائج الاختبارات من السحابة.");
    } catch (error) {
      console.error(error);
      setCloudMessage("تعذر جلب نتائج الاختبارات من السحابة.");
    } finally {
      setIsLoadingExamResults(false);
    }
  }

  async function publishExistingExam(exam: RasedExam) {
    setIsPublishingExam(true);
    setCloudMessage(null);
    try {
      const publishedExam = await publishExamToCloud({ ...exam, status: "published", publishedAt: exam.publishedAt || nowIso(), updatedAt: nowIso() });
      setExams((current) => current.map((item) => item.id === exam.id ? publishedExam : item));
      setCloudMessage("تم نشر الاختبار وإرساله إلى طلاب الفصول المستهدفة.");
    } catch (error) {
      console.error(error);
      setCloudMessage(error instanceof Error ? error.message : "فشل نشر الاختبار.");
    } finally {
      setIsPublishingExam(false);
    }
  }

  async function saveExam(status: ExamStatus) {
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
      schoolCode: getCloudIdentity().schoolCode,
      teacherId: getCloudIdentity().teacherId,
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

    let savedExam = exam;
    if (status === "published") {
      setIsPublishingExam(true);
      setCloudMessage(null);
      try {
        savedExam = await publishExamToCloud(exam);
        setCloudMessage("تم نشر الاختبار وإرساله إلى طلاب الفصول المستهدفة.");
      } catch (error) {
        console.error(error);
        setCloudMessage("حُفظ الاختبار محليًا، لكن تعذر إرساله إلى السحابة. يمكنك إعادة النشر من إدارة الاختبارات.");
      } finally {
        setIsPublishingExam(false);
      }
    }
    setExams((current) => [...current, savedExam]);
    setQuestions((current) => current.map((q) => selectedIds.includes(q.id)
      ? { ...q, usedInExamIds: Array.from(new Set([...q.usedInExamIds, id])) }
      : q));
    setSelectedIds([]);
    setGrades({});
    setDraft((current) => ({ ...current, title: "" }));
    setSection("exams");
  }

  async function saveOrShareExport(fileName: string, mimeType: string, content: string) {
    const blob = new Blob([content], { type: mimeType });
    const capacitor = (window as any).Capacitor;
    const filesystem = capacitor?.Plugins?.Filesystem;
    const sharePlugin = capacitor?.Plugins?.Share;

    if (capacitor?.isNativePlatform?.() && filesystem) {
      const bytes = new TextEncoder().encode(content);
      const written = await filesystem.writeFile({
        path: fileName,
        data: bytesToBase64(bytes),
        directory: "CACHE",
        recursive: true,
      });
      if (sharePlugin) {
        await sharePlugin.share({
          title: "تصدير بنك أسئلة راصد",
          text: fileName,
          url: written.uri,
          dialogTitle: "حفظ أو مشاركة الملف",
        });
        return;
      }
    }

    const file = new File([blob], fileName, { type: mimeType });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      await nav.share({ title: "بنك أسئلة راصد", files: [file] });
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  async function exportQuestionBankJson() {
    try {
      await saveOrShareExport(
        `rased-question-bank-${new Date().toISOString().slice(0, 10)}.json`,
        "application/json;charset=utf-8",
        JSON.stringify(questions, null, 2),
      );
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        console.error("Failed to export question bank", error);
        window.alert("تعذر تصدير بنك الأسئلة. تأكد من تثبيت إضافتي Capacitor Filesystem وShare في نسخة أندرويد.");
      }
    }
  }

  async function exportQuestionBankWord() {
    try {
      const questionSections = questions.map((question, index) => {
        const options = (question.options || []).map((option, optionIndex) => {
          const isCorrect = optionIndex === question.correctAnswerIndex;
          return `<li${isCorrect ? ' style="font-weight:bold;color:#047857"' : ''}>${escapeWordHtml(option)}${isCorrect ? " ✓" : ""}</li>`;
        }).join("");
        return `<section style="margin-bottom:20px;page-break-inside:avoid">
          <h3>${index + 1}. ${escapeWordHtml(question.question)}</h3>
          <p><b>المادة:</b> ${escapeWordHtml(question.subject || "غير مصنف")} | <b>الوحدة:</b> ${escapeWordHtml(question.unit || "")} | <b>الدرس:</b> ${escapeWordHtml(question.lesson || "")}</p>
          ${options ? `<ol>${options}</ol>` : ""}
          ${question.correctAnswerText ? `<p><b>الإجابة الصحيحة:</b> ${escapeWordHtml(question.correctAnswerText)}</p>` : ""}
          ${question.explanation ? `<p><b>التفسير:</b> ${escapeWordHtml(question.explanation)}</p>` : ""}
          <p><b>الدرجة الافتراضية:</b> ${question.defaultGrade ?? 1}</p>
        </section>`;
      }).join("");
      const wordHtml = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>بنك أسئلة راصد</title><style>body{font-family:Arial,sans-serif;direction:rtl;line-height:1.7;margin:36px}h1{color:#1d4ed8}h3{color:#0f172a}section{border-bottom:1px solid #cbd5e1;padding-bottom:12px}li{margin:5px 0}</style></head><body><h1>بنك أسئلة راصد</h1><p>عدد الأسئلة: ${questions.length}</p>${questionSections}</body></html>`;
      await saveOrShareExport(
        `rased-question-bank-${new Date().toISOString().slice(0, 10)}.doc`,
        "application/msword;charset=utf-8",
        wordHtml,
      );
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        console.error("Failed to export Word question bank", error);
        window.alert("تعذر تصدير بنك الأسئلة بصيغة Word على هذا الجهاز.");
      }
    }
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
        {cloudMessage && <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-black text-blue-800">{cloudMessage}</div>}
        <div className="mb-6 sm:hidden">
          <label className="mb-2 block text-xs font-black text-slate-500">قسم الاختبارات</label>
          <select value={section} onChange={(event) => setSection(event.target.value as typeof section)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-800 shadow-sm">
            {nav.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <nav className="mb-6 hidden gap-2 sm:flex sm:flex-wrap">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${section === id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-600"}`}>
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
                <button onClick={() => void exportQuestionBankJson()} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-bold"><Download className="h-4 w-4" /> تصدير JSON</button>
                <button onClick={() => void exportQuestionBankWord()} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 font-bold text-blue-700"><FilePlus2 className="h-4 w-4" /> تصدير Word</button>
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
                  <input value={draft.examType} onChange={(e) => setDraft({ ...draft, examType: e.target.value })} placeholder="نوع الاختبار، مثال: اختبار الوحدة الثانية" className="rounded-2xl border p-3" />
                  <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="المادة" className="rounded-2xl border p-3" />
                  <div className="rounded-2xl border p-3 md:col-span-2">
                    <p className="mb-2 text-xs font-black text-slate-500">الفصول المستهدفة</p>
                    {teacherClasses.length > 0 ? <div className="flex flex-wrap gap-2">{teacherClasses.map((className) => { const selected = draft.classIds.split(",").map((item) => item.trim()).includes(className); return <button key={className} type="button" onClick={() => { const current = draft.classIds.split(",").map((item) => item.trim()).filter(Boolean); const next = selected ? current.filter((item) => item !== className) : [...current, className]; setDraft({ ...draft, classIds: next.join(",") }); }} className={`rounded-xl border px-3 py-2 text-xs font-black ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{className}</button>; })}</div> : <div className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">لم يتم العثور على فصول للمعلم. أضف الفصول والطلاب من قسم إدارة الطلاب أولًا، ثم عد إلى إنشاء الاختبار.</div>}
                  </div>
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
              <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-400">العنوان</span><strong>{draft.title || "غير محدد"}</strong></div><div className="flex justify-between"><span className="text-slate-400">النوع</span><strong>{getExamTypeLabel(draft.examType)}</strong></div><div className="flex justify-between"><span className="text-slate-400">الأسئلة</span><strong>{selectedQuestions.length}</strong></div><div className="flex justify-between border-t border-slate-700 pt-3"><span className="text-slate-300">الدرجة النهائية</span><strong className="text-xl text-emerald-400">{maximumGrade}</strong></div></div>
              <div className="mt-6 grid gap-2"><button onClick={() => void saveExam("draft")} disabled={!draft.title || !draft.examType.trim() || !draft.classIds.trim() || !selectedQuestions.length} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-slate-900 disabled:opacity-40"><Save className="h-4 w-4" /> حفظ كمسودة</button><button onClick={() => void saveExam("published")} disabled={!draft.title || !draft.examType.trim() || !draft.classIds.trim() || !selectedQuestions.length || isPublishingExam} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-black disabled:opacity-40"><Send className="h-4 w-4" /> {isPublishingExam ? "جاري الإرسال..." : "نشر وإرسال للطلاب"}</button><button onClick={() => void saveExam("scheduled")} disabled={!draft.title || !draft.examType.trim() || !draft.classIds.trim() || !selectedQuestions.length} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-700 px-4 py-3 font-black disabled:opacity-40"><CalendarClock className="h-4 w-4" /> جدولة</button></div>
            </aside>
          </div>
        )}

        {section === "exams" && <div className="space-y-3">{exams.length === 0 ? <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500">لا توجد اختبارات بعد.</div> : exams.map((exam) => <article key={exam.id} className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex gap-2"><Badge tone={exam.status === "published" ? "green" : exam.status === "scheduled" ? "amber" : "slate"}>{STATUS_LABELS[exam.status]}</Badge><Badge tone="blue">{getExamTypeLabel(exam.examType)}</Badge></div><h3 className="mt-3 text-lg font-black">{exam.title}</h3><p className="mt-1 text-sm text-slate-500">{exam.questionCount} سؤال · الدرجة النهائية {exam.maximumGrade} · {exam.classIds.join("، ")}</p></div><div className="flex gap-2">{(exam.status === "draft" || exam.status === "scheduled") && <button disabled={isPublishingExam} onClick={() => void publishExistingExam(exam)} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">نشر وإرسال</button>}{exam.status === "published" && <button disabled={isPublishingExam} onClick={() => void publishExistingExam(exam)} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">إعادة الإرسال</button>}<button onClick={() => setExams((items) => items.map((item) => item.id === exam.id ? { ...item, status: "archived", updatedAt: nowIso() } : item))} className="rounded-2xl bg-slate-100 p-3"><Archive className="h-5 w-5" /></button></div></div></article>)}</div>}

        {section === "results" && <div className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-black text-slate-800">نتائج الاختبارات</h2><p className="mt-1 text-sm text-slate-500">اختر الفصل ونوع الاختبار لعرض نتائجه.</p></div>
              <button onClick={() => void fetchExamResults()} disabled={isLoadingExamResults} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{isLoadingExamResults ? "جاري التحديث..." : "تحديث النتائج"}</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select value={resultClassFilter} onChange={(e) => setResultClassFilter(e.target.value)} className="rounded-2xl border bg-white p-3 font-bold"><option value="all">كل الفصول</option>{availableResultClasses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={resultExamTypeFilter} onChange={(e) => setResultExamTypeFilter(e.target.value)} className="rounded-2xl border bg-white p-3 font-bold"><option value="all">كل أنواع الاختبارات</option>{availableResultExamTypes.map((item) => <option key={item} value={item}>{getExamTypeLabel(item)}</option>)}</select>
            </div>
          </div>
          {filteredExamResults.length === 0 ? <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500"><Users className="mx-auto mb-3 h-9 w-9" /><p>لا توجد نتائج مطابقة للتصنيف المحدد.</p></div> : Object.entries(filteredExamResults.reduce((groups: Record<string, any[]>, result) => { const key = String(result.className || "بدون فصل"); (groups[key] ||= []).push(result); return groups; }, {})).map(([className, classResults]) => <section key={className} className="rounded-3xl bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-black text-blue-700">{className}</h3><Badge tone="blue">{classResults.length} نتيجة</Badge></div><div className="space-y-3">{classResults.map((result) => <div key={result.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div><h4 className="font-black">{result.studentName || result.studentId}</h4><p className="mt-1 text-xs text-slate-500">{result.examTitle} · {getExamTypeLabel(result.examType)} · المحاولة {result.attemptNumber}</p></div><div className="text-left"><strong className="text-xl text-emerald-600">{result.earnedGrade} / {result.maximumGrade}</strong><p className="text-xs font-bold text-slate-500">{result.percentage}%</p></div></div>)}</div></section>)}
        </div>}
      </main>
    </div>
  );
}
