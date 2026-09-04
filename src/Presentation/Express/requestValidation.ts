import { CreateProvisionalBookingCommand } from '../../Application/Booking/CreateProvisionalBookingApplicationService/CreateProvisionalBookingApplicationService';
import { GetPriceListQuery } from '../../Application/Pricing/GetPriceListApplicationService/GetPriceListApplicationService';
import { DateTime } from '../../Domain/models/shared/DateTime/DateTime';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export type NearestAvailableSlotsQuery = {
  from?: string;
  durationHours: number;
  limit?: number;
  searchDays?: number;
};

export type CheckAvailabilityQuery = {
  startAt: string;
  durationHours: number;
};

/** クエリ文字列で true とみなす表記（大文字小文字は無視） */
const TRUTHY_FLAG_VALUES = ['true', '1', 'yes', 'on'];
/** クエリ文字列で false とみなす表記（大文字小文字は無視） */
const FALSY_FLAG_VALUES = ['false', '0', 'no', 'off'];

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
  const menuId = typeof b.menuId === 'string' ? b.menuId.trim() : '';
  const startAt = typeof b.startAt === 'string' ? b.startAt.trim() : '';
  const durationHours = typeof b.durationHours === 'number' ? b.durationHours : NaN;
  const customerName = typeof b.customerName === 'string' ? b.customerName.trim() : '';
  const phoneNumber = typeof b.phoneNumber === 'string' ? b.phoneNumber.trim() : '';

  if (!carId) return { ok: false, message: 'carId is required' };
  if (!menuId) return { ok: false, message: 'menuId is required' };
  if (!startAt) return { ok: false, message: 'startAt is required' };
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    return { ok: false, message: 'durationHours must be a positive number' };
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
      menuId,
      startAt: normalizedStartAt.value,
      durationHours,
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
  const durationHoursRaw = q.durationHours;
  const limitRaw = q.limit;
  const searchDaysRaw = q.searchDays;

  const durationHours =
    typeof durationHoursRaw === 'string'
      ? Number(durationHoursRaw)
      : typeof durationHoursRaw === 'number'
        ? durationHoursRaw
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

  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    return { ok: false, message: 'durationHours must be a positive number' };
  }
  if (!Number.isInteger(durationHours) || durationHours < 1) {
    return { ok: false, message: 'durationHours must be an integer (>=1)' };
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
      durationHours,
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
  const durationHoursRaw = q.durationHours;

  const durationHours =
    typeof durationHoursRaw === 'string'
      ? Number(durationHoursRaw)
      : typeof durationHoursRaw === 'number'
        ? durationHoursRaw
        : NaN;

  if (!startAtRaw) {
    return { ok: false, message: 'startAt is required' };
  }

  const normalizedStartAt = normalizeIsoToCanonicalJst(startAtRaw);
  if (!normalizedStartAt.ok) {
    return { ok: false, message: 'startAt must be a valid ISO datetime string' };
  }

  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    return { ok: false, message: 'durationHours must be a positive number' };
  }
  if (!Number.isInteger(durationHours) || durationHours < 1) {
    return { ok: false, message: 'durationHours must be an integer (>=1)' };
  }

  return {
    ok: true,
    value: {
      startAt: normalizedStartAt.value,
      durationHours,
    },
  };
}

/**
 * クエリ文字列の真偽値フラグを解釈する。
 *
 * 呼び出し元はGPT等のHTTPクライアントで、boolean のシリアライズが揺れる
 * （"True"（Python流）・"1"・同名パラメータの重複で配列になる 等）。
 * 未知の表記を黙って false に倒すと「フラグを付けたのに効かない」状態になり、
 * 呼び出し側からは付け忘れと区別できないため、
 * - 一般的な真偽値表記は受け付ける
 * - 解釈できない値は明示的にバリデーションエラーにする
 */
function parseBooleanFlag(raw: unknown): ValidationResult<boolean> {
  // 未指定
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, value: false };
  }

  if (typeof raw === 'boolean') {
    return { ok: true, value: raw };
  }

  // 同名パラメータが複数回付いた場合は配列になる（値が揃っていれば受け付ける）
  if (Array.isArray(raw)) {
    const parsed = raw.map((v) => parseBooleanFlag(v));
    const invalid = parsed.find((r) => !r.ok);
    if (invalid && !invalid.ok) return invalid;
    const values = parsed.map((r) => (r.ok ? r.value : false));
    if (values.some((v) => v !== values[0])) {
      return { ok: false, message: 'has conflicting values' };
    }
    return { ok: true, value: values[0] ?? false };
  }

  if (typeof raw !== 'string') {
    return { ok: false, message: 'must be true or false' };
  }

  const normalized = raw.trim().toLowerCase();
  if (TRUTHY_FLAG_VALUES.includes(normalized)) return { ok: true, value: true };
  if (FALSY_FLAG_VALUES.includes(normalized)) return { ok: true, value: false };

  return { ok: false, message: 'must be true or false' };
}

export function validateGetPriceListQuery(query: unknown): ValidationResult<GetPriceListQuery> {
  if (!query || typeof query !== 'object') {
    return { ok: false, message: 'Invalid query' };
  }

  const q = query as Record<string, unknown>;

  const carId = typeof q.carId === 'string' ? q.carId.trim() : undefined;
  const menuId = typeof q.menuId === 'string' ? q.menuId.trim() : undefined;

  // carId が空文字列の場合は undefined として扱う
  const validCarId = carId && carId.length > 0 ? carId : undefined;
  const validMenuId = menuId && menuId.length > 0 ? menuId : undefined;

  const exact = parseBooleanFlag(q.exact);
  if (!exact.ok) {
    return { ok: false, message: `exact ${exact.message}` };
  }

  return {
    ok: true,
    value: {
      carId: validCarId,
      menuId: validMenuId,
      exact: exact.value,
    },
  };
}
