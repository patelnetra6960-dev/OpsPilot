import { useState, useCallback } from 'react';

/**
 * Reusable hook for modal, drawer, and popover open/close state management
 * @param {boolean} initial - Initial open state (default false)
 */
export const useDisclosure = (initial = false) => {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  };
};

export default useDisclosure;
