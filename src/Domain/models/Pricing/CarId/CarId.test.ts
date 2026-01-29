import { CarId } from './CarId';

describe('Pricing.CarId', () => {
  test('日本語・記号を含む ID を許容する（車名をそのままID運用）', () => {
    expect(new CarId('プリウス').value).toBe('プリウス');
    expect(new CarId('ヴィッツ(リア3角窓あり)').value).toBe('ヴィッツ(リア3角窓あり)');
  });

  test('前後スペースは許容（trimされても長さがあればOK）', () => {
    expect(new CarId('  プリウス  ').value).toBe('  プリウス  ');
  });

  test('Google Sheets のセル内改行/タブは許容する（複数行表記を想定）', () => {
    expect(new CarId('タウンエース\n(リア・スライドガラスあり)').value).toBe(
      'タウンエース\n(リア・スライドガラスあり)',
    );
    expect(new CarId('プリウス\t(特別仕様)').value).toBe('プリウス\t(特別仕様)');
  });

  test('NUL(\\u0000) は拒否する', () => {
    expect(() => new CarId('プリウス\u0000')).toThrow('不正なCarIdの形式です');
  });
});
