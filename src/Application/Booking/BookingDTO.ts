import { Booking } from 'Domain/models/Booking/Booking';

export type BookingDTOProps = {
  bookingId: string;
  customerName: string;
  phoneNumber: string;
  carId: string;
  menuId: string;
  optionIds: string[];
  startAt: string; // ISO
  durationMinutes: number;
  priceAmount: number;
  priceCurrency: 'JPY';
  status: string;
  calendarEventId: string | null;
};

export class BookingDTO {
  private constructor(private readonly props: BookingDTOProps) {}

  static from(booking: Booking): BookingDTO {
    return new BookingDTO({
      bookingId: booking.bookingId.value,
      customerName: booking.customerName.value,
      phoneNumber: booking.phoneNumber.value,
      carId: booking.carId.value,
      menuId: booking.menuId.value,
      optionIds: booking.optionIds.map((o) => o.value),

      // DateTime の実装によりけりなので、現状あなたのコードに合わせて value を維持
      startAt: booking.timeRange.startAt.value,
      durationMinutes: booking.timeRange.duration.minutes,

      // Money は getter があるので getter を使う（安全）
      priceAmount: booking.price.amount,
      priceCurrency: booking.price.currency,

      status: booking.status.value,
      calendarEventId: booking.calendarEventId ? booking.calendarEventId.value : null,
    });
  }

  toJSON(): BookingDTOProps {
    return this.props;
  }

  get value(): BookingDTOProps {
    return this.props;
  }
}
