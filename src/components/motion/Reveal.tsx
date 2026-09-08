import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/cn';
import { riseItem, staggerContainer } from '@/lib/motion';

/** Container that reveals its children in sequence. */
export function Stagger({
  children,
  className,
  gap = 0.045,
  delay = 0,
  as: _as,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
  as?: 'div';
}) {
  return (
    <motion.div
      variants={staggerContainer(gap, delay)}
      initial="initial"
      animate="animate"
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  variants = riseItem,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
}) {
  return (
    <motion.div variants={variants} className={cn(className)}>
      {children}
    </motion.div>
  );
}
