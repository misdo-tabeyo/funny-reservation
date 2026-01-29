import { CarId } from './CarId';

describe('CarId', () => {
  // 正常系
  test('有効なフォーマットの場合 canonical が生成される', () => {
    expect(new CarId('toyota-prius').value).toBe('toyota-prius');
    expect(new CarId('lexus-nx').value).toBe('lexus-nx');
    expect(new CarId('ヴィッツ(リア3角窓あり)').value).toBe('ヴィッツ(リア3角窓あり)');
  });

  test('equals', () => {
    const a = new CarId('toyota-prius');
    const b = new CarId('toyota-prius');
    const c = new CarId('lexus-nx');
    expect(a.equals(b)).toBeTruthy();
    expect(a.equals(c)).toBeFalsy();
  });

  test('日本語や記号を含む ID も扱える', () => {
    expect(new CarId('プリウス').value).toBe('プリウス');
    expect(new CarId('タウンエース(リア・スライドガラスあり)').value).toBe(
      'タウンエース(リア・スライドガラスあり)',
    );
  });

  // 異常系
  test('不正な文字数の場合にエラーを投げる', () => {
    expect(() => new CarId('')).toThrow('CarIdの文字数が不正です');
    expect(() => new CarId('a'.repeat(101))).toThrow('CarIdの文字数が不正です');
  });

  test('制御文字を含む場合にエラーを投げる', () => {
    expect(() => new CarId('prius\n')).toThrow('不正なCarIdの形式です');
    expect(() => new CarId('prius\u0000')).toThrow('不正なCarIdの形式です');
  });
});
