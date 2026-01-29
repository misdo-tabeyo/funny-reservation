export type MenuPrice = {
  menuId: string;
  menuName: string;
  amount: number | null;
  currency: string;
};

export type CarPricingDTO = {
  carId: string;
  carName: string;
  carNameReading: string;
  manufacturer: string;
  prices: MenuPrice[];
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
    amount: number;
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
      },
      price: {
        amount: params.amount,
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
    prices: MenuPrice[];
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
          prices: params.prices,
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
