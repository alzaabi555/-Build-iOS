import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme/ThemeProvider'; 
import { Users, Plus, Trash2, X, Edit2, Check, UserMinus, FolderPlus, ArrowRight, UserPlus, CheckCircle2 } from 'lucide-react';
import { Drawer as DrawerSheet } from './ui/Drawer';
import PageLayout from '../components/PageLayout'; // 💉 استدعاء الغلاف الشامل

interface StudentGroupsProps {
  onBack?: () => void;
}

const StudentGroups: React.FC<StudentGroupsProps> = ({ onBack }) => {
  const { students, classes, categorizations, setCategorizations, t, dir } = useApp();
  const { theme } = useTheme(); 
  
  const [selectedClass, setSelectedClass] = useState<string>(classes[0] || '');
  const [activeCatId, setActiveCatId] = useState<string>('');
  
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  
  const [assigningToGroup, setAssigningToGroup] = useState<{ catId: string; groupId: string } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const groupColors = [
    { id: 'blue', bg: 'bg-blue-500/10', header: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-500' },
    { id: 'emerald', bg: 'bg-emerald-500/10', header: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-500' },
    { id: 'amber', bg: 'bg-amber-500/10', header: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-500' },
    { id: 'purple', bg: 'bg-purple-500/10', header: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-500' },
    { id: 'rose', bg: 'bg-rose-500/10', header: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-500' },
    { id: 'cyan', bg: 'bg-cyan-500/10', header: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-500' },
  ];
  const [selectedColor, setSelectedColor] = useState(groupColors[0]);

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
      <div className="flex flex-col items-center justify-center h-full p-6 text-textSecondary" dir={dir}>
        <Users className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">{t('noClassesAdded')}</p>
      </div>
    );
  }

  return (
    // 💉 الغلاف الشامل PageLayout
    <PageLayout
      title={t('manageGroupsTitle')}
      subtitle={t('groupsSubtitle')}
      icon={<Users size={24} />}
      showBackButton={!!onBack}
      onBack={onBack}
      
      // 💉 قائمة الفصول في الجانب
      rightActions={
        <select 
            value={selectedClass} 
            onChange={(e) => { setSelectedClass(e.target.value); setActiveCatId(''); }}
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="p-2 md:p-3 rounded-xl border border-borderColor font-black text-sm md:text-lg outline-none cursor-pointer min-w-[120px] md:min-w-[150px] bg-bgCard text-textPrimary focus:border-primary transition-colors"
        >
            {classes.map(c => <option key={c} value={c} className="bg-bgCard text-textPrimary">{c}</option>)}
        </select>
      }
    >

      {/* ⬇️ محتوى الصفحة المباشر (ينزلق بانسيابية) ⬇️ */}
      <div className="flex flex-col md:flex-row gap-4 animate-in fade-in duration-500 pt-2 min-h-[calc(100vh-150px)]">
        
        {/* ================= 🗂️ العمود الأيمن: التقسيمات ================= */}
        <div className="w-full md:w-1/3 flex flex-col shrink-0 glass-panel rounded-3xl overflow-hidden shadow-sm h-full min-h-[400px] border border-borderColor">
          <div className="p-5 border-b border-borderColor shrink-0">
            <h2 className="font-black text-lg mb-4 flex items-center gap-2 text-textPrimary">
              <FolderPlus className="w-5 h-5 text-primary" /> {t('classCategorizations')}
            </h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder={t('catNamePlaceholder')} 
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategorization()}
                className="flex-1 p-3 rounded-xl border text-sm font-bold outline-none bg-bgSoft border-borderColor text-textPrimary focus:border-primary placeholder:text-textSecondary transition-colors"
              />
              <button 
                onClick={handleCreateCategorization}
                disabled={!newCatTitle.trim()}
                className="p-3 rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-50 bg-primary text-white hover:bg-primary/90 shadow-md"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {classCategorizations.length === 0 ? (
              <div className="text-center p-8 rounded-2xl border border-dashed border-borderColor text-textSecondary bg-bgSoft"
                   dangerouslySetInnerHTML={{ __html: t('noCategorizations') }}>
              </div>
            ) : (
              classCategorizations.map(cat => (
                <div 
                  key={cat.id} 
                  onClick={() => setActiveCatId(cat.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center group ${activeCatId === cat.id ? 'border-primary bg-primary/10 shadow-md' : 'border-borderColor bg-bgCard hover:bg-bgSoft'}`}
                >
                  <div>
                    <h3 className={`font-black text-lg ${activeCatId === cat.id ? 'text-primary' : 'text-textPrimary'}`}>{cat.title}</h3>
                    <p className={`text-xs font-bold mt-1 text-textSecondary`}>
                      {cat.groups.length} {t('groupsCount')} • {cat.groups.reduce((acc, g) => acc + g.studentIds.length, 0)} {t('studentsCountWord')}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategorization(cat.id); }}
                    className="p-2 opacity-0 group-hover:opacity-100 rounded-lg transition-all text-danger hover:bg-danger/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ================= 🧩 العمود الأيسر: إدارة المجموعات ================= */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-h-[400px] h-full glass-panel rounded-3xl shadow-sm border border-borderColor">
          {!activeCat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-50 text-textSecondary">
              <Users className="w-24 h-24 mb-6" />
              <h2 className="text-2xl font-black">{t('selectCatToViewGroups')}</h2>
            </div>
          ) : (
            <>
              {/* شريط الإضافة للمجموعات */}
              <div className="p-4 border-b border-borderColor bg-bgSoft flex flex-wrap gap-3 items-center shrink-0">
                <div className="flex gap-1 shrink-0 bg-bgCard p-1.5 rounded-2xl border border-borderColor">
                  {groupColors.map(color => (
                    <button 
                      key={color.id}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color.bg} border-transparent ${color.text} ${selectedColor.id === color.id ? `ring-2 ring-offset-2 ring-bgCard border-current scale-110` : 'opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: 'currentColor' }}
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
                    className="flex-1 p-2 rounded-xl border text-sm font-bold outline-none bg-bgCard border-borderColor text-textPrimary focus:border-primary placeholder:text-textSecondary transition-colors"
                  />
                  <button 
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 bg-primary text-white hover:bg-primary/90 shadow-md"
                  >
                    <Plus className="w-4 h-4" /> {t('addBtn')}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
                
                {/* منطقة الطلاب غير الموزعين */}
                <div className="p-5 rounded-2xl border border-borderColor bg-bgCard shadow-sm">
                  <h3 className="font-black text-sm mb-4 flex items-center justify-between">
                    <span className="text-textSecondary">{t('unassignedStudents')}</span>
                    <span className="text-xs px-3 py-1 rounded-lg font-bold bg-bgSoft text-textPrimary border border-borderColor">
                      {t('remainingLabel')} {unassignedStudents.length}
                    </span>
                  </h3>
                  {unassignedStudents.length === 0 ? (
                    <div className="text-center p-3 font-bold text-sm rounded-xl border bg-success/10 text-success border-success/30">
                      {t('allStudentsAssigned')}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {unassignedStudents.map(s => (
                        <div key={s.id} className="px-3 py-2 rounded-xl text-xs font-black border bg-bgSoft border-borderColor text-textPrimary shadow-sm">
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
                    
                    const isCompleted = group.isCompleted;
                    const containerStyle = isCompleted 
                        ? `bg-bgSoft border-success/50 opacity-70 scale-[0.98] grayscale-[0.5]`
                        : `bg-bgCard ${groupColor.border} shadow-md`;

                    const headerStyle = isCompleted 
                        ? `bg-success/20 border-inherit` 
                        : `${groupColor.header} border-inherit`;

                    return (
                      <div key={group.id} className={`rounded-2xl border-2 flex flex-col overflow-hidden transition-all duration-300 ${containerStyle}`}>
                        <div className={`p-3 border-b flex justify-between items-center shrink-0 ${headerStyle}`}>
                          <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleGroupCompletion(group.id)} 
                                title={isCompleted ? t('undoCompletion') : t('markAsCompleted')}
                                className={`p-1.5 rounded-lg border transition-all ${isCompleted ? 'bg-success border-success text-white shadow-md' : 'bg-bgCard border-borderColor text-textSecondary hover:text-success hover:border-success'}`}
                              >
                                  <CheckCircle2 size={16} className={isCompleted ? "animate-in zoom-in" : ""} />
                              </button>
                              <h3 className={`font-black text-lg ${isCompleted ? 'text-success' : groupColor.text}`}>
                                  {group.name}
                              </h3>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm ${isCompleted ? 'bg-success/20 text-success' : `bg-bgCard/50 ${groupColor.text}`}`}>
                              {groupStudents.length}
                            </span>
                            <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 rounded-lg transition-colors text-danger hover:bg-danger/20" title={t('deleteGroupBtn')}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className={`p-3 flex-1 min-h-[150px] ${isCompleted ? 'bg-transparent' : groupColor.bg}`}>
                          <div className="flex flex-col gap-2">
                            {groupStudents.map(s => (
                              <div key={s.id} className={`p-2 rounded-xl text-xs font-bold border flex justify-between items-center group/item transition-all ${isCompleted ? 'bg-bgCard/40 border-success/30 text-textSecondary line-through' : 'bg-bgCard border-borderColor hover:border-primary text-textPrimary shadow-sm'}`}>
                                <span>{getShortName(s.name)}</span>
                                {!isCompleted && (
                                    <button onClick={() => removeStudentFromGroup(s.id, group.id)} className="p-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-all text-danger hover:bg-danger/20" title={t('removeFromGroupBtn')}>
                                      <UserMinus className="w-3 h-3" />
                                    </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {!isCompleted && (
                            <div className="p-3 border-t shrink-0 bg-bgCard border-borderColor">
                              <button 
                                onClick={() => openAssignModal(group.id)}
                                className="w-full py-2.5 rounded-xl border-2 border-dashed font-bold text-sm flex items-center justify-center gap-2 transition-colors border-borderColor text-textSecondary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
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

      {/* ================= 🎯 نافذة التحديد الجماعي الذكية (لا تُمس أبداً) ================= */}
      {assigningToGroup && activeCat && (
        <DrawerSheet isOpen={true} onClose={() => setAssigningToGroup(null)} dir={dir}>
          <div className="flex flex-col h-full w-full">
            
            <div className="p-5 pb-4 border-b border-borderColor bg-bgSoft flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-xl text-textPrimary">{t('selectStudentsTitle')}</h3>
                <p className="text-sm font-bold mt-1 text-primary">
                  {t('groupLabel')} {activeCat.groups.find(g => g.id === assigningToGroup.groupId)?.name}
                </p>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-bgMain">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                {classStudents.filter(student => {
                    const isSelected = selectedStudentIds.has(student.id);
                    const isInAnotherGroup = activeCat.groups.some(g => g.id !== assigningToGroup.groupId && g.studentIds.includes(student.id));
                    return isSelected || !isInAnotherGroup;
                }).map(student => {
                  const isSelected = selectedStudentIds.has(student.id);
                  
                  return (
                    <div 
                      key={student.id}
                      onClick={() => toggleStudentSelection(student.id)}
                      className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${
                        isSelected 
                          ? 'border-primary bg-primary/10 shadow-sm' 
                          : 'border-borderColor bg-bgCard hover:border-primary/50 hover:bg-bgSoft'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 ${dir === 'rtl' ? 'ml-3' : 'mr-3'} shrink-0 transition-colors ${
                        isSelected ? 'bg-primary border-primary text-white' : 'border-borderColor bg-transparent'
                      }`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm truncate ${isSelected ? 'text-primary' : 'text-textPrimary'}`}>
                          {getShortName(student.name)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 pt-4 mt-auto border-t border-borderColor bg-bgSoft flex gap-3 shrink-0">
              <button onClick={saveBulkAssignment} className="flex-1 py-4 rounded-xl font-black text-sm transition-colors shadow-lg active:scale-95 bg-primary text-white hover:bg-primary/90">
                {t('confirmAndAssignBtn')} ({selectedStudentIds.size})
              </button>
            </div>
            
          </div>
        </DrawerSheet>
      )}

    </PageLayout>
  );
};

export default StudentGroups;
