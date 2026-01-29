import { BookingSlotAvailabilityDomainService } from 'Domain/services/Booking/BookingSlotAvailabilityDomainService/BookingSlotAvailabilityDomainService';
import { CarId } from 'Domain/models/Booking/CarId/CarId';
import { MenuId } from 'Domain/models/Booking/MenuId/MenuId';
import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import { IBookingCalendarEventRepository } from 'Application/Booking/IBookingCalendarEventRepository';
import { ProvisionalBookingDTO } from 'Application/Booking/ProvisionalBookingDTO';
import {
  CheckBookingEligibilityApplicationService,
} from 'Application/Booking/CheckBookingEligibilityApplicationService/CheckBookingEligibilityApplicationService';
import { IPricingQuery } from 'Application/Pricing/IPricingQuery';

export type CreateProvisionalBookingCommand = {
  carId: string;
  menuId: string;
  startAt: string; // ISO (ミリ秒+09:00必須)
  durationMinutes: number;

  // 業務必須（仮予約でも必須）
  customerName: string;
  phoneNumber: string;

  // 受付チャネル（任意）
  channel?: string; // 例: "LINE"
};

export class CreateProvisionalBookingApplicationService {
  constructor(
    private readonly availabilityDomainService: BookingSlotAvailabilityDomainService,
    private readonly bookingCalendarEventRepository: IBookingCalendarEventRepository,
    private readonly pricingQuery: IPricingQuery,
    private readonly eligibilityService?: CheckBookingEligibilityApplicationService,
  ) {}

  async execute(command: CreateProvisionalBookingCommand): Promise<ProvisionalBookingDTO> {
    const carId = new CarId(command.carId);
    const menuId = new MenuId(command.menuId);
    const startAt = new DateTime(command.startAt);
    const duration = new Duration(command.durationMinutes);
    const timeRange = new TimeRange(startAt, duration);

    // 料金表から車種情報とメニュー情報を取得
    const pricing = await this.pricingQuery.findCarPricing({ carId: carId.value });
    if (!pricing) {
      throw new Error('指定された車種が料金表に存在しません');
    }

    const menuPrice = pricing.prices.find((p) => p.menuId === menuId.value);
    if (!menuPrice || menuPrice.amount === null) {
      throw new Error('指定されたメニューが料金表に存在しません');
    }

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

    const title = this.buildTitle({
      carName: pricing.carName,
      menuName: menuPrice.menuName,
      customerName: command.customerName,
    });
    const description = this.buildDescription({
      carName: pricing.carName,
      menuName: menuPrice.menuName,
      customerName: command.customerName,
      phoneNumber: command.phoneNumber,
      channel: command.channel,
    });

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

  private buildTitle(params: {
    carName: string;
    menuName: string;
    customerName: string;
  }): string {
    // 運用テンプレ：タイトルは検索しやすく
    // 例：【仮】プリウス フロントセット（棚原）
    return `【仮】${params.carName} ${params.menuName}（${params.customerName}）`;
  }

  private buildDescription(params: {
    carName: string;
    menuName: string;
    customerName: string;
    phoneNumber: string;
    channel?: string;
  }): string | undefined {
    const lines: string[] = [];
    lines.push(`氏名: ${params.customerName}`);
    lines.push(`電話番号: ${params.phoneNumber}`);
    lines.push(`車種: ${params.carName}`);
    lines.push(`内容: ${params.menuName}`);
    if (params.channel) lines.push(`受付: ${params.channel}`);
    return lines.length ? lines.join('\n') : undefined;
  }
}
