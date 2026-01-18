import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { GetNearestAvailableBookingSlotsApplicationService } from './GetNearestAvailableBookingSlotsApplicationService';
import { IBookingCalendarEventQuery } from '../IBookingCalendarEventQuery';

class FakeCalendarEventQuery implements IBookingCalendarEventQuery {
  constructor(private readonly ranges: { start: number; end: number }[]) {}

  async listActiveEventTimeRanges(): Promise<{ start: number; end: number }[]> {
    return this.ranges;
  }
}

describe('GetNearestAvailableBookingSlotsApplicationService', () => {
  it('returns nearest available slots (hour aligned, duration 60)', async () => {
    const from = new DateTime('2026-01-18T10:10:00.000Z');

    // 11:00-12:00 is booked
    const bookedStart = Date.parse('2026-01-18T11:00:00.000Z');
    const bookedEnd = Date.parse('2026-01-18T12:00:00.000Z');

    const svc = new GetNearestAvailableBookingSlotsApplicationService(
      new FakeCalendarEventQuery([{ start: bookedStart, end: bookedEnd }]),
    );

    const result = await svc.execute({
      from: from.value,
      durationMinutes: 60,
      limit: 2,
      searchDays: 1,
    });

    expect(result.from).toBe('2026-01-18T11:00:00.000Z');
    expect(result.slots).toEqual([
      {
        startAt: '2026-01-18T12:00:00.000Z',
        endAt: '2026-01-18T13:00:00.000Z',
      },
      {
        startAt: '2026-01-18T13:00:00.000Z',
        endAt: '2026-01-18T14:00:00.000Z',
      },
    ]);
  });

  it('returns empty when no slots within search window', async () => {
    const svc = new GetNearestAvailableBookingSlotsApplicationService(new FakeCalendarEventQuery([]));

    const result = await svc.execute({
      // omit searchDays to use default
      from: '2026-01-18T10:00:00.000Z',
      durationMinutes: 60,
      limit: 1,
    });

    // default searchDays is 14; with no events it should still return at least one slot
    expect(result.slots.length).toBe(1);
  });
});
