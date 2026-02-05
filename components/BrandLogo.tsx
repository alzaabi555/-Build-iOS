import React from 'react';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = "w-8 h-8", showText = true, variant = 'dark' }) => {
  const color = variant === 'light' ? '#ffffff' : '#1e3a8a';
  const textColor = variant === 'light' ? 'text-white' : 'text-[#1e3a8a]';

  return (
    <div className={`flex items-center gap-2 ${className.includes('w-') ? '' : 'h-full'}`}>
      {/* أيقونة الشعار (عين + علامة صح) */}
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 20C30 20 12 40 5 50C12 60 30 80 50 80C70 80 88 60 95 50C88 40 70 20 50 20Z" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M50 65C58.2843 65 65 58.2843 65 50C65 41.7157 58.2843 35 50 35C41.7157 35 35 41.7157 35 50C35 58.2843 41.7157 65 50 65Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="4"/>
        <path d="M42 50L48 56L68 36" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      
      {/* النص (يظهر فقط إذا طلبناه) */}
      {showText && (
        <span className={`font-black text-xl tracking-tighter ${textColor}`}>
          راصد
        </span>
      )}
    </div>
  );
};

export default BrandLogo;