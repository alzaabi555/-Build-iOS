// src/types.ts

// الحالة تشمل الآن 'truant' (هروب)
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'truant';
export type BehaviorType = 'positive' | 'negative';

export interface PeriodTime {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleDay {
  dayName: string;
  periods: string[];
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  period?: string; 
  note?: string;
}

export interface BehaviorRecord {
  id: string;
  date: string;
  type: BehaviorType;
  description: string;
  period?: string;
  points: number;
  semester?: number | string; // ✅ إصلاح
}

export interface AssessmentTool {
  id: string;
  name: string;
  maxScore: number;
  weight: number; // ✅ إصلاح
}

export interface GradeRecord {
  id?: string; // ✅ إصلاح
  toolId: string;
  score: number;
  date: string;
  category?: string; // ✅ إصلاح
  semester?: number | string; // ✅ إصلاح
}

// تعريفات الوزارة المفقودة
export interface MinistrySession {
  url: string;
  token: string;
  expiry: number;
}
export interface StdsAbsDetail {
  studentId: string;
  date: string;
  status: string;
}
export interface StdsGradeDetail {
  studentId: string;
  subject: string;
  grade: number;
}
export interface ExamPaper {
  id: string;
  title: string;
  totalScore: number;
}

export interface Student {
  id: string;
  name: string;
  classes: string[]; 
  grade?: string;     
  parentPhone?: string; 
  avatar?: string;
  gender: 'male' | 'female';
  attendance: AttendanceRecord[];
  behaviors: BehaviorRecord[];
  grades: GradeRecord[];
  
  // ✅ الحقول الجديدة المفقودة
  groupId?: string;
  ministryId?: string;
  spentCoins?: number;
  examPapers?: ExamPaper[];
}

export interface Group {
  id: string;
  name: string;
  color: string;
}

export interface CertificateSettings {
  title: string;
  bodyText: string;
  showDefaultDesign: boolean;
  backgroundImage?: string;
}
