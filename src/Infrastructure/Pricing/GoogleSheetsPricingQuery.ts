import { IGoogleSheetsClient } from 'Infrastructure/GoogleSheets/IGoogleSheetsClient';
import {
  IPricingQuery,
  ManufacturerSummary,
  CarSummary,
  CarPricing,
  CarMenuPrice,
} from 'Application/Pricing/IPricingQuery';
import { ManufacturerId } from 'Domain/models/Pricing/ManufacturerId/ManufacturerId';
import { CarId } from 'Domain/models/Pricing/CarId/CarId';
import { FilmMenuId } from 'Domain/models/Pricing/FilmMenuId/FilmMenuId';

/**
 * Google Sheets から料金情報を取得するクエリ実装
 */
export class GoogleSheetsPricingQuery implements IPricingQuery {
  // シート名 → メーカーID のマッピング
  private static readonly SHEET_TO_MANUFACTURER: Record<string, string> = {
    トヨタ: 'toyota',
    レクサス: 'lexus',
    ホンダ: 'honda',
    日産: 'nissan',
    マツダ: 'mazda',
    スバル: 'subaru',
    スズキ: 'suzuki',
    ダイハツ: 'daihatsu',
    三菱: 'mitsubishi',
  };

  // 料金表の列インデックス（0始まり）
  private static readonly COLUMN_INDEX = {
    MANUFACTURER: 0, // A列: メーカー名
    CAR_NAME: 1, // B列: 車種名
    CAR_NAME_READING: 2, // C列: 車種読み
    FRONT_SET: 3, // D列: フロントセット
    FRONT: 4, // E列: フロント
    FRONT_LEFT_RIGHT: 5, // F列: フロント左右
    // G列は空列（index 6）
    REAR_SET: 7, // H列: リアセット
    REAR_LEFT_RIGHT: 8, // I列: リア左右
    QUARTER_LEFT_RIGHT: 9, // J列: クォーター左右
    REAR: 10, // K列: リア
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

  constructor(
    private readonly client: IGoogleSheetsClient,
    private readonly spreadsheetId: string,
  ) {}

  async listManufacturers(): Promise<ManufacturerSummary[]> {
    const sheetNames = await this.client.listSheetNames({
      spreadsheetId: this.spreadsheetId,
    });

    const manufacturers: ManufacturerSummary[] = [];

    for (const sheetName of sheetNames) {
      const manufacturerId = GoogleSheetsPricingQuery.SHEET_TO_MANUFACTURER[sheetName];
      if (!manufacturerId) continue; // マッピングに存在しないシートはスキップ

      const data = await this.client.getValues({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:K1000`, // A-K列、最大1000行
      });

      // 3行目以降がデータ（1-2行目はヘッダー）
      const dataRows = data.values.slice(2).filter((row) => {
        const carName = this.getCellValue(row, GoogleSheetsPricingQuery.COLUMN_INDEX.CAR_NAME);
        return !!carName; // 車種名が存在する行のみカウント
      });

      const manufacturerIdVO = new ManufacturerId(manufacturerId);

      manufacturers.push({
        id: manufacturerId,
        name: manufacturerIdVO.getDisplayName(),
        carCount: dataRows.length,
      });
    }

    return manufacturers;
  }

  async listCarsByManufacturer(params: { manufacturerId: string }): Promise<CarSummary[]> {
    const sheetName = this.getSheetNameByManufacturerId(params.manufacturerId);
    if (!sheetName) {
      throw new Error(`未対応のメーカーID: ${params.manufacturerId}`);
    }

    const data = await this.client.getValues({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:K1000`,
    });

    const cars: CarSummary[] = [];
    let currentManufacturer = sheetName; // デフォルトはシート名

    // 3行目以降がデータ
    for (let i = 2; i < data.values.length; i++) {
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

      const carId = CarId.fromNames(currentManufacturer, carName);

      cars.push({
        id: carId.value,
        name: carName,
        nameReading: carNameReading || carName,
        manufacturer: currentManufacturer,
      });
    }

    return cars;
  }

  async findCarPricing(params: { carId: string }): Promise<CarPricing | null> {
    const allPricings = await this.listAllCarPricings();
    return allPricings.find((p) => p.carId === params.carId) ?? null;
  }

  async findPrice(params: { carId: string; menuId: string }): Promise<number | null> {
    const pricing = await this.findCarPricing({ carId: params.carId });
    if (!pricing) return null;

    const menuPrice = pricing.prices.find((p) => p.menuId === params.menuId);
    return menuPrice?.amount ?? null;
  }

  async listAllCarPricings(): Promise<CarPricing[]> {
    const sheetNames = await this.client.listSheetNames({
      spreadsheetId: this.spreadsheetId,
    });

    const allPricings: CarPricing[] = [];

    for (const sheetName of sheetNames) {
      const manufacturerId = GoogleSheetsPricingQuery.SHEET_TO_MANUFACTURER[sheetName];
      if (!manufacturerId) continue;

      const pricings = await this.getPricingsFromSheet(sheetName);
      allPricings.push(...pricings);
    }

    return allPricings;
  }

  /**
   * 指定シートから料金情報を取得
   */
  private async getPricingsFromSheet(sheetName: string): Promise<CarPricing[]> {
    const data = await this.client.getValues({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:K1000`,
    });

    const pricings: CarPricing[] = [];
    let currentManufacturer = sheetName;

    for (let i = 2; i < data.values.length; i++) {
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

      const carId = CarId.fromNames(currentManufacturer, carName);

      // メニュー別料金を抽出
      const prices: CarMenuPrice[] = [];
      for (const [columnIndex, menuId] of Object.entries(
        GoogleSheetsPricingQuery.COLUMN_TO_MENU_ID,
      )) {
        const menuIdVO = new FilmMenuId(menuId);
        const amount = this.parsePrice(row, parseInt(columnIndex, 10));

        prices.push({
          menuId,
          menuName: menuIdVO.getDisplayName(),
          amount,
        });
      }

      pricings.push({
        carId: carId.value,
        carName,
        carNameReading: carNameReading || carName,
        manufacturer: currentManufacturer,
        prices,
      });
    }

    return pricings;
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
   * メーカーIDからシート名を取得
   */
  private getSheetNameByManufacturerId(manufacturerId: string): string | null {
    for (const [sheetName, id] of Object.entries(
      GoogleSheetsPricingQuery.SHEET_TO_MANUFACTURER,
    )) {
      if (id === manufacturerId) return sheetName;
    }
    return null;
  }
}
