export type CalendarEvent = {
  start: { dateTime?: string; date?: string } | null;
  end: { dateTime?: string; date?: string } | null;
  status?: string | null; // "cancelled" など
};

export interface IGoogleCalendarClient {
  listEvents(params: {
    calendarId: string;
    timeMin: string; // ISO
    timeMax: string; // ISO
  }): Promise<CalendarEvent[]>;
}
