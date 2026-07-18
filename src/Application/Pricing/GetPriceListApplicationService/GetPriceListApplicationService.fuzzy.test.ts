import { GetPriceListApplicationService } from './GetPriceListApplicationService';
import { AmbiguousCarNameError } from '../errors';
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

  test('ambiguous error carries machine-usable candidates (carId usable with exact=true)', async () => {
    const query = new FakePricingQuery([
      baseCarDetail('プリウス', 'プリウス', 'トヨタ'),
      baseCarDetail('プリウスα', 'プリウスα', 'トヨタ'),
    ]);

    const service = new GetPriceListApplicationService(query);

    const error = await service.execute({ carId: 'プリウス' }).catch((e) => e);
    expect(error).toBeInstanceOf(AmbiguousCarNameError);
    expect((error as AmbiguousCarNameError).candidates).toEqual([
      { carId: 'プリウス', carName: 'プリウス', manufacturer: 'トヨタ' },
      { carId: 'プリウスα', carName: 'プリウスα', manufacturer: 'トヨタ' },
    ]);
  });

  test('exact=true skips fuzzy resolution and returns the exact car', async () => {
    const query = new FakePricingQuery([
      baseCarDetail('プリウス', 'プリウス', 'トヨタ'),
      baseCarDetail('プリウスα', 'プリウスα', 'トヨタ'),
    ]);

    const service = new GetPriceListApplicationService(query);

    const dto = await service.execute({ carId: 'プリウス', exact: true });
    expect(dto.toJSON().car?.id).toBe('プリウス');

    const single = await service.execute({ carId: 'プリウス', menuId: 'front-set', exact: true });
    expect(single.toJSON().price?.amount).toBe(1000);
  });

  test('exact=true with an unknown carId throws not-found', async () => {
    const query = new FakePricingQuery([baseCarDetail('プリウス', 'プリウス', 'トヨタ')]);

    const service = new GetPriceListApplicationService(query);
    await expect(service.execute({ carId: 'プリ', exact: true })).rejects.toThrow('見つかりません');
  });
});
