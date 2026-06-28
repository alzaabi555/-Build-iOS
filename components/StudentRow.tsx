import React, { useState } from 'react';
import { MoreVertical, LucideIcon } from 'lucide-react';
import { Student } from '../types';
import { StudentAvatar } from './StudentAvatar';
import { cn } from '../utils/cn';

type ActionTone =
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral';

export interface StudentRowAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: ActionTone;
  voiceCommand?: string;
  ariaLabel?: string;
  title?: string;
  danger?: boolean;
  showOnMobile?: boolean;
}

interface StudentRowProps {
  student: Student;
  dir: string;
  subtitle?: string;
  badge?: string | number;
  badgeTone?: ActionTone;
  statusText?: string;
  statusTone?: ActionTone;
  actions: StudentRowAction[];
  className?: string;
  indexLabel?: string | number;
  trailingContent?: React.ReactNode;
}

const toneClasses: Record<ActionTone, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15',
  success: 'bg-success/10 text-success border-success/20 hover:bg-success/15',
  danger: 'bg-danger/10 text-danger border-danger/20 hover:bg-danger/15',
  warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15',
  info: 'bg-info/10 text-info border-info/20 hover:bg-info/15',
  neutral:
    'bg-bgSoft text-textSecondary border-borderColor hover:bg-bgCard hover:text-textPrimary'
};

const dotToneClasses: Record<ActionTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  neutral: 'bg-textMuted'
};

export const StudentRow: React.FC<StudentRowProps> = ({
  student,
  dir,
  subtitle,
  badge,
  badgeTone = 'warning',
  statusText,
  statusTone = 'neutral',
  actions,
  className,
  indexLabel,
  trailingContent
}) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleMobileActions = actions.filter(action => action.showOnMobile !== false);
  const hiddenMobileActions = actions.filter(action => action.showOnMobile === false);

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMoreOpen(prev => !prev);
  };

  const renderActionButton = (
    action: StudentRowAction,
    options?: { compact?: boolean; inMenu?: boolean }
  ) => {
    const Icon = action.icon;
    const tone = action.tone || 'neutral';

    if (options?.inMenu) {
      return (
        <button
          key={action.key}
          type="button"
          data-voice-command={action.voiceCommand}
          data-voice-danger={action.danger ? 'true' : undefined}
          aria-label={action.ariaLabel || action.label}
          title={action.title || action.label}
          onClick={(e) => {
            e.stopPropagation();
            setMoreOpen(false);
            action.onClick();
          }}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95',
            dir === 'rtl' ? 'text-right' : 'text-left',
            toneClasses[tone]
          )}
        >
          <Icon size={16} />
          <span>{action.label}</span>
        </button>
      );
    }

    return (
      <button
        key={action.key}
        type="button"
        data-voice-command={action.voiceCommand}
        data-voice-danger={action.danger ? 'true' : undefined}
        aria-label={action.ariaLabel || action.label}
        title={action.title || action.label}
        onClick={(e) => {
          e.stopPropagation();
          action.onClick();
        }}
        className={cn(
          'h-9 min-w-9 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-black transition-all active:scale-95',
          toneClasses[tone],
          options?.compact && 'px-2'
        )}
      >
        <Icon size={16} />
        <span className="hidden lg:inline">{action.label}</span>
      </button>
    );
  };

  return (
    <div
      dir={dir}
      className={cn(
        'group relative w-full bg-bgCard border border-borderColor rounded-2xl shadow-sm transition-all duration-200',
        'hover:border-primary/20 hover:shadow-card',
        'px-3 py-3 md:px-4 md:py-3',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <StudentAvatar
            gender={student.gender}
            className="w-11 h-11 md:w-12 md:h-12"
          />

          {indexLabel !== undefined && (
            <div className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-bgSoft border border-borderColor text-[10px] font-black text-textSecondary flex items-center justify-center shadow-sm">
              {indexLabel}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-black text-sm md:text-[15px] text-textPrimary truncate">
              {student.name}
            </h3>

            {badge !== undefined && badge !== null && badge !== '' && (
              <span
                className={cn(
                  'shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border',
                  toneClasses[badgeTone]
                )}
              >
                {badge}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-textSecondary min-w-0">
            {subtitle && <span className="truncate">{subtitle}</span>}

            {statusText && (
              <>
                <span className="w-1 h-1 rounded-full bg-borderColor shrink-0" />
                <span className="flex items-center gap-1 truncate">
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      dotToneClasses[statusTone]
                    )}
                  />
                  {statusText}
                </span>
              </>
            )}
          </div>
        </div>

        {trailingContent && (
          <div className="shrink-0">
            {trailingContent}
          </div>
        )}

        {actions.length > 0 && (
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {actions.map(action => renderActionButton(action))}
          </div>
        )}

        {actions.length > 0 && (
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {visibleMobileActions.slice(0, 2).map(action =>
              renderActionButton(action, { compact: true })
            )}

            {(hiddenMobileActions.length > 0 || visibleMobileActions.length > 2) && (
              <div className="relative">
                <button
                  type="button"
                  aria-label="المزيد"
                  title="المزيد"
                  onClick={handleMoreClick}
                  className="h-9 w-9 rounded-xl border border-borderColor bg-bgSoft text-textSecondary flex items-center justify-center active:scale-95 hover:bg-bgCard hover:text-textPrimary transition-all"
                >
                  <MoreVertical size={17} />
                </button>
{moreOpen && (
  <>
    {/* طبقة إغلاق شفافة */}
    <button
      type="button"
      aria-label="إغلاق القائمة"
      onClick={() => setMoreOpen(false)}
      className="fixed inset-0 z-[99998] bg-transparent"
    />

    {/* قائمة المزيد للجوال - تظهر فوق شريط التنقل السفلي */}
    <div
      className={cn(
        'fixed z-[99999] left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]',
        'rounded-3xl border border-borderColor bg-bgCard shadow-elevated p-3',
        'animate-in fade-in slide-in-from-bottom-2 duration-200'
      )}
      dir={dir}
    >
      <div className="mb-2 px-1">
        <p className="text-[11px] font-black text-textPrimary">
          إجراءات الطالب
        </p>
        <p className="text-[10px] font-bold text-textSecondary truncate">
          {student.name}
        </p>
      </div>

      <div className="space-y-1.5">
        {[...visibleMobileActions.slice(2), ...hiddenMobileActions].map(action =>
          renderActionButton(action, { inMenu: true })
        )}
      </div>
    </div>
  </>
)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentRow;
