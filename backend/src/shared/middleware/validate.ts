import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "#shared/utils/errors.js";

interface ValidationSchemas {
  body?: ZodType<unknown>;
  params?: ZodType<unknown>;
  query?: ZodType<unknown>;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: unknown[] = [];

    const entries = Object.entries(schemas) as Array<
      [keyof ValidationSchemas, ZodType<unknown> | undefined]
    >;

    for (const [source, schema] of entries) {
      if (!schema) {
        continue;
      }

      const input: unknown =
        source === "body" ? req.body : source === "params" ? req.params : req.query;
      const result = schema.safeParse(input);
      if (result.success) {
        if (source === "query") {
          Object.defineProperty(req, source, {
            configurable: true,
            enumerable: true,
            value: result.data,
          });
        } else {
          (req as unknown as Record<string, unknown>)[source] = result.data;
        }
      } else {
        errors.push(...result.error.issues);
      }
    }

    if (errors.length > 0) {
      next(new ValidationError("Validation failed", errors));
      return;
    }

    next();
  };
}
