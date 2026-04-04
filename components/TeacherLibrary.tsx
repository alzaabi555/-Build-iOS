import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Library, Link as LinkIcon, Send, Loader2, CheckCircle2, Youtube, FileText, Check } from 'lucide-react';

// رابط السيرفر المباشر (لإرسال الروابط بأمان دون التأثير على التطبيق)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec";

const TeacherLibrary: React.FC = () => {
  // 🌍 استدعاء دالة الترجمة (t) مع باقي المتغيرات
  const { classes, dir, teacherInfo, t } = useApp(); 
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  
  // 🧠 حالة التحديد المتعدد للفصول
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
      alert(t('alertSelectOneClass') || 'الرجاء اختيار فصل واحد على الأقل.');
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
      const targetClass = selectedClasses.length === classes.length ? (t('allClasses') || 'الكل') : selectedClasses.join(' , ');

      const payload = {
        resources: [{
          title,
          subject: teacherInfo?.subject || t('unspecified') || 'عام',
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
      alert(t('alertSyncError') || 'فشل الاتصال بالسيرفر. تأكد من الإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-textPrimary pt-6 px-6" dir={dir}>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-textPrimary flex items-center gap-2 mb-2">
          <Library className="w-8 h-8 text-primary drop-shadow-sm" />
          {t('libraryTitle') || 'إدارة المكتبة والمصادر'}
        </h1>
        <p className="text-xs font-bold text-textSecondary">
          {t('librarySubtitle') || 'أرسل شروحات الفيديو والملفات لطلابك بضغطة زر 🚀'}
        </p>
      </div>

      <div className="glass-panel border border-borderColor rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
        {success && (
          <div className="absolute inset-0 z-20 bg-success/10 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
            <CheckCircle2 className="w-16 h-16 text-success mb-2 drop-shadow-md" />
            <h2 className="text-lg font-black text-textPrimary">{t('sendSuccess') || 'تم الإرسال للطلاب بنجاح!'}</h2>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-bold text-textSecondary">{t('lessonTitleLabel') || 'عنوان الدرس أو الملف'}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('lessonTitlePlaceholder') || "مثال: شرح درس القسمة المطولة..."}
              className={`w-full bg-bgCard border-2 border-borderColor rounded-2xl py-3.5 px-4 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary transition-colors ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-textSecondary">{t('fileLinkLabel') || 'رابط الملف (يوتيوب أو درايف)'}</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full bg-bgCard border-2 border-borderColor rounded-2xl py-3.5 px-4 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary transition-colors text-left"
              dir="ltr"
              required
            />
          </div>

          {/* 🧠 منطقة التحديد المتعدد للفصول بدلاً من القائمة المنسدلة */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-textSecondary">{t('targetClassLabel') || 'إرسال إلى الفصول:'}</label>
              <button 
                type="button" 
                onClick={toggleAllClasses}
                className="text-[10px] font-bold px-3 py-1 rounded-lg bg-bgSoft hover:bg-bgCard text-textSecondary hover:text-primary transition-colors"
              >
                {selectedClasses.length === classes.length ? (t('deselectAll') || 'إلغاء الكل') : (t('selectAll') || 'تحديد الكل')}
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
                        ? 'bg-primary border-primary text-white shadow-md' 
                        : 'bg-bgSoft border-borderColor text-textSecondary hover:bg-bgCard'
                    }`}
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                    {c}
                  </button>
                );
              })}
            </div>
            {selectedClasses.length === 0 && <p className="text-[10px] text-danger font-bold">{t('alertSelectOneClass') || 'يرجى اختيار فصل واحد على الأقل'}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || selectedClasses.length === 0}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> {t('sendToLibraryBtn') || 'إرسال للمكتبة'}</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TeacherLibrary;