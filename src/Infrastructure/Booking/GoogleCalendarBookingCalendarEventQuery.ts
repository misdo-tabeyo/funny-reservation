import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import {
  IBookingCalendarEventQuery,
  BookingCalendarEventTimeRange,
} from 'Application/Booking/IBookingCalendarEventQuery';
import { IGoogleCalendarClient } from 'Infrastructure/GoogleCalendar/IGoogleCalendarClient';
import { toGoogleCalendarEventTimestampRange } from './googleCalendarEventTimeRange';

export class GoogleCalendarBookingCalendarEventQuery implements IBookingCalendarEventQuery {
  constructor(
    private readonly client: IGoogleCalendarClient,
    private readonly calendarId: string,
  ) {}

  async listActiveEventTimeRanges(params: {
    timeMin: DateTime;
    timeMax: DateTime;
  }): Promise<BookingCalendarEventTimeRange[]> {
    const events = await this.client.listEvents({
      calendarId: this.calendarId,
      timeMin: params.timeMin.value,
      timeMax: params.timeMax.value,
    });

    const activeEvents = events.filter((e) => e.status !== 'cancelled');

    return activeEvents
      .map((e) => toGoogleCalendarEventTimestampRange(e))
      .filter((r): r is { start: number; end: number } => r !== null);
  }
}
