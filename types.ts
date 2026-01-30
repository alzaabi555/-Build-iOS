// src/types.ts

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
  status: 'present' | 'absent' | 'late' | 'excused';
  period?: string; // 👈 تمت الإضافة
  note?: string;
}

export interface BehaviorRecord {
  id: string;
  date: string;
  type: 'positive' | 'negative';
  description: string;
  period?: string; // 👈 تمت الإضافة
  points: number;
}

export interface AssessmentTool {
  id: string;
  name: string;
  maxScore: number;
  weight: number; 
}

export interface GradeRecord {
  toolId: string;
  score: number;
  date: string;
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
