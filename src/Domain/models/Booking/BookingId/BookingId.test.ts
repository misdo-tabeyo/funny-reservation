import { BookingId } from './BookingId';

describe('BookingId', () => {
  // 正常系
  test('有効なフォーマットの場合正しい値が保持される', () => {
    const min = 'a'.repeat(BookingId.MIN_LENGTH);
    const max = 'b'.repeat(BookingId.MAX_LENGTH);

    expect(new BookingId(min).value).toBe(min);
    expect(new BookingId(max).value).toBe(max);
  });

  test('equals', () => {
    const v1 = 'a'.repeat(BookingId.MIN_LENGTH);
    const v2 = 'b'.repeat(BookingId.MIN_LENGTH);

    const id1 = new BookingId(v1);
    const id2 = new BookingId(v1);
    const id3 = new BookingId(v2);

    expect(id1.equals(id2)).toBeTruthy();
    expect(id1.equals(id3)).toBeFalsy();
  });

  test('generate()', () => {
    const id = BookingId.generate();
    expect(id.value.length >= BookingId.MIN_LENGTH).toBeTruthy();
    expect(id.value.length <= BookingId.MAX_LENGTH).toBeTruthy();
    expect(/^[a-zA-Z0-9_-]+$/.test(id.value)).toBeTruthy();
  });

  // 異常系
  test('不正な文字数の場合にエラーを投げる', () => {
    // 境界値のテスト
    expect(() => new BookingId('a'.repeat(BookingId.MIN_LENGTH - 1))).toThrow(
      'BookingIdの文字数が不正です'
    );
    expect(() => new BookingId('a'.repeat(BookingId.MAX_LENGTH + 1))).toThrow(
      'BookingIdの文字数が不正です'
    );
  });

  test('不正なフォーマットの場合にエラーを投げる', () => {
    // 長さはOKだが、許可されていない文字を含む
    const invalid = 'a'.repeat(BookingId.MIN_LENGTH - 1) + '!';
    expect(() => new BookingId(invalid)).toThrow('不正なBookingIdの形式です');
  });
});
