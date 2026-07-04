import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Student, ScheduleDay, PeriodTime, Group, AssessmentTool, CertificateSettings, GradeSettings, GroupCategorization } from '../types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
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
  // 💉 الجينات الجديدة: تحديد دور المعلم والقسم الذي يشرف عليه
  role?: 'teacher' | 'senior'; 
  departmentName?: string;
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

const DBFILENAME = 'teacher_raseddatabasev2.json';

// =========================================================================
// 🔐 أدوات هوية الطالب ومنع تكرار أكواد راصد
// =========================================================================

const normalizeArabicName = (name: string) => {
  return String(name || '')
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ؤئء]/g, '')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

const normalizeArabicDigits = (value: string) => {
  const arabicDigits: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9'
  };

  return String(value || '').replace(/[٠-٩۰-۹]/g, digit => arabicDigits[digit] || digit);
};

const normalizeClassName = (className: string) => {
  return normalizeArabicDigits(className)
    .trim()
    .replace(/\s+/g, '')
    .replace(/الصف/g, '')
    .replace(/صف/g, '')
    .replace(/الفصل/g, '')
    .replace(/الشعبة/g, '')
    .replace(/شعبة/g, '')
    .replace(/\\/g, '/')
    .replace(/-/g, '/')
    .replace(/الأول|اول/g, '1')
    .replace(/الثاني|ثاني/g, '2')
    .replace(/الثالث|ثالث/g, '3')
    .replace(/الرابع|رابع/g, '4')
    .replace(/الخامس|خامس/g, '5')
    .replace(/السادس|سادس/g, '6')
    .replace(/السابع|سابع/g, '7')
    .replace(/الثامن|ثامن/g, '8')
    .replace(/التاسع|تاسع/g, '9')
    .replace(/العاشر|عاشر/g, '10')
    .replace(/الحاديعشر|حاديعشر/g, '11')
    .replace(/الثانيعشر|ثانيعشر/g, '12')
    .toLowerCase();
};

const getStudentClassValue = (student: any) => {
  return String(
    student?.classes?.[0] ||
    student?.className ||
    student?.class ||
    ''
  ).trim();
};

const getExistingRasedCodeFromStudent = (student: any) => {
  const possibleCode = String(
    student?.rasedId ||
    student?.rasedID ||
    student?.secretCode ||
    student?.parentCode ||
    student?.civilID ||
    student?.civilId ||
    ''
  ).trim().toUpperCase();

  return possibleCode.startsWith('RSD-') ? possibleCode : '';
};

const makeStudentIdentityKey = (schoolName: string, name: string, className: string) => {
  const normalizedSchool = String(schoolName || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();

  const normalizedName = normalizeArabicName(name).replace(/\s+/g, '');
  const normalizedClass = normalizeClassName(className);

  return `${normalizedSchool}_${normalizedName}_${normalizedClass}`;
};

const hashToRasedCode = (value: string) => {
  let hash = 5381;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }

  const code = Math.abs(hash)
    .toString(36)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .padStart(6, '0')
    .substring(0, 6);

  return `RSD-${code}`;
};

const generateRasedId = (name: string, className: string, schoolName = '') => {
  if (!name || !className) {
    return `RSD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  const identityKey = makeStudentIdentityKey(schoolName, name, className);
  return hashToRasedCode(identityKey);
};

const mergeStudentArrays = (oldList: any[] = [], newList: any[] = []) => {
  const map = new Map<string, any>();

  [...oldList, ...newList].forEach(item => {
    if (!item) return;
    const id = String(item.id || item.date || JSON.stringify(item));
    if (!map.has(id)) map.set(id, item);
  });

  return Array.from(map.values());
};

const migrateAndDedupeStudents = (rawStudents: any[], schoolName: string) => {
  const identityMap = new Map<string, any>();

  rawStudents.forEach(rawStudent => {
    if (!rawStudent) return;

    const studentClass = getStudentClassValue(rawStudent) || 'غير محدد';
    const identityKey = makeStudentIdentityKey(schoolName, rawStudent.name || '', studentClass);

    const existingCode = getExistingRasedCodeFromStudent(rawStudent);
    const rasedId = existingCode || generateRasedId(rawStudent.name || '', studentClass, schoolName);

    const {
      civilID,
      civilId,
      parentCode,
      secretCode,
      rasedID,
      ...cleanStudent
    } = rawStudent;

    const normalizedStudent = {
      ...cleanStudent,
      id: cleanStudent.id || rawStudent.id || rasedId,
      rasedId,
      name: rawStudent.name || '',
      classes: Array.isArray(rawStudent.classes) && rawStudent.classes.length > 0
        ? rawStudent.classes
        : [studentClass],
      grade: rawStudent.grade,
      parentPhone: rawStudent.parentPhone || '',
      gender: rawStudent.gender || 'male',
      avatar: rawStudent.avatar,
      behaviors: Array.isArray(rawStudent.behaviors) ? rawStudent.behaviors : [],
      grades: Array.isArray(rawStudent.grades) ? rawStudent.grades : [],
      attendance: Array.isArray(rawStudent.attendance) ? rawStudent.attendance : []
    };

    const existing = identityMap.get(identityKey);

    if (!existing) {
      identityMap.set(identityKey, normalizedStudent);
      return;
    }

    identityMap.set(identityKey, {
      ...existing,
      ...normalizedStudent,

      // الأهم: لا نغير كود راصد القديم
      rasedId: existing.rasedId || normalizedStudent.rasedId,

      // نحافظ على بيانات الطالب الأقدم إذا كانت موجودة
      parentPhone: normalizedStudent.parentPhone || existing.parentPhone,
      gender: normalizedStudent.gender || existing.gender,
      avatar: normalizedStudent.avatar || existing.avatar,

      behaviors: mergeStudentArrays(existing.behaviors, normalizedStudent.behaviors),
      grades: mergeStudentArrays(existing.grades, normalizedStudent.grades),
      attendance: mergeStudentArrays(existing.attendance, normalizedStudent.attendance)
    });
  });

  return Array.from(identityMap.values());
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem('teacher_appLanguage') as Language) || 'ar'
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

  // 💉 تهيئة الحقول الجديدة للقيادة
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>({
    name: '', school: '', subject: '', governorate: '', avatar: '', stamp: '',
    ministryLogo: '', academicYear: defaultAcademicYear, gender: 'male', civilId: '',
    role: 'teacher', departmentName: ''
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
          const lsStudents = localStorage.getItem('teacher_studentData');
          if (lsStudents) {
            data = {
              students: JSON.parse(lsStudents),
              classes: JSON.parse(localStorage.getItem('teacher_classesData') || '[]'),
              hiddenClasses: JSON.parse(localStorage.getItem('teacher_hiddenClasses') || '[]'),
              groups: JSON.parse(localStorage.getItem('teacher_groupsData') || '[]'),
              categorizations: JSON.parse(localStorage.getItem('teacher_categorizationsData') || '[]'),
              schedule: JSON.parse(localStorage.getItem('teacher_scheduleData') || '[]'),
              periodTimes: JSON.parse(localStorage.getItem('teacher_periodTimes') || '[]'),
              assessmentTools: JSON.parse(localStorage.getItem('teacher_assessmentTools') || '[]'),
              gradeSettings: JSON.parse(localStorage.getItem('teacher_gradeSettings') || 'null'),
              currentSemester: localStorage.getItem('teacher_currentSemester'),
              teacherInfo: {
                name: localStorage.getItem('teacher_teacherName') || '',
                school: localStorage.getItem('teacher_schoolName') || '',
                subject: localStorage.getItem('teacher_subjectName') || '',
                governorate: localStorage.getItem('teacher_governorate') || '',
                avatar: localStorage.getItem('teacher_teacherAvatar') || '',
                stamp: localStorage.getItem('teacher_teacherStamp') || '',
                ministryLogo: localStorage.getItem('teacher_ministryLogo') || '',
                academicYear: localStorage.getItem('teacher_academicYear') || defaultAcademicYear,
                gender: localStorage.getItem('teacher_teacherGender') || 'male',
                civilId: localStorage.getItem('teacher_civilId') || '',
                // 💉 استرجاع الدور والقسم من الذاكرة
                role: localStorage.getItem('teacher_role') || 'teacher',
                departmentName: localStorage.getItem('teacher_departmentName') || '',
              },
              certificateSettings: JSON.parse(localStorage.getItem('teacher_certificateSettings') || 'null'),
              defaultStudentGender: localStorage.getItem('teacher_defaultStudentGender') || 'male',
            };
          }
        }

        if (data) {
         // 🔐 مهاجر أكواد RSD المحسن:
// - يحافظ على الأكواد القديمة.
// - يمنع تكرار نفس الطالب داخل نفس المدرسة ونفس الفصل.
// - يوحّد الطلاب الذين تم إدخالهم أكثر من مرة من معلمين أو استيرادات متعددة.
if (data.students && data.students.length > 0) {
  const loadedTeacherInfo = data.teacherInfo || {};
  const activeSchoolName =
    loadedTeacherInfo.school ||
    localStorage.getItem('teacher_schoolName') ||
    '';

  const migratedStudents = migrateAndDedupeStudents(data.students, activeSchoolName);
  setStudents(migratedStudents);
} else {
  setStudents([]);
}

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
        localStorage.setItem('teacher_lastLocalUpdate', Date.now().toString());
        localStorage.setItem('teacher_teacherName', teacherInfo.name || '');
        localStorage.setItem('teacher_schoolName', teacherInfo.school || '');
        localStorage.setItem('teacher_subjectName', teacherInfo.subject || '');
        localStorage.setItem('teacher_academicYear', teacherInfo.academicYear || '');
        localStorage.setItem('teacher_currentSemester', String(currentSemester));
        localStorage.setItem('teacher_defaultStudentGender', defaultStudentGender);
        localStorage.setItem('teacher_civilId', teacherInfo.civilId || '');
        localStorage.setItem('teacher_appLanguage', language);
        
        // 💉 حفظ الجينات الجديدة للإدارة
        localStorage.setItem('teacher_role', teacherInfo.role || 'teacher');
        localStorage.setItem('teacher_departmentName', teacherInfo.departmentName || '');

        if (!isHeavy) {
            localStorage.setItem('teacher_studentData', JSON.stringify(students));
            localStorage.setItem('teacher_classesData', JSON.stringify(classes));
            localStorage.setItem('teacher_assessmentTools', JSON.stringify(assessmentTools));
            localStorage.setItem('teacher_categorizationsData', JSON.stringify(categorizations));
        }
      } catch (e) {}
    }, 2000); 

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [students, classes, hiddenClasses, groups, schedule, periodTimes, teacherInfo, currentSemester, assessmentTools, gradeSettings, certificateSettings, defaultStudentGender, categorizations, language]);

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
