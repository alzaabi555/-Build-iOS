import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'glass';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, children, ...props }) => {
  const variants = {
    primary: "bg-primary text-white hover:shadow-[0_0_15px_var(--glow)] border border-transparent hover:-translate-y-0.5",
    ghost: "bg-transparent text-textPrimary hover:bg-bgSoft border border-transparent",
    glass: "glass-button", // استخدمنا الكلاس الذي عرفناه في tokens.css
  };

  return (
    <button
      className={cn(
        "px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};