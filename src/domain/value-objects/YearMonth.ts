export class YearMonth {
  private constructor(
    public readonly year: number,
    public readonly month: number,
  ) {
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12')
    }
  }

  static of(year: number, month: number): YearMonth {
    return new YearMonth(year, month)
  }

  static current(): YearMonth {
    const now = new Date()
    return new YearMonth(now.getFullYear(), now.getMonth() + 1)
  }

  static fromKey(key: string): YearMonth {
    const [year, month] = key.split('-').map(Number)
    return new YearMonth(year, month)
  }

  get key(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`
  }

  previous(): YearMonth {
    return this.month === 1
      ? new YearMonth(this.year - 1, 12)
      : new YearMonth(this.year, this.month - 1)
  }

  next(): YearMonth {
    return this.month === 12
      ? new YearMonth(this.year + 1, 1)
      : new YearMonth(this.year, this.month + 1)
  }

  isBeforeOrEqual(other: YearMonth): boolean {
    if (this.year !== other.year) return this.year < other.year
    return this.month <= other.month
  }

  isBefore(other: YearMonth): boolean {
    if (this.year !== other.year) return this.year < other.year
    return this.month < other.month
  }

  equals(other: YearMonth): boolean {
    return this.year === other.year && this.month === other.month
  }

  toJSON(): string {
    return this.key
  }
}
