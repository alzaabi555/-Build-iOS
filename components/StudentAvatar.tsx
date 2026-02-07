import React from 'react';
import boyAvatarImage from '../assets/boy-avatar.png';
import girlAvatarImage from '../assets/girl-avatar.png';

export const OmaniBoyAvatarSVG = () => (
  <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 relative flex items-center justify-center border border-slate-100">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-slate-200 opacity-50"></div>
      <img 
        src={boyAvatarImage}
        alt="طالب" 
        className="w-full h-full object-cover transform scale-110 translate-y-1"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.style.backgroundColor = '#cbd5e1';
        }}
      />
  </div>
);

export const OmaniGirlAvatarSVG = () => (
  <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 relative flex items-center justify-center border border-slate-100">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 to-purple-50 opacity-50"></div>
      <img 
        src={girlAvatarImage}
        alt="طالبة" 
        className="w-full h-full object-cover transform scale-110 translate-y-1"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.style.backgroundColor = '#e2e8f0';
        }}
      />
  </div>
);

// مكون ذكي يختار الأفاتار المناسب تلقائياً
interface StudentAvatarProps {
  gender?: 'male' | 'female';
  className?: string;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({ gender = 'male', className = '' }) => {
  return (
    <div className={className}>
      {gender === 'male' ? <OmaniBoyAvatarSVG /> : <OmaniGirlAvatarSVG />}
    </div>
  );
};