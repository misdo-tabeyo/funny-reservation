import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { IGoogleCalendarClient, CalendarEvent } from './IGoogleCalendarClient';

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
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
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
      singleEvents: true, // recurring を展開
      orderBy: 'startTime',
      maxResults: 2500,
    });

    const items = res.data.items ?? [];

    return items.map((e) => ({
      status: e.status ?? null,
      start: e.start
        ? {
            dateTime: e.start.dateTime ?? undefined,
            date: e.start.date ?? undefined,
          }
        : null,
      end: e.end
        ? {
            dateTime: e.end.dateTime ?? undefined,
            date: e.end.date ?? undefined,
          }
        : null,
    }));
  }
}
