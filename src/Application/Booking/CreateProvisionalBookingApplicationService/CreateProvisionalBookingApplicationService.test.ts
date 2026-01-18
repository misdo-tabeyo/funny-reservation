import { CreateProvisionalBookingApplicationService } from 'Application/Booking/CreateProvisionalBookingApplicationService/CreateProvisionalBookingApplicationService';
import { BookingSlotDuplicationCheckDomainService } from 'Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService';
import { CheckBookingEligibilityApplicationService } from 'Application/Booking/CheckBookingEligibilityApplicationService/CheckBookingEligibilityApplicationService';
import { IBookingCalendarEventRepository } from 'Application/Booking/IBookingCalendarEventRepository';
import { IBookingSlotAvailabilityQuery } from 'Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService';
import { IBookingCalendarEventQuery } from 'Application/Booking/IBookingCalendarEventQuery';

class FakeCalendarEventRepository implements IBookingCalendarEventRepository {
  // eslint-disable-next-line @typescript-eslint/require-await
  async createProvisionalEvent(): Promise<{ eventId: string }> {
    return { eventId: 'event-1' };
  }
}

class FakeAvailabilityQuery implements IBookingSlotAvailabilityQuery {
  constructor(private readonly duplicated: boolean) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async existsOverlappingSlot(): Promise<boolean> {
    return this.duplicated;
  }
}

class FakeCalendarEventQuery implements IBookingCalendarEventQuery {
  // eslint-disable-next-line @typescript-eslint/require-await
  async listActiveEventTimeRanges(): Promise<Array<{ start: number; end: number }>> {
    return [];
  }

  constructor(private readonly existingBookingsCount: number) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async countActiveEventsOverlappingBusinessHoursByUtcDay(): Promise<number> {
    return this.existingBookingsCount;
  }
}

describe('CreateProvisionalBookingApplicationService', () => {
  it('eligibilityがNGならエラー', async () => {
    const duplicationCheck = new BookingSlotDuplicationCheckDomainService(new FakeAvailabilityQuery(false));
    const eligibility = new CheckBookingEligibilityApplicationService(
      new FakeCalendarEventQuery(0),
      // duplicationCheckと同じものを渡す（重複はfalseなのでルールNGだけを作る）
      duplicationCheck,
    );

    const svc = new CreateProvisionalBookingApplicationService(
      duplicationCheck,
      new FakeCalendarEventRepository(),
      eligibility,
    );

    // 営業時間外
    await expect(
      svc.execute({
        carId: 'car-0000001',
        startAt: '2026-01-18T09:00:00.000Z',
        durationMinutes: 60,
        customerName: '山田太郎',
        phoneNumber: '090-1234-5678',
      }),
    ).rejects.toThrow('営業時間外です（開始が10:00より前）');
  });

  it('eligibilityがOKなら仮予約を作成できる', async () => {
    const duplicationCheck = new BookingSlotDuplicationCheckDomainService(new FakeAvailabilityQuery(false));
    const eligibility = new CheckBookingEligibilityApplicationService(
      new FakeCalendarEventQuery(0),
      duplicationCheck,
    );

    const svc = new CreateProvisionalBookingApplicationService(
      duplicationCheck,
      new FakeCalendarEventRepository(),
      eligibility,
    );

    const dto = await svc.execute({
      carId: 'car-0000001',
      startAt: '2026-01-18T10:00:00.000Z',
      durationMinutes: 60,
      customerName: '山田太郎',
      phoneNumber: '090-1234-5678',
    });

    expect(dto.toJSON()).toEqual({
      carId: 'car-0000001',
      startAt: '2026-01-18T10:00:00.000Z',
      durationMinutes: 60,
      calendarEventId: 'event-1',
    });
  });
});
