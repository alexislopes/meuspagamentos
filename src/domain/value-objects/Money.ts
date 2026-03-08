export class Money {
  private constructor(private readonly cents: number) {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new Error('Money must be a non-negative integer (cents)')
    }
  }

  static fromCents(cents: number): Money {
    return new Money(cents)
  }

  static fromDecimal(value: number): Money {
    return new Money(Math.round(value * 100))
  }

  static zero(): Money {
    return new Money(0)
  }

  get inCents(): number {
    return this.cents
  }

  get inDecimal(): number {
    return this.cents / 100
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents)
  }

  equals(other: Money): boolean {
    return this.cents === other.cents
  }

  toJSON(): number {
    return this.cents
  }
}
