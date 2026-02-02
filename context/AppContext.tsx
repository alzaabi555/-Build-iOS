import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, ScheduleDay, PeriodTime, AssessmentTool } from '../types';

// ============================================================================
// 1. تعريف واجهات البيانات (Types)
// ============================================================================

interface TeacherInfo {
  name: string;
  school: string;
  subject: string;
  governorate: string;
  avatar?: string;
  stamp?: string;
  ministryLogo?: string;
  academicYear?: string;
  gender?: 'male' | 'female'; // ضروري لشخصيات الفيكتور
}

interface AppContextType {
  teacherInfo: TeacherInfo;
  setTeacherInfo: React.Dispatch<React.SetStateAction<TeacherInfo>>;
  
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  
  classes: string[];
  setClasses: React.Dispatch<React.SetStateAction<string[]>>;
  
  schedule: ScheduleDay[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleDay[]>>;
  
  periodTimes: PeriodTime[];
  setPeriodTimes: React.Dispatch<React.SetStateAction<PeriodTime[]>>;
  
  currentSemester: '1' | '2';
  setCurrentSemester: React.Dispatch<React.SetStateAction<'1' | '2'>>;
  
  assessmentTools: AssessmentTool[];
  setAssessmentTools: React.Dispatch<React.SetStateAction<AssessmentTool[]>>;
}

// ============================================================================
// 2. القيم الافتراضية (لضمان عدم ظهور أخطاء undefined)
// ============================================================================

const defaultTeacherInfo: TeacherInfo = {
  name: '',
  school: '',
  subject: '',
  governorate: '',
  academicYear: new Date().getFullYear().toString(),
  gender: 'male'
};

const defaultSchedule: ScheduleDay[] = [
  { dayName: 'الأحد', periods: Array(8).fill('') },
  { dayName: 'الاثنين', periods: Array(8).fill('') },
  { dayName: 'الثلاثاء', periods: Array(8).fill('') },
  { dayName: 'الأربعاء', periods: Array(8).fill('') },
  { dayName: 'الخميس', periods: Array(8).fill('') },
];

const defaultPeriodTimes: PeriodTime[] = Array(8).fill(null).map((_, i) => ({
  periodNumber: i + 1,
  startTime: '07:00',
  endTime: '07:45'
}));

const defaultTools: AssessmentTool[] = [
  { id: 't1', name: 'واجب منزلي', maxScore: 10 },
  { id: 't2', name: 'مشاركة صفية', maxScore: 10 },
  { id: 't3', name: 'اختبار قصير', maxScore: 20 },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================================
// 3. المزود (Provider)
// ============================================================================

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  // --- التحميل الفوري من الذاكرة (Lazy Initialization) ---
  // هذا يمنع الشاشة البيضاء لأن البيانات تكون جاهزة قبل رسم الشاشة

  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>(() => {
    try {
      const saved = localStorage.getItem('rased_teacherInfo');
      return saved ? JSON.parse(saved) : defaultTeacherInfo;
    } catch { return defaultTeacherInfo; }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('rased_students');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [classes, setClasses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rased_classes');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [schedule, setSchedule] = useState<ScheduleDay[]>(() => {
    try {
      const saved = localStorage.getItem('rased_schedule');
      return saved ? JSON.parse(saved) : defaultSchedule;
    } catch { return defaultSchedule; }
  });

  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(() => {
    try {
      const saved = localStorage.getItem('rased_periodTimes');
      return saved ? JSON.parse(saved) : defaultPeriodTimes;
    } catch { return defaultPeriodTimes; }
  });

  const [currentSemester, setCurrentSemester] = useState<'1' | '2'>(() => {
    return (localStorage.getItem('rased_currentSemester') as '1' | '2') || '1';
  });

  const [assessmentTools, setAssessmentTools] = useState<AssessmentTool[]>(() => {
    try {
      const saved = localStorage.getItem('rased_assessmentTools');
      return saved ? JSON.parse(saved) : defaultTools;
    } catch { return defaultTools; }
  });

  // --- الحفظ التلقائي عند أي تغيير (Auto Save) ---

  useEffect(() => { localStorage.setItem('rased_teacherInfo', JSON.stringify(teacherInfo)); }, [teacherInfo]);
  useEffect(() => { localStorage.setItem('rased_students', JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem('rased_classes', JSON.stringify(classes)); }, [classes]);
  useEffect(() => { localStorage.setItem('rased_schedule', JSON.stringify(schedule)); }, [schedule]);
  useEffect(() => { localStorage.setItem('rased_periodTimes', JSON.stringify(periodTimes)); }, [periodTimes]);
  useEffect(() => { localStorage.setItem('rased_currentSemester', currentSemester); }, [currentSemester]);
  useEffect(() => { localStorage.setItem('rased_assessmentTools', JSON.stringify(assessmentTools)); }, [assessmentTools]);

  return (
    <AppContext.Provider value={{
      teacherInfo, setTeacherInfo,
      students, setStudents,
      classes, setClasses,
      schedule, setSchedule,
      periodTimes, setPeriodTimes,
      currentSemester, setCurrentSemester,
      assessmentTools, setAssessmentTools
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
