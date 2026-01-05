import { BookingId } from './BookingId/BookingId';
import { CarId } from './CarId/CarId';
import { MenuId } from './MenuId/MenuId';
import { OptionId } from './OptionId/OptionId';
import { TimeRange } from './TimeRange/TimeRange';
import { Money } from 'Domain/models/shared/Money/Money';
import { BookingStatus } from './BookingStatus/BookingStatus';
import { BookingLifecycle } from './BookingLifecycle';
import { CalendarEventId } from './CalendarEventId/CalendarEventId';

export class Booking {
  private _carId: CarId;
  private _menuId: MenuId;
  private _optionIds: OptionId[];
  private _timeRange: TimeRange;
  private _price: Money;
  private _status: BookingStatus;

  // 集約外は「IDで参照」
  private _calendarEventId: CalendarEventId | null;

  private constructor(
    private readonly _bookingId: BookingId,
    carId: CarId,
    menuId: MenuId,
    optionIds: OptionId[],
    timeRange: TimeRange,
    price: Money,
    status: BookingStatus,
    calendarEventId: CalendarEventId | null,
  ) {
    this._carId = carId;
    this._menuId = menuId;
    this._timeRange = timeRange;
    this._price = price;
    this._status = status;

    // 配列は参照渡しされるため、外部での変更がエンティティ内部状態に影響しないよう防御的コピーを行う
    this._optionIds = [...optionIds];

    // 外部参照ID
    this._calendarEventId = calendarEventId;

    // 生成時点で invariants を満たしていることを保証
    this.validateOptionIds(this._optionIds);
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
      null, // 新規作成時は未紐づけ
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
    calendarEventId: CalendarEventId | null;
  }): Booking {
    return new Booking(
      params.bookingId,
      params.carId,
      params.menuId,
      params.optionIds,
      params.timeRange,
      params.price,
      params.status,
      params.calendarEventId,
    );
  }

  // ------------------------
  // Draft のときだけ変更可能な操作
  // ------------------------
  changePrice(next: Money): void {
    this.assertDraft('priceを変更できません');
    this._price = next;
  }

  reschedule(next: TimeRange): void {
    this.assertDraft('timeRangeを変更できません');
    this._timeRange = next;
  }

  changeCarId(next: CarId): void {
    this.assertDraft('carIdを変更できません');
    this._carId = next;
  }

  changeMenuId(next: MenuId): void {
    this.assertDraft('menuIdを変更できません');
    this._menuId = next;
  }

  changeOptionIds(next: OptionId[]): void {
    this.assertDraft('optionIdsを変更できません');
    this.validateOptionIds(next);
    this._optionIds = [...next]; // 防御的コピー
  }

  // ------------------------
  // 集約外（カレンダー予定）との紐づけ
  // ------------------------
  linkCalendarEvent(eventId: CalendarEventId): void {
    if (!this._status.isConfirmed && !this._status.isCompleted) {
      throw new Error(`calendarEventIdを紐づけできません（status=${this._status.value}）`);
    }
    if (this._calendarEventId !== null) {
      throw new Error('calendarEventIdはすでに紐づいています');
    }
    this._calendarEventId = eventId;
  }

  unlinkCalendarEvent(): void {
    if (this._status.isCompleted) {
      throw new Error(`calendarEventIdを解除できません（status=${this._status.value}）`);
    }
    this._calendarEventId = null;
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
  // private helpers
  // ------------------------
  private assertDraft(message: string): void {
    if (!this._status.isDraft) {
      throw new Error(`${message}（status=${this._status.value}）`);
    }
  }

  private validateOptionIds(optionIds: OptionId[]): void {
    // 重複禁止（equalsベース）
    for (let i = 0; i < optionIds.length; i++) {
      for (let j = i + 1; j < optionIds.length; j++) {
        if (optionIds[i].equals(optionIds[j])) {
          throw new Error('optionIdsは重複を許可しません');
        }
      }
    }
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

  // 外部参照はIDだけ公開
  get calendarEventId(): CalendarEventId | null {
    return this._calendarEventId;
  }
}
