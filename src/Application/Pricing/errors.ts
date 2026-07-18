/**
 * 車種名の曖昧解決で提示する候補。
 * carId はそのまま getPriceList の carId + exact=true で再照会できる値にする。
 */
export type CarNameCandidate = {
  carId: string;
  carName: string;
  manufacturer: string;
};

/**
 * 車種名が複数候補に一致して一意に解決できない場合のエラー。
 *
 * 呼び出し側（GPT等）が機械的にリカバリーできるよう、
 * message だけでなく candidates を構造化して保持する。
 */
export class AmbiguousCarNameError extends Error {
  constructor(
    readonly input: string,
    readonly candidates: CarNameCandidate[],
  ) {
    super(
      `車種名が曖昧です。candidates から1つ選び、その carId に exact=true を付けて再照会してください。候補: ${candidates
        .map((c) => c.carId)
        .join(', ')}`,
    );
    this.name = 'AmbiguousCarNameError';
  }
}
