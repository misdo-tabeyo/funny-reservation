import { IPricingQuery } from '../IPricingQuery';
import { ManufacturerDTO } from './ManufacturerDTO';

export type GetManufacturersResult = {
  manufacturers: ManufacturerDTO[];
};

/**
 * メーカー一覧取得のアプリケーションサービス
 */
export class GetManufacturersApplicationService {
  constructor(private readonly pricingQuery: IPricingQuery) {}

  async execute(): Promise<GetManufacturersResult> {
    const manufacturers = await this.pricingQuery.listManufacturers();

    return {
      manufacturers: manufacturers.map((m) =>
        ManufacturerDTO.create({
          id: m.id,
          name: m.name,
          carCount: m.carCount,
        }),
      ),
    };
  }
}
