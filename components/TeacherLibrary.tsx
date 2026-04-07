import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Library, Link as LinkIcon, Send, Loader2, CheckCircle2, Youtube, FileText, Check, Trash2, History, ExternalLink } from 'lucide-react';
import PageLayout from '../components/PageLayout'; // 💉 استدعاء الغلاف الشامل
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

// رابط السيرفر المباشر (لإرسال الروابط بأمان دون التأثير على التطبيق)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMYqSpnXvlMrL6po82-XePyAWBd9FMNCTgY7WlYaOH6pn1kTazLqxEfvremqsSk_dU/exec";

interface ArchiveItem {
  id: string;
  title: string;
  link: string;
  type: string;
  targetClass: string;
  date: string;
}

const TeacherLibrary: React.FC = () => {
  // 🌍 استدعاء دالة الترجمة (t) مع باقي المتغيرات
  const { classes, dir, teacherInfo, t } = useApp(); 
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  
  // 🧠 حالة التحديد المتعدد للفصول
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 🧠 حالة الأرشيف (يتم جلبها وحفظها في الذاكرة المحلية)
  const [archive, setArchive] = useState<ArchiveItem[]>(() => {
    const saved = localStorage.getItem('rased_library_archive');
    return saved ? JSON.parse(saved) : [];
  });

  // تحديث الذاكرة المحلية عند تغير الأرشيف
  useEffect(() => {
    localStorage.setItem('rased_library_archive', JSON.stringify(archive));
  }, [archive]);

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
        
        // 💉 زراعة الرابط الجديد في الأرشيف المحلي
        const newItem: ArchiveItem = {
            id: Math.random().toString(36).substr(2, 9),
            title,
            link,
            type,
            targetClass,
            date: new Date().toISOString()
        };
        setArchive(prev => [newItem, ...prev]);

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

  const deleteFromArchive = (id: string) => {
      if(window.confirm(t('confirmDeleteArchive') || 'هل أنت متأكد من حذف هذا الرابط من الأرشيف؟ (هذا لن يحذفه من عند الطلاب)')) {
          setArchive(prev => prev.filter(item => item.id !== id));
      }
  };

  const openLink = async (url: string) => {
      if (Capacitor.isNativePlatform()) {
          await Browser.open({ url });
      } else {
          window.open(url, '_blank');
      }
  };

  return (
    // 💉 الغلاف الشامل PageLayout
    <PageLayout
        title={t('libraryTitle') || 'المكتبة الرقمية'}
        subtitle={t('librarySubtitle') || 'أرسل شروحات الفيديو والملفات لطلابك بضغطة زر 🚀'}
        icon={<Library size={24} />}
    >
      
      {/* ⬇️ محتوى الصفحة المباشر (ينزلق تحت الهيدر) ⬇️ */}
      <div className="animate-in fade-in duration-500 pt-2 space-y-6">
        
        {/* 📝 بطاقة الإرسال الرئيسية */}
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
                <div className="relative">
                    <LinkIcon className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary`} />
                    <input
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://..."
                        className={`w-full bg-bgCard border-2 border-borderColor rounded-2xl py-3.5 ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary transition-colors text-left`}
                        dir="ltr"
                        required
                    />
                </div>
            </div>

            {/* 🧠 منطقة التحديد المتعدد للفصول */}
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

        {/* 🗂️ بطاقة أرشيف الروابط المرسلة */}
        <div className="mt-8">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-textPrimary">
                <History className="w-5 h-5 text-primary" /> {t('archiveTitle') || 'أرشيف الروابط المرسلة'}
            </h3>

            {archive.length === 0 ? (
                <div className={`p-8 rounded-[2rem] border text-center border-dashed bg-bgSoft border-borderColor`}>
                    <Library className={`mx-auto mb-3 w-10 h-10 opacity-20 text-textSecondary`} />
                    <p className={`text-xs font-bold text-textSecondary`}>
                        {t('noArchiveYet') || 'لا يوجد روابط في الأرشيف حالياً. الروابط التي سترسلها ستظهر هنا.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {archive.map(item => (
                        <div key={item.id} className="glass-panel p-4 rounded-2xl border border-borderColor flex flex-col gap-3 transition-all hover:-translate-y-1 hover:shadow-md">
                            
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${item.type === 'youtube' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {item.type === 'youtube' ? <Youtube className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-black text-textPrimary leading-snug truncate">{item.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-textSecondary px-2 py-0.5 rounded-md bg-bgSoft">
                                                {new Date(item.date).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US')}
                                            </span>
                                            <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 truncate max-w-[120px]">
                                                {item.targetClass}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 shrink-0">
                                    <button 
                                        onClick={() => openLink(item.link)} 
                                        className="p-2 rounded-lg bg-bgSoft text-textSecondary hover:bg-primary/10 hover:text-primary transition-colors"
                                        title={t('openLink') || 'فتح الرابط'}
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                    <button 
                                        onClick={() => deleteFromArchive(item.id)} 
                                        className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                                        title={t('deleteArchiveItem') || 'حذف من الأرشيف'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </PageLayout>
  );
};

export default TeacherLibrary;
