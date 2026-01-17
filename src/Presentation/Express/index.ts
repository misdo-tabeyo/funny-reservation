import 'dotenv/config';
import express, { Request, Response } from 'express';

import {
  CheckBookingSlotAvailabilityApplicationService,
  CheckBookingSlotAvailabilityQuery,
} from '../../Application/Booking/CheckBookingSlotAvailabilityApplicationService/CheckBookingSlotAvailabilityApplicationService';

import {
  CreateProvisionalBookingApplicationService,
  CreateProvisionalBookingCommand,
} from '../../Application/Booking/CreateProvisionalBookingApplicationService/CreateProvisionalBookingApplicationService';

import { BookingSlotDuplicationCheckDomainService } from '../../Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService';

import { GoogleCalendarBookingSlotAvailabilityQuery } from '../../Infrastructure/Booking/GoogleCalendarBookingSlotAvailabilityQuery';
import { GoogleCalendarBookingCalendarEventRepository } from '../../Infrastructure/Booking/GoogleCalendarBookingCalendarEventRepository';
import { GoogleCalendarClient } from '../../Infrastructure/GoogleCalendar/GoogleCalendarClient';

const app = express();
const port = 3000;

// JSON形式のリクエストボディを正しく解析するために必要
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello World!');
});

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

function buildDuplicationCheckDomainService(): BookingSlotDuplicationCheckDomainService {
  const availabilityQuery = buildGoogleCalendarAvailabilityQuery();
  return new BookingSlotDuplicationCheckDomainService(availabilityQuery);
}

function buildGoogleCalendarBookingCalendarEventRepository(): GoogleCalendarBookingCalendarEventRepository {
  const env = getGoogleCalendarEnv();
  const client = buildGoogleCalendarClient();
  return new GoogleCalendarBookingCalendarEventRepository(client, env.calendarId);
}

/**
 * 空き確認
 * GET /booking/availability?carId=...&startAt=...&durationMinutes=60
 */
app.get('/booking/availability', async (req: Request, res: Response) => {
  try {
    const query: CheckBookingSlotAvailabilityQuery = {
      carId: String(req.query.carId ?? ''),
      startAt: String(req.query.startAt ?? ''),
      durationMinutes: Number(req.query.durationMinutes ?? NaN),
    };

    const availabilityQuery = buildGoogleCalendarAvailabilityQuery();
    const applicationService = new CheckBookingSlotAvailabilityApplicationService(availabilityQuery);

    const result = await applicationService.execute(query);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

/**
 * 仮予約作成（= Googleカレンダーに【仮】予定を作成して枠を占有する）
 * POST /booking/draft
 */
app.post('/booking/draft', async (req: Request, res: Response) => {
  try {
    const requestBody = req.body as CreateProvisionalBookingCommand;

    const duplicationCheckDomainService = buildDuplicationCheckDomainService();
    const bookingCalendarEventRepository = buildGoogleCalendarBookingCalendarEventRepository();

    const applicationService = new CreateProvisionalBookingApplicationService(
      duplicationCheckDomainService,
      bookingCalendarEventRepository,
    );

    const dto = await applicationService.execute(requestBody);

    res.status(200).json(dto.toJSON());
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Example app listening on port ${port}`);
});
