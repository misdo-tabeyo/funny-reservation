import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import { BookingSlotRuleDomainService } from './BookingSlotRuleDomainService';

describe('BookingSlotRuleDomainService', () => {
  describe('business hours (JST)', () => {
    it('rejects slots starting before 10:00', () => {
      const tr = new TimeRange(new DateTime('2026-01-18T09:00:00.000+09:00'), new Duration(60));
      const result = BookingSlotRuleDomainService.canBook(tr, {
        existingBookingsCount: 1,
      });

      expect(result.ok).toBe(false);
    });

    it('rejects slots ending after 18:00', () => {
      const tr = new TimeRange(new DateTime('2026-01-18T18:00:00.000+09:00'), new Duration(60));
      const result = BookingSlotRuleDomainService.canBook(tr, {
        existingBookingsCount: 1,
      });

      expect(result.ok).toBe(false);
    });

    it('allows slots fully within 10:00-18:00', () => {
      const tr = new TimeRange(new DateTime('2026-01-18T17:00:00.000+09:00'), new Duration(60));
      const result = BookingSlotRuleDomainService.canBook(tr, {
        existingBookingsCount: 1,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('rules when no existing bookings', () => {
    it('strict rule (duration > 5h) allows only at 10/11/12', () => {
      const ok10 = BookingSlotRuleDomainService.canBook(
        new TimeRange(new DateTime('2026-01-18T10:00:00.000+09:00'), new Duration(360)),
        { existingBookingsCount: 0 },
      );
      const ok12 = BookingSlotRuleDomainService.canBook(
        new TimeRange(new DateTime('2026-01-18T12:00:00.000+09:00'), new Duration(360)),
        { existingBookingsCount: 0 },
      );
      const ng14 = BookingSlotRuleDomainService.canBook(
        new TimeRange(new DateTime('2026-01-18T14:00:00.000+09:00'), new Duration(360)),
        { existingBookingsCount: 0 },
      );

      expect(ok10.ok).toBe(true);
      expect(ok12.ok).toBe(true);
      expect(ng14.ok).toBe(false);
    });

    it('relaxed rule (duration <= 5h) allows only at 10 or 14', () => {
      const ok10 = BookingSlotRuleDomainService.canBook(
        new TimeRange(new DateTime('2026-01-18T10:00:00.000+09:00'), new Duration(60)),
        { existingBookingsCount: 0 },
      );
      const ok14 = BookingSlotRuleDomainService.canBook(
        new TimeRange(new DateTime('2026-01-18T14:00:00.000+09:00'), new Duration(60)),
        { existingBookingsCount: 0 },
      );
      const ng11 = BookingSlotRuleDomainService.canBook(
        new TimeRange(new DateTime('2026-01-18T11:00:00.000+09:00'), new Duration(60)),
        { existingBookingsCount: 0 },
      );

      expect(ok10.ok).toBe(true);
      expect(ok14.ok).toBe(true);
      expect(ng11.ok).toBe(false);
    });
  });

  describe('rules when existing bookings >= 1', () => {
    it('rejects strict rule (duration > 5h) when there is at least one existing booking', () => {
      const tr = new TimeRange(new DateTime('2026-01-18T10:00:00.000+09:00'), new Duration(360));
      const result = BookingSlotRuleDomainService.canBook(tr, {
        existingBookingsCount: 1,
      });
      expect(result.ok).toBe(false);
    });

    it('allows relaxed rule (duration <= 5h) within business hours when there is at least one existing booking', () => {
      const tr = new TimeRange(new DateTime('2026-01-18T14:00:00.000+09:00'), new Duration(120));
      const result = BookingSlotRuleDomainService.canBook(tr, {
        existingBookingsCount: 1,
      });
      expect(result.ok).toBe(true);
    });
  });
});
