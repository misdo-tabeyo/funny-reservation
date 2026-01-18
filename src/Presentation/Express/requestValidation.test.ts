import { validateCreateProvisionalBookingCommand } from './requestValidation';

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
