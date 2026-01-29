import { FilmMenuId } from './FilmMenuId';

describe('FilmMenuId', () => {
  test('static初期化でクラッシュしない（ALL_MENUSが利用可能）', () => {
    expect(FilmMenuId.ALL_MENUS).toHaveLength(7);
    expect(FilmMenuId.ALL_MENUS).toContain(FilmMenuId.FRONT_SET);
  });

  test('有効なIDを受け付ける', () => {
    expect(new FilmMenuId('front-set').value).toBe('front-set');
  });

  test('無効なIDは例外', () => {
    expect(() => new FilmMenuId('invalid-menu')).toThrow('不正なFilmMenuId');
  });
});
