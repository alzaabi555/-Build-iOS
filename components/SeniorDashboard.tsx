import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, UserPlus, Send, Clock, CheckCircle2, 
  AlertTriangle, Users, Save, X, RefreshCw, ChevronDown, Calendar, MessageCircle 
} from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const SeniorDashboard: React.FC = () => {
  const { teacherInfo, dir, t } = useApp();
  
  // 🔗 رابط سحابة الإدارة المستخرج من ملفاتك
  const ADMIN_APP_URL = "https://script.google.com/macros/s/AKfycbwZHhZ-RPWUpBGIlw0qTFPUmOPmq9WpcvW4WLklcjb_A9U3MW0luIXYPnHznI29ThpbMA/exec";
  const schoolCode = localStorage.getItem('rased_admin_school_code') || '';

  // 👥 حالات إدارة الفريق (Squad Builder)
  const [mySquad, setMySquad] = useState<string[]>([]);
  const [allSchoolTeachers, setAllSchoolTeachers] = useState<string[]>([]);
  const [isSquadBuilderOpen, setIsSquadBuilderOpen] = useState(false);
  const [tempSelectedSquad, setTempSelectedSquad] = useState<string[]>([]);

  // 📝 حالات التكليف والجدول
  const [absentTeacher, setAbsentTeacher] = useState('');
  const [absentTeacherSchedule, setAbsentTeacherSchedule] = useState<any[]>([]);
  const [substitutions, setSubstitutions] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // 🟢 حالات تنبيهات واتساب
  const [whatsappAlerts, setWhatsappAlerts] = useState<{subName: string, message: string}[]>([]);

  // ⚙️ تحميل الفريق المحفوظ عند البداية
  useEffect(() => {
    const savedSquad = localStorage.getItem(`rased_squad_${teacherInfo.civilId}`);
    if (savedSquad) setMySquad(JSON.parse(savedSquad));
  }, [teacherInfo.civilId]);

  // 🌡️ دالة تحديد اليوم الحالي لتطابق بيانات الإدارة
  const getCurrentArabicDay = () => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[new Date().getDay()];
  };

  // 📡 جلب أسماء جميع المعلمين لبناء الفريق
  const fetchAllTeachers = async () => {
    if (!schoolCode) return alert("كود المدرسة مفقود!");
    setIsLoading(true);
    try {
      const response = await fetch(`${ADMIN_APP_URL}?schoolCode=${schoolCode.trim()}`);
      const result = await response.json();
      if (result.status === "success" && result.data.teachers) {
        const uniqueNames = Array.from(new Set(result.data.teachers.map((t: any) => t.name.trim())));
        setAllSchoolTeachers(uniqueNames as string[]);
        setTempSelectedSquad(mySquad);
      }
    } catch (error) {
      alert("خطأ في الاتصال بالسحابة");
    } finally {
      setIsLoading(false);
    }
  };

  // 📡 استدعاء جدول المعلم الغائب لليوم الحالي
  const fetchTeacherSchedule = async (name: string) => {
    if (!name) return;
    setAbsentTeacher(name);
    setIsLoading(true);
    setAbsentTeacherSchedule([]);
    setSubstitutions({});
    setWhatsappAlerts([]);

    try {
      const response = await fetch(`${ADMIN_APP_URL}?schoolCode=${schoolCode.trim()}`);
      const result = await response.json();
      if (result.status === "success") {
        const today = getCurrentArabicDay();
        const schedule = result.data.teachers.filter((t: any) => 
          t.name.trim() === name.trim() && t.day.trim() === today
        );
        schedule.sort((a: any, b: any) => parseInt(a.period) - parseInt(b.period));
        setAbsentTeacherSchedule(schedule);
      }
    } catch (error) {
      alert("خطأ في جلب الجدول");
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 إرسال التكليفات وتوليد رسائل الواتساب
  const handleBulkAssign = async () => {
    const tasksToSubmit = absentTeacherSchedule.map(item => ({
      action: "createSubstitution",
      id: `${Date.now()}_${item.period}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('ar-OM', { hour: '2-digit', minute: '2-digit' }),
      department: teacherInfo.departmentName || "عام",
      absentTeacher: absentTeacher,
      period: `الحصة ${item.period}`,
      targetClass: item.className,
      subTeacher: substitutions[item.period] || "",
    })).filter(task => task.subTeacher !== "");

    if (tasksToSubmit.length === 0) return alert("الرجاء تحديد معلمين بدلاء");

    setIsLoading(true);
    try {
      for (const task of tasksToSubmit) {
        await fetch(ADMIN_APP_URL, { method: 'POST', body: JSON.stringify(task) });
      }
      
      // منطق تجميع رسائل الواتساب
      const grouped: { [key: string]: any[] } = {};
      tasksToSubmit.forEach(t => {
        if (!grouped[t.subTeacher]) grouped[t.subTeacher] = [];
        grouped[t.subTeacher].push(t);
      });

      const alerts = Object.keys(grouped).map(subName => {
        const lines = grouped[subName].map(t => `▪️ ${t.period} (صف ${t.targetClass})`).join('\n');
        const text = `*تنبيه احتياط - نظام راصد* 🔔\n\nأهلاً بك أستاذ ${subName} 👋\nتم تكليفك بحصص الاحتياط التالية اليوم بدلاً من أ. ${absentTeacher}:\\n\n${lines}\n\nشكراً لتعاونك! 🌹`;
        return { subName, message: text };
      });

      setWhatsappAlerts(alerts);
      setAbsentTeacherSchedule([]);
      alert("✅ تم إرسال التكليفات بنجاح");
    } catch (e) {
      alert("خطأ في الإرسال");
    } finally {
      setIsLoading(false);
    }
  };

  // 📲 منطق الواتساب الشامل (ويندوز، جوال، ويب)
  const sendWhatsAppMsg = async (msgText: string) => {
    const encodedMsg = encodeURIComponent(msgText);
    const url = `https://wa.me/?text=${encodedMsg}`;

    if ((window as any).electron) {
      (window as any).electron.openExternal(`whatsapp://send?text=${encodedMsg}`);
    } else if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`h-full flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar relative ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      
      {/* الهيدر */}
      <div className="flex items-center justify-between gap-4 mb-6 animate-in slide-in-from-top-4">
        <div className="flex items-center gap-4">
          <div className="bg-purple-500/10 p-3 rounded-2xl border border-purple-500/20 shadow-sm">
            <ShieldCheck className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-textPrimary tracking-wide">مركز قيادة القسم</h1>
            <p className="text-[10px] font-bold text-textSecondary mt-1 uppercase tracking-widest">
              إدارة {teacherInfo.departmentName} | فريقك: {mySquad.length}
            </p>
          </div>
        </div>
        <button 
          onClick={() => { setIsSquadBuilderOpen(true); if(allSchoolTeachers.length === 0) fetchAllTeachers(); }}
          className="bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Users size={16} /> الفريق
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* التوزيع والجدول */}
        <div className="lg:col-span-5 space-y-4">
          
          {whatsappAlerts.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 animate-in zoom-in duration-300">
              <h3 className="font-black text-emerald-600 mb-3 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} /> التكليفات جاهزة! أرسل عبر الواتساب:
              </h3>
              <div className="space-y-2">
                {whatsappAlerts.map((alert, i) => (
                  <button 
                    key={i} onClick={() => sendWhatsAppMsg(alert.message)}
                    className="w-full bg-white border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between hover:border-emerald-500 transition-all active:scale-95 group shadow-sm"
                  >
                    <span className="font-bold text-sm text-textPrimary">أ. {alert.subName}</span>
                    <span className="bg-[#25D366] text-white px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1">
                      <MessageCircle size={14} /> إرسال
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card p-5 rounded-3xl border border-borderColor shadow-sm">
            <label className="text-[10px] font-black text-textSecondary mb-3 block uppercase">1. اختر المعلم الغائب</label>
            <div className="relative">
              <select 
  value={absentTeacher} onChange={(e) => fetchTeacherSchedule(e.target.value)}
  className="w-full bg-white border border-borderColor rounded-xl px-4 py-4 text-sm font-black text-slate-900 appearance-none outline-none focus:border-purple-500 shadow-sm"
>
  <option value="" className="text-slate-500 font-bold">-- اضغط للاختيار من فريقك --</option>
  {mySquad.map(t => <option key={t} value={t} className="text-slate-900 font-bold bg-white">{t}</option>)}
</select>
              <ChevronDown className="absolute left-4 top-4.5 text-textSecondary pointer-events-none" size={18} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-10 space-y-3">
              <RefreshCw className="animate-spin text-purple-500 w-8 h-8" />
              <p className="text-xs font-bold text-textSecondary">جاري معالجة البيانات...</p>
            </div>
          ) : absentTeacherSchedule.length > 0 ? (
            <div className="space-y-3 animate-in slide-in-from-bottom-4">
              <div className="px-2 text-purple-600 font-black text-xs flex items-center gap-2">
                <Calendar size={14} /> حصص الغائب ليوم {getCurrentArabicDay()}
              </div>
              {absentTeacherSchedule.map((item, idx) => (
                <div key={idx} className="glass-card p-4 rounded-2xl border border-borderColor bg-bgSoft/50 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="bg-purple-500 text-white text-[10px] font-black px-2 py-1 rounded-md">الحصة {item.period}</span>
                    <span className="font-black text-sm text-textPrimary">فصل: {item.className}</span>
                  </div>
                  <div className="relative">
                    <select 
  onChange={(e) => setSubstitutions({...substitutions, [item.period]: e.target.value})}
  className="w-full bg-white border border-borderColor rounded-xl px-4 py-3 text-xs font-black text-slate-900 appearance-none outline-none focus:border-emerald-500 shadow-sm"
>
  <option value="" className="text-slate-500">اختر المعلم البديل...</option>
  {mySquad.filter(t => t !== absentTeacher).map(t => <option key={t} value={t} className="text-slate-900 font-bold bg-white">{t}</option>)}
</select>
                    <ChevronDown className="absolute left-3 top-3.5 text-emerald-500 pointer-events-none" size={16} />
                  </div>
                </div>
              ))}
              <button 
                onClick={handleBulkAssign}
                className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 active:scale-95 mt-4"
              >
                <Send size={18} /> اعتماد وإرسال التكليفات
              </button>
            </div>
          ) : absentTeacher && (
            <div className="text-center p-10 bg-bgSoft/50 border border-dashed border-borderColor rounded-3xl text-textSecondary font-bold text-xs">
              لا توجد حصص مسجلة لهذا المعلم اليوم في الجدول المركزي
            </div>
          )}
        </div>

        {/* رادار المتابعة */}
        <div className="lg:col-span-7">
           <h2 className="text-[10px] font-black text-textSecondary uppercase mb-4 px-1 flex items-center justify-between">
              حالة التنفيذ اللحظية <span className="text-emerald-500">مباشر 🔴</span>
           </h2>
           <div className="glass-card p-10 rounded-[2.5rem] border border-borderColor min-h-[450px] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-bgSoft rounded-full flex items-center justify-center mb-6 border border-borderColor">
                <Clock className="w-10 h-10 text-textSecondary opacity-30" />
              </div>
              <p className="font-black text-textSecondary opacity-50 text-sm">سيتم عرض التكليفات النشطة هنا</p>
              <p className="text-[10px] text-textSecondary opacity-40 mt-3 max-w-[250px] leading-relaxed">
                ستظهر هنا الحصص التي تم توزيعها، وتتغير حالتها فور تأكيد المعلم البديل دخوله للفصل عبر تطبيقه.
              </p>
           </div>
        </div>
      </div>

      {/* مودال بناء الفريق */}
      {isSquadBuilderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bgCard w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] border border-white/10">
            <div className="p-6 border-b border-borderColor flex justify-between items-center bg-bgSoft/50">
              <div>
                <h2 className="text-xl font-black text-textPrimary">تكوين فريق القسم</h2>
                <p className="text-[10px] font-bold text-textSecondary mt-1">اختر معلمي قسمك (المحدد: {tempSelectedSquad.length})</p>
              </div>
              <button onClick={() => setIsSquadBuilderOpen(false)} className="p-2 bg-rose-500/10 text-rose-500 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={20} /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {allSchoolTeachers.length === 0 ? (
                <div className="text-center py-10 opacity-50"><RefreshCw className="animate-spin mx-auto mb-3" /> جاري البحث...</div>
              ) : (
                allSchoolTeachers.map(t => (
                  <label key={t} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${tempSelectedSquad.includes(t) ? 'bg-purple-500/10 border-purple-500' : 'bg-bgSoft border-borderColor'}`}>
                    <span className={`font-bold text-sm ${tempSelectedSquad.includes(t) ? 'text-purple-600' : 'text-textPrimary'}`}>{t}</span>
                    <input 
                      type="checkbox" checked={tempSelectedSquad.includes(t)}
                      onChange={() => setTempSelectedSquad(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                      className="w-5 h-5 accent-purple-500"
                    />
                  </label>
                ))
              )}
            </div>

            <div className="p-4 bg-bgSoft/50 border-t border-borderColor">
              <button 
                onClick={() => { setMySquad(tempSelectedSquad); localStorage.setItem(`rased_squad_${teacherInfo.civilId}`, JSON.stringify(tempSelectedSquad)); setIsSquadBuilderOpen(false); }}
                className="w-full bg-purple-500 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> حفظ الفريق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SeniorDashboard;
