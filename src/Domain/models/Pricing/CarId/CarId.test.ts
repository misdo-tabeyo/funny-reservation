import { CarId } from './CarId';

describe('Pricing.CarId', () => {
  test('日本語・記号を含む ID を許容する（車名をそのままID運用）', () => {
    expect(new CarId('プリウス').value).toBe('プリウス');
    expect(new CarId('ヴィッツ(リア3角窓あり)').value).toBe('ヴィッツ(リア3角窓あり)');
  });

  test('前後スペースは許容（trimされても長さがあればOK）', () => {
    expect(new CarId('  プリウス  ').value).toBe('  プリウス  ');
  });

  test('制御文字（改行など）は拒否する', () => {
    expect(() => new CarId('プリウス\n')).toThrow('不正なCarIdの形式です');
    expect(() => new CarId('プリウス\u0000')).toThrow('不正なCarIdの形式です');
  });
});
