import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { Trash2, FileText, Plus, MoreVertical, Shuffle, UserPlus, FileSpreadsheet, X, Search, Filter } from 'lucide-react';
import Modal from './Modal';
import ExcelImport from './ExcelImport';

interface StudentListProps {
    students: Student[];
    classes: string[];
    onAddClass: (name: string) => void;
    onAddStudentManually: (name: string, className: string, phone?: string, avatar?: string, gender?: 'male'|'female') => void;
    onBatchAddStudents: (students: Student[]) => void;
    onUpdateStudent: (student: Student) => void;
    onDeleteStudent: (id: string) => void;
    onViewReport: (student: Student) => void;
    currentSemester: '1' | '2';
    onSemesterChange: (sem: '1' | '2') => void;
    onDeleteClass: (className: string) => void;
}

const getImg = (path: string) => `/${path}`;

const StudentList: React.FC<StudentListProps> = ({ 
    students, classes, onAddClass, onAddStudentManually, onBatchAddStudents, 
    onDeleteStudent, onViewReport, onDeleteClass
}) => {
    const [selectedClass, setSelectedClass] = useState<string>(classes[0] || 'all');
    const [showMenu, setShowMenu] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Random Picker State
    const [showRandomModal, setShowRandomModal] = useState(false);
    const [randomStudent, setRandomStudent] = useState<Student | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Manual Add State
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');
    const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>('male');

    // Filtering
    const filteredStudents = students.filter(s => selectedClass === 'all' || s.classes.includes(selectedClass));

    const getStudentDisplayImage = (avatar: string | undefined, gender: string | undefined) => {
        if (avatar && (avatar.startsWith('data:image') || avatar.length > 50)) {
            return avatar; 
        }
        return getImg(gender === 'female' ? 'student-girl.png' : 'student-boy.jpg');
    };

    const handleRandomPick = () => {
        if (filteredStudents.length === 0) return;
        setShowRandomModal(true);
        setIsAnimating(true);
        setRandomStudent(null);
        
        let counter = 0;
        const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * filteredStudents.length);
            setRandomStudent(filteredStudents[randomIndex]);
            counter++;
            if (counter > 20) {
                clearInterval(interval);
                setIsAnimating(false);
            }
        }, 100);
    };

    const handleManualAdd = () => {
        if (newStudentName && selectedClass !== 'all') {
            onAddStudentManually(newStudentName, selectedClass, newStudentPhone, undefined, newStudentGender);
            setNewStudentName('');
            setNewStudentPhone('');
            setShowAddModal(false);
        } else {
            alert('يرجى اختيار فصل وكتابة اسم الطالب');
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header & Actions */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">قائمة الطلاب</h1>
                    <p className="text-xs font-bold text-slate-400">{filteredStudents.length} طالب</p>
                </div>
                <div className="flex gap-2">
                    {/* Random Button - Moved outside as requested */}
                    <button 
                        onClick={handleRandomPick}
                        disabled={filteredStudents.length === 0}
                        className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                        title="قرعة عشوائية"
                    >
                        <Shuffle size={20} />
                    </button>

                    {/* Menu Button */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowMenu(!showMenu)} 
                            className="p-3 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
                        >
                            <MoreVertical size={20} />
                        </button>
                        
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                                <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                                    <button onClick={() => { setShowAddModal(true); setShowMenu(false); }} className="w-full text-right px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                        <UserPlus size={16} className="text-indigo-500" /> إضافة طالب
                                    </button>
                                    <button onClick={() => { setShowImportModal(true); setShowMenu(false); }} className="w-full text-right px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                        <FileSpreadsheet size={16} className="text-emerald-500" /> استيراد Excel
                                    </button>
                                    {selectedClass !== 'all' && (
                                        <button onClick={() => { if(confirm('حذف الفصل وطلابه؟')) { onDeleteClass(selectedClass); setSelectedClass(classes[0]||'all'); setShowMenu(false); } }} className="w-full text-right px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100">
                                            <Trash2 size={16} /> حذف الفصل
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Class Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                <button 
                    onClick={() => setSelectedClass('all')} 
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                    الكل
                </button>
                {classes.map(c => (
                    <button 
                        key={c} 
                        onClick={() => setSelectedClass(c)} 
                        className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${selectedClass === c ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            {/* Students List */}
            <div className="grid grid-cols-1 gap-3">
                {filteredStudents.length > 0 ? filteredStudents.map(student => (
                    <div key={student.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img 
                                src={getStudentDisplayImage(student.avatar, student.gender)} 
                                alt={student.name} 
                                className="w-10 h-10 rounded-full object-cover bg-slate-100 border border-slate-200"
                            />
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">{student.name}</h3>
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-md">{student.classes[0]}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onViewReport(student)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100"><FileText size={16} /></button>
                            <button onClick={() => onDeleteStudent(student.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100"><Trash2 size={16} /></button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <Filter className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-bold text-sm">لا يوجد طلاب في هذا التصنيف</p>
                    </div>
                )}
            </div>

            {/* Random Picker Modal */}
            <Modal isOpen={showRandomModal} onClose={() => setShowRandomModal(false)} className="max-w-sm text-center">
                <div className="py-6 flex flex-col items-center">
                    <h3 className="text-lg font-black text-slate-800 mb-6">القرعة العشوائية</h3>
                    <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mb-4 transition-all duration-300 ${isAnimating ? 'border-indigo-300 animate-pulse' : 'border-emerald-500 shadow-xl shadow-emerald-200'}`}>
                         {randomStudent ? (
                             <img 
                                src={getStudentDisplayImage(randomStudent.avatar, randomStudent.gender)} 
                                className="w-full h-full rounded-full object-cover p-1"
                             />
                         ) : (
                             <Shuffle className="w-12 h-12 text-indigo-300" />
                         )}
                    </div>
                    {randomStudent && (
                        <div className="animate-in zoom-in duration-300">
                            <h2 className="text-2xl font-black text-slate-900 mb-1">{randomStudent.name}</h2>
                            <p className="text-sm font-bold text-slate-500">{randomStudent.classes[0]}</p>
                        </div>
                    )}
                    <button onClick={() => setShowRandomModal(false)} className="mt-8 bg-slate-100 text-slate-600 px-6 py-2 rounded-xl font-bold text-xs">إغلاق</button>
                </div>
            </Modal>

            {/* Add Student Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} className="max-w-sm">
                <h3 className="font-black text-lg text-slate-800 mb-4">إضافة طالب يدوياً</h3>
                <div className="space-y-3">
                    <input 
                        type="text" 
                        placeholder="اسم الطالب" 
                        value={newStudentName}
                        onChange={e => setNewStudentName(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                    />
                    <input 
                        type="tel" 
                        placeholder="رقم ولي الأمر" 
                        value={newStudentPhone}
                        onChange={e => setNewStudentPhone(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setNewStudentGender('male')} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${newStudentGender === 'male' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200'}`}>طالب 👨‍🎓</button>
                        <button onClick={() => setNewStudentGender('female')} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${newStudentGender === 'female' ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-slate-200'}`}>طالبة 👩‍🎓</button>
                    </div>
                    {selectedClass === 'all' && <p className="text-xs text-rose-500 font-bold">* يرجى اختيار فصل من القائمة في الأعلى أولاً</p>}
                    <button onClick={handleManualAdd} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg mt-2">إضافة</button>
                </div>
            </Modal>

            {/* Import Modal */}
            <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} className="max-w-md">
                 <ExcelImport 
                    existingClasses={classes} 
                    onImport={(newStudents) => { onBatchAddStudents(newStudents); setShowImportModal(false); }}
                    onAddClass={onAddClass}
                 />
            </Modal>
        </div>
    );
};

export default StudentList;