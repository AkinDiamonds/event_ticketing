const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatPrice(kobo: number) {
  return currency.format(kobo / 100)
}

export function formatEventSchedule(startsAt?: string) {
  const date = startsAt ? new Date(startsAt) : null
  if (!date || Number.isNaN(date.valueOf())) return null
  return {
    day: date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  }
}
