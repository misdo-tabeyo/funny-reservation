import { IGoogleSheetsClient } from 'Infrastructure/GoogleSheets/IGoogleSheetsClient';
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
    // E列: フロントセット施工時間（index 4）
    FRONT: 5, // F列: フロント
    // G列: フロント施工時間（index 6）
    FRONT_LEFT_RIGHT: 7, // H列: フロント左右
    // I列: フロント左右施工時間（index 8）
    // J列は空列（index 9）
    REAR_SET: 10, // K列: リアセット
    // L列: リアセット施工時間（index 11）
    REAR_LEFT_RIGHT: 12, // M列: リア左右
    // N列: リア左右施工時間（index 13）
    QUARTER_LEFT_RIGHT: 14, // O列: クォーター左右
    // P列: クォーター施工時間（index 15）
    REAR: 16, // Q列: リア
    // R列: リア施工時間（index 17）
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
      // 料金表以外のシートが混ざっても落ちないよう、まず ID として妥当かをチェック
      let manufacturerIdVO: ManufacturerId;
      try {
        manufacturerIdVO = GoogleSheetsPricingQuery.toManufacturerId(sheetName);
      } catch {
        continue;
      }

      const data = await this.client.getValues({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:R1000`, // A-R列、最大1000行
      });

      // 3行目以降がデータ（1-2行目はヘッダー）
      const dataRows = data.values.slice(2).filter((row) => {
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

    const data = await this.client.getValues({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:R1000`,
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
    const sheetNames = await this.client.listSheetNames({
      spreadsheetId: this.spreadsheetId,
    });

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
    const data = await this.client.getValues({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:R1000`,
    });

    const carDetails: CarDetail[] = [];
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

  const carId = new CarId(carName);

      // メニュー別情報を抽出
      const menus: CarMenuItem[] = [];
      for (const [columnIndex, menuId] of Object.entries(
        GoogleSheetsPricingQuery.COLUMN_TO_MENU_ID,
      )) {
        const menuIdVO = new FilmMenuId(menuId);
        const price = this.parsePrice(row, parseInt(columnIndex, 10));

        menus.push({
          menuId,
          menuName: menuIdVO.getDisplayName(),
          price,
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

}
