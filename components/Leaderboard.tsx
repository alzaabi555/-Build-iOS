import React from 'react';
import { Student } from '../types';
import { Medal, Trophy } from 'lucide-react';

interface LeaderboardProps {
    students: Student[];
    classes: string[];
    onUpdateStudent: (student: Student) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ students }) => {
    
    const getStudentImage = (student: Student) => {
        if (student.avatar) return student.avatar;
        return student.gender === 'female' ? '/student-girl.png' : '/student-boy.jpg';
    };

    const sortedStudents = [...students].sort((a, b) => {
        const pointsA = a.behaviors.filter(b => b.type === 'positive').reduce((acc, curr) => acc + curr.points, 0);
        const pointsB = b.behaviors.filter(b => b.type === 'positive').reduce((acc, curr) => acc + curr.points, 0);
        return pointsB - pointsA;
    }).slice(0, 10);

    return (
        <div className="space-y-6 pb-20">
            <header>
                 <h1 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Trophy className="w-8 h-8 text-amber-500" />
                    لوحة الشرف
                 </h1>
            </header>

            <div className="space-y-3">
                {sortedStudents.map((student, idx) => {
                    const points = student.behaviors.filter(b => b.type === 'positive').reduce((acc, curr) => acc + curr.points, 0);
                    return (
                        <div key={student.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="font-black text-2xl text-slate-300 w-8 text-center">{idx + 1}</div>
                            <img src={getStudentImage(student)} alt={student.name} className="w-12 h-12 rounded-full object-cover bg-slate-50" />
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800">{student.name}</h3>
                                <p className="text-xs text-slate-500 font-bold">{student.classes[0]}</p>
                            </div>
                            <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl font-black text-sm flex items-center gap-1">
                                {points} <Medal size={16} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Leaderboard;