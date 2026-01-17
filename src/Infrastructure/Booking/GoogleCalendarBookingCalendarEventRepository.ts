import { IBookingCalendarEventRepository } from 'Application/Booking/IBookingCalendarEventRepository';
import { IGoogleCalendarClient } from 'Infrastructure/GoogleCalendar/IGoogleCalendarClient';
import { CarId } from 'Domain/models/Booking/CarId/CarId';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';

export class GoogleCalendarBookingCalendarEventRepository implements IBookingCalendarEventRepository {
  constructor(
    private readonly client: IGoogleCalendarClient,
    private readonly calendarId: string,
  ) {}

  async createProvisionalEvent(params: {
    carId: CarId;
    timeRange: TimeRange;
    title: string;
    description?: string;
  }): Promise<{ eventId: string }> {
    // DateTime は canonical を保持しているのでそのまま使える
    const startIso = params.timeRange.startAt.value;
    const endIso = params.timeRange.endAt.value;

    const description = [params.description, `carId: ${params.carId.value}`]
      .filter(Boolean)
      .join('\n');

    return this.client.insertEvent({
      calendarId: this.calendarId,
      event: {
        summary: params.title,
        description,
        start: { dateTime: startIso },
        end: { dateTime: endIso },
      },
    });
  }
}
