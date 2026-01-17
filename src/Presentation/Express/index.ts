import 'dotenv/config';
import express, { Request, Response } from 'express';

import {
  CreateBookingDraftApplicationService,
  CreateBookingDraftCommand,
} from '../../Application/Booking/CreateBookingDraftApplicationService/CreateBookingDraftApplicationService';

import {
  CheckBookingSlotAvailabilityApplicationService,
  CheckBookingSlotAvailabilityQuery,
} from '../../Application/Booking/CheckBookingSlotAvailabilityApplicationService/CheckBookingSlotAvailabilityApplicationService';

import { BookingSlotDuplicationCheckDomainService } from '../../Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService';
import { GoogleCalendarBookingSlotAvailabilityQuery } from '../../Infrastructure/Booking/GoogleCalendarBookingSlotAvailabilityQuery';
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
function buildGoogleCalendarAvailabilityQuery(): GoogleCalendarBookingSlotAvailabilityQuery {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!serviceAccountEmail || !privateKey || !calendarId) {
    throw new Error(
      'Google Calendar設定が不足しています（GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_CALENDAR_ID）',
    );
  }

  const client = new GoogleCalendarClient({
    serviceAccountEmail,
    // envの改行が "\\n" になりがちなので復元
    privateKey: privateKey.replace(/\\n/g, '\n'),
  });

  return new GoogleCalendarBookingSlotAvailabilityQuery(client, calendarId);
}

function buildDuplicationCheckDomainService(): BookingSlotDuplicationCheckDomainService {
  const availabilityQuery = buildGoogleCalendarAvailabilityQuery();
  return new BookingSlotDuplicationCheckDomainService(availabilityQuery);
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
 * Draft予約作成（永続化しない）
 * POST /booking/draft
 */
app.post('/booking/draft', async (req: Request, res: Response) => {
  try {
    const requestBody = req.body as CreateBookingDraftCommand;

    const domainService = buildDuplicationCheckDomainService();
    const applicationService = new CreateBookingDraftApplicationService(domainService);

    const bookingDto = await applicationService.execute(requestBody);

    res.status(200).json(bookingDto.toJSON());
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Example app listening on port ${port}`);
});
