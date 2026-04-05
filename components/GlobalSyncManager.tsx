import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CloudSync, Users, GraduationCap, CloudUpload, CloudDownload,
  CheckCircle2, X, AlertCircle, Loader2, Server, Smartphone
} from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../theme/ThemeProvider';

const STUDENT_APP_URL = "https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec";
const PARENT_APP_URL = "https://script.google.com/macros/s/AKfycbzKPPsQsM_dIttcYSxRLs6LQuvXhT6Qia5TwJ1Tw4ObQ-eZFZeJhV6epXXjxA9_SwWk/exec";
const DEVICE_SYNC_URL = "https://script.google.com/macros/s/AKfycbxXUII_Q_6K6TuewJ0k44mi8mCB-6LQNbDo9rhVdaVOvYCyKFRNCBuddLe_PyLorCdT/exec";

const GlobalSyncManager: React.FC = () => {
  const { 
    students, setStudents, classes, setClasses, 
    teacherInfo, setTeacherInfo, schedule, setSchedule, 
    periodTimes, setPeriodTimes, dir, t,
    groups = [], assessmentTools = [], categorizations = [], 
    gradeSettings = {}, certificateSettings = {}, hiddenClasses = [], setAssessmentTools
  } = useApp();
  
  const { theme } = useTheme();

  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const handleSync = async (type: 'student' | 'parent' | 'backup' | 'restore') => {
    
    if ((type === 'backup' || type === 'restore') && !teacherInfo?.civilId) {
      alert(t('alertEnterCivilId'));
      return;
    }

    if (type === 'restore') {
      if (!window.confirm(t('alertConfirmPull'))) return;
    }
    if (type === 'backup') {
      if (!window.confirm(t('alertConfirmPush'))) return;
    }

    setSyncState('syncing');

    try {
      // 🎓 1. تحديث تطبيق الطلاب
      if (type === 'student') {
        setSyncMessage(t('syncingStudentMsg'));
        const savedTasks = JSON.parse(localStorage.getItem('rased_teacher_tasks') || '[]');
        const payload = { students: students, tasks: savedTasks, className: 'الكل' };
        await fetch(STUDENT_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
      }
      
      // 👨‍👩‍👦 2. تحديث تطبيق أولياء الأمور
      else if (type === 'parent') {
        setSyncMessage(t('syncingParentMsg'));
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const parentPayload = students
            .filter(s => s.parentCode && s.parentCode.trim() !== "")
            .map(s => {
                const monthlyPoints = (s.behaviors || [])
                    .filter(b => {
                        const d = new Date(b.date);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    })
                    .reduce((acc, b) => acc + b.points, 0);

                return {
                    parentCode: s.parentCode,
                    name: s.name,
                    className: s.classes[0] || "",
                    subject: teacherInfo?.subject || t('unspecified'), 
                    schoolName: teacherInfo?.school || t('unspecified'),
                    totalPoints: monthlyPoints,
                    behaviors: s.behaviors || [],
                    grades: s.grades || [],
                    attendance: s.attendance || [] 
                };
            });

        if (parentPayload.length === 0) throw new Error(t('alertNoCivilIdToSync'));
        await fetch(PARENT_APP_URL, { method: 'POST', body: JSON.stringify(parentPayload) });
      }
      
      // ☁️ 3. الرفع الاحتياطي (Backup)
      else if (type === 'backup') {
        setSyncMessage(t('syncingBackupMsg'));
        const cleanId = teacherInfo.civilId.trim();
        const teacherUniqueId = "id_" + cleanId;
        const forceTimestamp = Date.now(); 

        const recordsToSync = [
          { id: "tools_data", type: "Tools", data: JSON.stringify(assessmentTools), lastUpdated: forceTimestamp },
          { id: "groups_data", type: "Groups", data: JSON.stringify(groups || []), lastUpdated: forceTimestamp },
          { id: "categorizations_data", type: "Categorizations", data: JSON.stringify(categorizations || []), lastUpdated: forceTimestamp },
          { id: "gradeSettings_data", type: "GradeSettings", data: JSON.stringify(gradeSettings), lastUpdated: forceTimestamp },
          { id: "classes_data", type: "Classes", data: JSON.stringify(classes), lastUpdated: forceTimestamp },
          { id: "teacher_info_data", type: "TeacherInfo", data: JSON.stringify(teacherInfo), lastUpdated: forceTimestamp },
          { id: "schedule_data", type: "Schedule", data: JSON.stringify(schedule || {}), lastUpdated: forceTimestamp },
          { id: "periodTimes_data", type: "PeriodTimes", data: JSON.stringify(periodTimes || []), lastUpdated: forceTimestamp },
          { id: "certSettings_data", type: "CertSettings", data: JSON.stringify(certificateSettings || {}), lastUpdated: forceTimestamp },
          { id: "hiddenClasses_data", type: "HiddenClasses", data: JSON.stringify(hiddenClasses || []), lastUpdated: forceTimestamp },
        ];

        if (!students || students.length === 0) {
            recordsToSync.push({ id: "students_chunk_0", type: "StudentsChunk", data: "[]", lastUpdated: forceTimestamp });
        } else {
            const CHUNK_SIZE = 100;
            for (let i = 0; i < students.length; i += CHUNK_SIZE) {
              recordsToSync.push({
                id: `students_chunk_${i}`, 
                type: "StudentsChunk", 
                data: JSON.stringify(students.slice(i, i + CHUNK_SIZE)), 
                lastUpdated: forceTimestamp 
              });
            }
        }

        const response = await fetch(DEVICE_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'sync', teacherPhone: teacherUniqueId, records: recordsToSync })
        });

        const result = await response.json();
        if (result.status !== 'success') throw new Error("Server Error");
      } 
      
      // 📥 4. جلب البيانات (Restore)
      else if (type === 'restore') {
        setSyncMessage(t('syncingRestoreMsg'));
        const cleanId = teacherInfo.civilId.trim();
        const teacherUniqueId = "id_" + cleanId;

        const response = await fetch(DEVICE_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'sync', teacherPhone: teacherUniqueId, records: [] }) 
        });

        const result = await response.json();

        if (result.status === 'success' && result.records && result.records.length > 0) {
          let incomingChunks: any[] = [];
          let hasData = false;

          let newAssessmentTools = assessmentTools;
          let newGroups = groups;
          let newCategorizations = categorizations;
          let newGradeSettings = gradeSettings;
          let newClasses = classes;
          let newTeacherInfo = teacherInfo;
          let newSchedule = schedule;
          let newPeriodTimes = periodTimes;
          let newCertificateSettings = certificateSettings;
          let newHiddenClasses = hiddenClasses;
          let newStudents = students;

          result.records.forEach((serverRec: any) => {
              hasData = true;
              try {
                  const parsedData = JSON.parse(serverRec.data);
                  if (serverRec.id === "tools_data") newAssessmentTools = parsedData;
                  if (serverRec.id === "groups_data") newGroups = parsedData;
                  if (serverRec.id === "categorizations_data") newCategorizations = parsedData;
                  if (serverRec.id === "gradeSettings_data") newGradeSettings = parsedData;
                  if (serverRec.id === "classes_data") newClasses = parsedData;
                  if (serverRec.id === "teacher_info_data") newTeacherInfo = parsedData;
                  if (serverRec.id === "schedule_data") newSchedule = parsedData;
                  if (serverRec.id === "periodTimes_data") newPeriodTimes = parsedData;
                  if (serverRec.id === "certSettings_data") newCertificateSettings = parsedData;
                  if (serverRec.id === "hiddenClasses_data") newHiddenClasses = parsedData;
                  if (serverRec.type === "StudentsChunk") incomingChunks.push({id: serverRec.id, data: parsedData});
              } catch (e) { console.error("Error parsing", e); }
          });

          if (incomingChunks.length > 0) {
              incomingChunks.sort((a, b) => parseInt(a.id.replace('students_chunk_', '')) - parseInt(b.id.replace('students_chunk_', '')));
              newStudents = incomingChunks.reduce((acc, chunk) => acc.concat(chunk.data), []);
              
              const uniqueStudentsMap = new Map();
              newStudents.forEach((student: any) => {
                  if (student && student.id) uniqueStudentsMap.set(student.id, student);
              });
              newStudents = Array.from(uniqueStudentsMap.values());
          } else if (hasData) {
              newStudents = []; 
          }

          if (hasData) {
              const dataToSave = {
                version: '4.4.1',
                timestamp: new Date().toISOString(),
                students: newStudents,
                classes: newClasses,
                hiddenClasses: newHiddenClasses,
                groups: newGroups,
                schedule: newSchedule,
                periodTimes: newPeriodTimes,
                teacherInfo: newTeacherInfo,
                assessmentTools: newAssessmentTools,
                certificateSettings: newCertificateSettings,
                categorizations: newCategorizations,
                gradeSettings: newGradeSettings 
              };

              const jsonString = JSON.stringify(dataToSave, null, 2);
              if (Capacitor.isNativePlatform() || (window as any).electron !== undefined) {
                  await Filesystem.writeFile({ path: 'raseddatabasev2.json', data: jsonString, directory: Directory.Data, encoding: Encoding.UTF8 });
              } else {
                  localStorage.setItem('rased_web_backup', jsonString);
              }

              setStudents(newStudents);
              setClasses(newClasses);
              if (setAssessmentTools) setAssessmentTools(newAssessmentTools);
              setTeacherInfo(newTeacherInfo);
              
              setSyncState('success');
              setSyncMessage(t('syncRestoreSuccess'));
              setTimeout(() => window.location.reload(), 2000);
              return; 
          }
        } else { 
          throw new Error(t('alertNoDataInCloud'));
        }
      }

      setSyncState('success');
      setSyncMessage(t('syncSuccess'));
      setTimeout(() => {
        setSyncState('idle');
      }, 3000);

    } catch (error) {
      console.error(error);
      setSyncState('error');
      setSyncMessage(t('syncError'));
      setTimeout(() => setSyncState('idle'), 4000);
    }
  };

  return (
  <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6 text-textPrimary" dir={dir}>

    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">
          {t('syncMenuTitle')}
        </h1>
        <p className="text-sm text-textSecondary font-bold mt-1">
          {t('syncMenuSubtitle')}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-bold flex items-center gap-1 text-success">
          <Server className="w-4 h-4" />
          {t('connectedStatus')}
        </span>

        <button
          onClick={() => handleSync('student')}
          className="px-4 py-2 rounded-xl border border-primary bg-primary text-white font-bold flex items-center gap-2 hover:bg-primary/90 hover:scale-[1.03] transition shadow-md"
        >
          <CloudSync className="w-4 h-4" />
          {t('quickSyncBtn')}
        </button>
      </div>
    </div>

    {/* Status Section */}
    {syncState !== 'idle' && (
      <div className="rounded-2xl border border-borderColor bg-bgCard p-6 flex flex-col items-center justify-center text-center min-h-[200px] shadow-sm animate-in fade-in">

        {syncState === 'syncing' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
            <p className="font-bold text-textPrimary">{syncMessage}</p>
          </>
        )}

        {syncState === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 mb-4 text-success animate-bounce" />
            <p className="font-bold text-textPrimary">{syncMessage}</p>
          </>
        )}

        {syncState === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 mb-4 text-danger animate-pulse" />
            <p className="font-bold mb-4 text-textPrimary">{syncMessage}</p>
            <button
              onClick={() => setSyncState('idle')}
              className="px-6 py-2 rounded-xl border border-borderColor bg-bgSoft text-textPrimary font-bold hover:bg-bgCard transition"
            >
              {t('backBtn')}
            </button>
          </>
        )}
      </div>
    )}

    {/* Main Grid */}
    {syncState === 'idle' && (
      <>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-borderColor bg-bgCard p-4 shadow-sm">
            <p className="text-xs font-bold text-textSecondary mb-1">{t('studentsCountLabel')}</p>
            <h3 className="text-xl font-black text-textPrimary">{students.length}</h3>
          </div>

          <div className="rounded-xl border border-borderColor bg-bgCard p-4 shadow-sm">
            <p className="text-xs font-bold text-textSecondary mb-1">{t('classesCountLabel')}</p>
            <h3 className="text-xl font-black text-textPrimary">{classes.length}</h3>
          </div>

          <div className="rounded-xl border border-borderColor bg-bgCard p-4 shadow-sm">
            <p className="text-xs font-bold text-textSecondary mb-1">{t('toolsCountLabel')}</p>
            <h3 className="text-xl font-black text-textPrimary">{assessmentTools.length}</h3>
          </div>

          <div className="rounded-xl border border-borderColor bg-bgCard p-4 shadow-sm">
            <p className="text-xs font-bold text-textSecondary mb-1">{t('statusLabel')}</p>
            <h3 className="text-xl font-black text-success">{t('readyStatus')}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* Apps */}
          <div className="md:col-span-2 rounded-2xl border border-borderColor bg-bgCard p-5 space-y-4 shadow-sm">
            <h2 className="font-black text-lg text-textPrimary border-b border-borderColor pb-3">{t('appsSectionTitle')}</h2>

            {/* Student App */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-borderColor bg-bgSoft hover:bg-bgCard hover:shadow-md transition">
              <div>
                <h4 className="font-bold text-textPrimary">{t('studentAppTitle')}</h4>
                <p className="text-xs font-bold text-textSecondary mt-1">{t('studentAppDesc')}</p>
              </div>

              <button
                onClick={() => handleSync('student')}
                className="px-4 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary font-bold flex items-center gap-2 hover:bg-primary hover:text-white transition"
              >
                <GraduationCap className="w-4 h-4" />
                {t('syncBtn')}
              </button>
            </div>

            {/* Parent App */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-borderColor bg-bgSoft hover:bg-bgCard hover:shadow-md transition">
              <div>
                <h4 className="font-bold text-textPrimary">{t('parentAppTitle')}</h4>
                <p className="text-xs font-bold text-textSecondary mt-1">{t('parentAppDesc')}</p>
              </div>

              <button
                onClick={() => handleSync('parent')}
                className="px-4 py-2 rounded-xl border border-warning/30 bg-warning/10 text-warning font-bold flex items-center gap-2 hover:bg-warning hover:text-white transition"
              >
                <Users className="w-4 h-4" />
                {t('syncBtn')}
              </button>
            </div>

          </div>

          {/* Backup & Restore */}
          <div className="rounded-2xl border border-borderColor bg-bgCard p-5 space-y-4 shadow-sm">
            <h2 className="font-black text-lg text-textPrimary border-b border-borderColor pb-3">{t('cloudSectionTitle')}</h2>

            <button
              onClick={() => handleSync('backup')}
              className="w-full p-4 rounded-xl border border-borderColor bg-bgSoft text-textPrimary font-bold flex items-center justify-between hover:bg-bgCard hover:shadow-md transition hover:border-primary group"
            >
              <span>{t('uploadBackupBtn')}</span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition">
                  <CloudUpload className="w-5 h-5" />
              </div>
            </button>

            <button
              onClick={() => handleSync('restore')}
              className="w-full p-4 rounded-xl border border-borderColor bg-bgSoft text-textPrimary font-bold flex items-center justify-between hover:bg-bgCard hover:shadow-md transition hover:border-success group"
            >
              <span>{t('restoreDataBtn')}</span>
              <div className="p-2 rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-white transition">
                  <CloudDownload className="w-5 h-5" />
              </div>
            </button>
          </div>

        </div>
      </>
    )}
  </div>
);
};

export default GlobalSyncManager;
