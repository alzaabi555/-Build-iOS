import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckSquare, Plus, Trash2, 
  BookOpen, Users, Check 
} from 'lucide-react';

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
  const isRamadan = true; 

  const safeClasses = Array.isArray(classes) ? classes : [];

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('rased_teacher_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // 🧠 حالة جديدة للتحديد المتعدد للفصول بدلاً من قائمة منسدلة
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

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

    setTasks([newTask, ...tasks]);
    setNewTaskTitle(''); 
    setSelectedClasses([]); // تصفير التحديد بعد الإرسال
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm(t('confirmDeleteTask') || 'هل أنت متأكد من حذف هذه المهمة؟')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-500 min-h-screen pt-4" dir={dir}>
      
      {/* 🌟 الهيدر مترجم */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
          <CheckSquare size={24} />
        </div>
        <div>
          <h1 className={`text-2xl font-black ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
            {t('tasksTitle') || 'المهام والواجبات'}
          </h1>
          <p className={`text-[10px] font-bold mt-1 ${isRamadan ? 'text-indigo-200/70' : 'text-slate-500'}`}>
            {t('tasksSubtitle') || 'أرسل الواجبات لطلابك بسرعة بضغطة زر'}
          </p>
        </div>
      </div>

      {/* 📝 بطاقة الإضافة مترجمة */}
      <div className={`p-5 rounded-[2rem] border shadow-lg ${isRamadan ? 'bg-white/5 border-white/10 backdrop-blur-md' : 'bg-white border-slate-100'}`}>
        <h2 className={`text-sm font-black mb-4 flex items-center gap-2 ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
          <Plus size={18} className="text-emerald-400" /> {t('addNewTask') || 'إضافة مهمة جديدة'}
        </h2>
        
        <form onSubmit={handleAddTask} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className={`text-[10px] font-bold ml-1 ${isRamadan ? 'text-indigo-200' : 'text-slate-500'}`}>
              {t('taskTitleLabel') || 'عنوان المهمة / الواجب'}
            </label>
            <div className="relative">
              <BookOpen className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 ${isRamadan ? 'text-white/30' : 'text-slate-400'}`} />
              <input 
                required 
                type="text" 
                placeholder={t('taskTitlePlaceholder') || 'مثال: حل أسئلة الفصل الأول صفحة 45...'} 
                value={newTaskTitle} 
                onChange={e => setNewTaskTitle(e.target.value)} 
                className={`w-full text-sm font-bold py-3.5 ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} rounded-xl outline-none border transition-all ${isRamadan ? 'bg-[#0f172a]/50 text-white border-white/10 focus:border-indigo-400 placeholder:text-white/20' : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-indigo-500'}`} 
              />
            </div>
          </div>

          {/* 🧠 منطقة التحديد المتعدد للفصول بدلاً من القائمة المنسدلة */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className={`text-[10px] font-bold ml-1 ${isRamadan ? 'text-indigo-200' : 'text-slate-500'}`}>
                {t('targetClassLabel') || 'الفصول المستهدفة:'}
              </label>
              <button 
                type="button" 
                onClick={toggleAllClasses}
                className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-colors ${isRamadan ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'}`}
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
                        ? (isRamadan ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-indigo-600 border-indigo-600 text-white shadow-md')
                        : (isRamadan ? 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')
                    }`}
                  >
                    {isSelected && <Check size={12} className={isRamadan ? 'text-emerald-400' : 'text-white'} />}
                    {c}
                  </button>
                );
              })}
            </div>
            {selectedClasses.length === 0 && <p className="text-[10px] text-rose-400 font-bold">{t('alertSelectOneClass') || 'يرجى اختيار فصل واحد على الأقل'}</p>}
          </div>

          <button 
            type="submit" 
            disabled={selectedClasses.length === 0}
            className={`w-full py-4 mt-2 rounded-xl text-sm font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isRamadan ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            <Plus size={18} /> {t('sendTaskBtn') || 'إضافة المهمة'}
          </button>
        </form>
      </div>

      {/* 📚 قائمة المهام مترجمة */}
      <div className="mt-8">
        <h3 className={`text-base font-black mb-4 ${isRamadan ? 'text-white' : 'text-slate-800'}`}>
          {t('activeTasks') || 'المهام النشطة'} ({tasks.length})
        </h3>
        
        {tasks.length === 0 ? (
          <div className={`p-8 rounded-[2rem] border text-center border-dashed ${isRamadan ? 'bg-white/5 border-white/20' : 'bg-slate-50 border-slate-200'}`}>
            <CheckSquare size={40} className={`mx-auto mb-3 opacity-20 ${isRamadan ? 'text-white' : 'text-slate-400'}`} />
            <p className={`text-xs font-bold ${isRamadan ? 'text-indigo-200' : 'text-slate-500'}`}>
              {t('noTasksAdded') || 'لا توجد مهام حالياً. أضف مهمة لطلابك لتصلهم في المزامنة!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${isRamadan ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                <div className="flex justify-between items-start">
                  <h4 className={`text-sm font-black leading-snug ${isRamadan ? 'text-white' : 'text-slate-800'}`}>{task.title}</h4>
                  <button onClick={() => handleDeleteTask(task.id)} className={`p-1.5 rounded-lg transition-colors shrink-0 ${isRamadan ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border ${isRamadan ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                    <Users size={12} /> {t('targetPrefix') || 'مستهدف'}: {task.targetClass}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default TeacherTasks;
