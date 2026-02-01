import { GetPriceListApplicationService } from './GetPriceListApplicationService';
import { IPricingQuery, CarDetail, CarSummary, ManufacturerSummary } from '../IPricingQuery';

class FakePricingQuery implements IPricingQuery {
  constructor(private readonly carDetails: CarDetail[]) {}

  async listManufacturers(): Promise<ManufacturerSummary[]> {
    return [];
  }

  async listCarsByManufacturer(_params: { manufacturerId: string }): Promise<CarSummary[]> {
    return [];
  }

  async searchCarsByName(params: { nameContains: string; manufacturerId?: string }): Promise<CarSummary[]> {
    const keyword = params.nameContains.trim().toLocaleLowerCase('ja-JP');
    return this.carDetails
      .filter((c) => {
        if (params.manufacturerId && c.manufacturer !== params.manufacturerId) return false;
        return c.carName.toLocaleLowerCase('ja-JP').includes(keyword);
      })
      .map((c) => ({
        id: c.carId,
        name: c.carName,
        nameReading: c.carNameReading,
        manufacturer: c.manufacturer,
      }));
  }

  async findCarDetail(params: { carId: string }): Promise<CarDetail | null> {
    return this.carDetails.find((c) => c.carId === params.carId) ?? null;
  }

  async findPrice(params: { carId: string; menuId: string }): Promise<number | null> {
    const c = await this.findCarDetail({ carId: params.carId });
    if (!c) return null;
    return c.menus.find((menu) => menu.menuId === params.menuId)?.price ?? null;
  }

  async listAllCarDetails(): Promise<CarDetail[]> {
    return this.carDetails;
  }
}

describe('GetPriceListApplicationService (fuzzy carId)', () => {
  const baseCarDetail = (carId: string, carName: string, manufacturer: string): CarDetail => ({
    carId,
    carName,
    carNameReading: carName,
    manufacturer,
    menus: [
      {
        menuId: 'front-set',
        menuName: 'フロントセット',
        price: 1000,
      },
    ],
  });

  test('if fuzzy search has multiple hits (even including exact), it is treated as ambiguous', async () => {
    const query = new FakePricingQuery([
      baseCarDetail('プリウス', 'プリウス', 'トヨタ'),
      baseCarDetail('プリウスα', 'プリウスα', 'トヨタ'),
    ]);

    const service = new GetPriceListApplicationService(query);
    await expect(service.execute({ carId: 'プリウス' })).rejects.toThrow('車種名が曖昧');
  });

  test('single fuzzy match resolves to that car', async () => {
    const query = new FakePricingQuery([
      baseCarDetail('プリウス', 'プリウス', 'トヨタ'),
      baseCarDetail('ヴィッツ', 'ヴィッツ', 'トヨタ'),
    ]);

    const service = new GetPriceListApplicationService(query);
    const dto = await service.execute({ carId: 'プリ' });

    expect(dto.toJSON().car?.id).toBe('プリウス');
  });

  test('ambiguous fuzzy match throws a helpful error', async () => {
    const query = new FakePricingQuery([
      baseCarDetail('プリウス', 'プリウス', 'トヨタ'),
      baseCarDetail('プリウスα', 'プリウスα', 'トヨタ'),
    ]);

    const service = new GetPriceListApplicationService(query);
    await expect(service.execute({ carId: 'プリ' })).rejects.toThrow('車種名が曖昧');
  });
});
