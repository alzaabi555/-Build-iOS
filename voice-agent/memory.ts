import type {
  AgentMemoryState,
  PendingIntent,
  PendingVoiceData,
  VoiceMemoryHistoryItem
} from './types';

const MAX_MEMORY_HISTORY = 20;
const DEFAULT_PENDING_TIMEOUT_MS = 30_000;

const createInitialState = (): AgentMemoryState => ({
  pendingIntent: null,
  pendingGrade: null,
  pendingData: null,
  pendingStartedAt: null,
  lastCommand: '',
  lastStudentId: null,
  lastStudentName: null,
  currentContext: '',
  previousContext: '',
  history: []
});

export class VoiceAgentMemory {
  private state: AgentMemoryState = createInitialState();

  get snapshot(): Readonly<AgentMemoryState> {
    this.clearExpiredPendingIntent();
    return this.state;
  }

  setLastCommand(command: string) {
    const cleanCommand = String(command || '').trim();
    this.state.lastCommand = cleanCommand;
    if (!cleanCommand) return;

    const item: VoiceMemoryHistoryItem = {
      command: cleanCommand,
      createdAt: new Date().toISOString(),
      context: this.state.currentContext
    };
    this.state.history = [item, ...this.state.history].slice(0, MAX_MEMORY_HISTORY);
  }

  rememberStudent(id: string, name: string) {
    this.state.lastStudentId = String(id || '').trim() || null;
    this.state.lastStudentName = String(name || '').trim() || null;
  }

  forgetStudent() {
    this.state.lastStudentId = null;
    this.state.lastStudentName = null;
  }

  setPendingIntent(intent: PendingIntent, data: PendingVoiceData = {}) {
    this.state.pendingIntent = intent;
    this.state.pendingData = intent ? { ...data } : null;
    this.state.pendingGrade = intent === 'create_student' ? data.grade || null : null;
    this.state.pendingStartedAt = intent ? Date.now() : null;
  }

  setPendingCreateStudent(grade: string) {
    this.setPendingIntent('create_student', { grade: String(grade || '').trim() });
  }

  updatePendingData(data: Partial<PendingVoiceData>) {
    if (!this.state.pendingIntent) return;
    this.state.pendingData = { ...(this.state.pendingData || {}), ...data };
    if (this.state.pendingIntent === 'create_student' && data.grade !== undefined) {
      this.state.pendingGrade = data.grade || null;
    }
    this.state.pendingStartedAt = Date.now();
  }

  hasPendingIntent(intent?: Exclude<PendingIntent, null>) {
    this.clearExpiredPendingIntent();
    return intent ? this.state.pendingIntent === intent : this.state.pendingIntent !== null;
  }

  clearExpiredPendingIntent(timeoutMs = DEFAULT_PENDING_TIMEOUT_MS) {
    if (!this.state.pendingIntent || !this.state.pendingStartedAt) return false;
    if (Date.now() - this.state.pendingStartedAt <= timeoutMs) return false;
    this.clearPendingIntent();
    return true;
  }

  clearPendingIntent() {
    this.state.pendingIntent = null;
    this.state.pendingGrade = null;
    this.state.pendingData = null;
    this.state.pendingStartedAt = null;
  }

  setContext(context: string) {
    const cleanContext = String(context || '').trim();
    if (cleanContext === this.state.currentContext) return;
    this.state.previousContext = this.state.currentContext;
    this.state.currentContext = cleanContext;
  }

  restorePreviousContext() {
    const previous = this.state.previousContext;
    this.state.previousContext = this.state.currentContext;
    this.state.currentContext = previous;
    return this.state.currentContext;
  }

  clearHistory() {
    this.state.history = [];
  }

  reset() {
    this.state = createInitialState();
  }
}
