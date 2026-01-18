import {
  validateCreateProvisionalBookingCommand,
  validateNearestAvailableSlotsQuery,
} from './requestValidation';

describe('validateCreateProvisionalBookingCommand', () => {
  it('必須項目が揃っていれば ok=true', () => {
    const result = validateCreateProvisionalBookingCommand({
      carId: 'car-1',
      startAt: '2024-01-01T09:00:00.000Z',
      durationMinutes: 60,
      customerName: '山田太郎',
      phoneNumber: '090-1234-5678',
      carModelName: 'プリウス',
      menuLabel: 'リア5面',
      channel: 'LINE',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.customerName).toBe('山田太郎');
    expect(result.value.phoneNumber).toBe('090-1234-5678');
  });

  it('startAt が +09:00 でも canonical(Z+ms) に正規化される', () => {
    const result = validateCreateProvisionalBookingCommand({
      carId: 'car-1',
      startAt: '2024-01-01T09:00:00+09:00',
      durationMinutes: 60,
      customerName: '山田太郎',
      phoneNumber: '090-1234-5678',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.startAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('customerName が空なら ok=false', () => {
    const result = validateCreateProvisionalBookingCommand({
      carId: 'car-1',
      startAt: '2024-01-01T09:00:00.000Z',
      durationMinutes: 60,
      customerName: '   ',
      phoneNumber: '090-1234-5678',
    });

    expect(result).toEqual({ ok: false, message: 'customerName is required' });
  });

  it('phoneNumber が無いなら ok=false', () => {
    const result = validateCreateProvisionalBookingCommand({
      carId: 'car-1',
      startAt: '2024-01-01T09:00:00.000Z',
      durationMinutes: 60,
      customerName: '山田太郎',
    });

    expect(result).toEqual({ ok: false, message: 'phoneNumber is required' });
  });
});

describe('validateNearestAvailableSlotsQuery', () => {
  it('必須項目が揃っていれば ok=true', () => {
    const result = validateNearestAvailableSlotsQuery({
      from: '2026-01-18T00:00:00.000Z',
      durationMinutes: '60',
      limit: '5',
      searchDays: '30',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      from: '2026-01-18T00:00:00.000Z',
      durationMinutes: 60,
      limit: 5,
      searchDays: 30,
    });
  });

  it('from が秒/ミリ秒省略でも canonical(Z+ms) に正規化される', () => {
    const result = validateNearestAvailableSlotsQuery({
      from: '2026-01-18T00:00:00Z',
      durationMinutes: '60',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.from).toBe('2026-01-18T00:00:00.000Z');
  });

  it('from が不正なら ok=false', () => {
    const result = validateNearestAvailableSlotsQuery({
      from: 'not-a-date',
      durationMinutes: '60',
    });

    expect(result).toEqual({
      ok: false,
      message: 'from must be a valid ISO datetime string',
    });
  });

  it('durationMinutes が60の倍数でなければ ok=false', () => {
    const result = validateNearestAvailableSlotsQuery({
      durationMinutes: '90',
    });

    expect(result).toEqual({
      ok: false,
      message: 'durationMinutes must be an integer (>=60, multiple of 60)',
    });
  });
});
