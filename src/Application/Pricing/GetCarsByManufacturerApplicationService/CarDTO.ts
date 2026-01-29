export type CarDTOProps = {
  id: string;
  name: string;
  nameReading: string;
  manufacturer: string;
};

export class CarDTO {
  private constructor(private readonly props: CarDTOProps) {}

  static create(props: CarDTOProps): CarDTO {
    return new CarDTO(props);
  }

  toJSON(): CarDTOProps {
    return this.props;
  }

  get value(): CarDTOProps {
    return this.props;
  }
}
