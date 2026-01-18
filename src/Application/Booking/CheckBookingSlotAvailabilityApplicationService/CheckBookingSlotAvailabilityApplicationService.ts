import { TimeRange } from '../../../Domain/models/Booking/TimeRange/TimeRange';
import { Duration } from '../../../Domain/models/Booking/TimeRange/Duration/Duration';
import { DateTime } from '../../../Domain/models/shared/DateTime/DateTime';
import {
  IBookingSlotAvailabilityQuery,
} from '../../../Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService';

export type CheckBookingSlotAvailabilityQuery = {
  startAt: string; // ISO文字列想定
  durationMinutes: number;
};

export type CheckBookingSlotAvailabilityResult = {
  available: boolean;
};

export class CheckBookingSlotAvailabilityApplicationService {
  constructor(private readonly availabilityQuery: IBookingSlotAvailabilityQuery) {}

  async execute(query: CheckBookingSlotAvailabilityQuery): Promise<CheckBookingSlotAvailabilityResult> {
    if (!query.startAt) throw new Error('startAt is required');
    if (!Number.isFinite(query.durationMinutes) || query.durationMinutes <= 0) {
      throw new Error('durationMinutes must be a positive number');
    }

    const timeRange = new TimeRange(
      new DateTime(query.startAt),
      new Duration(query.durationMinutes),
    );

    const exists = await this.availabilityQuery.existsOverlappingSlot({ timeRange });

    return { available: !exists };
  }
}
