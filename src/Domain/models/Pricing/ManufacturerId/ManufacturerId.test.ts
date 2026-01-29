import { ManufacturerId } from './ManufacturerId';

describe('Pricing.ManufacturerId', () => {
  test('日本語のシート名をそのままIDとして扱える', () => {
    expect(new ManufacturerId('トヨタ').value).toBe('トヨタ');
    expect(new ManufacturerId('レクサス').value).toBe('レクサス');
  });

  test('getDisplayName() はIDをそのまま返す', () => {
    expect(new ManufacturerId('トヨタ').getDisplayName()).toBe('トヨタ');
  });

  test('制御文字は拒否する', () => {
    expect(() => new ManufacturerId('トヨタ\n')).toThrow('不正なManufacturerIdの形式です');
    expect(() => new ManufacturerId('トヨタ\u0000')).toThrow('不正なManufacturerIdの形式です');
  });
});
