import { haptics } from './haptics';

/**
 * Standard haptic rule for a state-changing action, applied as TanStack Query
 * mutation callbacks so each handler doesn't re-implement it:
 *   - `impact('light')` immediately when the action fires;
 *   - `notify('success')` once the mutation resolves;
 *   - `notify('error')` if it rejects.
 *
 * Spread the result into a `mutate(vars, hapticMutationOptions())` call, or pass
 * your own callbacks to run alongside (they fire after the haptic).
 *
 * @example
 * createList.mutate(name, hapticMutationOptions({ onSuccess: () => setName('') }));
 */
export const hapticMutationOptions = <TData, TError, TVariables, TContext>(extra?: {
  onSuccess?: (data: TData, vars: TVariables, ctx: TContext) => void;
  onError?: (err: TError, vars: TVariables, ctx: TContext) => void;
}): {
  onSuccess: (data: TData, vars: TVariables, ctx: TContext) => void;
  onError: (err: TError, vars: TVariables, ctx: TContext) => void;
} => {
  // Fire the tap haptic as soon as the options are constructed (call time).
  haptics.impact('light');
  return {
    onSuccess: (data, vars, ctx) => {
      haptics.notify('success');
      extra?.onSuccess?.(data, vars, ctx);
    },
    onError: (err, vars, ctx) => {
      haptics.notify('error');
      extra?.onError?.(err, vars, ctx);
    },
  };
};
