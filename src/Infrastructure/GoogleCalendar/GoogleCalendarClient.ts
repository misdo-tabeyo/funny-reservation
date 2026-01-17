import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';
import {
  IGoogleCalendarClient,
  CalendarEvent,
  InsertCalendarEventParams,
} from './IGoogleCalendarClient';

export type GoogleCalendarClientConfig = {
  serviceAccountEmail: string;
  privateKey: string; // PEM（\n を含む）
};

export class GoogleCalendarClient implements IGoogleCalendarClient {
  private readonly calendar: calendar_v3.Calendar;

  constructor(config: GoogleCalendarClientConfig) {
    const auth = new JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey,
      // ✅ read/write
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async listEvents(params: {
    calendarId: string;
    timeMin: string; // ISO
    timeMax: string; // ISO
  }): Promise<CalendarEvent[]> {
    const res = await this.calendar.events.list({
      calendarId: params.calendarId,
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    });

    const items = res.data.items ?? [];

    return items.map((e) => ({
      status: e.status ?? null,
      start: e.start
        ? { dateTime: e.start.dateTime ?? undefined, date: e.start.date ?? undefined }
        : null,
      end: e.end
        ? { dateTime: e.end.dateTime ?? undefined, date: e.end.date ?? undefined }
        : null,
    }));
  }

  async insertEvent(params: {
    calendarId: string;
    event: InsertCalendarEventParams;
  }): Promise<{ eventId: string }> {
    const res = await this.calendar.events.insert({
      calendarId: params.calendarId,
      requestBody: {
        summary: params.event.summary,
        description: params.event.description,
        start: { dateTime: params.event.start.dateTime },
        end: { dateTime: params.event.end.dateTime },
      },
    });

    const eventId = res.data.id;
    if (!eventId) {
      throw new Error('Google Calendar eventId の取得に失敗しました');
    }

    return { eventId };
  }
}
