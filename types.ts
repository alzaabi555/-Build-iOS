export interface Student {
  id: string;
  ministryId?: string;
  name: string;
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
}

export interface Group {
  id: string;
  name: string;
  color: string;
}

export interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  period?: string; // 👈 تمت الإضافة: رقم الحصة
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'truant';

export interface BehaviorRecord {
  id: string;
  date: string;
  type: BehaviorType;
  description: string;
  points: number;
  semester?: '1' | '2';
  period?: string; // 👈 تمت الإضافة: رقم الحصة
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
}

export interface CertificateSettings {
  title: string;
  bodyText: string;
  backgroundImage?: string;
  showDefaultDesign: boolean;
}

// --- Ministry Sync ---
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

// --- Exam Grading ---
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

declare global {
  interface Window {
    electron?: {
      openExternal: (url: string) => Promise<void>;
    };
  }
}
