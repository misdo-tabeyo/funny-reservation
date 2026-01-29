import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';

import {
  CheckBookingAvailabilityApplicationService,
  CheckBookingAvailabilityQuery,
} from '../../Application/Booking/CheckBookingAvailabilityApplicationService/CheckBookingAvailabilityApplicationService';

import {
  CreateProvisionalBookingApplicationService,
  CreateProvisionalBookingCommand,
} from '../../Application/Booking/CreateProvisionalBookingApplicationService/CreateProvisionalBookingApplicationService';

import {
  CheckBookingEligibilityApplicationService,
} from '../../Application/Booking/CheckBookingEligibilityApplicationService/CheckBookingEligibilityApplicationService';

import {
  GetNearestAvailableBookingSlotsApplicationService,
  GetNearestAvailableBookingSlotsQuery,
} from '../../Application/Booking/GetNearestAvailableBookingSlotsApplicationService/GetNearestAvailableBookingSlotsApplicationService';

import { BookingSlotAvailabilityDomainService } from '../../Domain/services/Booking/BookingSlotAvailabilityDomainService/BookingSlotAvailabilityDomainService';

import { GoogleCalendarBookingSlotAvailabilityQuery } from '../../Infrastructure/Booking/GoogleCalendarBookingSlotAvailabilityQuery';
import { GoogleCalendarBookingCalendarEventRepository } from '../../Infrastructure/Booking/GoogleCalendarBookingCalendarEventRepository';
import { GoogleCalendarBookingCalendarEventQuery } from '../../Infrastructure/Booking/GoogleCalendarBookingCalendarEventQuery';
import { GoogleCalendarClient } from '../../Infrastructure/GoogleCalendar/GoogleCalendarClient';

import { GetManufacturersApplicationService } from '../../Application/Pricing/GetManufacturersApplicationService/GetManufacturersApplicationService';
import { GetCarsByManufacturerApplicationService } from '../../Application/Pricing/GetCarsByManufacturerApplicationService/GetCarsByManufacturerApplicationService';
import {
  GetPriceListApplicationService,
  GetPriceListQuery,
} from '../../Application/Pricing/GetPriceListApplicationService/GetPriceListApplicationService';

import { GoogleSheetsClient } from '../../Infrastructure/GoogleSheets/GoogleSheetsClient';
import { GoogleSheetsPricingQuery } from '../../Infrastructure/Pricing/GoogleSheetsPricingQuery';

import path from 'node:path';

import {
  validateCreateProvisionalBookingCommand,
  validateCheckAvailabilityQuery,
  validateNearestAvailableSlotsQuery,
  validateGetPriceListQuery,
} from './requestValidation';

const app = express();
const port = 8080;

// JSON形式のリクエストボディを正しく解析するために必要
app.use(express.json());

// 静的ファイル配信
const publicDir = path.resolve(__dirname, 'public');
app.use(express.static(publicDir));

app.get('/privacy', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});

app.get('/openapi', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'openapi.json'));
});

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello World!');
});

/**
 * Bearer認証（API_TOKEN）
 * - Authorizationヘッダが無い/違う場合は弾く
 */
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.API_TOKEN;

  // 環境設定が漏れている場合はサーバ側の設定ミスなので 500
  if (!token) {
    res.status(500).json({ message: 'API_TOKEN is not set' });
    return;
  }

  const auth = req.header('authorization') ?? '';
  const expected = `Bearer ${token}`;

  if (auth !== expected) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
}

/**
 * Presentation 層で Infrastructure を組み立てる（Zenn に寄せて index.ts 内で実施）
 */
function getGoogleCalendarEnv(): {
  serviceAccountEmail: string;
  privateKey: string;
  calendarId: string;
} {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!serviceAccountEmail || !privateKey || !calendarId) {
    throw new Error(
      'Google Calendar設定が不足しています（GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_CALENDAR_ID）',
    );
  }

  return {
    serviceAccountEmail,
    // envの改行が "\\n" になりがちなので復元
    privateKey: privateKey.replace(/\\n/g, '\n'),
    calendarId,
  };
}

function buildGoogleCalendarClient(): GoogleCalendarClient {
  const env = getGoogleCalendarEnv();
  return new GoogleCalendarClient({
    serviceAccountEmail: env.serviceAccountEmail,
    privateKey: env.privateKey,
  });
}

function buildGoogleCalendarAvailabilityQuery(): GoogleCalendarBookingSlotAvailabilityQuery {
  const env = getGoogleCalendarEnv();
  const client = buildGoogleCalendarClient();
  return new GoogleCalendarBookingSlotAvailabilityQuery(client, env.calendarId);
}

function buildBookingSlotAvailabilityDomainService(): BookingSlotAvailabilityDomainService {
  const availabilityQuery = buildGoogleCalendarAvailabilityQuery();
  return new BookingSlotAvailabilityDomainService(availabilityQuery);
}

function buildGoogleCalendarBookingCalendarEventRepository(): GoogleCalendarBookingCalendarEventRepository {
  const env = getGoogleCalendarEnv();
  const client = buildGoogleCalendarClient();
  return new GoogleCalendarBookingCalendarEventRepository(client, env.calendarId);
}

function buildGoogleCalendarBookingCalendarEventQuery(): GoogleCalendarBookingCalendarEventQuery {
  const env = getGoogleCalendarEnv();
  const client = buildGoogleCalendarClient();
  return new GoogleCalendarBookingCalendarEventQuery(client, env.calendarId);
}

/**
 * Google Sheets の環境変数取得
 */
function getGoogleSheetsEnv(): {
  serviceAccountEmail: string;
  privateKey: string;
  spreadsheetId: string;
} {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
    throw new Error(
      'Google Sheets設定が不足しています（GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_SHEETS_SPREADSHEET_ID）',
    );
  }

  return {
    serviceAccountEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    spreadsheetId,
  };
}

function buildGoogleSheetsClient(): GoogleSheetsClient {
  const env = getGoogleSheetsEnv();
  return new GoogleSheetsClient({
    serviceAccountEmail: env.serviceAccountEmail,
    privateKey: env.privateKey,
  });
}

function buildPricingQuery(): GoogleSheetsPricingQuery {
  const env = getGoogleSheetsEnv();
  const client = buildGoogleSheetsClient();
  return new GoogleSheetsPricingQuery(client, env.spreadsheetId);
}

/**
 * 空き確認
 * GET /booking/availability?startAt=...&durationMinutes=60
 */
app.get('/booking/availability', requireAuth, async (req: Request, res: Response) => {
  try {
    const validated = validateCheckAvailabilityQuery(req.query);
    if (!validated.ok) {
      res.status(400).json({ message: validated.message });
      return;
    }

    const query: CheckBookingAvailabilityQuery = {
      startAt: validated.value.startAt,
      durationMinutes: validated.value.durationMinutes,
    };

    const calendarEventQuery = buildGoogleCalendarBookingCalendarEventQuery();
  const availabilityDomainService = buildBookingSlotAvailabilityDomainService();

    const applicationService = new CheckBookingAvailabilityApplicationService(
      calendarEventQuery,
      availabilityDomainService,
    );

    const result = await applicationService.execute(query);
    if (!result.bookable) {
      res.status(409).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

/**
 * 直近の予約可能枠を取得
 * GET /booking/available-slots/nearest?carId=...&from=...&durationMinutes=60&limit=5&searchDays=30
 */
app.get('/booking/available-slots/nearest', requireAuth, async (req: Request, res: Response) => {
  try {
    const validated = validateNearestAvailableSlotsQuery(req.query);
    if (!validated.ok) {
      res.status(400).json({ message: validated.message });
      return;
    }

    const query: GetNearestAvailableBookingSlotsQuery = {
      from: validated.value.from,
      durationMinutes: validated.value.durationMinutes,
      limit: validated.value.limit,
      searchDays: validated.value.searchDays,
    };

    const calendarEventQuery = buildGoogleCalendarBookingCalendarEventQuery();
    const applicationService = new GetNearestAvailableBookingSlotsApplicationService(calendarEventQuery);

    const result = await applicationService.execute(query);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

/**
 * メーカー一覧取得
 * GET /pricing/manufacturers
 */
app.get('/pricing/manufacturers', async (_req: Request, res: Response) => {
  try {
    const pricingQuery = buildPricingQuery();
    const applicationService = new GetManufacturersApplicationService(pricingQuery);

    const result = await applicationService.execute();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

/**
 * メーカー別車種一覧取得
 * GET /pricing/manufacturers/:manufacturerId/cars
 */
app.get('/pricing/manufacturers/:manufacturerId/cars', async (req: Request, res: Response) => {
  try {
    const manufacturerId = req.params.manufacturerId;
    if (typeof manufacturerId !== 'string') {
      res.status(400).json({ message: 'Invalid manufacturerId parameter' });
      return;
    }

    const pricingQuery = buildPricingQuery();
    const applicationService = new GetCarsByManufacturerApplicationService(pricingQuery);

    const result = await applicationService.execute({ manufacturerId });
    res.status(200).json(result);
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('未対応のメーカー')) {
      res.status(404).json({ message });
      return;
    }
    res.status(500).json({ message });
  }
});

/**
 * 料金表取得
 * GET /pricing/prices
 * GET /pricing/prices?carId=toyota-prius
 * GET /pricing/prices?carId=toyota-prius&menuId=front-set
 */
app.get('/pricing/prices', async (req: Request, res: Response) => {
  try {
    const validated = validateGetPriceListQuery(req.query);
    if (!validated.ok) {
      res.status(400).json({ message: validated.message });
      return;
    }

    const query: GetPriceListQuery = validated.value;

    const pricingQuery = buildPricingQuery();
    const applicationService = new GetPriceListApplicationService(pricingQuery);

    const dto = await applicationService.execute(query);
    res.status(200).json(dto.toJSON());
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('見つかりません')) {
      res.status(404).json({ message });
      return;
    }
    res.status(500).json({ message });
  }
});

/**
 * 仮予約作成（= Googleカレンダーに【仮】予定を作成して枠を占有する）
 * POST /booking/draft
 */
app.post('/booking/draft', requireAuth, async (req: Request, res: Response) => {
  try {
    const validated = validateCreateProvisionalBookingCommand(req.body);
    if (!validated.ok) {
      res.status(400).json({ message: validated.message });
      return;
    }

    const requestBody: CreateProvisionalBookingCommand = validated.value;

    const calendarEventQuery = buildGoogleCalendarBookingCalendarEventQuery();
  const availabilityDomainService = buildBookingSlotAvailabilityDomainService();
    const bookingCalendarEventRepository = buildGoogleCalendarBookingCalendarEventRepository();

    const eligibilityService = new CheckBookingEligibilityApplicationService(
      calendarEventQuery,
      availabilityDomainService,
    );

    const applicationService = new CreateProvisionalBookingApplicationService(
      availabilityDomainService,
      bookingCalendarEventRepository,
      eligibilityService,
    );

    const dto = await applicationService.execute(requestBody);

    res.status(200).json(dto.toJSON());
  } catch (error) {
    const message = (error as Error).message;
    // 予約不可（ルール違反 or 重複）は 409
    if (message.includes('埋まっています') || message.includes('予約')) {
      res.status(409).json({ message });
      return;
    }
    res.status(500).json({ message });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Example app listening on port ${port}`);
});
