import { GetPriceListApplicationService } from './GetPriceListApplicationService';
import { IPricingQuery, CarPricing, CarSummary, ManufacturerSummary } from '../IPricingQuery';

class FakePricingQuery implements IPricingQuery {
  constructor(private readonly pricings: CarPricing[]) {}

  async listManufacturers(): Promise<ManufacturerSummary[]> {
    return [];
  }

  async listCarsByManufacturer(_params: { manufacturerId: string }): Promise<CarSummary[]> {
    return [];
  }

  async searchCarsByName(params: { nameContains: string; manufacturerId?: string }): Promise<CarSummary[]> {
    const keyword = params.nameContains.trim().toLocaleLowerCase('ja-JP');
    return this.pricings
      .filter((p) => {
        if (params.manufacturerId && p.manufacturer !== params.manufacturerId) return false;
        return p.carName.toLocaleLowerCase('ja-JP').includes(keyword);
      })
      .map((p) => ({
        id: p.carId,
        name: p.carName,
        nameReading: p.carNameReading,
        manufacturer: p.manufacturer,
      }));
  }

  async findCarPricing(params: { carId: string }): Promise<CarPricing | null> {
    return this.pricings.find((p) => p.carId === params.carId) ?? null;
  }

  async findPrice(params: { carId: string; menuId: string }): Promise<number | null> {
    const p = await this.findCarPricing({ carId: params.carId });
    if (!p) return null;
    return p.prices.find((price) => price.menuId === params.menuId)?.amount ?? null;
  }

  async listAllCarPricings(): Promise<CarPricing[]> {
    return this.pricings;
  }
}

describe('GetPriceListApplicationService (fuzzy carId)', () => {
  const basePricing = (carId: string, carName: string, manufacturer: string): CarPricing => ({
    carId,
    carName,
    carNameReading: carName,
    manufacturer,
    prices: [
      {
        menuId: 'front-set',
        menuName: 'フロントセット',
        amount: 1000,
      },
    ],
  });

  test('if fuzzy search has multiple hits (even including exact), it is treated as ambiguous', async () => {
    const query = new FakePricingQuery([
      basePricing('プリウス', 'プリウス', 'トヨタ'),
      basePricing('プリウスα', 'プリウスα', 'トヨタ'),
    ]);

    const service = new GetPriceListApplicationService(query);
    await expect(service.execute({ carId: 'プリウス' })).rejects.toThrow('車種名が曖昧');
  });

  test('single fuzzy match resolves to that car', async () => {
    const query = new FakePricingQuery([
      basePricing('プリウス', 'プリウス', 'トヨタ'),
      basePricing('ヴィッツ', 'ヴィッツ', 'トヨタ'),
    ]);

    const service = new GetPriceListApplicationService(query);
    const dto = await service.execute({ carId: 'プリ' });

    expect(dto.toJSON().car?.id).toBe('プリウス');
  });

  test('ambiguous fuzzy match throws a helpful error', async () => {
    const query = new FakePricingQuery([
      basePricing('プリウス', 'プリウス', 'トヨタ'),
      basePricing('プリウスα', 'プリウスα', 'トヨタ'),
    ]);

    const service = new GetPriceListApplicationService(query);
    await expect(service.execute({ carId: 'プリ' })).rejects.toThrow('車種名が曖昧');
  });
});
