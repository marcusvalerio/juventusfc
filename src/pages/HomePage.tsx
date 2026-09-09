import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';
import { Crest } from '@/components/brand/Crest';
import { useSession } from '@/app/SessionContext';

/**
 * Institutional portal. Deliberately quiet: one statement, one way in, and a
 * reserved stage in the middle where the 3D shirt will land in a later phase —
 * the surrounding composition is already sized for it.
 */
export default function HomePage() {
  const { publicClub, needsOnboarding, account } = useSession();

  const clubName = publicClub?.shortName ?? 'O clube';
  const backdrop = (publicClub?.shortName ?? 'CLUBE').split(' ')[0].toUpperCase();
  const location = [publicClub?.city, publicClub?.state].filter(Boolean).join(', ');

  // Only facts the club actually recorded are shown — nothing is invented here.
  const facts = [
    publicClub?.foundedYear ? { label: 'Fundação', value: publicClub.foundedYear } : null,
    location ? { label: 'Sede', value: location } : null,
    publicClub?.venue ? { label: 'Praça', value: publicClub.venue } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const entryHref = needsOnboarding ? '/onboarding' : account ? '/app' : '/entrar';
  const entryLabel = needsOnboarding
    ? 'Configurar o clube'
    : account
      ? 'Entrar na plataforma'
      : 'Acessar a plataforma';

  return (
    <div className="grain relative flex min-h-screen flex-col overflow-hidden bg-onyx">
      {/* Editorial backdrop: the club's name at architectural scale. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: EASE }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className="whitespace-nowrap font-display text-[26vw] font-medium leading-none tracking-tightest text-ink opacity-[0.035] sm:text-[22vw]">
          {backdrop}
        </span>
      </motion.div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, ease: EASE, delay: 0.1 }}
        className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8"
      >
        <span className="flex items-center gap-3">
          <Crest className="h-8" />
          <span className="hidden max-w-[240px] truncate font-display text-[15px] tracking-editorial text-ink sm:block">
            {clubName}
          </span>
        </span>

        <span className="flex items-center gap-6">
          <span className="hidden text-2xs uppercase tracking-label text-ink-faint md:block">
            Plataforma de gestão
          </span>
          <Link
            to={entryHref}
            className="group inline-flex items-center gap-2 rounded-md border border-line-strong px-3.5 py-2 text-[13px] text-ink-muted transition-colors duration-200 hover:border-line-gold hover:text-ink"
          >
            {needsOnboarding ? 'Configurar' : 'Acessar'}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </span>
      </motion.header>

      {/* Stage reserved for the 3D shirt */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <div
          data-slot="shirt-3d"
          aria-hidden
          className="relative flex h-[clamp(220px,38vh,380px)] w-full max-w-[420px] items-center justify-center"
        >
          <motion.span
            className="absolute h-[62%] w-[62%] rounded-full border border-line-gold"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.25, 0.55, 0.25], scale: 1 }}
            transition={{ opacity: { duration: 5, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 1.4, ease: EASE } }}
          />
          <motion.span
            className="absolute h-[38%] w-[38%] rounded-full border border-line"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
          />
          <motion.span
            className="absolute bottom-4 h-px w-[70%] bg-gradient-to-r from-transparent via-gold/25 to-transparent"
            initial={{ opacity: 0, scaleX: 0.4 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.5 }}
          />
        </div>
      </div>

      {/* Statement */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } } }}
        className="relative z-10 px-6 pb-10 sm:px-10 sm:pb-14"
      >
        <motion.p
          variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: DUR.editorial, ease: EASE } } }}
          className="eyebrow"
        >
          {[location, publicClub?.foundedYear && `desde ${publicClub.foundedYear}`]
            .filter(Boolean)
            .join(' · ') || 'Plataforma de gestão'}
        </motion.p>

        <motion.h1
          variants={{ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } } }}
          className="mt-4 font-display text-[clamp(3rem,11vw,7.5rem)] font-medium leading-[0.88] tracking-tightest text-ink"
        >
          Chega mais<span className="text-gold">.</span>
        </motion.h1>

        <motion.div
          variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: DUR.editorial, ease: EASE } } }}
          className="mt-7 flex flex-wrap items-end justify-between gap-8"
        >
          <p className="max-w-md text-[13px] leading-relaxed text-ink-muted sm:text-sm">
            O clube inteiro em um só lugar: elenco, calendário, finanças e patrimônio.
            Feito para quem cuida do Juventus todos os dias.
          </p>

          <Link
            to={entryHref}
            className="group inline-flex items-center gap-2.5 rounded-md bg-ink px-5 py-3 text-sm font-medium text-onyx transition-colors duration-200 hover:bg-white"
          >
            {entryLabel}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </motion.section>

      {/* Footer facts */}
      {facts.length > 0 && (
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DUR.editorial, ease: EASE, delay: 0.8 }}
        className="relative z-10 border-t border-line px-6 py-5 sm:px-10"
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="eyebrow">{fact.label}</dt>
              <dd className="mt-1.5 truncate text-[13px] text-ink-muted">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </motion.footer>
      )}
    </div>
  );
}
