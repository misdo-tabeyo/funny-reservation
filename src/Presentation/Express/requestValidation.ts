import { CreateProvisionalBookingCommand } from '../../Application/Booking/CreateProvisionalBookingApplicationService/CreateProvisionalBookingApplicationService';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export type NearestAvailableSlotsQuery = {
  from?: string;
  durationMinutes: number;
  limit?: number;
  searchDays?: number;
};

const CANONICAL_ISO_Z_WITH_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function validateCreateProvisionalBookingCommand(
  body: unknown,
): ValidationResult<CreateProvisionalBookingCommand> {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid request body' };
  }

  const b = body as Partial<CreateProvisionalBookingCommand>;

  const carId = typeof b.carId === 'string' ? b.carId.trim() : '';
  const startAt = typeof b.startAt === 'string' ? b.startAt.trim() : '';
  const durationMinutes = typeof b.durationMinutes === 'number' ? b.durationMinutes : NaN;
  const customerName = typeof b.customerName === 'string' ? b.customerName.trim() : '';
  const phoneNumber = typeof b.phoneNumber === 'string' ? b.phoneNumber.trim() : '';

  if (!carId) return { ok: false, message: 'carId is required' };
  if (!startAt) return { ok: false, message: 'startAt is required' };
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, message: 'durationMinutes must be a positive number' };
  }
  if (!customerName) return { ok: false, message: 'customerName is required' };
  if (!phoneNumber) return { ok: false, message: 'phoneNumber is required' };

  return {
    ok: true,
    value: {
      ...b,
      carId,
      startAt,
      durationMinutes,
      customerName,
      phoneNumber,
    } as CreateProvisionalBookingCommand,
  };
}

export function validateNearestAvailableSlotsQuery(
  query: unknown,
): ValidationResult<NearestAvailableSlotsQuery> {
  if (!query || typeof query !== 'object') {
    return { ok: false, message: 'Invalid query' };
  }

  const q = query as Record<string, unknown>;

  const from = typeof q.from === 'string' ? q.from.trim() : undefined;
  const durationMinutesRaw = q.durationMinutes;
  const limitRaw = q.limit;
  const searchDaysRaw = q.searchDays;

  const durationMinutes =
    typeof durationMinutesRaw === 'string'
      ? Number(durationMinutesRaw)
      : typeof durationMinutesRaw === 'number'
        ? durationMinutesRaw
        : NaN;

  const limit =
    typeof limitRaw === 'string'
      ? Number(limitRaw)
      : typeof limitRaw === 'number'
        ? limitRaw
        : undefined;

  const searchDays =
    typeof searchDaysRaw === 'string'
      ? Number(searchDaysRaw)
      : typeof searchDaysRaw === 'number'
        ? searchDaysRaw
        : undefined;

  if (from && !CANONICAL_ISO_Z_WITH_MS.test(from)) {
    return { ok: false, message: 'from must be an ISO string like 2026-01-18T00:00:00.000Z' };
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, message: 'durationMinutes must be a positive number' };
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 60 || durationMinutes % 60 !== 0) {
    return { ok: false, message: 'durationMinutes must be an integer (>=60, multiple of 60)' };
  }

  if (limit !== undefined) {
    if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit <= 0) {
      return { ok: false, message: 'limit must be a positive integer' };
    }
  }

  if (searchDays !== undefined) {
    if (!Number.isFinite(searchDays) || !Number.isInteger(searchDays) || searchDays <= 0) {
      return { ok: false, message: 'searchDays must be a positive integer' };
    }
  }

  return {
    ok: true,
    value: {
      from,
      durationMinutes,
      limit,
      searchDays,
    },
  };
}
