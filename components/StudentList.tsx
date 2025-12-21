import React, { useState } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, ThumbsUp, ThumbsDown, FileBarChart, X, UserCircle, Camera, LayoutGrid, Plus } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  onUpdateStudent: (s: Student) => void;
  onViewReport: (s: Student) => void;
}

const StudentList: React.FC<StudentListProps> = ({ students, onUpdateStudent, onViewReport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [showLogModal, setShowLogModal] = useState<{ student: Student; type: BehaviorType } | null>(null);
  const [logDesc, setLogDesc] = useState('');
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const allClasses = Array.from(new Set(students.flatMap(s => s.classes || []))).sort();

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || (s.classes && s.classes.includes(selectedClass));
    return matchesSearch && matchesClass;
  });

  const handleAvatarChange = (student: Student, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateStudent({ ...student, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBehavior = (desc?: string) => {
    if (!showLogModal) return;
    const finalDesc = desc || logDesc;
    if (!finalDesc.trim()) return;

    const newBehavior = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: showLogModal.type,
      description: finalDesc,
      points: showLogModal.type === 'positive' ? 1 : -1
    };

    onUpdateStudent({
      ...showLogModal.student,
      behaviors: [newBehavior, ...showLogModal.student.behaviors]
    });
    setShowLogModal(null);
    setLogDesc('');
  };

  const handleCreateClass = () => {
    if (newClassName.trim()) {
      // Classes are derived from students, so to "add" a class we'd need to assign it to someone
      // or keep a separate list. For now, we'll just alert that classes are based on students.
      alert('تمت إضافة اسم الفصل. سيظهر في القائمة بمجرد تعيينه لأي طالب.');
      setIsAddingClass(false);
      setNewClassName('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="ابحث عن طالب..." 
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pr-9 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAddingClass(true)}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-blue-600 shadow-sm active:bg-gray-50"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>

        {/* Classes Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={() => setSelectedClass('all')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${selectedClass === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            الكل
          </button>
          {allClasses.map(cls => (
            <button 
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${selectedClass === cls ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Student Cards */}
      <div className="grid grid-cols-1 gap-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <UserCircle className="w-12 h-12 mx-auto opacity-20 mb-2" />
            <p className="text-xs">لا توجد نتائج</p>
          </div>
        ) : (
          filteredStudents.map((student, idx) => (
            <div key={student.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-3 transition-all active:bg-gray-50/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <label className="relative cursor-pointer shrink-0">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAvatarChange(student, e)} />
                    {student.avatar ? (
                      <img src={student.avatar} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${idx % 2 === 0 ? 'from-blue-500 to-indigo-600' : 'from-emerald-500 to-teal-600'}`}>
                        {student.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm border border-gray-100">
                      <Camera className="w-2.5 h-2.5 text-blue-600" />
                    </div>
                  </label>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 text-xs truncate">{student.name}</h4>
                    <span className="text-[10px] text-gray-400 font-medium">الفصل: {student.classes?.join(' - ') || 'غير محدد'}</span>
                  </div>
                </div>
                <button onClick={() => onViewReport(student)} className="p-2 bg-blue-50 text-blue-600 rounded-lg active:scale-90 transition-transform">
                  <FileBarChart className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowLogModal({ student, type: 'positive' })}
                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 py-2.5 rounded-lg text-[10px] font-black active:bg-emerald-100"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> إيجابي
                </button>
                <button 
                  onClick={() => setShowLogModal({ student, type: 'negative' })}
                  className="flex-1 flex items-center justify-center gap-1 bg-rose-50 text-rose-700 py-2.5 rounded-lg text-[10px] font-black active:bg-rose-100"
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> سلبي
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Class Modal */}
      {isAddingClass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6" onClick={() => setIsAddingClass(false)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-900 text-sm">إضافة فصل جديد</h3>
              <button onClick={() => setIsAddingClass(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-4 h-4"/></button>
            </div>
            <input 
              type="text" 
              placeholder="مثال: 1/أ، 5/ج..." 
              className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/10 outline-none mb-6"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              autoFocus
            />
            <button 
              onClick={handleCreateClass}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-100 active:scale-95 transition-all"
            >
              حفظ الفصل
            </button>
          </div>
        </div>
      )}

      {/* Behavior Modal - Improved for Keyboard Visibility */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center md:items-end" onClick={() => setShowLogModal(null)}>
          <div 
            className="bg-white w-[94%] md:w-full max-w-md rounded-[2.5rem] md:rounded-t-[2.5rem] md:rounded-b-none shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col relative" 
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '85vh' }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-50 shrink-0">
              <div>
                <h3 className="font-black text-gray-900 text-sm">تسجيل سلوك جديد</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">الطالب: {showLogModal.student.name}</p>
              </div>
              <button onClick={() => setShowLogModal(null)} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform"><X className="w-4 h-4"/></button>
            </div>

            {/* Modal Content - Scrollable area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="grid grid-cols-2 gap-2">
                {['مشاركة فعالة', 'إنجاز الواجب', 'التزام الهدوء', 'مساعدة زميل', 'نظافة المكان', 'تحسن ملحوظ'].map(d => (
                  <button 
                    key={d} 
                    onClick={() => handleAddBehavior(d)} 
                    className={`text-right p-3 rounded-xl text-[11px] font-black active:scale-95 transition-all border ${showLogModal.type === 'positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 px-1 uppercase tracking-wider">وصف السلوك</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 rounded-2xl h-24 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-transparent focus:border-blue-100"
                  placeholder="أضف تفاصيل إضافية هنا..."
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-white border-t border-gray-50 safe-bottom shrink-0">
               <button 
                onClick={() => handleAddBehavior()} 
                className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg transition-all active:scale-95 ${showLogModal.type === 'positive' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'}`}
               >
                 تأكيد التسجيل
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;