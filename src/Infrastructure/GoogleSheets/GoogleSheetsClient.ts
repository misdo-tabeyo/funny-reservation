import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { IGoogleSheetsClient, SheetData } from './IGoogleSheetsClient';

export type GoogleSheetsClientConfig = {
  serviceAccountEmail: string;
  privateKey: string;
};

/**
 * Google Sheets API クライアントの実装
 * googleapis ライブラリをラップして、型安全なインターフェースを提供
 */
export class GoogleSheetsClient implements IGoogleSheetsClient {
  private readonly sheets: sheets_v4.Sheets;

  constructor(config: GoogleSheetsClientConfig) {
    const auth = new JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async listSheetNames(params: { spreadsheetId: string }): Promise<string[]> {
    const res = await this.sheets.spreadsheets.get({
      spreadsheetId: params.spreadsheetId,
    });

    const sheets = res.data.sheets ?? [];
    return sheets
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => !!title);
  }

  async getValues(params: { spreadsheetId: string; range: string }): Promise<SheetData> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: params.spreadsheetId,
      range: params.range,
    });

    const values = res.data.values ?? [];
    return { values };
  }
}
