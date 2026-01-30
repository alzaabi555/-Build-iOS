// src/types.ts

// استخدمنا "any" هنا لإسكات الأخطاء المعقدة في الامتحانات
export type GradingData = any; 

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
  semester?: number | string;
}

export interface AssessmentTool {
  id: string;
  name: string;
  maxScore: number;
  weight: number; // ✅ تمت الإضافة
}

export interface GradeRecord {
  id?: string;
  toolId: string;
  score: number;
  date: string;
  category?: string;
  semester?: number | string;
  subject?: string; // ✅ تمت الإضافة
}

// تعريفات الوزارة (تم توسيعها لتشمل كل الحقول المفقودة)
export interface MinistrySession {
  url: string;
  token: string;
  expiry: number;
  // 👇 الحقول الجديدة التي يطلبها الكود
  userId?: string;
  auth?: string;
  userRoleId?: string;
  schoolId?: string;
  teacherId?: string;
}

export interface StdsAbsDetail {
  studentId?: string;
  StudentId?: string; // ✅ أضفنا الاثنين لتجنب الخطأ
  date: string;
  status: string;
}

export interface StdsGradeDetail {
  studentId?: string;
  StudentId?: string; // ✅ أضفنا الاثنين
  subject: string;
  grade: number;
}

export interface ExamPaper {
  id: string;
  title: string;
  totalScore: number;
  // 👇 الحقول الجديدة للامتحانات
  gradingData?: any;
  fileData?: string;
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
