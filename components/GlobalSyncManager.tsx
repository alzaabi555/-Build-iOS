import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CloudSync, Users, GraduationCap, CloudUpload, CloudDownload,
  CheckCircle2, X, AlertCircle, Loader2
} from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// 🌐 الروابط المستقلة (شرايين التطبيق)
const STUDENT_APP_URL = "https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec";
const PARENT_APP_URL = "https://script.google.com/macros/s/AKfycbzKPPsQsM_dIttcYSxRLs6LQuvXhT6Qia5TwJ1Tw4ObQ-eZFZeJhV6epXXjxA9_SwWk/exec";
const DEVICE_SYNC_URL = "https://script.google.com/macros/s/AKfycbxXUII_Q_6K6TuewJ0k44mi8mCB-6LQNbDo9rhVdaVOvYCyKFRNCBuddLe_PyLorCdT/exec";

const GlobalSyncManager: React.FC = () => {
  const { 
    students, setStudents, classes, setClasses, 
    teacherInfo, setTeacherInfo, schedule, setSchedule, 
    periodTimes, setPeriodTimes, dir, t,
    // جلب باقي المتغيرات الهامة للنسخ الاحتياطي مع قيم افتراضية للحماية
    groups = [], assessmentTools = [], categorizations = [], 
    gradeSettings = {}, certificateSettings = {}, hiddenClasses = [], setAssessmentTools
  } = useApp();
  
  const [isOpen, setIsOpen] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const isRamadan = true;

  const handleSync = async (type: 'student' | 'parent' | 'backup' | 'restore') => {
    
    // ⚠️ الحماية الأولى: التحقق من الرقم المدني للمعلم
    if ((type === 'backup' || type === 'restore') && !teacherInfo?.civilId) {
      alert(t('alertEnterCivilId') || 'الرجاء إدخال الرقم المدني في الإعدادات أولاً!');
      return;
    }

    // ⚠️ الحماية الثانية: رسائل التأكيد
    if (type === 'restore') {
      if (!window.confirm(t('alertConfirmPull') || "تحذير: سيتم استبدال كل بياناتك الحالية. هل أنت متأكد؟")) return;
    }
    if (type === 'backup') {
      if (!window.confirm(t('alertConfirmPush') || "هل أنت متأكد من رفع البيانات للسحابة؟")) return;
    }

    setSyncState('syncing');

    try {
      // ==========================================
      // 🎓 1. تحديث تطبيق الطلاب
      // ==========================================
      if (type === 'student') {
        setSyncMessage(t('syncingMsg') || 'جاري مزامنة تطبيق الطلاب...');
        
        const savedTasks = JSON.parse(localStorage.getItem('rased_teacher_tasks') || '[]');
        
        const payload = { 
          students: students, 
          tasks: savedTasks,
          className: 'الكل' 
        };
        await fetch(STUDENT_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
      }
      
      // ==========================================
      // 👨‍👩‍👦 2. تحديث تطبيق أولياء الأمور
      // ==========================================
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
      
      // ==========================================
      // ☁️ 3. الرفع الاحتياطي (Backup) - الكود الهندسي
      // ==========================================
      else if (type === 'backup') {
        setSyncMessage(t('syncingMsg') || 'جاري تقسيم البيانات ورفعها للسحابة...');
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
      
      // ==========================================
      // 📥 4. جلب البيانات (Restore) - الكود الهندسي
      // ==========================================
      else if (type === 'restore') {
        setSyncMessage(t('syncingMsg') || 'جاري جلب البيانات وتجميعها...');
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
              setSyncMessage(t('syncSuccess') || 'تم الجلب بنجاح! سيتم إعادة تشغيل التطبيق...');
              setTimeout(() => window.location.reload(), 1500);
              return; 
          }
        } else { 
          throw new Error(t('alertNoDataInCloud') || 'لا توجد بيانات محفوظة أو فشل الجلب');
        }
      }

      setSyncState('success');
      setSyncMessage(t('syncSuccess') || 'تمت العملية بنجاح! ✨');
      setTimeout(() => {
        setIsOpen(false);
        setSyncState('idle');
      }, 3000);

    } catch (error) {
      console.error(error);
      setSyncState('error');
      setSyncMessage(t('syncError') || 'فشل الاتصال! تأكد من الإنترنت.');
      setTimeout(() => setSyncState('idle'), 4000);
    }
  };

  return (
    // 💡 التعديل هنا: نقل الزر للأعلى (top-24) بدلاً من الأسفل لتفادي تغطية المحتوى
    <div className={`fixed z-[99999] transition-all duration-500 ${dir === 'rtl' ? 'left-6' : 'right-6'} top-24 md:top-28`} dir={dir}>
      
      {/* ☁️ القائمة المنبثقة (مركز القيادة السحابي) */}
      {isOpen && (
        // 💡 التعديل هنا: توجيه القائمة للفتح للداخل (origin-top-left أو right) وعدم الخروج من الشاشة
        <div className={`absolute top-16 ${dir === 'rtl' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'} mt-2 w-80 bg-[#0f172a]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.7)] animate-in slide-in-from-top-5 fade-in duration-300 transform`}>
          
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <CloudSync className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              {t('syncMenuTitle') || 'مركز المزامنة'}
            </h3>
            <button onClick={() => setIsOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {syncState === 'idle' && (
            <div className="space-y-3">
              <button onClick={() => handleSync('student')} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3.5 px-4 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all active:scale-95 border border-white/10 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors"><GraduationCap className="w-5 h-5 text-blue-200" /></div>
                  <div className={`flex flex-col ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    <span className="text-sm">{t('syncStudentsOnly') || 'تطبيق الطلاب والمهام'}</span>
                  </div>
                </div>
              </button>

              <button onClick={() => handleSync('parent')} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 px-4 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95 border border-white/10 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors"><Users className="w-5 h-5 text-emerald-200" /></div>
                  <div className={`flex flex-col ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    <span className="text-sm">{t('syncParentsOnly') || 'تطبيق أولياء الأمور'}</span>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-3 my-4 opacity-50">
                <div className="flex-1 h-px bg-white/20"></div>
                <span className="text-[10px] font-bold text-white">{t('syncDeviceTitle') || 'مزامنة الأجهزة'}</span>
                <div className="flex-1 h-px bg-white/20"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleSync('backup')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                  <CloudUpload className="w-5 h-5 text-amber-400" />
                  <span className="text-[10px] text-center px-1">{t('syncBackupBtn') || 'رفع احتياطي'}</span>
                </button>
                <button onClick={() => handleSync('restore')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                  <CloudDownload className="w-5 h-5 text-rose-400" />
                  <span className="text-[10px] text-center px-1">{t('syncRestoreBtn') || 'جلب البيانات'}</span>
                </button>
              </div>
            </div>
          )}

          {syncState === 'syncing' && (
            <div className="py-10 flex flex-col items-center justify-center animate-in fade-in">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
              <p className="text-sm font-black text-cyan-100 text-center drop-shadow-md px-4">{syncMessage}</p>
            </div>
          )}

          {syncState === 'success' && (
            <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-sm font-black text-emerald-100 text-center drop-shadow-md">{syncMessage}</p>
            </div>
          )}

          {syncState === 'error' && (
            <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in">
               <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 border border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                <AlertCircle className="w-10 h-10 text-rose-400" />
              </div>
              <p className="text-sm font-black text-rose-100 text-center drop-shadow-md px-4">{syncMessage}</p>
              <button onClick={() => setSyncState('idle')} className="mt-4 text-xs font-bold text-slate-400 underline hover:text-white">{t('closeBtn') || 'رجوع'}</button>
            </div>
          )}
        </div>
      )}

      {/* 🌟 الزر العائم الرئيسي */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all duration-300 border backdrop-blur-md active:scale-90 ${
          isOpen ? 'bg-slate-800 border-slate-600 rotate-180' : 'bg-gradient-to-tr from-cyan-500 to-indigo-600 border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] hover:-translate-y-1'
        }`}
      >
        {isOpen ? <X className="w-6 h-6 text-slate-300" /> : <CloudSync className="w-6 h-6 text-white" />}
        
        {/* النقطة النابضة إذا لزم الأمر، يمكنك إضافتها هنا */}
        {!isOpen && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRamadan ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isRamadan ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
            </span>
        )}
      </button>
    </div>
  );
};

export default GlobalSyncManager;
