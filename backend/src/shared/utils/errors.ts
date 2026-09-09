/** Base class for every application error. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: unknown[]
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** 422 — request body / query params failed Zod validation. */
export class ValidationError extends AppError {
  constructor(message = "Validation failed", errors?: unknown[]) {
    super(422, message, errors);
  }
}

/** 401 — missing / invalid / expired token, or wrong password. */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

/** 403 — valid token, but the action is not permitted. */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

/**
 * 403 — user has not verified their email and is attempting a gated action
 * (buying a ticket or creating an event). Front-end should treat this as
 * actionable ("verify your email to continue"), not as a generic failure.
 */
export class EmailNotVerifiedError extends AppError {
  constructor(message = "Email address not verified") {
    super(403, message);
  }
}

/** 404 — resource not found (or not owned by the requester). */
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

/** 409 — duplicate resource (e.g. email already registered). */
export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message);
  }
}
