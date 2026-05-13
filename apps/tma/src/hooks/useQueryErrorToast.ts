import { useEffect, useRef } from 'react';

import { showErrorToast } from '../lib/errorToast';

/**
 * Shows one error toast when `isError` becomes true (e.g. failed TanStack Query).
 * Resets when the query recovers so a later failure can toast again.
 */
export const useQueryErrorToast = (isError: boolean, message?: string): void => {
  const wasError = useRef(false);

  useEffect(() => {
    if (isError && !wasError.current) {
      showErrorToast(message);
    }
    wasError.current = isError;
  }, [isError, message]);
};
