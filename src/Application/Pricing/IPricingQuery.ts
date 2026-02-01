/**
 * メーカーの概要情報
 */
export type ManufacturerSummary = {
  id: string; // 例: "トヨタ"（シート名そのもの）
  name: string; // 例: "トヨタ"
  carCount: number; // メーカーの車種数
};

/**
 * 車種の概要情報
 */
export type CarSummary = {
  id: string; // 例: "プリウス"（車名そのもの）
  name: string; // 例: "プリウス"
  nameReading: string; // 例: "プリウス"
  manufacturer: string; // 例: "トヨタ"
};

/**
 * 車種×メニューの情報（Read Model）
 */
export type CarMenuItem = {
  menuId: string; // 例: "front-set"
  menuName: string; // 例: "フロントセット"
  price: number | null; // 料金（円）、設定がない場合は null
};

/**
 * 車種の詳細情報（Read Model）
 */
export type CarDetail = {
  carId: string;
  carName: string;
  carNameReading: string;
  manufacturer: string;
  menus: CarMenuItem[]; // メニュー別情報の配列
};

/**
 * Pricing クエリのインターフェース
 * Google Sheets から料金情報を取得する
 */
export interface IPricingQuery {
  /**
   * 全メーカー一覧を取得
   * @returns メーカーの概要情報の配列
   */
  listManufacturers(): Promise<ManufacturerSummary[]>;

  /**
   * 指定メーカーの車種一覧を取得
  * @param params.manufacturerId - メーカーID（例: "トヨタ"）
   * @returns 車種の概要情報の配列
   */
  listCarsByManufacturer(params: { manufacturerId: string }): Promise<CarSummary[]>;

  /**
   * 車名の検索（部分一致）
   *
   * - manufacturerId を指定すると、そのメーカー内のみ検索
   * - 空白は trim して扱う想定（ValueObject ではなく Query 側の責務）
   */
  searchCarsByName(params: { nameContains: string; manufacturerId?: string }): Promise<CarSummary[]>;

  /**
   * 指定車種の詳細情報を取得
  * @param params.carId - 車種ID（例: "プリウス"）
   * @returns 車種の詳細情報、見つからない場合は null
   */
  findCarDetail(params: { carId: string }): Promise<CarDetail | null>;

  /**
   * 指定車種・メニューの料金を取得
  * @param params.carId - 車種ID（例: "プリウス"）
   * @param params.menuId - メニューID（例: "front-set"）
   * @returns 料金（円）、見つからない場合は null
   */
  findPrice(params: { carId: string; menuId: string }): Promise<number | null>;

  /**
   * 全車種の詳細情報を取得
   * @returns 全車種の詳細情報の配列
   */
  listAllCarDetails(): Promise<CarDetail[]>;
}
