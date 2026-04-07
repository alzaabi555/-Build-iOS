import React from 'react';
import {
  Phone,
  ShieldCheck,
  Mail,
  GitBranch,
  Info,
  Code2,
  AlertTriangle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

import { motion } from 'framer-motion';
import BrandLogo from './BrandLogo';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme/ThemeProvider';
import PageLayout from '../components/PageLayout'; // 💉 استدعاء الغلاف الشامل

const About: React.FC = () => {
  const { t, dir, language } = useApp();
  const { theme } = useTheme(); 

  return (
    // 💉 تغليف الصفحة بالكامل بالمكون الجديد
    <PageLayout
      title={t('navAbout')}
      icon={<Info size={24} />}
    >
      
      {/* ⬇️ محتوى الصفحة المباشر (ينزلق بانسيابية تحت الهيدر) ⬇️ */}
      <div className="space-y-6 max-w-2xl mx-auto w-full animate-in fade-in duration-500 pt-2 pb-10">

        {/* App Identity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center py-4"
        >
          <div className="w-20 h-20 rounded-2xl border border-borderColor bg-bgCard shadow-sm flex items-center justify-center mb-3">
            <BrandLogo className="w-full h-full" showText={false} />
          </div>

          <h2 className="text-xl font-black text-textPrimary">
            {t('appNameAbout')}
          </h2>

          <span className="text-xs font-bold text-textSecondary mt-1">
            {t('appVersionLabel')}
          </span>
        </motion.div>

        {/* ===== Section: Developer ===== */}
        <Section title={t('intellectualPropertyTitle')}>
          <Row
            icon={<Code2 size={18} />}
            title={t('aboutDeveloperTitle')}
            subtitle={t('developerName')}
          />

          <Row
            title={t('ipRightsDesc1')}
            subtitle={t('appNameQuote')}
          />
        </Section>

        {/* ===== Section: Warning ===== */}
        <Section title={t('legalWarningTitle')}>
          <Row title={t('legalWarning1')} />
          <Row title={t('legalWarning2')} />
          <Row title={t('legalWarning3')} />
        </Section>

        {/* ===== Section: Contact ===== */}
        <Section title={t('techSupport')}>
          <RowLink
            icon={<Phone size={18} />}
            title={t('techSupport')}
            subtitle="98344555"
            href="tel:98344555"
            dir={dir}
          />

          <RowLink
            icon={<Mail size={18} />}
            title={t('emailLabel')}
            subtitle="mohammad.alzaabi21@edu.moe.om"
            href="mailto:mohammad.alzaabi21@edu.moe.om"
            dir={dir}
          />

          <RowLink
            icon={<GitBranch size={18} />}
            title="GitHub"
            subtitle="*****"
            href="https://*****"
            dir={dir}
          />
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-textSecondary font-bold pt-4 pb-8">
          <ShieldCheck className="mx-auto mb-2 opacity-50" size={16} />
          <p>{t('allRightsReservedFooter')} {new Date().getFullYear()}</p>
          <p className="mt-1 tracking-widest opacity-70">MADE WITH ❤️ IN OMAN</p>
        </div>

      </div>
    </PageLayout>
  );
};

export default About;

/* ================= UI Components (تركت كما هي بأمان) ================= */

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] px-2 font-black uppercase tracking-wider text-textSecondary">
        {title}
      </h3>

      <div className="rounded-2xl border border-borderColor bg-bgCard overflow-hidden divide-y divide-borderColor shadow-sm">
        {children}
      </div>
    </div>
  );
}

interface RowProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

function Row({ icon, title, subtitle }: RowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {icon && <div className="text-textSecondary">{icon}</div>}

      <div className="flex flex-col">
        <span className="text-sm font-bold text-textPrimary">{title}</span>
        {subtitle && (
          <span className="text-[10px] font-bold text-textSecondary mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

interface RowLinkProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  href: string;
  dir?: string;
}

function RowLink({ icon, title, subtitle, href, dir }: RowLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-bgSoft active:bg-bgSoft/80 group"
    >
      <div className="flex items-center gap-3">
        {icon && <div className="text-textSecondary group-hover:text-primary transition-colors">{icon}</div>}

        <div className="flex flex-col">
          <span className="text-sm font-bold text-textPrimary group-hover:text-primary transition-colors">{title}</span>
          {subtitle && (
            <span className="text-[10px] font-bold text-textSecondary mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <ChevronRight 
        size={16} 
        className={`text-textSecondary group-hover:text-primary transition-transform ${dir === 'rtl' ? 'rotate-180' : ''}`} 
      />
    </a>
  );
}
