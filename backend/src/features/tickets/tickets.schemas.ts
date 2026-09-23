import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const TICKET_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TICKET_CODE_REGEX = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export const checkInParamSchema = z.object({
  eventId: z.string().uuid(),
});

export const checkInBodySchema = z.object({
  code: z
    .string()
    .trim()
    .transform((val) => val.toUpperCase())
    .pipe(
      z.string().regex(TICKET_CODE_REGEX, {
        message: "Invalid ticket code format. Code must be 6 characters from the ticket code alphabet.",
      })
    ),
});

export type CheckInBodyInput = z.infer<typeof checkInBodySchema>;
export type CheckInParamInput = z.infer<typeof checkInParamSchema>;
