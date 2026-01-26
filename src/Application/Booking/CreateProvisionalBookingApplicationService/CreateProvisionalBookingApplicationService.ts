import { BookingSlotAvailabilityDomainService } from 'Domain/services/Booking/BookingSlotAvailabilityDomainService/BookingSlotAvailabilityDomainService';
import { CarId } from 'Domain/models/Booking/CarId/CarId';
import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import { IBookingCalendarEventRepository } from 'Application/Booking/IBookingCalendarEventRepository';
import { ProvisionalBookingDTO } from 'Application/Booking/ProvisionalBookingDTO';
import {
  CheckBookingEligibilityApplicationService,
} from 'Application/Booking/CheckBookingEligibilityApplicationService/CheckBookingEligibilityApplicationService';

export type CreateProvisionalBookingCommand = {
  carId: string;
  startAt: string; // ISO (ミリ秒+Z必須)
  durationMinutes: number;

  // 業務必須（仮予約でも必須）
  customerName: string;
  phoneNumber: string;

  // カレンダー表示用（任意）
  carModelName?: string;
  menuLabel?: string; // 例: "リア5面"
  channel?: string;   // 例: "LINE"
};

export class CreateProvisionalBookingApplicationService {
  constructor(
    private readonly availabilityDomainService: BookingSlotAvailabilityDomainService,
    private readonly bookingCalendarEventRepository: IBookingCalendarEventRepository,
    private readonly eligibilityService?: CheckBookingEligibilityApplicationService,
  ) {}

  async execute(command: CreateProvisionalBookingCommand): Promise<ProvisionalBookingDTO> {
    const carId = new CarId(command.carId);
    const startAt = new DateTime(command.startAt);
    const duration = new Duration(command.durationMinutes);
    const timeRange = new TimeRange(startAt, duration);

    // 予約可否判定（恒久）。Presentation層が組み立てた場合のみ適用する。
    if (this.eligibilityService) {
      const eligibility = await this.eligibilityService.execute({
        startAt: startAt.value, // canonical
        durationMinutes: duration.minutes,
      });

      if (!eligibility.bookable) {
        // reasons はUI/ログ向け。ここはメッセージとして連結して返す。
        throw new Error(eligibility.reasons.join(' / ') || '予約できません');
      }
    }

    // 可用性チェック（Googleカレンダーが正）
    // - 重複 + 予約間バッファ(既定60分) をここでも保証する
    const unavailable = await this.availabilityDomainService.execute({ timeRange });
    if (unavailable) {
      throw new Error('指定の枠は既に埋まっているか、予約間バッファを確保できません');
    }

    const title = this.buildTitle(command);
    const description = this.buildDescription(command);

    // 仮予定を作成（枠を占有するのが目的）
    const { eventId } = await this.bookingCalendarEventRepository.createProvisionalEvent({
      carId,
      timeRange,
      title,
      description,
    });

    return ProvisionalBookingDTO.create({
      carId: command.carId,
      startAt: startAt.value, // canonical
      durationMinutes: duration.minutes,
      calendarEventId: eventId,
    });
  }

  private buildTitle(command: CreateProvisionalBookingCommand): string {
    // 運用テンプレ：タイトルは検索しやすく
    // 例：【仮】プリウス リア5面（棚原）
    const parts: string[] = ['【仮】'];
    if (command.carModelName) parts.push(command.carModelName);
    if (command.menuLabel) parts.push(command.menuLabel);
    parts.push(`（${command.customerName}）`);
    return parts.join(' ').trim();
  }

  private buildDescription(command: CreateProvisionalBookingCommand): string | undefined {
    const lines: string[] = [];
    lines.push(`氏名: ${command.customerName}`);
    lines.push(`電話番号: ${command.phoneNumber}`);
    if (command.carModelName) lines.push(`車種: ${command.carModelName}`);
    if (command.menuLabel) lines.push(`内容: ${command.menuLabel}`);
    if (command.channel) lines.push(`受付: ${command.channel}`);
    return lines.length ? lines.join('\n') : undefined;
  }
}
