import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);
const uuid = z.string().uuid();
const utcDateTime = z.string().datetime({ offset: true });

export const eventIdParamsSchema = z.object({
  eventId: uuid,
});

export const tierIdParamsSchema = z.object({
  eventId: uuid,
  tierId: uuid,
});

export const ticketTierInputSchema = z.object({
  name: nonEmptyText(100),
  price: z.number().int().nonnegative().safe(),
  quantityAvailable: z.number().int().positive().safe(),
});

export const createEventSchema = z.object({
  title: nonEmptyText(255),
  description: nonEmptyText(10_000),
  bannerImageUrl: z.string().trim().url().max(2_048).nullable().optional(),
  venue: nonEmptyText(255),
  startsAt: utcDateTime,
  tiers: z.array(ticketTierInputSchema).min(1).max(50),
});

export const updateEventSchema = z
  .object({
    title: nonEmptyText(255).optional(),
    description: nonEmptyText(10_000).optional(),
    bannerImageUrl: z.string().trim().url().max(2_048).nullable().optional(),
    venue: nonEmptyText(255).optional(),
    startsAt: utcDateTime.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one event field is required",
  });

export const createTierSchema = ticketTierInputSchema;

export const updateTierSchema = ticketTierInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one ticket tier field is required",
  });

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateTierInput = z.infer<typeof createTierSchema>;
export type UpdateTierInput = z.infer<typeof updateTierSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;