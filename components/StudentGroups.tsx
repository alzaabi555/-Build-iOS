import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Plus, Trash2, X, Edit2, Check, UserMinus, FolderPlus, ArrowRight, UserPlus } from 'lucide-react';

interface StudentGroupsProps {
  onBack?: () => void;
}

const StudentGroups: React.FC<StudentGroupsProps> = ({ onBack }) => {
  // ✅ استخدام الحالة الجديدة categorizations التي زرعناها في AppContext
  const { students, classes, categorizations, setCategorizations } = useApp();
  
  const [selectedClass, setSelectedClass] = useState<string>(classes[0] || '');
  const [activeCatId, setActiveCatId] = useState<string>('');
  
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  
  // حالات التوزيع الجماعي (Bulk Assignment)
  const [assigningToGroup, setAssigningToGroup] = useState<{ catId: string; groupId: string } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // لوحة الألوان العصرية
  const groupColors = [
    { id: 'blue', bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
    { id: 'emerald', bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800' },
    { id: 'amber', bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800' },
    { id: 'purple', bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
    { id: 'rose', bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-800' },
    { id: 'cyan', bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-800' },
  ];
  const [selectedColor, setSelectedColor] = useState(groupColors[0]);

  // المستشعر الرمضاني
  const [isRamadan] = useState(() => {
    try {
        const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric' }).formatToParts(new Date());
        return parseInt(parts.find(p => p.type === 'month')?.value || '0') === 9;
    } catch(e) { return false; }
  });

  // ================= الدوال الحسابية الذكية =================

  const classCategorizations = useMemo(() => categorizations.filter(c => c.classId === selectedClass), [categorizations, selectedClass]);
  const activeCat = useMemo(() => classCategorizations.find(c => c.id === activeCatId) || null, [classCategorizations, activeCatId]);
  const classStudents = useMemo(() => students.filter(s => s.classes.includes(selectedClass)), [students, selectedClass]);
  
  const unassignedStudents = useMemo(() => {
    if (!activeCat) return [];
    const assignedIds = new Set(activeCat.groups.flatMap(g => g.studentIds));
    return classStudents.filter(s => !assignedIds.has(s.id));
  }, [classStudents, activeCat]);

  const getShortName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1]}`;
  };

  // ================= دوال الإجراءات =================

  const handleCreateCategorization = () => {
    if (!newCatTitle.trim() || !selectedClass) return;
    const newCat = {
      id: Math.random().toString(36).substring(2, 9),
      title: newCatTitle.trim(),
      classId: selectedClass,
      createdAt: new Date().toISOString(),
      groups: []
    };
    setCategorizations([...categorizations, newCat]);
    setNewCatTitle('');
    setActiveCatId(newCat.id);
  };

  const handleDeleteCategorization = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه التقسيمة بالكامل؟')) {
      setCategorizations(categorizations.filter(c => c.id !== id));
      if (activeCatId === id) setActiveCatId('');
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !activeCatId) return;
    setCategorizations(prev => prev.map(cat => {
      if (cat.id === activeCatId) {
        return {
          ...cat,
          groups: [...cat.groups, { id: Math.random().toString(36).substring(2, 9), name: newGroupName.trim(), color: selectedColor.id, studentIds: [] }]
        };
      }
      return cat;
    }));
    setNewGroupName('');
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المجموعة؟ سيعود طلابها لقائمة غير الموزعين.')) {
      setCategorizations(prev => prev.map(cat => {
        if (cat.id === activeCatId) return { ...cat, groups: cat.groups.filter(g => g.id !== groupId) };
        return cat;
      }));
    }
  };

  // إزالة سريعة لطالب من المجموعة من الواجهة مباشرة
  const removeStudentFromGroup = (studentId: string, groupId: string) => {
    setCategorizations(prev => prev.map(cat => {
      if (cat.id === activeCatId) {
        return {
          ...cat,
          groups: cat.groups.map(g => g.id === groupId ? { ...g, studentIds: g.studentIds.filter(id => id !== studentId) } : g)
        };
      }
      return cat;
    }));
  };

  // ================= دوال التوزيع الجماعي =================

  const openAssignModal = (groupId: string) => {
    if (!activeCat) return;
    const group = activeCat.groups.find(g => g.id === groupId);
    if (group) {
      setSelectedStudentIds(new Set(group.studentIds)); // تعبئة النافذة بالطلاب الموجودين أصلاً
      setAssigningToGroup({ catId: activeCat.id, groupId });
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudentIds);
    if (newSelection.has(studentId)) newSelection.delete(studentId);
    else newSelection.add(studentId);
    setSelectedStudentIds(newSelection);
  };

  const saveBulkAssignment = () => {
    if (!assigningToGroup) return;
    
    setCategorizations(prev => prev.map(cat => {
      if (cat.id === assigningToGroup.catId) {
        // سحب الطلاب من المجموعات الأخرى وإضافتهم للمجموعة الهدف
        const updatedGroups = cat.groups.map(g => {
          if (g.id === assigningToGroup.groupId) {
            return { ...g, studentIds: Array.from(selectedStudentIds) };
          } else {
            return { ...g, studentIds: g.studentIds.filter(id => !selectedStudentIds.has(id)) };
          }
        });
        return { ...cat, groups: updatedGroups };
      }
      return cat;
    }));
    
    setAssigningToGroup(null);
  };

  // ================= واجهة المستخدم =================

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
        <Users className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg font-medium">لا توجد فصول مضافة</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isRamadan ? 'text-white' : 'text-slate-800 bg-[#f8fafc]'}`}>
      
      {/* 🌟 رأس الصفحة */}
      <div className={`p-6 shadow-sm border-b shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isRamadan ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
              <ArrowRight className="w-6 h-6" />
            </button>
          )}
          <div className={`p-3 rounded-2xl ${isRamadan ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black">إدارة المجموعات</h1>
            <p className={`text-sm font-bold mt-1 ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`}>هندسة التوزيع للتعلم التعاوني</p>
          </div>
        </div>

        <select 
          value={selectedClass} 
          onChange={(e) => { setSelectedClass(e.target.value); setActiveCatId(''); }}
          className={`p-3 rounded-xl border font-black text-lg outline-none cursor-pointer min-w-[200px] ${isRamadan ? 'bg-[#0f172a]/80 border-white/20 text-white' : 'bg-slate-50 border-slate-300 text-indigo-900'}`}
        >
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* ================= 🗂️ العمود الأيمن: التقسيمات ================= */}
        <div className={`w-full md:w-1/3 flex flex-col border-l shrink-0 ${isRamadan ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
          <div className="p-5 border-b border-inherit">
            <h2 className="font-black text-lg mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-500" /> تقسيمات الصف
            </h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="اسم التقسيمة (مثال: مشروع العلوم)" 
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategorization()}
                className={`flex-1 p-3 rounded-xl border text-sm font-bold outline-none ${isRamadan ? 'bg-[#0f172a]/50 border-white/20 focus:border-indigo-400' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`}
              />
              <button 
                onClick={handleCreateCategorization}
                disabled={!newCatTitle.trim()}
                className={`p-3 rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-50 ${isRamadan ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {classCategorizations.length === 0 ? (
              <div className={`text-center p-8 rounded-2xl border border-dashed ${isRamadan ? 'border-white/20 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
                لا توجد تقسيمات.<br/>أضف تقسيمة جديدة للبدء.
              </div>
            ) : (
              classCategorizations.map(cat => (
                <div 
                  key={cat.id} 
                  onClick={() => setActiveCatId(cat.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center group ${activeCatId === cat.id ? (isRamadan ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-500 bg-indigo-50 shadow-md') : (isRamadan ? 'border-white/10 bg-transparent hover:bg-white/5' : 'border-slate-200 bg-white hover:border-slate-300')}`}
                >
                  <div>
                    <h3 className={`font-black text-lg ${activeCatId === cat.id ? (isRamadan ? 'text-indigo-300' : 'text-indigo-800') : ''}`}>{cat.title}</h3>
                    <p className={`text-xs font-bold mt-1 ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`}>
                      {cat.groups.length} مجموعات • {cat.groups.reduce((acc, g) => acc + g.studentIds.length, 0)} طالب
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategorization(cat.id); }}
                    className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-100 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ================= 🧩 العمود الأيسر: إدارة المجموعات ================= */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/50">
          {!activeCat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-50">
              <Users className="w-24 h-24 mb-6" />
              <h2 className="text-2xl font-black">اختر تقسيمة لعرض المجموعات</h2>
            </div>
          ) : (
            <>
              {/* شريط الإضافة للمجموعات */}
              <div className={`p-4 border-b flex flex-wrap gap-3 items-center shrink-0 ${isRamadan ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                <div className="flex gap-1">
                  {groupColors.map(color => (
                    <button 
                      key={color.id}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color.bg} ${color.border} ${selectedColor.id === color.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-70 hover:opacity-100'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2 flex-1 min-w-[200px]">
                  <input 
                    type="text" 
                    placeholder="اسم المجموعة (مثال: العباقرة)" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                    className={`flex-1 p-2 rounded-xl border text-sm font-bold outline-none ${isRamadan ? 'bg-[#0f172a]/50 border-white/20 focus:border-indigo-400' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`}
                  />
                  <button 
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 ${isRamadan ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                  >
                    <Plus className="w-4 h-4" /> إضافة
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
                
                {/* منطقة الطلاب غير الموزعين */}
                <div className={`p-5 rounded-2xl border ${isRamadan ? 'bg-[#0f172a]/30 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <h3 className="font-black text-sm mb-4 flex items-center justify-between">
                    <span className="text-slate-500">الطلاب غير الموزعين</span>
                    <span className={`text-xs px-3 py-1 rounded-lg font-bold ${isRamadan ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      المتبقي: {unassignedStudents.length}
                    </span>
                  </h3>
                  {unassignedStudents.length === 0 ? (
                    <div className="text-center p-3 text-emerald-500 font-bold text-sm bg-emerald-50/50 rounded-xl border border-emerald-100">
                      🎉 تم توزيع جميع الطلاب!
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {unassignedStudents.map(s => (
                        <div key={s.id} className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${isRamadan ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          {getShortName(s.name)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* صناديق المجموعات */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-10">
                  {activeCat.groups.map(group => {
                    const groupColor = groupColors.find(c => c.id === group.color) || groupColors[0];
                    const groupStudents = students.filter(s => group.studentIds.includes(s.id));

                    return (
                      <div key={group.id} className={`rounded-2xl border-2 flex flex-col overflow-hidden ${isRamadan ? `bg-white/5 ${groupColor.border}` : `bg-white ${groupColor.border} shadow-sm`}`}>
                        <div className={`p-3 border-b flex justify-between items-center ${isRamadan ? 'bg-white/10 border-inherit' : `${groupColor.bg} border-inherit`}`}>
                          <h3 className={`font-black text-lg ${isRamadan ? 'text-white' : groupColor.text}`}>{group.name}</h3>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-white/50 backdrop-blur-sm ${isRamadan ? 'text-slate-800' : groupColor.text}`}>
                              {groupStudents.length} طلاب
                            </span>
                            <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 hover:bg-white/50 rounded-lg text-rose-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3 flex-1 min-h-[150px] bg-slate-50/30">
                          <div className="flex flex-col gap-2">
                            {groupStudents.map(s => (
                              <div key={s.id} className={`p-2 rounded-xl text-xs font-bold border flex justify-between items-center group/item transition-all ${isRamadan ? 'bg-white/10 border-white/10' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                <span>{getShortName(s.name)}</span>
                                <button onClick={() => removeStudentFromGroup(s.id, group.id)} className="p-1 rounded-md text-rose-500 opacity-0 group-hover/item:opacity-100 hover:bg-rose-100 transition-all" title="إزالة من المجموعة">
                                  <UserMinus className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* زر فتح الإضافة الجماعية */}
                        <div className="p-3 border-t bg-white">
                          <button 
                            onClick={() => openAssignModal(group.id)}
                            className={`w-full py-2.5 rounded-xl border-2 border-dashed font-bold text-sm flex items-center justify-center gap-2 transition-colors ${isRamadan ? 'border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400'}`}
                          >
                            <UserPlus className="w-4 h-4" /> إضافة طلاب للمجموعة
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================= 🎯 نافذة التحديد الجماعي الذكية (Bulk Assign Modal) ================= */}
      {assigningToGroup && activeCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-[2rem] border shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 ${isRamadan ? 'bg-[#0f172a] border-white/20' : 'bg-white border-slate-100'}`}>
            
            <div className={`p-5 border-b flex justify-between items-center ${isRamadan ? 'border-white/10 bg-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <div>
                <h3 className="font-black text-xl">تحديد الطلاب</h3>
                <p className="text-sm font-bold text-indigo-500 mt-1">
                  المجموعة: {activeCat.groups.find(g => g.id === assigningToGroup.groupId)?.name}
                </p>
              </div>
              <button onClick={() => setAssigningToGroup(null)} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classStudents.map(student => {
                  const isSelected = selectedStudentIds.has(student.id);
                  // فحص ذكي: هل الطالب موجود في مجموعة أخرى داخل نفس التقسيمة؟
                  const otherGroup = activeCat.groups.find(g => g.id !== assigningToGroup.groupId && g.studentIds.includes(student.id));
                  
                  return (
                    <div 
                      key={student.id}
                      onClick={() => toggleStudentSelection(student.id)}
                      className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${
                        isSelected 
                          ? (isRamadan ? 'border-indigo-500 bg-indigo-500/20' : 'border-indigo-500 bg-indigo-50') 
                          : (isRamadan ? 'border-white/10 hover:bg-white/5' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50')
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 ml-3 shrink-0 transition-colors ${
                        isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-transparent'
                      }`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm truncate ${isSelected ? (isRamadan ? 'text-indigo-200' : 'text-indigo-900') : ''}`}>
                          {getShortName(student.name)}
                        </p>
                        {otherGroup && !isSelected && (
                          <p className="text-[10px] font-bold text-amber-500 mt-0.5 truncate">
                            موزع في: {otherGroup.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className={`p-4 border-t flex gap-3 ${isRamadan ? 'border-white/10 bg-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <button onClick={saveBulkAssignment} className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black text-lg hover:bg-indigo-700 transition-colors shadow-lg">
                اعتماد وتوزيع ({selectedStudentIds.size})
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentGroups;
