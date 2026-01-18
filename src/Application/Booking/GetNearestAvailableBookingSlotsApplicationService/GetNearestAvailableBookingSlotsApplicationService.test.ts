import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { GetNearestAvailableBookingSlotsApplicationService } from './GetNearestAvailableBookingSlotsApplicationService';
import { IBookingCalendarEventQuery } from '../IBookingCalendarEventQuery';

class FakeCalendarEventQuery implements IBookingCalendarEventQuery {
  constructor(
    private readonly ranges: { start: number; end: number }[],
    private readonly bookingsCountByDayKey: Record<string, number> = {},
  ) {}

  async listActiveEventTimeRanges(): Promise<{ start: number; end: number }[]> {
    return this.ranges;
  }
  
  async countActiveEventsOverlappingBusinessHoursByUtcDay(params: { utcDayKey: string }): Promise<number> {
    return this.bookingsCountByDayKey[params.utcDayKey] ?? 0;
  }
}

describe('GetNearestAvailableBookingSlotsApplicationService', () => {
  it('直近の空き枠を返す（開始は1時間単位に切り上げ、既存予定と重なる枠は除外）', async () => {
    const from = new DateTime('2026-01-18T10:10:00.000Z');

    // 11:00-12:00 は埋まっている
    const bookedStart = Date.parse('2026-01-18T11:00:00.000Z');
    const bookedEnd = Date.parse('2026-01-18T12:00:00.000Z');

    // 重複除外の検証に集中したいので、同日予約あり扱いにして「開始時刻制約(10/14のみ)」を外す
    const svc = new GetNearestAvailableBookingSlotsApplicationService(
      new FakeCalendarEventQuery(
        [{ start: bookedStart, end: bookedEnd }],
        {
          '2026-01-18': 1,
        },
      ),
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

  it('営業時間外の枠は返さない（かつ開始時刻制約も適用される）', async () => {
    const svc = new GetNearestAvailableBookingSlotsApplicationService(new FakeCalendarEventQuery([]));

    const result = await svc.execute({
      from: '2026-01-18T17:00:00.000Z',
      durationMinutes: 60,
      limit: 3,
      searchDays: 1,
    });

    // 同日の予約が0件 & duration<=5h の場合、開始時刻は 10:00 または 14:00 のみ。
    // from=17:00 なので当日は候補が無く、翌日の 10:00 / 14:00 が返る。
    expect(result.slots).toEqual([
      {
        startAt: '2026-01-19T10:00:00.000Z',
        endAt: '2026-01-19T11:00:00.000Z',
      },
      {
        startAt: '2026-01-19T14:00:00.000Z',
        endAt: '2026-01-19T15:00:00.000Z',
      },
    ]);
  });

  it('施工時間が5時間超のとき（長時間枠）、予約0件日は 10/11/12 開始のみ', async () => {
    const svc = new GetNearestAvailableBookingSlotsApplicationService(new FakeCalendarEventQuery([]));

    // from=13:00 だと、13:00/14:00/15:00... は開始時刻制約で落ち、翌日の10:00が最初の候補になる
    const result = await svc.execute({
      from: '2026-01-18T13:00:00.000Z',
      durationMinutes: 360, // 6時間 (>5h)
      limit: 1,
      searchDays: 2,
    });

    expect(result.slots).toEqual([
      {
        startAt: '2026-01-19T10:00:00.000Z',
        endAt: '2026-01-19T16:00:00.000Z',
      },
    ]);
  });

  it('施工時間が5時間超のとき（長時間枠）、同日に既存予定があるなら予約不可', async () => {
    // 2026-01-18 に1件でも予定があれば strict は不可なので、翌日10:00が返る
    const bookedStart = Date.parse('2026-01-18T10:00:00.000Z');
    const bookedEnd = Date.parse('2026-01-18T11:00:00.000Z');

    const svc = new GetNearestAvailableBookingSlotsApplicationService(
      new FakeCalendarEventQuery(
        [{ start: bookedStart, end: bookedEnd }],
        {
          '2026-01-18': 1,
        },
      ),
    );

    const result = await svc.execute({
      from: '2026-01-18T10:00:00.000Z',
      durationMinutes: 360,
      limit: 1,
      searchDays: 2,
    });

    expect(result.slots).toEqual([
      {
        startAt: '2026-01-19T10:00:00.000Z',
        endAt: '2026-01-19T16:00:00.000Z',
      },
    ]);
  });

  it('探索範囲が短く、かつ長時間枠が適用できない場合は slots=[] を返す', async () => {
    // 2026-01-18 に既存予定が1件ある場合、duration>5h(長時間枠) はその日一切予約不可。
    // searchDays=1 で翌日を探索しないようにすれば slots は空になる。
    const bookedStart = Date.parse('2026-01-18T10:00:00.000Z');
    const bookedEnd = Date.parse('2026-01-18T11:00:00.000Z');

    const svc = new GetNearestAvailableBookingSlotsApplicationService(
      new FakeCalendarEventQuery(
        [{ start: bookedStart, end: bookedEnd }],
        {
          '2026-01-18': 1,
        },
      ),
    );

    const result = await svc.execute({
      from: '2026-01-18T10:00:00.000Z',
      durationMinutes: 360,
      limit: 1,
      searchDays: 1,
    });

    expect(result.slots).toEqual([]);
  });

  it('前日から跨る予定が当日の営業時間にかかっている場合、その日は「既存予約あり」として扱う', async () => {
    // 2026-01-18 09:00-11:00 のイベント（開始は営業時間前だが 10:00-11:00 が営業時間に食い込む）
    const bookedStart = Date.parse('2026-01-18T09:00:00.000Z');
    const bookedEnd = Date.parse('2026-01-18T11:00:00.000Z');

    const svc = new GetNearestAvailableBookingSlotsApplicationService(
      new FakeCalendarEventQuery(
        [{ start: bookedStart, end: bookedEnd }],
        {
          '2026-01-18': 1,
        },
      ),
    );

    // relaxed(<=5h) かつ 既存予約あり の場合、開始時刻制約(10/14)は外れ「営業時間内ならOK」。
    // ただし 10:00-11:00 は重複するので、その次の 11:00 が返るはず。
    const result = await svc.execute({
      from: '2026-01-18T10:00:00.000Z',
      durationMinutes: 60,
      limit: 1,
      searchDays: 1,
    });

    expect(result.slots).toEqual([
      {
        startAt: '2026-01-18T11:00:00.000Z',
        endAt: '2026-01-18T12:00:00.000Z',
      },
    ]);
  });
});
