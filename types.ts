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
  weight: number; 
}

export interface GradeRecord {
  id?: string;
  toolId?: string; // جعلناها اختيارية لتوافق الكود القديم والجديد
  score: number;
  date: string;
  category: string; // ✅ ضروري جداً لصفحة الدرجات
  semester?: number | string;
  subject?: string;
  maxScore: number; // ✅ ضروري للحسابات
}

// تعريفات الوزارة (كما هي)
export interface MinistrySession {
  url: string;
  token: string;
  expiry: number;
  userId?: string;
  auth?: string;
  userRoleId?: string;
  schoolId?: string;
  teacherId?: string;
}

export interface StdsAbsDetail {
  studentId?: string;
  StudentId?: string; 
  date: string;
  status: string;
}

export interface StdsGradeDetail {
  studentId?: string;
  StudentId?: string; 
  subject: string;
  grade: number;
}

export interface ExamPaper {
  id: string;
  title: string;
  totalScore: number;
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
  gender: 'male' | 'female'; // ✅ هذا السطر هو سر ظهور الشخصيات
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

// ✅✅✅ هذا هو الجزء الذي كان ناقصاً وسبب المشكلة!
export interface TeacherInfo {
  name: string;
  school: string;
  subject: string;
  governorate: string;
  avatar?: string;
  stamp?: string;
  ministryLogo?: string;
  academicYear?: string;
  gender?: 'male' | 'female'; // ✅ ضروري جداً للمعلم
}
