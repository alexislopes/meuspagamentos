const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function useCurrency() {
  function formatCents(cents: number): string {
    return formatter.format(cents / 100)
  }

  return { formatCents }
}
