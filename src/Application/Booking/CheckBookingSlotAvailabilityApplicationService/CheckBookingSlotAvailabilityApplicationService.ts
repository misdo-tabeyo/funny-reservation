import { TimeRange } from '../../../Domain/models/Booking/TimeRange/TimeRange';
import { Duration } from '../../../Domain/models/Booking/TimeRange/Duration/Duration';
import { DateTime } from '../../../Domain/models/shared/DateTime/DateTime';
import {
  IBookingSlotAvailabilityQuery,
} from '../../../Domain/services/Booking/BookingSlotAvailabilityDomainService/BookingSlotAvailabilityDomainService';

export type CheckBookingSlotAvailabilityQuery = {
  startAt: string; // ISO文字列想定
  durationHours: number;
};

export type CheckBookingSlotAvailabilityResult = {
  available: boolean;
};

export class CheckBookingSlotAvailabilityApplicationService {
  constructor(private readonly availabilityQuery: IBookingSlotAvailabilityQuery) {}

  async execute(query: CheckBookingSlotAvailabilityQuery): Promise<CheckBookingSlotAvailabilityResult> {
    if (!query.startAt) throw new Error('startAt is required');
    if (!Number.isFinite(query.durationHours) || query.durationHours <= 0) {
      throw new Error('durationHours must be a positive number');
    }

    const timeRange = new TimeRange(
      new DateTime(query.startAt),
      new Duration(query.durationHours),
    );

    const exists = await this.availabilityQuery.existsUnavailableSlot({ timeRange, bufferMinutes: 60 });

    return { available: !exists };
  }
}
