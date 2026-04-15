import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CloudSync, Users, GraduationCap, CloudUpload, CloudDownload,
  CheckCircle2, X, AlertCircle, Loader2, Server, Smartphone, Building
} from 'lucide-react'; // 💉 تمت إضافة أيقونة Building للإدارة
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../theme/ThemeProvider';
import PageLayout from '../components/PageLayout'; 

const STUDENT_APP_URL = "https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec";
const PARENT_APP_URL = "https://script.google.com/macros/s/AKfycbzKPPsQsM_dIttcYSxRLs6LQuvXhT6Qia5TwJ1Tw4ObQ-eZFZeJhV6epXXjxA9_SwWk/exec";
const DEVICE_SYNC_URL = "https://script.google.com/macros/s/AKfycbxXUII_Q_6K6TuewJ0k44mi8mCB-6LQNbDo9rhVdaVOvYCyKFRNCBuddLe_PyLorCdT/exec";

// 💉 إضافة الجراح: رابط العقل المدبر لراصد الإدارة (ضع الرابط الجديد هنا)
const ADMIN_APP_URL = "https://script.google.com/macros/s/AKfycbwLErSPojSjPzOmzcJfT3yVQ-vamH2le2EbkAnJguWQi9w8knmy5WfniKQK35TIa0bc8w/exec";

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

  // 💉 تحديث نوع البيانات ليقبل 'admin'
  const handleSync = async (type: 'student' | 'parent' | 'backup' | 'restore' | 'admin') => {
    
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

      // 🏫 3. إرسال البيانات لـ "راصد الإدارة" (إضافة الجراح)
      else if (type === 'admin') {
        setSyncMessage('جاري إرسال تقرير الغياب للإدارة...');
        
        // جلب كود المدرسة (بما أنه غير موجود صراحة، سنستخدم حقل 'school' أو 'civilId' كمفتاح مؤقت)
        const schoolCode = teacherInfo?.civilId || teacherInfo?.school || "0000";
        const teacherName = teacherInfo?.name || "معلم غير محدد";
        
        // استخراج الغياب لليوم الحالي فقط
        const todayStr = new Date().toDateString();
        let absentStudentsNames: string[] = [];

        students.forEach(s => {
            const todayRecord = s.attendance?.find(a => new Date(a.date).toDateString() === todayStr);
            // إذا كان سجل اليوم موجوداً وحالته غائب (تأكد من الكلمة المستخدمة في كودك للغياب، غالباً 'absent' أو 'غائب')
            if (todayRecord && (todayRecord.status === 'absent' || todayRecord.status === 'غائب')) {
                absentStudentsNames.push(s.name);
            }
        });

        const adminPayload = {
            schoolCode: schoolCode,
            teacherName: teacherName,
            className: classes[0] || "كل الفصول", // نأخذ اسم أول فصل كواجهة
            absentStudents: absentStudentsNames,
            timestamp: new Date().toLocaleString('ar-OM') // بتوقيت السلطنة
        };

        const response = await fetch(ADMIN_APP_URL, {
            method: 'POST',
            body: JSON.stringify(adminPayload)
        });

        const result = await response.json();
        if (result.status !== 'success') throw new Error("فشل الاتصال بنظام الإدارة");
      }
      
      // ☁️ 4. الرفع الاحتياطي (Backup)
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
      
      // 📥 5. جلب البيانات (Restore)
      else if (type === 'restore') {
        // ... (باقي كود استرجاع البيانات كما هو في كودك الأصلي تماماً لحفظ المساحة)
        setSyncMessage(t('syncingRestoreMsg'));
        // ... [نفس كود الاسترجاع الخاص بك لم يتغير]
        setSyncState('success');
        setSyncMessage(t('syncRestoreSuccess'));
        return; 
      }

      // رسالة النجاح المشتركة
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
      title={t('syncMenuTitle')}
      subtitle={t('syncMenuSubtitle')}
      icon={<CloudSync size={24} />}
      rightActions={
        <div className="flex items-center gap-3">
          <span className="text-[10px] md:text-xs font-bold flex items-center gap-1 text-success bg-success/10 px-2 py-1 rounded-md border border-success/20">
            <Server className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">{t('connectedStatus')}</span>
          </span>

          <button
            onClick={() => handleSync('student')}
            className="px-3 md:px-4 py-2 rounded-xl border border-primary bg-primary text-white font-bold flex items-center gap-2 hover:bg-primary/90 transition shadow-md active:scale-95"
            title={t('quickSyncBtn')}
          >
            <CloudSync className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">{t('quickSyncBtn')}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 pt-4">

        {syncState !== 'idle' && (
           /* ... (مربع رسائل التحميل كما هو في كودك) ... */
           <div className="rounded-2xl border border-borderColor bg-bgCard p-6 flex flex-col items-center justify-center text-center min-h-[200px] shadow-sm animate-in zoom-in-95 duration-300">
             {syncState === 'syncing' && (
               <>
                 <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                 <p className="font-bold text-textPrimary text-lg">{syncMessage}</p>
               </>
             )}
             {/* ... باقي الحالات ... */}
           </div>
        )}

        {syncState === 'idle' && (
          <>
            {/* 📈 Stats (كما هي) */}
            
            {/* 📱 Content Apps & Cloud */}
            <div className="grid md:grid-cols-3 gap-6">

              {/* 📲 Apps */}
              <div className="md:col-span-2 rounded-3xl border border-borderColor bg-bgCard p-5 space-y-4 shadow-sm">
                <h2 className="font-bold text-lg text-textPrimary border-b border-borderColor pb-3 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  {t('appsSectionTitle')}
                </h2>

                {/* 1. Student App */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-borderColor bg-bgSoft hover:bg-bgCard hover:shadow-md transition">
                  <div className="flex-1">
                    <h4 className="font-bold text-base text-textPrimary">{t('studentAppTitle')}</h4>
                    <p className="text-xs font-bold text-textSecondary mt-1 leading-relaxed">{t('studentAppDesc')}</p>
                  </div>
                  <button
                    onClick={() => handleSync('student')}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-primary/30 bg-primary/10 text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition active:scale-95 shrink-0"
                  >
                    <GraduationCap className="w-5 h-5" />
                    {t('syncBtn')}
                  </button>
                </div>

                {/* 2. Parent App */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-borderColor bg-bgSoft hover:bg-bgCard hover:shadow-md transition">
                  <div className="flex-1">
                    <h4 className="font-bold text-base text-textPrimary">{t('parentAppTitle')}</h4>
                    <p className="text-xs font-bold text-textSecondary mt-1 leading-relaxed">{t('parentAppDesc')}</p>
                  </div>
                  <button
                    onClick={() => handleSync('parent')}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-warning/30 bg-warning/10 text-warning font-bold flex items-center justify-center gap-2 hover:bg-warning hover:text-white transition active:scale-95 shrink-0"
                  >
                    <Users className="w-5 h-5" />
                    {t('syncBtn')}
                  </button>
                </div>

                {/* 3. Admin App (إضافة الجراح الجديدة) 🚀 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-borderColor bg-bgSoft hover:bg-bgCard hover:shadow-md transition">
                  <div className="flex-1">
                    <h4 className="font-bold text-base text-textPrimary">راصد الإدارة</h4>
                    <p className="text-xs font-bold text-textSecondary mt-1 leading-relaxed">إرسال تقرير الغياب والحضور لليوم الحالي إلى لوحة تحكم مدير المدرسة.</p>
                  </div>
                  <button
                    onClick={() => handleSync('admin')}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition active:scale-95 shrink-0"
                  >
                    <Building className="w-5 h-5" />
                    إرسال التقرير
                  </button>
                </div>

              </div>

              {/* ☁️ Backup & Restore (كما هو) */}
              <div className="rounded-3xl border border-borderColor bg-bgCard p-5 space-y-4 shadow-sm flex flex-col">
                {/* ... (كود النسخ الاحتياطي كما هو في ملفك) ... */}
              </div>

            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default GlobalSyncManager;
