import { CarId } from 'Domain/models/Booking/CarId/CarId';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';

export interface IBookingCalendarEventRepository {
  createProvisionalEvent(params: {
    carId: CarId;
    timeRange: TimeRange;
    title: string;
    description?: string;
  }): Promise<{ eventId: string }>;
}
