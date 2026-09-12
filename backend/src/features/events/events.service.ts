import {
  ConflictError,
  EmailNotVerifiedError,
  ForbiddenError,
  NotFoundError,
} from "#shared/utils/errors.js";
import { findUserById } from "#features/auth/index.js";
import {
  createEventWithTiers,
  createTier,
  deleteTier,
  findActiveEventById,
  findOwnedEvent,
  findOwnedTier,
  listActiveEvents,
  softDeleteEvent,
  updateEvent,
  updateTier,
} from "./events.repository.js";
import type { Event, TicketTier } from "./events.repository.js";
import type {
  CreateEventInput,
  CreateTierInput,
  ListEventsQuery,
  UpdateEventInput,
  UpdateTierInput,
} from "./events.schemas.js";

export interface EventDetails {
  event: Event;
  tiers: TicketTier[];
}

export interface EventListResult {
  items: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listEvents(input: ListEventsQuery): Promise<EventListResult> {
  const result = await listActiveEvents({
    limit: input.limit,
    offset: (input.page - 1) * input.limit,
  });

  return {
    items: result.items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / input.limit),
    },
  };
}

export async function getEvent(eventId: string): Promise<EventDetails> {
  const result = await findActiveEventById(eventId);
  if (!result) {
    throw new NotFoundError("Event not found");
  }

  return result;
}

export async function createEvent(
  userId: string,
  input: CreateEventInput
): Promise<{ event: Event; tiers: TicketTier[] }> {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  if (!user.isEmailVerified) {
    throw new EmailNotVerifiedError("Verify your email before creating an event");
  }

  try {
    return await createEventWithTiers({
      organizerId: user.id,
      title: input.title,
      description: input.description,
      bannerImageUrl: input.bannerImageUrl ?? null,
      venue: input.venue,
      startsAt: new Date(input.startsAt),
      tiers: input.tiers,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("A ticket tier name must be unique within an event");
    }
    throw error;
  }
}

export async function editEvent(
  userId: string,
  eventId: string,
  input: UpdateEventInput
): Promise<Event> {
  await requireOwnedEvent(userId, eventId);

  const updateInput: Parameters<typeof updateEvent>[1] = {};
  if (input.title !== undefined) updateInput.title = input.title;
  if (input.description !== undefined) updateInput.description = input.description;
  if (input.bannerImageUrl !== undefined) updateInput.bannerImageUrl = input.bannerImageUrl;
  if (input.venue !== undefined) updateInput.venue = input.venue;
  if (input.startsAt !== undefined) updateInput.startsAt = new Date(input.startsAt);

  const event = await updateEvent(eventId, updateInput);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  return event;
}

export async function deleteEvent(userId: string, eventId: string): Promise<Event> {
  await requireOwnedEvent(userId, eventId);

  const event = await softDeleteEvent(eventId);
  if (!event) {
    throw new NotFoundError("Event not found");
  }

  return event;
}

export async function addTier(
  userId: string,
  eventId: string,
  input: CreateTierInput
): Promise<TicketTier> {
  await requireOwnedEvent(userId, eventId);

  try {
    return await createTier({ eventId, ...input });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("A ticket tier name must be unique within an event");
    }
    throw error;
  }
}

export async function editTier(
  userId: string,
  eventId: string,
  tierId: string,
  input: UpdateTierInput
): Promise<TicketTier> {
  const tier = await requireOwnedTier(userId, eventId, tierId);
  if (
    input.quantityAvailable !== undefined &&
    input.quantityAvailable < tier.quantityReserved + tier.quantitySold
  ) {
    throw new ConflictError("Quantity available cannot be below reserved or sold quantity");
  }

  try {
    const updateInput: Parameters<typeof updateTier>[1] = {};
    if (input.name !== undefined) updateInput.name = input.name;
    if (input.price !== undefined) updateInput.price = input.price;
    if (input.quantityAvailable !== undefined) {
      updateInput.quantityAvailable = input.quantityAvailable;
    }

    const updatedTier = await updateTier(tierId, updateInput);
    if (!updatedTier) {
      throw new NotFoundError("Ticket tier not found");
    }
    return updatedTier;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("A ticket tier name must be unique within an event");
    }
    throw error;
  }
}

export async function removeTier(
  userId: string,
  eventId: string,
  tierId: string
): Promise<TicketTier> {
  const tier = await requireOwnedTier(userId, eventId, tierId);
  if (tier.quantityReserved > 0 || tier.quantitySold > 0) {
    throw new ConflictError("A tier with reservations or sold tickets cannot be deleted");
  }

  const deletedTier = await deleteTier(tierId);
  if (!deletedTier) {
    throw new NotFoundError("Ticket tier not found");
  }

  return deletedTier;
}

async function requireOwnedEvent(userId: string, eventId: string): Promise<Event> {
  const event = await findOwnedEvent(eventId, userId);
  if (event) {
    return event;
  }

  const user = await findUserById(userId);
  if (!user?.isOrganizer) {
    throw new ForbiddenError("Organizer access required");
  }

  throw new NotFoundError("Event not found");
}

async function requireOwnedTier(
  userId: string,
  eventId: string,
  tierId: string
): Promise<TicketTier> {
  await requireOwnedEvent(userId, eventId);
  const tier = await findOwnedTier(eventId, tierId, userId);
  if (!tier) {
    throw new NotFoundError("Ticket tier not found");
  }

  return tier;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "23505"
  );
}