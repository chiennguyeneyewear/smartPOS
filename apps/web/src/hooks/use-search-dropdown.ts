import { useEffect, useRef, useState } from "react";

/**
 * Shared open/close state for a text-input-driven search dropdown (customer
 * search, product quick-search, ...). Closing on blur is delayed so a click
 * on a result (which blurs the input first) still registers, but the pending
 * timeout is tracked in a ref so refocusing cancels it instead of leaving it
 * to fire later and closing a dropdown that was just reopened.
 */
export function useSearchDropdown() {
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function cancelPendingClose() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function openNow() {
    cancelPendingClose();
    setOpen(true);
  }

  function closeSoon(delayMs = 150) {
    cancelPendingClose();
    closeTimeoutRef.current = setTimeout(() => setOpen(false), delayMs);
  }

  function closeNow() {
    cancelPendingClose();
    setOpen(false);
  }

  return { open, openNow, closeSoon, closeNow };
}
