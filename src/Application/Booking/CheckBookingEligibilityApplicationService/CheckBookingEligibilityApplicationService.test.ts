import { CheckBookingEligibilityApplicationService } from './CheckBookingEligibilityApplicationService';
import { BookingSlotAvailabilityDomainService } from 'Domain/services/Booking/BookingSlotAvailabilityDomainService/BookingSlotAvailabilityDomainService';
import { IBookingCalendarEventQuery, BookingCalendarEventTimeRange } from 'Application/Booking/IBookingCalendarEventQuery';
import { DateTime } from 'Domain/models/shared/DateTime/DateTime';

class FakeCalendarEventQuery implements IBookingCalendarEventQuery {
  constructor(
    private readonly dayCount: number,
    private readonly ranges: BookingCalendarEventTimeRange[] = [],
  ) {}

  async listActiveEventTimeRanges(params: { timeMin: DateTime; timeMax: DateTime }): Promise<BookingCalendarEventTimeRange[]> {
    void params;
    return this.ranges;
  }

  async countActiveEventsOverlappingBusinessHoursByJstDay(params: { jstDayKey: string }): Promise<number> {
    void params;
    return this.dayCount;
  }
}

class FakeAvailabilityDomainService extends BookingSlotAvailabilityDomainService {
  constructor(private readonly duplicated: boolean) {
    super();
  }

  override async execute(): Promise<boolean> {
    return this.duplicated;
  }
}

describe('CheckBookingEligibilityApplicationService', () => {
  it('ビジネスルールにより予約不可（営業時間外）', async () => {
    const svc = new CheckBookingEligibilityApplicationService(
      new FakeCalendarEventQuery(0),
      new FakeAvailabilityDomainService(false),
    );

    const result = await svc.execute({
      startAt: '2026-01-18T09:00:00.000+09:00',
      durationMinutes: 60,
    });

    expect(result.bookable).toBe(false);
    expect(result.reasons.length).toBe(1);
  });

  it('重複により予約不可', async () => {
    const svc = new CheckBookingEligibilityApplicationService(
      new FakeCalendarEventQuery(1),
      new FakeAvailabilityDomainService(true),
    );

    const result = await svc.execute({
      startAt: '2026-01-18T14:00:00.000+09:00',
      durationMinutes: 60,
    });

    expect(result.bookable).toBe(false);
    expect(result.reasons).toEqual(['指定の枠は既に埋まっているか、予約間バッファを確保できません']);
  });

  it('ルールOKかつ重複なしなら予約可能', async () => {
    const svc = new CheckBookingEligibilityApplicationService(
      new FakeCalendarEventQuery(1),
      new FakeAvailabilityDomainService(false),
    );

    const result = await svc.execute({
      startAt: '2026-01-18T11:00:00.000+09:00',
      durationMinutes: 60,
    });

    expect(result.bookable).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});
