import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function generateTransactionCode() {
  const date = new Date()
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `TRX-${yy}${mm}${dd}-${rand}`
}

export function calculateNights(checkIn, checkOut) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / msPerDay))
}

export function getStatusColor(status) {
  switch (status) {
    case 'Confirmed':    return 'bg-green-100 text-green-800'
    case 'Pending':      return 'bg-yellow-100 text-yellow-800'
    case 'Cancelled':    return 'bg-red-100 text-red-800'
    case 'Checked In':   return 'bg-blue-100 text-blue-800'
    case 'Checked Out':  return 'bg-gray-100 text-gray-800'
    default:             return 'bg-gray-100 text-gray-800'
  }
}

export function calculateRetentionMetrics(bookings = []) {
  const totalBookings = bookings.length
  const cancelledBookings = bookings.filter((b) => b.status === 'Cancelled').length

  const activeBookings = bookings.filter((b) => b.status !== 'Cancelled')
  const guestBookingCounts = activeBookings.reduce((acc, b) => {
    const key =
      b.guest_id ||
      b.guest_email?.toLowerCase()?.trim() ||
      b.guest_phone?.trim() ||
      b.guest_name?.toLowerCase()?.trim()

    if (!key) return acc
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const uniqueGuests = Object.keys(guestBookingCounts).length
  const repeatGuests = Object.values(guestBookingCounts).filter((count) => count > 1).length

  const rebookingRate = uniqueGuests ? (repeatGuests / uniqueGuests) * 100 : 0
  const cancellationRate = totalBookings ? (cancelledBookings / totalBookings) * 100 : 0

  return {
    uniqueGuests,
    repeatGuests,
    rebookingRate,
    cancellationRate,
    cancelledBookings,
  }
}
