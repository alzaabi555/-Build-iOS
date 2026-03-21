import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckSquare, Plus, Trash2, 
  BookOpen, Users 
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
  const [newTaskClass, setNewTaskClass] = useState('all');

  useEffect(() => {
    localStorage.setItem('rased_teacher_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `T-${Date.now()}`,
      title: newTaskTitle.trim(),
      subject: teacherSubject || t('unspecified') || 'عام',
      targetClass: newTaskClass === 'all' ? (t('allClasses') || 'الكل') : newTaskClass,
      createdAt: new Date().toISOString()
    };

    setTasks([newTask, ...tasks]);
    setNewTaskTitle(''); 
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

          <div className="space-y-1.5">
            <label className={`text-[10px] font-bold ml-1 ${isRamadan ? 'text-indigo-200' : 'text-slate-500'}`}>
              {t('targetClassLabel') || 'الصف المستهدف'}
            </label>
            <div className="relative">
              <Users className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 ${isRamadan ? 'text-white/30' : 'text-slate-400'}`} />
              <select 
                value={newTaskClass} 
                onChange={e => setNewTaskClass(e.target.value)} 
                className={`w-full text-xs font-bold py-3.5 ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} rounded-xl outline-none border transition-all appearance-none ${isRamadan ? 'bg-[#0f172a]/50 text-white border-white/10 focus:border-indigo-400' : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-indigo-500'}`}
              >
                <option value="all">{t('allClasses') || 'جميع الفصول (الكل)'}</option>
                {safeClasses.map((cls, idx) => (
                  <option key={idx} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className={`w-full py-4 mt-2 rounded-xl text-sm font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isRamadan ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
            <Plus size={18} /> {t('sendTaskBtn') || 'إرسال المهمة'}
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
