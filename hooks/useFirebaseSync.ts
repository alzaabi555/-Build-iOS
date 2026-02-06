// hooks/useFirebaseSync.ts
import { useEffect, useRef } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import type {
  Student,
  ScheduleDay,
  PeriodTime,
  Group,
  AssessmentTool,
  CertificateSettings,
} from "../types";

// هذا الـ hook يقرأ ويكتب وثيقة واحدة لكل معلم: teachers/{teacherId}
interface UseFirebaseSyncParams {
  teacherId: string | null;
  syncMode: "cloud" | "local";

  students: Student[];
  classes: string[];
  hiddenClasses: string[];
  groups: Group[];
  schedule: ScheduleDay[];
  periodTimes: PeriodTime[];
  teacherInfo: any;
  currentSemester: 1 | 2;
  assessmentTools: AssessmentTool[];
  certificateSettings: CertificateSettings;

  setStudents: (v: any) => void;
  setClasses: (v: any) => void;
  setHiddenClasses: (v: any) => void;
  setGroups: (v: any) => void;
  setSchedule: (v: any) => void;
  setPeriodTimes: (v: any) => void;
  setTeacherInfo: (v: any) => void;
  setCurrentSemester: (v: any) => void;
  setAssessmentTools: (v: any) => void;
  setCertificateSettings: (v: any) => void;
}

export const useFirebaseSync = (params: UseFirebaseSyncParams) => {
  const {
    teacherId,
    syncMode,
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
    setStudents,
    setClasses,
    setHiddenClasses,
    setGroups,
    setSchedule,
    setPeriodTimes,
    setTeacherInfo,
    setCurrentSemester,
    setAssessmentTools,
    setCertificateSettings,
  } = params;

  const isApplyingRemote = useRef(false);

  // قراءة من Firestore
  useEffect(() => {
    if (!teacherId || syncMode !== "cloud") return;

    const docRef = doc(db, "teachers", teacherId);

    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data: any = snap.data();

      isApplyingRemote.current = true;

      if (data.students) setStudents(data.students);
      if (data.classes) setClasses(data.classes);
      if (data.hiddenClasses) setHiddenClasses(data.hiddenClasses);
      if (data.groups) setGroups(data.groups);
      if (data.schedule) setSchedule(data.schedule);
      if (data.periodTimes) setPeriodTimes(data.periodTimes);
      if (data.teacherInfo) setTeacherInfo((prev: any) => ({ ...prev, ...data.teacherInfo }));
      if (data.currentSemester) setCurrentSemester(data.currentSemester);
      if (data.assessmentTools) setAssessmentTools(data.assessmentTools);
      if (data.certificateSettings) setCertificateSettings((prev: any) => ({ ...prev, ...data.certificateSettings }));

      isApplyingRemote.current = false;
    });

    return () => unsub();
  }, [teacherId, syncMode]);

  // كتابة إلى Firestore
  useEffect(() => {
    if (!teacherId || syncMode !== "cloud") return;
    if (isApplyingRemote.current) return;

    const docRef = doc(db, "teachers", teacherId);

    const dataToSave = {
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
      updatedAt: new Date().toISOString(),
    };

    const timeout = setTimeout(() => {
      setDoc(docRef, dataToSave, { merge: true }).catch((e) =>
        console.error("Firestore sync error", e)
      );
    }, 2000);

    return () => clearTimeout(timeout);
  }, [
    teacherId,
    syncMode,
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
  ]);
};
