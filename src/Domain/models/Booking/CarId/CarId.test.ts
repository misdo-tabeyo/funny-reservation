import { CarId } from './CarId';

describe('CarId', () => {
  // 正常系
  test('有効なフォーマットの場合 canonical が生成される', () => {
    expect(new CarId('toyota-prius').value).toBe('toyota-prius');
    expect(new CarId('lexus-nx').value).toBe('lexus-nx');
  });

  test('equals', () => {
    const a = new CarId('toyota-prius');
    const b = new CarId('toyota-prius');
    const c = new CarId('lexus-nx');
    expect(a.equals(b)).toBeTruthy();
    expect(a.equals(c)).toBeFalsy();
  });

  test('fromNames() - 日本語メーカー名・車種名から生成', () => {
    expect(CarId.fromNames('トヨタ', 'プリウス').value).toBe('toyota-prius');
    expect(CarId.fromNames('レクサス', 'NX').value).toBe('lexus-nx');
    expect(CarId.fromNames('ホンダ', 'N-BOX').value).toBe('honda-n-box');
  });

  // 異常系
  test('不正な文字数の場合にエラーを投げる', () => {
    expect(() => new CarId('')).toThrow('CarIdの文字数が不正です');
    expect(() => new CarId('a'.repeat(101))).toThrow('CarIdの文字数が不正です');
  });

  test('不正なフォーマットの場合にエラーを投げる', () => {
    expect(() => new CarId('TOYOTA-PRIUS')).toThrow('不正なCarIdの形式です');
    expect(() => new CarId('toyota_prius')).toThrow('不正なCarIdの形式です');
    expect(() => new CarId('toyota prius')).toThrow('不正なCarIdの形式です');
  });
});
