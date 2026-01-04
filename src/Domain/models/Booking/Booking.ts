import { BookingId } from './BookingId/BookingId';
import { CarId } from './CarId/CarId';
import { MenuId } from './MenuId/MenuId';
import { OptionId } from './OptionId/OptionId';
import { TimeRange } from './TimeRange/TimeRange';
import { Money } from 'Domain/models/shared/Money/Money';
import { BookingStatus } from './BookingStatus/BookingStatus';
import { BookingLifecycle } from './BookingLifecycle';

export class Booking {
  private readonly _optionIds: OptionId[];

  private constructor(
    private readonly _bookingId: BookingId,
    private readonly _carId: CarId,
    private readonly _menuId: MenuId,
    optionIds: OptionId[],
    private readonly _timeRange: TimeRange,
    private _price: Money,
    private _status: BookingStatus,
  ) {
    // 配列は参照渡しされるため、外部での変更がエンティティ内部状態に影響しないよう防御的コピーを行う
    this._optionIds = [...optionIds];
  }

  // ------------------------
  // Factory（新規作成）
  // ------------------------
  static create(params: {
    bookingId: BookingId;
    carId: CarId;
    menuId: MenuId;
    optionIds: OptionId[];
    timeRange: TimeRange;
    price: Money;
  }): Booking {
    return new Booking(
      params.bookingId,
      params.carId,
      params.menuId,
      params.optionIds,
      params.timeRange,
      params.price,
      BookingStatus.initial(), // 初期状態を強制
    );
  }

  // ------------------------
  // 再構築（DBなど）
  // ------------------------
  static reconstruct(params: {
    bookingId: BookingId;
    carId: CarId;
    menuId: MenuId;
    optionIds: OptionId[];
    timeRange: TimeRange;
    price: Money;
    status: BookingStatus;
  }): Booking {
    return new Booking(
      params.bookingId,
      params.carId,
      params.menuId,
      params.optionIds,
      params.timeRange,
      params.price,
      params.status,
    );
  }

  // ------------------------
  // 状態遷移
  // ------------------------
  changeStatus(next: BookingStatus): void {
    if (!BookingLifecycle.canTransition(this._status, next)) {
      throw new Error(
        `BookingStatusを ${this._status.value} から ${next.value} へ遷移できません`,
      );
    }

    this._status = next;
  }

  cancel(): void {
    this.changeStatus(BookingStatus.cancelled());
  }

  confirm(): void {
    this.changeStatus(BookingStatus.confirmed());
  }

  complete(): void {
    this.changeStatus(BookingStatus.completed());
  }

  // ------------------------
  // getter
  // ------------------------
  get bookingId(): BookingId {
    return this._bookingId;
  }

  get carId(): CarId {
    return this._carId;
  }

  get menuId(): MenuId {
    return this._menuId;
  }

  get optionIds(): readonly OptionId[] {
    return this._optionIds;
  }

  get timeRange(): TimeRange {
    return this._timeRange;
  }

  get price(): Money {
    return this._price;
  }

  get status(): BookingStatus {
    return this._status;
  }
}
