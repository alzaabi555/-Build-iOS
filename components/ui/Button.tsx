import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'glass';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className,
  children,
  type = 'button',
  ...props
}) => {
  const variants = {
    primary:
      'bg-primary text-white border border-transparent hover:bg-primaryHover shadow-sm hover:shadow-card',
    ghost:
      'bg-transparent text-textPrimary border border-transparent hover:bg-bgSoft',
    glass:
      'glass-button'
  };

  return (
    <button
      type={type}
      className={cn(
        'px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bgMain',
        'disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
