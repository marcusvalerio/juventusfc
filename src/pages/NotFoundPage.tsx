import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';
import { Crest } from '@/components/brand/Crest';

export default function NotFoundPage() {
  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-onyx px-6 text-center">
      <motion.span
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
        className="pointer-events-none absolute font-display text-[38vw] leading-none tracking-tightest text-ink opacity-[0.035]"
      >
        404
      </motion.span>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.editorial, ease: EASE }}
        className="relative z-10 flex flex-col items-center"
      >
        <Crest className="mb-8 h-10" />
        <p className="eyebrow">Página não encontrada</p>
        <h1 className="mt-4 font-display text-4xl font-medium tracking-tightest text-ink sm:text-5xl">
          Essa não saiu<span className="text-gold">.</span>
        </h1>
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-ink-muted">
          O endereço acessado não existe na plataforma. Volte ao painel para
          continuar de onde parou.
        </p>

        <Link
          to="/app"
          className="group mt-8 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-medium text-onyx transition-colors duration-200 hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Voltar ao dashboard
        </Link>
      </motion.div>
    </div>
  );
}
