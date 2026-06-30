import type { WishDraftFormInput, WishDraftPayload } from '@wlist/core/entities/wish';
import type { UseFormReturn } from 'react-hook-form';

/** RHF instance shared by the wish-form sections. */
export type WishForm = UseFormReturn<WishDraftFormInput, unknown, WishDraftPayload>;

/**
 * Props common to the form-bound sections. Only the RHF instance: the enclosing
 * `<fieldset disabled={isSaving}>` natively disables every descendant control
 * while a save is in flight, so sections don't thread `isSaving` for that. A
 * section needs it only for a *non-fieldset* reason (e.g. an edit-mode lock).
 */
export interface WishSectionBaseProps {
  form: WishForm;
}
