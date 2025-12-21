
export interface Student {
  id: string;
  name: string;
  grade: string;
  classes: string[];
  attendance: AttendanceRecord[];
  behaviors: BehaviorRecord[];
  avatar?: string; // Base64 image string or URL
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
}

export type BehaviorType = 'positive' | 'negative';

export interface BehaviorRecord {
  id: string;
  date: string;
  type: BehaviorType;
  description: string;
  points: number;
}

export interface AppState {
  students: Student[];
  selectedStudentId: string | null;
}
