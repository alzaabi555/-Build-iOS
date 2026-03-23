import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CloudSync, Users, GraduationCap, CloudUpload, CloudDownload,
  CheckCircle2, X, AlertCircle, Loader2, Server, Smartphone
} from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

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
  
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const isRamadan = true;

  const handleSync = async (type: 'student' | 'parent' | 'backup' | 'restore') => {
    
    if ((type === 'backup' || type === 'restore') && !teacherInfo?.civilId) {
      alert(t('alertEnterCivilId') || 'الرجاء إدخال الرقم المدني في الإعدادات أولاً!');
      return;
    }

    if (type === 'restore') {
      if (!window.confirm(t('alertConfirmPull') || "تحذير خطير: سيتم استبدال كل بياناتك الحالية بالبيانات المحفوظة في السحابة. هل أنت متأكد؟")) return;
    }
    if (type === 'backup') {
      if (!window.confirm(t('alertConfirmPush') || "هل أنت متأكد من رفع بياناتك الحالية للسحابة كنسخة احتياطية؟")) return;
    }

    setSyncState('syncing');

    try {
      // 🎓 1. تحديث تطبيق الطلاب
      if (type === 'student') {
        setSyncMessage(t('syncingMsg') || 'جاري تحديث بيانات تطبيق الطلاب والمهام...');
        const savedTasks = JSON.parse(localStorage.getItem('rased_teacher_tasks') || '[]');
        const payload = { students: students, tasks: savedTasks, className: 'الكل' };
        await fetch(STUDENT_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
      }
      
      // 👨‍👩‍👦 2. تحديث تطبيق أولياء الأمور
      else if (type === 'parent') {
        setSyncMessage(t('syncingMsg') || 'جاري معالجة ومزامنة بيانات أولياء الأمور...');
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
                    subject: teacherInfo?.subject || t('unspecified') || 'عام', 
                    schoolName: teacherInfo?.school || t('unspecified') || 'عام',
                    totalPoints: monthlyPoints,
                    behaviors: s.behaviors || [],
                    grades: s.grades || [],
                    attendance: s.attendance || [] 
                };
            });

        if (parentPayload.length === 0) throw new Error(t('alertNoCivilIdToSync') || 'لا يوجد طلاب لديهم رقم مدني للمزامنة!');
        await fetch(PARENT_APP_URL, { method: 'POST', body: JSON.stringify(parentPayload) });
      }
      
      // ☁️ 3. الرفع الاحتياطي (Backup)
      else if (type === 'backup') {
        setSyncMessage(t('syncingMsg') || 'جاري تقسيم البيانات ورفعها بأمان للسحابة...');
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
        setSyncMessage(t('syncingMsg') || 'جاري جلب بياناتك من السحابة وتجميعها...');
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
              setSyncMessage(t('syncSuccess') || 'تم استرجاع بياناتك بنجاح! سيتم إعادة تشغيل التطبيق...');
              setTimeout(() => window.location.reload(), 2000);
              return; 
          }
        } else { 
          throw new Error(t('alertNoDataInCloud') || 'لا توجد بيانات محفوظة أو فشل الجلب');
        }
      }

      setSyncState('success');
      setSyncMessage(t('syncSuccess') || 'تمت المزامنة بنجاح! ✨');
      setTimeout(() => {
        setSyncState('idle');
      }, 3000);

    } catch (error) {
      console.error(error);
      setSyncState('error');
      setSyncMessage(t('syncError') || 'فشل الاتصال! يرجى التأكد من اتصال الإنترنت والمحاولة مجدداً.');
      setTimeout(() => setSyncState('idle'), 4000);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500" dir={dir}>
      
      {/* 🌟 ترويسة صفحة المزامنة */}
      <div className={`p-6 rounded-[2.5rem] shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden ${isRamadan ? 'bg-[#1e1b4b] border border-white/5' : 'bg-white border border-slate-100'}`}>
        <div className={`p-4 rounded-3xl mb-4 ${isRamadan ? 'bg-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.3)]' : 'bg-cyan-100'}`}>
          <CloudSync className={`w-10 h-10 ${isRamadan ? 'text-cyan-400' : 'text-cyan-600'}`} />
        </div>
        <h2 className={`text-2xl font-black mb-2 ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
          {t('syncMenuTitle') || 'مركز مزامنة السحابة'}
        </h2>
        <p className={`text-sm max-w-md ${isRamadan ? 'text-indigo-200' : 'text-slate-500'}`}>
          من هنا يمكنك مزامنة بياناتك مع تطبيقات الطلاب وأولياء الأمور، أو أخذ نسخة احتياطية لبياناتك بالكامل لاسترجاعها لاحقاً.
        </p>
      </div>

      {/* 🔄 حالات التحميل والنجاح والخطأ (تظهر بدلاً من الأزرار أثناء العملية) */}
      {syncState !== 'idle' ? (
        <div className={`p-12 rounded-[2.5rem] shadow-lg flex flex-col items-center justify-center text-center min-h-[300px] border ${isRamadan ? 'bg-[#1e293b] border-white/5' : 'bg-white border-slate-100'}`}>
          
          {syncState === 'syncing' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <Loader2 className={`w-16 h-16 animate-spin mb-6 ${isRamadan ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <p className={`text-lg font-black ${isRamadan ? 'text-cyan-100' : 'text-slate-700'}`}>{syncMessage}</p>
            </div>
          )}

          {syncState === 'success' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ${isRamadan ? 'bg-emerald-500/20 border-2 border-emerald-500/30' : 'bg-emerald-100'}`}>
                <CheckCircle2 className={`w-12 h-12 ${isRamadan ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <p className={`text-lg font-black ${isRamadan ? 'text-emerald-100' : 'text-slate-700'}`}>{syncMessage}</p>
            </div>
          )}

          {syncState === 'error' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ${isRamadan ? 'bg-rose-500/20 border-2 border-rose-500/30' : 'bg-rose-100'}`}>
                <AlertCircle className={`w-12 h-12 ${isRamadan ? 'text-rose-400' : 'text-rose-600'}`} />
              </div>
              <p className={`text-lg font-black mb-6 ${isRamadan ? 'text-rose-100' : 'text-slate-700'}`}>{syncMessage}</p>
              <button onClick={() => setSyncState('idle')} className={`px-6 py-3 rounded-xl font-bold transition-all active:scale-95 ${isRamadan ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                {t('closeBtn') || 'الرجوع للمركز'}
              </button>
            </div>
          )}
        </div>
      ) : (
        
        /* 🎛️ شبكة الأزرار الكبيرة */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          
          {/* كرت مزامنة الطلاب */}
          <button onClick={() => handleSync('student')} className={`group p-6 rounded-[2rem] flex flex-col items-start gap-4 transition-all duration-300 active:scale-[0.98] border shadow-lg ${isRamadan ? 'bg-gradient-to-br from-[#1e1b4b] to-[#312e81] border-indigo-500/20 hover:border-indigo-400/50' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
            <div className={`p-4 rounded-2xl transition-colors ${isRamadan ? 'bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500/40' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200'}`}>
              <Smartphone className="w-8 h-8" />
            </div>
            <div className={`text-right ${dir === 'ltr' ? 'text-left' : ''}`}>
              <h3 className={`text-lg font-black mb-1 ${isRamadan ? 'text-white' : 'text-slate-800'}`}>تطبيق الطلاب والمهام</h3>
              <p className={`text-xs font-bold leading-relaxed ${isRamadan ? 'text-indigo-200/70' : 'text-slate-500'}`}>
                إرسال الدرجات، المهام، النقاط، والمراكز فوراً ليتمكن الطالب من رؤيتها في تطبيقه.
              </p>
            </div>
          </button>

          {/* كرت مزامنة أولياء الأمور */}
          <button onClick={() => handleSync('parent')} className={`group p-6 rounded-[2rem] flex flex-col items-start gap-4 transition-all duration-300 active:scale-[0.98] border shadow-lg ${isRamadan ? 'bg-gradient-to-br from-[#064e3b] to-[#0f766e] border-emerald-500/20 hover:border-emerald-400/50' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
            <div className={`p-4 rounded-2xl transition-colors ${isRamadan ? 'bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-500/40' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'}`}>
              <Users className="w-8 h-8" />
            </div>
            <div className={`text-right ${dir === 'ltr' ? 'text-left' : ''}`}>
              <h3 className={`text-lg font-black mb-1 ${isRamadan ? 'text-white' : 'text-slate-800'}`}>تطبيق أولياء الأمور</h3>
              <p className={`text-xs font-bold leading-relaxed ${isRamadan ? 'text-emerald-100/70' : 'text-slate-500'}`}>
                مزامنة سجلات الغياب، السلوكيات، والدرجات للطلاب الذين تم ربط أرقامهم المدنية.
              </p>
            </div>
          </button>

          {/* كرت النسخ الاحتياطي */}
          <button onClick={() => handleSync('backup')} className={`group p-6 rounded-[2rem] flex flex-col items-start gap-4 transition-all duration-300 active:scale-[0.98] border shadow-lg ${isRamadan ? 'bg-[#1e293b] border-white/10 hover:border-amber-500/50 hover:bg-white/5' : 'bg-slate-50 border-slate-200 hover:border-amber-400'}`}>
            <div className={`p-4 rounded-2xl transition-colors ${isRamadan ? 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20' : 'bg-amber-100 text-amber-600'}`}>
              <CloudUpload className="w-8 h-8" />
            </div>
            <div className={`text-right ${dir === 'ltr' ? 'text-left' : ''}`}>
              <h3 className={`text-lg font-black mb-1 ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{t('syncBackupBtn') || 'رفع نسخة احتياطية (سحابي)'}</h3>
              <p className={`text-xs font-bold leading-relaxed ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`}>
                حفظ نسخة كاملة من بياناتك وإعداداتك في السحابة لضمان عدم ضياعها أو لنقلها لجهاز آخر.
              </p>
            </div>
          </button>

          {/* كرت الاسترجاع */}
          <button onClick={() => handleSync('restore')} className={`group p-6 rounded-[2rem] flex flex-col items-start gap-4 transition-all duration-300 active:scale-[0.98] border shadow-lg ${isRamadan ? 'bg-[#1e293b] border-white/10 hover:border-rose-500/50 hover:bg-white/5' : 'bg-slate-50 border-slate-200 hover:border-rose-400'}`}>
            <div className={`p-4 rounded-2xl transition-colors ${isRamadan ? 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20' : 'bg-rose-100 text-rose-600'}`}>
              <CloudDownload className="w-8 h-8" />
            </div>
            <div className={`text-right ${dir === 'ltr' ? 'text-left' : ''}`}>
              <h3 className={`text-lg font-black mb-1 ${isRamadan ? 'text-rose-400' : 'text-rose-600'}`}>{t('syncRestoreBtn') || 'استرجاع البيانات (سحابي)'}</h3>
              <p className={`text-xs font-bold leading-relaxed ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`}>
                جلب بياناتك المحفوظة مسبقاً من السحابة. (تحذير: سيتم استبدال بياناتك الحالية بالكامل).
              </p>
            </div>
          </button>

        </div>
      )}

    </div>
  );
};

export default GlobalSyncManager;
