import React, { useState } from 'react';
import { Student } from '../types';
import { Check, X, Clock, DoorOpen } from 'lucide-react';

interface AttendanceTrackerProps {
    students: Student[];
    classes: string[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ students, classes, setStudents }) => {
    const [selectedClass, setSelectedClass] = useState(classes[0] || '');
    const filteredStudents = students.filter(s => s.classes.includes(selectedClass));
    const today = new Date().toISOString().split('T')[0];

    const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'truant') => {
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                const existing = s.attendance.find(a => a.date === today);
                let newAttendance;
                if (existing) {
                    newAttendance = s.attendance.map(a => a.date === today ? { ...a, status } : a);
                } else {
                    newAttendance = [...s.attendance, { date: today, status }];
                }
                return { ...s, attendance: newAttendance };
            }
            return s;
        }));
    };

    return (
        <div className="space-y-6 pb-20">
            <header>
                <h1 className="text-2xl font-black text-slate-800 mb-4">تسجيل الحضور</h1>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {classes.map(cls => (
                        <button 
                            key={cls} 
                            onClick={() => setSelectedClass(cls)}
                            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap ${selectedClass === cls ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                        >
                            {cls}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredStudents.map(student => {
                    const status = student.attendance.find(a => a.date === today)?.status || 'present';
                    return (
                        <div key={student.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col items-center">
                            {/* Upper Part: Image & Name */}
                            <div className="p-4 flex flex-col items-center w-full">
                                <div className="w-16 h-16 rounded-full bg-slate-50 border-4 border-white shadow-sm mb-3 overflow-hidden">
                                    <img 
                                        src={student.avatar || (student.gender === 'female' ? '/student-girl.png' : '/student-boy.jpg')} 
                                        className="w-full h-full object-cover" 
                                        alt={student.name}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement!.innerText = student.gender === 'female' ? '👩‍🎓' : '👨‍🎓';
                                            e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center', 'text-2xl');
                                        }}
                                    />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm text-center line-clamp-1 w-full">{student.name}</h3>
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1 font-bold">{student.classes[0]}</span>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 w-full mt-2">
                                <button onClick={() => markAttendance(student.id, 'present')} className={`p-2 rounded-xl flex justify-center ${status === 'present' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'}`}><Check size={16}/></button>
                                <button onClick={() => markAttendance(student.id, 'absent')} className={`p-2 rounded-xl flex justify-center ${status === 'absent' ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400'}`}><X size={16}/></button>
                                <button onClick={() => markAttendance(student.id, 'truant')} className={`p-2 rounded-xl flex justify-center ${status === 'truant' ? 'bg-purple-500 text-white' : 'bg-slate-50 text-slate-400'}`}><DoorOpen size={16}/></button>
                                <button onClick={() => markAttendance(student.id, 'late')} className={`p-2 rounded-xl flex justify-center ${status === 'late' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400'}`}><Clock size={16}/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AttendanceTracker;