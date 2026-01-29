export type SheetData = {
  values: (string | number)[][];
};

/**
 * Google Sheets API の低レベルクライアント
 * スプレッドシートの読み取り操作を提供
 */
export interface IGoogleSheetsClient {
  /**
   * スプレッドシート内の全シート名を取得
   * @param params.spreadsheetId - スプレッドシートID
   * @returns シート名の配列
   */
  listSheetNames(params: { spreadsheetId: string }): Promise<string[]>;

  /**
   * 指定範囲のセルデータを取得
   * @param params.spreadsheetId - スプレッドシートID
   * @param params.range - 範囲指定（例: "トヨタ!A1:K500"）
   * @returns セルデータ（2次元配列）
   */
  getValues(params: { spreadsheetId: string; range: string }): Promise<SheetData>;
}
