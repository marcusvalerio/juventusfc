import { useCallback, useState } from 'react';

/** Open/close state for modals, drawers and dropdowns. */
export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);
  return { isOpen, open, close, toggle };
}
