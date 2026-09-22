import type { PreparationSessionState, TeacherPreparation } from '../types/preparationTypes';

export const PREPARATIONS_STORAGE_KEY = 'rased_teacher_lesson_preparations_v1';
export const PREPARATION_SESSION_STATE_KEY = 'rased_teacher_preparation_session_state_v1';
export const PREPARATIONS_BACKUP_KEY = 'rased_teacher_lesson_preparations_backup_v1';
export const PREPARATIONS_CHANGED_EVENT = 'rased:preparations-changed';

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

function notifyPreparationsChanged(items: TeacherPreparation[]): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PREPARATIONS_CHANGED_EVENT, { detail: items }));
}

export function loadPreparations(): TeacherPreparation[] {
  const value = readJson<unknown>(PREPARATIONS_STORAGE_KEY, []);
  return Array.isArray(value) ? value as TeacherPreparation[] : [];
}

export function savePreparations(preparations: TeacherPreparation[]): void {
  const safeItems = Array.isArray(preparations) ? preparations : [];
  const serialized = JSON.stringify(safeItems);
  const current = localStorage.getItem(PREPARATIONS_STORAGE_KEY);

  if (current === serialized) return;
  if (current) localStorage.setItem(PREPARATIONS_BACKUP_KEY, current);

  verifiedWrite(PREPARATIONS_STORAGE_KEY, safeItems);
  notifyPreparationsChanged(safeItems);
}

export function upsertPreparation(preparation: TeacherPreparation, replaceId?: string): TeacherPreparation[] {
  const existing = loadPreparations();
  const targetId = replaceId || preparation.id;
  const index = existing.findIndex(item => item.id === targetId);
  const next = [...existing];

  if (index >= 0) {
    next[index] = {
      ...preparation,
      id: existing[index].id,
      createdAt: existing[index].createdAt,
      updatedAt: preparation.updatedAt || new Date().toISOString()
    };
  } else {
    next.unshift(preparation);
  }

  savePreparations(next);
  return loadPreparations();
}

export function deletePreparation(id: string): TeacherPreparation[] {
  const existing = loadPreparations();
  const next = existing.filter(item => item.id !== id);
  savePreparations(next);
  return loadPreparations();
}

export function subscribeToPreparations(listener: (items: TeacherPreparation[]) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<TeacherPreparation[]>).detail;
    listener(Array.isArray(detail) ? detail : loadPreparations());
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREPARATIONS_STORAGE_KEY) listener(loadPreparations());
  };

  window.addEventListener(PREPARATIONS_CHANGED_EVENT, onCustom as EventListener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(PREPARATIONS_CHANGED_EVENT, onCustom as EventListener);
    window.removeEventListener('storage', onStorage);
  };
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
