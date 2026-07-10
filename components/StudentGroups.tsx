import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { jsPDF } from 'jspdf';
import { useApp } from '../context/AppContext';
import {
  Users,
  Plus,
  Trash2,
  X,
  Check,
  UserMinus,
  FolderPlus,
  UserPlus,
  CheckCircle2,
  Sparkles,
  Copy,
  Archive,
  Eye,
  Download,
  Image as ImageIcon,
  FileText,
  RotateCcw,
  Shuffle,
  Layers,
  Wand2
} from 'lucide-react';
import { Drawer as DrawerSheet } from './ui/Drawer';
import PageLayout from '../components/PageLayout';

interface StudentGroupsProps {
  onBack?: () => void;
}

type CopyMode = 'same_empty' | 'same_with_students' | 'other_empty' | 'other_with_students';

const StudentGroups: React.FC<StudentGroupsProps> = ({ onBack }) => {
  const {
    students,
    classes,
    categorizations,
    setCategorizations,
    t,
    dir
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<string>(classes[0] || '');
  const [activeCatId, setActiveCatId] = useState<string>('');

  const [newCatTitle, setNewCatTitle] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  const [assigningToGroup, setAssigningToGroup] = useState<{ catId: string; groupId: string } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoGroupCount, setAutoGroupCount] = useState(4);
  const [autoGroupPrefix, setAutoGroupPrefix] = useState('فريق');
  const [autoDistribute, setAutoDistribute] = useState(true);
  const [autoShuffle, setAutoShuffle] = useState(true);

  const [showPresentation, setShowPresentation] = useState(false);

  const [copyCat, setCopyCat] = useState<any | null>(null);
  const [copyMode, setCopyMode] = useState<CopyMode>('same_empty');
  const [copyTargetClass, setCopyTargetClass] = useState<string>(selectedClass);

  const [showArchived, setShowArchived] = useState(false);

  const presentationRef = useRef<HTMLDivElement>(null);

  const groupColors = [
    { id: 'blue', bg: 'bg-blue-500/10', header: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-500', solid: '#3b82f6' },
    { id: 'emerald', bg: 'bg-emerald-500/10', header: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-500', solid: '#10b981' },
    { id: 'amber', bg: 'bg-amber-500/10', header: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-500', solid: '#f59e0b' },
    { id: 'purple', bg: 'bg-purple-500/10', header: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-500', solid: '#a855f7' },
    { id: 'rose', bg: 'bg-rose-500/10', header: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-500', solid: '#f43f5e' },
    { id: 'cyan', bg: 'bg-cyan-500/10', header: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-500', solid: '#06b6d4' }
  ];

  const [selectedColor, setSelectedColor] = useState(groupColors[0]);

  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      setSelectedClass(classes[0]);
    }

    if (selectedClass && !classes.includes(selectedClass) && classes.length > 0) {
      setSelectedClass(classes[0]);
      setActiveCatId('');
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    setCopyTargetClass(selectedClass);
  }, [selectedClass]);

  const classStudents = useMemo(() => {
    return students.filter((student: any) => Array.isArray(student.classes) && student.classes.includes(selectedClass));
  }, [students, selectedClass]);

  const classCategorizations = useMemo(() => {
    return categorizations.filter((cat: any) => {
      const isForClass = cat.classId === selectedClass;
      const isArchived = Boolean(cat.archivedAt);
      return isForClass && (showArchived ? isArchived : !isArchived);
    });
  }, [categorizations, selectedClass, showArchived]);

  const activeCat = useMemo(() => {
    return classCategorizations.find((cat: any) => cat.id === activeCatId) || null;
  }, [classCategorizations, activeCatId]);

  useEffect(() => {
    if (!activeCat && classCategorizations.length > 0) {
      setActiveCatId(classCategorizations[0].id);
    }

    if (classCategorizations.length === 0) {
      setActiveCatId('');
    }
  }, [activeCat, classCategorizations]);

  const unassignedStudents = useMemo(() => {
    if (!activeCat) return [];

    const assignedIds = new Set(
      (activeCat.groups || []).flatMap((group: any) => Array.isArray(group.studentIds) ? group.studentIds : [])
    );

    return classStudents.filter((student: any) => !assignedIds.has(student.id));
  }, [classStudents, activeCat]);

  const assignedCount = useMemo(() => {
    if (!activeCat) return 0;

    const assignedIds = new Set(
      (activeCat.groups || []).flatMap((group: any) => Array.isArray(group.studentIds) ? group.studentIds : [])
    );

    return assignedIds.size;
  }, [activeCat]);

  const completedGroupsCount = useMemo(() => {
    if (!activeCat) return 0;
    return (activeCat.groups || []).filter((group: any) => group.isCompleted).length;
  }, [activeCat]);

  const getShortName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ').filter(Boolean);
    return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const getGroupColor = (colorId: string) => {
    return groupColors.find(color => color.id === colorId) || groupColors[0];
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
    setShowArchived(false);
  };

  const handleDeleteCategorization = (id: string) => {
    if (window.confirm('هل تريد حذف هذا التقسيم نهائيًا؟')) {
      setCategorizations(categorizations.filter((cat: any) => cat.id !== id));
      if (activeCatId === id) setActiveCatId('');
    }
  };

  const handleArchiveCategorization = (id: string) => {
    if (!window.confirm('هل تريد أرشفة هذا التقسيم؟ سيختفي من القائمة النشطة ويمكن عرضه لاحقًا من الأرشيف.')) return;

    setCategorizations((prev: any[]) =>
      prev.map((cat: any) =>
        cat.id === id
          ? { ...cat, archivedAt: new Date().toISOString() }
          : cat
      )
    );

    if (activeCatId === id) setActiveCatId('');
  };

  const handleRestoreCategorization = (id: string) => {
    setCategorizations((prev: any[]) =>
      prev.map((cat: any) => {
        if (cat.id !== id) return cat;

        const nextCat = { ...cat };
        delete nextCat.archivedAt;
        return nextCat;
      })
    );
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !activeCatId) return;

    setCategorizations((prev: any[]) =>
      prev.map((cat: any) => {
        if (cat.id !== activeCatId) return cat;

        return {
          ...cat,
          groups: [
            ...(cat.groups || []),
            {
              id: Math.random().toString(36).substring(2, 9),
              name: newGroupName.trim(),
              color: selectedColor.id,
              studentIds: [],
              isCompleted: false
            }
          ]
        };
      })
    );

    setNewGroupName('');
  };

  const handleCreateAutoGroups = () => {
    if (!activeCatId) return;

    const count = Math.max(1, Math.min(12, Number(autoGroupCount) || 1));
    const prefix = autoGroupPrefix.trim() || 'فريق';

    let studentPool = [...classStudents];

    if (autoShuffle) {
      studentPool = studentPool
        .map((student: any) => ({ student, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(item => item.student);
    }

    const generatedGroups = Array.from({ length: count }).map((_, index) => {
      const color = groupColors[index % groupColors.length];

      let studentIds: string[] = [];

      if (autoDistribute) {
        studentIds = studentPool
          .filter((_, studentIndex) => studentIndex % count === index)
          .map((student: any) => student.id);
      }

      return {
        id: Math.random().toString(36).substring(2, 9),
        name: `${prefix} ${index + 1}`,
        color: color.id,
        studentIds,
        isCompleted: false
      };
    });

    setCategorizations((prev: any[]) =>
      prev.map((cat: any) => {
        if (cat.id !== activeCatId) return cat;

        return {
          ...cat,
          groups: generatedGroups
        };
      })
    );

    setShowAutoModal(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!window.confirm(t('confirmDeleteGroup') || 'هل تريد حذف هذه المجموعة؟')) return;

    setCategorizations((prev: any[]) =>
      prev.map((cat: any) => {
        if (cat.id !== activeCatId) return cat;

        return {
          ...cat,
          groups: (cat.groups || []).filter((group: any) => group.id !== groupId)
        };
      })
    );
  };

  const removeStudentFromGroup = (studentId: string, groupId: string) => {
    setCategorizations((prev: any[]) =>
      prev.map((cat: any) => {
        if (cat.id !== activeCatId) return cat;

        return {
          ...cat,
          groups: (cat.groups || []).map((group: any) =>
            group.id === groupId
              ? { ...group, studentIds: (group.studentIds || []).filter((id: string) => id !== studentId) }
              : group
          )
        };
      })
    );
  };

  const toggleGroupCompletion = (groupId: string) => {
    setCategorizations((prev: any[]) =>
      prev.map((cat: any) => {
        if (cat.id !== activeCatId) return cat;

        return {
          ...cat,
          groups: (cat.groups || []).map((group: any) =>
            group.id === groupId
              ? { ...group, isCompleted: !group.isCompleted }
              : group
          )
        };
      })
    );
  };

  const openAssignModal = (groupId: string) => {
    if (!activeCat) return;

    const group = (activeCat.groups || []).find((item: any) => item.id === groupId);

    if (!group) return;

    setSelectedStudentIds(new Set(group.studentIds || []));
    setAssigningToGroup({ catId: activeCat.id, groupId });
  };

  const toggleStudentSelection = (studentId: string) => {
    const nextSelection = new Set(selectedStudentIds);

    if (nextSelection.has(studentId)) {
      nextSelection.delete(studentId);
    } else {
      nextSelection.add(studentId);
    }

    setSelectedStudentIds(nextSelection);
  };

  const saveBulkAssignment = () => {
    if (!assigningToGroup) return;

    setCategorizations((prev: any[]) =>
      prev.map((cat: any) => {
        if (cat.id !== assigningToGroup.catId) return cat;

        const selectedIds = Array.from(selectedStudentIds);

        const updatedGroups = (cat.groups || []).map((group: any) => {
          if (group.id === assigningToGroup.groupId) {
            return {
              ...group,
              studentIds: selectedIds
            };
          }

          return {
            ...group,
            studentIds: (group.studentIds || []).filter((id: string) => !selectedStudentIds.has(id))
          };
        });

        return { ...cat, groups: updatedGroups };
      })
    );

    setAssigningToGroup(null);
  };

  const openCopyModal = (cat: any) => {
    setCopyCat(cat);
    setCopyMode('same_empty');
    setCopyTargetClass(selectedClass);
  };

  const handleCopyCategorization = () => {
    if (!copyCat) return;

    const targetClass =
      copyMode === 'other_empty' || copyMode === 'other_with_students'
        ? copyTargetClass
        : copyCat.classId;

    const shouldCopyStudents =
      copyMode === 'same_with_students' || copyMode === 'other_with_students';

    const targetClassStudentIds = new Set(
      students
        .filter((student: any) => Array.isArray(student.classes) && student.classes.includes(targetClass))
        .map((student: any) => student.id)
    );

    const copiedGroups = (copyCat.groups || []).map((group: any, index: number) => {
      let studentIds: string[] = [];

      if (shouldCopyStudents) {
        studentIds = (group.studentIds || []).filter((id: string) => {
          if (targetClass === copyCat.classId) return true;
          return targetClassStudentIds.has(id);
        });
      }

      return {
        ...group,
        id: Math.random().toString(36).substring(2, 9),
        name: group.name || `المجموعة ${index + 1}`,
        studentIds,
        isCompleted: false
      };
    });

    const copiedCat = {
      id: Math.random().toString(36).substring(2, 9),
      title: `${copyCat.title} - نسخة`,
      classId: targetClass,
      createdAt: new Date().toISOString(),
      groups: copiedGroups
    };

    setCategorizations((prev: any[]) => [...prev, copiedCat]);
    setCopyCat(null);
    setSelectedClass(targetClass);
    setShowArchived(false);
    setActiveCatId(copiedCat.id);
  };

  const escapeXml = (value: string) => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const getStudentNameById = (id: string) => {
    const student = students.find((item: any) => item.id === id);
    return student ? getShortName(student.name) : '';
  };

  const sanitizeFileName = (value: string) => {
    return String(value || 'rased-groups')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '_')
      .slice(0, 80);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };

      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const downloadBlobOnWeb = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const saveOrShareFile = async (blob: Blob, fileName: string, title: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const base64 = await blobToBase64(blob);

        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
          recursive: true
        });

        const fileUri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache
        });

        await Share.share({
          title,
          text: title,
          url: fileUri.uri,
          dialogTitle: title
        });

        return;
      } catch (error) {
        console.error('Native export failed, falling back to web download', error);
      }
    }

    downloadBlobOnWeb(blob, fileName);
  };

  const createGroupsCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!activeCat) {
      throw new Error('لا يوجد تقسيم نشط للتصدير');
    }

    const groups = activeCat.groups || [];
    const cardWidth = 380;
    const cardGap = 24;
    const columns = groups.length <= 1 ? 1 : 2;
    const rows = Math.max(1, Math.ceil(groups.length / columns));

    const maxStudentsInGroup = Math.max(
      4,
      ...groups.map((group: any) => (group.studentIds || []).length)
    );

    const cardHeight = Math.max(230, 92 + maxStudentsInGroup * 26);
    const svgWidth = columns === 1 ? 470 : 860;
    const svgHeight = 160 + rows * (cardHeight + cardGap) + 40;

    const groupCards = groups.map((group: any, index: number) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      const x = 40 + col * (cardWidth + cardGap);
      const y = 135 + row * (cardHeight + cardGap);

      const color = getGroupColor(group.color);
      const names = (group.studentIds || [])
        .map((id: string) => getStudentNameById(id))
        .filter(Boolean);

      const namesSvg = names.map((name: string, nameIndex: number) => {
        return `
          <text
            x="${x + cardWidth - 24}"
            y="${y + 86 + nameIndex * 26}"
            font-size="17"
            font-weight="700"
            fill="#334155"
            text-anchor="end"
            direction="rtl"
            unicode-bidi="plaintext"
          >${escapeXml(name)}</text>
        `;
      }).join('');

      return `
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="26" fill="#ffffff" stroke="${color.solid}" stroke-width="3"/>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="58" rx="26" fill="${color.solid}" opacity="0.16"/>
        <text x="${x + cardWidth - 24}" y="${y + 37}" font-size="23" font-weight="800" fill="${color.solid}" text-anchor="end" direction="rtl" unicode-bidi="plaintext">${escapeXml(group.name)}</text>
        <text x="${x + 30}" y="${y + 37}" font-size="16" font-weight="700" fill="#64748b">${(group.studentIds || []).length} طلاب</text>
        ${namesSvg}
      `;
    }).join('');

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="24" y="24" width="${svgWidth - 48}" height="86" rx="28" fill="#0f172a"/>
        <text x="${svgWidth - 50}" y="60" font-size="30" font-weight="800" fill="#ffffff" text-anchor="end" direction="rtl" unicode-bidi="plaintext">راصد - ${escapeXml(activeCat.title)}</text>
        <text x="${svgWidth - 50}" y="92" font-size="18" font-weight="700" fill="#cbd5e1" text-anchor="end" direction="rtl" unicode-bidi="plaintext">الفصل: ${escapeXml(selectedClass)} • عدد المجموعات: ${groups.length}</text>
        ${groupCards}
      </svg>
    `;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgWidth;
        canvas.height = svgHeight;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('تعذر إنشاء Canvas'));
          return;
        }

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, svgWidth, svgHeight);
        ctx.drawImage(image, 0, 0);

        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('تعذر إنشاء صورة المجموعات'));
      };

      image.src = url;
    });
  };

  const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/png', quality = 0.95): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('تعذر تحويل الصورة إلى ملف'));
            return;
          }

          resolve(blob);
        },
        type,
        quality
      );
    });
  };

  const handleExportAsImage = async () => {
    if (!activeCat) return;

    try {
      const canvas = await createGroupsCanvas();
      const blob = await canvasToBlob(canvas, 'image/png');

      const fileName = `${sanitizeFileName(`rased_groups_${selectedClass}_${activeCat.title}`)}.png`;

      await saveOrShareFile(
        blob,
        fileName,
        'تصدير مجموعات راصد كصورة'
      );
    } catch (error) {
      console.error(error);
      alert('تعذر تصدير المجموعات كصورة.');
    }
  };

  const handleExportAsPdf = async () => {
    if (!activeCat) return;

    try {
      const canvas = await createGroupsCanvas();
      const imageData = canvas.toDataURL('image/png', 0.95);

      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(
        imageData,
        'PNG',
        0,
        0,
        canvas.width,
        canvas.height
      );

      const pdfBlob = pdf.output('blob');

      const fileName = `${sanitizeFileName(`rased_groups_${selectedClass}_${activeCat.title}`)}.pdf`;

      await saveOrShareFile(
        pdfBlob,
        fileName,
        'تصدير مجموعات راصد PDF'
      );
    } catch (error) {
      console.error(error);
      alert('تعذر تصدير المجموعات كملف PDF.');
    }
  };

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-textSecondary" dir={dir}>
        <Users className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">{t('noClassesAdded')}</p>
      </div>
    );
  }

  const summaryCards = [
    { label: 'طلاب الفصل', value: classStudents.length, icon: Users, tone: 'text-primary bg-primary/10 border-primary/20' },
    { label: 'المجموعات', value: activeCat?.groups?.length || 0, icon: Layers, tone: 'text-info bg-info/10 border-info/20' },
    { label: 'الموزعون', value: assignedCount, icon: CheckCircle2, tone: 'text-success bg-success/10 border-success/20' },
    { label: 'غير موزعين', value: unassignedStudents.length, icon: UserPlus, tone: 'text-warning bg-warning/10 border-warning/20' },
    { label: 'مكتملة', value: completedGroupsCount, icon: Check, tone: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }
  ];

  return (
    <PageLayout
      title={t('manageGroupsTitle') || 'إدارة المجموعات'}
      subtitle={t('groupsSubtitle') || 'تقسيم الطلاب وتنظيم فرق العمل'}
      icon={<Users size={24} />}
      showBackButton={!!onBack}
      onBack={onBack}
      rightActions={
        <select
          value={selectedClass}
          onChange={(event) => {
            setSelectedClass(event.target.value);
            setActiveCatId('');
          }}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className="p-2 md:p-3 rounded-xl border border-borderColor font-black text-sm md:text-base outline-none cursor-pointer min-w-[120px] md:min-w-[150px] bg-bgCard text-textPrimary focus:border-primary transition-colors"
        >
          {classes.map((className: string) => (
            <option key={className} value={className} className="bg-bgCard text-textPrimary">
              {className}
            </option>
          ))}
        </select>
      }
    >
      <div className="space-y-4 md:space-y-5 animate-in fade-in duration-500 pb-10">

        <section className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
          {summaryCards.map(card => {
            const Icon = card.icon;

            return (
              <div key={card.label} className="bg-bgCard border border-borderColor rounded-2xl p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.tone}`}>
                    <Icon size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-black text-textPrimary">{card.value}</div>
                    <div className="text-[10px] font-bold text-textSecondary">{card.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="bg-bgCard border border-borderColor rounded-3xl p-3 md:p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              <h2 className="font-black text-base md:text-lg text-textPrimary">التقسيمات</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 flex-1 lg:flex-none">
              <input
                type="text"
                placeholder={t('catNamePlaceholder') || 'اسم التقسيم الجديد'}
                value={newCatTitle}
                onChange={(event) => setNewCatTitle(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleCreateCategorization()}
                className="flex-1 sm:w-64 p-3 rounded-xl border text-sm font-bold outline-none bg-bgSoft border-borderColor text-textPrimary focus:border-primary placeholder:text-textSecondary transition-colors"
              />
              <button
                onClick={handleCreateCategorization}
                disabled={!newCatTitle.trim()}
                className="px-4 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-primary text-white hover:bg-primary/90 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                تقسيم
              </button>
              <button
                onClick={() => setShowArchived(prev => !prev)}
                className={`px-4 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all border ${
                  showArchived
                    ? 'bg-warning/10 text-warning border-warning/30'
                    : 'bg-bgSoft text-textSecondary border-borderColor hover:text-primary'
                }`}
              >
                <Archive className="w-4 h-4" />
                {showArchived ? 'الأرشيف' : 'عرض الأرشيف'}
              </button>
            </div>
          </div>

          {classCategorizations.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-borderColor bg-bgSoft text-center text-textSecondary">
              {showArchived ? 'لا توجد تقسيمات مؤرشفة لهذا الفصل.' : 'لا توجد تقسيمات بعد. أنشئ تقسيمًا جديدًا للبدء.'}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {classCategorizations.map((cat: any) => {
                const isActive = activeCatId === cat.id;
                const totalStudents = (cat.groups || []).reduce((acc: number, group: any) => acc + (group.studentIds || []).length, 0);

                return (
                  <div
                    key={cat.id}
                    onClick={() => setActiveCatId(cat.id)}
                    className={`min-w-[220px] rounded-2xl border-2 p-3 cursor-pointer transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-borderColor bg-bgSoft hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className={`font-black truncate ${isActive ? 'text-primary' : 'text-textPrimary'}`}>
                          {cat.title}
                        </h3>
                        <p className="text-[10px] font-bold text-textSecondary mt-1">
                          {(cat.groups || []).length} مجموعات • {totalStudents} طالب
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!cat.archivedAt ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleArchiveCategorization(cat.id);
                            }}
                            className="p-1.5 rounded-lg text-textSecondary hover:text-warning hover:bg-warning/10"
                            title="أرشفة"
                          >
                            <Archive size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRestoreCategorization(cat.id);
                            }}
                            className="p-1.5 rounded-lg text-success hover:bg-success/10"
                            title="استعادة"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCopyModal(cat);
                          }}
                          className="p-1.5 rounded-lg text-textSecondary hover:text-primary hover:bg-primary/10"
                          title="نسخ"
                        >
                          <Copy size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteCategorization(cat.id);
                          }}
                          className="p-1.5 rounded-lg text-danger hover:bg-danger/10"
                          title="حذف"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {!activeCat ? (
          <section className="min-h-[360px] bg-bgCard border border-borderColor rounded-3xl flex flex-col items-center justify-center p-10 text-center text-textSecondary">
            <Users className="w-20 h-20 mb-5 opacity-50" />
            <h2 className="text-xl md:text-2xl font-black">اختر تقسيمًا لعرض المجموعات</h2>
            <p className="text-sm font-bold mt-2">يمكنك إنشاء تقسيم جديد أو اختيار تقسيم سابق من الأعلى.</p>
          </section>
        ) : (
          <>
            <section className="bg-bgCard border border-borderColor rounded-3xl p-4 shadow-sm">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                    <Wand2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-textPrimary truncate">{activeCat.title}</h2>
                    <p className="text-xs font-bold text-textSecondary mt-0.5">
                      إدارة مجموعات فصل {selectedClass}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowAutoModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-primary text-white font-black text-xs flex items-center gap-2 shadow-sm active:scale-95"
                  >
                    <Sparkles size={15} />
                    إنشاء تلقائي
                  </button>

                  <button
                    onClick={() => setShowPresentation(true)}
                    className="px-4 py-2.5 rounded-xl bg-info/10 text-info border border-info/20 font-black text-xs flex items-center gap-2 active:scale-95"
                  >
                    <Eye size={15} />
                    عرض تقديمي
                  </button>

                  <button
                    onClick={handleExportAsImage}
                    className="px-4 py-2.5 rounded-xl bg-success/10 text-success border border-success/20 font-black text-xs flex items-center gap-2 active:scale-95"
                  >
                    <ImageIcon size={15} />
                    صورة
                  </button>

                  <button
                    onClick={handleExportAsPdf}
                    className="px-4 py-2.5 rounded-xl bg-warning/10 text-warning border border-warning/20 font-black text-xs flex items-center gap-2 active:scale-95"
                  >
                    <FileText size={15} />
                    PDF
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="flex gap-1 bg-bgSoft p-1.5 rounded-2xl border border-borderColor">
                    {groupColors.map(color => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          selectedColor.id === color.id
                            ? 'ring-2 ring-offset-2 ring-bgCard border-white scale-110'
                            : 'opacity-80 hover:opacity-100 border-transparent'
                        }`}
                        style={{ backgroundColor: color.solid }}
                      />
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder={t('groupNamePlaceholder') || 'اسم المجموعة'}
                    value={newGroupName}
                    onChange={(event) => setNewGroupName(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleCreateGroup()}
                    className="flex-1 min-w-[180px] p-3 rounded-xl border text-sm font-bold outline-none bg-bgSoft border-borderColor text-textPrimary focus:border-primary placeholder:text-textSecondary transition-colors"
                  />

                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="px-4 py-3 rounded-xl font-black flex items-center gap-2 transition-all disabled:opacity-50 bg-primary text-white hover:bg-primary/90 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة
                  </button>
                </div>

                <div className="rounded-2xl border border-borderColor bg-bgSoft p-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-black text-sm text-textPrimary flex items-center gap-2">
                      <UserPlus size={16} className="text-warning" />
                      الطلاب غير الموزعين
                    </h3>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-bgCard border border-borderColor text-textSecondary">
                      {unassignedStudents.length} متبقٍ
                    </span>
                  </div>

                  {unassignedStudents.length === 0 ? (
                    <div className="text-center py-3 rounded-xl bg-success/10 text-success border border-success/20 text-xs font-black">
                      تم توزيع جميع الطلاب في هذا التقسيم
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar">
                      {unassignedStudents.map((student: any) => (
                        <span
                          key={student.id}
                          className="px-3 py-2 rounded-xl text-xs font-black border bg-bgCard border-borderColor text-textPrimary shadow-sm"
                        >
                          {getShortName(student.name)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 md:gap-5">
              {(activeCat.groups || []).length === 0 ? (
                <div className="col-span-full rounded-3xl border border-dashed border-borderColor bg-bgCard p-10 text-center text-textSecondary">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-black text-textPrimary">لا توجد مجموعات بعد</h3>
                  <p className="text-sm font-bold mt-2">
                    أضف مجموعة يدويًا أو استخدم الإنشاء التلقائي لتوزيع الطلاب بسرعة.
                  </p>
                </div>
              ) : (
                (activeCat.groups || []).map((group: any) => {
                  const color = getGroupColor(group.color);
                  const groupStudents = students.filter((student: any) => (group.studentIds || []).includes(student.id));
                  const isCompleted = Boolean(group.isCompleted);

                  return (
                    <div
                      key={group.id}
                      className={`rounded-3xl border-2 overflow-hidden transition-all shadow-sm ${
                        isCompleted
                          ? 'bg-bgSoft border-success/40 opacity-80'
                          : `bg-bgCard ${color.border}`
                      }`}
                    >
                      <div className={`p-4 border-b ${isCompleted ? 'bg-success/10 border-success/20' : `${color.header} border-inherit`}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={() => toggleGroupCompletion(group.id)}
                              title={isCompleted ? 'إلغاء الإكمال' : 'تمييز كمكتملة'}
                              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                                isCompleted
                                  ? 'bg-success text-white border-success shadow-sm'
                                  : 'bg-bgCard border-borderColor text-textSecondary hover:text-success hover:border-success'
                              }`}
                            >
                              <CheckCircle2 size={17} />
                            </button>

                            <div className="min-w-0">
                              <h3 className={`font-black text-lg truncate ${isCompleted ? 'text-success' : color.text}`}>
                                {group.name}
                              </h3>
                              <p className="text-[10px] font-bold text-textSecondary mt-0.5">
                                {groupStudents.length} طالب
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="p-2 rounded-xl text-danger hover:bg-danger/10 transition-colors shrink-0"
                            title="حذف المجموعة"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>

                      <div className={`p-4 min-h-[150px] ${isCompleted ? 'bg-transparent' : color.bg}`}>
                        {groupStudents.length === 0 ? (
                          <div className="h-full min-h-[90px] flex items-center justify-center text-center rounded-2xl border border-dashed border-borderColor text-textSecondary text-xs font-bold bg-bgCard/60">
                            لا يوجد طلاب في هذه المجموعة
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {groupStudents.map((student: any) => (
                              <div
                                key={student.id}
                                className={`p-2.5 rounded-xl text-xs font-bold border flex justify-between items-center group/item transition-all ${
                                  isCompleted
                                    ? 'bg-bgCard/40 border-success/30 text-textSecondary line-through'
                                    : 'bg-bgCard border-borderColor hover:border-primary text-textPrimary shadow-sm'
                                }`}
                              >
                                <span className="truncate">{getShortName(student.name)}</span>

                                {!isCompleted && (
                                  <button
                                    onClick={() => removeStudentFromGroup(student.id, group.id)}
                                    className="p-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-all text-danger hover:bg-danger/20 shrink-0"
                                    title="إزالة من المجموعة"
                                  >
                                    <UserMinus size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {!isCompleted && (
                        <div className="p-3 border-t bg-bgCard border-borderColor">
                          <button
                            onClick={() => openAssignModal(group.id)}
                            className="w-full py-2.5 rounded-xl border-2 border-dashed font-black text-xs flex items-center justify-center gap-2 transition-colors border-borderColor text-textSecondary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                          >
                            <UserPlus size={15} />
                            إضافة / تعديل الطلاب
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>

      {showAutoModal && (
        <DrawerSheet isOpen={showAutoModal} onClose={() => setShowAutoModal(false)} dir={dir}>
          <div className="flex flex-col h-full w-full">
            <div className="pb-4 border-b border-borderColor">
              <h3 className="font-black text-xl text-textPrimary flex items-center gap-2">
                <Sparkles className="text-primary" size={22} />
                إنشاء مجموعات تلقائيًا
              </h3>
              <p className="text-xs font-bold text-textSecondary mt-1">
                يمكنك إنشاء مجموعات بعدد محدد وتوزيع الطلاب عليها تلقائيًا.
              </p>
            </div>

            <div className="py-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-black text-textSecondary mb-2">عدد المجموعات</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={autoGroupCount}
                  onChange={(event) => setAutoGroupCount(Number(event.target.value))}
                  className="w-full p-3 rounded-xl border bg-bgSoft border-borderColor text-textPrimary font-black outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-textSecondary mb-2">بادئة اسم المجموعة</label>
                <input
                  value={autoGroupPrefix}
                  onChange={(event) => setAutoGroupPrefix(event.target.value)}
                  className="w-full p-3 rounded-xl border bg-bgSoft border-borderColor text-textPrimary font-bold outline-none focus:border-primary"
                  placeholder="مثال: فريق"
                />
              </div>

              <label className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-borderColor bg-bgSoft cursor-pointer">
                <div>
                  <p className="font-black text-sm text-textPrimary">توزيع الطلاب تلقائيًا</p>
                  <p className="text-[10px] font-bold text-textSecondary mt-1">سيتم توزيع طلاب الفصل بالتساوي على المجموعات.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoDistribute}
                  onChange={(event) => setAutoDistribute(event.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-borderColor bg-bgSoft cursor-pointer">
                <div>
                  <p className="font-black text-sm text-textPrimary">توزيع عشوائي</p>
                  <p className="text-[10px] font-bold text-textSecondary mt-1">يخلط الطلاب قبل توزيعهم على المجموعات.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoShuffle}
                  onChange={(event) => setAutoShuffle(event.target.checked)}
                  className="w-5 h-5"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-borderColor">
              <button
                onClick={handleCreateAutoGroups}
                className="w-full py-4 rounded-2xl bg-primary text-white font-black flex items-center justify-center gap-2 active:scale-95"
              >
                <Shuffle size={18} />
                إنشاء المجموعات
              </button>
            </div>
          </div>
        </DrawerSheet>
      )}

      {copyCat && (
        <DrawerSheet isOpen={!!copyCat} onClose={() => setCopyCat(null)} dir={dir}>
          <div className="flex flex-col h-full w-full">
            <div className="pb-4 border-b border-borderColor">
              <h3 className="font-black text-xl text-textPrimary flex items-center gap-2">
                <Copy className="text-primary" size={22} />
                نسخ التقسيم
              </h3>
              <p className="text-xs font-bold text-textSecondary mt-1">
                {copyCat.title}
              </p>
            </div>

            <div className="py-5 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              {[
                { id: 'same_empty', label: 'نسخ داخل نفس الفصل مع تفريغ الطلاب', hint: 'يحافظ على أسماء المجموعات فقط.' },
                { id: 'same_with_students', label: 'نسخ داخل نفس الفصل مع الطلاب', hint: 'ينسخ المجموعات والطلاب كما هي.' },
                { id: 'other_empty', label: 'نسخ إلى فصل آخر مع تفريغ الطلاب', hint: 'مناسب لإعادة استخدام نفس التقسيم.' },
                { id: 'other_with_students', label: 'نسخ إلى فصل آخر مع الطلاب المتطابقين', hint: 'ينسخ فقط الطلاب الموجودين في الفصل الهدف إن وجدوا.' }
              ].map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCopyMode(option.id as CopyMode)}
                  className={`w-full p-4 rounded-2xl border text-right transition-all ${
                    copyMode === option.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-bgSoft border-borderColor text-textPrimary hover:border-primary/40'
                  }`}
                >
                  <p className="font-black text-sm">{option.label}</p>
                  <p className="text-[10px] font-bold text-textSecondary mt-1">{option.hint}</p>
                </button>
              ))}

              {(copyMode === 'other_empty' || copyMode === 'other_with_students') && (
                <div className="pt-2">
                  <label className="block text-xs font-black text-textSecondary mb-2">الفصل الهدف</label>
                  <select
                    value={copyTargetClass}
                    onChange={(event) => setCopyTargetClass(event.target.value)}
                    className="w-full p-3 rounded-xl border bg-bgSoft border-borderColor text-textPrimary font-black outline-none focus:border-primary"
                  >
                    {classes.map((className: string) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-borderColor">
              <button
                onClick={handleCopyCategorization}
                className="w-full py-4 rounded-2xl bg-primary text-white font-black flex items-center justify-center gap-2 active:scale-95"
              >
                <Copy size={18} />
                تنفيذ النسخ
              </button>
            </div>
          </div>
        </DrawerSheet>
      )}

      {showPresentation && activeCat && (
        <DrawerSheet isOpen={showPresentation} onClose={() => setShowPresentation(false)} dir={dir}>
          <div ref={presentationRef} className="flex flex-col h-full w-full bg-bgMain">
            <div className="pb-4 border-b border-borderColor flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-2xl text-textPrimary">عرض المجموعات</h3>
                <p className="text-sm font-bold text-primary mt-1">
                  {activeCat.title} - فصل {selectedClass}
                </p>
              </div>
              <button
                onClick={() => setShowPresentation(false)}
                className="p-2 rounded-xl bg-bgSoft text-textSecondary hover:text-danger"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeCat.groups || []).map((group: any) => {
                  const color = getGroupColor(group.color);
                  const groupStudents = students.filter((student: any) => (group.studentIds || []).includes(student.id));

                  return (
                    <div key={group.id} className={`rounded-3xl border-2 bg-bgCard p-5 ${color.border}`}>
                      <h2 className={`text-xl font-black mb-3 ${color.text}`}>{group.name}</h2>
                      <div className="grid grid-cols-1 gap-2">
                        {groupStudents.length === 0 ? (
                          <div className="text-sm font-bold text-textSecondary">لا يوجد طلاب</div>
                        ) : (
                          groupStudents.map((student: any) => (
                            <div key={student.id} className="p-3 rounded-2xl bg-bgSoft border border-borderColor font-black text-textPrimary">
                              {getShortName(student.name)}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-borderColor flex gap-2">
              <button
                onClick={handleExportAsImage}
                className="flex-1 py-3 rounded-2xl bg-success text-white font-black flex items-center justify-center gap-2"
              >
                <Download size={18} />
                صورة
              </button>
              <button
                onClick={handleExportAsPdf}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-black flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                PDF
              </button>
            </div>
          </div>
        </DrawerSheet>
      )}

      {assigningToGroup && activeCat && (
        <DrawerSheet isOpen={true} onClose={() => setAssigningToGroup(null)} dir={dir}>
          <div className="flex flex-col h-full w-full">

            <div className="p-5 pb-4 border-b border-borderColor bg-bgSoft flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg md:text-xl text-textPrimary">
                  {t('selectStudentsTitle') || 'اختيار الطلاب'}
                </h3>
                <p className="text-sm font-bold mt-1 text-primary">
                  المجموعة: {(activeCat.groups || []).find((group: any) => group.id === assigningToGroup.groupId)?.name}
                </p>
              </div>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-bgMain">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                {classStudents
                  .filter((student: any) => {
                    const isSelected = selectedStudentIds.has(student.id);
                    const isInAnotherGroup = (activeCat.groups || []).some(
                      (group: any) =>
                        group.id !== assigningToGroup.groupId &&
                        (group.studentIds || []).includes(student.id)
                    );

                    return isSelected || !isInAnotherGroup;
                  })
                  .map((student: any) => {
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
                          isSelected
                            ? 'bg-primary border-primary text-white'
                            : 'border-borderColor bg-transparent'
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
              <button
                onClick={saveBulkAssignment}
                className="flex-1 py-4 rounded-xl font-black text-sm transition-colors shadow-lg active:scale-95 bg-primary text-white hover:bg-primary/90"
              >
                تأكيد التوزيع ({selectedStudentIds.size})
              </button>
            </div>

          </div>
        </DrawerSheet>
      )}

    </PageLayout>
  );
};

export default StudentGroups;
