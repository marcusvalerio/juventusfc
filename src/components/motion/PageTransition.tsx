import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/motion';

/** Wraps route content so every section change reads as one movement. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-full">
      {children}
    </motion.div>
  );
}
