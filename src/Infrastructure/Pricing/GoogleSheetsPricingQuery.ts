import { IGoogleSheetsClient, SheetData } from 'Infrastructure/GoogleSheets/IGoogleSheetsClient';
import {
  IPricingQuery,
  ManufacturerSummary,
  CarSummary,
  CarDetail,
  CarMenuItem,
} from 'Application/Pricing/IPricingQuery';
import { ManufacturerId } from 'Domain/models/Pricing/ManufacturerId/ManufacturerId';
import { CarId } from 'Domain/models/Pricing/CarId/CarId';
import { FilmMenuId } from 'Domain/models/Pricing/FilmMenuId/FilmMenuId';

/**
 * Sheets API 読み取りの短期キャッシュ。
 *
 * - 1リクエスト内で listAllCarDetails が複数回呼ばれても実読み取りを1回にする
 * - GPTの連続呼び出しで Sheets API の分間読み取りクォータに当たるのを防ぐ
 *   （クォータ超過は 500 として露出していた）
 * - クエリのインスタンスはリクエスト毎に生成されるため、モジュールスコープで保持する
 */
const READ_CACHE_TTL_MS = 60_000;
const readCache = new Map<string, { promise: Promise<unknown>; expiresAt: number }>();

async function cachedRead<T>(key: string, read: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = readCache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.promise as Promise<T>;
  }

  const promise = read();
  readCache.set(key, { promise, expiresAt: now + READ_CACHE_TTL_MS });
  // 失敗はキャッシュしない（次の呼び出しで再試行させる）
  promise.catch(() => readCache.delete(key));
  return promise;
}

/** テスト用: 読み取りキャッシュを破棄する */
export function clearPricingReadCache(): void {
  readCache.clear();
}

/**
 * Google Sheets から料金情報を取得するクエリ実装
 */
export class GoogleSheetsPricingQuery implements IPricingQuery {
  // シート名をそのまま manufacturerId として扱う（列構成変更なしで拡張可能にする）
  private static toManufacturerId(sheetName: string): ManufacturerId {
    return new ManufacturerId(sheetName);
  }

  // 料金表の列インデックス（0始まり）
  private static readonly COLUMN_INDEX = {
    MANUFACTURER: 0, // A列: メーカー名
    CAR_NAME: 1, // B列: 車種名
    CAR_NAME_READING: 2, // C列: 車種読み
    FRONT_SET: 3, // D列: フロントセット
    FRONT_SET_DURATION: 4, // E列: フロントセット施工時間
    FRONT: 5, // F列: フロント
    FRONT_DURATION: 6, // G列: フロント施工時間
    FRONT_LEFT_RIGHT: 7, // H列: フロント左右
    FRONT_LEFT_RIGHT_DURATION: 8, // I列: フロント左右施工時間
    // J列は空列（index 9）
    REAR_SET: 10, // K列: リアセット
    REAR_SET_DURATION: 11, // L列: リアセット施工時間
    REAR_LEFT_RIGHT: 12, // M列: リア左右
    REAR_LEFT_RIGHT_DURATION: 13, // N列: リア左右施工時間
    QUARTER_LEFT_RIGHT: 14, // O列: クォーター左右
    QUARTER_LEFT_RIGHT_DURATION: 15, // P列: クォーター施工時間
    REAR: 16, // Q列: リア
    REAR_DURATION: 17, // R列: リア施工時間
  };

  // 列インデックス → メニューID のマッピング
  private static readonly COLUMN_TO_MENU_ID: Record<number, string> = {
    [GoogleSheetsPricingQuery.COLUMN_INDEX.FRONT_SET]: 'front-set',
    [GoogleSheetsPricingQuery.COLUMN_INDEX.FRONT]: 'front',
    [GoogleSheetsPricingQuery.COLUMN_INDEX.FRONT_LEFT_RIGHT]: 'front-left-right',
    [GoogleSheetsPricingQuery.COLUMN_INDEX.REAR_SET]: 'rear-set',
    [GoogleSheetsPricingQuery.COLUMN_INDEX.REAR_LEFT_RIGHT]: 'rear-left-right',
    [GoogleSheetsPricingQuery.COLUMN_INDEX.QUARTER_LEFT_RIGHT]: 'quarter-left-right',
    [GoogleSheetsPricingQuery.COLUMN_INDEX.REAR]: 'rear',
  };

  // 価格列インデックス → 施工時間列インデックス
  private static readonly PRICE_COLUMN_TO_DURATION_COLUMN: Record<number, number> = {
    [GoogleSheetsPricingQuery.COLUMN_INDEX.FRONT_SET]:
      GoogleSheetsPricingQuery.COLUMN_INDEX.FRONT_SET_DURATION,
    [GoogleSheetsPricingQuery.COLUMN_INDEX.FRONT]: GoogleSheetsPricingQuery.COLUMN_INDEX.FRONT_DURATION,
    [GoogleSheetsPricingQuery.COLUMN_INDEX.FRONT_LEFT_RIGHT]:
      GoogleSheetsPricingQuery.COLUMN_INDEX.FRONT_LEFT_RIGHT_DURATION,
    [GoogleSheetsPricingQuery.COLUMN_INDEX.REAR_SET]: GoogleSheetsPricingQuery.COLUMN_INDEX.REAR_SET_DURATION,
    [GoogleSheetsPricingQuery.COLUMN_INDEX.REAR_LEFT_RIGHT]:
      GoogleSheetsPricingQuery.COLUMN_INDEX.REAR_LEFT_RIGHT_DURATION,
    [GoogleSheetsPricingQuery.COLUMN_INDEX.QUARTER_LEFT_RIGHT]:
      GoogleSheetsPricingQuery.COLUMN_INDEX.QUARTER_LEFT_RIGHT_DURATION,
    [GoogleSheetsPricingQuery.COLUMN_INDEX.REAR]: GoogleSheetsPricingQuery.COLUMN_INDEX.REAR_DURATION,
  };

  // ヘッダー行を先頭から探す最大行数
  private static readonly HEADER_SEARCH_ROWS = 10;
  // ヘッダー行の車名列に入っているラベル
  private static readonly HEADER_CAR_NAME_LABEL = '車名';

  constructor(
    private readonly client: IGoogleSheetsClient,
    private readonly spreadsheetId: string,
  ) {}

  private listSheetNamesCached(): Promise<string[]> {
    return cachedRead(`sheets:${this.spreadsheetId}`, () =>
      this.client.listSheetNames({ spreadsheetId: this.spreadsheetId }),
    );
  }

  private getSheetValuesCached(sheetName: string): Promise<SheetData> {
    const range = `${sheetName}!A1:R1000`; // A-R列、最大1000行
    return cachedRead(`values:${this.spreadsheetId}:${range}`, () =>
      this.client.getValues({ spreadsheetId: this.spreadsheetId, range }),
    );
  }

  /**
   * 料金表のヘッダー行（車名列が「車名」の行）を探し、データ開始行のインデックスを返す。
   *
   * シートは店舗側で編集されるため、ヘッダーの行位置を固定で仮定しない。
   * ヘッダーが見つからないシート（表紙・注意書き等）は料金表ではないので null を返す。
   */
  private findDataStartIndex(values: (string | number)[][]): number | null {
    const searchLimit = Math.min(values.length, GoogleSheetsPricingQuery.HEADER_SEARCH_ROWS);
    for (let i = 0; i < searchLimit; i++) {
      const carNameCell = this.getCellValue(values[i], GoogleSheetsPricingQuery.COLUMN_INDEX.CAR_NAME);
      if (carNameCell === GoogleSheetsPricingQuery.HEADER_CAR_NAME_LABEL) {
        return i + 1;
      }
    }
    return null;
  }

  async listManufacturers(): Promise<ManufacturerSummary[]> {
    const sheetNames = await this.listSheetNamesCached();

    const manufacturers: ManufacturerSummary[] = [];

    for (const sheetName of sheetNames) {
      // 料金表以外のシートが混ざっても落ちないよう、まず ID として妥当かをチェック
      let manufacturerIdVO: ManufacturerId;
      try {
        manufacturerIdVO = GoogleSheetsPricingQuery.toManufacturerId(sheetName);
      } catch {
        continue;
      }

      const data = await this.getSheetValuesCached(sheetName);

      const dataStartIndex = this.findDataStartIndex(data.values);
      if (dataStartIndex === null) continue; // 料金表シートではない（表紙・注意書き等）

      const dataRows = data.values.slice(dataStartIndex).filter((row) => {
        const carName = this.getCellValue(row, GoogleSheetsPricingQuery.COLUMN_INDEX.CAR_NAME);
        return !!carName; // 車種名が存在する行のみカウント
      });

      manufacturers.push({
        id: manufacturerIdVO.value,
        name: manufacturerIdVO.getDisplayName(),
        carCount: dataRows.length,
      });
    }

    return manufacturers;
  }

  async listCarsByManufacturer(params: { manufacturerId: string }): Promise<CarSummary[]> {
    // manufacturerId はシート名と同値扱い
    const sheetName = params.manufacturerId;

    // 存在しないシート名だと Sheets API の生エラー（Unable to parse range）が
    // 500 として露出するため、先にシートの存在を確認して 404 相当のエラーにする
    const sheetNames = await this.listSheetNamesCached();
    if (!sheetNames.includes(sheetName)) {
      throw new Error(
        `未対応のメーカーです: ${sheetName}。有効なメーカーIDは /pricing/manufacturers で取得できます`,
      );
    }

    const data = await this.getSheetValuesCached(sheetName);

    const dataStartIndex = this.findDataStartIndex(data.values);
    if (dataStartIndex === null) {
      // シートは存在するが料金表ではない（表紙・注意書き等）
      throw new Error(
        `未対応のメーカーです: ${sheetName}。有効なメーカーIDは /pricing/manufacturers で取得できます`,
      );
    }

    const cars: CarSummary[] = [];
    let currentManufacturer = sheetName; // デフォルトはシート名

    for (let i = dataStartIndex; i < data.values.length; i++) {
      const row = data.values[i];

      // メーカー名セルが空でない場合は更新
      const manufacturerCell = this.getCellValue(
        row,
        GoogleSheetsPricingQuery.COLUMN_INDEX.MANUFACTURER,
      );
      if (manufacturerCell) {
        currentManufacturer = manufacturerCell;
      }

      const carName = this.getCellValue(row, GoogleSheetsPricingQuery.COLUMN_INDEX.CAR_NAME);
      const carNameReading = this.getCellValue(
        row,
        GoogleSheetsPricingQuery.COLUMN_INDEX.CAR_NAME_READING,
      );

      if (!carName) continue; // 車種名がない行はスキップ

  // 列構成を変えられない前提のため、B列（車名）をそのまま CarId として扱う。
  // 日本語・記号込みでも ValueObject 側で許容し、未知の車名でも落ちないようにする。
  const carId = new CarId(carName);

      cars.push({
        id: carId.value,
        name: carName,
        nameReading: carNameReading || carName,
        manufacturer: currentManufacturer,
      });
    }

    return cars;
  }

  async searchCarsByName(params: {
    nameContains: string;
    manufacturerId?: string;
  }): Promise<CarSummary[]> {
    const keyword = params.nameContains.trim();
    if (!keyword) return [];

    const normalizedKeyword = keyword.toLocaleLowerCase('ja-JP');

    const allCarDetails = await this.listAllCarDetails();

    const matched = allCarDetails.filter((c) => {
      if (params.manufacturerId && c.manufacturer !== params.manufacturerId) return false;
      const normalizedName = c.carName.toLocaleLowerCase('ja-JP');
      return normalizedName.includes(normalizedKeyword);
    });

    // carId (=carName) の重複があり得るので重複排除
    const uniqueById = new Map<string, CarSummary>();
    for (const c of matched) {
      if (uniqueById.has(c.carId)) continue;
      uniqueById.set(c.carId, {
        id: c.carId,
        name: c.carName,
        nameReading: c.carNameReading,
        manufacturer: c.manufacturer,
      });
    }

    return [...uniqueById.values()];
  }

  async findCarDetail(params: { carId: string }): Promise<CarDetail | null> {
    const allCarDetails = await this.listAllCarDetails();
    return allCarDetails.find((c) => c.carId === params.carId) ?? null;
  }

  async findPrice(params: { carId: string; menuId: string }): Promise<number | null> {
    const carDetail = await this.findCarDetail({ carId: params.carId });
    if (!carDetail) return null;

    const menuItem = carDetail.menus.find((m) => m.menuId === params.menuId);
    return menuItem?.price ?? null;
  }

  async listAllCarDetails(): Promise<CarDetail[]> {
    const sheetNames = await this.listSheetNamesCached();

    const allCarDetails: CarDetail[] = [];

    for (const sheetName of sheetNames) {
      // 料金表以外のシートが混ざっても落ちないようにスキップ
      try {
        GoogleSheetsPricingQuery.toManufacturerId(sheetName);
      } catch {
        continue;
      }

      const carDetails = await this.getCarDetailsFromSheet(sheetName);
      allCarDetails.push(...carDetails);
    }

    return allCarDetails;
  }

  /**
   * 指定シートから車種詳細情報を取得
   */
  private async getCarDetailsFromSheet(sheetName: string): Promise<CarDetail[]> {
    const data = await this.getSheetValuesCached(sheetName);

    const dataStartIndex = this.findDataStartIndex(data.values);
    if (dataStartIndex === null) return []; // 料金表シートではない（表紙・注意書き等）

    const carDetails: CarDetail[] = [];
    let currentManufacturer = sheetName;

    for (let i = dataStartIndex; i < data.values.length; i++) {
      const row = data.values[i];

      const manufacturerCell = this.getCellValue(
        row,
        GoogleSheetsPricingQuery.COLUMN_INDEX.MANUFACTURER,
      );
      if (manufacturerCell) {
        currentManufacturer = manufacturerCell;
      }

      const carName = this.getCellValue(row, GoogleSheetsPricingQuery.COLUMN_INDEX.CAR_NAME);
      const carNameReading = this.getCellValue(
        row,
        GoogleSheetsPricingQuery.COLUMN_INDEX.CAR_NAME_READING,
      );

      if (!carName) continue;

  const carId = new CarId(carName);

      // メニュー別情報を抽出
      const menus: CarMenuItem[] = [];
      for (const [columnIndex, menuId] of Object.entries(
        GoogleSheetsPricingQuery.COLUMN_TO_MENU_ID,
      )) {
        const menuIdVO = new FilmMenuId(menuId);
        const priceColumnIndex = parseInt(columnIndex, 10);
        const price = this.parsePrice(row, priceColumnIndex);

        const durationColumnIndex =
          GoogleSheetsPricingQuery.PRICE_COLUMN_TO_DURATION_COLUMN[priceColumnIndex];
        const durationHours = this.parseDurationHours(row, durationColumnIndex);

        menus.push({
          menuId,
          menuName: menuIdVO.getDisplayName(),
          price,
          durationHours,
        });
      }

      carDetails.push({
        carId: carId.value,
        carName,
        carNameReading: carNameReading || carName,
        manufacturer: currentManufacturer,
        menus,
      });
    }

    return carDetails;
  }

  /**
   * セルの値を文字列として取得
   */
  private getCellValue(row: (string | number)[], index: number): string {
    const value = row[index];
    if (value === null || value === undefined) return '';
    return typeof value === 'string' ? value.trim() : String(value);
  }

  /**
   * セルの値を料金（数値）としてパース
   */
  private parsePrice(row: (string | number)[], index: number): number | null {
    const value = row[index];
    if (value === null || value === undefined || value === '') return null;

    const num = typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isNaN(num) ? null : num;
  }

  /**
   * セルの値を施工時間（時間, 整数）としてパース
   *
   * 料金表側の運用が揺れても落ちにくいように、以下を許容する:
   * - "5" -> 5時間
   * - "300" -> 300分とみなして 5時間（>=24 なら分の可能性が高い）
   * - "4.5" -> 5時間（予約は1時間単位のため切り上げ）
   */
  private parseDurationHours(row: (string | number)[], index: number): number | null {
    const value = row[index];
    if (value === null || value === undefined || value === '') return null;

    const raw = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(raw) || raw <= 0) return null;

    // 24以上は「分」で入っている可能性が高い（例: 300）ので分として扱う
    const hours = raw >= 24 ? raw / 60 : raw;

    const ceiled = Math.ceil(hours);
    if (!Number.isFinite(ceiled) || ceiled < 1) return null;
    return ceiled;
  }

}
