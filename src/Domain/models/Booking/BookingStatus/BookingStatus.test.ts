import { BookingStatus, BookingStatusEnum } from './BookingStatus';

describe('BookingStatus', () => {
  // 正常系
  test('有効なステータスでインスタンスが生成されること', () => {
    expect(new BookingStatus(BookingStatusEnum.Draft).value).toBe(BookingStatusEnum.Draft);
    expect(new BookingStatus(BookingStatusEnum.Confirmed).value).toBe(BookingStatusEnum.Confirmed);
    expect(new BookingStatus(BookingStatusEnum.Cancelled).value).toBe(BookingStatusEnum.Cancelled);
    expect(new BookingStatus(BookingStatusEnum.Completed).value).toBe(BookingStatusEnum.Completed);
  });

  test('toLabel()', () => {
    expect(new BookingStatus(BookingStatusEnum.Draft).toLabel()).toBe('下書き');
    expect(new BookingStatus(BookingStatusEnum.Confirmed).toLabel()).toBe('確定');
    expect(new BookingStatus(BookingStatusEnum.Cancelled).toLabel()).toBe('キャンセル');
    expect(new BookingStatus(BookingStatusEnum.Completed).toLabel()).toBe('完了');
  });

  test('isX getters', () => {
    const draft = new BookingStatus(BookingStatusEnum.Draft);
    expect(draft.isDraft).toBeTruthy();
    expect(draft.isConfirmed).toBeFalsy();
    expect(draft.isCancelled).toBeFalsy();
    expect(draft.isCompleted).toBeFalsy();

    const confirmed = new BookingStatus(BookingStatusEnum.Confirmed);
    expect(confirmed.isDraft).toBeFalsy();
    expect(confirmed.isConfirmed).toBeTruthy();
    expect(confirmed.isCancelled).toBeFalsy();
    expect(confirmed.isCompleted).toBeFalsy();

    const cancelled = new BookingStatus(BookingStatusEnum.Cancelled);
    expect(cancelled.isDraft).toBeFalsy();
    expect(cancelled.isConfirmed).toBeFalsy();
    expect(cancelled.isCancelled).toBeTruthy();
    expect(cancelled.isCompleted).toBeFalsy();

    const completed = new BookingStatus(BookingStatusEnum.Completed);
    expect(completed.isDraft).toBeFalsy();
    expect(completed.isConfirmed).toBeFalsy();
    expect(completed.isCancelled).toBeFalsy();
    expect(completed.isCompleted).toBeTruthy();
  });

  // 異常系
  test('無効なステータスでエラーを投げる', () => {
    const invalid = 'Invalid' as unknown as BookingStatusEnum; // テストのために無効な値を渡す
    expect(() => new BookingStatus(invalid)).toThrow('無効なBookingStatusです');
  });
});
