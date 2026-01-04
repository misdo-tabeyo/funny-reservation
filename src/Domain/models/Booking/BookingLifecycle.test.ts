import { BookingLifecycle } from './BookingLifecycle';
import { BookingStatus, BookingStatusEnum } from './BookingStatus/BookingStatus';

describe('BookingLifecycle', () => {
  describe('canTransition', () => {
    it('Draft -> Confirmed は可能', () => {
      expect(
        BookingLifecycle.canTransition(BookingStatus.draft(), BookingStatus.confirmed()),
      ).toBe(true);
    });

    it('Draft -> Cancelled は可能', () => {
      expect(
        BookingLifecycle.canTransition(BookingStatus.draft(), BookingStatus.cancelled()),
      ).toBe(true);
    });

    it('Draft -> Completed は不可', () => {
      expect(
        BookingLifecycle.canTransition(BookingStatus.draft(), BookingStatus.completed()),
      ).toBe(false);
    });

    it('Confirmed -> Completed は可能', () => {
      expect(
        BookingLifecycle.canTransition(BookingStatus.confirmed(), BookingStatus.completed()),
      ).toBe(true);
    });

    it('Confirmed -> Cancelled は可能', () => {
      expect(
        BookingLifecycle.canTransition(BookingStatus.confirmed(), BookingStatus.cancelled()),
      ).toBe(true);
    });

    it('Confirmed -> Draft は不可', () => {
      expect(
        BookingLifecycle.canTransition(BookingStatus.confirmed(), BookingStatus.draft()),
      ).toBe(false);
    });

    it('Completed はどこにも遷移できない', () => {
      expect(
        BookingLifecycle.canTransition(BookingStatus.completed(), BookingStatus.draft()),
      ).toBe(false);
      expect(
        BookingLifecycle.canTransition(BookingStatus.completed(), BookingStatus.confirmed()),
      ).toBe(false);
      expect(
        BookingLifecycle.canTransition(BookingStatus.completed(), BookingStatus.cancelled()),
      ).toBe(false);
      expect(
        BookingLifecycle.canTransition(BookingStatus.completed(), BookingStatus.completed()),
      ).toBe(false);
    });

    it('Cancelled はどこにも遷移できない', () => {
      expect(
        BookingLifecycle.canTransition(BookingStatus.cancelled(), BookingStatus.draft()),
      ).toBe(false);
      expect(
        BookingLifecycle.canTransition(BookingStatus.cancelled(), BookingStatus.confirmed()),
      ).toBe(false);
      expect(
        BookingLifecycle.canTransition(BookingStatus.cancelled(), BookingStatus.completed()),
      ).toBe(false);
      expect(
        BookingLifecycle.canTransition(BookingStatus.cancelled(), BookingStatus.cancelled()),
      ).toBe(false);
    });
  });

  describe('transition', () => {
    it('遷移可能なら to を返す（Draft -> Confirmed）', () => {
      const next = BookingLifecycle.transition(
        BookingStatus.draft(),
        BookingStatus.confirmed(),
      );

      expect(next.equals(BookingStatus.confirmed())).toBeTruthy();
    });

    it('遷移不可能なら例外（Draft -> Completed）', () => {
      expect(() =>
        BookingLifecycle.transition(BookingStatus.draft(), BookingStatus.completed()),
      ).toThrow('BookingStatus cannot transition from Draft to Completed');
    });
  });

  describe('nextStatuses', () => {
    it('Draft の次は Confirmed / Cancelled', () => {
      const next = BookingLifecycle.nextStatuses(BookingStatus.draft());
      expect(next).toEqual([BookingStatusEnum.Confirmed, BookingStatusEnum.Cancelled]);
    });

    it('Confirmed の次は Completed / Cancelled', () => {
      const next = BookingLifecycle.nextStatuses(BookingStatus.confirmed());
      expect(next).toEqual([BookingStatusEnum.Completed, BookingStatusEnum.Cancelled]);
    });

    it('Completed の次は空配列', () => {
      const next = BookingLifecycle.nextStatuses(BookingStatus.completed());
      expect(next).toEqual([]);
    });

    it('Cancelled の次は空配列', () => {
      const next = BookingLifecycle.nextStatuses(BookingStatus.cancelled());
      expect(next).toEqual([]);
    });

    it('返り値は防御的コピーで、外部変更しても影響しない', () => {
      const next = BookingLifecycle.nextStatuses(BookingStatus.draft());
      next.push(BookingStatusEnum.Completed); // 破壊的変更

      const nextAgain = BookingLifecycle.nextStatuses(BookingStatus.draft());
      expect(nextAgain).toEqual([BookingStatusEnum.Confirmed, BookingStatusEnum.Cancelled]);
    });
  });

  describe('isTerminal', () => {
    it('Draft は終端ではない', () => {
      expect(BookingLifecycle.isTerminal(BookingStatus.draft())).toBe(false);
    });

    it('Confirmed は終端ではない', () => {
      expect(BookingLifecycle.isTerminal(BookingStatus.confirmed())).toBe(false);
    });

    it('Completed は終端', () => {
      expect(BookingLifecycle.isTerminal(BookingStatus.completed())).toBe(true);
    });

    it('Cancelled は終端', () => {
      expect(BookingLifecycle.isTerminal(BookingStatus.cancelled())).toBe(true);
    });
  });
});
