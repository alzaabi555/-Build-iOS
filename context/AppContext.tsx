import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Student, ScheduleDay, PeriodTime, Group, AssessmentTool, CertificateSettings } from '../types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useFirebaseSync } from '../hooks/useFirebaseSync';

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

interface AppProviderProps {
  children: React.ReactNode;
  firebaseUser: { uid: string; email?: string | null } | null;
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

  currentSemester: 1 | 2;
  setCurrentSemester: React.Dispatch<React.SetStateAction<1 | 2>>;

  assessmentTools: AssessmentTool[];
  setAssessmentTools: React.Dispatch<React.SetStateAction<AssessmentTool[]>>;

  certificateSettings: CertificateSettings;
  setCertificateSettings: React.Dispatch<React.SetStateAction<CertificateSettings>>;

  syncMode: SyncMode;
  setSyncMode: React.Dispatch<React.SetStateAction<SyncMode>>;

  isDataLoaded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// مطابق لملفك: raseddatabasev2.json
const DBFILENAME = 'raseddatabasev2.json';

// localStorage keys
const LS_SYNC_MODE = 'rasedSyncMode';

export const AppProvider: React.FC<AppProviderProps> = ({ children, firebaseUser }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // teacherId من Firebase user
  const teacherId = firebaseUser?.uid || null;

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

  const [syncMode, setSyncMode] = useState<SyncMode>(() => {
    const saved = localStorage.getItem(LS_SYNC_MODE);
    return saved === 'local' || saved === 'cloud' ? saved : 'cloud';
  });

  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<any>(null);

  // تحميل البيانات المحلية
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

        const savedSync = localStorage.getItem(LS_SYNC_MODE);
        if (savedSync === 'local' || savedSync === 'cloud') setSyncMode(savedSync);

        if (data) {
          if (data.students) setStudents(data.students);
          if (data.classes) setClasses(data.classes);
          if (data.hiddenClasses) setHiddenClasses(data.hiddenClasses);

          if (data.groups && data.groups.length > 0) setGroups(data.groups);
          if (data.schedule && data.schedule.length > 0) setSchedule(data.schedule);
          if (data.periodTimes && data.periodTimes.length > 0) setPeriodTimes(data.periodTimes);

          if (data.assessmentTool
