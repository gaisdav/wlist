import { toast } from 'sonner';

import { i18n } from '../i18n';

/**
 * Non-dismissible error feedback; `message` should already be localized.
 *
 * TanStack mutations: set `meta: { suppressErrorToast: true }` on `useMutation`
 * when the caller shows a more specific inline error and should skip the
 * global `MutationCache` handler in `QueryProvider`.
 */
export const showErrorToast = (message?: string): void => {
  toast.error(message ?? i18n.t('states.error'));
};
