import { Name } from './Name';

describe('Name', () => {
  // 正常系
  test('有効な文字数でNameを作成できる', () => {
    const min = 'a'.repeat(Name.MIN_LENGTH);
    const max = 'b'.repeat(Name.MAX_LENGTH);

    expect(new Name(min).value).toBe(min);
    expect(new Name(max).value).toBe(max);
  });

  test('equals', () => {
    const name1 = new Name('Daichi');
    const name2 = new Name('Daichi');
    const name3 = new Name('Mako');
    expect(name1.equals(name2)).toBeTruthy();
    expect(name1.equals(name3)).toBeFalsy();
  });

  // 異常系
  test('不正な文字数の場合にエラーを投げる', () => {
    expect(() => new Name('a'.repeat(Name.MIN_LENGTH - 1))).toThrow('Nameの文字数が不正です');
    expect(() => new Name('a'.repeat(Name.MAX_LENGTH + 1))).toThrow('Nameの文字数が不正です');
  });

  test('空白のみの場合にエラーを投げる', () => {
    expect(() => new Name('   ')).toThrow('Nameの形式が不正です');
    expect(() => new Name('\n\t')).toThrow('Nameの形式が不正です');
  });
});
