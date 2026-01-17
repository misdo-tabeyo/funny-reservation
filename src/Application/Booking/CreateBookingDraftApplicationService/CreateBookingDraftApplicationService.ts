import { Booking } from 'Domain/models/Booking/Booking';
import { BookingId } from 'Domain/models/Booking/BookingId/BookingId';
import { CarId } from 'Domain/models/Booking/CarId/CarId';
import { MenuId } from 'Domain/models/Booking/MenuId/MenuId';
import { OptionId } from 'Domain/models/Booking/OptionId/OptionId';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';
import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Money } from 'Domain/models/shared/Money/Money';
import { BookingSlotDuplicationCheckDomainService } from 'Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService';
import { BookingDTO } from '../BookingDTO';

export type CreateBookingDraftCommand = {
  bookingId: string;
  carId: string;
  menuId: string;
  optionIds: string[];
  startAt: string; // ISO String
  durationMinutes: number;
  priceAmount: number;
  priceCurrency: 'JPY';
};

export class CreateBookingDraftApplicationService {
  constructor(
    private readonly duplicationCheckDomainService = new BookingSlotDuplicationCheckDomainService(),
  ) {}

  /**
   * 予約ドラフトを作成する
   * - 予約枠が重複していればエラー
   * - Domain Entity は外へ出さず DTO を返す
   */
  async execute(command: CreateBookingDraftCommand): Promise<BookingDTO> {
    const bookingId = new BookingId(command.bookingId);
    const carId = new CarId(command.carId);
    const menuId = new MenuId(command.menuId);
    const optionIds = command.optionIds.map((id) => new OptionId(id));

    const startAt = new DateTime(command.startAt);
    const duration = new Duration(command.durationMinutes);
    const timeRange = new TimeRange(startAt, duration);

    const price = new Money({
      amount: command.priceAmount,
      currency: command.priceCurrency,
    });

    // === 重複チェック (Domain Service) ===
    const isDuplicated = await this.duplicationCheckDomainService.execute({ carId, timeRange });

    if (isDuplicated) {
      throw new Error('指定した時間枠はすでに予約が入っています');
    }

    // === Booking Draft 作成 ===
    const booking = Booking.create({
      bookingId,
      carId,
      menuId,
      optionIds,
      timeRange,
      price,
    });

    return BookingDTO.from(booking);
  }
}
