import { Student } from '../types';

export type FeedbackType = 'info' | 'success' | 'error' | null;

export type VoiceTask =
  | { type: 'undo' }
  | { type: 'feedback'; payload: { message: string; feedbackType: FeedbackType; speak?: string } }
  | { type: 'unknown'; payload: { text: string } }
  | { type: 'ask_student_name'; payload: { grade: string } }
  | { type: 'create_student'; payload: { name: string; grade: string } }
  | { type: 'navigate'; payload: { route: string } }
  | { type: 'write_field'; payload: { fieldKeyword: string; value: string } }
  | { type: 'dom_click'; payload: { command: string } }
  | { type: 'add_points'; payload: { studentId: string; studentName: string; amount: number } }
  | { type: 'deduct_points'; payload: { studentId: string; studentName: string; amount: number } }
  | { type: 'mark_absent'; payload: { studentId: string; studentName: string } }
  | { type: 'mark_present'; payload: { studentId: string; studentName: string } }
  | { type: 'mark_late'; payload: { studentId: string; studentName: string } }
  | { type: 'mark_truant'; payload: { studentId: string; studentName: string } };

export interface DomIndexItem {
  element: HTMLElement;
  tag: string;
  role: string;
  text: string;
  placeholder: string;
  ariaLabel: string;
  name: string;
  id: string;
  value: string;
  title: string;
  voiceCommand: string;
  voiceField: string;
  labelText: string;
  nearbyText: string;
  parentText: string;
  scoreText: string;
}

export interface StudentMatchResult {
  student?: Student;
  ambiguous: boolean;
  matches: Student[];
}

export interface AgentMemoryState {
  pendingIntent: 'create_student' | null;
  pendingGrade: string | null;
  lastCommand: string;
  lastStudentId: string | null;
  lastStudentName: string | null;
  currentContext: string;
}
