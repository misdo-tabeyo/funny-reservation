import { BookingSlotAvailabilityDomainService } from 'Domain/services/Booking/BookingSlotAvailabilityDomainService/BookingSlotAvailabilityDomainService';
import { IBookingCalendarEventQuery } from 'Application/Booking/IBookingCalendarEventQuery';
import {
  BookingEligibilityResult,
  CheckBookingEligibilityApplicationService,
} from 'Application/Booking/CheckBookingEligibilityApplicationService/CheckBookingEligibilityApplicationService';

export type CheckBookingAvailabilityQuery = {
  startAt: string; // canonical ISO (Z + ms)
  durationMinutes: number;
};

export type CheckBookingAvailabilityResult = BookingEligibilityResult;

/**
 * 互換性は捨てて「availability」も bookable/reasons を返す。
 * - 予約不可の場合、Presentation層で 409 を返す前提
 */
export class CheckBookingAvailabilityApplicationService {
  private readonly eligibilityService: CheckBookingEligibilityApplicationService;

  constructor(
    calendarEventQuery: IBookingCalendarEventQuery,
    availabilityDomainService: BookingSlotAvailabilityDomainService,
  ) {
    this.eligibilityService = new CheckBookingEligibilityApplicationService(
      calendarEventQuery,
      availabilityDomainService,
    );
  }

  async execute(query: CheckBookingAvailabilityQuery): Promise<CheckBookingAvailabilityResult> {
    return this.eligibilityService.execute(query);
  }
}
