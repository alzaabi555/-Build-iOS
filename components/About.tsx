import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Code2,
  ExternalLink,
  Info,
  Mail,
  MessageCircleQuestion,
  Phone,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import BrandLogo from './BrandLogo';
import { useApp } from '../context/AppContext';
import PageLayout from '../components/PageLayout';

const SUPPORT_PHONE = '98344555';
const SUPPORT_EMAIL = 'mohammad.alzaabi21@edu.moe.om';

const About: React.FC = () => {
  const { t, dir } = useApp();

  const features = [
    'إدارة الطلاب والفصول ومتابعة البيانات الأساسية',
    'الحضور والغياب والسلوك والدرجات وأدوات التقويم',
    'الجدول الدراسي والويدجيت والخطط الفصلية والتقويم المستمر',
    'المجموعات والمهام والمكتبة والألعاب التعليمية',
    'المراسلات والتقارير والتحليل الإحصائي والشهادات',
    'النسخ المحلية والمزامنة السحابية بين أجهزة المعلم'
  ];

  return (
    <PageLayout
      title={t('aboutTitle') || 'حول راصد المعلم'}
      subtitle="معلومات التطبيق والدعم والخصوصية"
      icon={<Info size={24} />}
    >
      <div
        dir={dir}
        className="mx-auto w-full max-w-6xl space-y-5 pb-10 text-textPrimary"
      >
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-[2rem] border border-borderColor bg-bgCard p-5 shadow-sm md:p-8"
        >
          <div className="pointer-events-none absolute -top-20 end-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 start-0 h-56 w-56 rounded-full bg-success/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center gap-5 text-center md:flex-row md:text-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.75rem] border border-primary/20 bg-primary/10 shadow-sm md:h-28 md:w-28">
              <BrandLogo />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black text-primary">
                  منظومة تعليمية متكاملة
                </span>
                <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[10px] font-black text-success">
                  للمعلم
                </span>
              </div>

              <h1 className="text-2xl font-black text-textPrimary md:text-4xl">
                {t('appNameAbout') || 'راصد المعلم'}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-textSecondary md:text-base md:leading-8">
                منصة تساعد المعلم على تنظيم أعماله اليومية، متابعة الطلاب، إدارة المحتوى التعليمي،
                إعداد التقارير، والتكامل مع بقية تطبيقات منظومة راصد من واجهة موحدة وسهلة الاستخدام.
              </p>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Section
            icon={<Sparkles size={20} />}
            title="ما الذي يقدمه راصد المعلم؟"
            subtitle="أدوات مترابطة لدعم العمل التعليمي اليومي"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="flex items-start gap-3 rounded-2xl border border-borderColor bg-bgSoft p-3.5"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <p className="text-xs font-black leading-6 text-textPrimary md:text-sm">
                    {feature}
                  </p>
                </motion.div>
              ))}
            </div>
          </Section>

          <Section
            icon={<ShieldCheck size={20} />}
            title="الخصوصية وحماية البيانات"
            subtitle="بيانات المعلم تحت إدارته"
          >
            <div className="space-y-3">
              <InfoCard
                icon={<ShieldCheck size={18} />}
                title="الحفظ والنسخ الاحتياطي"
                text="يوفر التطبيق حفظًا محليًا وخيارات للنسخ والاستعادة والمزامنة السحابية وفق إعدادات المعلم."
                tone="success"
              />
              <InfoCard
                icon={<Info size={18} />}
                title="مراجعة البيانات"
                text="يُنصح بإنشاء نسخة احتياطية قبل إعادة الضبط أو الانتقال إلى جهاز آخر."
                tone="primary"
              />
            </div>
          </Section>
        </div>

        <Section
          icon={<MessageCircleQuestion size={20} />}
          title={t('techSupport') || 'الدعم والتواصل'}
          subtitle="قنوات التواصل الخاصة بالدعم الفني والملاحظات"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ContactCard
              icon={<Phone size={20} />}
              title={t('techSupport') || 'الدعم الفني'}
              value={SUPPORT_PHONE}
              href={`tel:${SUPPORT_PHONE}`}
              dir={dir}
            />
            <ContactCard
              icon={<Mail size={20} />}
              title={t('emailLabel') || 'البريد الإلكتروني'}
              value={SUPPORT_EMAIL}
              href={`mailto:${SUPPORT_EMAIL}`}
              dir={dir}
            />
          </div>
        </Section>

        <Section
          icon={<Code2 size={20} />}
          title={t('aboutDeveloperTitle') || 'التطوير'}
          subtitle="تطوير وتحديث مستمر لخدمة البيئة التعليمية"
        >
          <div className="flex flex-col gap-4 rounded-2xl border border-borderColor bg-bgSoft p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-textPrimary">
                {t('developerName') || 'محمد درويش خميس الزعابي'}
              </p>
              <p className="mt-1 text-xs font-bold leading-6 text-textSecondary">
                صُمم التطبيق لتطوير تجربة المعلم الرقمية، وتُضاف التحسينات استنادًا إلى الاستخدام الفعلي والملاحظات الميدانية.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-black text-primary">
              <BookOpen size={16} />
              تطوير تعليمي مستمر
            </div>
          </div>
        </Section>

        <footer className="rounded-2xl border border-borderColor bg-bgCard px-4 py-4 text-center shadow-sm">
          <p className="text-xs font-black text-textPrimary">
            {t('allRightsReservedFooter') || 'جميع الحقوق محفوظة'} © {new Date().getFullYear()}
          </p>
          <p className="mt-1 text-[10px] font-bold text-textSecondary">
            راصد المعلم — أدوات عملية لإدارة التعليم والمتابعة
          </p>
        </footer>
      </div>
    </PageLayout>
  );
};

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Section({ icon, title, subtitle, children }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-[2rem] border border-borderColor bg-bgCard p-4 shadow-sm md:p-5"
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-black text-textPrimary md:text-lg">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-[11px] font-bold leading-5 text-textSecondary">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: 'primary' | 'success';
}

function InfoCard({ icon, title, text, tone }: InfoCardProps) {
  const toneClasses = tone === 'success'
    ? 'border-success/20 bg-success/10 text-success'
    : 'border-primary/20 bg-primary/10 text-primary';

  return (
    <div className="rounded-2xl border border-borderColor bg-bgSoft p-3.5">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${toneClasses}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-xs font-black text-textPrimary md:text-sm">{title}</h3>
          <p className="mt-1 text-[11px] font-bold leading-6 text-textSecondary">{text}</p>
        </div>
      </div>
    </div>
  );
}

interface ContactCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  href: string;
  dir: string;
}

function ContactCard({ icon, title, value, href, dir }: ContactCardProps) {
  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.electron?.openExternal && /^https?:/i.test(href)) {
      event.preventDefault();
      await window.electron.openExternal(href);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      dir={dir}
      target={/^https?:/i.test(href) ? '_blank' : undefined}
      rel={/^https?:/i.test(href) ? 'noopener noreferrer' : undefined}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-borderColor bg-bgSoft p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-105">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-textSecondary">{title}</p>
        <p className="mt-1 truncate text-xs font-black text-textPrimary">{value}</p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-textMuted transition-colors group-hover:text-primary" />
    </a>
  );
}

export default About;
