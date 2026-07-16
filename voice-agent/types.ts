import type { Student } from '../types';

export type FeedbackType = 'info' | 'success' | 'warning' | 'error' | null;
export type VoiceLanguage = 'ar' | 'en';
export type VoiceRiskLevel = 'safe' | 'confirm' | 'blocked';
export type VoiceConfidenceLevel = 'high' | 'medium' | 'low';

export type KnownVoiceRoute =
  | 'dashboard'
  | 'students'
  | 'attendance'
  | 'groups'
  | 'mailbox'
  | 'grades'
  | 'tasks'
  | 'library'
  | 'game_questions'
  | 'game_results'
  | 'reports'
  | 'leaderboard'
  | 'sync'
  | 'guide'
  | 'settings'
  | 'about'
  | 'senior_dashboard';

/** Keeps known routes discoverable while remaining compatible with legacy routeMatcher output. */
export type VoiceRoute = KnownVoiceRoute | (string & {});

export type PendingIntent =
  | 'create_student'
  | 'select_student'
  | 'add_points'
  | 'deduct_points'
  | 'mark_attendance'
  | 'write_field'
  | 'confirm_action'
  | null;

export interface VoiceTaskMetadata {
  sourceText?: string;
  normalizedText?: string;
  language?: VoiceLanguage;
  confidence?: number;
  confidenceLevel?: VoiceConfidenceLevel;
  risk?: VoiceRiskLevel;
  createdAt?: string;
}

type WithMetadata<T> = T & { meta?: VoiceTaskMetadata };

export type VoiceTask =
  | WithMetadata<{ type: 'undo' }>
  | WithMetadata<{
      type: 'feedback';
      payload: { message: string; feedbackType: FeedbackType; speak?: string };
    }>
  | WithMetadata<{ type: 'unknown'; payload: { text: string } }>
  | WithMetadata<{ type: 'ask_student_name'; payload: { grade: string } }>
  | WithMetadata<{ type: 'create_student'; payload: { name: string; grade: string } }>
  | WithMetadata<{ type: 'navigate'; payload: { route: VoiceRoute } }>
  | WithMetadata<{ type: 'write_field'; payload: { fieldKeyword: string; value: string } }>
  | WithMetadata<{ type: 'dom_click'; payload: { command: string } }>
  | WithMetadata<{
      type: 'add_points';
      payload: { studentId: string; studentName: string; amount: number };
    }>
  | WithMetadata<{
      type: 'deduct_points';
      payload: { studentId: string; studentName: string; amount: number };
    }>
  | WithMetadata<{ type: 'mark_absent'; payload: { studentId: string; studentName: string } }>
  | WithMetadata<{ type: 'mark_present'; payload: { studentId: string; studentName: string } }>
  | WithMetadata<{ type: 'mark_late'; payload: { studentId: string; studentName: string } }>
  | WithMetadata<{ type: 'mark_truant'; payload: { studentId: string; studentName: string } }>;

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
  disabled?: boolean;
  hidden?: boolean;
  dangerous?: boolean;
  requiresConfirmation?: boolean;
  confidenceHint?: number;
}

/** Compatible with the current studentMatcher and enriched for diagnostics. */
export interface StudentMatchResult {
  student?: Student;
  ambiguous: boolean;
  matches: Student[];
  confidence?: number;
  matchedBy?: 'exact' | 'normalized' | 'partial' | 'memory' | 'fuzzy' | 'none';
  query?: string;
}

export interface PendingVoiceData {
  studentId?: string;
  studentName?: string;
  grade?: string;
  amount?: number;
  attendanceStatus?: 'present' | 'absent' | 'late' | 'truant';
  fieldKeyword?: string;
  fieldValue?: string;
  tasks?: VoiceTask[];
}

export interface VoiceMemoryHistoryItem {
  command: string;
  createdAt: string;
  context: string;
}

export interface AgentMemoryState {
  pendingIntent: PendingIntent;
  pendingGrade: string | null;
  pendingData: PendingVoiceData | null;
  pendingStartedAt: number | null;
  lastCommand: string;
  lastStudentId: string | null;
  lastStudentName: string | null;
  currentContext: string;
  previousContext: string;
  history: VoiceMemoryHistoryItem[];
}
