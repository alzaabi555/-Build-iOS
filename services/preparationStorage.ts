import type { PreparationSessionState, TeacherPreparation } from '../types/preparationTypes';

export const PREPARATIONS_STORAGE_KEY = 'rased_teacher_lesson_preparations_v1';
export const PREPARATION_SESSION_STATE_KEY = 'rased_teacher_preparation_session_state_v1';
export const PREPARATIONS_BACKUP_KEY = 'rased_teacher_lesson_preparations_backup_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch (error) {
    console.error(`[Preparations] Failed to read ${key}`, error);
    return fallback;
  }
}

function verifiedWrite(key: string, value: unknown): void {
  const serialized = JSON.stringify(value);
  localStorage.setItem(key, serialized);
  if (localStorage.getItem(key) !== serialized) {
    throw new Error('تعذر التحقق من حفظ البيانات على الجهاز.');
  }
}

export function loadPreparations(): TeacherPreparation[] {
  const value = readJson<unknown>(PREPARATIONS_STORAGE_KEY, []);
  return Array.isArray(value) ? value as TeacherPreparation[] : [];
}

export function savePreparations(preparations: TeacherPreparation[]): void {
  const current = localStorage.getItem(PREPARATIONS_STORAGE_KEY);
  if (current) localStorage.setItem(PREPARATIONS_BACKUP_KEY, current);
  verifiedWrite(PREPARATIONS_STORAGE_KEY, preparations);
}

export function upsertPreparation(preparation: TeacherPreparation, replaceId?: string): TeacherPreparation[] {
  const existing = loadPreparations();
  const index = existing.findIndex(item => item.id === (replaceId || preparation.id));
  const next = [...existing];
  if (index >= 0) next[index] = { ...preparation, id: existing[index].id, createdAt: existing[index].createdAt };
  else next.unshift(preparation);
  savePreparations(next);
  return next;
}

export function deletePreparation(id: string): TeacherPreparation[] {
  const next = loadPreparations().filter(item => item.id !== id);
  savePreparations(next);
  return next;
}

export function loadPreparationSessionState(): PreparationSessionState | null {
  return readJson<PreparationSessionState | null>(PREPARATION_SESSION_STATE_KEY, null);
}

export function savePreparationSessionState(state: PreparationSessionState): void {
  verifiedWrite(PREPARATION_SESSION_STATE_KEY, state);
}

export function clearPreparationSessionState(): void {
  localStorage.removeItem(PREPARATION_SESSION_STATE_KEY);
}
