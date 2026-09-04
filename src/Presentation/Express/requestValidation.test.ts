import {
  validateCheckAvailabilityQuery,
  validateCreateProvisionalBookingCommand,
  validateGetPriceListQuery,
  validateNearestAvailableSlotsQuery,
} from './requestValidation';

describe('validateCreateProvisionalBookingCommand', () => {
  it('必須項目が揃っていれば ok=true', () => {
    const result = validateCreateProvisionalBookingCommand({
      carId: 'プリウス',
      menuId: 'front-set',
      startAt: '2024-01-01T09:00:00.000+09:00',
      durationHours: 1,
      customerName: '山田太郎',
      phoneNumber: '090-1234-5678',
      channel: 'LINE',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.carId).toBe('プリウス');
    expect(result.value.menuId).toBe('front-set');
    expect(result.value.customerName).toBe('山田太郎');
    expect(result.value.phoneNumber).toBe('090-1234-5678');
  });

  it('startAt が +09:00 なら canonical(+09:00) に正規化される', () => {
    const result = validateCreateProvisionalBookingCommand({
      carId: 'プリウス',
      menuId: 'front-set',
      startAt: '2024-01-01T09:00:00.000+09:00',
      durationHours: 1,
      customerName: '山田太郎',
      phoneNumber: '090-1234-5678',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.startAt).toBe('2024-01-01T09:00:00.000+09:00');
  });

  it('customerName が空なら ok=false', () => {
    const result = validateCreateProvisionalBookingCommand({
      carId: 'プリウス',
      menuId: 'front-set',
      startAt: '2024-01-01T09:00:00.000+09:00',
      durationHours: 1,
      customerName: '   ',
      phoneNumber: '090-1234-5678',
    });

    expect(result).toEqual({ ok: false, message: 'customerName is required' });
  });

  it('phoneNumber が無いなら ok=false', () => {
    const result = validateCreateProvisionalBookingCommand({
      carId: 'プリウス',
      menuId: 'front-set',
      startAt: '2024-01-01T09:00:00.000+09:00',
      durationHours: 1,
      customerName: '山田太郎',
    });

    expect(result).toEqual({ ok: false, message: 'phoneNumber is required' });
  });
});

describe('validateNearestAvailableSlotsQuery', () => {
  it('必須項目が揃っていれば ok=true', () => {
    const result = validateNearestAvailableSlotsQuery({
      from: '2026-01-18T10:00:00.000+09:00',
      durationHours: '1',
      limit: '5',
      searchDays: '30',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
        from: '2026-01-18T10:00:00.000+09:00',
      durationHours: 1,
      limit: 5,
      searchDays: 30,
    });
  });

  it('from が秒/ミリ秒省略でも canonical(+09:00) に正規化される', () => {
    const result = validateNearestAvailableSlotsQuery({
      from: '2026-01-18T10:00+09:00',
      durationHours: '1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.from).toBe('2026-01-18T10:00:00.000+09:00');
  });

  it('from が不正なら ok=false', () => {
    const result = validateNearestAvailableSlotsQuery({
      from: 'not-a-date',
      durationHours: '1',
    });

    expect(result).toEqual({
      ok: false,
      message: 'from must be a valid ISO datetime string',
    });
  });

  it('durationHours が整数でなければ ok=false', () => {
    const result = validateNearestAvailableSlotsQuery({
      durationHours: '1.5',
    });

    expect(result).toEqual({
      ok: false,
      message: 'durationHours must be an integer (>=1)',
    });
  });
});

describe('validateCheckAvailabilityQuery', () => {
  it('必須項目が揃っていれば ok=true（startAtはcanonicalに正規化）', () => {
    const result = validateCheckAvailabilityQuery({
        startAt: '2024-01-01T09:00:00.000+09:00',
      durationHours: '1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
        startAt: '2024-01-01T09:00:00.000+09:00',
      durationHours: 1,
    });
  });

  it('startAt が不正なら ok=false', () => {
    const result = validateCheckAvailabilityQuery({
      startAt: 'not-a-date',
      durationHours: '1',
    });

    expect(result).toEqual({
      ok: false,
      message: 'startAt must be a valid ISO datetime string',
    });
  });

  it('durationHours が整数でなければ ok=false', () => {
    const result = validateCheckAvailabilityQuery({
        startAt: '2024-01-01T00:00:00.000+09:00',
      durationHours: '1.5',
    });

    expect(result).toEqual({
      ok: false,
      message: 'durationHours must be an integer (>=1)',
    });
  });
});

describe('validateGetPriceListQuery', () => {
  it('carId / menuId を trim して返し、exact 未指定は false', () => {
    const result = validateGetPriceListQuery({ carId: ' アテンザ ', menuId: 'rear-set' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.carId).toBe('アテンザ');
    expect(result.value.menuId).toBe('rear-set');
    expect(result.value.exact).toBe(false);
  });

  it('空文字の carId / menuId は未指定として扱う', () => {
    const result = validateGetPriceListQuery({ carId: '  ', menuId: '' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.carId).toBeUndefined();
    expect(result.value.menuId).toBeUndefined();
  });

  // GPT等のクライアントは boolean のシリアライズが揺れるため、
  // 一般的な真偽値表記はすべて同じ意味に解釈する
  it.each(['true', 'True', 'TRUE', ' true ', '1', 'yes', 'on', true, ['true', 'true']])(
    'exact=%p を true として解釈する',
    (exact) => {
      const result = validateGetPriceListQuery({ carId: 'アテンザ', exact });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.exact).toBe(true);
    },
  );

  it.each(['false', 'False', '0', 'no', 'off', '', false, undefined])(
    'exact=%p を false として解釈する',
    (exact) => {
      const result = validateGetPriceListQuery({ carId: 'アテンザ', exact });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.exact).toBe(false);
    },
  );

  // 黙って false に倒すと、呼び出し側からは「付け忘れ」と区別できず
  // 同じ曖昧エラーを繰り返すことになるため、明示的にエラーにする
  it.each(['maybe', '2', 'ture', 123, ['true', 'false']])(
    'exact=%p は解釈できないのでエラーにする',
    (exact) => {
      const result = validateGetPriceListQuery({ carId: 'アテンザ', exact });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.message).toContain('exact');
    },
  );

  it('クエリがオブジェクトでなければエラー', () => {
    expect(validateGetPriceListQuery(null).ok).toBe(false);
    expect(validateGetPriceListQuery('carId=アテンザ').ok).toBe(false);
  });
});
