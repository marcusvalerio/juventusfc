import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  submitLabel?: string;
  successMessage: string;
  /** Return false to keep the modal open (validation failed). */
  onSubmit: () => boolean | void;
  children: React.ReactNode;
}

/**
 * Shared shell for every create/edit form: consistent footer, submit feedback
 * and a short simulated round-trip so the button's loading state is real.
 */
export function FormModal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  submitLabel = 'Salvar',
  successMessage,
  onSubmit,
  children,
}: FormModalProps) {
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = () => {
    if (onSubmit() === false) return;
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast.success(successMessage, 'Nesta versão os dados não são persistidos.');
      onClose();
    }, 620);
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="flex flex-col gap-5"
      >
        {children}
      </form>
    </Modal>
  );
}

/** Groups related fields inside a form — keeps long forms readable. */
export function FormSection({
  title,
  description,
  columns = 2,
  children,
}: {
  title: string;
  description?: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  const grid = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[columns];
  return (
    <fieldset className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <p className="eyebrow mb-1">{title}</p>
      {description && <p className="mb-4 text-2xs text-ink-faint">{description}</p>}
      <div className={`mt-4 grid gap-4 ${grid}`}>{children}</div>
    </fieldset>
  );
}
