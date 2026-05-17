import { publicEventsRowSchema } from '@wlist/api/generated/database.zod';
import { type z } from 'zod';

export const eventSchema = publicEventsRowSchema;

export type Event = z.infer<typeof eventSchema>;
