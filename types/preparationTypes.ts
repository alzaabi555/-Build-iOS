export type PreparationStatus = 'draft' | 'complete' | 'needs_review';

export interface PreparationLessonInfo {
  title: string;
  unit: string;
  grade: string;
  totalSessions: number;
  subject?: string;
}

export interface PreparationFutureSkill {
  skill: string;
  studentPerformance?: string;
  assessmentEvidence?: string;
}

export interface PreparationEducationalElement {
  outcomeIndex?: number;
  type?: string;
  title?: string;
  page?: string;
  use?: string;
  status?: string;
}

export interface PreparationOutcomeAlignment {
  outcomeId?: string;
  outcomeText?: string;
  educationalElement?: PreparationEducationalElement;
  sources?: string[];
  strategies?: string[];
  procedureOrder?: number;
  activityReflectedInLessonProcedures?: boolean;
  feedbackIncluded?: boolean;
  formativeAssessmentIncluded?: boolean;
  implementationMethod?: string;
  participationMode?: string;
  futureSkills?: PreparationFutureSkill[];
}

export interface PreparationSession {
  number: number;
  title: string;
  bookPages: string[];
  officialOutcomes: Array<{ id?: string; text: string }>;
  additionalObjectives: string[];
  taxonomies: string[];
  strategies: string[];
  resources: string[];
  conceptsHtml: string;
  introductionHtml: string;
  preLearningHtml: string;
  proceduresHtml: string;
  formativeHtml: string;
  closingHtml: string;
  activitiesHtml: string;
  weeklyCommentsHtml: string;
  educationalElements: PreparationEducationalElement[];
  outcomeAlignments: PreparationOutcomeAlignment[];
  futureSkills: PreparationFutureSkill[];
  notes?: string;
  status?: PreparationStatus;
}

export interface TeacherPreparation {
  id: string;
  format: string;
  version: string;
  lesson: PreparationLessonInfo;
  sessions: PreparationSession[];
  packageRules?: Record<string, unknown>;
  finalQualityAudit?: Record<string, unknown>;
  linkedClasses: string[];
  status: PreparationStatus;
  sourceType: 'json_import' | 'json_paste' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface PreparationValidationIssue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

export interface PreparationValidationResult {
  valid: boolean;
  issues: PreparationValidationIssue[];
  preparation?: TeacherPreparation;
}

export interface PreparationSessionState {
  preparationId: string;
  sessionNumber: number;
  stepIndex: number;
  completedStepKeys: string[];
  quickNote: string;
  updatedAt: string;
}
