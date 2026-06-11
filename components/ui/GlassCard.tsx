import React from 'react';
import { cn } from '../../utils/cn';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  interactive = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-5 overflow-hidden relative',
        interactive &&
          'cursor-pointer transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:bg-bgSoft hover:border-primary/20 hover:shadow-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
