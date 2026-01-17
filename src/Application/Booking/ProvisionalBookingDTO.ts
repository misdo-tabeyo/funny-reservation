export type ProvisionalBookingDTOProps = {
  carId: string;
  startAt: string; // ISO (YYYY-MM-DDTHH:mm:ss.SSSZ)
  durationMinutes: number;
  calendarEventId: string; // Google Calendar event id
};

export class ProvisionalBookingDTO {
  private constructor(private readonly props: ProvisionalBookingDTOProps) {}

  static create(props: ProvisionalBookingDTOProps): ProvisionalBookingDTO {
    return new ProvisionalBookingDTO(props);
  }

  toJSON(): ProvisionalBookingDTOProps {
    return this.props;
  }

  get value(): ProvisionalBookingDTOProps {
    return this.props;
  }
}
