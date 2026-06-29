import type { WishDraftFormInput, WishDraftPayload } from '@wlist/core/entities/wish';
import type { UseFormReturn } from 'react-hook-form';

/** RHF instance shared by the wish-form sections. */
export type WishForm = UseFormReturn<WishDraftFormInput, unknown, WishDraftPayload>;

/** Props common to every wish-form section: the form and whether a save is in flight. */
export interface WishSectionBaseProps {
  form: WishForm;
  isSaving: boolean;
}
