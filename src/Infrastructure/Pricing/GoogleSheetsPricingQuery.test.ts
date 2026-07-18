import { GoogleSheetsPricingQuery, clearPricingReadCache } from './GoogleSheetsPricingQuery';
import { IGoogleSheetsClient, SheetData } from 'Infrastructure/GoogleSheets/IGoogleSheetsClient';

/**
 * 実シートの構造を模したフェイク:
 * - 1行目: タイトル / 2行目: 空 / 3行目: ヘッダー（B列=車名） / 4行目以降: データ
 * - 料金表ではないシート（表紙など）にはヘッダー行がない
 */
class FakeGoogleSheetsClient implements IGoogleSheetsClient {
  getValuesCallCount = 0;

  constructor(private readonly sheets: Record<string, (string | number)[][]>) {}

  async listSheetNames(_params: { spreadsheetId: string }): Promise<string[]> {
    return Object.keys(this.sheets);
  }

  async getValues(params: { spreadsheetId: string; range: string }): Promise<SheetData> {
    this.getValuesCallCount++;
    const sheetName = params.range.split('!')[0];
    const values = this.sheets[sheetName];
    if (!values) {
      throw new Error(`Unable to parse range: ${params.range}`);
    }
    return { values };
  }
}

const toyotaSheet: (string | number)[][] = [
  ['', 'トヨタ'],
  [],
  ['メーカー', '車名', '車名読み', 'フロントセット', 'フロントセット施工時間'],
  ['', 'プリウス', 'プリウス', '32000', '3'],
  ['トヨタ', 'プリウスα', 'プリウスアルファ', '33000', '3'],
  ['トヨタ', 'アクア', 'アクア', '32000', '3'],
];

const coverSheet: (string | number)[][] = [
  ['', '', 'カーフィルム施工後の注意'],
  [],
  ['', 'カーフィルム施工ご利用のお客様へ'],
];

const buildQuery = (spreadsheetId: string) => {
  const client = new FakeGoogleSheetsClient({ トヨタ: toyotaSheet, 施工後注意: coverSheet });
  const query = new GoogleSheetsPricingQuery(client, spreadsheetId);
  return { client, query };
};

describe('GoogleSheetsPricingQuery (sheet parsing)', () => {
  beforeEach(() => {
    clearPricingReadCache();
  });

  test('data starts after the header row, so the header is not parsed as a car', async () => {
    const { query } = buildQuery('sheet-header');

    const cars = await query.listCarsByManufacturer({ manufacturerId: 'トヨタ' });

    expect(cars.map((c) => c.name)).toEqual(['プリウス', 'プリウスα', 'アクア']);
    // A列が空の行はシート名がメーカーになる（ヘッダーの「メーカー」文字列を拾わない）
    expect(cars[0].manufacturer).toBe('トヨタ');
  });

  test('sheets without a header row (cover pages etc.) are not treated as manufacturers', async () => {
    const { query } = buildQuery('sheet-junk');

    const manufacturers = await query.listManufacturers();

    expect(manufacturers).toEqual([{ id: 'トヨタ', name: 'トヨタ', carCount: 3 }]);

    const details = await query.listAllCarDetails();
    expect(details.map((c) => c.carName)).toEqual(['プリウス', 'プリウスα', 'アクア']);
  });

  test('unknown manufacturer throws an unsupported-manufacturer error instead of a raw API error', async () => {
    const { query } = buildQuery('sheet-unknown');

    await expect(query.listCarsByManufacturer({ manufacturerId: 'ニッサン' })).rejects.toThrow(
      '未対応のメーカー',
    );
  });

  test('non-price sheets requested as manufacturer also throw unsupported-manufacturer', async () => {
    const { query } = buildQuery('sheet-cover-as-manufacturer');

    await expect(query.listCarsByManufacturer({ manufacturerId: '施工後注意' })).rejects.toThrow(
      '未対応のメーカー',
    );
  });

  test('sheet reads are cached, so repeated scans hit the API once', async () => {
    const { client, query } = buildQuery('sheet-cache');

    await query.listAllCarDetails();
    const callsAfterFirst = client.getValuesCallCount;
    await query.listAllCarDetails();
    await query.findCarDetail({ carId: 'アクア' });

    expect(client.getValuesCallCount).toBe(callsAfterFirst);
  });

  test('prices and durations are parsed from the correct columns', async () => {
    const { query } = buildQuery('sheet-price');

    const detail = await query.findCarDetail({ carId: 'プリウス' });

    const frontSet = detail?.menus.find((m) => m.menuId === 'front-set');
    expect(frontSet?.price).toBe(32000);
    expect(frontSet?.durationHours).toBe(3);
  });
});
