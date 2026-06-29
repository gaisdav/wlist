import { haptics } from './haptics';

interface HapticMutationCallbacks<TData, TError, TVariables, TContext> {
  onMutate?: (vars: TVariables) => void;
  onSuccess?: (data: TData, vars: TVariables, ctx: TContext) => void;
  onError?: (err: TError, vars: TVariables, ctx: TContext) => void;
}

/**
 * Standard haptic rule for a state-changing action, applied as TanStack Query
 * per-call mutation callbacks so each handler doesn't re-implement it:
 *   - `impact('light')` in `onMutate` (start of the mutation lifecycle);
 *   - `notify('success')` once the mutation resolves;
 *   - `notify('error')` if it rejects.
 *
 * The haptics run on the actual mutation lifecycle (not at object construction),
 * so the returned object is safe to hoist or reuse. Any callbacks you pass run
 * after the haptic. Per-call callbacks run *in addition* to the hook's own
 * (TanStack fires both), so optimistic updates / invalidation are preserved.
 *
 * @example
 * createList.mutate(name, hapticMutationOptions({ onSuccess: () => setName('') }));
 */
export const hapticMutationOptions = <TData, TError, TVariables, TContext>(
  extra?: HapticMutationCallbacks<TData, TError, TVariables, TContext>,
): Required<Pick<HapticMutationCallbacks<TData, TError, TVariables, TContext>, 'onMutate'>> &
  HapticMutationCallbacks<TData, TError, TVariables, TContext> => ({
  onMutate: (vars) => {
    haptics.impact('light');
    extra?.onMutate?.(vars);
  },
  onSuccess: (data, vars, ctx) => {
    haptics.notify('success');
    extra?.onSuccess?.(data, vars, ctx);
  },
  onError: (err, vars, ctx) => {
    haptics.notify('error');
    extra?.onError?.(err, vars, ctx);
  },
});
