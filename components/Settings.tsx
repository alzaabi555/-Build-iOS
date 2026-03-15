import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, AlertTriangle, FileJson, Trash2, 
  Download, RefreshCw, Loader2, Zap, Database, ArrowRight, Cloud, CheckCircle, XCircle 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import Modal from './Modal';

// ⚠️ استبدل هذا الرابط برابط الـ API السري الخاص بك
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXUII_Q_6K6TuewJ0k44mi8mCB-6LQNbDo9rhVdaVOvYCyKFRNCBuddLe_PyLorCdT/exec";

// ✅ أيقونات 3D فخمة
const Icon3DProfile = ({ isRamadan }: { isRamadan?: boolean }) => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="gradP" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isRamadan ? "#fbbf24" : "#3b82f6"} />
        <stop offset="100%" stopColor={isRamadan ? "#b45309" : "#1d4ed8"} />
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="50" cy="35" r="18" fill="url(#gradP)" filter="url(#glow)" />
    <path d="M20 85 Q50 100 80 85 V75 Q50 55 20 75 Z" fill="url(#gradP)" />
  </svg>
);

const Icon3DDatabase = ({ isRamadan }: { isRamadan?: boolean }) => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="gradD" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isRamadan ? "#34d399" : "#10b981"} />
        <stop offset="100%" stopColor={isRamadan ? "#064e3b" : "#059669"} />
      </linearGradient>
    </defs>
    <path d="M20 30 Q50 15 80 30 V70 Q50 85 20 70 Z" fill="url(#gradD)" filter="url(#glow)" />
    <path d="M20 50 Q50 35 80 50" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
  </svg>
);

const Icon3DSync = ({ isRamadan }: { isRamadan?: boolean }) => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="gradS" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isRamadan ? "#c084fc" : "#8b5cf6"} />
        <stop offset="100%" stopColor={isRamadan ? "#581c87" : "#4c1d95"} />
      </linearGradient>
    </defs>
    <path d="M10 50 Q30 20 50 30 T90 50 Q70 80 50 70 T10 50 Z" fill="url(#gradS)" filter="url(#glow)" />
    <circle cx="50" cy="50" r="15" fill="#fff" fillOpacity="0.2" />
  </svg>
);

const Settings = () => {
  const { 
    teacherInfo, setTeacherInfo, students, setStudents, 
    classes, setClasses, schedule, setSchedule, 
    periodTimes, setPeriodTimes, assessmentTools, setAssessmentTools,
    certificateSettings, setCertificateSettings, hiddenClasses, setHiddenClasses,
    groups, setGroups, categorizations, setCategorizations, gradeSettings, setGradeSettings
  } = useApp();

  const [name, setName] = useState(teacherInfo?.name || '');
  const [school, setSchool] = useState(teacherInfo?.school || '');
  const [loading, setLoading] = useState<'backup' | 'restore' | 'reset' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [isRamadan] = useState(() => {
      try {
          const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' }).formatToParts(new Date());
          return parseInt(parts.find(p => p.type === 'month')?.value || '0') === 9;
      } catch(e) { return false; }
  });

  useEffect(() => {
      setName(teacherInfo?.name || '');
      setSchool(teacherInfo?.school || '');
  }, [teacherInfo]);

  // ==========================================
  // 🚀 محرك المزامنة السحابية (Heavy Payload Version)
  // ==========================================
  const handleCloudSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      if (!teacherInfo.name) {
        alert("يرجى إدخال اسم المعلم أولاً في الملف الشخصي ليتم استخدامه كمعرف للمزامنة.");
        setIsSyncing(false);
        return;
      }

      const teacherId = "teacher_" + teacherInfo.name.replace(/\s+/g, '_');

      // 2. جلب التوقيت المحلي (التعديل: 0 للأجهزة الجديدة)
      let localLastUpdated = Number(localStorage.getItem('lastLocalUpdate'));
      if (!localLastUpdated) {
        localLastUpdated = 0; 
      }

      // 3. تجهيز الكبسولات الأساسية
      const recordsToSync = [
        { id: "tools_data", type: "Tools", data: JSON.stringify(assessmentTools), lastUpdated: localLastUpdated },
        { id: "groups_data", type: "Groups", data: JSON.stringify(groups || []), lastUpdated: localLastUpdated },
        { id: "categorizations_data", type: "Categorizations", data: JSON.stringify(categorizations || []), lastUpdated: localLastUpdated },
        { id: "gradeSettings_data", type: "GradeSettings", data: JSON.stringify(gradeSettings), lastUpdated: localLastUpdated },
        { id: "classes_data", type: "Classes", data: JSON.stringify(classes), lastUpdated: localLastUpdated },
        { id: "teacher_info_data", type: "TeacherInfo", data: JSON.stringify(teacherInfo), lastUpdated: localLastUpdated },
      ];

      // 🚀 4. تقسيم الطلاب لكتل (Chunks) - كل 100 طالب في صف مستقل
      const CHUNK_SIZE = 100;
      for (let i = 0; i < students.length; i += CHUNK_SIZE) {
        recordsToSync.push({
          id: `students_chunk_${i}`, 
          type: "StudentsChunk", 
          data: JSON.stringify(students.slice(i, i + CHUNK_SIZE)), 
          lastUpdated: localLastUpdated 
        });
      }

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'sync',
          teacherPhone: teacherId,
          records: recordsToSync
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        let updatedLocally = false;
        let shouldUpdateStudents = false;
        let newStudentsList: any[] = [];

        result.records.forEach((serverRec: any) => {
          if (serverRec.lastUpdated > localLastUpdated) {
            updatedLocally = true;
            const parsedData = JSON.parse(serverRec.data);
            
            if (serverRec.id === "tools_data") setAssessmentTools(parsedData);
            if (serverRec.id === "groups_data") setGroups(parsedData);
            if (serverRec.id === "categorizations_data") setCategorizations(parsedData);
            if (serverRec.id === "gradeSettings_data") setGradeSettings(parsedData);
            if (serverRec.id === "classes_data") setClasses(parsedData);
            if (serverRec.id === "teacher_info_data") setTeacherInfo(parsedData);
            
            if (serverRec.type === "StudentsChunk") shouldUpdateStudents = true;
          }
        });

        if (shouldUpdateStudents) {
            result.records.forEach((serverRec: any) => {
                if (serverRec.type === "StudentsChunk") {
                    newStudentsList = newStudentsList.concat(JSON.parse(serverRec.data));
                }
            });
            setStudents(newStudentsList);
        }

        if (updatedLocally) {
             const maxServerTime = Math.max(...result.records.map((r: any) => r.lastUpdated));
             localStorage.setItem('lastLocalUpdate', maxServerTime.toString());
        }
        
        setSyncStatus('success');
        alert(updatedLocally ? "✅ تمت المزامنة بنجاح! تم تحديث بياناتك من السحابة." : "✅ تمت المزامنة! بياناتك الحالية هي الأحدث.");
      } else { throw new Error("فشل المزامنة"); }
    } catch (error) {
      setSyncStatus('error');
      alert("❌ حدث خطأ أثناء المزامنة.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // ... (بقية دوال handleBackup و handleRestore و handleFactoryReset كما هي لديك)

  return (
    // ... (نفس الـ JSX الجميل الذي صممناه سابقاً)
  );
};
