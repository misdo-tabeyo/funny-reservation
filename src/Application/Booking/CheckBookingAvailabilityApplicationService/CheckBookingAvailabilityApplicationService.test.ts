import { CheckBookingAvailabilityApplicationService } from 'Application/Booking/CheckBookingAvailabilityApplicationService/CheckBookingAvailabilityApplicationService';
import { IBookingCalendarEventQuery } from 'Application/Booking/IBookingCalendarEventQuery';
import { BookingSlotAvailabilityDomainService } from 'Domain/services/Booking/BookingSlotAvailabilityDomainService/BookingSlotAvailabilityDomainService';

class FakeCalendarEventQuery implements IBookingCalendarEventQuery {
  async listActiveEventTimeRanges(): Promise<Array<{ start: number; end: number }>> {
    return [];
  }

  constructor(private readonly existingBookingsCount: number) {}

  async countActiveEventsOverlappingBusinessHoursByJstDay(): Promise<number> {
    return this.existingBookingsCount;
  }
}

class FakeAvailabilityDomainService extends BookingSlotAvailabilityDomainService {
  constructor(private readonly unavailable: boolean) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  override async execute(): Promise<boolean> {
    return this.unavailable;
  }
}

describe('CheckBookingAvailabilityApplicationService', () => {
  it('予約可能なら bookable=true', async () => {
    const svc = new CheckBookingAvailabilityApplicationService(
      new FakeCalendarEventQuery(0),
      new FakeAvailabilityDomainService(false),
    );

    const result = await svc.execute({
      startAt: '2026-01-18T10:00:00.000+09:00',
      durationMinutes: 60,
    });

    expect(result.bookable).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('重複があれば bookable=false', async () => {
    const svc = new CheckBookingAvailabilityApplicationService(
      new FakeCalendarEventQuery(0),
      new FakeAvailabilityDomainService(true),
    );

    const result = await svc.execute({
      startAt: '2026-01-18T10:00:00.000+09:00',
      durationMinutes: 60,
    });

    expect(result.bookable).toBe(false);
    expect(result.reasons).toEqual(['指定の枠は既に埋まっているか、予約間バッファを確保できません']);
  });
});
