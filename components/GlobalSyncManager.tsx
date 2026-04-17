import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CloudSync, Users, GraduationCap, CloudUpload, CloudDownload,
  CheckCircle2, X, AlertCircle, Loader2, Server, Smartphone, Building, Save
} from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../theme/ThemeProvider';
import PageLayout from '../components/PageLayout'; 

const STUDENT_APP_URL = "https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec";
const PARENT_APP_URL = "https://script.google.com/macros/s/AKfycbzKPPsQsM_dIttcYSxRLs6LQuvXhT6Qia5TwJ1Tw4ObQ-eZFZeJhV6epXXjxA9_SwWk/exec";
const DEVICE_SYNC_URL = "https://script.google.com/macros/s/AKfycbxXUII_Q_6K6TuewJ0k44mi8mCB-6LQNbDo9rhVdaVOvYCyKFRNCBuddLe_PyLorCdT/exec";

// 💉 رابط الإدارة (تأكد من وضعه هنا)
const ADMIN_APP_URL = "https://script.google.com/macros/s/AKfycbwZHhZ-RPWUpBGIlw0qTFPUmOPmq9WpcvW4WLklcjb_A9U3MW0luIXYPnHznI29ThpbMA/exec";

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
  
  // 💉 حالة جديدة مخصصة لكود المدرسة (مفصول تماماً عن الرقم المدني)
  const [adminSchoolCode, setAdminSchoolCode] = useState('');

  // استرجاع كود المدرسة المحفوظ مسبقاً عند فتح الصفحة
  useEffect(() => {
    const savedCode = localStorage.getItem('rased_admin_school_code');
    if (savedCode) setAdminSchoolCode(savedCode);
  }, []);

  const handleSync = async (type: 'student' | 'parent' | 'backup' | 'restore' | 'admin') => {
    
    // حماية السحابة المركزية (تتطلب الرقم المدني)
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

    // حماية مزامنة الإدارة (تتطلب كود المدرسة)
    if (type === 'admin' && adminSchoolCode.trim().length < 2) {
      alert("الرجاء إدخال كود المدرسة أولاً للاتصال بنظام الإدارة.");
      return;
    }

    setSyncState('syncing');

    try {
      // 🎓 1. تطبيق الطلاب
      if (type === 'student') {
        setSyncMessage(t('syncingStudentMsg'));
        const savedTasks = JSON.parse(localStorage.getItem('rased_teacher_tasks') || '[]');
        const payload = { students: students, tasks: savedTasks, className: 'الكل' };
        await fetch(STUDENT_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
      }
      
      // 👨‍👩‍👦 2. تطبيق أولياء الأمور
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

     // 🏫 3. تطبيق راصد الإدارة (مستقل ويستخدم كود المدرسة)
      else if (type === 'admin') {
        setSyncMessage('جاري إرسال التقرير الشامل للإدارة...');
        localStorage.setItem('rased_admin_school_code', adminSchoolCode.trim());

        const teacherName = teacherInfo?.name || "معلم غير محدد";
        const todayStr = new Date().toDateString();
        
        let absentStudentsNames: string[] = [];
        let lateStudentsNames: string[] = [];
        let truantStudentsNames: string[] = [];

        // فرز الطلاب حسب حالتهم اليوم
        students.forEach(s => {
            const todayRecord = s.attendance?.find(a => new Date(a.date).toDateString() === todayStr);
            if (todayRecord) {
                if (todayRecord.status === 'absent' || todayRecord.status === 'غائب') absentStudentsNames.push(s.name);
                if (todayRecord.status === 'late' || todayRecord.status === 'متأخر') lateStudentsNames.push(s.name);
                if (todayRecord.status === 'escaped' || todayRecord.status === 'متسرب') truantStudentsNames.push(s.name);
            }
        });

        const adminPayload = {
            schoolCode: adminSchoolCode.trim(),
            teacherName: teacherName,
            className: classes[0] || "كل الفصول", 
            absentStudents: absentStudentsNames,
            lateStudents: lateStudentsNames,
            truantStudents: truantStudentsNames,
            timestamp: new Date().toLocaleString('ar-OM')
        };

       const response = await fetch(ADMIN_APP_URL, {
            method: 'POST',
            // 💉 الحقنة السحرية لاختراق جدار حماية جوجل (CORS)
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(adminPayload)
        });

        const result = await response.json();
        if (result.status !== 'success') throw new Error("فشل الاتصال بنظام الإدارة");
      }
      // ☁️ 4. السحابة المركزية: رفع احتياطي (تستخدم الرقم المدني)
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
      
      // 📥 5. السحابة المركزية: استرجاع البيانات (تستخدم الرقم المدني)
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
    <PageLayout
      title="مركز المزامنة"
      subtitle="إدارة المزامنة والنسخ الاحتياطي"
      icon={<CloudSync size={24} />}
      rightActions={
        <div className="flex items-center gap-3">
          <span className="text-[10px] md:text-xs font-bold flex items-center gap-1 text-success bg-success/10 px-2 py-1 rounded-md border border-success/20">
            <Server className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">متصل</span>
          </span>

          <button
            onClick={() => handleSync('student')}
            className="px-3 md:px-4 py-2 rounded-xl border border-primary bg-primary text-white font-bold flex items-center gap-2 hover:bg-primary/90 transition shadow-md active:scale-95"
          >
            <CloudSync className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">مزامنة سريعة</span>
          </button>
        </div>
      }
    >

      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 pt-4">

        {/* شاشة التحميل */}
        {syncState !== 'idle' && (
          <div className="rounded-2xl border border-borderColor bg-bgCard p-6 flex flex-col items-center justify-center text-center min-h-[200px] shadow-sm animate-in zoom-in-95 duration-300">
            {syncState === 'syncing' && (
              <>
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="font-bold text-textPrimary text-lg">{syncMessage}</p>
              </>
            )}

            {syncState === 'success' && (
              <>
                <CheckCircle2 className="w-12 h-12 mb-4 text-success animate-bounce" />
                <p className="font-bold text-textPrimary text-lg">{syncMessage}</p>
              </>
            )}

            {syncState === 'error' && (
              <>
                <AlertCircle className="w-12 h-12 mb-4 text-danger animate-pulse" />
                <p className="font-bold mb-6 text-textPrimary text-lg">{syncMessage}</p>
                <button onClick={() => setSyncState('idle')} className="px-6 py-2.5 rounded-xl border border-borderColor bg-bgSoft text-textPrimary font-bold hover:bg-bgCard transition active:scale-95">
                  رجوع
                </button>
              </>
            )}
          </div>
        )}

        {syncState === 'idle' && (
          <>
            {/* 📈 الإحصائيات التي تم استرجاعها بنجاح */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-borderColor bg-bgCard p-4 shadow-sm transition-all hover:shadow-md">
                <p className="text-xs font-bold text-textSecondary mb-1">عدد الطلاب</p>
                <h3 className="text-xl md:text-2xl font-black text-textPrimary">{students.length}</h3>
              </div>
              <div className="rounded-xl border border-borderColor bg-bgCard p-4 shadow-sm transition-all hover:shadow-md">
                <p className="text-xs font-bold text-textSecondary mb-1">الفصول</p>
                <h3 className="text-xl md:text-2xl font-black text-textPrimary">{classes.length}</h3>
              </div>
              <div className="rounded-xl border border-borderColor bg-bgCard p-4 shadow-sm transition-all hover:shadow-md">
                <p className="text-xs font-bold text-textSecondary mb-1">الأدوات</p>
                <h3 className="text-xl md:text-2xl font-black text-textPrimary">{assessmentTools.length}</h3>
              </div>
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 shadow-sm transition-all hover:shadow-md">
                <p className="text-xs font-bold text-textSecondary mb-1">الحالة</p>
                <h3 className="text-xl md:text-2xl font-black text-success">جاهز</h3>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">

              {/* 📲 قسم التطبيقات */}
              <div className="md:col-span-2 rounded-3xl border border-borderColor bg-bgCard p-5 space-y-4 shadow-sm">
                <h2 className="font-bold text-lg text-textPrimary border-b border-borderColor pb-3 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  التطبيقات
                </h2>

                {/* تطبيق الطلاب */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-borderColor bg-bgSoft hover:bg-bgCard hover:shadow-md transition">
                  <div className="flex-1">
                    <h4 className="font-bold text-base text-textPrimary">تطبيق الطلاب</h4>
                    <p className="text-xs font-bold text-textSecondary mt-1">إرسال المهام والدرجات</p>
                  </div>
                  <button onClick={() => handleSync('student')} className="w-full sm:w-auto px-5 py-3 rounded-xl border border-primary/30 bg-primary/10 text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition active:scale-95 shrink-0">
                    <GraduationCap className="w-5 h-5" /> مزامنة
                  </button>
                </div>

                {/* تطبيق أولياء الأمور */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-borderColor bg-bgSoft hover:bg-bgCard hover:shadow-md transition">
                  <div className="flex-1">
                    <h4 className="font-bold text-base text-textPrimary">تطبيق أولياء الأمور</h4>
                    <p className="text-xs font-bold text-textSecondary mt-1">مزامنة السلوك والدرجات</p>
                  </div>
                  <button onClick={() => handleSync('parent')} className="w-full sm:w-auto px-5 py-3 rounded-xl border border-warning/30 bg-warning/10 text-warning font-bold flex items-center justify-center gap-2 hover:bg-warning hover:text-white transition active:scale-95 shrink-0">
                    <Users className="w-5 h-5" /> مزامنة
                  </button>
                </div>

                {/* 💉 راصد الإدارة (تم إضافة حقل كود المدرسة المخصص هنا) */}
                <div className="flex flex-col gap-3 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-base text-textPrimary flex items-center gap-2">
                        <Building className="w-5 h-5 text-emerald-600" />
                        راصد الإدارة
                      </h4>
                      <p className="text-xs font-bold text-textSecondary mt-1">إرسال تقرير الغياب والحضور للإدارة</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <input 
                      type="text" 
                      value={adminSchoolCode}
                      onChange={(e) => setAdminSchoolCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="أدخل كود المدرسة (مثال: 88632)"
                      maxLength={6}
                      className="flex-1 px-4 py-3 rounded-xl border border-borderColor bg-bgCard text-textPrimary outline-none focus:border-emerald-500 font-mono text-center sm:text-right"
                    />
                    <button onClick={() => handleSync('admin')} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition active:scale-95 shrink-0">
                      <CloudUpload className="w-5 h-5" /> إرسال للإدارة
                    </button>
                  </div>
                </div>

              </div>

              {/* ☁️ السحابة المركزية (تم استرجاعها) */}
              <div className="rounded-3xl border border-borderColor bg-bgCard p-5 space-y-4 shadow-sm flex flex-col">
                <h2 className="font-bold text-lg text-textPrimary border-b border-borderColor pb-3 flex items-center gap-2">
                  <CloudSync className="w-5 h-5 text-primary" />
                  السحابة المركزية
                </h2>

                <div className="flex flex-col gap-3 flex-1 justify-center">
                  <button onClick={() => handleSync('backup')} className="w-full p-4 rounded-2xl border-2 border-borderColor bg-bgSoft text-textPrimary font-bold flex items-center justify-between hover:bg-bgCard hover:shadow-md transition hover:border-primary group active:scale-95">
                    <span className="text-sm">رفع نسخة احتياطية</span>
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition">
                        <CloudUpload className="w-5 h-5" />
                    </div>
                  </button>

                  <button onClick={() => handleSync('restore')} className="w-full p-4 rounded-2xl border-2 border-borderColor bg-bgSoft text-textPrimary font-bold flex items-center justify-between hover:bg-bgCard hover:shadow-md transition hover:border-success group active:scale-95">
                    <span className="text-sm">استرجاع البيانات</span>
                    <div className="p-2.5 rounded-xl bg-success/10 text-success group-hover:bg-success group-hover:text-white transition">
                        <CloudDownload className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default GlobalSyncManager;
