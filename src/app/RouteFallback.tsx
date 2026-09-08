import { motion } from 'framer-motion';
import { Crest } from '@/components/brand/Crest';

/** Shown while a route chunk loads — brief, quiet, on brand. */
export function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-onyx">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: [0.4, 1, 0.4], scale: 1 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Crest className="h-9" />
      </motion.div>
    </div>
  );
}
