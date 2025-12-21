
import React from 'react';
import { Student } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FileText, Users, Award, AlertCircle, Sun, Moon, Coffee, Sparkles } from 'lucide-react';

interface DashboardProps {
  students: Student[];
  onSelectStudent: (s: Student) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ students, onSelectStudent }) => {
  const totalStudents = students.length;
  const hour = new Date().getHours();
  
  const getGreeting = () => {
    if (hour < 12) return { text: "صباح الخير", icon: <Sun className="text-amber-400 w-6 h-6" /> };
    if (hour < 17) return { text: "طاب يومك", icon: <Coffee className="text-orange-400 w-6 h-6" /> };
    return { text: "مساء الخير", icon: <Moon className="text-indigo-400 w-6 h-6" /> };
  };

  const greeting = getGreeting();
  const today = new Date().toISOString().split('T')[0];
  
  const attendanceToday = students.reduce((acc, s) => {
    const record = s.attendance.find(a => a.date === today);
    if (record?.status === 'present') acc.present++;
    else if (record?.status === 'absent') acc.absent++;
    return acc;
  }, { present: 0, absent: 0 });

  const behaviorStats = students.reduce((acc, s) => {
    s.behaviors.forEach(b => {
      if (b.type === 'positive') acc.positive++;
      else acc.negative++; 
    });
    return acc;
  }, { positive: 0, negative: 0 });

  const COLORS = ['#10b981', '#f43f5e'];
  const pieData = [
    { name: 'حاضر', value: attendanceToday.present || 0 },
    { name: 'غائب', value: attendanceToday.absent || 0 },
  ];

  const hasData = attendanceToday.present > 0 || attendanceToday.absent > 0;
  const displayPieData = hasData ? pieData : [{ name: 'لا بيانات', value: 1 }];
  const displayColors = hasData ? COLORS : ['#f1f5f9'];

  return (
    <div className="space-y-6 pb-4">
      {/* Welcome Header */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            {greeting.icon}
            <span className="text-sm font-medium">{greeting.text}</span>
          </div>
          <h2 className="text-2xl font-bold">أهلاً بك، أ. محمد</h2>
          <p className="text-blue-100 text-xs mt-1">لديك {totalStudents} طالب مسجل في النظام</p>
        </div>
        <Sparkles className="absolute -left-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
             <Award className="text-emerald-500 w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase">إيجابي</p>
            <p className="text-lg font-bold text-gray-900">{behaviorStats.positive}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
             <AlertCircle className="text-rose-500 w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase">تنبيهات</p>
            <p className="text-lg font-bold text-gray-900">{behaviorStats.negative}</p>
          </div>
        </div>
      </div>

      {/* Attendance Chart Card */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
             <Users className="w-5 h-5 text-blue-500" />
             إحصائيات حضور اليوم
          </h3>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">
            {new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={65}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {displayPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={displayColors[index % displayColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-50">
                <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">حاضر</p>
                <p className="text-xl font-black text-emerald-700">{attendanceToday.present}</p>
            </div>
            <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-50">
                <p className="text-[10px] text-rose-600 font-bold uppercase mb-1">غائب</p>
                <p className="text-xl font-black text-rose-700">{attendanceToday.absent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-gray-800">نشاط الطلاب</h3>
          <button className="text-xs text-blue-600 font-bold">عرض الكل</button>
        </div>
        
        {students.length === 0 ? (
            <div className="bg-white p-10 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-gray-400 text-sm font-medium">ابدأ بإضافة الطلاب لرؤية النشاط</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-3">
              {students.slice(0, 4).map((s, idx) => (
                  <div 
                    key={s.id} 
                    onClick={() => onSelectStudent(s)} 
                    className="bg-white p-4 rounded-3xl shadow-sm border border-gray-50 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
                  >
                      <div className="flex items-center gap-3">
                          {s.avatar ? (
                            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md">
                              <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                              idx % 3 === 0 ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 
                              idx % 3 === 1 ? 'bg-gradient-to-br from-indigo-400 to-indigo-600' : 
                              'bg-gradient-to-br from-violet-400 to-violet-600'
                            }`}>
                                {s.name.charAt(0)}
                            </div>
                          )}
                          <div>
                              <p className="font-bold text-gray-900">{s.name}</p>
                              <p className="text-[10px] text-gray-400 font-medium">
                                {s.classes.length > 0 ? s.classes[0] : 'غير مصنف'}
                              </p>
                          </div>
                      </div>
                      <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-gray-300" />
                      </div>
                  </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
