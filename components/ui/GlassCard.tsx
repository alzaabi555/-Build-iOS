import React from 'react';
import { cn } from '../../utils/cn';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ interactive = false, className, children, ...props }) => {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-5 animate-smooth overflow-hidden relative",
        interactive && "cursor-pointer hover:-translate-y-1 hover:bg-glass hover:shadow-[0_0_20px_var(--glow)] active:scale-[0.98] transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};