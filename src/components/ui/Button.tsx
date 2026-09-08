import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  // The primary action reads as light on dark — gold stays reserved for identity.
  primary: 'bg-ink text-onyx hover:bg-white active:bg-[#E6E6E3] font-medium',
  secondary:
    'bg-surface-raised text-ink border border-line-strong hover:bg-surface-hover hover:border-[rgba(244,244,242,0.2)]',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-raised',
  gold: 'bg-gold-wash text-gold-light border border-line-gold hover:bg-[rgba(201,162,39,0.16)] hover:border-[rgba(201,162,39,0.45)]',
  danger: 'bg-danger-wash text-danger border border-[rgba(224,82,82,0.3)] hover:bg-[rgba(224,82,82,0.2)]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-md',
  lg: 'h-11 px-6 text-[15px] gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-md',
};

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, className, children, disabled, ...props },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={isDisabled}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={springSnappy}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-sans transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        icon && <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      )}
      {children}
      {iconRight && !loading && (
        <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{iconRight}</span>
      )}
    </motion.button>
  );
});

export interface IconButtonProps extends ButtonProps {
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      size="icon"
      variant="ghost"
      aria-label={label}
      title={label}
      className={cn('[&_svg]:h-4 [&_svg]:w-4', className)}
      {...props}
    />
  );
});

export interface LinkButtonProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Navigation styled as an action. Renders an anchor so links stay links —
 * middle-click, open-in-new-tab and screen readers all keep working.
 */
export function LinkButton({ to, variant = 'secondary', size = 'md', icon, iconRight, className, children }: LinkButtonProps) {
  return (
    <RouterLink
      to={to}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-sans transition-colors duration-150',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {icon && <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{iconRight}</span>}
    </RouterLink>
  );
}
