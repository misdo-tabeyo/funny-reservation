import { PhoneNumber } from './PhoneNumber';

describe('PhoneNumber', () => {
  // 正常系
  test('有効なフォーマットの場合 canonical が生成される', () => {
    expect(new PhoneNumber('090-1234-5678').value).toBe('+819012345678');
    expect(new PhoneNumber('09012345678').value).toBe('+819012345678');

    // 国際表記（スペースあり）
    expect(new PhoneNumber('+81 90 1234 5678').value).toBe('+819012345678');

    // 国際表記（そのまま）
    expect(new PhoneNumber('+819012345678').value).toBe('+819012345678');

    // よくある誤入力: +81(0)90... -> +8190...
    expect(new PhoneNumber('+81(0)90-1234-5678').value).toBe('+819012345678');

    // 固定電話（例: 03）
    expect(new PhoneNumber('(03)1234-5678').value).toBe('+81312345678');
    expect(new PhoneNumber('0312345678').value).toBe('+81312345678');
  });

  test('toDisplay() 携帯はハイフン、固定はdigitsのまま', () => {
    expect(new PhoneNumber('090-1234-5678').toDisplay()).toBe('090-1234-5678');
    expect(new PhoneNumber('050-1234-5678').toDisplay()).toBe('050-1234-5678');

    // 固定は digits のまま（仕様どおり）
    expect(new PhoneNumber('(03)1234-5678').toDisplay()).toBe('0312345678');
  });

  test('equals', () => {
    // 入力が違っても canonical が同じなら equals は true
    const a = new PhoneNumber('090-1234-5678');
    const b = new PhoneNumber('+819012345678');
    const c = new PhoneNumber('080-1234-5678');

    expect(a.equals(b)).toBeTruthy();
    expect(a.equals(c)).toBeFalsy();
  });

  // 異常系
  test('日本以外の国番号はエラーを投げる', () => {
    expect(() => new PhoneNumber('+14155552671')).toThrow(
      '日本の電話番号のみ対応しています'
    );
    expect(() => new PhoneNumber('+821012345678')).toThrow(
      '日本の電話番号のみ対応しています'
    );
  });

  test('不正な形式の場合にエラーを投げる', () => {
    expect(() => new PhoneNumber('abc')).toThrow('不正なPhoneNumberの形式です');
    expect(() => new PhoneNumber('090-12AB-5678')).toThrow(
      '不正なPhoneNumberの形式です'
    );

    // + から始まるが digits が混ざる
    expect(() => new PhoneNumber('+81-90-1234-56AA')).toThrow(
      '不正なPhoneNumberの形式です'
    );

    // 国内表記で 0 始まりじゃない
    expect(() => new PhoneNumber('9012345678')).toThrow(
      '不正なPhoneNumberの形式です'
    );
  });

  test('不正な文字数の場合にエラーを投げる', () => {
    // canonical の長さが 13 or 14 以外（validateで弾かれる）
    // 例: 国内番号が短すぎる
    expect(() => new PhoneNumber('090-123-456')).toThrow(
      'PhoneNumberの文字数が不正です'
    );

    // 例: 長すぎる（国内 0 + 12桁 → +81 + 12桁 = 15文字）
    expect(() => new PhoneNumber('0901234567890')).toThrow(
      'PhoneNumberの文字数が不正です'
    );
  });
});
