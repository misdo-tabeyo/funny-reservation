export type MenuPrice = {
  menuId: string;
  menuName: string;
  price: number | null;
  currency: string;
  /** 施工時間（時間）。料金表に無い場合は null/undefined */
  durationHours?: number | null;
};

export type CarPricingDTO = {
  carId: string;
  carName: string;
  carNameReading: string;
  manufacturer: string;
  menus: MenuPrice[];
};

export type PriceListDTOProps = {
  car?: {
    id: string;
    manufacturer: string;
    name: string;
    nameReading: string;
  };
  menu?: {
    id: string;
    name: string;
    durationHours?: number | null;
  };
  price?: {
    amount: number;
    currency: string;
  };
  pricings?: CarPricingDTO[];
};

export class PriceListDTO {
  private constructor(private readonly props: PriceListDTOProps) {}

  /**
   * 単一の車種・メニューの料金を返す形式
   */
  static createSinglePrice(params: {
    carId: string;
    carName: string;
    carNameReading: string;
    manufacturer: string;
    menuId: string;
    menuName: string;
    price: number;
    durationHours?: number | null;
  }): PriceListDTO {
    return new PriceListDTO({
      car: {
        id: params.carId,
        manufacturer: params.manufacturer,
        name: params.carName,
        nameReading: params.carNameReading,
      },
      menu: {
        id: params.menuId,
        name: params.menuName,
        durationHours: params.durationHours ?? null,
      },
      price: {
        amount: params.price,
        currency: 'JPY',
      },
    });
  }

  /**
   * 単一の車種の全メニュー料金を返す形式
   */
  static createCarPrices(params: {
    carId: string;
    carName: string;
    carNameReading: string;
    manufacturer: string;
    menus: MenuPrice[];
  }): PriceListDTO {
    return new PriceListDTO({
      car: {
        id: params.carId,
        manufacturer: params.manufacturer,
        name: params.carName,
        nameReading: params.carNameReading,
      },
      price: undefined,
      menu: undefined,
      pricings: [
        {
          carId: params.carId,
          carName: params.carName,
          carNameReading: params.carNameReading,
          manufacturer: params.manufacturer,
          menus: params.menus,
        },
      ],
    });
  }

  /**
   * 全車種の料金表を返す形式
   */
  static createFullList(pricings: CarPricingDTO[]): PriceListDTO {
    return new PriceListDTO({
      pricings,
    });
  }

  toJSON(): PriceListDTOProps {
    return this.props;
  }

  get value(): PriceListDTOProps {
    return this.props;
  }
}
