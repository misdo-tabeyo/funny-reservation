import { CreateProvisionalBookingCommand } from '../../Application/Booking/CreateProvisionalBookingApplicationService/CreateProvisionalBookingApplicationService';
import { DateTime } from '../../Domain/models/shared/DateTime/DateTime';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export type NearestAvailableSlotsQuery = {
  from?: string;
  durationMinutes: number;
  limit?: number;
  searchDays?: number;
};

export type CheckAvailabilityQuery = {
  startAt: string;
  durationMinutes: number;
};

/**
 * API入力の日時は JST(+09:00) 前提で扱う。
 * - 入力: +09:00 必須（Z/UTCは許容しない）
 * - 許容例: 2026-01-18T10:00+09:00 / 2026-01-18T10:00:00+09:00 / 2026-01-18T10:00:00.000+09:00
 * - 返す値: YYYY-MM-DDTHH:mm:ss.SSS+09:00（ミリ秒あり、+09:00固定）
 */
function normalizeIsoToCanonicalJst(raw: string): ValidationResult<string> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: 'Invalid datetime' };

  // +09:00 必須（OpenAPIと一致）
  if (!/[+]09:00$/.test(trimmed)) {
    return { ok: false, message: 'Datetime must include +09:00 offset' };
  }

  // 秒/ミリ秒の省略を許容しつつ、canonical に正規化
  // 1) Date.parse で絶対時刻へ
  const ts = Date.parse(trimmed);
  if (Number.isNaN(ts)) {
    return { ok: false, message: 'Invalid datetime' };
  }

  // 2) Domainの DateTime に寄せて canonical JST(+09:00) を生成
  try {
    return { ok: true, value: DateTime.fromTimestamp(ts).value };
  } catch {
    return { ok: false, message: 'Invalid datetime' };
  }
}

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

  const normalizedStartAt = normalizeIsoToCanonicalJst(startAt);
  if (!normalizedStartAt.ok) {
    return { ok: false, message: 'startAt must be a valid ISO datetime string' };
  }

  return {
    ok: true,
    value: {
      ...b,
      carId,
      startAt: normalizedStartAt.value,
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

  const normalizedFrom =
    from !== undefined
      ? normalizeIsoToCanonicalJst(from)
      : ({ ok: true, value: undefined } as const);
  if (!normalizedFrom.ok) {
    return { ok: false, message: 'from must be a valid ISO datetime string' };
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
      from: normalizedFrom.value,
      durationMinutes,
      limit,
      searchDays,
    },
  };
}

export function validateCheckAvailabilityQuery(query: unknown): ValidationResult<CheckAvailabilityQuery> {
  if (!query || typeof query !== 'object') {
    return { ok: false, message: 'Invalid query' };
  }

  const q = query as Record<string, unknown>;

  const startAtRaw = typeof q.startAt === 'string' ? q.startAt.trim() : '';
  const durationMinutesRaw = q.durationMinutes;

  const durationMinutes =
    typeof durationMinutesRaw === 'string'
      ? Number(durationMinutesRaw)
      : typeof durationMinutesRaw === 'number'
        ? durationMinutesRaw
        : NaN;

  if (!startAtRaw) {
    return { ok: false, message: 'startAt is required' };
  }

  const normalizedStartAt = normalizeIsoToCanonicalJst(startAtRaw);
  if (!normalizedStartAt.ok) {
    return { ok: false, message: 'startAt must be a valid ISO datetime string' };
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, message: 'durationMinutes must be a positive number' };
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 60 || durationMinutes % 60 !== 0) {
    return { ok: false, message: 'durationMinutes must be an integer (>=60, multiple of 60)' };
  }

  return {
    ok: true,
    value: {
      startAt: normalizedStartAt.value,
      durationMinutes,
    },
  };
}
