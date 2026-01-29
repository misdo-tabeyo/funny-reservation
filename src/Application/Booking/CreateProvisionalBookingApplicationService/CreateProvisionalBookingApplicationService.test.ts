import { CreateProvisionalBookingApplicationService } from 'Application/Booking/CreateProvisionalBookingApplicationService/CreateProvisionalBookingApplicationService';
import { BookingSlotAvailabilityDomainService } from 'Domain/services/Booking/BookingSlotAvailabilityDomainService/BookingSlotAvailabilityDomainService';
import { CheckBookingEligibilityApplicationService } from 'Application/Booking/CheckBookingEligibilityApplicationService/CheckBookingEligibilityApplicationService';
import { IBookingCalendarEventRepository } from 'Application/Booking/IBookingCalendarEventRepository';
import { IBookingSlotAvailabilityQuery } from 'Domain/services/Booking/BookingSlotAvailabilityDomainService/BookingSlotAvailabilityDomainService';
import { IBookingCalendarEventQuery } from 'Application/Booking/IBookingCalendarEventQuery';
import { IPricingQuery, CarPricing } from 'Application/Pricing/IPricingQuery';

class FakeCalendarEventRepository implements IBookingCalendarEventRepository {
  // eslint-disable-next-line @typescript-eslint/require-await
  async createProvisionalEvent(): Promise<{ eventId: string }> {
    return { eventId: 'event-1' };
  }
}

class FakeAvailabilityQuery implements IBookingSlotAvailabilityQuery {
  constructor(private readonly duplicated: boolean) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async existsUnavailableSlot(params: { bufferMinutes: number }): Promise<boolean> {
    void params;
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
  async countActiveEventsOverlappingBusinessHoursByJstDay(): Promise<number> {
    return this.existingBookingsCount;
  }
}

class FakePricingQuery implements IPricingQuery {
  // eslint-disable-next-line @typescript-eslint/require-await
  async listManufacturers(): Promise<never[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listCarsByManufacturer(): Promise<never[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findCarPricing(): Promise<CarPricing> {
    return {
      carId: 'プリウス',
      carName: 'プリウス',
      carNameReading: 'ぷりうす',
      manufacturer: 'トヨタ',
      prices: [
        { menuId: 'front-set', menuName: 'フロントセット', amount: 50000 },
        { menuId: 'rear-set', menuName: 'リアセット', amount: 60000 },
      ],
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findPrice(): Promise<null> {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listAllCarPricings(): Promise<never[]> {
    return [];
  }
}

describe('CreateProvisionalBookingApplicationService', () => {
  it('eligibilityがNGならエラー', async () => {
    const availabilityDomainService = new BookingSlotAvailabilityDomainService(new FakeAvailabilityQuery(false));
    const eligibility = new CheckBookingEligibilityApplicationService(
      new FakeCalendarEventQuery(0),
      // duplicationCheckと同じものを渡す（重複はfalseなのでルールNGだけを作る）
      availabilityDomainService,
    );

    const svc = new CreateProvisionalBookingApplicationService(
      availabilityDomainService,
      new FakeCalendarEventRepository(),
      new FakePricingQuery(),
      eligibility,
    );

    // 営業時間外
    await expect(
      svc.execute({
        carId: 'プリウス',
        menuId: 'front-set',
        startAt: '2026-01-18T09:00:00.000+09:00',
        durationMinutes: 60,
        customerName: '山田太郎',
        phoneNumber: '090-1234-5678',
      }),
    ).rejects.toThrow('営業時間外です（開始が10:00より前）');
  });

  it('eligibilityがOKなら仮予約を作成できる', async () => {
    const availabilityDomainService = new BookingSlotAvailabilityDomainService(new FakeAvailabilityQuery(false));
    const eligibility = new CheckBookingEligibilityApplicationService(
      new FakeCalendarEventQuery(0),
      availabilityDomainService,
    );

    const svc = new CreateProvisionalBookingApplicationService(
      availabilityDomainService,
      new FakeCalendarEventRepository(),
      new FakePricingQuery(),
      eligibility,
    );

    const dto = await svc.execute({
      carId: 'プリウス',
      menuId: 'front-set',
      startAt: '2026-01-18T10:00:00.000+09:00',
      durationMinutes: 60,
      customerName: '山田太郎',
      phoneNumber: '090-1234-5678',
    });

    expect(dto.toJSON()).toEqual({
      carId: 'プリウス',
      startAt: '2026-01-18T10:00:00.000+09:00',
      durationMinutes: 60,
      calendarEventId: 'event-1',
    });
  });
});
