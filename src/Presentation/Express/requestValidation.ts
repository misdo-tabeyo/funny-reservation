import { CreateProvisionalBookingCommand } from '../../Application/Booking/CreateProvisionalBookingApplicationService/CreateProvisionalBookingApplicationService';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

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
