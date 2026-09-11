import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';
import { Crest } from '@/components/brand/Crest';
import { Mascot3D } from '@/components/mascot';
import { useSession } from '@/app/SessionContext';

/**
 * Institutional portal. Deliberately quiet: one statement, one way in, and the
 * club's mascot answering it from the right of the hero.
 */
export default function HomePage() {
  const { publicClub, needsOnboarding, account } = useSession();

  if (needsOnboarding) return <Navigate to="/onboarding" replace />;

  const clubName = publicClub?.shortName ?? 'O clube';
  const location = [publicClub?.city, publicClub?.state].filter(Boolean).join(', ');

  const facts = [
    publicClub?.foundedYear ? { label: 'Fundação', value: publicClub.foundedYear } : null,
    location ? { label: 'Sede', value: location } : null,
    publicClub?.venue ? { label: 'Praça', value: publicClub.venue } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const entryHref = account ? '/app' : '/entrar';
  const entryLabel = account ? 'Entrar na plataforma' : 'Acessar a plataforma';

  return (
    <div className="grain relative flex min-h-screen flex-col overflow-hidden bg-onyx">
      {/* Cinematic club background. The asset is intentionally separate from
          the interface: no copy, logo, controls or mascot are baked into it. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: EASE }}
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/backgrounds/juventus-cinematic-bg.jpg')" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,11,0.88)_0%,rgba(8,9,11,0.52)_34%,rgba(8,9,11,0.12)_64%,rgba(8,9,11,0.32)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,9,11,0.32)_0%,transparent_35%,rgba(8,9,11,0.72)_100%)]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
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
            className="group inline-flex items-center gap-2 rounded-md border border-line-strong bg-onyx/20 px-3.5 py-2 text-[13px] text-ink-muted backdrop-blur-sm transition-colors duration-200 hover:border-line-gold hover:text-ink"
          >
            Acessar
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </span>
      </motion.header>

      <div
        data-slot="mascot-3d"
        className="relative z-[3] mx-auto h-[clamp(260px,38vh,380px)] w-full max-w-[440px] px-6 sm:px-10 lg:absolute lg:right-0 lg:top-[2vh] lg:mx-0 lg:h-[112vh] lg:w-[56%] lg:max-w-none lg:px-0"
      >
        <Mascot3D variant="home" state="idle" intensity={1} priority />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] hidden h-44 bg-gradient-to-t from-onyx/90 via-onyx/45 to-transparent lg:block"
      />

      {/* Statement */}
      <div className="relative z-10 flex flex-1 items-center px-6 pb-10 sm:px-10 sm:pb-14">
        <motion.section
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } } }}
          className="w-full lg:max-w-[48%]"
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
            className="mt-7 flex flex-col items-start gap-7"
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
      </div>

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
