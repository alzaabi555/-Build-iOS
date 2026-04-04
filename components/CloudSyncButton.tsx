import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Cloud, Loader2, CheckCircle, XCircle } from 'lucide-react';

// ⚠️ استبدل هذا الرابط برابط الـ API السري الذي حصلت عليه من Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXUII_Q_6K6TuewJ0k44mi8mCB-6LQNbDo9rhVdaVOvYCyKFRNCBuddLe_PyLorCdT/exec"; 

export const CloudSyncButton = () => {
  const { 
    students, setStudents, 
    assessmentTools, setAssessmentTools,
    groups, setGroups,
    categorizations, setCategorizations,
    gradeSettings, setGradeSettings,
    classes, setClasses,
    teacherInfo
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      // 1. المعرف الفريد للمعلم (استخدمنا اسم المعلم كمعرف، يمكنك تغييره لرقم الهاتف)
      const teacherId = "teacher_" + (teacherInfo.name ? teacherInfo.name.replace(/\s+/g, '_') : "default");

      // 2. جلب التوقيت المحلي لآخر تعديل
      let localLastUpdated = Number(localStorage.getItem('lastLocalUpdate'));
      if (!localLastUpdated) {
        localLastUpdated = Date.now();
        localStorage.setItem('lastLocalUpdate', localLastUpdated.toString());
      }

      // 3. تغليف البيانات في الكبسولات السحابية (DataJSON)
      const recordsToSync = [
        { id: "students_data", type: "Students", data: JSON.stringify(students), lastUpdated: localLastUpdated },
        { id: "tools_data", type: "Tools", data: JSON.stringify(assessmentTools), lastUpdated: localLastUpdated },
        { id: "groups_data", type: "Groups", data: JSON.stringify(groups || []), lastUpdated: localLastUpdated },
        { id: "categorizations_data", type: "Categorizations", data: JSON.stringify(categorizations || []), lastUpdated: localLastUpdated },
        { id: "gradeSettings_data", type: "GradeSettings", data: JSON.stringify(gradeSettings), lastUpdated: localLastUpdated },
        { id: "classes_data", type: "Classes", data: JSON.stringify(classes), lastUpdated: localLastUpdated },
      ];

      // 4. إرسال الكبسولات إلى جوجل شيت
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // مهم جداً لتجاوز مشكلة CORS
        body: JSON.stringify({
          action: 'sync',
          teacherPhone: teacherId,
          records: recordsToSync
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        // 5. استقبال البيانات من السحابة وفك تشفيرها
        let updatedLocally = false;

        result.records.forEach((serverRec: any) => {
          // "الأحدث يفوز": إذا كانت السحابة تحمل نسخة أحدث من جهازك، قم بتحديث جهازك!
          if (serverRec.lastUpdated > localLastUpdated) {
            const parsedData = JSON.parse(serverRec.data);
            
            if (serverRec.id === "students_data") setStudents(parsedData);
            if (serverRec.id === "tools_data") setAssessmentTools(parsedData);
            if (serverRec.id === "groups_data") setGroups(parsedData);
            if (serverRec.id === "categorizations_data") setCategorizations(parsedData);
            if (serverRec.id === "gradeSettings_data") setGradeSettings(parsedData);
            if (serverRec.id === "classes_data") setClasses(parsedData);
            
            // تحديث التوقيت المحلي ليتطابق مع السحابة
            localStorage.setItem('lastLocalUpdate', serverRec.lastUpdated.toString());
            updatedLocally = true;
          }
        });
        
        setSyncStatus('success');
        alert(updatedLocally ? "✅ تمت المزامنة وتم تحديث بياناتك من السحابة!" : "✅ تمت المزامنة وبياناتك الحالية هي الأحدث!");
      } else {
        throw new Error("فشل المزامنة من السيرفر");
      }

    } catch (error) {
      console.error("Sync Error:", error);
      setSyncStatus('error');
      alert("❌ حدث خطأ أثناء المزامنة، تأكد من اتصالك بالإنترنت وتأكد من رابط السكربت.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  return (
    <button 
      onClick={handleSync} 
      disabled={isSyncing}
      className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 ${
        syncStatus === 'success' ? 'bg-emerald-500 hover:bg-emerald-400 text-white' :
        syncStatus === 'error' ? 'bg-rose-500 hover:bg-rose-400 text-white' :
        'bg-indigo-600 hover:bg-indigo-500 text-white'
      }`}
    >
      {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : 
       syncStatus === 'success' ? <CheckCircle className="w-5 h-5" /> :
       syncStatus === 'error' ? <XCircle className="w-5 h-5" /> :
       <Cloud className="w-5 h-5" />}
      {isSyncing ? 'جاري المزامنة...' : 
       syncStatus === 'success' ? 'تمت المزامنة' :
       syncStatus === 'error' ? 'فشل المزامنة' : 'مزامنة سحابية'}
    </button>
  );
};
