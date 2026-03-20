import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Plus, Trash2, X, Edit2, Check, UserMinus, FolderPlus, ArrowRight, UserPlus, CheckCircle2 } from 'lucide-react';

interface StudentGroupsProps {
  onBack?: () => void;
}

const StudentGroups: React.FC<StudentGroupsProps> = ({ onBack }) => {
  // 🌍 استدعاء محرك اللغات
  const { students, classes, categorizations, setCategorizations, t, dir } = useApp();
  
  const [selectedClass, setSelectedClass] = useState<string>(classes[0] || '');
  const [activeCatId, setActiveCatId] = useState<string>('');
  
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  
  const [assigningToGroup, setAssigningToGroup] = useState<{ catId: string; groupId: string } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const groupColors = [
    { id: 'blue', bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
    { id: 'emerald', bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800' },
    { id: 'amber', bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800' },
    { id: 'purple', bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
    { id: 'rose', bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-800' },
    { id: 'cyan', bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-800' },
  ];
  const [selectedColor, setSelectedColor] = useState(groupColors[0]);

  // 💊 الكبسولة السحرية للثيم الزجاجي
  const isRamadan = true;

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
    if (confirm(t('confirmDeleteCat'))) {
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
          groups: [...cat.groups, { id: Math.random().toString(36).substring(2, 9), name: newGroupName.trim(), color: selectedColor.id, studentIds: [], isCompleted: false }]
        };
      }
      return cat;
    }));
    setNewGroupName('');
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm(t('confirmDeleteGroup'))) {
      setCategorizations(prev => prev.map(cat => {
        if (cat.id === activeCatId) return { ...cat, groups: cat.groups.filter(g => g.id !== groupId) };
        return cat;
      }));
    }
  };

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

  const toggleGroupCompletion = (groupId: string) => {
    setCategorizations(prev => prev.map(cat => {
      if (cat.id === activeCatId) {
        return {
          ...cat,
          groups: cat.groups.map(g => g.id === groupId ? { ...g, isCompleted: !g.isCompleted } : g)
        };
      }
      return cat;
    }));
  };

  const openAssignModal = (groupId: string) => {
    if (!activeCat) return;
    const group = activeCat.groups.find(g => g.id === groupId);
    if (group) {
      setSelectedStudentIds(new Set(group.studentIds)); 
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

  if (classes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-6 ${isRamadan ? 'text-slate-400' : 'text-gray-500'}`} dir={dir}>
        <Users className={`w-16 h-16 mb-4 ${isRamadan ? 'text-slate-600' : 'text-gray-300'}`} />
        <p className="text-lg font-medium">{t('noClassesAdded')}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isRamadan ? 'text-white' : 'text-slate-800 bg-[#f8fafc]'} ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
      
      {/* ================= 🩺 الهيدر القياسي الممتد للنوتش ================= */}
    <header 
    className={`shrink-0 z-40 px-4 pt-[env(safe-area-inset-top)] w-full transition-all duration-300 bg-transparent ${isRamadan ? 'text-white' : 'text-slate-800'}`}
    style={{ WebkitAppRegion: 'drag' } as any}
>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} style={{ WebkitAppRegion: 'no-drag' } as any} className={`p-2 rounded-full transition-colors ${isRamadan ? 'hover:bg-white/10' : 'hover:bg-white/20'}`}>
                <ArrowRight className={`w-6 h-6 ${dir === 'ltr' ? 'rotate-180' : ''}`} />
              </button>
            )}
            <div className="bg-white/10 p-2 rounded-xl border border-white/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div style={{ WebkitAppRegion: 'no-drag' } as any}>
              <h1 className="text-xl md:text-2xl font-black tracking-wide">{t('manageGroupsTitle')}</h1>
              <p className={`text-[10px] font-bold opacity-80 ${isRamadan ? 'text-indigo-200' : 'text-blue-200'}`}>{t('groupsSubtitle')}</p>
            </div>
          </div>

          <select 
            value={selectedClass} 
            onChange={(e) => { setSelectedClass(e.target.value); setActiveCatId(''); }}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className={`p-2 md:p-3 rounded-xl border font-black text-sm md:text-lg outline-none cursor-pointer min-w-[150px] md:min-w-[200px] ${isRamadan ? 'bg-[#0f172a]/80 border-white/20 text-white' : 'bg-white/20 border-white/30 text-white'}`}
          >
            {classes.map(c => <option key={c} value={c} className={isRamadan ? 'bg-[#0f172a]' : 'bg-[#446A8D]'}>{c}</option>)}
          </select>
        </div>
      </header>

      {/* ================= 📝 محتوى الصفحة الداخلي ================= */}
    <div className="flex-1 overflow-y-auto px-2 pt-2 pb-28 custom-scrollbar relative z-10">
        
        {/* ================= 🗂️ العمود الأيمن: التقسيمات ================= */}
        <div className={`w-full md:w-1/3 flex flex-col shrink-0 ${dir === 'rtl' ? 'border-l' : 'border-r'} ${isRamadan ? 'border-white/10 bg-[#020617]/50 backdrop-blur-sm' : 'border-slate-200 bg-white'}`}>
          <div className="p-5 border-b border-inherit">
            <h2 className={`font-black text-lg mb-4 flex items-center gap-2 ${isRamadan ? 'text-indigo-300' : ''}`}>
              <FolderPlus className={`w-5 h-5 ${isRamadan ? 'text-indigo-400' : 'text-indigo-500'}`} /> {t('classCategorizations')}
            </h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder={t('catNamePlaceholder')} 
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategorization()}
                className={`flex-1 p-3 rounded-xl border text-sm font-bold outline-none ${isRamadan ? 'bg-[#0f172a]/80 border-white/20 focus:border-indigo-400 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`}
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

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar pb-28 md:pb-4">
            {classCategorizations.length === 0 ? (
              <div className={`text-center p-8 rounded-2xl border border-dashed ${isRamadan ? 'border-white/20 text-slate-400 bg-white/5' : 'border-slate-300 text-slate-500'}`}
                   dangerouslySetInnerHTML={{ __html: t('noCategorizations') }}>
              </div>
            ) : (
              classCategorizations.map(cat => (
                <div 
                  key={cat.id} 
                  onClick={() => setActiveCatId(cat.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center group ${activeCatId === cat.id ? (isRamadan ? 'border-indigo-500 bg-indigo-500/20' : 'border-indigo-500 bg-indigo-50 shadow-md') : (isRamadan ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:border-slate-300')}`}
                >
                  <div>
                    <h3 className={`font-black text-lg ${activeCatId === cat.id ? (isRamadan ? 'text-indigo-300' : 'text-indigo-800') : ''}`}>{cat.title}</h3>
                    <p className={`text-xs font-bold mt-1 ${isRamadan ? 'text-slate-400' : 'text-slate-500'}`}>
                      {cat.groups.length} {t('groupsCount')} • {cat.groups.reduce((acc, g) => acc + g.studentIds.length, 0)} {t('studentsCountWord')}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategorization(cat.id); }}
                    className={`p-2 opacity-0 group-hover:opacity-100 rounded-lg transition-all ${isRamadan ? 'text-rose-400 hover:bg-rose-500/20' : 'text-rose-500 hover:bg-rose-100'}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ================= 🧩 العمود الأيسر: إدارة المجموعات ================= */}
        <div className={`flex-1 flex flex-col overflow-hidden relative ${isRamadan ? 'bg-transparent' : 'bg-slate-50/50'}`}>
          {!activeCat ? (
            <div className={`flex-1 flex flex-col items-center justify-center p-10 text-center opacity-50 ${isRamadan ? 'text-slate-400' : ''}`}>
              <Users className="w-24 h-24 mb-6" />
              <h2 className="text-2xl font-black">{t('selectCatToViewGroups')}</h2>
            </div>
          ) : (
            <>
              {/* شريط الإضافة للمجموعات */}
              <div className={`p-4 border-b flex flex-wrap gap-3 items-center shrink-0 ${isRamadan ? 'border-white/10 bg-white/5 backdrop-blur-md' : 'border-slate-200 bg-white'}`}>
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
                    placeholder={t('groupNamePlaceholder')} 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                    className={`flex-1 p-2 rounded-xl border text-sm font-bold outline-none ${isRamadan ? 'bg-[#0f172a]/80 border-white/20 focus:border-indigo-400 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`}
                  />
                  <button 
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 ${isRamadan ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                  >
                    <Plus className="w-4 h-4" /> {t('addBtn')}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32 flex flex-col gap-6">
                
                {/* منطقة الطلاب غير الموزعين */}
                <div className={`p-5 rounded-2xl border ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <h3 className="font-black text-sm mb-4 flex items-center justify-between">
                    <span className={isRamadan ? 'text-slate-300' : 'text-slate-500'}>{t('unassignedStudents')}</span>
                    <span className={`text-xs px-3 py-1 rounded-lg font-bold ${isRamadan ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {t('remainingLabel')} {unassignedStudents.length}
                    </span>
                  </h3>
                  {unassignedStudents.length === 0 ? (
                    <div className={`text-center p-3 font-bold text-sm rounded-xl border ${isRamadan ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'text-emerald-500 bg-emerald-50/50 border-emerald-100'}`}>
                      {t('allStudentsAssigned')}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {unassignedStudents.map(s => (
                        <div key={s.id} className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${isRamadan ? 'bg-white/10 border-white/20 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          {getShortName(s.name)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* صناديق المجموعات */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeCat.groups.map(group => {
                    const groupColor = groupColors.find(c => c.id === group.color) || groupColors[0];
                    const groupStudents = students.filter(s => group.studentIds.includes(s.id));
                    
                    const isCompleted = group.isCompleted;
                    const containerStyle = isCompleted 
                        ? (isRamadan ? `bg-emerald-900/30 border-emerald-500/50 opacity-80 scale-[0.98]` : `bg-emerald-50/60 border-emerald-300 opacity-80 scale-[0.98]`)
                        : (isRamadan ? `bg-white/5 ${groupColor.border}` : `bg-white ${groupColor.border} shadow-sm`);

                    const headerStyle = isCompleted 
                        ? (isRamadan ? `bg-emerald-500/20 border-inherit` : `bg-emerald-100/50 border-inherit`) 
                        : (isRamadan ? 'bg-white/10 border-inherit' : `${groupColor.bg} border-inherit`);

                    return (
                      <div key={group.id} className={`rounded-2xl border-2 flex flex-col overflow-hidden transition-all duration-300 ${containerStyle}`}>
                        <div className={`p-3 border-b flex justify-between items-center ${headerStyle}`}>
                          <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleGroupCompletion(group.id)} 
                                title={isCompleted ? t('undoCompletion') : t('markAsCompleted')}
                                className={`p-1.5 rounded-lg border-2 transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : (isRamadan ? 'bg-white/10 border-white/20 text-white hover:border-emerald-400 hover:text-emerald-400' : 'bg-white/50 border-slate-300 text-slate-300 hover:border-emerald-400 hover:text-emerald-500')}`}
                              >
                                  <CheckCircle2 size={16} className={isCompleted ? "animate-in zoom-in" : ""} />
                              </button>
                              <h3 className={`font-black text-lg ${isCompleted ? (isRamadan ? 'text-emerald-300' : 'text-emerald-800') : (isRamadan ? 'text-white' : groupColor.text)}`}>
                                  {group.name}
                              </h3>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm ${isCompleted ? (isRamadan ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/50 text-emerald-700') : (isRamadan ? 'bg-white/20 text-white' : `bg-white/50 ${groupColor.text}`)}`}>
                              {groupStudents.length}
                            </span>
                            <button onClick={() => handleDeleteGroup(group.id)} className={`p-1.5 rounded-lg transition-colors ${isRamadan ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-500'}`} title={t('deleteGroupBtn')}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className={`p-3 flex-1 min-h-[150px] ${isCompleted ? (isRamadan ? 'bg-transparent' : 'bg-emerald-50/30') : (isRamadan ? 'bg-transparent' : 'bg-slate-50/30')}`}>
                          <div className="flex flex-col gap-2">
                            {groupStudents.map(s => (
                              <div key={s.id} className={`p-2 rounded-xl text-xs font-bold border flex justify-between items-center group/item transition-all ${isCompleted ? (isRamadan ? 'bg-white/5 border-emerald-500/30 text-emerald-200/60 line-through' : 'bg-white/40 border-emerald-200/50 text-emerald-900/60 line-through') : (isRamadan ? 'bg-white/10 border-white/10' : 'bg-white border-slate-200 hover:border-slate-300')}`}>
                                <span>{getShortName(s.name)}</span>
                                {!isCompleted && (
                                    <button onClick={() => removeStudentFromGroup(s.id, group.id)} className={`p-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-all ${isRamadan ? 'text-rose-400 hover:bg-rose-500/20' : 'text-rose-500 hover:bg-rose-100'}`} title={t('removeFromGroupBtn')}>
                                      <UserMinus className="w-3 h-3" />
                                    </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {!isCompleted && (
                            <div className={`p-3 border-t ${isRamadan ? 'bg-white/5 border-white/10' : 'bg-white'}`}>
                              <button 
                                onClick={() => openAssignModal(group.id)}
                                className={`w-full py-2.5 rounded-xl border-2 border-dashed font-bold text-sm flex items-center justify-center gap-2 transition-colors ${isRamadan ? 'border-indigo-400/50 text-indigo-300 hover:bg-indigo-500/20' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400'}`}
                              >
                                <UserPlus className="w-4 h-4" /> {t('addStudentsToGroupBtn')}
                              </button>
                            </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================= 🎯 نافذة التحديد الجماعي الذكية ================= */}
      {assigningToGroup && activeCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-[2rem] border shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 ${isRamadan ? 'bg-[#0f172a] border-white/20 text-white' : 'bg-white border-slate-100'}`}>
            
            <div className={`p-5 border-b flex justify-between items-center ${isRamadan ? 'border-white/10 bg-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <div>
                <h3 className="font-black text-xl">{t('selectStudentsTitle')}</h3>
                <p className={`text-sm font-bold mt-1 ${isRamadan ? 'text-indigo-400' : 'text-indigo-500'}`}>
                  {t('groupLabel')} {activeCat.groups.find(g => g.id === assigningToGroup.groupId)?.name}
                </p>
              </div>
              <button onClick={() => setAssigningToGroup(null)} className={`p-2 rounded-full transition-colors ${isRamadan ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classStudents.map(student => {
                  const isSelected = selectedStudentIds.has(student.id);
                  const otherGroup = activeCat.groups.find(g => g.id !== assigningToGroup.groupId && g.studentIds.includes(student.id));
                  
                  return (
                    <div 
                      key={student.id}
                      onClick={() => toggleStudentSelection(student.id)}
                      className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${
                        isSelected 
                          ? (isRamadan ? 'border-indigo-500 bg-indigo-500/20' : 'border-indigo-500 bg-indigo-50') 
                          : (isRamadan ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50')
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 ${dir === 'rtl' ? 'ml-3' : 'mr-3'} shrink-0 transition-colors ${
                        isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : (isRamadan ? 'border-white/30 bg-transparent' : 'border-slate-300 bg-transparent')
                      }`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm truncate ${isSelected ? (isRamadan ? 'text-indigo-300' : 'text-indigo-900') : ''}`}>
                          {getShortName(student.name)}
                        </p>
                        {otherGroup && !isSelected && (
                          <p className={`text-[10px] font-bold mt-0.5 truncate ${isRamadan ? 'text-amber-400' : 'text-amber-500'}`}>
                            {t('assignedToGroupLabel')} {otherGroup.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className={`p-4 border-t flex gap-3 ${isRamadan ? 'border-white/10 bg-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <button onClick={saveBulkAssignment} className={`flex-1 py-3.5 rounded-xl font-black text-lg transition-colors shadow-lg ${isRamadan ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                {t('confirmAndAssignBtn')} ({selectedStudentIds.size})
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentGroups;
