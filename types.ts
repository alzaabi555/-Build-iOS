export interface Student {
  id: string;
  ministryId?: string;
  name: string;
  gender?: 'male' | 'female';
  grade: string;
  classes: string[];
  attendance: AttendanceRecord[];
  behaviors: BehaviorRecord[];
  grades: GradeRecord[];
  parentPhone?: string;
  avatar?: string;
  spentCoins?: number;
  groupId?: string | null;
  examPapers?: ExamPaper[];
  rasedId?: string;
  parentCode?: string;
}

export interface Group {
  id: string;
  name: string;
  color: string;
}

export interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  semester?: '1' | '2';
  notes?: string;
  session?: number | string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'truant';

export interface BehaviorRecord {
  id: string;
  date: string;
  type: BehaviorType;
  description: string;
  points: number;
  semester?: '1' | '2';
  session?: number | string;
}

export type BehaviorType = 'positive' | 'negative';

export interface GradeRecord {
  id: string;
  subject: string;
  category: string;
  score: number;
  maxScore: number;
  date: string;
  semester?: '1' | '2';
}

export interface ScheduleDay {
  dayName: string;
  periods: string[];
}

export interface PeriodTime {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

export interface AssessmentTool {
  id: string;
  name: string;
  maxScore: number;
  isFinal?: boolean;
}

export interface GradeSettings {
  totalScore: number;
  finalExamScore: number;
  finalExamName: string;
  finalExamWeight?: number;
}

export interface CertificateSettings {
  title: string;
  bodyText: string;
  backgroundImage?: string;
  showDefaultDesign: boolean;
  useCustomCertificateBackground?: boolean;
  customCertificateBackground?: string;
  customCertificateBackgroundType?: 'image' | 'pdf' | '';
  customCertificateBackgroundName?: string;
  hideDefaultCertificateFrame?: boolean;
  customBackgroundFit?: 'stretch' | 'cover' | 'contain';
}

export interface TeacherTask {
  id: string;
  title: string;
  subject: string;
  targetClass: string;
  createdAt: string;
}

export interface TeacherLibraryItem {
  id: string;
  title: string;
  link: string;
  type: 'link' | 'youtube' | 'pdf' | string;
  targetClass: string;
  date: string;
}

export interface AssessmentMonth {
  id: string;
  monthIndex: number;
  monthName: string;
  tasks: string[];
}

export interface TermWeekPlan {
  id: string;
  name: string;
  start: string;
  end: string;
  unit: string;
  lesson: string;
  defaultTopic: string;
}

export interface TeacherSentMessage {
  rowNumber?: number;
  row?: number;
  messageRow?: number;
  localId?: string;
  date?: string;
  rasedId?: string;
  civilID?: string;
  parentCode?: string;
  studentName?: string;
  schoolName?: string;
  subject?: string;
  message?: string;
  status?: string;
  teacherReply?: string;
  replyDate?: string;
  teacherName?: string;
  sender?: string;
  messageType?: string;
  direction?: string;
  readByParent?: string;
  readByTeacher?: string;
  semester?: string;
  className?: string;
  grade?: string;
}

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
  pairs?: Array<{ left: string; right: string }>;
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
  rawResult?: unknown;
}

export interface MinistrySession {
  userId: string;
  auth: string;
  userRoleId: string;
  schoolId: string;
  teacherId: string;
}

export interface StdsAbsDetail {
  StudentId: string;
  AbsenceType: number;
  Notes: string;
}

export interface StdsGradeDetail {
  StudentId: string;
  MarkValue: string;
  IsAbsent: boolean;
  Notes: string;
}

export interface GradingData {
  mcq: (number | null)[];
  essay: { [key: string]: { [part: string]: number } };
}

export interface ExamPaper {
  id: string;
  title: string;
  fileData: string;
  date: string;
  gradingData?: GradingData;
  totalScore?: number;
  maxScore?: number;
}

export interface SubGroup {
  id: string;
  name: string;
  color: string;
  studentIds: string[];
  isCompleted?: boolean;
}

export interface GroupCategorization {
  id: string;
  title: string;
  classId: string;
  createdAt: string;
  archivedAt?: string;
  groups: SubGroup[];
}

export interface RasedExtendedStorageSnapshot {
  termPlan: TermWeekPlan[];
  assessmentPlan: AssessmentMonth[];
  tasks: TeacherTask[];
  libraryArchive: TeacherLibraryItem[];
  sentMessagesLocal: TeacherSentMessage[];
  gradingSettings: Record<string, unknown> | null;
  gameStorage: Record<string, unknown>;
}

export interface RasedBackupPayload {
  schemaVersion: number;
  version: string;
  timestamp: string;
  students: Student[];
  classes: string[];
  hiddenClasses: string[];
  groups: Group[];
  categorizations: GroupCategorization[];
  schedule: ScheduleDay[];
  periodTimes: PeriodTime[];
  teacherInfo: Record<string, unknown>;
  currentSemester: '1' | '2';
  assessmentTools: AssessmentTool[];
  gradeSettings: GradeSettings;
  certificateSettings: CertificateSettings;
  defaultStudentGender: 'male' | 'female';
  language: 'ar' | 'en';
  extendedStorage: RasedExtendedStorageSnapshot;
}

declare global {
  interface Window {
    electron?: {
      openExternal: (url: string) => Promise<void>;
    };
  }
}

export {};
