export type ManufacturerDTOProps = {
  id: string;
  name: string;
  carCount: number;
};

export class ManufacturerDTO {
  private constructor(private readonly props: ManufacturerDTOProps) {}

  static create(props: ManufacturerDTOProps): ManufacturerDTO {
    return new ManufacturerDTO(props);
  }

  toJSON(): ManufacturerDTOProps {
    return this.props;
  }

  get value(): ManufacturerDTOProps {
    return this.props;
  }
}
