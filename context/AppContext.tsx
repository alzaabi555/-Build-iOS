import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Student, ScheduleDay, PeriodTime, Group, AssessmentTool, CertificateSettings, GradeSettings, GroupCategorization } from '../types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
// ✅ 1. استيراد القاموس من الملف الخارجي
import { translations } from './translations'; 

type Language = 'ar' | 'en';

interface TeacherInfo {
  name: string;
  school: string;
  subject: string;
  governorate: string;
  avatar?: string;
  stamp?: string;
  ministryLogo?: string;
  academicYear?: string;
  gender?: 'male' | 'female';
  civilId?: string; 
}

interface AppContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  classes: string[];
  setClasses: React.Dispatch<React.SetStateAction<string[]>>;
  hiddenClasses: string[];
  setHiddenClasses: React.Dispatch<React.SetStateAction<string[]>>;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  schedule: ScheduleDay[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleDay[]>>;
  periodTimes: PeriodTime[];
  setPeriodTimes: React.Dispatch<React.SetStateAction<PeriodTime[]>>;
  teacherInfo: TeacherInfo;
  setTeacherInfo: React.Dispatch<React.SetStateAction<TeacherInfo>>;
  currentSemester: '1' | '2';
  setCurrentSemester: React.Dispatch<React.SetStateAction<'1' | '2'>>;
  assessmentTools: AssessmentTool[];
  setAssessmentTools: React.Dispatch<React.SetStateAction<AssessmentTool[]>>;
  gradeSettings: GradeSettings;
  setGradeSettings: React.Dispatch<React.SetStateAction<GradeSettings>>;
  certificateSettings: CertificateSettings;
  setCertificateSettings: React.Dispatch<React.SetStateAction<CertificateSettings>>;
  isDataLoaded: boolean;
  defaultStudentGender: 'male' | 'female';
  setDefaultStudentGender: React.Dispatch<React.SetStateAction<'male' | 'female'>>;
  categorizations: GroupCategorization[];
  setCategorizations: React.Dispatch<React.SetStateAction<GroupCategorization[]>>;
  
  // 🌍 دوال اللغة
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  t: (key: keyof typeof translations['ar'] | string) => string; 
  dir: 'rtl' | 'ltr'; 
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DBFILENAME = 'raseddatabasev2.json';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem('appLanguage') as Language) || 'ar'
  );

  const currentMonth = new Date().getMonth();
  const defaultSemester: '1' | '2' = currentMonth >= 1 && currentMonth <= 7 ? '2' : '1';
  const [currentSemester, setCurrentSemester] = useState<'1' | '2'>(defaultSemester);

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [hiddenClasses, setHiddenClasses] = useState<string[]>([]);

  const [groups, setGroups] = useState<Group[]>([
    { id: 'g1', name: 'الصقور', color: 'emerald' },
    { id: 'g2', name: 'النمور', color: 'orange' },
    { id: 'g3', name: 'النجوم', color: 'purple' },
    { id: 'g4', name: 'الرواد', color: 'blue' },
  ]);

  const [categorizations, setCategorizations] = useState<GroupCategorization[]>([]);

  const [schedule, setSchedule] = useState<ScheduleDay[]>([
    { dayName: 'الأحد', periods: Array(8).fill('') },
    { dayName: 'الاثنين', periods: Array(8).fill('') },
    { dayName: 'الثلاثاء', periods: Array(8).fill('') },
    { dayName: 'الأربعاء', periods: Array(8).fill('') },
    { dayName: 'الخميس', periods: Array(8).fill('') },
  ]);

  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(
    Array(8).fill(null).map((_, i) => ({ periodNumber: i + 1, startTime: '', endTime: '' }))
  );

  const now = new Date();
  const defaultAcademicYear = now.getMonth() >= 7 
    ? `${now.getFullYear()} / ${now.getFullYear() + 1}` 
    : `${now.getFullYear() - 1} / ${now.getFullYear()}`;

  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>({
    name: '', school: '', subject: '', governorate: '', avatar: '', stamp: '',
    ministryLogo: '', academicYear: defaultAcademicYear, gender: 'male', civilId: ''
  });

  const [assessmentTools, setAssessmentTools] = useState<AssessmentTool[]>([]);
  const [gradeSettings, setGradeSettings] = useState<GradeSettings>({
      totalScore: 100, finalExamScore: 40, finalExamName: 'الامتحان النهائي'
  });

  const [certificateSettings, setCertificateSettings] = useState<CertificateSettings>({
    title: 'شهادة تفوق دراسي',
    bodyText: 'تتشرف إدارة المدرسة بمنح الطالب هذه الشهادة نظير تفوقه وتميزه في المادة',
    showDefaultDesign: true,
  });

  const [defaultStudentGender, setDefaultStudentGender] = useState<'male' | 'female'>('male');

  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<any>(null);

  const isHeavyEnvironment = () => Capacitor.isNativePlatform() || (window as any).electron !== undefined;

  useEffect(() => {
    const loadData = async () => {
      try {
        let data: any = null;

        if (isHeavyEnvironment()) {
          try {
            const result = await Filesystem.readFile({
              path: DBFILENAME,
              directory: Directory.Data,
              encoding: Encoding.UTF8,
            });
            if (result.data) {
              data = JSON.parse(result.data as string);
            }
          } catch (e) {
            console.log('ℹ️ No local file yet, checking localStorage...');
          }
        }

        if (!data) {
          const lsStudents = localStorage.getItem('studentData');
          if (lsStudents) {
            data = {
              students: JSON.parse(lsStudents),
              classes: JSON.parse(localStorage.getItem('classesData') || '[]'),
              hiddenClasses: JSON.parse(localStorage.getItem('hiddenClasses') || '[]'),
              groups: JSON.parse(localStorage.getItem('groupsData') || '[]'),
              categorizations: JSON.parse(localStorage.getItem('categorizationsData') || '[]'),
              schedule: JSON.parse(localStorage.getItem('scheduleData') || '[]'),
              periodTimes: JSON.parse(localStorage.getItem('periodTimes') || '[]'),
              assessmentTools: JSON.parse(localStorage.getItem('assessmentTools') || '[]'),
              gradeSettings: JSON.parse(localStorage.getItem('gradeSettings') || 'null'),
              currentSemester: localStorage.getItem('currentSemester'),
              teacherInfo: {
                name: localStorage.getItem('teacherName') || '',
                school: localStorage.getItem('schoolName') || '',
                subject: localStorage.getItem('subjectName') || '',
                governorate: localStorage.getItem('governorate') || '',
                avatar: localStorage.getItem('teacherAvatar') || '',
                stamp: localStorage.getItem('teacherStamp') || '',
                ministryLogo: localStorage.getItem('ministryLogo') || '',
                academicYear: localStorage.getItem('academicYear') || defaultAcademicYear,
                gender: localStorage.getItem('teacherGender') || 'male',
                civilId: localStorage.getItem('civilId') || '',
              },
              certificateSettings: JSON.parse(localStorage.getItem('certificateSettings') || 'null'),
              defaultStudentGender: localStorage.getItem('defaultStudentGender') || 'male',
            };
          }
        }

        if (data) {
          if (data.students) setStudents(data.students);
          if (data.classes) setClasses(data.classes);
          if (data.hiddenClasses) setHiddenClasses(data.hiddenClasses);
          if (data.groups) setGroups(data.groups);
          if (data.categorizations) setCategorizations(data.categorizations);
          if (data.schedule) setSchedule(data.schedule);
          if (data.periodTimes) setPeriodTimes(data.periodTimes);
          if (data.assessmentTools) setAssessmentTools(data.assessmentTools);
          if (data.gradeSettings) setGradeSettings(data.gradeSettings);
          if (data.currentSemester) setCurrentSemester(data.currentSemester);
          if (data.teacherInfo) setTeacherInfo(prev => ({ ...prev, ...data.teacherInfo }));
          if (data.certificateSettings) setCertificateSettings(prev => ({ ...prev, ...data.certificateSettings }));
          if (data.defaultStudentGender) setDefaultStudentGender(data.defaultStudentGender);
        }
      } catch (error) {
        console.error('❌ Data loading error', error);
      } finally {
        setIsDataLoaded(true);
        setTimeout(() => { isInitialLoad.current = false; }, 1000);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const dataToSave = {
        version: '3.8.6',
        timestamp: new Date().toISOString(),
        students, classes, hiddenClasses, groups, schedule, periodTimes,
        teacherInfo, currentSemester, assessmentTools, gradeSettings,
        certificateSettings, defaultStudentGender, categorizations
      };

      const isHeavy = isHeavyEnvironment();

      if (isHeavy) {
        try {
          await Filesystem.writeFile({
            path: DBFILENAME,
            data: JSON.stringify(dataToSave),
            directory: Directory.Data,
            encoding: Encoding.UTF8,
          });
        } catch (e) {}
      }

      try {
        localStorage.setItem('lastLocalUpdate', Date.now().toString());
        localStorage.setItem('teacherName', teacherInfo.name || '');
        localStorage.setItem('schoolName', teacherInfo.school || '');
        localStorage.setItem('subjectName', teacherInfo.subject || '');
        localStorage.setItem('academicYear', teacherInfo.academicYear || '');
        localStorage.setItem('currentSemester', String(currentSemester));
        localStorage.setItem('defaultStudentGender', defaultStudentGender);
        localStorage.setItem('civilId', teacherInfo.civilId || '');
        localStorage.setItem('appLanguage', language);

        if (!isHeavy) {
            localStorage.setItem('studentData', JSON.stringify(students));
            localStorage.setItem('classesData', JSON.stringify(classes));
            localStorage.setItem('assessmentTools', JSON.stringify(assessmentTools));
            localStorage.setItem('categorizationsData', JSON.stringify(categorizations));
        }
      } catch (e) {}
    }, 2000); 

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [students, classes, hiddenClasses, groups, schedule, periodTimes, teacherInfo, currentSemester, assessmentTools, gradeSettings, certificateSettings, defaultStudentGender, categorizations, language]);

  // ✅ 2. محرك الترجمة يعتمد على الملف الخارجي
  const t = (key: keyof typeof translations['ar'] | string): string => {
    return (translations[language] as any)[key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <AppContext.Provider
      value={{
        students, setStudents, classes, setClasses, hiddenClasses, setHiddenClasses,
        groups, setGroups, schedule, setSchedule, periodTimes, setPeriodTimes,
        teacherInfo, setTeacherInfo, currentSemester, setCurrentSemester,
        assessmentTools, setAssessmentTools, gradeSettings, setGradeSettings,
        certificateSettings, setCertificateSettings, isDataLoaded,
        defaultStudentGender, setDefaultStudentGender, categorizations, setCategorizations,
        language, setLanguage, t, dir
      }}
    >
      <div dir={dir} className="h-full w-full">
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};
