import { AgentMemoryState } from './types';

export class VoiceAgentMemory {
  private state: AgentMemoryState = {
    pendingIntent: null,
    pendingGrade: null,
    lastCommand: '',
    lastStudentId: null,
    lastStudentName: null,
    currentContext: ''
  };

  get snapshot() {
    return this.state;
  }

  setLastCommand(command: string) {
    this.state.lastCommand = command;
  }

  rememberStudent(id: string, name: string) {
    this.state.lastStudentId = id;
    this.state.lastStudentName = name;
  }

  setPendingCreateStudent(grade: string) {
    this.state.pendingIntent = 'create_student';
    this.state.pendingGrade = grade;
  }

  clearPendingIntent() {
    this.state.pendingIntent = null;
    this.state.pendingGrade = null;
  }

  setContext(context: string) {
    this.state.currentContext = context;
  }
}