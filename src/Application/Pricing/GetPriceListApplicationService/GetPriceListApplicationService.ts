import { IPricingQuery } from '../IPricingQuery';
import { PriceListDTO, CarPricingDTO } from './PriceListDTO';
import { CarId } from 'Domain/models/Pricing/CarId/CarId';
import { FilmMenuId } from 'Domain/models/Pricing/FilmMenuId/FilmMenuId';

export type GetPriceListQuery = {
  carId?: string;
  menuId?: string;
};

/**
 * 料金表取得のアプリケーションサービス
 * クエリパラメータに応じて異なる形式で料金情報を返す
 */
export class GetPriceListApplicationService {
  constructor(private readonly pricingQuery: IPricingQuery) {}

  async execute(query: GetPriceListQuery): Promise<PriceListDTO> {
    // パターンC: 車種＋メニュー指定
    if (query.carId && query.menuId) {
      return this.getSinglePrice(query.carId, query.menuId);
    }

    // パターンB: 車種指定のみ
    if (query.carId) {
      return this.getCarPrices(query.carId);
    }

    // パターンA: 全料金表
    return this.getAllPrices();
  }

  /**
   * 特定の車種・メニューの料金を取得
   */
  private async getSinglePrice(carId: string, menuId: string): Promise<PriceListDTO> {
    // バリデーション
    const carIdVO = new CarId(carId);
    const menuIdVO = new FilmMenuId(menuId);

    const resolvedCarId = await this.resolveCarIdFromQuery(carIdVO.value);
    const pricing = await this.pricingQuery.findCarPricing({ carId: resolvedCarId });
    if (!pricing) {
      throw new Error('指定された車種が見つかりません');
    }

    const menuPrice = pricing.prices.find((p) => p.menuId === menuIdVO.value);
    if (!menuPrice || menuPrice.amount === null) {
      throw new Error('指定されたメニューの料金が見つかりません');
    }

    return PriceListDTO.createSinglePrice({
      carId: pricing.carId,
      carName: pricing.carName,
      carNameReading: pricing.carNameReading,
      manufacturer: pricing.manufacturer,
      menuId: menuIdVO.value,
      menuName: menuIdVO.getDisplayName(),
      amount: menuPrice.amount,
    });
  }

  /**
   * 特定の車種の全メニュー料金を取得
   */
  private async getCarPrices(carId: string): Promise<PriceListDTO> {
    // バリデーション
    const carIdVO = new CarId(carId);

    const resolvedCarId = await this.resolveCarIdFromQuery(carIdVO.value);
    const pricing = await this.pricingQuery.findCarPricing({ carId: resolvedCarId });
    if (!pricing) {
      throw new Error('指定された車種が見つかりません');
    }

    // 料金が設定されているメニューのみ返す
    const prices = pricing.prices
      .filter((p) => p.amount !== null)
      .map((p) => ({
        menuId: p.menuId,
        menuName: p.menuName,
        amount: p.amount,
        currency: 'JPY' as const,
      }));

    return PriceListDTO.createCarPrices({
      carId: pricing.carId,
      carName: pricing.carName,
      carNameReading: pricing.carNameReading,
      manufacturer: pricing.manufacturer,
      prices,
    });
  }

  /**
   * 全車種の料金表を取得
   */
  private async getAllPrices(): Promise<PriceListDTO> {
    const allPricings = await this.pricingQuery.listAllCarPricings();

    const pricings: CarPricingDTO[] = allPricings.map((p) => ({
      carId: p.carId,
      carName: p.carName,
      carNameReading: p.carNameReading,
      manufacturer: p.manufacturer,
      prices: p.prices.map((price) => ({
        menuId: price.menuId,
        menuName: price.menuName,
        amount: price.amount,
        currency: 'JPY' as const,
      })),
    }));

    return PriceListDTO.createFullList(pricings);
  }

  /**
   * carId(=車名) を解決する。
   *
   * - 入力に対して部分一致検索し、候補が複数件なら曖昧すぎるのでエラー
   *   （その中に完全一致が含まれていても「他にも候補がある」なら曖昧扱いにする）
   * - 候補が1件ならそれを採用
   * - 候補が0件なら解決不能として、そのまま入力を返す
   */
  private async resolveCarIdFromQuery(input: string): Promise<string> {
    const candidates = await this.pricingQuery.searchCarsByName({ nameContains: input });
    if (candidates.length === 0) {
      return input;
    }

    if (candidates.length === 1) return candidates[0].id;

    if (candidates.length > 1) {
      const names = candidates
        .slice(0, 10)
        .map((c) => `${c.name}(${c.manufacturer})`)
        .join(', ');
      throw new Error(`車種名が曖昧です。候補: ${names}`);
    }

    // 上の分岐で必ず return / throw するが、型のために明示しておく
    return input;
  }
}
