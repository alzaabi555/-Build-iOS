
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Student, ScheduleDay, PeriodTime, Group, AssessmentTool, CertificateSettings } from '../types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { auth } from '../services/firebase';
import { saveTeacherData, subscribeToTeacherData, migrateLocalToCloud } from '../services/syncService'; // استيراد الخدمة الجديدة

interface TeacherInfo {
    name: string;
    school: string;
    subject: string;
    governorate: string;
    avatar?: string;
    stamp?: string;
    ministryLogo?: string;
    academicYear?: string;
    gender?: 'male' | 'female'; // إضافة الجنس
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
  certificateSettings: CertificateSettings;
  setCertificateSettings: React.Dispatch<React.SetStateAction<CertificateSettings>>;
  isDataLoaded: boolean;
  currentUser: any | null;
  defaultStudentGender: 'male' | 'female';
  setDefaultStudentGender: React.Dispatch<React.SetStateAction<'male' | 'female'>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DB_FILENAME = 'rased_database_v2.json';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  
  // --- Initial States ---
  const currentMonth = new Date().getMonth();
  const defaultSemester = (currentMonth >= 1 && currentMonth <= 7) ? '2' : '1';

  const [currentSemester, setCurrentSemester] = useState<'1' | '2'>(defaultSemester);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [hiddenClasses, setHiddenClasses] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([
      { id: 'g1', name: 'الصقور', color: 'emerald' }, 
      { id: 'g2', name: 'النمور', color: 'orange' }, 
      { id: 'g3', name: 'النجوم', color: 'purple' }, 
      { id: 'g4', name: 'الرواد', color: 'blue' }
  ]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([
    { dayName: 'الأحد', periods: Array(8).fill('') }, { dayName: 'الاثنين', periods: Array(8).fill('') }, 
    { dayName: 'الثلاثاء', periods: Array(8).fill('') }, { dayName: 'الأربعاء', periods: Array(8).fill('') }, 
    { dayName: 'الخميس', periods: Array(8).fill('') }
  ]);
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(
    Array(8).fill(null).map((_, i) => ({ periodNumber: i + 1, startTime: '', endTime: '' }))
  );
  
  const now = new Date();
  const defaultAcademicYear = now.getMonth() < 7 ? `${now.getFullYear() - 1} / ${now.getFullYear()}` : `${now.getFullYear()} / ${now.getFullYear() + 1}`;

  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>({ 
      name: '', school: '', subject: '', governorate: '', avatar: '', stamp: '', ministryLogo: '', academicYear: defaultAcademicYear, gender: 'male' 
  });

  const [defaultStudentGender, setDefaultStudentGender] = useState<'male' | 'female'>('male');

  const [assessmentTools, setAssessmentTools] = useState<AssessmentTool[]>([]);
  const [certificateSettings, setCertificateSettings] = useState<CertificateSettings>({
      title: 'شهادة تفوق دراسي',
      bodyText: 'تتشرف إدارة المدرسة بمنح الطالب هذه الشهادة نظير تفوقه وتميزه في المادة',
      showDefaultDesign: true
  });

  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<any>(null);

  // 1. Load Local Data First
  useEffect(() => {
    const loadLocalData = async () => {
        try {
            let data: any = null;

            if (Capacitor.isNativePlatform()) {
                try {
                    const result = await Filesystem.readFile({
                        path: DB_FILENAME,
                        directory: Directory.Data,
                        encoding: Encoding.UTF8
                    });
                    data = JSON.parse(result.data as string);
                } catch (e) {
                    console.log('📂 No FileSystem data found');
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
                        schedule: JSON.parse(localStorage.getItem('scheduleData') || '[]'),
                        periodTimes: JSON.parse(localStorage.getItem('periodTimes') || '[]'),
                        assessmentTools: JSON.parse(localStorage.getItem('assessmentTools') || '[]'),
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
                            gender: localStorage.getItem('teacherGender') || 'male'
                        },
                        certificateSettings: JSON.parse(localStorage.getItem('certificateSettings') || 'null'),
                        defaultStudentGender: localStorage.getItem('defaultStudentGender') || 'male'
                    };
                }
            }

            if (data) {
                if(data.students) setStudents(data.students);
                if(data.classes) setClasses(data.classes);
                if(data.hiddenClasses) setHiddenClasses(data.hiddenClasses);
                if(data.groups && data.groups.length > 0) setGroups(data.groups);
                if(data.schedule && data.schedule.length > 0) setSchedule(data.schedule);
                if(data.periodTimes && data.periodTimes.length > 0) setPeriodTimes(data.periodTimes);
                if(data.assessmentTools && data.assessmentTools.length > 0) setAssessmentTools(data.assessmentTools);
                if(data.currentSemester) setCurrentSemester(data.currentSemester);
                if(data.teacherInfo) setTeacherInfo(prev => ({...prev, ...data.teacherInfo}));
                if(data.certificateSettings) setCertificateSettings(prev => ({...prev, ...data.certificateSettings}));
                if(data.defaultStudentGender) setDefaultStudentGender(data.defaultStudentGender);
            }

        } catch (error) {
            console.error('Failed to load local data:', error);
        } finally {
            setIsDataLoaded(true);
            setTimeout(() => { isInitialLoad.current = false; }, 1000);
        }
    };

    loadLocalData();
  }, []);

  // 2. Listen for Auth State & Sync via Service
  useEffect(() => {
      const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
          setCurrentUser(user);
          if (user) {
              console.log("👤 Logged in:", user.email);
              
              // أ. محاولة ترحيل البيانات المحلية للسحابة إذا كان حساباً جديداً
              // نمرر البيانات الحالية الموجودة في الـ State
              const currentData = {
                  version: '3.6.0',
                  timestamp: new Date().toISOString(),
                  students, classes, hiddenClasses, groups, schedule, periodTimes, teacherInfo, assessmentTools, certificateSettings, defaultStudentGender
              };
              
              if (students.length > 0) {
                  await migrateLocalToCloud(user.uid, currentData);
              }

              // ب. الاشتراك في التحديثات الحية باستخدام الخدمة
              const unsubscribeFirestore = subscribeToTeacherData(user.uid, (data) => {
                  if (data.students) setStudents(data.students);
                  if (data.classes) setClasses(data.classes);
                  if (data.hiddenClasses) setHiddenClasses(data.hiddenClasses);
                  if (data.groups) setGroups(data.groups);
                  if (data.schedule) setSchedule(data.schedule);
                  if (data.periodTimes) setPeriodTimes(data.periodTimes);
                  if (data.teacherInfo) setTeacherInfo(data.teacherInfo);
                  if (data.assessmentTools) setAssessmentTools(data.assessmentTools);
                  if (data.certificateSettings) setCertificateSettings(data.certificateSettings);
                  if (data.defaultStudentGender) setDefaultStudentGender(data.defaultStudentGender);
              });

              // تنظيف الاشتراك عند الخروج
              return () => unsubscribeFirestore();
          }
      });
      return unsubscribeAuth;
  }, [students.length > 0]); // Dependency for migration check

  // 3. Save Logic (Debounced) - Hybrid Save
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
        const dataToSave = {
            version: '3.6.0',
            timestamp: new Date().toISOString(),
            students,
            classes,
            hiddenClasses,
            groups,
            schedule,
            periodTimes,
            teacherInfo,
            currentSemester,
            assessmentTools,
            certificateSettings,
            defaultStudentGender
        };

        const jsonString = JSON.stringify(dataToSave);

        // A. Always save Locally (Backup/Offline)
        if (Capacitor.isNativePlatform()) {
            try {
                await Filesystem.writeFile({
                    path: DB_FILENAME,
                    data: jsonString,
                    directory: Directory.Data,
                    encoding: Encoding.UTF8
                });
            } catch (e) { console.error('Save to FS failed', e); }
        } 
        
        try {
            if (jsonString.length < 4500000) {
                localStorage.setItem('studentData', JSON.stringify(students));
                localStorage.setItem('classesData', JSON.stringify(classes));
                localStorage.setItem('hiddenClasses', JSON.stringify(hiddenClasses));
                localStorage.setItem('groupsData', JSON.stringify(groups));
                localStorage.setItem('scheduleData', JSON.stringify(schedule));
                localStorage.setItem('periodTimes', JSON.stringify(periodTimes));
                localStorage.setItem('assessmentTools', JSON.stringify(assessmentTools));
                localStorage.setItem('currentSemester', currentSemester);
                localStorage.setItem('teacherName', teacherInfo.name);
                localStorage.setItem('teacherGender', teacherInfo.gender || 'male'); // حفظ الجنس
                localStorage.setItem('academicYear', teacherInfo.academicYear || '');
                localStorage.setItem('certificateSettings', JSON.stringify(certificateSettings));
                localStorage.setItem('teacherAvatar', teacherInfo.avatar || '');
                localStorage.setItem('defaultStudentGender', defaultStudentGender);
            }
        } catch (e) { console.error('LocalStorage Quota Exceeded'); }

        // B. Save to Cloud using Service if Logged In
        if (currentUser) {
            saveTeacherData(currentUser.uid, dataToSave);
        }

    }, 3000); 

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [students, classes, hiddenClasses, groups, schedule, periodTimes, teacherInfo, currentSemester, assessmentTools, certificateSettings, defaultStudentGender, currentUser]);

  return (
    <AppContext.Provider value={{
        students, setStudents,
        classes, setClasses,
        hiddenClasses, setHiddenClasses,
        groups, setGroups,
        schedule, setSchedule,
        periodTimes, setPeriodTimes,
        teacherInfo, setTeacherInfo,
        currentSemester, setCurrentSemester,
        assessmentTools, setAssessmentTools,
        certificateSettings, setCertificateSettings,
        isDataLoaded,
        currentUser,
        defaultStudentGender, setDefaultStudentGender
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
