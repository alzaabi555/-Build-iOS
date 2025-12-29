
import React, { useState, useEffect, useRef } from 'react';
import { Student, BehaviorType } from '../types';
import { Search, ThumbsUp, ThumbsDown, FileBarChart, X, UserPlus, Filter, Edit, FileSpreadsheet, GraduationCap, ChevronLeft, Clock, Download, MessageCircle, Smartphone, Loader2, Sparkles, Shuffle, Settings, Trash2, Check, PenSquare, ChevronDown, UserX, MoveRight, LogOut, SlidersHorizontal, MoreHorizontal, Plus, Camera, Image as ImageIcon, CheckCircle2, AlertTriangle, BatteryWarning, Frown, Zap, BookOpen, Clock3, Ban, UserMinus, Utensils, Heart } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import Modal from './Modal';

declare var html2pdf: any;

interface StudentListProps {
  students: Student[];
  classes: string[];
  onAddClass: (name: string) => void;
  onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string) => void;
  onUpdateStudent: (s: Student) => void;
  onDeleteStudent: (id: string) => void;
  onViewReport: (s: Student) => void;
  onSwitchToImport: () => void;
  currentSemester: '1' | '2';
  onSemesterChange: (sem: '1' | '2') => void;
  onEditClass: (oldName: string, newName: string) => void;
  onDeleteClass: (className: string) => void;
}

const StudentList: React.FC<StudentListProps> = ({ students, classes, onAddClass, onAddStudentManually, onUpdateStudent, onDeleteStudent, onViewReport, onSwitchToImport, currentSemester, onSemesterChange, onEditClass, onDeleteClass }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [showAddSheet, setShowAddSheet] = useState(false); 
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [showClassManager, setShowClassManager] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Random Picker State
  const [isRandomPicking, setIsRandomPicking] = useState(false);
  const [randomStudent, setRandomStudent] = useState<Student | null>(null);

  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  // Class Management State
  const [newClassName, setNewClassName] = useState('');
  const [editingClassOldName, setEditingClassOldName] = useState<string | null>(null);
  const [editingClassNewName, setEditingClassNewName] = useState('');

  // Behavior Reasons States
  const [showNegativeReasons, setShowNegativeReasons] = useState<{student: Student} | null>(null);
  const [showPositiveReasons, setShowPositiveReasons] = useState<{student: Student} | null>(null);
  const [customReason, setCustomReason] = useState('');
  
  // Reporting State
  const [notificationTarget, setNotificationTarget] = useState<{student: Student, type: 'truancy'} | null>(null);

  const NEGATIVE_REASONS = [
      { id: 'noise', label: "إزعاج", icon: AlertTriangle, color: 'text-amber-500 bg-amber-50' },
      { id: 'homework', label: "الواجب", icon: BookOpen, color: 'text-rose-500 bg-rose-50' },
      { id: 'forget', label: "نسيان", icon: Frown, color: 'text-gray-500 bg-gray-50' },
      { id: 'late', label: "تأخير", icon: Clock3, color: 'text-orange-500 bg-orange-50' },
      { id: 'sleep', label: "نوم", icon: BatteryWarning, color: 'text-blue-500 bg-blue-50' },
      { id: 'fight', label: "مشاجرة", icon: Ban, color: 'text-red-600 bg-red-50' },
      { id: 'phone', label: "هاتف", icon: Smartphone, color: 'text-purple-500 bg-purple-50' },
      { id: 'eat', label: "أكل", icon: Utensils, color: 'text-green-500 bg-green-50' },
      { id: 'escape', label: "تسرب", icon: UserMinus, color: 'text-red-700 bg-red-100' }
  ];

  const POSITIVE_REASONS = [
      { id: 'share', label: "مشاركة", icon: Zap, color: 'text-yellow-500 bg-yellow-50' },
      { id: 'answer', label: "إجابة", icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
      { id: 'clean', label: "نظافة", icon: Sparkles, color: 'text-cyan-500 bg-cyan-50' },
      { id: 'help', label: "تطوع", icon: ThumbsUp, color: 'text-blue-500 bg-blue-50' },
      { id: 'homework_done', label: "واجب", icon: BookOpen, color: 'text-indigo-500 bg-indigo-50' },
      { id: 'respect', label: "احترام", icon: Heart, color: 'text-rose-500 bg-rose-50' },
      { id: 'calm', label: "هدوء", icon: Check, color: 'text-teal-500 bg-teal-50' },
      { id: 'star', label: "تميز", icon: GraduationCap, color: 'text-purple-500 bg-purple-50' }
  ];

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || s.classes?.includes(selectedClass);
    return matchesSearch && matchesClass;
  });

  const handleAddBehavior = (student: Student, type: BehaviorType, description: string, points: number) => {
    const fullDesc = type === 'negative' && description === 'تسرب' ? 'التسرب من الحصة' : description;
    
    const newBehavior = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type,
      description: fullDesc,
      points,
      semester: currentSemester
    };
    onUpdateStudent({ ...student, behaviors: [newBehavior, ...(student.behaviors || [])] });
    
    if(showNegativeReasons) setShowNegativeReasons(null);
    if(showPositiveReasons) setShowPositiveReasons(null);
    setCustomReason('');

    if (fullDesc === "التسرب من الحصة") {
        if (student.parentPhone) {
            setNotificationTarget({ student, type: 'truancy' });
        } else {
            alert('تم تسجيل السلوك، لكن لا يوجد رقم هاتف للإبلاغ.');
        }
    }
  };

  const performNotification = async (method: 'whatsapp' | 'sms') => {
      if(!notificationTarget || !notificationTarget.student.parentPhone) {
          alert('لا يوجد رقم هاتف مسجل');
          return;
      }
      const { student } = notificationTarget;
      
      let cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 5) {
          alert('رقم الهاتف غير صحيح');
          return;
      }

      if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
      if (cleanPhone.length === 8) cleanPhone = '968' + cleanPhone;
      else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) cleanPhone = '968' + cleanPhone.substring(1);

      const msg = encodeURIComponent(`السلام عليكم، نود إبلاغكم بأن الطالب ${student.name} قد تسرب من الحصة اليوم ${new Date().toLocaleDateString('ar-EG')}.`);

      if (method === 'whatsapp') {
          const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
          try {
            await Browser.open({ url: url });
          } catch (e) {
            window.open(url, '_blank');
          }
      } else {
          window.location.href = `sms:${cleanPhone}?body=${msg}`;
      }
      setNotificationTarget(null);
  };

  const pickRandomStudent = () => {
    if (filteredStudents.length === 0) return;
    setIsRandomPicking(true);
    let counter = 0;
    const interval = setInterval(() => {
      setRandomStudent(filteredStudents[Math.floor(Math.random() * filteredStudents.length)]);
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        setIsRandomPicking(false);
      }
    }, 100);
  };

  const handleSaveEdit = () => {
      if (editingStudent && editName) {
          onUpdateStudent({
              ...editingStudent,
              name: editName,
              parentPhone: editPhone,
              classes: [editClass],
              avatar: editAvatar
          });
          setEditingStudent(null);
      }
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const name = (form.elements.namedItem('name') as HTMLInputElement).value;
      const className = (form.elements.namedItem('className') as HTMLSelectElement).value || (form.elements.namedItem('newClassName') as HTMLInputElement).value;
      const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;

      if (name && className) {
          onAddStudentManually(name, className, phone);
          setShowManualAddModal(false);
          setShowAddSheet(false);
      }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateClassReport = async () => {
      if (filteredStudents.length === 0) {
          alert('لا يوجد طلاب في القائمة الحالية لطباعتها.');
          return;
      }
      setIsGeneratingPdf(true);

      const classNameTitle = selectedClass === 'all' ? 'جميع الفصول' : selectedClass;
      const element = document.createElement('div');
      element.setAttribute('dir', 'rtl');
      element.style.fontFamily = 'Tajawal, sans-serif';
      element.style.padding = '20px';
      
      const rows = filteredStudents.map((s, i) => {
          const positive = (s.behaviors || []).filter(b => b.type === 'positive').length;
          const negative = (s.behaviors || []).filter(b => b.type === 'negative').length;
          return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; text-align: center;">${i + 1}</td>
                <td style="padding: 10px; font-weight: bold;">${s.name}</td>
                <td style="padding: 10px; text-align: center;">${s.classes[0]}</td>
                <td style="padding: 10px; text-align: center; color: green;">${positive}</td>
                <td style="padding: 10px; text-align: center; color: red;">${negative}</td>
            </tr>
          `;
      }).join('');

      element.innerHTML = `
        <h1 style="text-align: center; margin-bottom: 20px;">قائمة طلاب فصل: ${classNameTitle}</h1>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
                <tr style="background-color: #f3f4f6; border-bottom: 2px solid #ddd;">
                    <th style="padding: 10px;">#</th>
                    <th style="padding: 10px; text-align: right;">الاسم</th>
                    <th style="padding: 10px;">الصف</th>
                    <th style="padding: 10px;">سلوك إيجابي</th>
                    <th style="padding: 10px;">سلوك سلبي</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            تم التوليد بواسطة تطبيق راصد - ${new Date().toLocaleDateString('ar-EG')}
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `قائمة_${classNameTitle}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      try {
        if (typeof html2pdf !== 'undefined') {
            const worker = html2pdf().set(opt).from(element).toPdf();
            if (Capacitor.isNativePlatform()) {
                 const pdfBase64 = await worker.output('datauristring');
                 const base64Data = pdfBase64.split(',')[1];
                 const result = await Filesystem.writeFile({
                    path: opt.filename,
                    data: base64Data,
                    directory: Directory.Cache
                 });
                 await Share.share({
                    title: 'قائمة الفصل',
                    url: result.uri,
                    dialogTitle: 'مشاركة القائمة'
                 });
            } else {
                 worker.save();
            }
        } else {
            alert('مكتبة الطباعة غير جاهزة');
        }
      } catch (err) {
          console.error(err);
          alert('حدث خطأ أثناء إنشاء التقرير');
      } finally {
          setIsGeneratingPdf(false);
      }
  };

  return (
    <div className="min-h-full bg-[#f2f2f7] pb-24 md:pb-8">
      
      {/* Header */}
      <div className="bg-[#f2f2f7] border-b border-gray-300/50 pt-safe-top transition-all">
          <div className="px-4 pb-2">
              <div className="flex justify-between items-end mb-3 pt-2">
                  <div>
                      <h1 className="text-3xl font-black text-black tracking-tight">الطلاب</h1>
                      <p className="text-xs text-gray-500 font-bold mt-0.5">{filteredStudents.length} طالب</p>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={pickRandomStudent} className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-indigo-600 active:bg-gray-300 transition-colors">
                          <Sparkles className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                      <button onClick={generateClassReport} className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-emerald-600 active:bg-gray-300 transition-colors">
                          {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5" strokeWidth={2.5} />}
                      </button>
                      <button onClick={() => setShowClassManager(true)} className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-blue-600 active:bg-gray-300 transition-colors">
                          <SlidersHorizontal className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                      <button onClick={() => setShowAddSheet(true)} className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-transform">
                          <Plus className="w-6 h-6" strokeWidth={3} />
                      </button>
                  </div>
              </div>

              {/* iOS Search Bar */}
              <div className="relative mb-3">
                  <Search className="absolute right-3 top-2 w-4 h-4 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="بحث" 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-[#767680]/12 rounded-xl py-2 pr-9 pl-4 text-sm font-medium text-right outline-none placeholder:text-gray-500 focus:bg-[#767680]/20 transition-colors"
                  />
              </div>

              {/* Class Filters (Pills) */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button 
                      onClick={() => setSelectedClass('all')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedClass === 'all' ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                  >
                      الكل
                  </button>
                  {classes.map(c => (
                      <button 
                          key={c}
                          onClick={() => setSelectedClass(c)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedClass === c ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-white text-gray-600 border border-gray-200'}`}
                      >
                          {c}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Student List (Redesigned Cards) */}
      <div className="px-4 mt-2 space-y-3">
          {filteredStudents.map(student => (
              <div key={student.id} className="bg-white p-3 rounded-[24px] flex items-center justify-between shadow-sm border border-gray-100 active:scale-[0.99] transition-transform duration-100">
                  <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onViewReport(student)}>
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 font-black text-xl shrink-0 border border-gray-200 overflow-hidden relative">
                          {student.avatar ? (
                              <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                              student.name.charAt(0)
                          )}
                      </div>
                      
                      {/* Info */}
                      <div className="min-w-0">
                          <h3 className="text-sm font-black text-gray-900 truncate mb-0.5">{student.name}</h3>
                          <p className="text-[10px] text-gray-400 font-bold truncate">{student.classes[0]}</p>
                      </div>
                  </div>

                  {/* Actions (Buttons) */}
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowPositiveReasons({student})}
                        className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-emerald-200"
                      >
                          <ThumbsUp className="w-5 h-5" strokeWidth={3} />
                      </button>
                      
                      <button 
                        onClick={() => setShowNegativeReasons({student})}
                        className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-rose-200"
                      >
                          <ThumbsDown className="w-5 h-5" strokeWidth={3} />
                      </button>

                      <button 
                        onClick={() => {
                            setEditingStudent(student);
                            setEditName(student.name);
                            setEditPhone(student.parentPhone || '');
                            setEditClass(student.classes[0] || '');
                            setEditAvatar(student.avatar || '');
                        }}
                        className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100"
                      >
                          <MoreHorizontal className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                  </div>
              </div>
          ))}

          {filteredStudents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-500">لا يوجد طلاب</p>
                  <p className="text-xs text-gray-400 mt-1">اضغط + لإضافة طلاب جدد</p>
              </div>
          )}
      </div>

      {/* --- COMPACT MODALS (Fixing Long Lists) --- */}

      {/* 1. Add Options Modal */}
      <Modal isOpen={showAddSheet} onClose={() => setShowAddSheet(false)}>
          <div className="text-center shrink-0">
              <h3 className="text-lg font-black text-gray-900">إضافة جديدة</h3>
              <p className="text-xs text-gray-500 font-bold">اختر الطريقة المناسبة</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 shrink-0">
              <button onClick={() => setShowManualAddModal(true)} className="bg-blue-50 p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform hover:bg-blue-100">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center">
                      <UserPlus className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs text-blue-800">إضافة يدوية</span>
              </button>
              <button onClick={onSwitchToImport} className="bg-emerald-50 p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform hover:bg-emerald-100">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs text-emerald-800">استيراد Excel</span>
              </button>
          </div>
          
          <button onClick={() => setShowAddSheet(false)} className="w-full bg-gray-100 py-3 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 shrink-0">
              إلغاء
          </button>
      </Modal>

      {/* 2. Negative Reason Modal (GRID LAYOUT - REPLACING LIST) */}
      <Modal isOpen={!!showNegativeReasons} onClose={() => { setShowNegativeReasons(null); setCustomReason(''); }}>
          <h3 className="text-center font-black text-lg text-rose-600 flex items-center justify-center gap-2 shrink-0">
              <ThumbsDown className="w-6 h-6" />
              مخالفة سلوكية
          </h3>

          <div className="flex gap-2 shrink-0">
              <input 
                  type="text" 
                  value={customReason} 
                  onChange={(e) => setCustomReason(e.target.value)} 
                  placeholder="سبب آخر..." 
                  className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold border border-gray-100 outline-none focus:border-rose-400"
              />
              <button 
                  onClick={() => {
                      if(showNegativeReasons && customReason.trim()){
                          handleAddBehavior(showNegativeReasons.student, 'negative', customReason.trim(), -1);
                      }
                  }}
                  className="bg-rose-500 text-white px-4 rounded-xl font-black active:scale-95"
              >
                  <Plus className="w-4 h-4" />
              </button>
          </div>
          
          {/* Grid Layout to fix height issues */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-3 gap-2">
                {NEGATIVE_REASONS.map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => showNegativeReasons && handleAddBehavior(showNegativeReasons.student, 'negative', item.label, -1)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform border border-gray-100 ${item.color}`}
                    >
                        <item.icon className="w-6 h-6 opacity-80"/>
                        <span className="text-[10px] font-black">{item.label}</span>
                    </button>
                ))}
              </div>
          </div>
          
          <button onClick={() => { setShowNegativeReasons(null); setCustomReason(''); }} className="w-full bg-gray-100 py-3 rounded-xl text-gray-500 font-bold text-sm shrink-0">
              إلغاء
          </button>
      </Modal>

      {/* 2.5 Positive Reason Modal (GRID LAYOUT - REPLACING LIST) */}
      <Modal isOpen={!!showPositiveReasons} onClose={() => { setShowPositiveReasons(null); setCustomReason(''); }}>
          <h3 className="text-center font-black text-lg text-emerald-600 flex items-center justify-center gap-2 shrink-0">
              <ThumbsUp className="w-6 h-6" />
              تعزيز إيجابي
          </h3>

          <div className="flex gap-2 shrink-0">
              <input 
                  type="text" 
                  value={customReason} 
                  onChange={(e) => setCustomReason(e.target.value)} 
                  placeholder="سبب آخر..." 
                  className="flex-1 bg-gray-50 p-3 rounded-xl text-xs font-bold border border-gray-100 outline-none focus:border-emerald-400"
              />
              <button 
                  onClick={() => {
                      if(showPositiveReasons && customReason.trim()){
                          handleAddBehavior(showPositiveReasons.student, 'positive', customReason.trim(), 1);
                      }
                  }}
                  className="bg-emerald-500 text-white px-4 rounded-xl font-black active:scale-95"
              >
                  <Plus className="w-4 h-4" />
              </button>
          </div>
          
          {/* Grid Layout */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-3 gap-2">
                {POSITIVE_REASONS.map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => showPositiveReasons && handleAddBehavior(showPositiveReasons.student, 'positive', item.label, 1)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform border border-gray-100 ${item.color}`}
                    >
                        <item.icon className="w-6 h-6 opacity-80" />
                        <span className="text-[10px] font-black">{item.label}</span>
                    </button>
                ))}
              </div>
          </div>
          
          <button onClick={() => { setShowPositiveReasons(null); setCustomReason(''); }} className="w-full bg-gray-100 py-3 rounded-xl text-gray-500 font-bold text-sm shrink-0">
              إلغاء
          </button>
      </Modal>

      {/* 3. Random Picker (Already centered, keeping as is) */}
      {isRandomPicking && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="text-center animate-in zoom-in duration-300">
                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/50 overflow-hidden relative">
                      {randomStudent?.avatar ? (
                          <img src={randomStudent.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                          <span className="text-4xl font-black text-indigo-600">{randomStudent?.name.charAt(0)}</span>
                      )}
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2">{randomStudent?.name}</h2>
                  <p className="text-indigo-300 font-bold">جاري الاختيار...</p>
              </div>
          </div>
      )}
      <Modal isOpen={!isRandomPicking && !!randomStudent} onClose={() => setRandomStudent(null)}>
          <Sparkles className="absolute top-0 right-0 w-40 h-40 text-yellow-400 opacity-20 -translate-y-1/2 translate-x-1/2" />
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg text-white text-3xl font-black overflow-hidden relative border-4 border-white">
              {randomStudent?.avatar ? (
                  <img src={randomStudent.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                  randomStudent?.name.charAt(0)
              )}
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">{randomStudent?.name}</h2>
          <p className="text-gray-500 font-bold mb-8 text-center">تم الاختيار عشوائياً للمشاركة</p>
          <button onClick={() => setRandomStudent(null)} className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-black text-sm">
              رائع!
          </button>
      </Modal>

      {/* 4. Add Student Modal */}
      <Modal isOpen={showManualAddModal} onClose={() => setShowManualAddModal(false)}>
          <div className="flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg text-gray-900">طالب جديد</h3>
              <button onClick={() => setShowManualAddModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-500"/></button>
          </div>
          <form onSubmit={handleManualAddSubmit} className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              <input name="name" type="text" placeholder="اسم الطالب" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all" required autoFocus />
              <input name="phone" type="tel" placeholder="رقم ولي الأمر (اختياري)" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all" />
              
              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 mr-2">الفصل</label>
                  <select name="className" className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none">
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all mt-2">
                  حفظ الطالب
              </button>
          </form>
      </Modal>

      {/* 5. Edit Student Modal - NO SCROLLBARS */}
      <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)}>
          <div className="text-center shrink-0">
              <div className="relative w-20 h-20 mx-auto mb-2">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-black text-gray-400 overflow-hidden border-4 border-white shadow-md">
                      {editAvatar ? (
                        <img src={editAvatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        editingStudent?.name.charAt(0)
                      )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer shadow-lg active:scale-90 transition-transform">
                      <Camera className="w-3 h-3" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
              </div>
              <h3 className="font-black text-lg text-gray-900">تعديل البيانات</h3>
          </div>
          
          <div className="space-y-2">
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-blue-500" placeholder="اسم الطالب" />
              <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl font-bold text-sm outline-none focus:border-blue-500" placeholder="رقم الهاتف" />
              <select value={editClass} onChange={e => setEditClass(e.target.value)} className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl font-bold text-sm outline-none">
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
          </div>

          <div className="flex gap-2 mt-2 shrink-0">
              <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs">حفظ</button>
              <button onClick={() => { if(editingStudent) { onDeleteStudent(editingStudent.id); setEditingStudent(null); } }} className="px-4 bg-rose-50 text-rose-600 rounded-xl font-bold"><Trash2 className="w-5 h-5"/></button>
          </div>
      </Modal>

      {/* 6. Class Manager Modal - NO SCROLLBARS */}
      <Modal isOpen={showClassManager} onClose={() => setShowClassManager(false)}>
          <div className="flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg text-gray-900">إدارة الفصول</h3>
              <button onClick={() => setShowClassManager(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
          </div>

          <div className="space-y-2 pr-1 overflow-y-auto custom-scrollbar">
              {classes.map(cls => (
                  <div key={cls} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      {editingClassOldName === cls ? (
                          <div className="flex gap-2 w-full">
                              <input 
                                type="text" 
                                value={editingClassNewName} 
                                onChange={e => setEditingClassNewName(e.target.value)} 
                                className="flex-1 bg-white border border-blue-300 rounded-lg px-2 text-xs font-bold outline-none"
                                autoFocus
                              />
                              <button onClick={() => { onEditClass(cls, editingClassNewName); setEditingClassOldName(null); }} className="p-2 bg-blue-500 text-white rounded-lg"><Check className="w-4 h-4"/></button>
                          </div>
                      ) : (
                          <>
                              <span className="font-bold text-xs text-gray-700">{cls}</span>
                              <div className="flex gap-1">
                                  <button onClick={() => { setEditingClassOldName(cls); setEditingClassNewName(cls); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit className="w-3.5 h-3.5"/></button>
                                  <button onClick={() => onDeleteClass(cls)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                              </div>
                          </>
                      )}
                  </div>
              ))}
          </div>

          <div className="pt-2 border-t border-gray-100 shrink-0">
              <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="اسم فصل جديد..." 
                    value={newClassName} 
                    onChange={e => setNewClassName(e.target.value)} 
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs font-bold outline-none focus:border-blue-500"
                  />
                  <button onClick={() => { if(newClassName) { onAddClass(newClassName); setNewClassName(''); } }} className="bg-black text-white px-4 rounded-xl font-black text-xl">+</button>
              </div>
          </div>
      </Modal>

      {/* 7. Notification Modal */}
      <Modal isOpen={!!notificationTarget} onClose={() => setNotificationTarget(null)}>
          <h3 className="text-center font-black text-gray-900 text-lg mb-1 shrink-0">
              إبلاغ ولي الأمر
          </h3>
          <p className="text-center text-xs font-bold text-rose-500 mb-4 shrink-0">
              تم رصد تسرب للطالب: {notificationTarget?.student.name}
          </p>
          
          <div className="space-y-3">
              <button onClick={() => performNotification('whatsapp')} className="w-full bg-[#25D366] hover:bg-[#128C7E] active:bg-[#075E54] text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-lg shadow-green-200 transition-all">
                  <MessageCircle className="w-5 h-5 fill-white" />
                  فتح واتساب مباشرة
              </button>
              <button onClick={() => performNotification('sms')} className="w-full bg-white active:bg-gray-50 py-4 rounded-2xl text-blue-600 font-black text-xs flex items-center justify-center gap-2 shadow-sm border border-gray-100">
                  <CheckCircle2 className="w-4 h-4" />
                  رسالة نصية SMS
              </button>
          </div>
          
          <button onClick={() => setNotificationTarget(null)} className="w-full mt-2 bg-transparent py-3 rounded-xl text-gray-500 font-bold text-xs shrink-0">
              إغلاق
          </button>
      </Modal>

    </div>
  );
};

export default StudentList;
