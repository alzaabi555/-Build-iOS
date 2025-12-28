import React from 'react';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark' | 'color';
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = "w-12 h-12", showText = false, variant = 'color' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 512 512" className="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rased_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4338ca" /> {/* Indigo 700 */}
            <stop offset="50%" stopColor="#6366f1" /> {/* Indigo 500 */}
            <stop offset="100%" stopColor="#818cf8" /> {/* Indigo 400 */}
          </linearGradient>
          <linearGradient id="gold_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Background Squircle */}
        <rect x="20" y="20" width="472" height="472" rx="140" fill="url(#rased_grad)" className="shadow-2xl" />
        
        {/* Decorative Ring (Orbit) */}
        <path d="M400 150 A 180 180 0 0 1 150 400" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="40" strokeLinecap="round" />
        
        {/* The Eye / Checkmark Symbol */}
        <g transform="translate(106, 106) scale(0.6)">
            {/* The Iris/Lens Shape */}
            <path 
                d="M250 50 C 140 50, 50 150, 50 250 C 50 350, 140 450, 250 450 C 360 450, 450 350, 450 250" 
                fill="none" 
                stroke="white" 
                strokeWidth="45" 
                strokeLinecap="round"
                className="drop-shadow-md"
            />
            
            {/* The "R" / Checkmark / Pupil */}
            <path 
                d="M170 240 L 230 300 L 350 160" 
                fill="none" 
                stroke="url(#gold_grad)" 
                strokeWidth="50" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                filter="url(#glow)"
            />
            
            {/* Data Dot */}
            <circle cx="350" cy="350" r="30" fill="white" opacity="0.9" />
        </g>
      </svg>
      
      {showText && (
          <div className="flex flex-col">
              <span className={`font-black tracking-tighter leading-none ${variant === 'light' ? 'text-white' : 'text-slate-800'}`} style={{fontSize: '1.2em'}}>راصد</span>
              <span className={`text-[0.4em] font-bold tracking-widest uppercase opacity-70 ${variant === 'light' ? 'text-indigo-200' : 'text-indigo-500'}`}>Rased App</span>
          </div>
      )}
    </div>
  );
};

export default BrandLogo;