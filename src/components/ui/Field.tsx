import { forwardRef, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DUR, EASE } from '@/lib/motion';

const CONTROL =
  'w-full rounded-md border bg-surface-sunken px-3 text-sm text-ink transition-colors duration-150 ' +
  'placeholder:text-ink-ghost hover:border-line-strong focus:border-[rgba(201,162,39,0.45)] focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; invalid: boolean }) => React.ReactNode;
}

/** Wraps a control with its label, hint and validation feedback. */
export function Field({ label, hint, error, success, required, className, children }: FieldProps) {
  const id = useId();
  const invalid = Boolean(error);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="flex items-center gap-1 text-[13px] font-medium text-ink-muted">
          {label}
          {required && <span className="text-gold">*</span>}
        </label>
      )}
      {children({ id, invalid })}
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className="flex items-center gap-1.5 text-2xs text-danger"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
            {error}
          </motion.p>
        ) : success ? (
          <motion.p
            key="success"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className="flex items-center gap-1.5 text-2xs text-success"
          >
            <Check className="h-3 w-3 shrink-0" aria-hidden />
            {success}
          </motion.p>
        ) : hint ? (
          <p key="hint" className="text-2xs text-ink-faint">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  prefixIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, prefixIcon, ...props },
  ref,
) {
  const control = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL,
        'h-9',
        invalid ? 'border-[rgba(224,82,82,0.5)]' : 'border-line-strong',
        prefixIcon && 'pl-9',
        className,
      )}
      {...props}
    />
  );

  if (!prefixIcon) return control;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint [&_svg]:h-4 [&_svg]:w-4">
        {prefixIcon}
      </span>
      {control}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 3, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL,
          'resize-y py-2 leading-relaxed',
          invalid ? 'border-[rgba(224,82,82,0.5)]' : 'border-line-strong',
          className,
        )}
        {...props}
      />
    );
  },
);

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  invalid?: boolean;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, className, invalid, placeholder, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL,
          'h-9 cursor-pointer appearance-none pr-9',
          invalid ? 'border-[rgba(224,82,82,0.5)]' : 'border-line-strong',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-graphite">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
    </div>
  );
});

/** Native date control, restyled to match the rest of the form language. */
export const DatePicker = forwardRef<HTMLInputElement, InputProps>(function DatePicker(
  { className, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="date"
      className={cn(
        '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-40',
        '[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:hover:opacity-80',
        className,
      )}
      {...props}
    />
  );
});

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start justify-between gap-6 py-3',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-line-gold bg-gold/30' : 'border-line-strong bg-surface-sunken',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          className={cn(
            'absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full',
            checked ? 'left-[18px] bg-gold-light' : 'left-[3px] bg-ink-faint',
          )}
        />
      </button>
    </label>
  );
}
