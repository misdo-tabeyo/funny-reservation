// src/Domain/models/Booking/CalendarEventId/CalendarEventId.test.ts
import { CalendarEventId } from './CalendarEventId';

describe('CalendarEventId', () => {
  // 正常系
  test('有効な文字列の場合 value が生成される', () => {
    expect(new CalendarEventId('event_123').value).toBe('event_123');
    expect(new CalendarEventId('a'.repeat(255)).value).toBe('a'.repeat(255));
  });

  test('前後の空白があっても value はそのまま保持される（trimしない）', () => {
    expect(new CalendarEventId('  event_123  ').value).toBe('  event_123  ');
  });

  test('equals', () => {
    const a = new CalendarEventId('event_123');
    const b = new CalendarEventId('event_123');
    const c = new CalendarEventId('event_456');
    expect(a.equals(b)).toBeTruthy();
    expect(a.equals(c)).toBeFalsy();
  });

  // 異常系
  test('空文字の場合にエラーを投げる', () => {
    expect(() => new CalendarEventId('')).toThrow('CalendarEventIdの文字数が不正です');
  });

  test('空白のみの場合にエラーを投げる', () => {
    expect(() => new CalendarEventId('   ')).toThrow('CalendarEventIdの文字数が不正です');
  });

  test('不正な文字数の場合にエラーを投げる', () => {
    expect(() => new CalendarEventId('a'.repeat(256))).toThrow('CalendarEventIdの文字数が不正です');
  });
});
