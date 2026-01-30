import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Student, ScheduleDay, PeriodTime, Group, AssessmentTool, CertificateSettings } from '../types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface TeacherInfo {
  name: string;
  school: string;
  subject: string;
  governorate: string;
  avatar?: string;
  stamp?: string;
  ministryLogo?: string;
  academicYear?: string;
}

type SyncMode = 'cloud' | 'local';

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

  currentSemester: 1 | 2;
  setCurrentSemester: React.Dispatch<React.SetStateAction<1 | 2>>;

  assessmentTools: AssessmentTool[];
  setAssessmentTools: React.Dispatch<React.SetStateAction<AssessmentTool[]>>;

  certificateSettings: CertificateSettings;
  setCertificateSettings: React.Dispatch<React.SetStateAction<CertificateSettings>>;

  // NEW: Sync mode (cloud/local)
  syncMode: SyncMode;
  setSyncMode: React.Dispatch<React.SetStateAction<SyncMode>>;

  isDataLoaded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// مطابق لملفك: raseddatabasev2.json [file:28]
const DBFILENAME = 'raseddatabasev2.json';

// localStorage keys
const LS_SYNC_MODE = 'rasedSyncMode';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- Initial States ---
  const currentMonth = new Date().getMonth();
  const defaultSemester: 1 | 2 = currentMonth >= 1 && currentMonth <= 7 ? 2 : 1;
  const [currentSemester, setCurrentSemester] = useState<1 | 2>(defaultSemester);

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [hiddenClasses, setHiddenClasses] = useState<string[]>([]);

  const [groups, setGroups] = useState<Group[]>([
    { id: 'g1', name: '', color: 'emerald' },
    { id: 'g2', name: '', color: 'orange' },
    { id: 'g3', name: '', color: 'purple' },
    { id: 'g4', name: '', color: 'blue' },
  ]);

  const [schedule, setSchedule] = useState<ScheduleDay[]>([
    { dayName: '', periods: Array(8).fill('') },
    { dayName: '', periods: Array(8).fill('') },
    { dayName: '', periods: Array(8).fill('') },
    { dayName: '', periods: Array(8).fill('') },
    { dayName: '', periods: Array(8).fill('') },
  ]);

  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(
    Array(8)
      .fill(null)
      .map((_, i) => ({ periodNumber: i + 1, startTime: '', endTime: '' }))
  );

  const now = new Date();
  const defaultAcademicYear =
    now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo>({
    name: '',
    school: '',
    subject: '',
    governorate: '',
    avatar: '',
    stamp: '',
    ministryLogo: '',
    academicYear: String(defaultAcademicYear),
  });

  const [assessmentTools, setAssessmentTools] = useState<AssessmentTool[]>([]);
  const [certificateSettings, setCertificateSettings] = useState<CertificateSettings>({
    title: '',
    bodyText: '',
    showDefaultDesign: true,
  });

  // NEW: syncMode state
  const [syncMode, setSyncMode] = useState<SyncMode>(() => {
    const saved = localStorage.getItem(LS_SYNC_MODE);
    return saved === 'local' || saved === 'cloud' ? saved : 'cloud';
  });

  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        let data: any = null;

        if (Capacitor.isNativePlatform()) {
          try {
            const result = await Filesystem.readFile({
              path: DBFILENAME,
              directory: Directory.Data,
              encoding: Encoding.UTF8,
            });
            data = JSON.parse(result.data as string);
          } catch (e) {
            console.log('No FileSystem data found');
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
              currentSemester: Number(localStorage.getItem('currentSemester') || defaultSemester),
              teacherInfo: {
                name: localStorage.getItem('teacherName') || '',
                school: localStorage.getItem('schoolName') || '',
                subject: localStorage.getItem('subjectName') || '',
                governorate: localStorage.getItem('governorate') || '',
                avatar: localStorage.getItem('teacherAvatar') || '',
                stamp: localStorage.getItem('teacherStamp') || '',
                ministryLogo: localStorage.getItem('ministryLogo') || '',
                academicYear: localStorage.getItem('academicYear') || String(defaultAcademicYear),
              },
              certificateSettings: JSON.parse(localStorage.getItem('certificateSettings') || 'null'),
            };
          }
        }

        // NEW: load syncMode even لو ما في data
        const savedSync = localStorage.getItem(LS_SYNC_MODE);
        if (savedSync === 'local' || savedSync === 'cloud') setSyncMode(savedSync);

        if (data) {
          if (data.students) setStudents(data.students);
          if (data.classes) setClasses(data.classes);
          if (data.hiddenClasses) setHiddenClasses(data.hiddenClasses);

          if (data.groups && data.groups.length > 0) setGroups(data.groups);
          if (data.schedule && data.schedule.length > 0) setSchedule(data.schedule);
          if (data.periodTimes && data.periodTimes.length > 0) setPeriodTimes(data.periodTimes);

          if (data.assessmentTools && data.assessmentTools.length > 0)
            setAssessmentTools(data.assessmentTools);

          if (data.currentSemester) setCurrentSemester(data.currentSemester);

          if (data.teacherInfo) {
            setTeacherInfo((prev) => ({ ...prev, ...data.teacherInfo }));
          }

          if (data.certificateSettings) {
            setCertificateSettings((prev) => ({ ...prev, ...data.certificateSettings }));
          }
        }
      } catch (error) {
        console.error('Failed to load data', error);
      } finally {
        setIsDataLoaded(true);
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 1000);
      }
    };

    loadData();
  }, []);

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
        syncMode, // NEW
      };

      const jsonString = JSON.stringify(dataToSave);

      if (Capacitor.isNativePlatform()) {
        try {
          await Filesystem.writeFile({
            path: DBFILENAME,
            data: jsonString,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
          });
        } catch (e) {
          console.error('Save to FS failed', e);
        }
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
          localStorage.setItem('currentSemester', String(currentSemester));

          localStorage.setItem('teacherName', teacherInfo.name || '');
          localStorage.setItem('academicYear', teacherInfo.academicYear || '');
          localStorage.setItem('teacherAvatar', teacherInfo.avatar || '');
          localStorage.setItem('certificateSettings', JSON.stringify(certificateSettings));

          // NEW
          localStorage.setItem(LS_SYNC_MODE, syncMode);
        }
      } catch (e) {
        console.error('LocalStorage Quota Exceeded or Error', e);
      }
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
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
    syncMode, // NEW dependency
  ]);

  return (
    <AppContext.Provider
      value={{
        students,
        setStudents,
        classes,
        setClasses,
        hiddenClasses,
        setHiddenClasses,
        groups,
        setGroups,
        schedule,
        setSchedule,
        periodTimes,
        setPeriodTimes,
        teacherInfo,
        setTeacherInfo,
        currentSemester,
        setCurrentSemester,
        assessmentTools,
        setAssessmentTools,
        certificateSettings,
        setCertificateSettings,

        syncMode,
        setSyncMode,

        isDataLoaded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};
