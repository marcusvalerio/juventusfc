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
  /**
   * Performs the write. Return false to keep the modal open — used when
   * validation failed or the API rejected the payload and the form is now
   * showing field errors.
   */
  onSubmit: () => boolean | void | Promise<boolean | void>;
  children: React.ReactNode;
}

/**
 * Shared shell for every create/edit form: one submit path, one place where the
 * pending state and the success toast are handled.
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

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await onSubmit();
      if (result === false) return;
      toast.success(successMessage);
      onClose();
    } finally {
      setSaving(false);
    }
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
          void handleSubmit();
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
