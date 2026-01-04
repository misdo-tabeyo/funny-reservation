import { Booking } from './Booking';
import { BookingId } from './BookingId/BookingId';
import { CarId } from './CarId/CarId';
import { MenuId } from './MenuId/MenuId';
import { OptionId } from './OptionId/OptionId';
import { BookingStatus, BookingStatusEnum } from './BookingStatus/BookingStatus';
import { TimeRange } from './TimeRange/TimeRange';
import { Duration } from './TimeRange/Duration/Duration';
import { DateTime } from '../../../Domain/models/shared/DateTime/DateTime';
import { Money } from '../../../Domain/models/shared/Money/Money';

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
      });

      expect(booking.status.equals(status)).toBeTruthy();
      expect(booking.status.isConfirmed).toBe(true);
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
      });

      expect(() => completed.cancel()).toThrow(
        'BookingStatusを Completed から Cancelled へ遷移できません',
      );
    });
  });
});
