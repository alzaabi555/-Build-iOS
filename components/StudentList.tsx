
import React, { useState } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, ThumbsUp, ThumbsDown, FileBarChart, X, UserCircle, Star, ShieldAlert, Camera } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  onUpdateStudent: (s: Student) => void;
  onViewReport: (s: Student) => void;
}

const StudentList: React.FC<StudentListProps> = ({ students, onUpdateStudent, onViewReport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showLogModal, setShowLogModal] = useState<{ student: Student; type: BehaviorType } | null>(null);
  const [logDesc, setLogDesc] = useState('');

  const positiveCategories = [
    { text: "مشاركة فعالة", icon: "✨" },
    { text: "مساعدة الزملاء", icon: "🤝" },
    { text: "إنجاز الواجبات", icon: "📚" },
    { text: "نظافة شخصية", icon: "🧼" },
    { text: "التزام بالهدوء", icon: "🤫" }
  ];
  const negativeCategories = [
    { text: "تأخر عن الحصة", icon: "⏰" },
    { text: "عدم حل الواجب", icon: "📖" },
    { text: "إثارة فوضى", icon: "📢" },
    { text: "عدم إحضار الكتاب", icon: "🎒" },
    { text: "سلوك غير لائق", icon: "⚠️" }
  ];

  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || s.classes.some(c => c.includes(searchTerm))
  );

  const handleAvatarChange = (student: Student, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpdateStudent({ ...student, avatar: base64String });
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

    const updatedStudent = {
      ...showLogModal.student,
      behaviors: [newBehavior, ...showLogModal.student.behaviors]
    };

    onUpdateStudent(updatedStudent);
    setShowLogModal(null);
    setLogDesc('');
  };

  return (
    <div className="space-y-6">
      <div className="relative group">
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input 
          type="text" 
          placeholder="ابحث عن طالب أو فصل..." 
          className="w-full bg-white border-2 border-gray-50 rounded-[1.5rem] py-4 pr-12 pl-4 focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:outline-none shadow-sm transition-all text-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <UserCircle className="w-20 h-20 opacity-10 mb-4" />
            <p className="font-bold">لم يتم العثور على نتائج</p>
          </div>
        ) : (
          filteredStudents.map((student, idx) => (
            <div key={student.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className="relative group/avatar">
                    <label className="cursor-pointer block">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleAvatarChange(student, e)}
                      />
                      {student.avatar ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                          <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                          idx % 4 === 0 ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 
                          idx % 4 === 1 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 
                          idx % 4 === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 
                          'bg-gradient-to-br from-pink-400 to-pink-600'
                        }`}>
                          {student.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 group-hover/avatar:scale-110 transition-transform">
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                    </label>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg truncate">{student.name}</h4>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {student.classes.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-lg border border-gray-100">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onViewReport(student)}
                  className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-2xl transition-all shrink-0 active:scale-90"
                >
                  <FileBarChart className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <button 
                  onClick={() => setShowLogModal({ student, type: 'positive' })}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider border border-emerald-100 active:scale-[0.97] transition-all hover:bg-emerald-100"
                >
                  <ThumbsUp className="w-4 h-4" />
                  إيجابي
                </button>
                <button 
                  onClick={() => setShowLogModal({ student, type: 'negative' })}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-700 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider border border-rose-100 active:scale-[0.97] transition-all hover:bg-rose-100"
                >
                  <ThumbsDown className="w-4 h-4" />
                  سلبي
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showLogModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${showLogModal.type === 'positive' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {showLogModal.type === 'positive' ? <Star className="fill-emerald-500" /> : <ShieldAlert className="fill-rose-500" />}
                </div>
                <button onClick={() => setShowLogModal(null)} className="p-2.5 bg-gray-100 rounded-full text-gray-400 hover:bg-gray-200 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 mb-1">
                تسجيل {showLogModal.type === 'positive' ? 'سلوك متميز' : 'ملاحظة سلوكية'}
            </h3>
            <p className="text-gray-400 mb-8 text-sm font-medium">الطالب: <span className="text-blue-600 font-bold">{showLogModal.student.name}</span></p>
            
            <div className="mb-8">
                <p className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-widest">خيارات سريعة</p>
                <div className="grid grid-cols-2 gap-3">
                    {(showLogModal.type === 'positive' ? positiveCategories : negativeCategories).map(cat => (
                        <button 
                            key={cat.text}
                            onClick={() => handleAddBehavior(cat.text)}
                            className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-[11px] font-bold border transition-all bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-white hover:shadow-sm"
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.text}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative mb-8">
                <textarea 
                  className="w-full p-5 bg-gray-50 border-2 border-gray-50 rounded-[1.5rem] h-28 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-200 focus:outline-none resize-none text-sm font-medium transition-all"
                  placeholder="أو اكتب وصفاً مخصصاً هنا..."
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                />
            </div>

            <button 
              onClick={() => handleAddBehavior()}
              disabled={!logDesc.trim()}
              className={`w-full py-5 rounded-[1.5rem] font-black text-sm shadow-xl transition-all active:scale-95 ${
                showLogModal.type === 'positive' 
                ? 'bg-emerald-600 shadow-emerald-100 text-white' 
                : 'bg-rose-600 shadow-rose-100 text-white'
              } disabled:bg-gray-200 disabled:shadow-none`}
            >
                حفظ التقرير
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
