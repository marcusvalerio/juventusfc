import { ApiError } from '@/services/api';

export interface SubmitFeedback {
  error: (title: string, description?: string) => void;
}

/**
 * Runs a write and routes failures to the right place: field-level messages go
 * back onto the form, anything else becomes a toast. Returns false when the
 * modal should stay open so the user can correct the input.
 */
export async function runSubmit(
  action: () => Promise<unknown>,
  setErrors: (errors: Record<string, string>) => void,
  toast: SubmitFeedback,
  fallbackTitle = 'Não foi possível salvar',
): Promise<boolean> {
  try {
    await action();
    setErrors({});
    return true;
  } catch (cause) {
    if (cause instanceof ApiError) {
      if (cause.details && Object.keys(cause.details).length > 0) {
        setErrors(cause.details);
      } else {
        toast.error(fallbackTitle, cause.message);
      }
    } else {
      toast.error(fallbackTitle, 'Verifique a conexão e tente novamente.');
    }
    return false;
  }
}
