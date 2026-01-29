import { IPricingQuery } from '../IPricingQuery';
import { CarDTO } from './CarDTO';
import { ManufacturerId } from 'Domain/models/Pricing/ManufacturerId/ManufacturerId';

export type GetCarsByManufacturerQuery = {
  manufacturerId: string;
};

export type GetCarsByManufacturerResult = {
  manufacturer: {
    id: string;
    name: string;
  };
  cars: CarDTO[];
};

/**
 * メーカー別車種一覧取得のアプリケーションサービス
 */
export class GetCarsByManufacturerApplicationService {
  constructor(private readonly pricingQuery: IPricingQuery) {}

  async execute(query: GetCarsByManufacturerQuery): Promise<GetCarsByManufacturerResult> {
    // メーカーIDのバリデーション（manufacturerId はシート名と同値扱い）
    const manufacturerId = new ManufacturerId(query.manufacturerId);

    const cars = await this.pricingQuery.listCarsByManufacturer({
      manufacturerId: manufacturerId.value,
    });

    return {
      manufacturer: {
        id: manufacturerId.value,
        name: manufacturerId.getDisplayName(),
      },
      cars: cars.map((c) =>
        CarDTO.create({
          id: c.id,
          name: c.name,
          nameReading: c.nameReading,
          manufacturer: c.manufacturer,
        }),
      ),
    };
  }
}
