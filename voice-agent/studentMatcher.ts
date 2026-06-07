import { Student } from '../types';
import { VoiceAgentMemory } from './memory';
import { normalizeText, normalizeWord } from './normalizer';
import { StudentMatchResult } from './types';

export const findBestStudent = (
  commandText: string,
  students: Student[],
  memory: VoiceAgentMemory
): StudentMatchResult => {
  const text = normalizeText(commandText);

  const candidates = students
    .map((student) => {
      const words = student.name
        .split(/\s+/)
        .map(normalizeWord)
        .filter((word) => word.length >= 2);

      let score = 0;

      for (const word of words) {
        if (text.includes(word)) {
          score += word.length;
        }
      }

      const fullName = normalizeText(student.name);
      if (text.includes(fullName)) {
        score += 20;
      }

      return { student, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    const lastStudentId = memory.snapshot.lastStudentId;

    const pronounReference =
      /(له|لها|عليه|عليها|منه|منها|هذا الطالب|هذه الطالبه|نفس الطالب)/.test(text);

    if (pronounReference && lastStudentId) {
      const lastStudent = students.find((student) => student.id === lastStudentId);

      if (lastStudent) {
        return {
          student: lastStudent,
          ambiguous: false,
          matches: [lastStudent]
        };
      }
    }

    return {
      student: undefined,
      ambiguous: false,
      matches: []
    };
  }

  const topScore = candidates[0].score;
  const topMatches = candidates.filter((item) => item.score === topScore);

  return {
    student: topMatches.length === 1 ? topMatches[0].student : undefined,
    ambiguous: topMatches.length > 1,
    matches: topMatches.map((item) => item.student)
  };
};