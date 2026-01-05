import { Booking } from './Booking';
import { BookingId } from './BookingId/BookingId';
import { CarId } from './CarId/CarId';
import { MenuId } from './MenuId/MenuId';
import { OptionId } from './OptionId/OptionId';
import { BookingStatus, BookingStatusEnum } from './BookingStatus/BookingStatus';
import { TimeRange } from './TimeRange/TimeRange';
import { Duration } from './TimeRange/Duration/Duration';
import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Money } from 'Domain/models/shared/Money/Money';
import { CalendarEventId } from './CalendarEventId/CalendarEventId';

describe('Booking', () => {
  const bookingId = new BookingId('bookingId_01');
  const carId = new CarId('carId_____01');
  const menuId = new MenuId('menuId____01');

  const option1 = new OptionId('optionId__01');
  const option2 = new OptionId('optionId__02');

  const startAt = new DateTime('2026-01-04T00:00:00.000Z');
  const duration = new Duration(60);
  const timeRange = new TimeRange(startAt, duration);

  const price = new Money({ amount: 20000, currency: 'JPY' });

  const calendarEventId = new CalendarEventId('calendarEventId_01');

  describe('create', () => {
    it('初期ステータスは Draft を強制する', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      expect(booking.status.equals(new BookingStatus(BookingStatusEnum.Draft))).toBeTruthy();
      expect(booking.status.isDraft).toBe(true);
    });

    it('新規作成時は calendarEventId が未紐づけ（null）', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      expect(booking.calendarEventId).toBeNull();
    });

    it('受け取った optionIds は防御的コピーされ、外部の配列変更の影響を受けない', () => {
      const optionIds = [option1, option2];

      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds,
        timeRange,
        price,
      });

      // 外部の配列を破壊的に変更しても…
      optionIds.pop();

      // Booking内部は影響を受けない（2件のまま）
      expect(booking.optionIds).toHaveLength(2);
      expect(booking.optionIds[0].equals(option1)).toBeTruthy();
      expect(booking.optionIds[1].equals(option2)).toBeTruthy();
    });

    it('optionIds が重複している場合はエラーを投げる', () => {
      expect(() =>
        Booking.create({
          bookingId,
          carId,
          menuId,
          optionIds: [option1, option1],
          timeRange,
          price,
        }),
      ).toThrow('optionIdsは重複を許可しません');
    });

    it('getter で渡した VO / 値を取得できる', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      expect(booking.bookingId.equals(bookingId)).toBeTruthy();
      expect(booking.carId.equals(carId)).toBeTruthy();
      expect(booking.menuId.equals(menuId)).toBeTruthy();
      expect(booking.timeRange.equals(timeRange)).toBeTruthy();
      expect(booking.price.equals(price)).toBeTruthy();
      expect(booking.optionIds[0].equals(option1)).toBeTruthy();
    });
  });

  describe('reconstruct', () => {
    it('指定した status をそのまま保持して再構築できる', () => {
      const status = BookingStatus.confirmed();

      const booking = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status,
        calendarEventId: null,
      });

      expect(booking.status.equals(status)).toBeTruthy();
      expect(booking.status.isConfirmed).toBe(true);
    });

    it('calendarEventId を指定して再構築できる', () => {
      const booking = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.confirmed(),
        calendarEventId,
      });

      expect(booking.calendarEventId?.equals(calendarEventId)).toBeTruthy();
    });

    it('optionIds が重複している場合はエラーを投げる', () => {
      const status = BookingStatus.confirmed();

      expect(() =>
        Booking.reconstruct({
          bookingId,
          carId,
          menuId,
          optionIds: [option1, option1],
          timeRange,
          price,
          status,
          calendarEventId: null,
        }),
      ).toThrow('optionIdsは重複を許可しません');
    });
  });

  describe('Draft のときだけ変更できる', () => {
    it('Draft のとき changePrice() できる', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      const next = new Money({ amount: 25000, currency: 'JPY' });
      booking.changePrice(next);

      expect(booking.price.equals(next)).toBeTruthy();
    });

    it('Confirmed のとき changePrice() できず例外', () => {
      const booking = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.confirmed(),
        calendarEventId: null,
      });

      const next = new Money({ amount: 25000, currency: 'JPY' });
      expect(() => booking.changePrice(next)).toThrow('priceを変更できません（status=Confirmed）');
    });

    it('Draft のとき reschedule() できる', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      const nextTimeRange = new TimeRange(
        new DateTime('2026-01-04T01:00:00.000Z'),
        new Duration(60),
      );

      booking.reschedule(nextTimeRange);

      expect(booking.timeRange.equals(nextTimeRange)).toBeTruthy();
    });

    it('Confirmed のとき reschedule() できず例外', () => {
      const booking = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.confirmed(),
        calendarEventId: null,
      });

      const nextTimeRange = new TimeRange(
        new DateTime('2026-01-04T01:00:00.000Z'),
        new Duration(60),
      );

      expect(() => booking.reschedule(nextTimeRange)).toThrow(
        'timeRangeを変更できません（status=Confirmed）',
      );
    });

    it('Draft のとき carId / menuId / optionIds を変更できる', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      const nextCarId = new CarId('carId_____02');
      const nextMenuId = new MenuId('menuId____02');
      const nextOptionIds = [option2];

      booking.changeCarId(nextCarId);
      booking.changeMenuId(nextMenuId);
      booking.changeOptionIds(nextOptionIds);

      expect(booking.carId.equals(nextCarId)).toBeTruthy();
      expect(booking.menuId.equals(nextMenuId)).toBeTruthy();
      expect(booking.optionIds).toHaveLength(1);
      expect(booking.optionIds[0].equals(option2)).toBeTruthy();
    });

    it('Draft のとき changeOptionIds() は防御的コピーされ、外部の配列変更の影響を受けない', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      const nextOptionIds = [option1, option2];
      booking.changeOptionIds(nextOptionIds);

      nextOptionIds.pop();

      expect(booking.optionIds).toHaveLength(2);
      expect(booking.optionIds[0].equals(option1)).toBeTruthy();
      expect(booking.optionIds[1].equals(option2)).toBeTruthy();
    });

    it('Draft のとき changeOptionIds() で重複を渡すと例外', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      expect(() => booking.changeOptionIds([option1, option1])).toThrow('optionIdsは重複を許可しません');
    });

    it('Confirmed のとき carId / menuId / optionIds を変更できず例外', () => {
      const booking = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.confirmed(),
        calendarEventId: null,
      });

      const nextCarId = new CarId('carId_____02');
      const nextMenuId = new MenuId('menuId____02');

      expect(() => booking.changeCarId(nextCarId)).toThrow(
        'carIdを変更できません（status=Confirmed）',
      );
      expect(() => booking.changeMenuId(nextMenuId)).toThrow(
        'menuIdを変更できません（status=Confirmed）',
      );
      expect(() => booking.changeOptionIds([option2])).toThrow(
        'optionIdsを変更できません（status=Confirmed）',
      );
    });
  });

  describe('calendarEvent linkage', () => {
    it('Confirmed のとき linkCalendarEvent() で紐づけできる', () => {
      const booking = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.confirmed(),
        calendarEventId: null,
      });

      booking.linkCalendarEvent(calendarEventId);

      expect(booking.calendarEventId?.equals(calendarEventId)).toBeTruthy();
    });

    it('Draft のとき linkCalendarEvent() できず例外', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      expect(() => booking.linkCalendarEvent(calendarEventId)).toThrow(
        'calendarEventIdを紐づけできません（status=Draft）',
      );
    });

    it('すでに紐づいている場合 linkCalendarEvent() できず例外', () => {
      const booking = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.confirmed(),
        calendarEventId,
      });

      expect(() => booking.linkCalendarEvent(new CalendarEventId('calendarEventId_02'))).toThrow(
        'calendarEventIdはすでに紐づいています',
      );
    });

    it('Completed のとき unlinkCalendarEvent() できず例外', () => {
      const booking = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.completed(),
        calendarEventId,
      });

      expect(() => booking.unlinkCalendarEvent()).toThrow(
        'calendarEventIdを解除できません（status=Completed）',
      );
    });

    it('Confirmed のとき unlinkCalendarEvent() で解除できる（nullになる）', () => {
      const booking = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.confirmed(),
        calendarEventId,
      });

      booking.unlinkCalendarEvent();

      expect(booking.calendarEventId).toBeNull();
    });
  });

  describe('changeStatus', () => {
    it('遷移可能な場合はステータスが更新される（Draft -> Confirmed）', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      booking.changeStatus(BookingStatus.confirmed());

      expect(booking.status.isConfirmed).toBe(true);
    });

    it('遷移不可能な場合は例外（Draft -> Completed）', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      expect(() => booking.changeStatus(BookingStatus.completed())).toThrow(
        'BookingStatusを Draft から Completed へ遷移できません',
      );
    });
  });

  describe('domain methods', () => {
    it('confirm() は Confirmed に遷移する', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      booking.confirm();

      expect(booking.status.isConfirmed).toBe(true);
    });

    it('cancel() は Cancelled に遷移する（Draft -> Cancelled）', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      booking.cancel();

      expect(booking.status.isCancelled).toBe(true);
    });

    it('complete() は Completed に遷移する（Confirmed -> Completed）', () => {
      const confirmed = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.confirmed(),
        calendarEventId: null,
      });

      confirmed.complete();

      expect(confirmed.status.isCompleted).toBe(true);
    });

    it('complete() は Draft からは遷移できず例外（Draft -> Completed）', () => {
      const booking = Booking.create({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
      });

      expect(() => booking.complete()).toThrow(
        'BookingStatusを Draft から Completed へ遷移できません',
      );
    });

    it('cancel() は Completed からは遷移できず例外（Completed -> Cancelled）', () => {
      const completed = Booking.reconstruct({
        bookingId,
        carId,
        menuId,
        optionIds: [option1],
        timeRange,
        price,
        status: BookingStatus.completed(),
        calendarEventId: null,
      });

      expect(() => completed.cancel()).toThrow(
        'BookingStatusを Completed から Cancelled へ遷移できません',
      );
    });
  });
});
