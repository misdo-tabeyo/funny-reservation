import { ValueObject } from 'Domain/models/shared/ValueObject';
import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';

type TimeRangeValue = {
  startAt: DateTime;
  duration: Duration;
};

/**
 * TimeRange（時間帯）
 * - 開始日時 + 所要時間で区間を表す
 * - 予約は1時間単位のため、開始時刻も「ちょうど00分」のみ許容
 * - 区間は [start, end)（endは含まない）として扱う
 */
export class TimeRange extends ValueObject<TimeRangeValue, 'TimeRange'> {
  constructor(startAt: DateTime, duration: Duration) {
    super({ startAt, duration });
  }

  get startAt(): DateTime {
    return this.value.startAt;
  }

  get duration(): Duration {
    return this.value.duration;
  }

  /** 終了日時（endは含まない） */
  get endAt(): DateTime {
    return this.startAt.addMinutes(this.duration.minutes);
  }

  /** other と重なっているか（境界が接するだけは false） */
  overlaps(other: TimeRange): boolean {
    // [aStart, aEnd) と [bStart, bEnd) が重なる条件:
    // aStart < bEnd && bStart < aEnd
    return (
      this.startAt.toTimestamp() < other.endAt.toTimestamp() &&
      other.startAt.toTimestamp() < this.endAt.toTimestamp()
    );
  }

  /** 指定の DateTime がこの区間に含まれるか（endは含まない） */
  contains(dateTime: DateTime): boolean {
    const t = dateTime.toTimestamp();
    return this.startAt.toTimestamp() <= t && t < this.endAt.toTimestamp();
  }

  protected validate(value: TimeRangeValue): void {
    if (!value?.startAt || !value?.duration) {
      throw new Error('TimeRangeの値が不正です');
    }

    // 予約は1時間単位 → 開始も “ちょうど00分” に固定しておく（JST 기준）
    const parts = toJstParts(value.startAt.toTimestamp());
    const isHourAligned = parts.minute === 0 && parts.second === 0 && parts.millisecond === 0;

    if (!isHourAligned) {
      throw new Error('TimeRangeの開始時刻は1時間単位で指定する必要があります');
    }
  }
}

function toJstParts(timestampMs: number): {
  minute: number;
  second: number;
  millisecond: number;
} {
  const d = new Date(timestampMs + 9 * 60 * 60 * 1000);
  return {
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    millisecond: d.getUTCMilliseconds(),
  };
}
