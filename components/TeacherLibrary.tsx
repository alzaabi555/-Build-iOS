import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Library, Link as LinkIcon, Send, Loader2, CheckCircle2, Youtube, FileText, Check } from 'lucide-react';

// رابط السيرفر المباشر (لإرسال الروابط بأمان دون التأثير على التطبيق)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec";

const TeacherLibrary: React.FC = () => {
  const { classes, dir, teacherInfo } = useApp();
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  
  // 🧠 حالة جديدة للتحديد المتعدد للفصول
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // دالة لاختيار/إلغاء اختيار الفصول
  const toggleClass = (className: string) => {
    setSelectedClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className) // إلغاء التحديد
        : [...prev, className]              // إضافة التحديد
    );
  };

  // دالة لتحديد الكل / إلغاء تحديد الكل
  const toggleAllClasses = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([]); // إلغاء الكل
    } else {
      setSelectedClasses([...classes]); // تحديد الكل
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !link.trim()) return;
    if (selectedClasses.length === 0) {
      alert('الرجاء اختيار فصل واحد على الأقل.');
      return;
    }

    setLoading(true);
    try {
      // 🧠 ذكاء اصطناعي بسيط لمعرفة نوع الرابط
      let type = 'link';
      const lowerLink = link.toLowerCase();
      if (lowerLink.includes('youtube.com') || lowerLink.includes('youtu.be')) type = 'youtube';
      else if (lowerLink.includes('.pdf') || lowerLink.includes('drive.google')) type = 'pdf';

      // 🧠 معالجة التحديد المتعدد لإرساله كنص
      const targetClass = selectedClasses.length === classes.length ? 'الكل' : selectedClasses.join(',');

      const payload = {
        resources: [{
          title,
          subject: teacherInfo?.subject || 'عام',
          link,
          type,
          targetClass
        }]
      };

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        setTitle('');
        setLink('');
        setSelectedClasses([]); // تصفير التحديد بعد الإرسال
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      alert('فشل الاتصال بالسيرفر. تأكد من الإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-white pt-6 px-6" dir={dir}>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white flex items-center gap-2 mb-2">
          <Library className="w-8 h-8 text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]" />
          إدارة المكتبة والمصادر
        </h1>
        <p className="text-xs font-bold text-indigo-200/70">
          أرسل شروحات الفيديو والملفات لطلابك بضغطة زر 🚀
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
        {success && (
          <div className="absolute inset-0 z-20 bg-emerald-500/20 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2 drop-shadow-md" />
            <h2 className="text-lg font-black text-white">تم الإرسال للطلاب بنجاح!</h2>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-bold text-indigo-200">عنوان الدرس أو الملف</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: شرح درس القسمة المطولة..."
              className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-indigo-200">رابط الملف (يوتيوب أو درايف)</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 text-left"
              dir="ltr"
              required
            />
          </div>

          {/* 🧠 منطقة التحديد المتعدد للفصول بدلاً من القائمة المنسدلة */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-indigo-200">إرسال إلى الفصول:</label>
              <button 
                type="button" 
                onClick={toggleAllClasses}
                className="text-[10px] font-bold px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                {selectedClasses.length === classes.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {classes.map((c, i) => {
                const isSelected = selectedClasses.includes(c);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleClass(c)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      isSelected 
                        ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.3)]' 
                        : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {isSelected && <Check size={12} className="text-fuchsia-400" />}
                    {c}
                  </button>
                );
              })}
            </div>
            {selectedClasses.length === 0 && <p className="text-[10px] text-rose-400 font-bold">يرجى اختيار فصل واحد على الأقل</p>}
          </div>

          <button
            type="submit"
            disabled={loading || selectedClasses.length === 0}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-400 hover:to-purple-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(232,121,249,0.3)] transition-all active:scale-95 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> إرسال للمكتبة</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TeacherLibrary;
