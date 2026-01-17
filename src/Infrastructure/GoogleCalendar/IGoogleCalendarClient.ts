export type CalendarEvent = {
  start: { dateTime?: string; date?: string } | null;
  end: { dateTime?: string; date?: string } | null;
  status?: string | null; // "cancelled" など
};

export type InsertCalendarEventParams = {
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
};

export interface IGoogleCalendarClient {
  listEvents(params: {
    calendarId: string;
    timeMin: string; // ISO
    timeMax: string; // ISO
  }): Promise<CalendarEvent[]>;

  insertEvent(params: {
    calendarId: string;
    event: InsertCalendarEventParams;
  }): Promise<{ eventId: string }>;
}
