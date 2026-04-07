import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckSquare, Plus, Trash2, 
  BookOpen, Users, Check, History, CalendarDays
} from 'lucide-react';
import PageLayout from '../components/PageLayout'; // 💉 استدعاء الغلاف الجديد

export interface Task {
  id: string;
  title: string;
  subject: string;
  targetClass: string;
  createdAt: string;
}

interface TeacherTasksProps {
  students: any[]; 
  teacherSubject: string; 
}

const TeacherTasks: React.FC<TeacherTasksProps> = ({ teacherSubject }) => {
  // 🌍 استدعاء محرك الترجمة (t) مع الاتجاه (dir) والفصول
  const { t, dir, classes } = useApp(); 

  const safeClasses = Array.isArray(classes) ? classes : [];

  // 🧠 حالة الأرشيف (المهام المحفوظة)
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('rased_teacher_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // 🧠 حالة التحديد المتعدد للفصول بدلاً من قائمة منسدلة
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // 🧠 حفظ أي تغيير يحدث في المهام إلى الذاكرة المحلية (الأرشيف)
  useEffect(() => {
    localStorage.setItem('rased_teacher_tasks', JSON.stringify(tasks));
  }, [tasks]);

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
    if (selectedClasses.length === safeClasses.length) {
      setSelectedClasses([]); // إلغاء الكل
    } else {
      setSelectedClasses([...safeClasses]); // تحديد الكل
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    // التحقق من اختيار فصل واحد على الأقل
    if (selectedClasses.length === 0) {
        alert(t('alertSelectOneClass') || 'الرجاء اختيار فصل واحد على الأقل.');
        return;
    }

    // 🧠 دمج الفصول المحددة (أو كتابة "الكل" إذا تم تحديد جميع الفصول)
    const finalTargetClass = selectedClasses.length === safeClasses.length 
        ? (t('allClasses') || 'الكل') 
        : selectedClasses.join(' , ');

    const newTask: Task = {
      id: `T-${Date.now()}`,
      title: newTaskTitle.trim(),
      subject: teacherSubject || t('unspecified') || 'عام',
      targetClass: finalTargetClass,
      createdAt: new Date().toISOString()
    };

    // إضافة المهمة الجديدة لأعلى الأرشيف
    setTasks([newTask, ...tasks]);
    setNewTaskTitle(''); 
    setSelectedClasses([]); // تصفير التحديد بعد الإرسال
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm(t('confirmDeleteTask') || 'هل أنت متأكد من حذف هذه المهمة من الأرشيف؟')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  return (
    // 💉 تغليف الصفحة بالكامل بالمكون الجديد
    <PageLayout
      title={t('tasksTitle') || 'المهام والواجبات'}
      subtitle={t('tasksSubtitle') || 'أرسل الواجبات لطلابك بسرعة بضغطة زر'}
      icon={<CheckSquare size={24} />}
    >
      
      {/* ⬇️ محتوى الصفحة المباشر (ينزلق بانسيابية تحت الهيدر) ⬇️ */}
      <div className="space-y-6 animate-in fade-in duration-500 pt-2">
        
        {/* 📝 بطاقة الإضافة */}
        <div className={`glass-panel p-5 rounded-[2rem] border border-borderColor shadow-sm`}>
          <h2 className={`text-sm font-black mb-4 flex items-center gap-2 text-textPrimary`}>
            <Plus size={18} className="text-primary" /> {t('addNewTask') || 'إضافة مهمة جديدة'}
          </h2>
          
          <form onSubmit={handleAddTask} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold ml-1 text-textSecondary`}>
                {t('taskTitleLabel') || 'عنوان المهمة / الواجب'}
              </label>
              <div className="relative">
                <BookOpen className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary`} />
                <input 
                  required 
                  type="text" 
                  placeholder={t('taskTitlePlaceholder') || 'مثال: حل أسئلة الفصل الأول صفحة 45...'} 
                  value={newTaskTitle} 
                  onChange={e => setNewTaskTitle(e.target.value)} 
                  className={`w-full text-sm font-bold py-3.5 ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} rounded-xl outline-none border transition-all bg-bgCard border-borderColor focus:border-primary text-textPrimary placeholder:text-textSecondary`} 
                />
              </div>
            </div>

            {/* 🧠 منطقة التحديد المتعدد للفصول */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className={`text-[10px] font-bold ml-1 text-textSecondary`}>
                  {t('targetClassLabel') || 'الفصول المستهدفة:'}
                </label>
                <button 
                  type="button" 
                  onClick={toggleAllClasses}
                  className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-colors bg-bgSoft text-textSecondary hover:bg-bgCard hover:text-primary`}
                >
                  {selectedClasses.length === safeClasses.length ? (t('deselectAll') || 'إلغاء الكل') : (t('selectAll') || 'تحديد الكل')}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {safeClasses.map((c, i) => {
                  const isSelected = selectedClasses.includes(c);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleClass(c)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                        isSelected 
                          ? 'bg-primary text-white border-primary shadow-md'
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
              disabled={selectedClasses.length === 0}
              className={`w-full py-4 mt-2 rounded-xl text-sm font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/80 text-white`}
            >
              <Plus size={18} /> {t('sendTaskBtn') || 'إضافة المهمة'}
            </button>
          </form>
        </div>

        {/* 🗂️ أرشيف المهام */}
        <div className="mt-8">
          <h3 className={`text-base font-black mb-4 flex items-center gap-2 text-textPrimary`}>
            <History className="w-5 h-5 text-primary" />
            {t('archiveTitle') || 'سجل المهام (الأرشيف)'}
          </h3>
          
          {tasks.length === 0 ? (
            <div className={`p-8 rounded-[2rem] border text-center border-dashed bg-bgSoft border-borderColor`}>
              <CheckSquare size={40} className={`mx-auto mb-3 opacity-20 text-textSecondary`} />
              <p className={`text-xs font-bold text-textSecondary`}>
                {t('noTasksAdded') || 'لا توجد مهام في الأرشيف حالياً. أضف مهمة لطلابك لتظهر هنا!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className={`glass-panel p-4 rounded-2xl border border-borderColor flex flex-col gap-3 transition-all hover:-translate-y-1 hover:shadow-md`}>
                  
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-black leading-snug text-textPrimary truncate`}>{task.title}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        {/* 💉 تاريخ المهمة */}
                        <span className="flex items-center gap-1 text-[10px] font-bold text-textSecondary px-2 py-1 rounded-md bg-bgSoft border border-borderColor">
                            <CalendarDays size={10} />
                            {new Date(task.createdAt).toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US')}
                        </span>
                        {/* 💉 الفصول المستهدفة */}
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 bg-primary/10 text-primary truncate max-w-[150px]`}>
                          <Users size={10} className="shrink-0" /> {task.targetClass}
                        </span>
                      </div>
                    </div>
                    <button 
                        onClick={() => handleDeleteTask(task.id)} 
                        className={`p-2 rounded-lg transition-colors shrink-0 bg-danger/10 text-danger hover:bg-danger/20`}
                        title={t('deleteArchiveItem') || 'حذف من الأرشيف'}
                    >
                      <Trash2 size={16} />
                    </button>
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

export default TeacherTasks;
